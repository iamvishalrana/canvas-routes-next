'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const supabase = createClient()

  const rules = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Under 72 characters', pass: password.length > 0 && password.length <= 72 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
  ]
  const allPass = rules.every(r => r.pass)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (!allPass) { setError('Please meet all password requirements.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/member/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Could not update password. The link may have expired — please request a new one.')
    } else {
      setDone(true)
      setTimeout(() => router.push('/members/dashboard'), 2000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />

      <Link href="/" style={{ marginBottom: '3rem', display: 'block' }}>
        <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={160} height={107} style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
      </Link>

      <div style={{ width: '100%', maxWidth: '400px', background: '#F5F1EC', padding: '2.5rem' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent,#c5a882,transparent)' }} />

        {done ? (
          <>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#3B6B2F', marginBottom: '0.75rem' }}>Password updated.</div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.75' }}>Redirecting you to your dashboard…</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Members Portal</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '2rem' }}>Set new password.</div>

            <form onSubmit={handleReset}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>New Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={8} autoComplete="new-password"
                  style={{ width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
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
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Confirm Password</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  required minLength={8} autoComplete="new-password"
                  style={{ width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {error && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1rem' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
