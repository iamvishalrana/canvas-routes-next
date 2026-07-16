import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { getAnthropic } from '../../../../../lib/anthropic'
import { checkRateLimit } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { EXPENSE_CATEGORIES } from '../../../../../lib/expenseCategories'

// Vision-capable image types Anthropic accepts. HEIC (common on iPhone) is NOT
// supported by the vision API, so it's rejected with a clear message below.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const CATEGORIES = EXPENSE_CATEGORIES

const SYSTEM_PROMPT = `You extract structured data from a receipt or invoice image for a Montreal (Quebec, Canada) automotive club's expense tracker. You always respond with a single minified JSON object and nothing else — no explanation, no markdown fences.`

const EXTRACT_PROMPT = `Read this receipt or invoice and return ONLY minified JSON with exactly these keys:
{"vendor":string|null,"date":"YYYY-MM-DD"|null,"amount":number|null,"gst":number|null,"qst":number|null,"total":number|null,"category":string|null}

Rules:
- "vendor" = the business/merchant name.
- "date" = the transaction date in YYYY-MM-DD. If the year is missing, infer the most likely recent year.
- "amount" = the PRE-TAX subtotal (goods/services before taxes). If only a grand total is shown with no tax lines, set "amount" to that total and leave "gst" and "qst" null.
- "gst" = the GST / TPS amount (federal, ~5%) only. "qst" = the QST / TVQ amount (Quebec, ~9.975%) only. If a single combined tax line is shown, put the whole amount in "gst" and leave "qst" null.
- "total" = the grand total actually paid.
- "category" MUST be exactly one of: ${CATEGORIES.join(', ')}. Pick the best fit, or null if unclear.
- Use null for anything not clearly present. All numbers must be plain decimals with no currency symbols (e.g. 12.34).`

function toNum(v) {
  if (v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  if (await checkRateLimit(ip, 20, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

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
  if (arrayBuffer.byteLength > MAX_BYTES) return Response.json({ error: 'File too large (max 10 MB).' }, { status: 400 })
  const b64 = Buffer.from(arrayBuffer).toString('base64')

  const mediaBlock = file.type === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
    : { type: 'image',    source: { type: 'base64', media_type: file.type, data: b64 } }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: [mediaBlock, { type: 'text', text: EXTRACT_PROMPT }] }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim()
    let parsed
    try { parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) }
    catch { return Response.json({ error: 'Could not read that receipt. Enter the details manually.' }, { status: 422 }) }

    const date = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : null

    return Response.json({
      vendor:   typeof parsed.vendor === 'string' ? parsed.vendor.slice(0, 100) : null,
      date,
      amount:   toNum(parsed.amount),
      gst:      toNum(parsed.gst),
      qst:      toNum(parsed.qst),
      total:    toNum(parsed.total),
      category,
    })
  } catch (err) {
    captureException(err, { context: 'expenses-scan-receipt' })
    return Response.json(
      { error: process.env.NODE_ENV === 'development' ? err.message : 'Scan failed. Enter the details manually.' },
      { status: 500 }
    )
  }
}
