'use client'
import Link from 'next/link'

export default function CardError({ reset }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '4rem 1rem', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'center',
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
        Canvas Routes
      </div>
      <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.6rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>
        Couldn't load your card
      </div>
      <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.7', maxWidth: '280px', marginBottom: '1.5rem' }}>
        Something went wrong fetching your membership. Try again or return to the dashboard.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '0.65rem 1.5rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
        >
          Try again
        </button>
        <Link href="/members/dashboard" style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '0.65rem 1.5rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.18)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-inter),sans-serif' }}>
          Dashboard
        </Link>
      </div>
    </div>
  )
}
