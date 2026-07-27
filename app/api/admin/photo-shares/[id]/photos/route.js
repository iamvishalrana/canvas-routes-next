import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../lib/sentry'

const BUCKET = 'photo-shares'

function pathRegexFor(shareId) {
  return new RegExp(`^${shareId}/(originals|display)/[\\w-]+\\.(jpg|png|webp)$`)
}

// Lists the photos already attached to a share — used when the admin reopens
// an existing share to add more. storage_path is the pre-compressed display
// copy, original_path the untouched original.
export async function GET(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase.from('photo_share_items')
    .select('*').eq('share_id', id).order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const enriched = (data || []).map(item => {
    const { data: { publicUrl: displayUrl } } = supabase.storage.from(BUCKET).getPublicUrl(item.storage_path)
    const { data: { publicUrl: originalUrl } } = supabase.storage.from(BUCKET).getPublicUrl(item.original_path || item.storage_path)
    return { ...item, url: displayUrl, originalUrl }
  })
  return Response.json(enriched)
}

// Records a photo after the admin browser has uploaded both the original
// and a pre-compressed display copy directly to the photo-shares bucket via
// signed upload URLs (see ./upload-url).
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { originalPath, displayPath } = await request.json().catch(() => ({}))
  const re = pathRegexFor(id)
  if (!re.test(originalPath || '') || !re.test(displayPath || '')) {
    return Response.json({ error: 'Invalid storage path.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: share } = await supabase.from('photo_shares').select('id').eq('id', id).maybeSingle()
  if (!share) return Response.json({ error: 'Share not found.' }, { status: 404 })

  const [{ data: origExists }, { data: dispExists }] = await Promise.all([
    supabase.storage.from(BUCKET).exists(originalPath),
    supabase.storage.from(BUCKET).exists(displayPath),
  ])
  if (!origExists || !dispExists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: row, error } = await supabase.from('photo_share_items')
    .insert({ share_id: id, storage_path: displayPath, original_path: originalPath }).select('*').single()
  if (error) {
    captureException(error, { context: 'admin-photo-share-item-insert', shareId: id })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  const { data: { publicUrl: url } } = supabase.storage.from(BUCKET).getPublicUrl(displayPath)
  const { data: { publicUrl: originalUrl } } = supabase.storage.from(BUCKET).getPublicUrl(originalPath)
  return Response.json({ ...row, url, originalUrl })
}
