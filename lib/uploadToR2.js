// Browser-side half of every direct-upload flow migrated to R2 — the server
// already issued a presigned PUT URL (see lib/r2.js createSignedUploadUrl);
// this just does the actual PUT straight to R2, bypassing our own API route
// entirely so large photos never hit Vercel's function body limit. Unlike
// Supabase's uploadToSignedUrl, R2's presigned URL needs no SDK client-side —
// it's a plain authenticated PUT.
export async function uploadToR2({ uploadUrl, file }) {
  const started = performance.now()
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) throw new Error(`upload failed (${res.status}) — please try again`)
  return { ms: performance.now() - started, bytes: file.size }
}
