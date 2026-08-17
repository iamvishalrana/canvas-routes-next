import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { expense_date, event_name, vendor, amount, gst_amount, qst_amount, category, receipt_url, province, payment_method, notes } = body
  // Multiple attachments (invoice + receipt, etc.). Fall back to the single
  // receipt_url for older callers. receipt_url is kept as the first element so
  // existing single-receipt displays/queries still work.
  const receiptUrls = (Array.isArray(body.receiptUrls) ? body.receiptUrls : (receipt_url ? [receipt_url] : []))
    .filter(u => typeof u === 'string' && u).slice(0, 10)
  if (!expense_date) return Response.json({ error: 'Date is required.' }, { status: 400 })
  // Upper bound guards the NUMERIC(10,2) columns (max 99,999,999.99) — without
  // it an absurd value throws a raw "numeric field overflow" 500.
  const MAX_AMT = 99999999.99
  const amt = parseFloat(amount)
  if (isNaN(amt) || amt < 0 || amt > MAX_AMT) return Response.json({ error: 'Valid amount required.' }, { status: 400 })
  const gstAmt = gst_amount === undefined || gst_amount === '' ? 0 : parseFloat(gst_amount)
  const qstAmt = qst_amount === undefined || qst_amount === '' ? 0 : parseFloat(qst_amount)
  const tipAmt = body.tip_amount === undefined || body.tip_amount === '' ? 0 : parseFloat(body.tip_amount)
  if (!Number.isFinite(gstAmt) || gstAmt < 0 || gstAmt > MAX_AMT) return Response.json({ error: 'GST must be a valid non-negative number.' }, { status: 400 })
  if (!Number.isFinite(qstAmt) || qstAmt < 0 || qstAmt > MAX_AMT) return Response.json({ error: 'Tax must be a valid non-negative number.' }, { status: 400 })
  if (!Number.isFinite(tipAmt) || tipAmt < 0 || tipAmt > MAX_AMT) return Response.json({ error: 'Tip must be a valid non-negative number.' }, { status: 400 })

  const VALID_PM = ['cash', 'credit', 'debit', 'etransfer', 'other']
  // Accept a 3-letter ISO code (uppercased) or a short label like "Other" from
  // the dropdown; anything else falls back to CAD.
  const curRaw = typeof body.currency === 'string' ? body.currency.trim() : ''
  const currency = /^[A-Za-z]{3}$/.test(curRaw) ? curRaw.toUpperCase() : (/^[A-Za-z]{2,10}$/.test(curRaw) ? curRaw : 'CAD')
  const origAmt = body.original_amount === undefined || body.original_amount === '' || body.original_amount === null ? null : parseFloat(body.original_amount)
  if (origAmt !== null && (!Number.isFinite(origAmt) || origAmt < 0)) return Response.json({ error: 'Original amount must be a valid non-negative number.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('expenses').insert({
    expense_date,
    event_name: event_name?.trim() || null,
    vendor:     vendor?.trim()     || null,
    amount:     amt,
    gst_amount: gstAmt,
    qst_amount: qstAmt,
    tip_amount: tipAmt,
    tax_amount: 0, // legacy column — GST/QST are the source of truth now
    province:   province || 'QC',
    payment_method: VALID_PM.includes(payment_method) ? payment_method : null,
    category:   category || null,
    receipt_url: receiptUrls[0] || null,
    receipt_urls: receiptUrls,
    vendor_tax_id: body.vendor_tax_id?.trim().slice(0, 40) || null,
    reconciled: body.reconciled === true,
    currency,
    original_amount: origAmt,
    notes:      notes?.trim().slice(0, 1000) || null,
  }).select('*').single()

  if (error) {
    captureException(error, { context: 'admin-expenses-insert' })
    return Response.json({ error: error.message }, { status: 500 })
  }
  await logAdminAction(supabase, adminUser?.email, {
    action: 'expense.create', entityType: 'expense', entityId: data.id,
    entityName: [vendor?.trim(), event_name?.trim()].filter(Boolean).join(' — ') || 'Expense',
    metadata: { amount: amt, date: expense_date },
  })
  return Response.json(data)
}
