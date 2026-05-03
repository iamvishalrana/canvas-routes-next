'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

function loadGA() {
  if (!GA_ID || document.getElementById('ga-script')) return
  const script = document.createElement('script')
  script.id = 'ga-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  script.onload = () => {
    window.gtag('js', new Date())
    window.gtag('config', GA_ID, { send_page_view: false })
  }
  document.head.appendChild(script)
}

function grantConsent() {
  window.gtag('consent', 'update', { analytics_storage: 'granted' })
}

function denyConsent() {
  window.gtag('consent', 'update', { analytics_storage: 'denied' })
}

export default function CookieBanner() {
  const [consent, setConsent] = useState('loading')

  useEffect(() => {
    try { setConsent(localStorage.getItem('cookieConsent')) } catch { setConsent('declined') }
  }, [])

  useEffect(() => {
    if (consent === 'accepted') {
      grantConsent()
      loadGA()
    }
  }, [consent])

  useEffect(() => {
    function handleReset() {
      try { localStorage.removeItem('cookieConsent') } catch {}
      denyConsent()
      setConsent(null)
    }
    window.addEventListener('cookieConsentReset', handleReset)
    return () => window.removeEventListener('cookieConsentReset', handleReset)
  }, [])

  function handleAccept() {
    try { localStorage.setItem('cookieConsent', 'accepted') } catch {}
    setConsent('accepted')
    grantConsent()
    loadGA()
    window.dispatchEvent(new Event('cookieConsentChanged'))
  }

  function handleDecline() {
    try { localStorage.setItem('cookieConsent', 'declined') } catch {}
    setConsent('declined')
    denyConsent()
    window.dispatchEvent(new Event('cookieConsentChanged'))
  }

  if (consent === 'loading' || consent !== null) return null

  return (
    <div className="cookie-banner">
      <p style={{margin:0,fontSize:"12px",color:"#555",lineHeight:"1.7",maxWidth:"680px"}}>
        We use cookies to understand how our site is used and improve your experience. See our{' '}
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
