// Browser-side half of every direct-upload flow migrated to R2 — the server
// already issued a presigned PUT URL (see lib/r2.js createSignedUploadUrl);
// this just does the actual PUT straight to R2, bypassing our own API route
// entirely so large photos never hit Vercel's function body limit. Unlike
// Supabase's uploadToSignedUrl, R2's presigned URL needs no SDK client-side —
// it's a plain authenticated PUT.
//
// Every browser→R2 upload on the site funnels through here (receipts, member
// & non-member gallery submissions, admin gallery, photo-share folders), so
// this is the one place worth hardening against the failure class that
// silently lost receipts for weeks: a bucket with no CORS policy rejected
// every PUT, and nothing reported it. Failures here now go to Sentry so a
// systemic breakage (CORS, R2 outage, signature mismatch) shows up as a spike
// in monitoring instead of only as an easily-missed per-file message in the UI.
import { captureMessage } from './sentry'

export async function uploadToR2({ uploadUrl, file }) {
  const started = performance.now()
  // The presigned URL bakes the Content-Type into its signature. Some files
  // (certain iOS HEIC/camera captures) arrive with an empty `type`; the
  // receipts upload-url route signs those as 'application/octet-stream', so
  // the PUT must send the SAME value or R2 rejects it with a 403 signature
  // mismatch. Mirror that fallback here. (Every other upload-url route rejects
  // or converts empty-type files before this point, so this only ever changes
  // the empty-type case — a non-empty type is sent unchanged.)
  const contentType = file.type || 'application/octet-stream'
  let res
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })
  } catch (err) {
    // A rejected fetch is a network-level failure — offline, DNS, or (the one
    // that bit us) a CORS preflight/policy rejection when the bucket had no
    // CORS rules. Report before re-throwing so a systemic break is visible in
    // monitoring, not just to the one admin who happened to be uploading.
    captureMessage('R2 upload failed (network/CORS)', { contentType, bytes: file.size, error: String(err?.message || err) }, 'warning')
    throw new Error('upload failed — please try again')
  }
  if (!res.ok) {
    captureMessage('R2 upload failed (HTTP)', { status: res.status, contentType, bytes: file.size }, 'warning')
    throw new Error(`upload failed (${res.status}) — please try again`)
  }
  return { ms: performance.now() - started, bytes: file.size }
}
