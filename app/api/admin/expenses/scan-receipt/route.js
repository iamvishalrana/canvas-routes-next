import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { getAnthropic } from '../../../../../lib/anthropic'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { EXPENSE_CATEGORIES } from '../../../../../lib/expenseCategories'

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
// Canadian province/territory codes — used to validate the scanned merchant
// address so the client can pick the right tax rates automatically.
const PROVINCES = ['QC', 'ON', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU']
const PAYMENT_METHODS = ['cash', 'credit', 'debit', 'etransfer', 'other']

// Cost control: the cheap model handles the vast majority of receipts (clear
// printed totals). We escalate to the stronger model ONLY when the cheap pass
// can't produce a usable result — see the escalation gate in POST. A confident
// "not a receipt" is trusted from the cheap pass, so junk uploads never trigger
// the second (pricier) call.
const PRIMARY_MODEL  = 'claude-haiku-4-5-20251001'
const FALLBACK_MODEL = 'claude-sonnet-5'

const SYSTEM_PROMPT = `You extract structured data from a receipt or invoice image for a Montreal (Quebec, Canada) automotive club's expense tracker. You always respond with a single minified JSON object and nothing else — no explanation, no markdown fences.`

const EXTRACT_PROMPT = `Read this image and return ONLY minified JSON with exactly these keys:
{"is_receipt":boolean,"vendor":string|null,"date":"YYYY-MM-DD"|null,"amount":number|null,"gst":number|null,"qst":number|null,"tip":number|null,"total":number|null,"currency":string|null,"vendor_tax_id":string|null,"category":string|null,"payment_method":string|null,"province":string|null,"notes":string|null}

Rules:
- The receipt or invoice may be printed in French (common for Québec merchants) or English — read and extract accurately from either language, and don't let unfamiliar French wording lower your confidence. Common French terms you'll see: "Facture"/"Reçu" (invoice/receipt), "Sous-total" (subtotal), "Pourboire"/"Service" (tip), "Total"/"Montant total" (total), "TPS" (GST/federal tax), "TVQ" (QST/provincial tax), "Date", "Espèces"/"Comptant" (cash), "Débit" (debit), "Crédit" (credit). Write "vendor" and "notes" in whichever language is clearer/shorter — don't force a translation.
- "is_receipt" = true ONLY if the image is clearly a purchase receipt, invoice, bill, or order confirmation showing amounts paid or payable. If it is anything else — an article, a menu, a screenshot, a random document, a photo, a business card — set is_receipt to false and EVERY other key to null. Never guess values from something that is not a receipt.
- "vendor" = the business/merchant name.
- "date" = the transaction date in YYYY-MM-DD. If the year is missing, infer the most likely recent year.
- "amount" = the PRE-TAX subtotal (goods/services before taxes). If only a grand total is shown with no tax lines, set "amount" to that total and leave "gst" and "qst" null.
- "gst" = the GST / TPS / HST-federal amount (federal, ~5%) only. "qst" = the QST / TVQ / PST / HST-provincial amount only. If a single combined tax line is shown (e.g. HST) and you can't split it, put the whole amount in "gst" and leave "qst" null.
- "tip" = the tip / gratuity / "Pourboire" / "Service" amount added on top of the taxed subtotal, if any (common on a restaurant's card/payment receipt but usually absent on the itemized bill). null if there is no tip line.
- "total" = the grand total actually paid (this INCLUDES the tip when one is present).
- "currency" = the 3-letter ISO code of the amounts shown (e.g. "USD", "EUR", "GBP") if the receipt is clearly NOT Canadian dollars; otherwise "CAD". Default "CAD" when unsure.
- "vendor_tax_id" = the vendor's tax registration number if printed — a GST/HST number (9 digits + "RT" + 4 digits, e.g. "123456789 RT0001") or a QST/TVQ number (10 digits + "TQ" + 4 digits). Return it as printed, or null if not shown.
- "category" MUST be exactly one of: ${CATEGORIES.join(', ')}. Pick the best fit, or null if unclear.
- "payment_method" MUST be exactly one of: cash, credit, debit, etransfer, other. Map the tender shown on the receipt, checking in this order: "CASH"/"ESPÈCES"/"COMPTANT" → "cash"; "Interac e-Transfer"/"Virement Interac" → "etransfer"; "INTERAC"/"DEBIT"/"DÉBIT"/"Débit"/debit card → "debit" (Interac by itself always means a debit card); VISA/Mastercard/Amex/Discover/"CREDIT"/"CRÉDIT" → "credit"; anything else → "other". null if not shown.
- "province" = the 2-letter Canadian province/territory code of the MERCHANT's address (one of: ${PROVINCES.join(', ')}), or null if no Canadian address is visible.
- "notes" = a very short (max ~90 chars) plain-text summary of the main items or purpose (e.g. "Fuel — 42L premium" or "Coffee & pastries for meetup"), or null.
- Use null for anything not clearly present. All numbers must be plain decimals with no currency symbols (e.g. 12.34).`

function toNum(v) {
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
  // Expense amounts are always positive and sane — a negative or absurd value
  // means the model misread something; better to leave the field blank
  if (n < 0 || n > 1000000) return null
  return Math.round(n * 100) / 100
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

  const file = formData.get('file')
  if (!file || typeof file === 'string') return Response.json({ error: 'No file provided.' }, { status: 400 })
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return Response.json({ error: 'HEIC photos can’t be scanned. Please use a JPEG or PNG.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Only JPEG, PNG, WebP images or PDFs can be scanned.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_BYTES) return Response.json({ error: 'File too large to scan (max 4 MB) — attach it below instead and enter the details manually.' }, { status: 400 })
  const b64 = Buffer.from(arrayBuffer).toString('base64')

  const mediaBlock = file.type === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
    : { type: 'image',    source: { type: 'base64', media_type: file.type, data: b64 } }

  // One extraction pass with a given model — returns the parsed JSON object, or
  // null if the model didn't return parseable JSON.
  const runModel = async (model) => {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 400,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [mediaBlock, { type: 'text', text: EXTRACT_PROMPT }] }],
    })
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    try { return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) }
    catch { return null }
  }

  try {
    let parsed = await runModel(PRIMARY_MODEL)

    // Escalate to the stronger model only when the cheap pass failed to give a
    // usable answer: unparseable JSON, or a "receipt" it couldn't read any
    // amount from. A confident is_receipt:false is trusted as-is (no escalation)
    // so non-receipt uploads stay a single cheap call.
    const usable = parsed && (parsed.is_receipt === false || toNum(parsed.amount) != null || toNum(parsed.total) != null)
    if (!usable) {
      const retry = await runModel(FALLBACK_MODEL)
      if (retry) parsed = retry
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
    const total = toNum(parsed.total)
    const payment_method = PAYMENT_METHODS.includes(parsed.payment_method) ? parsed.payment_method : null
    const province = (typeof parsed.province === 'string' && PROVINCES.includes(parsed.province.toUpperCase())) ? parsed.province.toUpperCase() : null
    const notes = typeof parsed.notes === 'string' && parsed.notes.trim() ? parsed.notes.trim().slice(0, 200) : null
    // 3-letter currency code (uppercase); default CAD.
    const currency = (typeof parsed.currency === 'string' && /^[A-Za-z]{3}$/.test(parsed.currency.trim())) ? parsed.currency.trim().toUpperCase() : 'CAD'
    const vendor_tax_id = (typeof parsed.vendor_tax_id === 'string' && parsed.vendor_tax_id.trim()) ? parsed.vendor_tax_id.trim().slice(0, 40) : null

    // A "receipt" with no usable numbers is another non-receipt signal
    if (amount == null && total == null) {
      return Response.json({ error: 'No amounts could be read from that image. Enter the details manually.' }, { status: 422 })
    }

    // Flag when subtotal + taxes + tip don't reconcile with the printed total so
    // the client can tell the admin to double-check instead of silently trusting it
    const mismatch = amount != null && total != null && (gst != null || qst != null || tip != null)
      ? Math.abs(amount + (gst || 0) + (qst || 0) + (tip || 0) - total) > 0.02
      : false

    return Response.json({
      vendor: typeof parsed.vendor === 'string' ? parsed.vendor.slice(0, 100) : null,
      date, amount, gst, qst, tip, total, currency, vendor_tax_id, category, payment_method, province, notes, mismatch,
    })
  } catch (err) {
    captureException(err, { context: 'expenses-scan-receipt' })
    return Response.json(
      { error: process.env.NODE_ENV === 'development' ? err.message : 'Scan failed. Enter the details manually.' },
      { status: 500 }
    )
  }
}
