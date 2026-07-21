'use client'
import Link from 'next/link'
import LanguageFooterDropdown from './LanguageFooterDropdown'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { footerT } from '../lib/i18n/footer'

export default function SiteFooter({ hideLangToggle = false }) {
  const { lang } = useLanguage()
  const t = footerT[lang]

  return (
    <footer style={{
      background: '#0F1E14',
      fontFamily: 'var(--font-inter),sans-serif',
    }}>
      {/* ── Columns ── */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(3rem,6vw,5rem) clamp(1.5rem,4vw,3rem) clamp(2rem,4vw,3rem)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 'clamp(2rem,4vw,3rem)',
      }}>

        {/* Brand column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <img
            src="/white-outline.png"
            alt="Canvas Routes"
            style={{ width: '140px', height: 'auto', opacity: 0.9 }}
          />
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)' }}>
            {t.tagline}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
            <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: 'rgba(245,241,236,0.4)', transition: 'color 0.2s', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c5a882'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,236,0.4)'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
              </svg>
            </a>
            <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ color: 'rgba(245,241,236,0.4)', transition: 'color 0.2s', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c5a882'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,236,0.4)'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Link columns */}
        {t.cols.map(col => (
          <div key={col.heading} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.25rem', fontWeight: '500' }}>
              {col.heading}
            </div>
            {col.links.map(link => (
              <Link key={link.label} href={link.href} style={{ fontSize: '12px', color: 'rgba(245,241,236,0.5)', textDecoration: 'none', letterSpacing: '0.02em', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,241,236,0.9)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,236,0.5)'}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}

        {/* Contact column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.25rem', fontWeight: '500' }}>
            {t.contact}
          </div>
          <a href="mailto:info@canvasroutes.com" style={{ fontSize: '12px', color: 'rgba(245,241,236,0.5)', textDecoration: 'none', letterSpacing: '0.02em', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,241,236,0.9)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,236,0.5)'}>
            info@canvasroutes.com
          </a>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{
        borderTop: '0.5px solid rgba(197,168,130,0.1)',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1.5rem clamp(1.5rem,4vw,3rem)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ fontSize: '10px', color: 'rgba(245,241,236,0.25)', letterSpacing: '0.06em' }}>
          {t.copyright}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {[
            { label: t.privacy, href: '/privacy' },
            { label: t.terms,   href: '/terms' },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ fontSize: '10px', color: 'rgba(245,241,236,0.25)', textDecoration: 'none', letterSpacing: '0.06em', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,241,236,0.55)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,236,0.25)'}>
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => window.dispatchEvent(new Event('cookieConsentReset'))}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: '10px', color: 'rgba(245,241,236,0.25)', cursor: 'pointer', letterSpacing: '0.06em', fontFamily: 'var(--font-inter),sans-serif', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,241,236,0.55)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,236,0.25)'}>
            {t.manageCookies}
          </button>
          {!hideLangToggle && <LanguageFooterDropdown />}
        </div>
      </div>
    </footer>
  )
}
