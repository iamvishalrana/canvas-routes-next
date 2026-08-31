import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { getAnthropic } from '../../../../../lib/anthropic'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { EXPENSE_CATEGORIES } from '../../../../../lib/expenseCategories'
import { EXPENSE_PAYMENT_METHOD_VALUES } from '../../../../../lib/expensePaymentMethods'
import { EXPENSE_PROVINCE_VALUES } from '../../../../../lib/expenseProvinces'

// Vision-capable image types Anthropic accepts. HEIC (common on iPhone) is NOT
// supported by the vision API, so it's rejected with a clear message below.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
// This route posts straight to this API route's body (no signed-Storage-URL
// option for a one-shot OCR call), so it's bound by Vercel's serverless
// function request-body cap (~4.5MB) — a check above that is unreachable in
// practice; the client already downscales images before sending (see
// ExpensesClient.jsx handleScan), so this is just the honest backstop.
const MAX_BYTES = 4 * 1024 * 1024 // 4 MB

const CATEGORIES = EXPENSE_CATEGORIES
// Both lists come from lib/ now — previously hand-duplicated here and in
// ExpensesClient.jsx, held in sync only by a code comment (a real drift risk:
// adding a province/payment method to one and forgetting the other would
// either get silently rejected by this validator or accepted here but
// unselectable in the UI).
const PROVINCES = EXPENSE_PROVINCE_VALUES
const PAYMENT_METHODS = EXPENSE_PAYMENT_METHOD_VALUES

// Cost control: the cheap model handles the vast majority of receipts (clear
// printed totals). We escalate to the stronger model ONLY when the cheap pass
// can't produce a usable result — see the escalation gate in POST. A confident
// "not a receipt" is trusted from the cheap pass, so junk uploads never trigger
// the second (pricier) call.
//
// These are dated model snapshots, not aliases — they will NOT pick up future
// model generations automatically and need a periodic manual bump (check
// what's current before assuming these are still the right choice).
const PRIMARY_MODEL  = 'claude-haiku-4-5-20251001'
const FALLBACK_MODEL = 'claude-sonnet-5'

const SYSTEM_PROMPT = `You extract structured data from a receipt or invoice image for a Montreal (Quebec, Canada) automotive club's expense tracker. You always respond with a single minified JSON object and nothing else — no explanation, no markdown fences.`

