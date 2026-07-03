'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import WtetSectionCard from '../../../components/WtetSectionCard'
import WtetWaiverSection from '../../../components/WtetWaiverSection'
import WtetLunchSection from '../../../components/WtetLunchSection'
import { WTET_WAIVER_TEXT, WTET_WAIVER_TEXT_FR } from '../../../lib/wtetRegistrationContent'
import { WTET_CHECKIN_T } from '../../../lib/wtetCheckinI18n'

const NAV_LINKS = [
  { href: '/',         label: 'Home' },
  { href: '/#events',  label: 'Events' },
  { href: '/#contact', label: 'Contact' },
  { href: '/faq',      label: 'FAQ' },
]

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const label = { display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }

function LangToggle({ lang, setLang }) {
  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, display: 'flex', background: '#0F1E14', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
      {['en', 'fr'].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: '0.45rem 0.75rem', background: lang === l ? '#c5a882' : 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: lang === l ? '#0F1E14' : 'rgba(197,168,130,0.55)', fontWeight: lang === l ? '700' : '400', fontFamily: 'sans-serif', transition: 'all 0.15s ease' }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function emptyPassenger() { return { name: '', age: '' } }

function parsePassengerCount(str) {
  const n = parseInt(str)
  return isNaN(n) ? 1 : Math.max(1, n)
}

// Trip Details — passengers/dietary/WhatsApp.
function TripDetailsSection({ identifier, alreadyCompleted, initialPassengerCount, lang, onSaved }) {
  const t = WTET_CHECKIN_T[lang]
  const [editing, setEditing] = useState(!alreadyCompleted)
  const [dietary, setDietary] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [passengers, setPassengers] = useState(() => Array.from({ length: initialPassengerCount }, emptyPassenger))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function updatePassenger(i, field, val) {
    setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
    setFieldErrors(prev => { const n = { ...prev }; delete n[`p_${i}_${field}`]; return n })
  }
  function addPassenger() { setPassengers(prev => [...prev, emptyPassenger()]) }
  function removePassenger(i) {
    if (passengers.length <= 1) return
    setPassengers(prev => prev.filter((_, idx) => idx !== i))
  }

  function validate() {
    const errs = {}
    passengers.forEach((p, i) => {
      if (!p.name.trim()) errs[`p_${i}_name`] = true
      const ageNum = parseInt(p.age)
      if (!p.age.toString().trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120) errs[`p_${i}_age`] = true
    })
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/wtet-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...identifier,
          dietary:         dietary.trim() || null,
          whatsapp:        whatsapp.trim() || null,
          passengers_list: passengers,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setSubmitError(d.error || t.genericError)
        return
      }
      onSaved()
      setEditing(false)
    } catch {
      setSubmitError(t.networkError)
    } finally {
      setSubmitting(false)
    }
  }

  if (!editing) {
    return (
      <WtetSectionCard title={t.tripTitle} done doneLabel={t.tripDoneLabel} pendingLabel={t.tripPendingLabel}>
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>{t.tripDoneMsg}</div>
      </WtetSectionCard>
    )
  }

  return (
    <WtetSectionCard title={t.tripTitle} done={false} doneLabel={t.tripDoneLabel} pendingLabel={t.tripPendingLabel}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.1rem' }}>
            {t.passengersHeader}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {passengers.map((p, i) => (
              <div key={i} style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fafaf8', padding: '1rem 1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 ? '#c5a882' : '#aaa' }}>
                    {i === 0 ? t.driverLabel : t.passengerLabel(i + 1)}
                  </span>
                  {i > 0 && (
                    <button type="button" onClick={() => removePassenger(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#bbb', padding: '0 2px', fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1 }}>
                      {t.removeBtn}
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.6rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>{t.fullNameLabel}</label>
                    <input type="text" autoComplete={i === 0 ? 'name' : 'off'} value={p.name} onChange={e => updatePassenger(i, 'name', e.target.value)} placeholder={t.fullNameLabel.replace(' *', '')}
                      style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_name`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>{t.ageLabel}</label>
                    <input type="number" min="1" max="120" value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} placeholder="—"
                      style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_age`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }} />
                  </div>
                </div>
                {(fieldErrors[`p_${i}_name`] || fieldErrors[`p_${i}_age`]) && (
                  <div style={{ fontSize: '11px', color: '#d06070', marginTop: '0.4rem' }}>
                    {fieldErrors[`p_${i}_name`] && fieldErrors[`p_${i}_age`] ? t.passengerErrBoth : fieldErrors[`p_${i}_name`] ? t.passengerErrName : t.passengerErrAge}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addPassenger}
            style={{ marginTop: '0.65rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.2)', padding: '0.5rem 1rem', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
            {t.addPassengerBtn}
          </button>
          <p style={{ fontSize: '12px', color: '#bbb', margin: '0.5rem 0 0', lineHeight: '1.6' }}>{t.passengersHint}</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>{t.dietaryLabel}</label>
          <input type="text" value={dietary} onChange={e => setDietary(e.target.value)} placeholder={t.dietaryPlaceholder} style={inp} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>{t.whatsappLabel}</label>
          <input type="tel" autoComplete="tel" inputMode="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder={t.whatsappPlaceholder} style={inp} />
          <p style={{ fontSize: '12px', color: '#aaa', margin: '0.5rem 0 0', lineHeight: '1.6' }}>{t.whatsappHint}</p>
        </div>

        <div style={{ padding: '1rem 1.1rem', background: 'rgba(197,168,130,0.07)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>{t.carPhotoLabel}</div>
          <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.75', margin: 0 }}>
            {t.carPhotoPre} <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B5B2E', textDecoration: 'none', fontWeight: '500' }}>jerry@canvasroutes.com</a> {t.carPhotoPost}
          </p>
        </div>

        {submitError && <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.75rem 1rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{submitError}</div>}

        <button type="submit" disabled={submitting}
          style={{ padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1, alignSelf: 'flex-start' }}>
          {submitting ? t.savingBtn : t.saveTripBtn}
        </button>
      </form>
    </WtetSectionCard>
  )
}

function WtetCheckinContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t') || null

  const [lang, setLang] = useState('en')
  const t = WTET_CHECKIN_T[lang]
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('gate') // gate | loading | found
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Always require the participant to confirm their email — a token in the
  // URL (from the emailed link) is used as an extra cross-check, never a bypass.
  async function verify(e, emailOverride) {
    e?.preventDefault()
    setError(null)
    const targetEmail = (emailOverride ?? email).trim()
    if (!targetEmail || !targetEmail.includes('@')) { setError(t.invalidEmailError); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/wtet-registration/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, ...(token ? { token } : {}) }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || t.genericError); setStatus('gate'); return }
      setData(d)
      setStatus('found')
    } catch {
      setError(t.networkError)
      setStatus('gate')
    }
  }

  // Prefill + auto-submit when arriving with ?email= (handoff from the itinerary
  // gate) so the participant doesn't have to retype what they just entered.
  const autoSubmitted = useRef(false)
  useEffect(() => {
    const prefillEmail = searchParams.get('email')
    if (autoSubmitted.current || !prefillEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(prefillEmail)) return
    autoSubmitted.current = true
    setEmail(prefillEmail)
    verify(null, prefillEmail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const identifier = token ? { token } : { email: data?.email }
  const firstName = data?.name?.trim().split(' ')[0] || ''
  const allDone = data && !!data.alreadyCompleted && !!data.waiver && !!data.lunch
  const waiverText = lang === 'fr' ? WTET_WAIVER_TEXT_FR : WTET_WAIVER_TEXT

  return (
    <>
      <LangToggle lang={lang} setLang={setLang} />
      <main style={{ maxWidth: '620px', margin: '0 auto', padding: '7rem 1.5rem 6rem' }}>

        {(status === 'gate' || status === 'loading') && (
          <>
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
                {t.eyebrow}
              </div>
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
                <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} style={inp} />
              </div>
              {error && <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.7rem 0.9rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{error}</div>}
              <button type="submit" disabled={status === 'loading'} style={{ alignSelf: 'flex-start', padding: '0.9rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
                {status === 'loading' ? t.verifyingBtn : t.continueBtn}
              </button>
            </form>
          </>
        )}

        {status === 'found' && data && (
          <>
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
                {t.dashEyebrow}
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
                {firstName ? t.hiName(firstName) : t.defaultTitle}
              </h1>
              <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
              {allDone ? (
                <p style={{ fontSize: '14px', color: '#3B6B2F', lineHeight: '1.8', margin: 0 }}>{t.allDoneMsgFull}</p>
              ) : (
                <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>{t.incompleteMsg}</p>
              )}
            </div>

            <TripDetailsSection
              identifier={identifier}
              alreadyCompleted={data.alreadyCompleted}
              initialPassengerCount={parsePassengerCount(data.passengers)}
              lang={lang}
              onSaved={() => setData(prev => ({ ...prev, alreadyCompleted: true }))}
            />

            <WtetWaiverSection
              waiverText={waiverText}
              identifier={identifier}
              waiver={data.waiver}
              carYear={data.carYear}
              carMake={data.carMake}
              carModel={data.carModel}
              lang={lang}
              onSaved={waiver => setData(prev => ({ ...prev, waiver }))}
            />

            <WtetLunchSection
              identifier={identifier}
              lunch={data.lunch}
              lunchOptions={data.lunchOptions}
              lunchCutoff={data.lunchCutoff}
              lunchLocked={data.lunchLocked}
              lang={lang}
              onSaved={lunch => setData(prev => ({ ...prev, lunch }))}
            />
          </>
        )}
      </main>
    </>
  )
}

export default function WtetCheckinPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <SiteNav links={NAV_LINKS} />
      <Suspense fallback={
        <div style={{ maxWidth: '540px', margin: '0 auto', padding: '7rem 1.5rem 6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#bbb', letterSpacing: '0.08em' }}>Loading…</div>
        </div>
      }>
        <WtetCheckinContent />
      </Suspense>
      <SiteFooter />
    </div>
  )
}
