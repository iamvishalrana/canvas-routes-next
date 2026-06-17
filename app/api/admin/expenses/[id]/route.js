import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'

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
