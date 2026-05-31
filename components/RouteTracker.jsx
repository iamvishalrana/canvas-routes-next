'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { getConsent } from '../lib/consent'

export default function RouteTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window !== 'undefined' && getConsent() === 'accepted') {
      if (window.gtag) window.gtag('event', 'page_view', { page_path: pathname, page_title: document.title })
      if (window.fbq) window.fbq('track', 'PageView')
    }
  }, [pathname])
  return null
}
