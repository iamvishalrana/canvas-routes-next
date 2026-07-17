import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../lib/adminAudit.js'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'
import { deleteReceiptFile } from '../../../../../lib/deleteReceiptFile'

export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const ALLOWED = ['expense_date', 'event_name', 'vendor', 'amount', 'tax_amount', 'gst_amount', 'qst_amount', 'province', 'payment_method', 'category', 'receipt_url']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  // Same rigor as POST — without this, clearing the date or typing a
  // negative amount hit the DB raw (empty string into a DATE column, no
  // guard on NUMERIC sign) and surfaced a raw Postgres error to the admin.
  if ('expense_date' in update && !update.expense_date) {
    return Response.json({ error: 'Date is required.' }, { status: 400 })
  }
  for (const field of ['amount', 'gst_amount', 'qst_amount', 'tax_amount']) {
    if (field in update) {
      const n = parseFloat(update[field])
      if (!Number.isFinite(n) || n < 0) return Response.json({ error: `${field.replace('_', ' ')} must be a valid non-negative number.` }, { status: 400 })
      update[field] = n
    }
  }
  const VALID_PM = ['cash', 'credit', 'etransfer', 'other']
  if ('payment_method' in update && update.payment_method && !VALID_PM.includes(update.payment_method)) {
    return Response.json({ error: 'Invalid payment method.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // If the receipt is being replaced or cleared, remember the old file so it
  // can be cleaned up after the update succeeds — otherwise every re-attach
  // leaves the previous upload orphaned in storage forever.
  let previousReceiptUrl = null
  if ('receipt_url' in update) {
    const { data: existing } = await supabase.from('expenses').select('receipt_url').eq('id', id).maybeSingle()
    if (existing?.receipt_url && existing.receipt_url !== update.receipt_url) previousReceiptUrl = existing.receipt_url
  }

  const { data, error } = await supabase.from('expenses').update(update).eq('id', id).select('*').single()
  if (error) {
    captureException(error, { context: 'admin-expenses-patch', id })
    return Response.json({ error: error.message }, { status: 500 })
  }
  if (previousReceiptUrl) await deleteReceiptFile(supabase, previousReceiptUrl)
  return Response.json(data)
}

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: expense } = await supabase
    .from('expenses').select('receipt_url').eq('id', id).maybeSingle()

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) {
    captureException(error, { context: 'admin-expenses-delete', id })
    return Response.json({ error: error.message }, { status: 500 })
  }

  await logAdminAction(supabase, adminUser?.email, { action: 'expense.delete', entityType: 'expense', entityId: id })
  await deleteReceiptFile(supabase, expense?.receipt_url)

  return Response.json({ success: true })
}
