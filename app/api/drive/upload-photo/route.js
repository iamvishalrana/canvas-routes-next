import { writeFile } from 'fs/promises'
import { join } from 'path'

const UPLOAD_PASSWORD = 'laurentians'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const pw = formData.get('pw')
    const file = formData.get('file')

    if (pw !== UPLOAD_PASSWORD) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!file || typeof file === 'string') return Response.json({ error: 'No file provided' }, { status: 400 })

    const name = file.name || ''
    const dotIndex = name.lastIndexOf('.')
    const ext = dotIndex !== -1 ? name.slice(dotIndex + 1).toLowerCase() : ''
    const allowed = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowed.includes(ext)) return Response.json({ error: 'Please upload a JPG, PNG, or WebP image' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `car-frederic-lefebvre.${ext}`

    try {
      const path = join(process.cwd(), 'public', filename)
      await writeFile(path, buffer)
    } catch {
      // Vercel serverless filesystem is read-only — write to /tmp as fallback
      const path = join('/tmp', filename)
      await writeFile(path, buffer)
    }

    return Response.json({ success: true, filename })
  } catch (err) {
    console.error('Upload error:', err)
    return Response.json({ error: 'Upload failed — please send the photo to Jerry directly.' }, { status: 500 })
  }
}
