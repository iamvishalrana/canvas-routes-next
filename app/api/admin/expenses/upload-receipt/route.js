import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { deleteReceiptFile } from '../../../../../lib/deleteReceiptFile'

const BUCKET = 'receipts'
const PATH_RE = /^[a-z0-9\-/]+\/\d+_[a-z0-9]+\.[a-z0-9]+$/

// Records the receipt after the admin browser has uploaded it directly to
// the receipts bucket via a signed upload URL (see ./upload-url). No DB
// write happens here — the caller attaches the returned URL to an expense
// via a separate save — so this step just confirms the file actually landed
// before handing back a public URL.
export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { path } = await request.json().catch(() => ({}))
  if (!PATH_RE.test(path || '')) return Response.json({ error: 'Invalid storage path.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: exists } = await supabase.storage.from(BUCKET).exists(path)
  if (!exists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return Response.json({ url: publicUrl })
}

// Lets the client clean up an uploaded-but-never-saved receipt (e.g. the
// admin attaches a file, then picks a different one, removes it, or cancels
// the edit before hitting Save). Without this, every such abandoned upload
// sits in Storage forever — the only other cleanup path is the PATCH route's
// old-vs-new diff, which only ever sees receipts that made it into the DB.
// Refuses to delete a receipt that's still attached to a real expense row so
// a stale client reference can never take out a committed receipt.
export async function DELETE(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { url } = await request.json().catch(() => ({}))
  if (!url) return Response.json({ error: 'Missing url.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: inUse } = await supabase.from('expenses').select('id').eq('receipt_url', url).maybeSingle()
  if (inUse) return Response.json({ error: 'Receipt is attached to a saved expense.' }, { status: 400 })

  await deleteReceiptFile(supabase, url)
  return Response.json({ success: true })
}
