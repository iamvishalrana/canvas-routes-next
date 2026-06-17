import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const ALLOWED = ['expense_date', 'event_name', 'vendor', 'amount', 'tax_amount', 'category', 'receipt_url']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('expenses').update(update).eq('id', id).select('*').single()
  if (error) {
    captureException(error, { context: 'admin-expenses-patch', id })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: expense } = await supabase
    .from('expenses').select('receipt_url').eq('id', id).maybeSingle()

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) {
    captureException(error, { context: 'admin-expenses-delete', id })
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Delete receipt from storage
  if (expense?.receipt_url) {
    try {
      const url = new URL(expense.receipt_url)
      const marker = '/object/public/receipts/'
      const idx = url.pathname.indexOf(marker)
      if (idx !== -1) {
        const path = url.pathname.slice(idx + marker.length)
        await supabase.storage.from('receipts').remove([decodeURIComponent(path)])
      }
    } catch {}
  }

  return Response.json({ success: true })
}
