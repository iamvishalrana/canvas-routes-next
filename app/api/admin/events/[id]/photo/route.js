import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../lib/sentry'

// Extract the storage path from a Supabase public URL
function storagePathFromUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    // Path is like /storage/v1/object/public/event-photos/...
    const match = u.pathname.match(/\/storage\/v1\/object\/public\/event-photos\/(.+)/)
    return match ? match[1].split('?')[0] : null
  } catch { return null }
}

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const formData = await request.formData()
  const file = formData.get('photo')
  if (!file || typeof file === 'string') return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: 'File must be under 10 MB' }, { status: 400 })
  if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Validate magic bytes. iOS auto-converts HEIC to JPEG before upload (file.type
  // becomes image/jpeg and bytes are JPEG). HEIC uploaded directly from desktop
  // is detected and rejected with a clear message.
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

  const admin = createAdminClient()
  await admin.storage.createBucket('event-photos', { public: true }).catch(() => {})

  // Delete the previous photo from storage before uploading the new one
  const { data: ev } = await admin.from('events').select('photo_url').eq('id', id).single().catch(() => ({ data: null }))
  const oldPath = storagePathFromUrl(ev?.photo_url)
  if (oldPath) {
    await admin.storage.from('event-photos').remove([oldPath]).catch(() => {})
  }

  // Timestamp in filename busts CDN and browser caches on every upload
  const ts = Date.now()
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${id}-${ts}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('event-photos')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    captureException(uploadErr, { context: 'admin-event-photo-upload', eventId: id })
    return Response.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('event-photos').getPublicUrl(path)

  const { error: updateErr } = await admin.from('events').update({ photo_url: publicUrl }).eq('id', id)
  if (updateErr) {
    captureException(updateErr, { context: 'admin-event-photo-db', eventId: id })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  return Response.json({ url: publicUrl })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminClient()

  // Read the current photo_url so we can delete the exact storage file
  const { data: ev } = await admin.from('events').select('photo_url').eq('id', id).single().catch(() => ({ data: null }))
  const oldPath = storagePathFromUrl(ev?.photo_url)

  const { error: updateErr } = await admin.from('events').update({ photo_url: null }).eq('id', id)
  if (updateErr) {
    captureException(updateErr, { context: 'admin-event-photo-delete-db', eventId: id })
    return Response.json({ error: 'Could not remove photo. Please try again.' }, { status: 500 })
  }

  if (oldPath) {
    await admin.storage.from('event-photos').remove([oldPath]).catch(() => {})
  } else {
    // Fallback: try legacy fixed-name paths for events uploaded before timestamped naming
    await Promise.all(['jpg', 'png', 'webp'].map(ext =>
      admin.storage.from('event-photos').remove([`${id}.${ext}`]).catch(() => {})
    ))
  }

  return Response.json({ success: true })
}
