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
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { expense_date, event_name, vendor, amount, tax_amount, category, receipt_url } = body
  if (!expense_date) return Response.json({ error: 'Date is required.' }, { status: 400 })
  const amt = parseFloat(amount)
  if (isNaN(amt) || amt < 0) return Response.json({ error: 'Valid amount required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('expenses').insert({
    expense_date,
    event_name: event_name?.trim() || null,
    vendor:     vendor?.trim()     || null,
    amount:     amt,
    tax_amount: parseFloat(tax_amount) || 0,
    category:   category || null,
    receipt_url: receipt_url || null,
  }).select('*').single()

  if (error) {
    captureException(error, { context: 'admin-expenses-insert' })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}
