'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Admin sign-in. Lives inside /admin so the page carries the CR Admin PWA
// manifest + apple-web-app meta — whichever admin page iOS's Add to Home
// Screen is used on, it always captures a standalone web app (adding from
// /members/login used to produce a plain Safari bookmark). Also keeps the
// home-screen app inside its own shell when the session expires.
export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [focused, setFocused] = useState(null)

  useEffect(() => { document.title = 'Sign In — CR Admin' }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Incorrect email or password.')
        setLoading(false)
      } else {
        // Middleware bounces non-admin accounts to the members dashboard
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch {
      setError('Connection error. Please check your network and try again.')
      setLoading(false)
    }
  }

  const inputStyle = field => ({
    width: '100%', padding: '0.9rem 1rem', boxSizing: 'border-box',
    border: `1px solid ${focused === field ? 'rgba(197,168,130,0.8)' : 'rgba(197,168,130,0.2)'}`,
    background: 'rgba(245,241,236,0.04)', borderRadius: '10px',
    fontSize: '14px', fontFamily: 'var(--font-inter),sans-serif', color: '#F5F1EC',
    outline: 'none', transition: 'border-color 0.2s', WebkitAppearance: 'none',
  })

  return (
    <div style={{
      minHeight: '100dvh', background: '#0F1E14',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(1.5rem + env(safe-area-inset-top)) 1.5rem calc(2.5rem + env(safe-area-inset-bottom))',
      fontFamily: 'var(--font-inter),sans-serif',
    }}>
      <style>{`
        @keyframes crAdminLoginIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .cr-admin-login-input::placeholder { color: rgba(245,241,236,0.25); font-size: 13px; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '340px', animation: 'crAdminLoginIn 0.5s ease both' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Canvas Routes" style={{ width: '150px', display: 'block', margin: '0 auto 1.75rem', opacity: 0.92 }} />
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c5a882' }}>Admin</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '0.45rem' }}>Email</label>
            <input className="cr-admin-login-input" type="email" value={email} autoComplete="email" inputMode="email" autoCapitalize="none"
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
              style={inputStyle('email')} placeholder="you@canvasroutes.com" required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '0.45rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="cr-admin-login-input" type={showPassword ? 'text' : 'password'} value={password} autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                style={{ ...inputStyle('password'), paddingRight: '3rem' }} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.4)', padding: '8px', display: 'flex', WebkitTapHighlightColor: 'transparent' }}>
                {showPassword
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: '#e08a96', background: 'rgba(147,51,62,0.15)', border: '0.5px solid rgba(147,51,62,0.4)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '1rem', minHeight: '48px', background: loading ? 'rgba(197,168,130,0.5)' : '#c5a882',
            border: 'none', borderRadius: '10px', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.22em',
            textTransform: 'uppercase', fontWeight: '600', cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'var(--font-inter),sans-serif', transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent',
          }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href="/members/login" style={{ fontSize: '11px', color: 'rgba(245,241,236,0.35)', textDecoration: 'none', letterSpacing: '0.06em' }}>
            Member? Sign in at the members portal →
          </a>
        </div>
      </div>
    </div>
  )
}
