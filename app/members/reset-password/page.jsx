'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [accessToken, setAccessToken] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  const rules = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Under 72 characters', pass: password.length > 0 && password.length <= 72 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
  ]
  const allPass = rules.every(r => r.pass)
  const passwordsMatch = confirm.length > 0 && password === confirm

  useEffect(() => { document.title = 'Set Password — Canvas Routes' }, [])

  useEffect(() => {
    // Token passed from /auth/callback via URL query param
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      setAccessToken(urlToken)
      setSessionChecked(true)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    // Fallback: check server-side cookie session
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.access_token) setAccessToken(data.access_token)
        setSessionChecked(true)
      })
      .catch(() => setSessionChecked(true))
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (!allPass) { setError('Please meet all password requirements.'); return }
    if (!passwordsMatch) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, accessToken }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Could not update password.')
    } else {
      setDone(true)
      setTimeout(() => router.push('/members/login?setup=1'), 2000)
    }
  }

  const inputStyle = { width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />

      <Link href="/" style={{ marginBottom: '3rem', display: 'block' }}>
        <div style={{ width: '142px', height: '64px', overflow: 'hidden' }}>
          <Image src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536}
            style={{ width: '142px', height: 'auto', marginTop: '-69px', display: 'block', opacity: 0.9 }} />
        </div>
      </Link>

      <div style={{ width: '100%', maxWidth: '400px', background: '#F5F1EC', padding: '2.5rem' }}>
        {!sessionChecked ? (
          <p style={{ fontSize: '13px', color: '#777', textAlign: 'center', margin: 0 }}>Verifying link…</p>
        ) : !accessToken ? (
          <>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.8rem', fontWeight: '300', color: '#7B2032', marginBottom: '0.75rem' }}>Link expired.</div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.75', marginBottom: '1.5rem' }}>
              This link has expired or has already been used. Please request a new one.
            </p>
            <Link href="/members/login" style={{ fontSize: '11px', color: '#888', letterSpacing: '0.05em', textDecoration: 'none' }}>
              ← Back to sign in
            </Link>
          </>
        ) : done ? (
          <>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#3B6B2F', marginBottom: '0.75rem' }}>Password set.</div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.75' }}>Redirecting you to login…</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Members Portal</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '2rem' }}>Set your password.</div>

            <form onSubmit={handleReset}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="new-password" style={inputStyle} />
              </div>

              {password.length > 0 && (
                <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {rules.map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: r.pass ? '#3B6B2F' : '#aaa' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: r.pass ? '#3B6B2F' : '#ccc', flexShrink: 0 }} />
                      {r.label}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  required autoComplete="new-password" style={inputStyle} />
              </div>

              {confirm.length > 0 && (
                <div style={{ fontSize: '11px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: passwordsMatch ? '#3B6B2F' : '#7B2032' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: passwordsMatch ? '#3B6B2F' : '#7B2032', flexShrink: 0 }} />
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}

              {error && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1rem' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Setting password…' : 'Set Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
