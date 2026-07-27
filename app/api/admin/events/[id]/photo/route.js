import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../lib/sentry'
import { ALLOWED_EXTS } from '../../../../../../lib/allowedImageTypes'

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

const PATH_RE = new RegExp(`^[\\w-]+-\\d+\\.(${ALLOWED_EXTS.join('|')})$`)

// Records the event photo after the browser has uploaded it directly to the
// event-photos bucket via a signed upload URL (see ./upload-url).
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const { path } = await request.json().catch(() => ({}))
  if (!PATH_RE.test(path || '')) return Response.json({ error: 'Invalid storage path.' }, { status: 400 })

  const admin = createAdminClient()

  // The file must actually exist — a record pointing at a failed upload
  // would render as a broken image on the homepage
  const { data: exists } = await admin.storage.from('event-photos').exists(path)
  if (!exists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  // Read old photo path BEFORE updating so we can delete it after success
  const { data: ev } = await admin.from('events').select('photo_url').eq('id', id).maybeSingle()
  const oldPath = storagePathFromUrl(ev?.photo_url)

  const { data: { publicUrl } } = admin.storage.from('event-photos').getPublicUrl(path)

  const { error: updateErr } = await admin.from('events').update({ photo_url: publicUrl }).eq('id', id)
  if (updateErr) {
    captureException(updateErr, { context: 'admin-event-photo-db', eventId: id })
    // New file is uploaded but DB not updated — clean up the orphan
    await admin.storage.from('event-photos').remove([path]).catch(() => {})
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  // DB updated — now safe to delete the old file
  if (oldPath) {
    await admin.storage.from('event-photos').remove([oldPath]).catch(() => {})
  }

  return Response.json({ url: publicUrl })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminClient()

  // Read the current photo_url so we can delete the exact storage file
  const { data: ev } = await admin.from('events').select('photo_url').eq('id', id).maybeSingle()
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
