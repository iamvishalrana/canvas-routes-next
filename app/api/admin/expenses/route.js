import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { expense_date, event_name, vendor, amount, gst_amount, qst_amount, category, receipt_url, province, payment_method } = body
  if (!expense_date) return Response.json({ error: 'Date is required.' }, { status: 400 })
  const amt = parseFloat(amount)
  if (isNaN(amt) || amt < 0) return Response.json({ error: 'Valid amount required.' }, { status: 400 })

  const VALID_PM = ['cash', 'credit', 'etransfer', 'other']

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('expenses').insert({
    expense_date,
    event_name: event_name?.trim() || null,
    vendor:     vendor?.trim()     || null,
    amount:     amt,
    gst_amount: parseFloat(gst_amount) || 0,
    qst_amount: parseFloat(qst_amount) || 0,
    tax_amount: 0, // legacy column — GST/QST are the source of truth now
    province:   province || 'QC',
    payment_method: VALID_PM.includes(payment_method) ? payment_method : null,
    category:   category || null,
    receipt_url: receipt_url || null,
  }).select('*').single()

  if (error) {
    captureException(error, { context: 'admin-expenses-insert' })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}
