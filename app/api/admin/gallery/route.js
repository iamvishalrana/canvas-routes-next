import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { captureException } from '../../../../lib/sentry'

const BUCKET = 'gallery-photos'

export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('gallery_photos')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('photo')
  const album = (formData.get('album') || '').toString().trim()
  const albumDate = (formData.get('albumDate') || '').toString().trim()
  const caption = (formData.get('caption') || '').toString().trim()

  if (!album) return Response.json({ error: 'Album name is required.' }, { status: 400 })
  if (album.length > 120) return Response.json({ error: 'Album name is too long.' }, { status: 400 })
  if (albumDate && !/^\d{4}-\d{2}-\d{2}$/.test(albumDate)) return Response.json({ error: 'Invalid album date.' }, { status: 400 })
  if (!file || typeof file === 'string') return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: 'File must be under 10 MB' }, { status: 400 })
  if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Validate magic bytes. iOS auto-converts HEIC to JPEG before upload; HEIC
  // uploaded directly from desktop is detected and rejected with a clear message.
  const m = new Uint8Array(bytes.slice(0, 12))
  const isJpeg = m[0] === 0xFF && m[1] === 0xD8
  const isPng  = m[0] === 0x89 && m[1] === 0x50
  const isWebp = m[8] === 0x57 && m[9] === 0x45 && m[10] === 0x42
  const isHeic = m[4] === 0x66 && m[5] === 0x74 && m[6] === 0x79 && m[7] === 0x70

  if (isHeic) {
    return Response.json({ error: 'HEIC format cannot be displayed in browsers. Please export the photo as JPEG or PNG first.' }, { status: 400 })
  }
  if (!isJpeg && !isPng && !isWebp) {
    return Response.json({ error: 'File must be a JPEG, PNG, or WebP image.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    captureException(uploadErr, { context: 'admin-gallery-upload', album })
    return Response.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { data: row, error: insertErr } = await supabase.from('gallery_photos')
    .insert({
      album,
      album_date: albumDate || null,
      caption: caption.slice(0, 300) || null,
      photo_url: publicUrl,
      storage_path: path,
    })
    .select()
    .single()

  if (insertErr) {
    captureException(insertErr, { context: 'admin-gallery-insert', album })
    // File is uploaded but DB row failed — clean up the orphan
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  await logAdminAction(supabase, adminUser?.email, { action: 'gallery.upload', entityType: 'gallery_photo', entityId: row.id, entityName: album })
  return Response.json(row)
}

// Rename an album and/or change its date across all its photos
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
  const { error } = await supabase.from('gallery_photos').update(updates).eq('album', album.trim())
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAdminAction(supabase, adminUser?.email, { action: 'gallery.album_update', entityType: 'gallery_album', entityName: album.trim(), metadata: updates })
  return Response.json({ success: true })
}

// Delete an entire album: all DB rows plus their storage files
export async function DELETE(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { album } = await request.json().catch(() => ({}))
  if (!album?.trim()) return Response.json({ error: 'Album is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: rows, error: readErr } = await supabase.from('gallery_photos')
    .select('storage_path').eq('album', album.trim())
  if (readErr) return Response.json({ error: readErr.message }, { status: 500 })

  const { error: delErr } = await supabase.from('gallery_photos').delete().eq('album', album.trim())
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 })

  const paths = (rows || []).map(r => r.storage_path).filter(Boolean)
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths).catch(err =>
    captureException(err, { context: 'admin-gallery-album-delete-storage', album }))

  await logAdminAction(supabase, adminUser?.email, { action: 'gallery.album_delete', entityType: 'gallery_album', entityName: album.trim(), metadata: { photos: paths.length } })
  return Response.json({ success: true })
}
