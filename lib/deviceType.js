// Server-side device classification from the User-Agent header — stored on
// applications so the admin dashboard can chart the iOS/Android/desktop split.
// Note: iPadOS 13+ masquerades as macOS in its UA; those land under macOS.
export function deviceType(request) {
  const ua = request.headers.get('user-agent') || ''
  if (!ua) return null
  if (/iPhone|iPod/i.test(ua)) return 'iOS'
  if (/iPad/i.test(ua)) return 'iPadOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Other'
}
