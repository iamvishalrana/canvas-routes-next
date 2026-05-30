'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function RouteTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('cookieConsent') === 'accepted' && window.gtag) {
        window.gtag('event', 'page_view', { page_path: pathname, page_title: document.title })
      }
      if (window.fbq) window.fbq('track', 'PageView')
    }
  }, [pathname])
  return null
}
