'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'
import LanguageToggle from './LanguageToggle'

// Single source of truth for the standard nav — every page that doesn't need
// custom in-page-scroll links (see app/page.jsx) should rely on this default
// rather than hardcoding its own copy, so header changes only happen once.
export const DEFAULT_NAV_LINKS = [
  { href: '/',         label: 'Home'    },
  { href: '/routes',   label: 'Routes'  },
  { href: '/#events',  label: 'Events'  },
  { href: '/#contact', label: 'Contact' },
  { href: '/faq',      label: 'FAQ'     },
]

/**
 * Shared public-site nav. Detects member session and shows Dashboard / Profile /
 * Sign out when logged in, otherwise Membership / Members Login.
 *
 * Props:
 *   links   – array of { href, label, onClick? } for the desktop + mobile nav.
 *             Defaults to DEFAULT_NAV_LINKS — only override this when a page
 *             needs custom behavior (e.g. in-page scroll links on the homepage).
 *   ctaLabel – label for the Membership button (defaults to 'Membership')
 *   banner   – optional announcement string/node shown as a fixed strip above
 *              the nav. Its height is measured so the nav (and mobile menu)
 *              shift down by exactly that amount — nothing hardcoded.
 *   bannerHref – optional link target if the banner should be clickable
 */
export default function SiteNav({ links = DEFAULT_NAV_LINKS, ctaLabel = 'Become a Member', onMenuChange, banner, bannerHref, showLangToggle = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const bannerRef = useRef(null)
  const [bannerHeight, setBannerHeight] = useState(0)

  useEffect(() => {
    if (!banner) { setBannerHeight(0); return }
    const el = bannerRef.current
    if (!el) return
    const update = () => setBannerHeight(el.offsetHeight)
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [banner])

  function toggleMenu(open) {
    setMenuOpen(open)
    onMenuChange?.(open)
  }
  const [member, setMember]     = useState(null)  // null = not logged in / still checking
  const [checked, setChecked]   = useState(false)

  useEffect(() => {
    fetch('/api/member/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.member) {
          setMember({ firstName: data.member.name?.trim().split(' ')[0] || '' })
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const linkStyle = { color: '#555', textDecoration: 'none' }

  const BannerTag = bannerHref ? 'a' : 'div'

  return (
    <>
      {banner && (
        <BannerTag
          ref={bannerRef}
          {...(bannerHref ? { href: bannerHref } : {})}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 101,
            display: 'block', background: '#0F1E14', color: '#c5a882',
            textAlign: 'center', padding: '0.6rem 1.25rem',
            fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'Inter',sans-serif", textDecoration: 'none', cursor: bannerHref ? 'pointer' : 'default',
          }}
        >
          {banner}
        </BannerTag>
      )}
      <nav className="nav" style={{ top: bannerHeight }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="Canvas Routes" className="nav-logo" />
        </Link>

        <div className="nav-links">
          {links.map((l, i) =>
            l.onClick
              ? <a key={i} href={l.href} onClick={l.onClick} style={linkStyle}>{l.label}</a>
              : <Link key={i} href={l.href} style={linkStyle}>{l.label}</Link>
          )}
        </div>

        {/* Language toggle — not hidden by the mobile nav-cta breakpoint, stays
            visible next to the hamburger so it doesn't require opening the menu */}
        {showLangToggle && <LanguageToggle style={{ marginRight: '0.85rem', flexShrink: 0 }} />}

        {/* Desktop CTA — hidden on mobile by globals.css */}
        <div className="nav-cta">
          {checked && member ? (
            <>
              {/* Name label — same visual style as other small eyebrow labels on the site */}
              <span style={{
                fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#999', textAlign: 'center', fontFamily: 'var(--font-inter),sans-serif',
              }}>
                {member.firstName || 'Member'}
              </span>
              {/* Two buttons — exact same layout as Membership + Members Login */}
              <Link href="/members/dashboard" className="nav-join">Dashboard</Link>
              <button onClick={signOut} className="nav-members" style={{ cursor: 'pointer' }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/membership" className="nav-join">{ctaLabel}</Link>
              <Link href="/members/login" className="nav-members">Members Login</Link>
            </>
          )}
        </div>

        <button className="hamburger btn-push" onClick={() => toggleMenu(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} style={{ marginTop: bannerHeight }}>
        {links.map((l, i) =>
          l.onClick
            ? <a key={i} href={l.href} onClick={e => { l.onClick(e); toggleMenu(false) }} style={linkStyle}>{l.label}</a>
            : <Link key={i} href={l.href} onClick={() => toggleMenu(false)} style={linkStyle}>{l.label}</Link>
        )}
        {member ? (
          <>
            <Link href="/members/dashboard" onClick={() => toggleMenu(false)} style={{ color: '#0F1E14', fontWeight: '500' }}>Dashboard</Link>
            <Link href="/members/profile"   onClick={() => toggleMenu(false)} style={{ color: '#555' }}>Profile</Link>
            <Link href="/members/events"    onClick={() => toggleMenu(false)} style={{ color: '#555' }}>Events</Link>
            <button
              onClick={() => { toggleMenu(false); signOut() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', padding: 0, fontSize: '13px', color: '#93333E', fontWeight: '500', textAlign: 'left' }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/membership" onClick={() => toggleMenu(false)} style={{ color: '#0F1E14', fontWeight: '500' }}>{ctaLabel}</Link>
            <Link href="/members/login" onClick={() => toggleMenu(false)} style={{ color: '#93333E', fontWeight: '500' }}>Members Login</Link>
          </>
        )}
      </div>
    </>
  )
}
