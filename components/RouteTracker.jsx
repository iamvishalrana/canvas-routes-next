'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { getConsent } from '../lib/consent'

export default function RouteTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window === 'undefined') return
    // GA requires explicit consent
    if (getConsent() === 'accepted' && window.gtag) window.gtag('event', 'page_view', { page_path: pathname, page_title: document.title })
    // FB pixel handles consent internally via Consent Mode — always fire PageView
    if (window.fbq) window.fbq('track', 'PageView')
  }, [pathname])
  return null
}
