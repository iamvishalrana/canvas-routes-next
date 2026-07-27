'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { getConsent } from '../lib/consent'

// /rsvp/[token] and /gallery/[token] both embed a bearer-secret token
// directly in the path (not a query string) — sending the raw pathname to
// GA/Meta would leak it to both. Redact the token segment but keep the
// route shape for funnel analytics.
const TOKEN_ROUTE_PREFIXES = ['/rsvp/', '/gallery/']
function redactPath(pathname) {
  const prefix = TOKEN_ROUTE_PREFIXES.find(p => pathname.startsWith(p))
  if (prefix) {
    const parts = pathname.split('/')
    if (parts[2]) parts[2] = 'redacted'
    return parts.join('/')
  }
  return pathname
}

export default function RouteTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window === 'undefined') return
    const safePath = redactPath(pathname)
    // GA requires explicit consent
    if (getConsent() === 'accepted' && window.gtag) window.gtag('event', 'page_view', { page_path: safePath, page_title: document.title })
    // FB pixel handles consent internally via Consent Mode — always fire PageView.
    // Skip entirely on token-bearing routes: the pixel SDK reads the live
    // browser URL itself regardless of any argument passed here, so there's
    // no way to redact it from Meta's side — only not fire it at all.
    if (window.fbq && !TOKEN_ROUTE_PREFIXES.some(p => pathname.startsWith(p))) window.fbq('track', 'PageView')
  }, [pathname])
  return null
}
