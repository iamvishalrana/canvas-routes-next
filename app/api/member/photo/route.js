import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Only allow images
  if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image' }, { status: 400 })
  if (buffer.length > 8 * 1024 * 1024) return Response.json({ error: 'File must be under 8 MB' }, { status: 400 })

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
  await admin.from('members').upsert({ id: user.id, email: user.email, car_photo_url: publicUrl }, { onConflict: 'id' })

  return Response.json({ url: publicUrl })
}
