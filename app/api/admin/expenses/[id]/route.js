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
  const ALLOWED = ['expense_date', 'event_name', 'vendor', 'amount', 'tax_amount', 'gst_amount', 'qst_amount', 'tip_amount', 'province', 'payment_method', 'category', 'receipt_url', 'receipt_urls', 'vendor_tax_id', 'reconciled', 'currency', 'original_amount', 'notes']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })
  if ('notes' in update) update.notes = (update.notes || '').trim().slice(0, 1000) || null
  if ('vendor_tax_id' in update) update.vendor_tax_id = (update.vendor_tax_id || '').trim().slice(0, 40) || null
  if ('reconciled' in update) update.reconciled = update.reconciled === true
  if ('currency' in update) {
    const cur = typeof update.currency === 'string' ? update.currency.trim() : ''
    update.currency = /^[A-Za-z]{3}$/.test(cur) ? cur.toUpperCase() : (/^[A-Za-z]{2,10}$/.test(cur) ? cur : 'CAD')
  }
  if ('original_amount' in update) {
    const oa = update.original_amount === '' || update.original_amount === null ? null : parseFloat(update.original_amount)
    if (oa !== null && (!Number.isFinite(oa) || oa < 0)) return Response.json({ error: 'Original amount must be a valid non-negative number.' }, { status: 400 })
    update.original_amount = oa
  }

  // Multiple attachments: normalise the array and keep the legacy receipt_url
  // (first element) in sync so single-receipt displays keep working.
  if ('receipt_urls' in update) {
    const list = (Array.isArray(update.receipt_urls) ? update.receipt_urls : []).filter(u => typeof u === 'string' && u).slice(0, 10)
    update.receipt_urls = list
    update.receipt_url = list[0] || null
  }

  // Same rigor as POST — without this, clearing the date or typing a
  // negative amount hit the DB raw (empty string into a DATE column, no
  // guard on NUMERIC sign) and surfaced a raw Postgres error to the admin.
  if ('expense_date' in update && !update.expense_date) {
    return Response.json({ error: 'Date is required.' }, { status: 400 })
  }
  for (const field of ['amount', 'gst_amount', 'qst_amount', 'tip_amount', 'tax_amount']) {
    if (field in update) {
      const n = parseFloat(update[field])
      if (!Number.isFinite(n) || n < 0) return Response.json({ error: `${field.replace('_', ' ')} must be a valid non-negative number.` }, { status: 400 })
      update[field] = n
    }
  }
  const VALID_PM = ['cash', 'credit', 'debit', 'etransfer', 'other']
  if ('payment_method' in update && update.payment_method && !VALID_PM.includes(update.payment_method)) {
    return Response.json({ error: 'Invalid payment method.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Any attachments removed by this edit must be cleaned out of storage after
  // the update commits — otherwise every replace/remove orphans files forever.
  // Compare the old attachment set (receipt_urls, falling back to the legacy
  // single receipt_url) against the new one.
  let removedUrls = []
  if ('receipt_urls' in update || 'receipt_url' in update) {
    const { data: existing } = await supabase.from('expenses').select('receipt_url, receipt_urls').eq('id', id).maybeSingle()
    const oldSet = new Set([...(existing?.receipt_urls || []), existing?.receipt_url].filter(Boolean))
    const newSet = new Set([...(update.receipt_urls || []), update.receipt_url].filter(Boolean))
    removedUrls = [...oldSet].filter(u => !newSet.has(u))
  }

  const { data, error } = await supabase.from('expenses').update(update).eq('id', id).select('*').single()
  if (error) {
    captureException(error, { context: 'admin-expenses-patch', id })
    return Response.json({ error: error.message }, { status: 500 })
  }
  for (const u of removedUrls) await deleteReceiptFile(supabase, u)
  return Response.json(data)
}

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: expense } = await supabase
    .from('expenses').select('receipt_url, receipt_urls').eq('id', id).maybeSingle()

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) {
    captureException(error, { context: 'admin-expenses-delete', id })
    return Response.json({ error: error.message }, { status: 500 })
  }

  await logAdminAction(supabase, adminUser?.email, { action: 'expense.delete', entityType: 'expense', entityId: id })
  // Remove every attachment (invoice + receipt + …), not just the primary.
  for (const u of new Set([...(expense?.receipt_urls || []), expense?.receipt_url].filter(Boolean))) {
    await deleteReceiptFile(supabase, u)
  }

  return Response.json({ success: true })
}
