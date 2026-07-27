// Converts bytes transferred over an elapsed wall-clock duration into a
// human-readable Mbps figure for upload-progress UI. Uses wall-clock time
// around the whole signed-upload call rather than live XHR progress events —
// Supabase's storage-js client uploads via fetch(), which doesn't expose
// upload progress the way XMLHttpRequest does — so this is an average
// speed per file/batch, not a live in-flight rate.
export function formatMbps(bytes, ms) {
  if (!ms || ms <= 0 || !bytes) return null
  const mbps = (bytes * 8) / (ms / 1000) / 1_000_000
  return mbps
}
