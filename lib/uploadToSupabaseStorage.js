import { createClient } from './supabase/client'

// Shared second half of every direct-upload flow: our server already issued
// a one-time signed upload URL (bucket-specific request/response shape, see
// each feature's own upload-url route) — this just does the actual PUT
// straight to Supabase Storage from the browser, bypassing our own API
// route entirely so large photos never hit Vercel's function body limit.
export async function uploadToSupabaseStorage({ bucket, path, token, file }) {
  const supabase = createClient()
  const started = performance.now()
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type })
  if (error) throw new Error(error.message || 'Upload failed.')
  return { ms: performance.now() - started, bytes: file.size }
}
