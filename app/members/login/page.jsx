'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Incorrect email or password.')
      setLoading(false)
    } else {
      router.push('/members/dashboard')
      router.refresh()
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError('Could not send reset email. Please check the address and try again.')
    } else {
      setResetSent(true)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />

      <Link href="/" style={{ marginBottom: '3rem', display: 'block' }}>
        <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={160} height={107} style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
      </Link>

      <div style={{ width: '100%', maxWidth: '400px', background: '#F5F1EC', padding: '2.5rem 2.5rem 2rem' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,#c5a882,transparent)' }} />
        </div>

        {mode === 'login' && (
          <>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Members Portal</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '2rem' }}>Welcome back.</div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                  style={{ width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  style={{ width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {error && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1rem' }}>{error}</div>}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <button onClick={() => { setMode('forgot'); setError(null) }}
              style={{ background: 'none', border: 'none', padding: '1rem 0 0', fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.05em' }}>
              Forgot password?
            </button>
          </>
        )}

        {mode === 'forgot' && !resetSent && (
          <>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Password Reset</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>Reset your password.</div>
            <p style={{ fontSize: '13px', color: '#777', lineHeight: '1.7', marginBottom: '1.5rem' }}>Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleForgot}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                  style={{ width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {error && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1rem' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <button onClick={() => { setMode('login'); setError(null) }}
              style={{ background: 'none', border: 'none', padding: '1rem 0 0', fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.05em' }}>
              ← Back to sign in
            </button>
          </>
        )}

        {mode === 'forgot' && resetSent && (
          <>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.8rem', fontWeight: '300', color: '#3B6B2F', marginBottom: '0.75rem' }}>Check your inbox.</div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.75', marginBottom: '1.5rem' }}>
              A reset link is on its way to <strong>{email}</strong>. Check your spam folder if you don't see it.
            </p>
            <button onClick={() => { setMode('login'); setResetSent(false); setEmail('') }}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.05em' }}>
              ← Back to sign in
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: '2rem', fontSize: '11px', color: 'rgba(245,241,236,0.25)', letterSpacing: '0.05em' }}>
        © 2026 Canvas Routes
      </div>
    </div>
  )
}
