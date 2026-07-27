import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'

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
