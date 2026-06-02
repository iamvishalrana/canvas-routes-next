'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function RoutesIndexPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/public/events')
      .then(r => r.json())
      .then(data => {
        const roadTrips = (Array.isArray(data) ? data : []).filter(e => e.type === 'Road Trip')
        setEvents(roadTrips)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const str = dateStr.trim()
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (iso) {
      const d = new Date(+iso[1], +iso[2] - 1, +iso[3])
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    return str
  }

  return (
    <div style={{ background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', minHeight: '100vh' }}>

      {/* NAV */}
      <nav className="nav">
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </Link>
        <div className="nav-links">
          <Link href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
          <Link href="/#events" style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
          <Link href="/#contact" style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
          <Link href="/faq" style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
        <Link href="/#events" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
        <Link href="/#contact" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
        <Link href="/faq" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#3B6B2F', fontWeight: '500' }}>Members Login</Link>
      </div>

      {/* HERO */}
      <section style={{ background: '#0F1E14', padding: 'clamp(130px,16vw,200px) 2rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />
        <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1.2rem' }}>Canvas Routes</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,6vw,4.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: '1.05', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
          Routes
        </h1>
        <div style={{ width: '40px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.75rem' }} />
        <p style={{ fontSize: '15px', color: 'rgba(245,241,236,0.5)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.9' }}>
          Every route we&apos;ve driven, and every one still ahead.
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)' }} />
      </section>

      {/* CONTENT */}
      <section style={{ padding: 'clamp(3rem,8vw,5rem) clamp(1.25rem,5vw,3rem)', maxWidth: '860px', margin: '0 auto' }}>

        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#bbb', letterSpacing: '0.06em' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>No routes yet.</div>
            <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1rem auto' }} />
            <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.8' }}>Check back soon — the first one is just getting planned.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(0,0,0,0.08)' }}>
            {events.map(e => (
              <div key={e.id} style={{ background: '#F5F1EC', padding: '1.5rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontFamily: 'var(--font-cormorant),serif', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.3rem' }}>{e.name}</div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#c5a882' }}>{formatDate(e.date)}</span>
                    {e.location && <span style={{ fontSize: '11px', color: '#aaa' }}>{e.location}</span>}
                  </div>
                  {e.description && <div style={{ fontSize: '13px', color: '#777', marginTop: '0.5rem', lineHeight: '1.65', maxWidth: '520px' }}>{e.description}</div>}
                </div>
                {e.registration_url && (
                  <Link href={e.registration_url}
                    style={{ flexShrink: 0, padding: '0.65rem 1.4rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    View details →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '0.5px solid rgba(0,0,0,0.12)', padding: '2rem clamp(1.25rem,5vw,3rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#F5F1EC' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.05em' }}>© 2026 Canvas Routes. Montreal, QC.</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/privacy" style={{ fontSize: '10px', color: '#aaa', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ fontSize: '10px', color: '#aaa', textDecoration: 'none' }}>Terms</Link>
            <Link href="/faq" style={{ fontSize: '10px', color: '#aaa', textDecoration: 'none' }}>FAQ</Link>
          </div>
        </div>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', textDecoration: 'none' }}>← Back to home</Link>
      </footer>

    </div>
  )
}
