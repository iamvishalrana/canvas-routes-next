'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function MembersNav({ email, isAdmin }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

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
        height: '60px', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={90} height={60}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.75, display: 'block' }} />
        </Link>

        {/* Desktop links */}
        <div className="members-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {navLink('/members/dashboard', 'Dashboard')}
          {navLink('/members/profile', 'Profile')}
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

        {/* Mobile hamburger */}
        <button
          className="members-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexDirection: 'column', gap: '5px' }}
          aria-label="Toggle menu"
        >
          <span style={{ display: 'block', width: '20px', height: '1px', background: 'rgba(245,241,236,0.6)' }} />
          <span style={{ display: 'block', width: '20px', height: '1px', background: 'rgba(245,241,236,0.6)' }} />
          <span style={{ display: 'block', width: '20px', height: '1px', background: 'rgba(245,241,236,0.6)' }} />
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          background: '#0F1E14', borderBottom: '0.5px solid rgba(197,168,130,0.15)',
          padding: '1rem 2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
          position: 'sticky', top: '60px', zIndex: 49,
        }}>
          <Link href="/members/dashboard" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: pathname === '/members/dashboard' ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/members/profile" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: pathname === '/members/profile' ? '#c5a882' : 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>Profile</Link>
          {isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', textDecoration: 'none' }}>Admin</Link>}
          {email && <span style={{ fontSize: '11px', color: 'rgba(245,241,236,0.3)' }}>{email}</span>}
          <button onClick={signOut} style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left' }}>Sign out</button>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .members-nav-links { display: none !important; }
          .members-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
