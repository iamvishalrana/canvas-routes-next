import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectsCommand, CopyObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 replacement for Supabase Storage — same singleton-on-globalThis
// pattern as lib/stripe.js so the client survives Next.js hot reload in dev.
// null when unconfigured; every caller must guard against that, same
// "degrade gracefully when key absent" convention used for Stripe/Resend/etc.
if (!globalThis._r2 && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
  globalThis._r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
}
export const r2 = globalThis._r2 ?? null

// One bucket for all media, with the old Supabase bucket names kept as path
// prefixes — every call site below still passes the same logical "bucket"
// name it always did (e.g. 'photo-shares'), so callers don't need to know
// about the consolidation. R2/S3 has no per-bucket cost or quota difference
// (unlike Supabase, which billed/limited storage per project, not per
// bucket), and every existing bucket is already `public: true` with
// unguessable random-UUID paths, so there's no access-control reason to
// keep them physically separate.
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'canvas-routes-media'

// Public base URL for reading objects back — a custom domain attached to the
// bucket in the R2 dashboard (e.g. https://media.canvasroutes.com), NOT the
// R2 API endpoint above (that one requires auth and isn't meant for public reads).
const PUBLIC_BASE = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

function fullKey(bucket, path) {
  // bucket = old Supabase bucket name, used here purely as a path prefix
  return `${bucket}/${path}`.replace(/\/{2,}/g, '/')
}

// Presigned PUT URL for a direct browser-to-R2 upload — same role as
// Supabase's createSignedUploadUrl, so large photos never hit Vercel's
// function body limit. 5-minute expiry: long enough for a slow mobile
// upload to start, short enough that a leaked URL can't be replayed later.
// contentType is baked into the signature, so the upload fails unless the
// browser's PUT sends the exact same Content-Type it was issued for —
// closes off using a signed URL for one file type to smuggle up another.
export async function createSignedUploadUrl({ bucket, path, contentType }) {
  if (!r2) throw new Error('R2 not configured')
  const key = fullKey(bucket, path)
  const command = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType })
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 })
  return { uploadUrl, key }
}

// Public read URL — R2_PUBLIC_URL must be a custom domain attached to the
// bucket (R2 dashboard → bucket → Settings → Custom Domains). Falls back to
// null (not a broken URL) if unconfigured, so callers can surface a clear
// "not configured" state instead of serving a 404 image.
export function getPublicUrl({ bucket, path }) {
  if (!PUBLIC_BASE) return null
  return `${PUBLIC_BASE}/${fullKey(bucket, path)}`
}

// Batch delete — S3's DeleteObjects caps at 1000 keys per call, chunk
// defensively even though no caller here approaches that today.
export async function removeObjects({ bucket, paths }) {
  if (!r2) throw new Error('R2 not configured')
  const keys = paths.filter(Boolean).map(p => fullKey(bucket, p))
  if (keys.length === 0) return
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000)
    await r2.send(new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: chunk.map(Key => ({ Key })) },
    }))
  }
}

// Confirms a presigned-URL upload actually completed before the caller
// records it in the DB — same "don't trust the client's word for it" check
// Supabase's .exists() provided.
export async function objectExists({ bucket, path }) {
  if (!r2) throw new Error('R2 not configured')
  const key = fullKey(bucket, path)
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return true
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false
    throw err
  }
}

// Reads an object's bytes back server-side — used when a photo needs to move
// FROM R2 TO a still-Supabase-hosted bucket during the phased migration (a
// native storage-to-storage copy only works within the same provider). Once
// every bucket is on R2, cross-bucket moves should use copyObject() below
// instead — this download+reupload path costs real bandwidth and time that
// a native copy doesn't.
export async function getObjectBuffer({ bucket, path }) {
  if (!r2) throw new Error('R2 not configured')
  const key = fullKey(bucket, path)
  const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  const bytes = await res.Body.transformToByteArray()
  return { buffer: Buffer.from(bytes), contentType: res.ContentType || 'application/octet-stream' }
}

// Server-side copy within the bucket — used by the photo-share "claim"
// flow (a recipient saves a shared photo into their own member gallery)
// and anywhere else that needs to duplicate an object without round-
// tripping the bytes through a Vercel function.
export async function copyObject({ bucket, fromPath, toBucket, toPath }) {
  if (!r2) throw new Error('R2 not configured')
  const source = fullKey(bucket, fromPath)
  const dest = fullKey(toBucket || bucket, toPath)
  await r2.send(new CopyObjectCommand({
    Bucket: R2_BUCKET,
    CopySource: `${R2_BUCKET}/${encodeURIComponent(source)}`,
    Key: dest,
  }))
}
