'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams } from 'next/navigation'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import CheckinTripDetailsSection from '../../../components/CheckinTripDetailsSection'
import CheckinWaiverSection from '../../../components/CheckinWaiverSection'
import CheckinLunchSection from '../../../components/CheckinLunchSection'
import { CHECKIN_T as t } from '../../../lib/genericCheckinContent'
import { captureException } from '../../../lib/sentry'
import { normalizeEmail } from '../../../lib/normalizeEmail'

const NAV_LINKS = [
  { href: '/',         label: 'Home' },
  { href: '/#events',  label: 'Events' },
  { href: '/#contact', label: 'Contact' },
  { href: '/faq',      label: 'FAQ' },
]

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '15px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const label = { display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }

function CheckinContent() {
  const { eventId } = useParams()

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('gate') // gate | loading | found
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  async function verify(e) {
    e?.preventDefault()
    setError(null)
    const targetEmail = normalizeEmail(email)
    if (!targetEmail || !targetEmail.includes('@')) { setError(t.invalidEmailError); return }
    setStatus('loading')
    try {
      const res = await fetch(`/api/checkin/${eventId}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status !== 404) captureException(new Error(`checkin lookup failed: HTTP ${res.status}`), { context: 'generic-checkin-lookup', status: res.status, serverError: d.error })
        setError(d.error || t.genericError)
        setStatus('gate')
        return
      }
      setData({ ...d, email: targetEmail })
      setStatus('found')
    } catch (err) {
      captureException(err, { context: 'generic-checkin-lookup-network' })
      setError(t.networkError)
      setStatus('gate')
    }
  }

  const identifier = { email: data?.email, eventId }
  const firstName = data?.name?.trim().split(' ')[0] || ''
  const passengersList = data?.tripDetails?.passengers_list || []
  const sections = data?.sections || []
  const hasTrip = sections.includes('trip_details')
  const hasWaiver = sections.includes('waiver')
  const hasLunch = sections.includes('lunch')
  const allDone = data && (!hasTrip || !!data.tripDetails) && (!hasWaiver || !!data.waiver)
    && (!hasLunch || (data.lunch?.length > 0 && data.lunch.length === passengersList.length))

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: '7rem 1.5rem 6rem' }}>

      {(status === 'gate' || status === 'loading') && (
        <div className="wtetci-fade-up">
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
              {t.gateTitle}
            </h1>
            <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>
              {t.gateBody}
            </p>
          </div>
          <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '380px' }}>
            <div>
              <label style={label}>{t.emailLabel}</label>
              <input type="email" autoComplete="email" className="wtetci-input" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} style={inp} />
            </div>
            {error && <div className="wtetci-fade-in" style={{ fontSize: '13px', color: '#7B2032', padding: '0.7rem 0.9rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{error}</div>}
            <button type="submit" disabled={status === 'loading'} className="wtetci-btn-primary wtetci-cta" style={{ alignSelf: 'flex-start', padding: '0.9rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
              {status === 'loading' ? t.verifyingBtn : t.continueBtn}
            </button>
          </form>
        </div>
      )}

      {status === 'found' && data && (
        <>
          <div className="wtetci-fade-up" style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
              {data.eventName}
            </div>
            <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
              {firstName ? t.hiName(firstName) : t.defaultTitle}
            </h1>
            <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
            <p style={{ fontSize: '14px', color: allDone ? '#3B6B2F' : '#666', lineHeight: '1.8', margin: 0 }}>
              {allDone ? t.allDoneMsg : t.incompleteMsg}
            </p>
          </div>

          {hasTrip && (
            <CheckinTripDetailsSection
              identifier={identifier}
              alreadyCompleted={!!data.tripDetails}
              initialPassengerCount={1}
              maxPassengers={data.maxPassengers || 2}
              onSaved={savedPassengers => setData(prev => ({ ...prev, tripDetails: { ...prev.tripDetails, passengers_list: savedPassengers } }))}
            />
          )}

          {hasWaiver && (
            <CheckinWaiverSection
              waiverText={data.waiverText}
              identifier={identifier}
              waiver={data.waiver}
              carYear={data.carYear}
              carMake={data.carMake}
              carModel={data.carModel}
              maxPassengers={data.maxPassengers || 2}
              onSaved={waiver => setData(prev => ({ ...prev, waiver }))}
            />
          )}

          {hasLunch && (
            <CheckinLunchSection
              key={passengersList.length}
              identifier={identifier}
              lunch={data.lunch}
              lunchOptions={data.lunchOptions}
              lunchCutoff={data.lunchCutoff}
              lunchLocked={data.lunchLocked}
              passengersList={passengersList}
              tripDone={!hasTrip || !!data.tripDetails}
              onSaved={lunch => setData(prev => ({ ...prev, lunch }))}
            />
          )}
        </>
      )}
    </main>
  )
}

export default function CheckinPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <SiteNav links={NAV_LINKS} />
      <Suspense fallback={
        <div style={{ maxWidth: '540px', margin: '0 auto', padding: '7rem 1.5rem 6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#bbb', letterSpacing: '0.08em' }}>Loading…</div>
        </div>
      }>
        <CheckinContent />
      </Suspense>
      <SiteFooter />
      <style>{`
        @keyframes wtetci-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wtetci-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wtetci-pop { 0% { transform: scale(0.9); opacity: 0.6; } 60% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes wtetci-shimmer { 0% { left: -80%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { left: 130%; opacity: 0; } }

        .wtetci-fade-up { animation: wtetci-fade-up 0.55s ease both; }
        .wtetci-fade-in { animation: wtetci-fade-in 0.35s ease both; }

        .wtetci-btn-primary { box-shadow: 0 2px 6px rgba(15,30,20,0.22); transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .wtetci-btn-primary:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 6px rgba(15,30,20,0.22); }
        .wtetci-btn-ghost { transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease; }
        .wtetci-input { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .wtetci-input:focus { border-color: rgba(197,168,130,0.75) !important; box-shadow: 0 0 0 3px rgba(197,168,130,0.18); }
        .wtetci-card { transition: box-shadow 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .wtetci-dish { transition: box-shadow 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
        .wtetci-dish-selected { box-shadow: 0 4px 14px rgba(197,168,130,0.28) !important; }
        .wtetci-pill-pop { animation: wtetci-pop 0.45s ease; }

        .wtetci-cta { position: relative; overflow: hidden; }
        .wtetci-cta::after {
          content: ''; position: absolute; top: -10%; left: -80%; width: 40%; height: 120%;
          background: linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.28) 50%, transparent 90%);
          transform: skewX(-10deg);
          animation: wtetci-shimmer 1s cubic-bezier(0.4,0,0.2,1) 0.6s forwards;
          pointer-events: none;
        }

        @media (hover: hover) {
          .wtetci-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,30,20,0.28); }
          .wtetci-btn-ghost:hover:not(:disabled) { box-shadow: 0 3px 10px rgba(0,0,0,0.08); transform: translateY(-1px); border-color: rgba(0,0,0,0.3); }
          .wtetci-card:hover { box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
          .wtetci-dish:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.07); }
        }
      `}</style>
    </div>
  )
}
