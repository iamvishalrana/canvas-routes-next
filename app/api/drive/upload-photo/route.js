import { writeFile } from 'fs/promises'
import { join } from 'path'

const UPLOAD_PASSWORD = 'laurentians'

export async function POST(request) {
  const formData = await request.formData()
  const pw = formData.get('pw')
  const file = formData.get('file')

  if (pw !== UPLOAD_PASSWORD) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop().toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'webp']
  if (!allowed.includes(ext)) return Response.json({ error: 'Invalid file type' }, { status: 400 })

  const filename = `car-frederic-lefebvre.${ext}`
  const path = join(process.cwd(), 'public', filename)
  await writeFile(path, buffer)

  return Response.json({ success: true, filename })
}
