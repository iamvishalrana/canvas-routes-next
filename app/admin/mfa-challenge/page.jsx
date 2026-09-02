'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Shown by middleware.js when a signed-in admin has two-factor login enabled
// (user.app_metadata.mfa_enabled) but no valid admin_mfa_session cookie yet.
// Mirrors app/admin/login's shell/branding — this is a continuation of
// signing in, not a separate feature.
export default function AdminMfaChallengePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const sentOnce = useRef(false)

  useEffect(() => { document.title = 'Verify — CR Admin' }, [])

  useEffect(() => {
    if (sentOnce.current) return // guards React StrictMode's double-invoked effect
    sentOnce.current = true
    sendCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function sendCode() {
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/admin/mfa/send-code', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Failed to send code.'); return }
      setEmail(data.email || '')
      setCooldown(30)
    } catch {
      setError('Connection error. Please check your network and try again.')
    } finally {
      setSending(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setVerifying(true); setError(null)
    try {
      const res = await fetch('/api/admin/mfa/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Verification failed.')
        setVerifying(false)
        return
      }
      const next = searchParams.get('next')
      router.push(next && next.startsWith('/admin') ? next : '/admin/dashboard')
      router.refresh()
    } catch {
      setError('Connection error. Please check your network and try again.')
      setVerifying(false)
    }
  }

  const maskedEmail = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 4))}${c}`)

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.85rem', boxSizing: 'border-box',
    border: '1px solid rgba(197,168,130,0.2)',
    background: 'rgba(245,241,236,0.04)', borderRadius: '8px',
    fontSize: '20px', letterSpacing: '0.4em', textAlign: 'center',
    fontFamily: 'var(--font-inter),sans-serif', color: '#F5F1EC',
    outline: 'none', WebkitAppearance: 'none',
  }

  return (
    <div className="admin-shell" style={{
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
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.75rem' }}>Verify It's You</div>
          <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.55)', lineHeight: 1.6 }}>
            {email ? <>Enter the code sent to <strong style={{ color: 'rgba(245,241,236,0.8)' }}>{maskedEmail}</strong></> : 'Sending a code to your account email…'}
          </div>
        </div>

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              className="cr-admin-login-input"
              inputMode="numeric" autoComplete="one-time-code" maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={inputStyle} placeholder="000000" required disabled={sending}
            />
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: '#e08a96', background: 'rgba(147,51,62,0.15)', border: '0.5px solid rgba(147,51,62,0.4)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={verifying || sending || code.length !== 6} style={{
            width: '100%', padding: '1rem', minHeight: '48px',
            background: (verifying || code.length !== 6) ? 'rgba(197,168,130,0.5)' : '#c5a882',
            border: 'none', borderRadius: '10px', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.22em',
            textTransform: 'uppercase', fontWeight: '600', cursor: verifying ? 'wait' : 'pointer',
            fontFamily: 'var(--font-inter),sans-serif', transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent',
          }}>
            {verifying ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button" onClick={sendCode} disabled={cooldown > 0 || sending}
            style={{ background: 'none', border: 'none', fontSize: '11px', letterSpacing: '0.06em', color: cooldown > 0 ? 'rgba(245,241,236,0.25)' : 'rgba(245,241,236,0.5)', cursor: cooldown > 0 ? 'default' : 'pointer' }}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  )
}
