'use client'
import Link from 'next/link'

export default function SiteFooter({ background = '#F5F1EC', borderColor = 'rgba(0,0,0,0.12)', textColor = '#888', linkColor = '#aaa', iconColor = '#555' }) {
  return (
    <footer style={{ borderTop: `0.5px solid ${borderColor}`, padding: '2rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background, fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontSize: '11px', color: textColor, letterSpacing: '0.05em' }}>© 2026 Canvas Routes. Montreal, QC.</div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ fontSize: '10px', color: linkColor, textDecoration: 'none', letterSpacing: '0.03em' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: '10px', color: linkColor, textDecoration: 'none', letterSpacing: '0.03em' }}>Terms</Link>
          <Link href="/faq" style={{ fontSize: '10px', color: linkColor, textDecoration: 'none', letterSpacing: '0.03em' }}>FAQ</Link>
          <button onClick={() => window.dispatchEvent(new Event('cookieConsentReset'))} style={{ background: 'none', border: 'none', padding: 0, fontSize: '10px', color: linkColor, cursor: 'pointer', letterSpacing: '0.03em', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left' }}>Manage cookies</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
        <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Canvas Routes on Instagram" style={{ color: iconColor, display: 'flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
          </svg>
        </a>
        <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Canvas Routes on Facebook" style={{ color: iconColor, display: 'flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
          </svg>
        </a>
      </div>
    </footer>
  )
}
