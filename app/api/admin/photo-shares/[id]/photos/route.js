import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { buildTransformedUrl } from '../../../../../../lib/supabaseImageUrl.js'
import { captureException } from '../../../../../../lib/sentry'

const BUCKET = 'photo-shares'
const DISPLAY_WIDTH = 1600

function pathRegexFor(shareId) {
  return new RegExp(`^${shareId}/[\\w-]+\\.(jpg|png|webp)$`)
}

// Lists the photos already attached to a share — used when the admin reopens
// an existing share to add more.
export async function GET(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase.from('photo_share_items')
    .select('*').eq('share_id', id).order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const enriched = (data || []).map(item => {
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(item.storage_path)
    return { ...item, url: buildTransformedUrl(publicUrl, { width: DISPLAY_WIDTH }), originalUrl: publicUrl }
  })
  return Response.json(enriched)
}

// Records a photo after the admin browser has uploaded it directly to the
// photo-shares bucket via a signed upload URL (see ./upload-url).
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { path } = await request.json().catch(() => ({}))
  if (!pathRegexFor(id).test(path || '')) return Response.json({ error: 'Invalid storage path.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: share } = await supabase.from('photo_shares').select('id').eq('id', id).maybeSingle()
  if (!share) return Response.json({ error: 'Share not found.' }, { status: 404 })

  const { data: exists } = await supabase.storage.from(BUCKET).exists(path)
  if (!exists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: row, error } = await supabase.from('photo_share_items')
    .insert({ share_id: id, storage_path: path }).select('*').single()
  if (error) {
    captureException(error, { context: 'admin-photo-share-item-insert', shareId: id })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return Response.json({ ...row, url: buildTransformedUrl(publicUrl, { width: DISPLAY_WIDTH }), originalUrl: publicUrl })
}
