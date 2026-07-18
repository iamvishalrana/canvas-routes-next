'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function MembersNav({ email, isAdmin }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onResize() { if (window.innerWidth > 640) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/members/login'
  }

  function navLink(href, label) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href} style={{
        fontSize: '11px', letterSpacing: '0.13em', textTransform: 'uppercase',
        color: active ? '#c5a882' : 'rgba(245,241,236,0.5)',
        textDecoration: 'none',
        borderBottom: `0.5px solid ${active ? 'rgba(197,168,130,0.55)' : 'transparent'}`,
        paddingBottom: '1px',
        transition: 'color 0.15s',
      }}>
        {label}
      </Link>
    )
  }

  return (
    <>
      <nav style={{
        background: '#0F1E14',
        borderBottom: '0.5px solid rgba(197,168,130,0.15)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '72px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '142px', height: '64px', overflow: 'hidden', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536}
              style={{ width: '142px', height: 'auto', marginTop: '-69px', display: 'block', opacity: 0.9 }} />
          </div>
        </Link>

        {/* Desktop links */}
        <div className="members-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {navLink('/members/dashboard', 'Dashboard')}
          {navLink('/members/events', 'Meets & Events')}
          {navLink('/members/routes', 'Routes')}
          {navLink('/members/perks', 'Perks')}
          {navLink('/members/profile', 'Profile')}
          {navLink('/members/card', 'My Card')}
          {isAdmin && (
            <Link href="/admin" style={{
              fontSize: '11px', letterSpacing: '0.13em', textTransform: 'uppercase',
              color: pathname.startsWith('/admin') ? '#c5a882' : 'rgba(197,168,130,0.55)',
              textDecoration: 'none',
              borderBottom: `0.5px solid ${pathname.startsWith('/admin') ? 'rgba(197,168,130,0.55)' : 'transparent'}`,
              paddingBottom: '1px',
            }}>
              Admin
            </Link>
          )}
          <div style={{ width: '0.5px', height: '16px', background: 'rgba(197,168,130,0.2)' }} />
          {email && (
            <span style={{ fontSize: '11px', color: 'rgba(245,241,236,0.28)', letterSpacing: '0.03em', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </span>
          )}
          <button onClick={signOut} style={{
            background: 'none', border: '0.5px solid rgba(197,168,130,0.25)',
            padding: '0.35rem 0.9rem', fontSize: '10px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)',
            cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif',
            transition: 'border-color 0.15s, color 0.15s',
          }}>
            Sign out
          </button>
        </div>

        {/* Mobile hamburger — animates to × when open */}
        <button
          className="members-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexDirection: 'column', gap: '5px', position: 'relative', width: '28px', height: '28px', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Toggle menu"
        >
          <span style={{ display: 'block', width: '20px', height: '1px', background: 'rgba(245,241,236,0.7)', position: 'absolute', transformOrigin: 'center', transition: 'transform 0.28s cubic-bezier(0.23,1,0.32,1), opacity 0.2s', transform: menuOpen ? 'rotate(45deg) translateY(0)' : 'translateY(-4px)' }} />
          <span style={{ display: 'block', width: '20px', height: '1px', background: 'rgba(245,241,236,0.7)', position: 'absolute', transformOrigin: 'center', transition: 'opacity 0.15s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: '20px', height: '1px', background: 'rgba(245,241,236,0.7)', position: 'absolute', transformOrigin: 'center', transition: 'transform 0.28s cubic-bezier(0.23,1,0.32,1), opacity 0.2s', transform: menuOpen ? 'rotate(-45deg) translateY(0)' : 'translateY(4px)' }} />
        </button>
      </nav>

      {/* Mobile overlay */}
      <div
        onClick={() => setMenuOpen(false)}
        style={{
          position: 'fixed', inset: 0, top: '72px', zIndex: 48,
          background: 'rgba(0,0,0,0.3)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Mobile dropdown — slides in */}
      <div aria-hidden={!menuOpen} style={{
        background: '#0F1E14', borderBottom: '0.5px solid rgba(197,168,130,0.15)',
        padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
        position: 'fixed', top: '72px', left: 0, right: 0, zIndex: 49,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
        opacity: menuOpen ? 1 : 0,
        pointerEvents: menuOpen ? 'auto' : 'none',
        transition: 'transform 0.32s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.25s ease',
      }}>
        <Link href="/members/dashboard" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.5rem 0', color: pathname === '/members/dashboard' ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>Dashboard</Link>
        <Link href="/members/events" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.5rem 0', color: pathname.startsWith('/members/events') ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>Meets &amp; Events</Link>
        <Link href="/members/routes" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.5rem 0', color: pathname === '/members/routes' ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>Routes</Link>
        <Link href="/members/perks" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.5rem 0', color: pathname === '/members/perks' ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>Perks</Link>
        <Link href="/members/profile" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.5rem 0', color: pathname === '/members/profile' ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>Profile</Link>
        <Link href="/members/card" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.5rem 0', color: pathname === '/members/card' ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>My Card</Link>
        {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.5rem 0', color: 'rgba(197,168,130,0.7)', textDecoration: 'none' }}>Admin</Link>}
        <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.12)' }} />
        {email && <span style={{ fontSize: '11px', color: 'rgba(245,241,236,0.3)', letterSpacing: '0.02em' }}>{email}</span>}
        <button onClick={signOut} style={{ background: 'none', border: 'none', padding: '0.5rem 0', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left' }}>Sign out</button>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .members-nav-links { display: none !important; }
          .members-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
