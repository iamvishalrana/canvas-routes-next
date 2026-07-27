'use client'
import { useState, useEffect } from 'react'
import MembersGallery from './MembersGallery'

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '0.95rem 1.1rem',
  background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.16)',
  color: '#F5F1EC', fontSize: '15px', fontFamily: 'var(--font-inter),sans-serif',
  outline: 'none', borderRadius: '2px', appearance: 'none', WebkitAppearance: 'none',
  transition: 'border-color 0.2s, background 0.2s',
}

// Gates the actual photo grid behind an email check — the recipient email
// set on the share (see PhotoSharesTab.jsx) doubles as the password. Nothing
// sensitive (photo URLs) is ever present in the server-rendered HTML; it's
// only fetched client-side after /api/gallery/[token]/verify confirms the
// entered email matches. Remembers a verified email per-token in
// localStorage so a returning visitor isn't asked to retype it — but the
// server still re-checks it silently on that return visit, it's never just
// a client-side flag.
export default function GalleryPasswordGate({ token, title, children }) {
  const [phase, setPhase] = useState('checking') // 'checking' | 'gate' | 'authed'
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    const remembered = localStorage.getItem(`gallery_email_${token}`)
    if (remembered) { verify(remembered, { silent: true }); return }
    setPhase('gate')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verify(candidate, { silent = false } = {}) {
    if (!silent) setChecking(true)
    setErrMsg(null)
    try {
      const res = await fetch(`/api/gallery/${token}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candidate }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        localStorage.removeItem(`gallery_email_${token}`)
        if (silent) { setPhase('gate'); return }
        setErrMsg(data.error || 'Something went wrong. Please try again.')
        setChecking(false)
        return
      }
      localStorage.setItem(`gallery_email_${token}`, candidate)
      setPhotos(data.photos || [])
      setPhase('authed')
    } catch {
      if (silent) { setPhase('gate'); return }
      setErrMsg('Network error — please try again.')
      setChecking(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    const entered = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entered)) { setErrMsg('Please enter a valid email address.'); return }
    verify(entered)
  }

  if (phase === 'checking') return null

  if (phase === 'gate') {
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="9" rx="1.5" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>

          <div className="gpg-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '0.85rem' }}>
            Private Gallery
          </div>
          <h3 className="gpg-heading" style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.5rem, 4vw, 1.85rem)', fontWeight: '400', color: '#F5F1EC', margin: '0 0 0.9rem', lineHeight: 1.2 }}>
            These photos are just for you
          </h3>
          <p className="gpg-body" style={{ fontSize: '13px', color: 'rgba(245,241,236,0.55)', lineHeight: 1.8, margin: '0 0 1.75rem' }}>
            Enter the email address these photos were shared with.
          </p>
          <form onSubmit={submit} className="gpg-form">
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
              {checking ? 'Checking…' : 'View Photos'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '13px', color: '#999' }}>No photos have been added to this gallery yet.</div>
        </div>
      ) : (
        <MembersGallery albums={[{ name: title, date: null, photos }]} />
      )}
      {children}
    </div>
  )
}
