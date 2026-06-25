'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getConsent, setConsent as saveConsent, clearConsent } from '../lib/consent'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

function loadGA() {
  if (!GA_ID || document.getElementById('ga-script')) return
  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function() { window.dataLayer.push(arguments) }
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: false })
  const script = document.createElement('script')
  script.id = 'ga-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)
}

// Always initialise the pixel — use Facebook Consent Mode so PageView fires
// for all visitors (needed for Meta ad attribution), but Meta uses limited/modelled
// data until consent is granted.
function initFbPixel(consentGranted) {
  if (document.getElementById('fb-pixel-script')) {
    if (consentGranted && window.fbq) window.fbq('consent', 'grant')
    return
  }
  const fbq = function() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments) }
  window.fbq = window._fbq = fbq
  fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = []
  const script = document.createElement('script')
  script.id = 'fb-pixel-script'
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  if (!consentGranted) fbq('consent', 'revoke')
  fbq('init', '1499785301931870')
  fbq('track', 'PageView')
}

function grantConsent() {
  if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted' })
}

function denyConsent() {
  if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied' })
}

export default function CookieBanner() {
  const pathname = usePathname()
  const [consent, setConsentState] = useState('loading')
  if (pathname?.startsWith('/verify')) return null
  const bannerRef = useRef(null)

  useEffect(() => {
    setConsentState(getConsent())
  }, [])

  // Init pixel on mount for all visitors (consent mode handles data limiting)
  useEffect(() => {
    initFbPixel(getConsent() === 'accepted')
  }, [])

  useEffect(() => {
    if (consent === 'accepted') {
      grantConsent()
      loadGA()
    }
  }, [consent])

  useEffect(() => {
    function handleReset() {
      clearConsent()
      denyConsent()
      setConsentState(null)
    }
    window.addEventListener('cookieConsentReset', handleReset)
    return () => window.removeEventListener('cookieConsentReset', handleReset)
  }, [])

  // Push body down by the banner height so the footer is never covered
  const isHidden = consent === 'loading' || consent !== null
    || pathname.startsWith('/members') || pathname.startsWith('/admin')
  useEffect(() => {
    if (isHidden) { document.body.style.paddingBottom = ''; return }
    function sync() {
      if (bannerRef.current) document.body.style.paddingBottom = `${bannerRef.current.offsetHeight}px`
    }
    sync()
    window.addEventListener('resize', sync)
    return () => { window.removeEventListener('resize', sync); document.body.style.paddingBottom = '' }
  }, [isHidden])

  function handleAccept() {
    saveConsent('accepted')
    setConsentState('accepted')
    grantConsent()
    loadGA()
    if (window.fbq) window.fbq('consent', 'grant')
    else initFbPixel(true)
    window.dispatchEvent(new Event('cookieConsentChanged'))
  }

  function handleDecline() {
    saveConsent('declined')
    setConsentState('declined')
    denyConsent()
    window.dispatchEvent(new Event('cookieConsentChanged'))
  }

  if (consent === 'loading' || consent !== null) return null
  if (pathname.startsWith('/members') || pathname.startsWith('/admin')) return null

  return (
    <div ref={bannerRef} className="cookie-banner">
      <p style={{margin:0,fontSize:"12px",color:"#555",lineHeight:"1.7",maxWidth:"680px"}}>
        We use cookies to understand how our site is used and to show more relevant ads. See our{' '}
        <Link href="/privacy" style={{color:"#555",textDecoration:"underline"}}>Privacy Policy</Link>.
      </p>
      <div style={{display:"flex",gap:"0.75rem",flexShrink:0}}>
        <button onClick={handleDecline} style={{padding:"0.55rem 1.4rem",background:"transparent",border:"1px solid rgba(0,0,0,0.2)",fontSize:"11px",letterSpacing:"0.12em",textTransform:"uppercase",color:"#888",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
          Decline
        </button>
        <button onClick={handleAccept} style={{padding:"0.55rem 1.4rem",background:"#1a1a1a",border:"1px solid #1a1a1a",fontSize:"11px",letterSpacing:"0.12em",textTransform:"uppercase",color:"#F5F1EC",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
          Accept
        </button>
      </div>
    </div>
  )
}
