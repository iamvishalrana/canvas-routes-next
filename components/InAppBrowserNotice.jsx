'use client'
import { useState, useEffect } from 'react'

const DISMISS_KEY = 'cr_iab_notice_dismissed'

// Instagram/Facebook's in-app browser (opened when someone taps a Meta ad)
// is a stripped-down WebView, not full Safari/Chrome — Apple Pay/Google Pay
// don't render there, and some issuing banks' 3DS challenges are less
// reliable through it. This nudges visitors arriving via one into their real
// browser, where the whole payment flow (wallets included) works properly.
function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|FB_IAB/.test(ua)) return 'facebook'
  if (/Instagram/.test(ua)) return 'instagram'
  return null
}

export default function InAppBrowserNotice() {
  const [source, setSource] = useState(null)
  const [dismissed, setDismissed] = useState(true) // default hidden until checked, avoids a flash for the common case

  useEffect(() => {
    const detected = detectInAppBrowser()
    if (!detected) return
    setSource(detected)
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  // Shift the page's own bottom-fixed scroll-cue button up while this is
  // showing, so the two don't stack on top of each other on mobile.
  useEffect(() => {
    const visible = !!source && !dismissed
    document.body.classList.toggle('iab-notice-visible', visible)
    return () => document.body.classList.remove('iab-notice-visible')
  }, [source, dismissed])

  if (!source || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  return (
    // Fixed to the bottom, not the top — SiteNav is itself position:fixed at
    // top:0 with zIndex 101, so an in-flow banner placed right after it would
    // render underneath the nav bar and be unclickable there. Bottom-fixed
    // avoids that entirely, same convention as CookieBanner.
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 110, background: '#0F1E14', color: '#F5F1EC', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', fontFamily: 'var(--font-inter), sans-serif', boxShadow: '0 -4px 18px rgba(0,0,0,0.22)' }}>
      <span style={{ fontSize: '12px', lineHeight: 1.6, textAlign: 'center' }}>
        For Apple Pay / Google Pay and the smoothest checkout, tap <strong>⋯</strong> above and choose <strong>&ldquo;Open in Browser&rdquo;</strong>.
      </span>
      <button type="button" onClick={dismiss} aria-label="Dismiss"
        style={{ background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', color: '#c5a882', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
        Got it
      </button>
    </div>
  )
}
