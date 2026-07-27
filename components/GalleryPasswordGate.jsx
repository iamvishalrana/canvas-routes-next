'use client'
import { useState, useEffect } from 'react'
import MembersGallery from './MembersGallery'

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem',
  background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)',
  color: '#1a1a1a', fontSize: '15px', fontFamily: 'var(--font-inter),sans-serif',
  outline: 'none', borderRadius: '4px', appearance: 'none', WebkitAppearance: 'none',
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
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: 'clamp(2rem,5vw,3rem)', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.75rem' }}>Private gallery</div>
        <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.8, margin: '0 0 1.5rem' }}>Enter the email address these photos were shared with.</p>
        <form onSubmit={submit}>
          <input
            value={email}
            onChange={e => { setEmail(e.target.value); setErrMsg(null) }}
            placeholder="Email"
            type="text"
            inputMode="email"
            autoComplete="email"
            style={{ ...inp, borderColor: errMsg ? '#c0526a' : 'rgba(0,0,0,0.18)', marginBottom: '0.85rem' }}
          />
          {errMsg && <div style={{ fontSize: '12px', color: '#93333E', marginBottom: '0.85rem' }}>{errMsg}</div>}
          <button type="submit" disabled={checking || !email.trim()}
            style={{
              width: '100%', padding: '0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '4px',
              fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: (checking || !email.trim()) ? 'default' : 'pointer',
              opacity: (checking || !email.trim()) ? 0.6 : 1, fontFamily: 'var(--font-inter),sans-serif',
            }}>
            {checking ? 'Checking…' : 'View Photos'}
          </button>
        </form>
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
