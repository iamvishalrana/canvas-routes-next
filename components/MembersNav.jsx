'use client'
import Link from 'next/link'
import Image from 'next/image'

export default function MembersNav({ email, isAdmin }) {
  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.href = '/members/login'
  }

  return (
    <nav style={{ background: '#0F1E14', borderBottom: '0.5px solid rgba(197,168,130,0.2)', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
      <Link href="/">
        <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={100} height={67} style={{ filter: 'brightness(0) invert(1)', opacity: 0.8, display: 'block' }} />
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link href="/members/dashboard" style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <Link href="/members/profile" style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.6)', textDecoration: 'none' }}>
          Profile
        </Link>
        {isAdmin && (
          <Link href="/admin" style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c5a882', textDecoration: 'none' }}>
            Admin
          </Link>
        )}
        <button onClick={signOut}
          style={{ background: 'none', border: '0.5px solid rgba(197,168,130,0.35)', padding: '0.4rem 1rem', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.5)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
