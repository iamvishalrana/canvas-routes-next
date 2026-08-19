// SHA-256 of a File's actual bytes, computed in-browser via Web Crypto —
// used to detect "this is the same photo already uploaded elsewhere" for
// the photo-share dedup feature. Deliberately never filename-based: camera-
// default names like IMG_1234.jpg collide constantly across different
// people's completely unrelated photos, which would risk merging two
// different private photos together. A content hash can't produce a false
// match — only byte-identical files ever hash the same.
export async function sha256Hex(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}
