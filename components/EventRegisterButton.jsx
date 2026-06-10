'use client'
import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

function PayForm({ event, onSuccess, onClose }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true); setError(null)

    const submitResult = await elements.submit()
    if (submitResult?.error) { setError(submitResult.error.message); setPaying(false); return }

    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.href },
    })
    if (stripeErr) { setError(stripeErr.message); setPaying(false); return }
    if (!paymentIntent) { setError('Payment did not complete. Please try again.'); setPaying(false); return }

    const res = await fetch(`/api/member/events/${event.id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
    })
    const data = await res.json().catch(() => ({}))
    setPaying(false)
    if (!res.ok) { setError(data.error || 'Registration failed. Please contact support.'); return }
    onSuccess()
  }

  return (
    <form onSubmit={handlePay}>
      <div style={{ marginBottom: '1.5rem' }}>
        <PaymentElement />
      </div>
      {error && (
        <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={paying || !stripe}
          style={{
            background: '#0F1E14', color: '#F5F1EC', border: 'none', padding: '0.75rem 2rem',
            fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase',
            fontFamily: 'var(--font-inter), sans-serif', cursor: paying ? 'not-allowed' : 'pointer',
            opacity: paying ? 0.6 : 1,
          }}
        >
          {paying ? 'Processing…' : `Pay $${((event.member_price || 0) / 100).toFixed(2)}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={paying}
          style={{
            background: 'none', color: '#888', border: '0.5px solid rgba(0,0,0,0.15)',
            padding: '0.75rem 1.5rem', fontSize: '9px', letterSpacing: '0.18em',
            textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function EventRegisterButton({ event, isRegistered, memberTier, compact = false }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [loadingPI, setLoadingPI] = useState(false)
  const [piError, setPiError] = useState(null)
  const [registering, setRegistering] = useState(false)
  const [regError, setRegError] = useState(null)
  const [done, setDone] = useState(isRegistered)
  useEffect(() => { setDone(isRegistered) }, [isRegistered])

  const now = new Date()
  const opensAt = event.registration_opens_at ? new Date(event.registration_opens_at) : null
  const closesAt = event.registration_closes_at ? new Date(event.registration_closes_at) : null
  const regOpen = opensAt && now >= opensAt && (!closesAt || now <= closesAt)
  const regClosed = closesAt && now > closesAt
  const regNotYetOpen = opensAt && now < opensAt

  if (!opensAt) return null

  const isFree = !event.member_price || event.member_price === 0
  const isInnerCircle = memberTier === 'inner_circle'
  const inPriorityWindow = event.priority_window_end && now < new Date(event.priority_window_end)

  if (regClosed) {
    return (
      <span style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', fontFamily: 'var(--font-inter), sans-serif', border: '0.5px solid rgba(0,0,0,0.12)', padding: compact ? '2px 8px' : '0.45rem 1rem' }}>
        Registration Closed
      </span>
    )
  }

  if (done) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: '#3B6B2F', fontFamily: 'var(--font-inter), sans-serif',
        border: '0.5px solid rgba(59,107,47,0.3)', padding: compact ? '2px 8px' : '0.45rem 1rem',
        background: 'rgba(59,107,47,0.04)',
      }}>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Registered
      </span>
    )
  }

  if (regNotYetOpen && !regOpen) {
    const dateStr = opensAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    const timeStr = opensAt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    return (
      <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A6535', fontFamily: 'var(--font-inter), sans-serif', border: '0.5px solid rgba(197,168,130,0.3)', padding: compact ? '2px 8px' : '0.45rem 1rem', background: 'rgba(197,168,130,0.04)' }}>
        Opens {dateStr} at {timeStr}
      </span>
    )
  }

  if (inPriorityWindow && !isInnerCircle) {
    const windowEnd = new Date(event.priority_window_end)
    const dateStr = windowEnd.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    const timeStr = windowEnd.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    return (
      <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A6535', fontFamily: 'var(--font-inter), sans-serif', border: '0.5px solid rgba(197,168,130,0.3)', padding: compact ? '2px 8px' : '0.45rem 1rem', background: 'rgba(197,168,130,0.04)' }}>
        Opens {dateStr} at {timeStr}
      </span>
    )
  }

  if (!regOpen) return null

  async function handleClick() {
    setPiError(null)
    if (isFree) {
      setRegistering(true)
      const res = await fetch(`/api/member/events/${event.id}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json().catch(() => ({}))
      setRegistering(false)
      if (!res.ok) { setRegError(data.error || 'Registration failed.'); return }
      setDone(true)
      return
    }
    setLoadingPI(true)
    const res = await fetch('/api/stripe/event-payment-intent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id }),
    })
    const data = await res.json().catch(() => ({}))
    setLoadingPI(false)
    if (!res.ok) { setPiError(data.error || 'Could not start registration.'); return }
    setClientSecret(data.clientSecret)
    setModalOpen(true)
  }

  const btnLabel = isFree
    ? (registering ? 'Registering…' : 'Register — Free')
    : (loadingPI ? 'Loading…' : `Register — $${((event.member_price) / 100).toFixed(2)}`)

  return (
    <>
      <button
        onClick={handleClick}
        disabled={registering || loadingPI}
        style={{
          background: '#0F1E14', color: '#F5F1EC', border: 'none',
          padding: compact ? '0.5rem 1.25rem' : '0.65rem 1.5rem',
          fontSize: '8.5px', letterSpacing: '0.24em', textTransform: 'uppercase',
          fontFamily: 'var(--font-inter), sans-serif',
          cursor: (registering || loadingPI) ? 'not-allowed' : 'pointer',
          opacity: (registering || loadingPI) ? 0.6 : 1,
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        }}
      >
        {btnLabel}
        {!registering && !loadingPI && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        )}
      </button>
      {(piError || regError) && (
        <div style={{ fontSize: '11px', color: '#7B2032', marginTop: '0.4rem' }}>{piError || regError}</div>
      )}

      {/* Payment modal */}
      {modalOpen && clientSecret && stripePromise && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
        >
          <div style={{
            background: '#fff', maxWidth: '480px', width: '100%',
            padding: '2.25rem 2rem 2rem',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter)', marginBottom: '0.4rem' }}>
                Event Registration
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.2, marginBottom: '0.3rem' }}>
                {event.name}
              </div>
              {(event.date_display || event.date) && (
                <div style={{ fontSize: '12px', color: '#999', fontFamily: 'var(--font-inter)' }}>{event.date_display || event.date}</div>
              )}
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#777', fontFamily: 'var(--font-inter)' }}>Member price</span>
                <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', fontWeight: '300', color: '#1a1a1a' }}>
                  ${((event.member_price || 0) / 100).toFixed(2)} CAD
                </span>
              </div>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#0F1E14', fontFamily: 'Inter, sans-serif', borderRadius: '0px' } } }}>
              <PayForm
                event={event}
                onSuccess={() => { setModalOpen(false); setClientSecret(null); setDone(true) }}
                onClose={() => { setModalOpen(false); setClientSecret(null) }}
              />
            </Elements>
          </div>
        </div>
      )}
    </>
  )
}
