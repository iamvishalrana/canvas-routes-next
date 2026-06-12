'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

function UnsubscribeContent() {
  const params = useSearchParams()
  const email = params.get('email') || ''
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [alreadyDone, setAlreadyDone] = useState(false)

  useEffect(() => {
    if (!email) return
    fetch(`/api/unsubscribe?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => { if (d.unsubscribed) setAlreadyDone(true) })
      .catch(() => {})
  }, [email])

  async function handleUnsubscribe() {
    setStatus('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const LABEL = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '1rem' }
  const BODY  = { fontSize: '14px', lineHeight: '1.8', color: 'rgba(245,241,236,0.6)', fontFamily: 'var(--font-inter),sans-serif' }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem 2rem' }}>
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={140} height={93} style={{ width: '100px', height: 'auto', opacity: 0.85 }} />
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ width: '28px', height: '1px', background: '#c5a882', marginBottom: '1.5rem' }} />

          {!email ? (
            <>
              <div style={LABEL}>Unsubscribe</div>
              <p style={BODY}>This link isn&apos;t valid. If you&apos;d like to unsubscribe from Canvas Routes emails, reply to any email you&apos;ve received from us.</p>
            </>
          ) : status === 'done' || alreadyDone ? (
            <>
              <div style={LABEL}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>
                {alreadyDone && status !== 'done' ? 'You\'re already unsubscribed.' : 'You\'ve been unsubscribed.'}
              </h1>
              <p style={BODY}>
                {email && <><strong style={{ color: 'rgba(245,241,236,0.8)', fontWeight: '400' }}>{email}</strong> has been removed from our mailing list.</>}
                {' '}You won&apos;t receive broadcast emails from us anymore.
              </p>
              <p style={{ ...BODY, marginTop: '0.75rem', fontSize: '13px', color: 'rgba(245,241,236,0.35)' }}>
                Changed your mind? Reply to any previous email from us and we&apos;ll add you back.
              </p>
            </>
          ) : status === 'error' ? (
            <>
              <div style={LABEL}>Something went wrong</div>
              <p style={BODY}>We couldn&apos;t process your request. Please try again or reply to any email from us.</p>
              <button
                onClick={handleUnsubscribe}
                style={{ marginTop: '1.25rem', padding: '0.85rem 2rem', background: 'transparent', border: '1px solid rgba(197,168,130,0.4)', color: '#c5a882', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <div style={LABEL}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>
                Unsubscribe from emails?
              </h1>
              <p style={BODY}>
                {email
                  ? <><strong style={{ color: 'rgba(245,241,236,0.8)', fontWeight: '400' }}>{email}</strong> will be removed from all Canvas Routes broadcast emails.</>
                  : 'You will be removed from all Canvas Routes broadcast emails.'}
              </p>
              <p style={{ ...BODY, marginTop: '0.5rem', fontSize: '13px', color: 'rgba(245,241,236,0.35)' }}>
                You&apos;ll still receive transactional emails like event invites and membership confirmations.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleUnsubscribe}
                  disabled={status === 'loading'}
                  style={{ padding: '0.85rem 2rem', background: '#c5a882', border: 'none', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', fontWeight: '600', opacity: status === 'loading' ? 0.7 : 1 }}
                >
                  {status === 'loading' ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
                </button>
                <Link href="/" style={{ padding: '0.85rem 2rem', border: '1px solid rgba(197,168,130,0.25)', color: 'rgba(245,241,236,0.4)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif', display: 'inline-block' }}>
                  Cancel
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '1.25rem 2rem', borderTop: '0.5px solid rgba(197,168,130,0.08)', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.2)', margin: 0 }}>© 2026 Canvas Routes. Montreal, QC.</p>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}
