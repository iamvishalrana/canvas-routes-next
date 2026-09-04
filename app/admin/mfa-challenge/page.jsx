'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Shown by middleware.js when a signed-in admin has two-factor login enabled
// but no valid admin_mfa_session cookie yet. Primary factor is the email code;
// recovery email, recovery codes, and security questions are fallbacks for
// when the primary inbox is unreachable. Mirrors app/admin/login's shell.
export default function AdminMfaChallengePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState('email') // 'email' | 'recoverycode' | 'questions'
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)

  // Email-code mode
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(true)
  const [cooldown, setCooldown] = useState(0)
  const [usingRecovery, setUsingRecovery] = useState(false)

  // Which recovery methods this admin has (from challenge-info — no email sent)
  const [hasRecoveryEmail, setHasRecoveryEmail] = useState(false)
  const [hasRecoveryCodes, setHasRecoveryCodes] = useState(false)
  const [securityQuestions, setSecurityQuestions] = useState(null) // string[] | null

  // Recovery-code + questions modes
  const [recoveryCode, setRecoveryCode] = useState('')
  const [answers, setAnswers] = useState([])

  const sentOnce = useRef(false)

  useEffect(() => { document.title = 'Verify — CR Admin' }, [])

  // Discover available recovery methods without sending an email — so fallbacks
  // stay visible even if the primary email channel is down/rate-limited.
  useEffect(() => {
    fetch('/api/admin/mfa/challenge-info')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setHasRecoveryEmail(!!d.hasRecoveryEmail)
        setHasRecoveryCodes(!!d.hasRecoveryCodes)
        setSecurityQuestions(Array.isArray(d.securityQuestions) ? d.securityQuestions : null)
        setEmail(prev => prev || d.email || '')
      })
      .catch(() => {})
  }, [])

  // Send the primary email code once on mount (StrictMode-guarded).
  useEffect(() => {
    if (sentOnce.current) return
    sentOnce.current = true
    sendCode(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function sendCode(useRecovery) {
    setError(null); setSending(true); setCode('')
    try {
      const res = await fetch('/api/admin/mfa/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useRecovery }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Failed to send code.'); return }
      setEmail(data.email || '')
      setHasRecoveryEmail(!!data.hasRecoveryEmail)
      setUsingRecovery(useRecovery)
      setCooldown(30)
    } catch {
      setError('Connection error. Please check your network and try again.')
    } finally {
      setSending(false)
    }
  }

  function onVerified() {
    const next = searchParams.get('next')
    router.push(next && next.startsWith('/admin') ? next : '/admin/dashboard')
    router.refresh()
  }

  // Shared POST-and-redirect for the three verify endpoints.
  async function runVerify(url, payload) {
    setVerifying(true); setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Verification failed.'); setVerifying(false); return }
      onVerified()
    } catch {
      setError('Connection error. Please check your network and try again.')
      setVerifying(false)
    }
  }

  const submitEmail = e => { e.preventDefault(); runVerify('/api/admin/mfa/verify', { code, useRecovery: usingRecovery }) }
  const submitRecoveryCode = e => { e.preventDefault(); runVerify('/api/admin/mfa/recovery-codes/verify', { code: recoveryCode }) }
  const submitQuestions = e => { e.preventDefault(); runVerify('/api/admin/mfa/security-questions/verify', { answers }) }

  function switchMode(m) {
    setError(null)
    setMode(m)
    if (m === 'questions' && Array.isArray(securityQuestions)) setAnswers(securityQuestions.map(() => ''))
    if (m === 'recoverycode') setRecoveryCode('')
  }

  const maskedEmail = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.min(b.length, 4))}${c}`)

  const codeInputStyle = {
    width: '100%', padding: '0.65rem 0.85rem', boxSizing: 'border-box',
    border: '1px solid rgba(197,168,130,0.2)', background: 'rgba(245,241,236,0.04)', borderRadius: '8px',
    fontSize: '20px', letterSpacing: '0.4em', textAlign: 'center',
    fontFamily: 'var(--font-inter),sans-serif', color: '#F5F1EC', outline: 'none', WebkitAppearance: 'none',
  }
  const textInputStyle = {
    width: '100%', padding: '0.7rem 0.85rem', boxSizing: 'border-box',
    border: '1px solid rgba(197,168,130,0.2)', background: 'rgba(245,241,236,0.04)', borderRadius: '8px',
    fontSize: '16px', fontFamily: 'var(--font-inter),sans-serif', color: '#F5F1EC', outline: 'none', WebkitAppearance: 'none',
  }
  const primaryBtn = disabled => ({
    width: '100%', padding: '1rem', minHeight: '48px',
    background: disabled ? 'rgba(197,168,130,0.5)' : '#c5a882',
    border: 'none', borderRadius: '10px', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.22em',
    textTransform: 'uppercase', fontWeight: '600', cursor: disabled ? 'wait' : 'pointer',
    fontFamily: 'var(--font-inter),sans-serif', transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent',
  })
  const linkBtn = { background: 'none', border: 'none', fontSize: '11px', letterSpacing: '0.02em', color: 'rgba(197,168,130,0.75)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }

  const subtitle = mode === 'email'
    ? (email ? <>Enter the code sent to <strong style={{ color: 'rgba(245,241,236,0.8)' }}>{maskedEmail}</strong></> : 'Sending a code to your account email…')
    : mode === 'recoverycode'
      ? 'Enter one of your saved recovery codes.'
      : 'Answer your security questions to continue.'

  return (
    <div className="admin-shell" style={{
      minHeight: '100dvh', background: '#0F1E14',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'calc(1.5rem + env(safe-area-inset-top)) 1.5rem calc(2.5rem + env(safe-area-inset-bottom))',
      fontFamily: 'var(--font-inter),sans-serif',
    }}>
      <style>{`
        @keyframes crAdminLoginIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .cr-admin-login-input::placeholder { color: rgba(245,241,236,0.25); }
      `}</style>

      <div style={{ width: '100%', maxWidth: '340px', animation: 'crAdminLoginIn 0.5s ease both' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Canvas Routes" style={{ width: '150px', display: 'block', margin: '0 auto 1.75rem', opacity: 0.92 }} />
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.75rem' }}>Verify It&rsquo;s You</div>
          <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.55)', lineHeight: 1.6 }}>{subtitle}</div>
        </div>

        {/* ── Email-code mode ─────────────────────────────────────────────── */}
        {mode === 'email' && (
          <form onSubmit={submitEmail}>
            <div style={{ marginBottom: '1.25rem' }}>
              <input className="cr-admin-login-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={codeInputStyle} placeholder="000000" required disabled={sending} />
            </div>
            {error && <ErrBox>{error}</ErrBox>}
            <button type="submit" disabled={verifying || sending || code.length !== 6} style={primaryBtn(verifying || code.length !== 6)}>
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <button type="button" onClick={() => sendCode(usingRecovery)} disabled={cooldown > 0 || sending}
                style={{ background: 'none', border: 'none', fontSize: '11px', letterSpacing: '0.06em', color: cooldown > 0 ? 'rgba(245,241,236,0.25)' : 'rgba(245,241,236,0.5)', cursor: cooldown > 0 ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
              {(usingRecovery || hasRecoveryEmail) && (
                <button type="button" onClick={() => sendCode(!usingRecovery)} disabled={sending} style={linkBtn}>
                  {usingRecovery ? 'Use primary email instead' : "Can't access this email? Send to recovery email"}
                </button>
              )}
            </div>
          </form>
        )}

        {/* ── Recovery-code mode ──────────────────────────────────────────── */}
        {mode === 'recoverycode' && (
          <form onSubmit={submitRecoveryCode}>
            <div style={{ marginBottom: '1.25rem' }}>
              <input className="cr-admin-login-input" autoComplete="off" autoCapitalize="characters"
                value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)}
                style={{ ...textInputStyle, letterSpacing: '0.12em', textAlign: 'center' }} placeholder="XXXXX-XXXXX" required />
            </div>
            {error && <ErrBox>{error}</ErrBox>}
            <button type="submit" disabled={verifying || recoveryCode.trim().length < 8} style={primaryBtn(verifying || recoveryCode.trim().length < 8)}>
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {/* ── Security-questions mode ─────────────────────────────────────── */}
        {mode === 'questions' && Array.isArray(securityQuestions) && (
          <form onSubmit={submitQuestions}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              {securityQuestions.map((q, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(245,241,236,0.7)', marginBottom: '0.4rem', lineHeight: 1.5 }}>{q}</label>
                  <input className="cr-admin-login-input" autoComplete="off"
                    value={answers[i] || ''} onChange={e => setAnswers(a => { const n = [...a]; n[i] = e.target.value; return n })}
                    style={textInputStyle} required />
                </div>
              ))}
            </div>
            {error && <ErrBox>{error}</ErrBox>}
            <button type="submit" disabled={verifying || answers.some(a => !a || !a.trim())} style={primaryBtn(verifying || answers.some(a => !a || !a.trim()))}>
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {/* ── Switch between methods ──────────────────────────────────────── */}
        {(hasRecoveryCodes || (securityQuestions && securityQuestions.length > 0) || mode !== 'email') && (
          <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '0.5px solid rgba(245,241,236,0.08)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.3)' }}>More ways to sign in</div>
            {mode !== 'email' && (
              <button type="button" onClick={() => switchMode('email')} style={linkBtn}>Use email code</button>
            )}
            {mode !== 'recoverycode' && hasRecoveryCodes && (
              <button type="button" onClick={() => switchMode('recoverycode')} style={linkBtn}>Use a recovery code</button>
            )}
            {mode !== 'questions' && securityQuestions && securityQuestions.length > 0 && (
              <button type="button" onClick={() => switchMode('questions')} style={linkBtn}>Answer security questions</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ErrBox({ children }) {
  return (
    <div style={{ fontSize: '12px', color: '#e08a96', background: 'rgba(147,51,62,0.15)', border: '0.5px solid rgba(147,51,62,0.4)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
      {children}
    </div>
  )
}
