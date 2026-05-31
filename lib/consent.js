const EXPIRY_MS = 365 * 24 * 60 * 60 * 1000 // 12 months

export function getConsent() {
  try {
    const raw = localStorage.getItem('cookieConsent')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.value && parsed?.ts) {
        if (Date.now() - parsed.ts > EXPIRY_MS) {
          localStorage.removeItem('cookieConsent')
          return null
        }
        return parsed.value
      }
    } catch {}
    // Legacy plain string — migrate to new format in place
    localStorage.setItem('cookieConsent', JSON.stringify({ value: raw, ts: Date.now() }))
    return raw
  } catch {
    return null
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem('cookieConsent', JSON.stringify({ value, ts: Date.now() }))
  } catch {}
}

export function clearConsent() {
  try { localStorage.removeItem('cookieConsent') } catch {}
}
