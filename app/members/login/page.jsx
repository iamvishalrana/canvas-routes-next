'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetSent, setResetSent] = useState(false)
  const [setupMsg, setSetupMsg] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [focused, setFocused] = useState(null)

  useEffect(() => { document.title = 'Sign In — Canvas Routes' }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) { setError(err); window.history.replaceState({}, '', window.location.pathname) }
    if (params.get('setup') === '1') { setSetupMsg(true); window.history.replaceState({}, '', window.location.pathname) }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || 'Incorrect email or password.')
      else { router.push('/members/dashboard'); router.refresh() }
    } catch {
      setError('Connection error. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) setError('Could not send reset email. Please check the address and try again.')
      else setResetSent(true)
    } catch {
      setError('Connection error. Please check your network and try again.')
    } finally {
      setLoading(false)
    }
  }

  function inputStyle(field) {
    return {
      width: '100%', padding: '0.9rem 1rem',
      border: `1px solid ${focused === field ? '#c5a882' : 'rgba(0,0,0,0.15)'}`,
      background: 'transparent',
      fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a',
      outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.2s',
      boxShadow: focused === field ? '0 0 0 3px rgba(197,168,130,0.15)' : 'none',
    }
  }

  const formContent = (
    <div style={{ width: '100%', maxWidth: isMobile ? '100%' : '360px' }}>

      {mode === 'login' && (
        <>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>Members Portal</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: isMobile ? '2.2rem' : '2.6rem', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.1' }}>Welcome.</div>
            <div style={{ width: '28px', height: '1px', background: '#c5a882', marginTop: '1.1rem' }} />
          </div>

          {setupMsg && (
            <div style={{ fontSize: '13px', color: '#3B6B2F', background: 'rgba(59,107,47,0.07)', border: '0.5px solid rgba(59,107,47,0.25)', padding: '0.85rem 1rem', marginBottom: '1.5rem', lineHeight: '1.65', fontFamily: 'var(--font-inter),sans-serif' }}>
              Your password has been set. Sign in below.
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: '0.45rem', fontFamily: 'var(--font-inter),sans-serif' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                style={inputStyle('email')} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: '0.45rem', fontFamily: 'var(--font-inter),sans-serif' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                  style={{ ...inputStyle('password'), paddingRight: '2.8rem' }}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1.75rem' }}>
              <button type="button" onClick={() => { setMode('forgot'); setError(null) }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: '#aaa', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.03em' }}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1rem', lineHeight: '1.55', fontFamily: 'var(--font-inter),sans-serif' }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '0.95rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </>
      )}

      {mode === 'forgot' && !resetSent && (
        <>
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>Password Reset</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.1' }}>Reset your<br/>password.</div>
            <div style={{ width: '28px', height: '1px', background: '#c5a882', marginTop: '1.1rem' }} />
          </div>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: '1.75', marginBottom: '1.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
            Enter your email and we'll send you a reset link.
          </p>
          <form onSubmit={handleForgot}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: '0.45rem', fontFamily: 'var(--font-inter),sans-serif' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                style={inputStyle('email')} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
            </div>
            {error && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '0.95rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
          <button onClick={() => { setMode('login'); setError(null) }}
            style={{ background: 'none', border: 'none', padding: '1.2rem 0 0', fontSize: '11px', color: '#aaa', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.03em', display: 'block' }}>
            ← Back to sign in
          </button>
        </>
      )}

      {mode === 'forgot' && resetSent && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: '300', color: '#3B6B2F', lineHeight: '1.1' }}>Check your<br/>inbox.</div>
            <div style={{ width: '28px', height: '1px', background: '#c5a882', marginTop: '1.1rem' }} />
          </div>
          <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.75', marginBottom: '1.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
            A reset link is on its way to <strong style={{ fontWeight: '500', color: '#1a1a1a' }}>{email}</strong>. Check your spam folder if you don't see it.
          </p>
          <button onClick={() => { setMode('login'); setResetSent(false); setEmail('') }}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: '#aaa', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.03em' }}>
            ← Back to sign in
          </button>
        </>
      )}

    </div>
  )

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0F1E14', paddingTop: 'max(1.75rem, env(safe-area-inset-top))', paddingBottom: '1.75rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />
          <Link href="/" style={{ display: 'inline-block' }}>
            <div style={{ width: '107px', height: '49px', overflow: 'hidden' }}>
              <Image src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536}
                style={{ width: '107px', height: 'auto', marginTop: '-51px', display: 'block', opacity: 0.9 }} />
            </div>
          </Link>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.5rem 2rem' }}>
          {formContent}
        </div>
        <div style={{ paddingTop: '0.75rem', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingLeft: '1rem', paddingRight: '1rem', textAlign: 'center', fontSize: '10px', color: '#bbb', letterSpacing: '0.04em', fontFamily: 'var(--font-inter),sans-serif' }}>
          © 2026 Canvas Routes
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Left branding panel */}
      <div style={{ width: '42%', flexShrink: 0, background: '#0F1E14', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, transparent 0%, rgba(197,168,130,0.2) 25%, rgba(197,168,130,0.2) 75%, transparent 100%)' }} />

        <Link href="/">
          <div style={{ width: '142px', height: '64px', overflow: 'hidden' }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536}
              style={{ width: '142px', height: 'auto', marginTop: '-69px', display: 'block', opacity: 0.9 }} />
          </div>
        </Link>

        <div>
          <div style={{ width: '28px', height: '0.5px', background: 'rgba(197,168,130,0.6)', marginBottom: '2rem' }} />
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.8rem', fontWeight: '300', color: '#F5F1EC', lineHeight: '1.25', letterSpacing: '-0.01em' }}>
            The Community.<br/>The Routes.<br/>The Canvas.
          </div>
          <div style={{ width: '28px', height: '0.5px', background: 'rgba(197,168,130,0.6)', marginTop: '2rem' }} />
        </div>

        <div style={{ fontSize: '10px', color: 'rgba(245,241,236,0.2)', letterSpacing: '0.08em' }}>
          © 2026 Canvas Routes · Montreal, QC
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, background: '#F5F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        {formContent}
      </div>

    </div>
  )
}
