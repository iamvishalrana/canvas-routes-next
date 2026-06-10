import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('photo')
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
  const path = `${user.id}.${ext}`

  const admin = createAdminClient()

  // Create bucket if not exists
  await admin.storage.createBucket('member-photos', { public: true }).catch(() => {})

  const { error: uploadErr } = await admin.storage
    .from('member-photos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) return Response.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('member-photos').getPublicUrl(path)

  // Save URL to member record
  const { error: updateErr } = await admin.from('members').update({ car_photo_url: publicUrl }).eq('id', user.id)
  if (updateErr) {
    console.error('Failed to persist car photo URL:', updateErr.message)
    return Response.json({ error: 'Photo uploaded but could not be saved to your profile. Please try again.' }, { status: 500 })
  }

  return Response.json({ url: publicUrl })
}
