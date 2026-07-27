import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { memberPhotoPath, EXT_BY_MIME } from '../../../../lib/memberPhotoPath'

const BUCKET = 'member-photos'

// Records the photo after the member's browser has uploaded it directly to
// the member-photos bucket via a signed upload URL (see ./upload-url). The
// path is recomputed here from the authenticated user + kind/carIndex —
// never trusted from the client — so this doubles as the ownership check.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const kind = body.kind === 'avatar' ? 'avatar' : 'car'
  const carIndex = kind === 'car' && body.carIndex !== null && body.carIndex !== undefined && body.carIndex !== ''
    ? parseInt(body.carIndex, 10) : null
  const ext = EXT_BY_MIME[body.fileType]
  if (!ext) return Response.json({ error: 'File must be a valid image (JPEG, PNG, or WebP).' }, { status: 400 })

  const admin = createAdminClient()
  const path = memberPhotoPath(user.id, kind, carIndex, ext)

  const { data: exists } = await admin.storage.from(BUCKET).exists(path)
  if (!exists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  // Save URL to member record — cache-bust so a replaced photo shows immediately
  const bustedUrl = `${publicUrl}?v=${Date.now()}`

  if (kind === 'avatar') {
    const { error: updateErr } = await admin.from('members').update({ profile_photo_url: bustedUrl }).eq('id', user.id)
    if (updateErr) {
      console.error('Failed to persist avatar photo URL:', updateErr.message)
      return Response.json({ error: 'Photo uploaded but could not be saved to your profile. Please try again.' }, { status: 500 })
    }
    return Response.json({ url: bustedUrl })
  }

  // No carIndex — legacy single-photo callers, just set the flat column
  if (carIndex === null) {
    const { error: updateErr } = await admin.from('members').update({ car_photo_url: bustedUrl }).eq('id', user.id)
    if (updateErr) {
      console.error('Failed to persist car photo URL:', updateErr.message)
      return Response.json({ error: 'Photo uploaded but could not be saved to your profile. Please try again.' }, { status: 500 })
    }
    return Response.json({ url: bustedUrl })
  }

  // Per-car photo — read-modify-write the cars JSONB array
  const { data: memberRow, error: readErr } = await admin.from('members').select('cars').eq('id', user.id).single()
  if (readErr) {
    console.error('Failed to load cars for photo update:', readErr.message)
    return Response.json({ error: 'Photo uploaded but could not be saved to your profile. Please try again.' }, { status: 500 })
  }
  const cars = Array.isArray(memberRow?.cars) ? [...memberRow.cars] : []
  while (cars.length <= carIndex) cars.push({ year: '', make: '', model: '', license_plate: '' })
  cars[carIndex] = { ...cars[carIndex], photo_url: bustedUrl }

  // Keep the legacy flat column in sync with car 0 for older admin views
  const updatePayload = carIndex === 0 ? { cars, car_photo_url: bustedUrl } : { cars }
  const { error: updateErr } = await admin.from('members').update(updatePayload).eq('id', user.id)
  if (updateErr) {
    console.error('Failed to persist car photo URL:', updateErr.message)
    return Response.json({ error: 'Photo uploaded but could not be saved to your profile. Please try again.' }, { status: 500 })
  }

  return Response.json({ url: bustedUrl })
}
