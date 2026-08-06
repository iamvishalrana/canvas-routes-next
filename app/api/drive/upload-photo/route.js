import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'
import { captureException } from '../../../../lib/sentry'
import { ALLOWED_EXTS } from '../../../../lib/allowedImageTypes'

const UPLOAD_PASSWORD = 'laurentians'
const BUCKET = 'drive-photos'
const SETTINGS_KEY = 'drive_frederic_photo_url'
const PATH_RE = new RegExp(`^car-frederic-lefebvre-\\d+\\.(${ALLOWED_EXTS.join('|')})$`)

// Confirm step: records the photo after the browser has already uploaded it
// directly to Storage via a signed URL from ./upload-url. Reused as a public
// read for the itinerary page to pick up the latest uploaded photo without
// needing a page refresh from a different visitor's session (see GET below).
export async function POST(request) {
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 5, 60, 'drive-upload-photo')) {
    return Response.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 })
  }

  const { pw, path } = await request.json().catch(() => ({}))
  if (pw !== UPLOAD_PASSWORD) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!PATH_RE.test(path || '')) return Response.json({ error: 'Invalid storage path.' }, { status: 400 })

  const admin = createAdminClient()

  // The file must actually exist — recording a URL for a failed/partial
  // upload would just show a broken image on the itinerary page.
  const { data: exists } = await admin.storage.from(BUCKET).exists(path)
  if (!exists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: existingSetting } = await admin.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
  const oldPath = existingSetting?.value?.split('/').pop()?.split('?')[0] || null

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  const { error: settingsErr } = await admin.from('settings').upsert(
    { key: SETTINGS_KEY, value: publicUrl, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (settingsErr) {
    captureException(settingsErr, { context: 'drive-upload-photo-settings' })
    // New file is uploaded but not recorded — clean up the orphan
    await admin.storage.from(BUCKET).remove([path]).catch(() => {})
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  // Recorded successfully — now safe to delete the previous upload
  if (oldPath && oldPath !== path) {
    await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {})
  }

  return Response.json({ url: publicUrl })
}
