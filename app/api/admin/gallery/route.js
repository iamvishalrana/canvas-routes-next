import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { captureException } from '../../../../lib/sentry'

const BUCKET = 'gallery-photos'

// Admin sees every photo, event and personal, with tags/owner names merged in
// JS — gallery_photos.member_id references auth.users (not the members table
// directly), so PostgREST can't embed the join; same pattern as the manual
// email-keyed maps used elsewhere in this codebase (e.g. events page regMap).
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: photos, error }, { data: tagRows }, { data: members }] = await Promise.all([
    supabase.from('gallery_photos').select('*').order('created_at', { ascending: true }),
    supabase.from('gallery_photo_tags').select('photo_id, member_id'),
    supabase.from('members').select('id, name, email'),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const memberById = new Map((members || []).map(m => [m.id, m]))
  const tagsByPhoto = new Map()
  for (const t of (tagRows || [])) {
    if (!tagsByPhoto.has(t.photo_id)) tagsByPhoto.set(t.photo_id, [])
    const m = memberById.get(t.member_id)
    tagsByPhoto.get(t.photo_id).push(m ? { id: m.id, name: m.name, email: m.email } : { id: t.member_id, name: null, email: null })
  }

  const enriched = (photos || []).map(p => ({
    ...p,
    member: p.member_id ? (memberById.get(p.member_id) ? { id: p.member_id, name: memberById.get(p.member_id).name, email: memberById.get(p.member_id).email } : { id: p.member_id, name: null, email: null }) : null,
    tags: tagsByPhoto.get(p.id) || [],
  }))

  return Response.json(enriched)
}

// Records a photo after the browser has uploaded both files directly to the
// gallery-photos bucket via signed upload URLs (see ./upload-url) — the
// full-size original plus a compressed display copy for grids/lightbox.
const PATH_RE = /^(originals|display)\/[\w-]+\.(jpg|png|webp)$/

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const category = body.category === 'personal' ? 'personal' : 'event'
  const album = (body.album || '').toString().trim()
  const albumDate = (body.albumDate || '').toString().trim()
  const caption = (body.caption || '').toString().trim()
  const memberId = (body.memberId || '').toString().trim()
  const tagMemberIds = Array.isArray(body.tagMemberIds) ? [...new Set(body.tagMemberIds.filter(Boolean))] : []
  const { displayPath, originalPath } = body

  if (category === 'event') {
    if (!album) return Response.json({ error: 'Event name is required.' }, { status: 400 })
    if (album.length > 120) return Response.json({ error: 'Event name is too long.' }, { status: 400 })
    if (albumDate && !/^\d{4}-\d{2}-\d{2}$/.test(albumDate)) return Response.json({ error: 'Invalid event date.' }, { status: 400 })
  } else {
    if (!memberId) return Response.json({ error: 'A member must be selected.' }, { status: 400 })
  }
  if (!PATH_RE.test(displayPath || '') || !PATH_RE.test(originalPath || '')) {
    return Response.json({ error: 'Invalid storage paths.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Both files must actually exist — a record pointing at a failed upload
  // would render as a broken tile for every member
  const [origInfo, dispInfo] = await Promise.all([
    supabase.storage.from(BUCKET).exists(originalPath),
    supabase.storage.from(BUCKET).exists(displayPath),
  ])
  if (!origInfo.data || !dispInfo.data) {
    return Response.json({ error: 'Upload incomplete — please retry this photo.' }, { status: 400 })
  }

  const { data: { publicUrl: displayUrl } } = supabase.storage.from(BUCKET).getPublicUrl(displayPath)
  const { data: { publicUrl: originalUrl } } = supabase.storage.from(BUCKET).getPublicUrl(originalPath)

  const { data: row, error: insertErr } = await supabase.from('gallery_photos')
    .insert({
      category,
      album: category === 'event' ? album : null,
      album_date: category === 'event' ? (albumDate || null) : null,
      member_id: category === 'personal' ? memberId : null,
      caption: caption.slice(0, 300) || null,
      photo_url: displayUrl,
      storage_path: displayPath,
      original_path: originalPath,
      original_url: originalUrl,
    })
    .select()
    .single()

  if (insertErr) {
    captureException(insertErr, { context: 'admin-gallery-insert', category, album, memberId })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  if (category === 'event' && tagMemberIds.length) {
    const { error: tagErr } = await supabase.from('gallery_photo_tags')
      .insert(tagMemberIds.map(id => ({ photo_id: row.id, member_id: id })))
    if (tagErr) captureException(tagErr, { context: 'admin-gallery-tag-insert', photoId: row.id })
  }

  await logAdminAction(supabase, adminUser?.email, {
    action: 'gallery.upload', entityType: 'gallery_photo', entityId: row.id,
    entityName: category === 'event' ? album : `personal:${memberId}`,
  })
  return Response.json({ ...row, tags: [] })
}

// Rename an event album and/or change its date across all its photos
export async function PATCH(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { album, newAlbum, newDate } = await request.json().catch(() => ({}))
  if (!album?.trim()) return Response.json({ error: 'Album is required.' }, { status: 400 })

  const updates = {}
  if (newAlbum?.trim()) updates.album = newAlbum.trim().slice(0, 120)
  if (newDate !== undefined) {
    if (newDate && !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return Response.json({ error: 'Invalid date.' }, { status: 400 })
    updates.album_date = newDate || null
  }
  if (Object.keys(updates).length === 0) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('gallery_photos').update(updates).eq('category', 'event').eq('album', album.trim())
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAdminAction(supabase, adminUser?.email, { action: 'gallery.album_update', entityType: 'gallery_album', entityName: album.trim(), metadata: updates })
  return Response.json({ success: true })
}

// Delete an entire event album: all DB rows plus their storage files
export async function DELETE(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { album } = await request.json().catch(() => ({}))
  if (!album?.trim()) return Response.json({ error: 'Album is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: rows, error: readErr } = await supabase.from('gallery_photos')
    .select('storage_path, original_path').eq('category', 'event').eq('album', album.trim())
  if (readErr) return Response.json({ error: readErr.message }, { status: 500 })

  const { error: delErr } = await supabase.from('gallery_photos').delete().eq('category', 'event').eq('album', album.trim())
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 })

  const paths = (rows || []).flatMap(r => [r.storage_path, r.original_path]).filter(Boolean)
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths).catch(err =>
    captureException(err, { context: 'admin-gallery-album-delete-storage', album }))

  await logAdminAction(supabase, adminUser?.email, { action: 'gallery.album_delete', entityType: 'gallery_album', entityName: album.trim(), metadata: { photos: paths.length } })
  return Response.json({ success: true })
}
