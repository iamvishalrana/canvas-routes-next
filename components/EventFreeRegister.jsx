'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function RegistrationConfirmPopup({ eventName, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div style={{
        background: '#0F1E14', maxWidth: '420px', width: '100%',
        padding: '2.5rem 2rem 2rem',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        {/* Checkmark */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            border: '1.5px solid rgba(197,168,130,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        <div style={{ fontSize: '8px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.75rem' }}>
          You&apos;re registered
        </div>

        <h2 style={{
          fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
          fontWeight: '300', color: '#F5F1EC', lineHeight: 1.15, margin: '0 0 1.75rem',
          letterSpacing: '-0.01em',
        }}>
          {eventName}
        </h2>

        <p style={{ fontSize: '12px', color: 'rgba(245,241,236,0.55)', fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1.6, marginBottom: '2rem' }}>
          A confirmation email is on its way. We&apos;ll see you there.
        </p>

        <button
          onClick={onClose}
          style={{
            background: 'transparent', color: '#F5F1EC',
            border: '0.5px solid rgba(245,241,236,0.3)',
            padding: '0.65rem 2rem', fontSize: '8.5px', letterSpacing: '0.24em',
            textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function EventFreeRegister({ eventId, eventName, initiallyRegistered }) {
  const router = useRouter()
  const [state, setState] = useState(initiallyRegistered ? 'done' : 'idle')
  const [error, setError] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  async function confirm() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch(`/api/member/events/${eventId}/free-register`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Registration failed. Please try again.'); setState('confirm'); return }
      setState('done')
      setShowConfirm(true)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
      setState('confirm')
    }
  }

  if (state === 'done') {
    return (
      <>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)',
          padding: '0.45rem 1rem', background: 'rgba(59,107,47,0.04)',
          fontFamily: 'var(--font-inter), sans-serif',
        }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Registered
        </span>
        {showConfirm && (
          <RegistrationConfirmPopup
            eventName={eventName}
            onClose={() => setShowConfirm(false)}
          />
        )}
      </>
    )
  }

  if (state === 'confirm' || state === 'loading') {
    return (
      <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.5rem', background: '#fff', maxWidth: '400px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.6rem' }}>
          Confirm Registration
        </div>
        <p style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.6, fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.4rem' }}>
          Register for <strong>{eventName}</strong>?
        </p>
        <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.6, fontFamily: 'var(--font-inter), sans-serif', marginBottom: '1.25rem' }}>
          We&apos;ll use your profile information — no form needed.
        </p>
        {error && (
          <p style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.75rem', fontFamily: 'var(--font-inter), sans-serif' }}>{error}</p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={confirm}
            disabled={state === 'loading'}
            style={{
              background: '#0F1E14', color: '#F5F1EC', border: 'none',
              padding: '0.65rem 1.5rem', fontSize: '9px', letterSpacing: '0.22em',
              textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif',
              cursor: state === 'loading' ? 'not-allowed' : 'pointer',
              opacity: state === 'loading' ? 0.65 : 1,
            }}
          >
            {state === 'loading' ? 'Registering…' : "Yes, register me"}
          </button>
          <button
            onClick={() => { setState('idle'); setError(null) }}
            disabled={state === 'loading'}
            style={{
              background: 'none', color: '#888', border: '0.5px solid rgba(0,0,0,0.15)',
              padding: '0.65rem 1.25rem', fontSize: '9px', letterSpacing: '0.18em',
              textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // idle state — initial register button
  return (
    <button
      onClick={() => setState('confirm')}
      style={{
        background: '#0F1E14', color: '#F5F1EC', border: 'none',
        padding: '0.65rem 1.5rem', fontSize: '9px', letterSpacing: '0.24em',
        textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        marginBottom: '2rem',
      }}
    >
      Register
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </button>
  )
}
