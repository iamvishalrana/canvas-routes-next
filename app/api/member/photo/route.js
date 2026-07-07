import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('photo')
  const kind = formData.get('kind') === 'avatar' ? 'avatar' : 'car'
  const carIndexRaw = formData.get('carIndex')
  const carIndex = kind === 'car' && carIndexRaw !== null && carIndexRaw !== '' ? parseInt(carIndexRaw, 10) : null
  if (!file || typeof file === 'string') return Response.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: 'File must be under 8 MB' }, { status: 400 })
  if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Magic byte check — verify file is actually an image
  const magicBytes = new Uint8Array(bytes.slice(0, 12))
  const isJpeg = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF
  const isPng = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47
  const isWebp = magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && magicBytes[10] === 0x42 && magicBytes[11] === 0x50
  const isGif = magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46
  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return Response.json({ error: 'File must be a valid image (JPEG, PNG, WebP, or GIF)' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = kind === 'avatar'
    ? `${user.id}-avatar.${ext}`
    : (carIndex !== null && carIndex > 0 ? `${user.id}-car-${carIndex}.${ext}` : `${user.id}.${ext}`)

  const admin = createAdminClient()

  // Create bucket if not exists
  await admin.storage.createBucket('member-photos', { public: true }).catch(() => {})

  const { error: uploadErr } = await admin.storage
    .from('member-photos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) return Response.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('member-photos').getPublicUrl(path)

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
