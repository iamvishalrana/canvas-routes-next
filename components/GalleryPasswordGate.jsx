'use client'
import { useState, useEffect, useRef } from 'react'
import MembersGallery from './MembersGallery'

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '0.95rem 1.1rem',
  background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.16)',
  color: '#F5F1EC', fontSize: '16px', fontFamily: 'var(--font-inter),sans-serif',
  outline: 'none', borderRadius: '2px', appearance: 'none', WebkitAppearance: 'none',
  transition: 'border-color 0.2s, background 0.2s',
}

const RESEND_COOLDOWN_SEC = 30

function daysLeft(expiresAt) {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

// Gates the actual photo grid behind email + a one-time code sent to it —
// upgraded from the old "email doubles as the password" scheme (anyone who
// merely knew or guessed the recipient's email, e.g. from a shared inbox or
// a predictable firstname.lastname pattern, got straight in) to actually
// proving the visitor can receive mail at that address. Two-step flow:
// request-code/route.js confirms the email matches this token and emails a
// 6-digit code; verify-code/route.js checks it and mints an opaque session
// id. Nothing sensitive (photo URLs) is ever present in the server-rendered
// HTML; it's only fetched client-side after a code is verified. The session
// id (not the plaintext email, unlike before) is remembered in localStorage
// per-token so a returning visitor on the same device isn't asked to redo
// the code — verify/route.js re-checks that session id server-side on every
// return visit, it's never just a client-side flag.
export default function GalleryPasswordGate({ token, children }) {
  const [phase, setPhase] = useState('checking') // 'checking' | 'gate' | 'code' | 'authed'
  const [email, setEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState('') // the email a code was actually sent to
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const [folders, setFolders] = useState([])
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimerRef = useRef(null)

  const sessionStorageKey = `gallery_session_${token}`

  useEffect(() => {
    const sessionId = localStorage.getItem(sessionStorageKey)
    if (sessionId) { checkSession(sessionId); return }
    setPhase('gate')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    cooldownTimerRef.current = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(cooldownTimerRef.current)
  }, [cooldown])

  async function checkSession(sessionId) {
    try {
      const res = await fetch(`/api/gallery/${token}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { localStorage.removeItem(sessionStorageKey); setPhase('gate'); return }
      setFolders(data.folders || [])
      setPhase('authed')
    } catch {
      // Network hiccup on the silent check — don't strand the visitor on a
      // blank page, just fall back to asking them to verify again.
      setPhase('gate')
    }
  }

  async function requestCode(e, overrideEmail) {
    e?.preventDefault()
    const entered = (overrideEmail ?? email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entered)) { setErrMsg('Please enter a valid email address.'); return }
    setChecking(true); setErrMsg(null)
    try {
      const res = await fetch(`/api/gallery/${token}/request-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: entered }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErrMsg(data.error || 'Something went wrong. Please try again.'); setChecking(false); return }
      setPendingEmail(entered)
      setCode('')
      setPhase('code')
      setCooldown(RESEND_COOLDOWN_SEC)
    } catch {
      setErrMsg('Network error — please try again.')
    } finally {
      setChecking(false)
    }
  }

  async function submitCode(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { setErrMsg('Enter the 6-digit code.'); return }
    setChecking(true); setErrMsg(null)
    try {
      const res = await fetch(`/api/gallery/${token}/verify-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErrMsg(data.error || 'Something went wrong. Please try again.'); setChecking(false); return }
      localStorage.setItem(sessionStorageKey, data.sessionId)
      setFolders(data.folders || [])
      setPhase('authed')
    } catch {
      setErrMsg('Network error — please try again.')
      setChecking(false)
    }
  }

  function useDifferentEmail() {
    setPhase('gate'); setErrMsg(null); setCode(''); setPendingEmail(''); setCooldown(0)
  }

  if (phase === 'checking') return null

  if (phase === 'gate' || phase === 'code') {
    const onCodeScreen = phase === 'code'
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
        <style>{`
          @keyframes gpg-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes gpg-fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes gpg-card-in { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes gpg-shimmer {
            0%   { left: -80%; opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { left: 130%; opacity: 0; }
          }
          .gpg-card { animation: gpg-card-in 0.55s cubic-bezier(0.16,1,0.3,1) both; }
          .gpg-icon  { animation: gpg-fade-in 0.6s ease both; animation-delay: 80ms; }
          .gpg-eyebrow { animation: gpg-fade-in 0.6s ease both; animation-delay: 160ms; }
          .gpg-heading { animation: gpg-fade-up 0.65s ease both; animation-delay: 240ms; }
          .gpg-body { animation: gpg-fade-up 0.6s ease both; animation-delay: 320ms; }
          .gpg-form { animation: gpg-fade-up 0.6s ease both; animation-delay: 400ms; }
          .gpg-input:focus { border-color: rgba(197,168,130,0.65) !important; background: rgba(255,255,255,0.08) !important; box-shadow: 0 0 0 3px rgba(197,168,130,0.12); }
          .gpg-submit { position: relative; overflow: hidden; transition: transform 0.15s ease, box-shadow 0.15s ease; }
          .gpg-submit:active:not(:disabled) { transform: scale(0.985); }
          .gpg-submit::after {
            content: ''; position: absolute; top: -10%; left: -80%; width: 40%; height: 120%;
            background: linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.35) 50%, transparent 90%);
            transform: skewX(-10deg); animation: gpg-shimmer 2.6s ease-in-out 1.1s infinite; pointer-events: none;
          }
          .gpg-link { background: none; border: none; padding: 0; cursor: pointer; font-family: var(--font-inter),sans-serif; }
          .gpg-link:disabled { cursor: default; opacity: 0.4; }
        `}</style>
        <div className="gpg-card" style={{
          width: '100%', maxWidth: '420px', textAlign: 'center',
          background: '#0F1E14',
          backgroundImage: 'repeating-linear-gradient(-55deg, transparent 0, transparent 36px, rgba(197,168,130,0.02) 36px, rgba(197,168,130,0.02) 37px)',
          borderRadius: '16px', padding: 'clamp(2.25rem,5vw,3rem)',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 20px 60px -12px rgba(15,30,20,0.55), 0 0 0 0.5px rgba(197,168,130,0.25)',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.55),transparent)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)' }} />

          <div className="gpg-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px', borderRadius: '99px', border: '0.5px solid rgba(197,168,130,0.4)', background: 'rgba(197,168,130,0.08)', marginBottom: '1.25rem' }}>
            {onCodeScreen ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 6L12 13 2 6" /><rect x="2" y="4" width="20" height="16" rx="2" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="9" rx="1.5" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            )}
          </div>

          <div className="gpg-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '0.85rem' }}>
            Private Gallery
          </div>
          <h3 className="gpg-heading" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.5rem, 4vw, 1.85rem)', fontWeight: '400', color: '#F5F1EC', margin: '0 0 0.9rem', lineHeight: 1.2 }}>
            {onCodeScreen ? 'Check your email' : 'These photos are just for you'}
          </h3>
          <p className="gpg-body" style={{ fontSize: '13px', color: 'rgba(245,241,236,0.55)', lineHeight: 1.8, margin: '0 0 1.75rem' }}>
            {onCodeScreen ? <>We sent a 6-digit code to <span style={{ color: 'rgba(245,241,236,0.85)' }}>{pendingEmail}</span>. Enter it below — it expires in 10 minutes.</> : 'Enter the email address these photos were shared with and we\'ll send you a one-time code.'}
          </p>

          {onCodeScreen ? (
            <form onSubmit={submitCode} className="gpg-form">
              <input
                className="gpg-input"
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrMsg(null) }}
                placeholder="000000"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                autoFocus
                style={{ ...inp, borderColor: errMsg ? 'rgba(192,82,106,0.7)' : 'rgba(255,255,255,0.16)', marginBottom: '0.85rem', textAlign: 'center', fontSize: '22px', letterSpacing: '0.5em', fontFamily: 'var(--font-inter),sans-serif' }}
              />
              {errMsg && (
                <div style={{ fontSize: '12px', color: '#e5a1a8', marginBottom: '0.85rem', animation: 'gpg-fade-in 0.3s ease both' }}>{errMsg}</div>
              )}
              <button type="submit" className="gpg-submit" disabled={checking || code.length !== 6}
                style={{
                  width: '100%', padding: '0.95rem', background: '#F5F1EC', color: '#0F1E14', border: 'none', borderRadius: '2px',
                  fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: (checking || code.length !== 6) ? 'default' : 'pointer',
                  opacity: (checking || code.length !== 6) ? 0.55 : 1, fontFamily: 'var(--font-inter),sans-serif', fontWeight: '600',
                  boxShadow: (checking || code.length !== 6) ? 'none' : '0 6px 20px -6px rgba(197,168,130,0.4)',
                  marginBottom: '1.1rem',
                }}>
                {checking ? 'Verifying…' : 'Verify Code'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', fontSize: '11px' }}>
                <button type="button" className="gpg-link" disabled={checking || cooldown > 0} onClick={() => requestCode(null, pendingEmail)}
                  style={{ color: cooldown > 0 ? 'rgba(245,241,236,0.35)' : '#c5a882', textDecoration: cooldown > 0 ? 'none' : 'underline', textUnderlineOffset: '3px' }}>
                  {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                </button>
                <button type="button" className="gpg-link" disabled={checking} onClick={useDifferentEmail}
                  style={{ color: 'rgba(245,241,236,0.45)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  Use a different email
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={requestCode} className="gpg-form">
              <input
                className="gpg-input"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrMsg(null) }}
                placeholder="Email"
                type="text"
                inputMode="email"
                autoComplete="email"
                style={{ ...inp, borderColor: errMsg ? 'rgba(192,82,106,0.7)' : 'rgba(255,255,255,0.16)', marginBottom: '0.85rem' }}
              />
              {errMsg && (
                <div style={{ fontSize: '12px', color: '#e5a1a8', marginBottom: '0.85rem', animation: 'gpg-fade-in 0.3s ease both' }}>{errMsg}</div>
              )}
              <button type="submit" className="gpg-submit" disabled={checking || !email.trim()}
                style={{
                  width: '100%', padding: '0.95rem', background: '#F5F1EC', color: '#0F1E14', border: 'none', borderRadius: '2px',
                  fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: (checking || !email.trim()) ? 'default' : 'pointer',
                  opacity: (checking || !email.trim()) ? 0.55 : 1, fontFamily: 'var(--font-inter),sans-serif', fontWeight: '600',
                  boxShadow: (checking || !email.trim()) ? 'none' : '0 6px 20px -6px rgba(197,168,130,0.4)',
                }}>
                {checking ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  const totalPhotos = folders.reduce((s, f) => s + f.photos.length, 0)

  return (
    <div>
      {totalPhotos === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '13px', color: '#999' }}>No photos have been added yet.</div>
        </div>
      ) : (
        <MembersGallery albums={folders.map(f => {
          const left = daysLeft(f.expiresAt)
          return { name: f.title, date: null, photos: f.photos, note: left <= 5 ? `${left <= 0 ? 'expiring today' : `${left}d left`}` : null }
        })} />
      )}
      {children}
    </div>
  )
}
