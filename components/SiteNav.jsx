'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '../lib/supabase/client'

/**
 * Shared public-site nav. Detects member session and shows Dashboard / Profile /
 * Sign out when logged in, otherwise Membership / Members Login.
 *
 * Props:
 *   links   – array of { href, label, onClick? } for the desktop + mobile nav
 *   ctaLabel – label for the Membership button (defaults to 'Membership')
 */
export default function SiteNav({ links = [], ctaLabel = 'Membership' }) {
  const [menuOpen, setMenuOpen] = useState(false)
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

  const linkStyle  = { color: '#555', textDecoration: 'none' }
  const btnBase    = { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', padding: 0 }

  return (
    <>
      <nav className="nav">
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </Link>

        <div className="nav-links">
          {links.map((l, i) =>
            l.onClick
              ? <a key={i} href={l.href} onClick={l.onClick} style={linkStyle}>{l.label}</a>
              : <Link key={i} href={l.href} style={linkStyle}>{l.label}</Link>
          )}
        </div>

        {/* Desktop CTA — hidden on mobile by globals.css */}
        <div className="nav-cta">
          {checked && member ? (
            <>
              <span style={{ fontSize: '11px', color: '#888', letterSpacing: '0.06em', textAlign: 'center', fontFamily: 'var(--font-inter),sans-serif' }}>
                {member.firstName || 'Member'}
              </span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <Link href="/members/dashboard" className="nav-join" style={{ flex: 1, textAlign: 'center', fontSize: '10px' }}>
                  Dashboard
                </Link>
                <Link href="/members/profile" className="nav-join" style={{ flex: 1, textAlign: 'center', fontSize: '10px' }}>
                  Profile
                </Link>
                <button onClick={signOut} className="nav-members" style={{ cursor: 'pointer', flex: 1, fontSize: '10px' }}>
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/membership" className="nav-join">{ctaLabel}</Link>
              <Link href="/members/login" className="nav-members">Members Login</Link>
            </>
          )}
        </div>

        <button className="hamburger btn-push" onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {links.map((l, i) =>
          l.onClick
            ? <a key={i} href={l.href} onClick={e => { l.onClick(e); setMenuOpen(false) }} style={linkStyle}>{l.label}</a>
            : <Link key={i} href={l.href} onClick={() => setMenuOpen(false)} style={linkStyle}>{l.label}</Link>
        )}
        {member ? (
          <>
            <Link href="/members/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#0F1E14', fontWeight: '500' }}>Dashboard</Link>
            <Link href="/members/profile"   onClick={() => setMenuOpen(false)} style={{ color: '#555' }}>Profile</Link>
            <button onClick={() => { setMenuOpen(false); signOut() }} style={{ ...btnBase, fontSize: '13px', color: '#7B2032', fontWeight: '500', textAlign: 'left' }}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/membership" onClick={() => setMenuOpen(false)} style={{ color: '#0F1E14', fontWeight: '500' }}>{ctaLabel}</Link>
            <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#7B2032', fontWeight: '500' }}>Members Login</Link>
          </>
        )}
      </div>
    </>
  )
}
