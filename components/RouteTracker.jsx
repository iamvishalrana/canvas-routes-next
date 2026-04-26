'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function RouteTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('cookieConsent') === 'accepted' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_title: document.title,
      })
    }
  }, [pathname])
  return null
}