const EXTRACT_PROMPT = `Read this image and return ONLY minified JSON with exactly these keys:
{"is_receipt":boolean,"vendor":string|null,"date":"YYYY-MM-DD"|null,"amount":number|null,"gst":number|null,"qst":number|null,"tip":number|null,"other_charges":number|null,"total":number|null,"currency":string|null,"vendor_tax_id":string|null,"category":string|null,"payment_method":string|null,"province":string|null,"notes":string|null,"low_confidence":string[]|null}

Rules:
- The receipt or invoice may be printed in French (common for Québec merchants) or English — read and extract accurately from either language, and don't let unfamiliar French wording lower your confidence. Common French terms you'll see: "Facture"/"Reçu" (invoice/receipt), "Sous-total" (subtotal), "Pourboire"/"Service" (tip), "Total"/"Montant total" (total), "TPS" (GST/federal tax), "TVQ" (QST/provincial tax), "Date", "Espèces"/"Comptant" (cash), "Débit" (debit), "Crédit" (credit). Write "vendor" and "notes" in whichever language is clearer/shorter — don't force a translation.
- "is_receipt" = true ONLY if the image is clearly a purchase receipt, invoice, bill, or order confirmation showing amounts paid or payable. If it is anything else — an article, a menu, a screenshot, a random document, a photo, a business card — set is_receipt to false and EVERY other key to null. Never guess values from something that is not a receipt.
- "vendor" = the business/merchant name.
- "date" = the transaction date in YYYY-MM-DD. If the year is missing, infer the most likely recent year.
- "amount" = the PRE-TAX subtotal of the goods/services (the "Sous-total" line — before any extra fees and before taxes). If only a grand total is shown with no tax lines, set "amount" to that total and leave "gst", "qst" and "other_charges" null.
- "gst" = the Canadian federal GST / TPS / HST-federal amount (~5%) only — always null on a US receipt (there is no GST). "qst" = the QST / TVQ / PST / HST-provincial amount, OR a US state sales tax amount (Vermont/Maine/New York have one; New Hampshire has none). If a single combined Canadian tax line is shown (e.g. HST) and you can't split it, put the whole amount in "gst" and leave "qst" null; for a single US state sales tax line, put it in "qst" instead (never "gst").
- "tip" = the tip / gratuity / "Pourboire" / "Service" amount added on top of the taxed subtotal, if any (common on a restaurant's card/payment receipt but usually absent on the itemized bill). null if there is no tip line.
- "other_charges" = the NET of any charges that are not the subtotal, taxes, or tip — e.g. delivery/shipping, service or booking fees, environmental / eco / recycling fees ("frais environnementaux", tire or battery levies), bottle deposits ("consigne"), surcharges — MINUS any discounts, coupons, rebates, or credits ("rabais", "remise"). Fees count positive, discounts negative. Use null if there are none or they cancel out. Never put gst/qst/tip in here. This exists so the identity holds: amount + other_charges + gst + qst + tip = total.
- "total" = the grand total actually paid (this INCLUDES taxes, any other_charges, and the tip when present).
- "currency" = the 3-letter ISO code of the amounts shown (e.g. "USD", "EUR", "GBP") if the receipt is clearly NOT Canadian dollars; otherwise "CAD". Default "CAD" when unsure.
- "vendor_tax_id" = the vendor's tax registration number if printed — a GST/HST number (9 digits + "RT" + 4 digits, e.g. "123456789 RT0001") or a QST/TVQ number (10 digits + "TQ" + 4 digits). Return it as printed, or null if not shown.
- "category" MUST be exactly one of: ${CATEGORIES.join(', ')}. Pick the best fit, or null if unclear.
- "payment_method" MUST be exactly one of: cash, credit, debit, etransfer, other. Map the tender shown on the receipt, checking in this order: "CASH"/"ESPÈCES"/"COMPTANT" → "cash"; "Interac e-Transfer"/"Virement Interac" → "etransfer"; "INTERAC"/"DEBIT"/"DÉBIT"/"Débit"/debit card → "debit" (Interac by itself always means a debit card); VISA/Mastercard/Amex/Discover/"CREDIT"/"CRÉDIT" → "credit"; anything else → "other". null if not shown.
- "province" = the code for the MERCHANT's address (one of: ${PROVINCES.join(', ')} — Canadian provinces/territories plus VT/NH/ME/NY for US border-state purchases), or null if the address doesn't match any of those.
- "notes" = a short (max ~90 chars) plain-text OVERVIEW of the purchase — what it was, at a glance — NOT a list of the line items on the receipt. Never enumerate individual items/quantities/prices; give the gist a reader would want at a glance instead. Good: "Fuel fill-up", "Team lunch, 4 people", "Office supplies", "Car detailing". Bad (too itemized, don't do this): "42.1L Premium + car wash $8", "2x Burger, 1x Fries, 2x Poutine, 4x Soda", "Pens, paper, tape, stapler". If the receipt is a single specific purchase (one part, one tool), name that briefly instead. null if there's nothing worth summarizing beyond the vendor name.
- "low_confidence" = an array of the JSON key names above (e.g. ["amount","date"]) that you were NOT fully sure about — faded thermal print, handwriting, glare, a cut-off edge, or anything else that made a value a best guess rather than a clear read. Empty array or null if everything was clearly legible. Only include keys you actually returned a non-null value for — don't flag something you already set to null.
- Use null for anything not clearly present. All numbers must be plain decimals with no currency symbols (e.g. 12.34).`

// Extraction JSON keys eligible for the low_confidence flag — everything
// except is_receipt and low_confidence itself. Used to sanitize the model's
// own list before it reaches the client (never trust a model-invented key).
const CONFIDENCE_FIELDS = new Set(['vendor', 'date', 'amount', 'gst', 'qst', 'tip', 'other_charges', 'total', 'currency', 'vendor_tax_id', 'category', 'payment_method', 'province', 'notes'])

const round2 = (n) => Math.round(n * 100) / 100

// Parse a money value from the model to a finite 2-decimal number (or null).
function parseAmount(v) {
  if (v == null) return null
  let n
  if (typeof v === 'number') {
    n = v
  } else {
    // Strip everything but digits, separators and sign, then reconcile comma
    // vs dot. A Quebec receipt often prints "12,99" (comma decimal) — blindly
    // deleting commas turned that into 1299 ($1,299.00). Rules:
    //   both , and .  → comma is the thousands sep, drop it   (1,234.56 → 1234.56)
    //   only commas   → a single trailing group of ≤2 digits is a decimal
    //                   (12,99 → 12.99); otherwise commas are thousands
    //                   (1,234 → 1234 ; 1,234,567 → 1234567)
    let s = String(v).replace(/[^0-9.,\-]/g, '')
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/,/g, '')
    } else if (s.includes(',')) {
      const parts = s.split(',')
      s = (parts.length === 2 && parts[1].length <= 2) ? `${parts[0]}.${parts[1]}` : parts.join('')
    }
    n = parseFloat(s)
  }
  if (!Number.isFinite(n)) return null
  if (Math.abs(n) > 1000000) return null // absurd = misread
  return round2(n)
}

