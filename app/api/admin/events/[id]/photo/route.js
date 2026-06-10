import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../lib/sentry'

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

  const magicBytes = new Uint8Array(bytes.slice(0, 12))
  const isJpeg = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8
  const isPng  = magicBytes[0] === 0x89 && magicBytes[1] === 0x50
  const isWebp = magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && magicBytes[10] === 0x42
  if (!isJpeg && !isPng && !isWebp) {
    return Response.json({ error: 'File must be a valid image (JPEG, PNG, or WebP)' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${id}.${ext}`

  const admin = createAdminClient()
  await admin.storage.createBucket('event-photos', { public: true }).catch(() => {})

  const { error: uploadErr } = await admin.storage
    .from('event-photos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

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
  const admin = createAdminClient()

  // Clear the URL first so the event stops showing the photo immediately
  await admin.from('events').update({ photo_url: null }).eq('id', id)

  // Best-effort delete from storage (try both common extensions)
  for (const ext of ['jpg', 'png', 'webp']) {
    await admin.storage.from('event-photos').remove([`${id}.${ext}`]).catch(() => {})
  }

  return Response.json({ success: true })
}