// Subtotal / taxes / tip / total are always positive — a negative here means a
// misread, so blank it.
function toNum(v) {
  const n = parseAmount(v)
  return n == null || n < 0 ? null : n
}

// "other_charges" keeps its sign: fees are positive, discounts/credits negative.
function toSignedNum(v) {
  return parseAmount(v)
}

function sanitizeDate(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(v + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return null
  const tomorrow = new Date(Date.now() + 86400000)
  if (d > tomorrow || d < new Date('2015-01-01')) return null // future/ancient = misread
  return v
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const ip = getClientIp(request)
  // Own scope — without one this shares the default `rl:${ip}` bucket that
  // every other default-scope admin GET (applications, search, contacts…)
  // also increments, so a dozen dashboard fetches could push it past 20 and
  // 429 the first real scan. This budget must only count scans.
  if (await checkRateLimit(ip, 20, 60, 'expenses-scan')) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const anthropic = getAnthropic()
  if (!anthropic) return Response.json({ error: 'Receipt scanning is not configured.' }, { status: 503 })

  let formData
  try { formData = await request.formData() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  // Usually one file. Multiple files means multiple photos of the SAME
  // physical receipt (a long receipt, or one split across shots) — the
  // client only ever sends >1 for that case, never for unrelated documents
  // (a second, different document goes through its own separate scan +
  // client-side reconciliation instead). Capped at 4 pages.
  const files = formData.getAll('file').filter(f => f && typeof f !== 'string')
  if (!files.length) return Response.json({ error: 'No file provided.' }, { status: 400 })
  if (files.length > 4) return Response.json({ error: 'Too many pages — scan up to 4 at a time.' }, { status: 400 })
  for (const f of files) {
    if (f.type === 'image/heic' || f.type === 'image/heif') {
      return Response.json({ error: 'HEIC photos can’t be scanned. Please use a JPEG or PNG.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      return Response.json({ error: 'Only JPEG, PNG, WebP images or PDFs can be scanned.' }, { status: 400 })
    }
  }

  const buffers = await Promise.all(files.map(f => f.arrayBuffer()))
  const totalBytes = buffers.reduce((s, b) => s + b.byteLength, 0)
  if (totalBytes > MAX_BYTES) return Response.json({ error: 'File too large to scan (max 4 MB total) — attach it below instead and enter the details manually.' }, { status: 400 })

  const mediaBlocks = files.map((f, i) => {
    const b64 = Buffer.from(buffers[i]).toString('base64')
    return f.type === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image',    source: { type: 'base64', media_type: f.type, data: b64 } }
  })
  // Only added when there's more than one page — keeps the single-image
  // (overwhelmingly common) case's prompt text identical to before.
  const promptText = files.length > 1
    ? `These ${files.length} images are multiple photos of the SAME physical receipt or invoice (e.g. a long receipt, or one split across shots) — read them together and extract ONE unified answer, not multiple. ${EXTRACT_PROMPT}`
    : EXTRACT_PROMPT

  // One extraction pass with a given model — returns the parsed JSON object, or
  // null if the model didn't return parseable JSON.
  const runModel = async (model) => {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 600,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [...mediaBlocks, { type: 'text', text: promptText }] }],
    })
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    try { return JSON.parse(stripped) }
    catch {
      // The model is told to return raw JSON only, but if it slips in a stray
      // sentence around the object despite that, pull out the first {...}
      // block instead of failing outright — a free, local fix that's cheaper
      // than falling through to a whole extra model call below.
      const match = stripped.match(/\{[\s\S]*\}/)
      if (!match) return null
      try { return JSON.parse(match[0]) } catch { return null }
    }
  }
  const usableParse = (p) => p && (p.is_receipt === false || toNum(p.amount) != null || toNum(p.total) != null)
  // Do the numbers add up? subtotal + fees + taxes + tip should equal total.
  // Only meaningful when both a subtotal and a total were read; otherwise we
  // can derive the missing side later, so there's nothing to reconcile against.
  const reconciles = (p) => {
    const a = toNum(p.amount), t = toNum(p.total)
    if (a == null || t == null) return true
    const sum = a + (toNum(p.gst) || 0) + (toNum(p.qst) || 0) + (toNum(p.tip) || 0) + (toSignedNum(p.other_charges) || 0)
    return Math.abs(sum - t) <= 0.02
  }

  try {
    let parsed = await runModel(PRIMARY_MODEL)

    // A parse failure (still null after the lenient extraction above) is
    // usually a transient formatting slip, not a hard-to-read image — worth
    // one more cheap-model attempt before paying for the stronger model.
    if (!parsed) parsed = await runModel(PRIMARY_MODEL)

    // Escalate to the stronger model when the cheap pass(es) either couldn't
    // produce a usable answer OR produced numbers that don't reconcile
    // (subtotal + fees + taxes + tip ≠ total) — a mismatch on a real receipt
    // usually means a misread of a busy/complex layout, which the stronger
    // model reads better. A confident is_receipt:false is trusted as-is
    // (no escalation) so non-receipt uploads stay cheap.
    const needsEscalation = !usableParse(parsed) || (parsed.is_receipt !== false && !reconciles(parsed))
    if (needsEscalation) {
      const retry = await runModel(FALLBACK_MODEL)
      // Prefer the retry when the cheap pass was unusable, or when the retry
      // actually reconciles (and so is the more trustworthy read).
      if (retry && usableParse(retry) && (!usableParse(parsed) || reconciles(retry))) parsed = retry
    }

    if (!parsed) return Response.json({ error: 'Could not read that receipt. Enter the details manually.' }, { status: 422 })

    // Not a receipt at all (random document, screenshot, article…) — refuse
    // rather than force-fitting garbage into the form
    if (parsed.is_receipt === false) {
      return Response.json({ error: "That doesn't look like a receipt or invoice — nothing was imported. If it really is one, enter the details manually." }, { status: 422 })
    }

    const date = sanitizeDate(parsed.date)
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : null
    const amount = toNum(parsed.amount)
    const gst = toNum(parsed.gst)
    const qst = toNum(parsed.qst)
    const tip = toNum(parsed.tip)
    const other_charges = toSignedNum(parsed.other_charges)
    const total = toNum(parsed.total)
    const payment_method = PAYMENT_METHODS.includes(parsed.payment_method) ? parsed.payment_method : null
    const province = (typeof parsed.province === 'string' && PROVINCES.includes(parsed.province.toUpperCase())) ? parsed.province.toUpperCase() : null
    const notes = typeof parsed.notes === 'string' && parsed.notes.trim() ? parsed.notes.trim().slice(0, 200) : null
    // 3-letter currency code (uppercase); default CAD.
    const currency = (typeof parsed.currency === 'string' && /^[A-Za-z]{3}$/.test(parsed.currency.trim())) ? parsed.currency.trim().toUpperCase() : 'CAD'
    const vendor_tax_id = (typeof parsed.vendor_tax_id === 'string' && parsed.vendor_tax_id.trim()) ? parsed.vendor_tax_id.trim().slice(0, 40) : null
    // Never trust a model-invented key — intersect against the real field set.
    const low_confidence = Array.isArray(parsed.low_confidence)
      ? [...new Set(parsed.low_confidence.filter(k => typeof k === 'string' && CONFIDENCE_FIELDS.has(k)))]
      : []

    // A "receipt" with no usable numbers is another non-receipt signal
    if (amount == null && total == null) {
      return Response.json({ error: 'No amounts could be read from that image. Enter the details manually.' }, { status: 422 })
    }

    const otherVal = other_charges || 0
    // Fill in a missing subtotal or total from the parts we did read, so the
    // form comes back complete even when only one side was legible. Nothing is
    // invented — these are exact arithmetic from the fields the model returned.
    let outAmount = amount
    let outTotal = total
    if (outTotal == null && outAmount != null) {
      outTotal = round2(outAmount + (gst || 0) + (qst || 0) + (tip || 0) + otherVal)
    } else if (outAmount == null && outTotal != null) {
      const derived = round2(outTotal - (gst || 0) - (qst || 0) - (tip || 0) - otherVal)
      outAmount = derived >= 0 ? derived : null
    }

    // Reconciliation residual: how far subtotal + fees + taxes + tip is from the
    // printed total. Surfaced (not just a boolean) so the admin sees exactly how
    // much is unaccounted for and can decide whether it matters. With
    // other_charges now captured, ordinary fee-laden receipts (delivery, eco/
    // tire levies, deposits, discounts) reconcile instead of false-flagging.
    let residual = null
    let mismatch = false
    if (outAmount != null && outTotal != null) {
      residual = round2(outAmount + (gst || 0) + (qst || 0) + (tip || 0) + otherVal - outTotal)
      mismatch = Math.abs(residual) > 0.02
    }

    return Response.json({
      vendor: typeof parsed.vendor === 'string' ? parsed.vendor.slice(0, 100) : null,
      date, amount: outAmount, gst, qst, tip, other_charges, total: outTotal,
      currency, vendor_tax_id, category, payment_method, province, notes, mismatch, residual,
      low_confidence,
    })
  } catch (err) {
    captureException(err, { context: 'expenses-scan-receipt' })
    return Response.json(
      { error: process.env.NODE_ENV === 'development' ? err.message : 'Scan failed. Enter the details manually.' },
      { status: 500 }
    )
  }
}
