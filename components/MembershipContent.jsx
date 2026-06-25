'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SiteFooter from './SiteFooter'
import SiteNav from './SiteNav'
import { loadStripe } from '@stripe/stripe-js/pure'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { User, Mail, Phone, Car, Share2, Calendar } from 'lucide-react'
import { captureException } from '../lib/sentry'

let _stripePromise = null
function getStripe() {
  if (!_stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    _stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return _stripePromise
}

const COUNTRY_CODES = [
  '+1',  '+7',  '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36',
  '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49',
  '+51', '+52', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62',
  '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91',
  '+92', '+94', '+351', '+352', '+353', '+358', '+380', '+420', '+852',
  '+886', '+961', '+962', '+965', '+966', '+968', '+971', '+972', '+973', '+974',
]

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']
const SOURCES = ['Instagram','Facebook','Friend / Word of mouth','Member referral','Google','Other']

const LABEL = { fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }
const BODY  = { fontSize: '14px', lineHeight: '1.85', fontFamily: 'var(--font-inter),sans-serif' }
const SMALL = { fontSize: '13px', letterSpacing: '0.02em', fontFamily: 'var(--font-inter),sans-serif' }

function FadeUp({ children, delay = 0, style, className }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`,
    }}>
      {children}
    </div>
  )
}

function StaggerGrid({ children, style, className }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={style} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div key={i} style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: `opacity 0.7s ease ${i * 0.12}s, transform 0.7s ease ${i * 0.12}s`,
              height: '100%',
            }}>{child}</div>
          ))
        : children}
    </div>
  )
}

const TIER1 = [
  'Priority registration on all Cars & Coffee and member events',
  'First access window on every route — before public spots open',
  'Discount on each Canvas Routes paid event',
  'Members-only events throughout the season',
  '10% off your next route for every member you refer',
  '25% discount at a Canvas Routes partner',
  'Canvas Routes full grain leather keychain',
  'Canvas Routes car perfume — refreshed every 2 months at any event',
]

const TIER2_EXTRA = [
  'First access window on all events — first in before Routes Members and before the public',
  '$50 route credit applied to one of your next two routes after you subscribe',
  'Special discount on each Canvas Routes paid event',
  'Professional car photoshoot on a Canvas Routes route',
  'Exclusive discounts across all Canvas Routes partners',
  'Inner Circle curated members kit — Canvas Routes cap, tshirt, lanyard, and a premium coffee bag, handed to you at your first event',
  'Inner Circle end-of-season closing event — private, not open to the public',
]

const PERKS = [
  { label: 'Leather Keychain', sub: 'Full grain leather. Canvas Routes merchandise. Handed to you at the first Canvas Routes event you attend after your membership is confirmed.', tier: 1 },
  { label: 'Car Perfume', sub: 'Refreshed every 2 months throughout the season, picked up at any Canvas Routes event.', tier: 1 },
  { label: 'Inner Circle Members Kit', sub: 'Canvas Routes cap, tshirt, lanyard, and a premium coffee bag — handed to you at your first event of the season.', tier: 2 },
  { label: 'Car Photoshoot', sub: 'One professional shoot of your car on a Canvas Routes route.', tier: 2 },
]

function CheckoutForm({ formData, honeypot, tier, price, clientSecret, countryCode, onSuccess, onBack }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState(null)
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)
  const [promoError, setPromoError] = useState(null)
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [removingPromo, setRemovingPromo] = useState(false)

  const paymentIntentId = clientSecret?.split('_secret_')[0]
  const originalAmountCents = Math.round(parseFloat(price) * 100) || 0
  const displayPrice = promoApplied
    ? ((promoApplied.discountedAmount ?? 0) / 100).toFixed(2)
    : parseFloat(price).toFixed(2)

  async function handleApplyPromo() {
    if (!promoInput.trim()) return
    setApplyingPromo(true); setPromoError(null)
    try {
      const res = await fetch('/api/stripe/apply-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), paymentIntentId, email: formData.email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPromoError(data.error || 'Invalid promo code.'); return }
      setPromoApplied({ code: promoInput.trim().toUpperCase(), ...data })
      setPromoInput('')
    } catch {
      setPromoError('Could not apply code. Please try again.')
    } finally {
      setApplyingPromo(false)
    }
  }

  async function handleRemovePromo() {
    setRemovingPromo(true)
    try {
      const res = await fetch('/api/stripe/apply-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: true, paymentIntentId, email: formData.email, originalAmount: originalAmountCents }),
      })
      if (res.ok) {
        setPromoApplied(null)
        setPromoError(null)
      } else {
        setPromoError('Could not remove code. Please try again.')
      }
    } catch {
      setPromoError('Could not remove code. Please try again.')
    } finally {
      setRemovingPromo(false)
    }
  }

  const payingRef = useRef(false)
  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements || payingRef.current) return
    payingRef.current = true

    // Block payment if there's a promo code typed but not applied
    if (promoInput.trim()) {
      setError('You have a promo code entered but not applied. Click "Apply" first.')
      payingRef.current = false
      return
    }

    setPaying(true); setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) { setError(submitError.message); setPaying(false); payingRef.current = false; return }

    let confirmError
    try {
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/membership` }, redirect: 'if_required' })
      confirmError = result.error
    } catch (err) {
      setError('Payment could not be processed. Please try again.')
      setPaying(false); payingRef.current = false
      return
    }
    if (confirmError) {
      const expired = confirmError.code === 'payment_intent_unexpected_state' || confirmError.payment_intent?.status === 'canceled'
      setError(expired ? 'Your payment session expired. Please go back and try again.' : confirmError.message)
      setPaying(false); payingRef.current = false
      return
    }

    try {
      const waitlistRes = await fetch('/api/membership-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, phone: formData.phone ? `${countryCode} ${formData.phone}`.trim() : '', termsAccepted: true, paymentIntentId, _hp: honeypot }),
      })
      if (!waitlistRes.ok) {
        // Payment hold is placed — proceed to success even if the DB save failed.
        // The webhook will rescue the Stripe fields; Sentry captures the save failure.
        captureException(new Error(`membership-waitlist POST failed: ${waitlistRes.status}`))
      }
    } catch (waitlistErr) {
      captureException(waitlistErr)
    }

    payingRef.current = false
    onSuccess()
  }

  const TIER_PERKS = {
    'Inner Circle': ['First access window on all events', '$50 route credit on next two routes', 'Special discount on each paid event', 'Inner Circle curated members kit'],
    'Routes Member': ['Priority registration for all events', 'Discount on each paid event', 'Members-only events throughout the season', 'Canvas Routes members kit'],
  }
  const perks = TIER_PERKS[tier] || TIER_PERKS['Routes Member']

  return (
    <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 0, fontFamily: 'var(--font-inter), sans-serif' }}>

      {/* Security header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', fontFamily: 'var(--font-inter),sans-serif' }}>Secure checkout</span>
        </div>
        <span style={{ fontSize: '10px', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.06em' }}>Powered by Stripe</span>
      </div>

      {/* Order summary */}
      <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '1.25rem 0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.3rem', fontFamily: 'var(--font-inter),sans-serif' }}>Canvas Routes · 2026</div>
            <div style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '500', fontFamily: 'var(--font-inter),sans-serif' }}>{tier} Membership</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {promoApplied && (
              <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.25)', textDecoration: 'line-through', fontFamily: 'var(--font-inter),sans-serif' }}>${price} CAD</div>
            )}
            <div style={{ fontSize: '1.8rem', fontWeight: '400', color: '#1a1a1a', lineHeight: 1, fontFamily: 'var(--font-bebas),sans-serif' }}>${displayPrice}</div>
            <div style={{ fontSize: '10px', color: '#aaa', marginTop: '0.2rem', fontFamily: 'var(--font-inter),sans-serif' }}>CAD / season</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {perks.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--font-inter),sans-serif' }}>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Promo code */}
      {promoApplied ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(59,107,47,0.06)', border: '0.5px solid rgba(59,107,47,0.25)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#3B6B2F', fontFamily: 'var(--font-inter),sans-serif', fontWeight: '500' }}>{promoApplied.code}</span>
            <span style={{ fontSize: '11px', color: '#3B6B2F', fontFamily: 'var(--font-inter),sans-serif' }}>
              {promoApplied.percentOff ? `— ${promoApplied.percentOff}% off` : `— $${((promoApplied.amountOff ?? 0) / 100).toFixed(2)} off`}
            </span>
          </div>
          <button type="button" onClick={handleRemovePromo} disabled={removingPromo}
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '11px', cursor: removingPromo ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', padding: '0 0.2rem', transition: 'color 0.15s', opacity: removingPromo ? 0.5 : 1 }}
            onMouseEnter={e => { if (!removingPromo) e.currentTarget.style.color = '#555' }}
            onMouseLeave={e => e.currentTarget.style.color = '#aaa'}>
            {removingPromo ? 'Removing…' : 'Remove'}
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '0' }}>
            <input
              type="text"
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null) }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
              placeholder="Promo code"
              style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '16px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', background: '#fff', border: `0.5px solid ${promoError ? 'rgba(208,96,112,0.6)' : 'rgba(0,0,0,0.15)'}`, borderRight: 'none', WebkitAppearance: 'none', boxSizing: 'border-box', borderRadius: 0, letterSpacing: '0.1em' }}
            />
            <button type="button" onClick={handleApplyPromo}
              disabled={applyingPromo || !promoInput.trim()}
              style={{ padding: '0.65rem 1.1rem', background: promoInput.trim() ? '#0F1E14' : '#f5f5f3', border: `0.5px solid ${promoInput.trim() ? '#0F1E14' : 'rgba(0,0,0,0.15)'}`, color: promoInput.trim() ? '#fff' : '#aaa', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif', cursor: applyingPromo || !promoInput.trim() ? 'default' : 'pointer', opacity: applyingPromo ? 0.5 : 1, flexShrink: 0, fontWeight: '500', transition: 'all 0.15s', borderRadius: 0 }}>
              {applyingPromo ? '…' : 'Apply'}
            </button>
          </div>
          {promoError && <div style={{ fontSize: '11px', color: '#d06070', marginTop: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>{promoError}</div>}
        </div>
      )}

      {/* Stripe payment element */}
      <div style={{ marginBottom: '1.25rem' }}>
        <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'auto', googlePay: 'auto' } }} />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', padding: '0.65rem 0.85rem', background: 'rgba(208,96,112,0.06)', border: '0.5px solid rgba(208,96,112,0.25)', marginBottom: '1rem' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d06070" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: '12px', color: '#d06070', fontFamily: 'var(--font-inter),sans-serif', lineHeight: '1.5' }}>{error}</span>
        </div>
      )}

      {/* Pay button */}
      <button type="submit" disabled={!stripe || paying}
        style={{ width: '100%', padding: '1.05rem', background: paying ? '#2a4f20' : '#0F1E14', border: 'none', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: '600', cursor: paying ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', transition: 'background 0.2s', marginBottom: '0.85rem' }}>
        {paying ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Processing…
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Authorize ${displayPrice} CAD
          </>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Trust line */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '10px', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.04em' }}>
          Your card is held — not charged until we approve your application
        </span>
      </div>

      <button type="button"
        disabled={paying || removingPromo}
        onClick={async () => { if (promoApplied) await handleRemovePromo(); onBack() }}
        style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.3)', fontSize: '11px', letterSpacing: '0.1em', cursor: paying || removingPromo ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', padding: '0.25rem', transition: 'color 0.15s', opacity: paying || removingPromo ? 0.4 : 1 }}
        onMouseEnter={e => { if (!paying && !removingPromo) e.currentTarget.style.color = 'rgba(0,0,0,0.6)' }}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.3)'}>
        ← Back to application
      </button>
    </form>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'1rem', margin:'2.5rem 0 1.75rem' }}>
      <div style={{ fontSize:'10px', letterSpacing:'0.22em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter),sans-serif', whiteSpace:'nowrap' }}>{children}</div>
      <div style={{ flex:1, height:'0.5px', background:'rgba(0,0,0,0.09)' }} />
    </div>
  )
}

function CheckIcon({ gold, green }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke={gold ? '#c5a882' : green ? 'rgba(140,210,120,0.8)' : '#3B6B2F'} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: '3px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const INIT_FORM = { name:'', email:'', phone:'', dob_month:'', dob_day:'', dob_year:'', year:'', carMake:'', carModel:'', carPaint:'', tier:'', source:'', referredBy:'', more:'' }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function MembershipContent() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'ViewContent', { content_name: 'Membership' })
  }, [])

  // Handle Stripe 3DS redirect return — in-app browsers (Instagram/Facebook) may redirect
  // out of the in-app browser for 3DS authentication; on return we restore and finalise.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const piId         = params.get('payment_intent')
    const redirectStatus = params.get('redirect_status')
    if (!piId || redirectStatus !== 'succeeded') return
    window.history.replaceState({}, '', '/membership')
    try {
      const saved = localStorage.getItem('membership_form_pending')
      localStorage.removeItem('membership_form_pending')
      if (saved) {
        const { form: savedForm, countryCode: savedCode } = JSON.parse(saved)
        purchasePriceRef.current = savedForm.tier === 'Inner Circle' ? 249 : 99
        fetch('/api/membership-waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...savedForm,
            phone: savedForm.phone ? `${savedCode} ${savedForm.phone}`.trim() : '',
            termsAccepted: true,
            paymentIntentId: piId,
            _hp: '',
          }),
        }).catch(() => {})
      }
    } catch {}
    setStatus('success')
  }, [])

  const [form, setForm]                   = useState(INIT_FORM)
  const [errors, setErrors]               = useState({})
  const [focusedField, setFocusedField]   = useState(null)
  const [status, setStatus]               = useState(null)
  const [submitError, setSubmitError]     = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [paymentStep, setPaymentStep]     = useState(false)
  const [clientSecret, setClientSecret]   = useState(null)
  const [countryCode, setCountryCode]     = useState('+1')
  const honeypotRef                       = useRef(null)
  const submittingRef                     = useRef(false)
  const purchasePriceRef                  = useRef(null)

  // Fire Purchase pixel event once on payment success
  useEffect(() => {
    if (status !== 'success' || !purchasePriceRef.current) return
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Purchase', { value: purchasePriceRef.current, currency: 'CAD' })
    }
  }, [status])

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: false }))
    if (submitError) setSubmitError(null)
  }

  function capitaliseName(v) {
    return v.replace(/\b\w/g, c => c.toUpperCase())
  }

  function formatPhone(v, code) {
    if (code && code !== '+1') {
      return v.replace(/[^\d\s\-\(\)]/g, '').slice(0, 20)
    }
    let d = v.replace(/\D/g, '')
    if (d.startsWith('1') && d.length > 1) d = d.slice(1)
    d = d.slice(0, 10)
    if (!d) return ''
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  }

  function inp(field) {
    const base = { width:'100%', padding:'0.6rem 0', fontSize:'16px', fontFamily:'var(--font-inter),sans-serif', color:'#1a1a1a', outline:'none', background:'transparent', border:'none', borderBottom:'1px solid rgba(0,0,0,0.12)', WebkitAppearance:'none', MozAppearance:'none', appearance:'none', transition:'border-color 0.2s', boxSizing:'border-box', borderRadius: 0 }
    if (errors[field]) return { ...base, borderBottom:'1px solid rgba(208,96,112,0.8)' }
    if (focusedField === field) return { ...base, borderBottom:'1px solid rgba(15,30,20,0.6)' }
    if (form[field]) return { ...base, borderBottom:'1px solid rgba(15,30,20,0.35)' }
    return base
  }

  function validate() {
    const e = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = true
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true
    if (!form.phone.trim() || form.phone.replace(/\D/g,'').length < (countryCode === '+1' ? 10 : 7)) e.phone = true
    if (!form.dob_month) e.dob_month = true
    if (!form.dob_day) e.dob_day = true
    if (!form.year.trim()) e.year = true
    if (!form.carMake) e.carMake = true
    if (!form.carModel.trim()) e.carModel = true
    if (!form.tier) e.tier = true
    if (!form.source) e.source = true
    if (form.source === 'Member referral' && !form.referredBy.trim()) e.referredBy = true
    if (!termsAccepted) e.termsAccepted = true
    setErrors(e)
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    if (status === 'loading') { submittingRef.current = false; return }
    const errs = validate()
    if (Object.keys(errs).length) {
      const order = ['name','email','phone','dob_month','dob_day','year','carMake','carModel','tier','source','referredBy','termsAccepted']
      const first = order.find(f => errs[f])
      if (first) {
        const scrollTarget = first === 'dob_day' ? 'dob_month' : first
        const el = document.getElementById(`mem-field-${scrollTarget}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      submittingRef.current = false
      return
    }
    setStatus('loading'); setSubmitError(null)
    try {
      const type = form.tier === 'Inner Circle' ? 'membership_inner_circle' : 'membership_routes'
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, email: form.email.trim(), name: form.name.trim(), eventName: form.tier }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to initialise payment.')
      if (!data.clientSecret) throw new Error('Payment could not be initialised. Please try again.')
      try { localStorage.setItem('membership_form_pending', JSON.stringify({ form, countryCode })) } catch {}
      purchasePriceRef.current = form.tier === 'Inner Circle' ? 249 : 99
      setClientSecret(data.clientSecret)  // set before paymentStep so Elements renders with a valid secret
      setPaymentStep(true)
      setStatus(null)
      submittingRef.current = false  // allow re-entry if user goes back
      // Scroll to top of payment form on step change
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
    } catch (err) {
      captureException(err, { context: 'membership-handleSubmit', email: form.email })
      setSubmitError(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <div style={{ background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', minHeight: '100vh' }}>
      <style>{`
        @media(max-width:720px){
          .mem-tiers      { grid-template-columns: 1fr !important; }
          .mem-perks      { grid-template-columns: 1fr 1fr !important; }
          .mem-about      { grid-template-columns: 1fr !important; }
          .mem-about-img  { display: none !important; }
          .mem-steps      { grid-template-columns: 1fr !important; }
          .mem-tier-inner { padding: 1.5rem 1.5rem 0 !important; }
          .mem-tier-body  { padding: 0 1.5rem 1.5rem !important; }
          .mem-photo-break img { object-position: center 20% !important; }
          .mem-car3-grid  { grid-template-columns: 1fr 1fr !important; }
        }
        @media(max-width:580px){
          .mem-tier-btns  { grid-template-columns: 1fr !important; }
        }
        @media(max-width:480px){
          .mem-perks      { grid-template-columns: 1fr !important; }
          .mem-dob-grid   { grid-template-columns: repeat(3,1fr) !important; }
          .mem-car-grid   { grid-template-columns: 1fr !important; }
          .mem-car3-grid  { grid-template-columns: 1fr !important; }
        }
        @media(max-width:768px){
          input, select, textarea { font-size: 16px !important; }
        }
        input::placeholder, textarea::placeholder { color: rgba(0,0,0,0.28); }
      `}</style>

      <SiteNav links={[
        { href: '/',        label: 'Home' },
        { href: '/#events', label: 'Events' },
        { href: '/#contact',label: 'Contact' },
        { href: '/faq',     label: 'FAQ' },
      ]} ctaLabel="Membership" />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src="/membership-hero.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,12,8,0.75) 0%, rgba(6,12,8,0.55) 45%, rgba(6,12,8,0.85) 100%)' }} />
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(140px,18vw,200px) 2rem 5rem', maxWidth: '800px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif', color: '#c5a882', marginBottom: '1.75rem', textShadow: '0 1px 10px rgba(0,0,0,0.8)', opacity: 0, animation: 'memHeroIn 0.9s ease-out 0.2s forwards' }}>
            Canvas Routes · Membership · Season 2026
          </div>
          <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3rem,6vw,5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, marginBottom: '1.5rem', letterSpacing: '-0.01em', textShadow: '0 2px 20px rgba(0,0,0,0.85)', opacity: 0, animation: 'memHeroIn 1s ease-out 0.45s forwards' }}>
            For those who chose<br />their car on purpose.
          </h1>
          <div style={{ width: '32px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.5rem', opacity: 0, animation: 'memHeroIn 0.8s ease-out 0.8s forwards' }} />
          <div style={{ ...LABEL, color: '#c5a882', letterSpacing: '0.28em', textShadow: '0 1px 12px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,0.9)', opacity: 0, animation: 'memHeroIn 0.8s ease-out 1s forwards' }}>
            Season 2026 &nbsp;·&nbsp; Limited spots &nbsp;·&nbsp; Two tiers
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1, opacity: 0, animation: 'memHeroIn 0.8s ease-out 1.3s forwards' }}>
          <span style={{ ...LABEL, color: 'rgba(197,168,130,0.55)' }}>Scroll</span>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.55)" strokeWidth="1.2" strokeLinecap="round" style={{ animation: 'bounce-arrow 1.8s ease-in-out 2.5s infinite' }}>
            <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* ── NOTICE BANNER ───────────────────────────────────────────── */}
      <div style={{ background: 'rgba(197,168,130,0.11)', borderBottom: '0.5px solid rgba(197,168,130,0.25)', padding: '1rem 2rem', textAlign: 'center' }}>
        <span style={{ ...SMALL, color: '#7B5B2E' }}>
          <strong>2026 season — spots are limited.</strong>
          {' '}Every application is reviewed personally.
        </span>
      </div>

      {/* ── ABOUT ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(5rem,8vw,8rem) clamp(1.5rem,5vw,5rem)' }}>
        <div className="mem-about" style={{ maxWidth: '1040px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(3rem,6vw,7rem)', alignItems: 'start' }}>

          <FadeUp>
            <div style={{ ...LABEL, color: '#c5a882', marginBottom: '1.5rem' }}>What membership means</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.15', marginBottom: '1.75rem' }}>
              A season of roads<br />you&apos;ll remember.
            </div>
            <p style={{ ...BODY, color: '#444', marginBottom: '1.75rem' }}>
              Canvas Routes is built around the drive — not the parking lot. Members get priority access to every Cars &amp; Coffee, every route, and every experience on the calendar from June through November.
            </p>
            <a href="#register" onClick={e => { e.preventDefault(); document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' }) }}
              style={{ display: 'inline-block', padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>
              Apply now →
            </a>
          </FadeUp>

          <FadeUp delay={0.15} style={{ display: 'flex', flexDirection: 'column' }} className="mem-about-img">
            <div style={{ overflow: 'hidden', height: 'clamp(240px,30vw,380px)' }}>
              <img src="/events/may9-lineup.jpeg" alt="Canvas Routes" style={{ width: '100%', height: '128%', objectFit: 'cover', objectPosition: 'center top', display: 'block', marginTop: '-12.8%' }} />
            </div>
            <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderTop: 'none' }}>
              {[['Season', 'June — November'], ['Membership', 'Limited spots per season'], ['Events', 'Cars & Coffee · Cruises · Routes']].map(([k, v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', padding: '0.9rem 1.25rem', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <span style={{ ...LABEL, color: '#c5a882', flexShrink: 0 }}>{k}</span>
                  <span style={{ ...SMALL, color: '#1a1a1a', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── PHOTO BREAK 1 ───────────────────────────────────────────── */}
      <div className="mem-photo-break" style={{ position: 'relative', height: 'clamp(260px,36vw,460px)', overflow: 'hidden' }}>
        <img src="/events/may9-cars-row.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      </div>

      {/* ── TIERS ───────────────────────────────────────────────────── */}
      <section style={{ background: '#EDE8E1', padding: 'clamp(5rem,8vw,8rem) clamp(1.5rem,5vw,5rem)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

          <FadeUp style={{ textAlign: 'center', marginBottom: 'clamp(3rem,5vw,5rem)' }}>
            <div style={{ ...LABEL, color: '#c5a882', marginBottom: '0.75rem' }}>2026 Season</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a' }}>Choose your tier</div>
          </FadeUp>

          <div className="mem-tiers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* ROUTES MEMBER */}
            <FadeUp delay={0.05}>
              <div style={{ background: '#1B2F1F', position: 'relative', overflow: 'hidden', height: '100%' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(100,180,80,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div className="mem-tier-inner" style={{ padding: '2.25rem 2.25rem 0' }}>
                  <div style={{ ...LABEL, color: 'rgba(245,241,236,0.45)', marginBottom: '0.5rem' }}>Full Season</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '600', color: '#F5F1EC', marginBottom: '2rem', lineHeight: 1.2, fontFamily: 'var(--font-inter),sans-serif' }}>
                    Routes Member
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: 'clamp(3rem,5.5vw,4.2rem)', fontWeight: '400', color: '#F5F1EC', lineHeight: 1 }}>$99</span>
                    <span style={{ ...SMALL, color: 'rgba(245,241,236,0.55)', paddingBottom: '0.4rem' }}>CAD</span>
                  </div>
                  <div style={{ ...SMALL, color: 'rgba(245,241,236,0.4)', marginBottom: '2rem' }}>per season</div>
                  <div style={{ height: '0.5px', background: 'rgba(245,241,236,0.08)', marginBottom: '1.25rem' }} />
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ ...LABEL, color: 'rgba(245,241,236,0.35)', marginBottom: '0.35rem' }}>What you get</div>
                    <div style={{ ...BODY, color: 'rgba(245,241,236,0.7)' }}>Your seat at every Cars &amp; Coffee, every route, every member event — June through November.</div>
                  </div>
                </div>
                <div className="mem-tier-body" style={{ padding: '0 2.25rem 2.25rem' }}>
                  <div style={{ ...LABEL, color: 'rgba(245,241,236,0.4)', marginBottom: '1.1rem' }}>Includes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {TIER1.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                        <CheckIcon green />
                        <span style={{ ...BODY, color: 'rgba(245,241,236,0.75)' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* INNER CIRCLE */}
            <FadeUp delay={0.15}>
              <div style={{ background: '#0F1E14', position: 'relative', overflow: 'hidden', height: '100%' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(197,168,130,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div className="mem-tier-inner" style={{ padding: '2.25rem 2.25rem 0' }}>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.7)', marginBottom: '0.5rem' }}>Priority Access</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '600', color: '#F5F1EC', marginBottom: '2rem', lineHeight: 1.2, fontFamily: 'var(--font-inter),sans-serif' }}>
                    Inner Circle
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: 'clamp(3rem,5.5vw,4.2rem)', fontWeight: '400', color: '#c5a882', lineHeight: 1 }}>$249</span>
                    <span style={{ ...SMALL, color: 'rgba(197,168,130,0.75)', paddingBottom: '0.4rem' }}>CAD</span>
                  </div>
                  <div style={{ ...SMALL, color: 'rgba(245,241,236,0.4)', marginBottom: '2rem' }}>per season</div>
                  <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.12)', marginBottom: '1.25rem' }} />
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ ...LABEL, color: 'rgba(197,168,130,0.5)', marginBottom: '0.35rem' }}>What you get</div>
                    <div style={{ ...BODY, color: 'rgba(245,241,236,0.75)' }}>First in on everything — before Routes Members and before the public. Includes a $50 route credit applied to one of your next two routes after you subscribe, a special event discount, a professional car photoshoot, and an Inner Circle curated members kit.</div>
                  </div>
                </div>
                <div className="mem-tier-body" style={{ padding: '0 2.25rem 2.25rem' }}>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.8)', marginBottom: '1.1rem' }}><strong>Everything in Routes</strong>, plus</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {TIER2_EXTRA.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                        <CheckIcon gold />
                        <span style={{ ...BODY, color: 'rgba(245,241,236,0.82)' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>

          <FadeUp style={{ textAlign: 'center', marginTop: '1.75rem' }}>
            <span style={{ ...SMALL, color: '#888' }}>Season runs June — November. Inner Circle access extends through December.</span>
          </FadeUp>
        </div>
      </section>

      {/* ── WHAT HAPPENS NEXT ───────────────────────────────────────── */}
      <section style={{ background: '#EDE8E1', padding: 'clamp(4rem,6vw,6rem) clamp(1.5rem,5vw,5rem)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <FadeUp style={{ marginBottom: 'clamp(2.5rem,4vw,4rem)' }}>
            <div style={{ ...LABEL, color: '#c5a882', marginBottom: '0.75rem' }}>After you register</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a' }}>What happens next.</div>
          </FadeUp>
          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(0,0,0,0.07)' }} className="mem-steps">
            {[
              { n: '01', title: 'Register your interest', body: 'Fill in the form below. Tell us about yourself, your car, and the tier you\'re interested in.' },
              { n: '02', title: 'We reach out', body: 'Every application is reviewed personally. We contact you directly to confirm your spot and tier.' },
              { n: '03', title: 'You\'re in', body: 'Complete payment, join the members community, and collect your members kit at your first event of the season.' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#F5F1EC', padding: '2rem 1.75rem', height: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '300', color: 'rgba(197,168,130,0.65)', lineHeight: 1, marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.n}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.65rem', lineHeight: 1.3, fontFamily: 'var(--font-inter),sans-serif' }}>{s.title}</div>
                <div style={{ ...BODY, color: '#666' }}>{s.body}</div>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── REGISTRATION ────────────────────────────────────────────── */}
      <section id="register" style={{ position: 'relative', padding: 'clamp(5rem,8vw,7rem) clamp(1.5rem,5vw,5rem)' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src="/membership-form.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,12,8,0.65) 0%, rgba(10,20,13,0.72) 100%)' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.45),transparent)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '880px', margin: '0 auto' }}>
          <FadeUp style={{ marginBottom: 'clamp(2.5rem,4vw,3.5rem)' }}>
            <div style={{ ...LABEL, color: '#c5a882', marginBottom: '1rem' }}>Founding access</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.1 }}>
              Spots are limited.
            </div>
            <p style={{ ...BODY, color: 'rgba(245,241,236,0.65)' }}>
              The 2026 season has a fixed number of members. Leave your details and we&apos;ll be in touch personally.
            </p>
          </FadeUp>

          <div style={{ background: '#F5F1EC', padding: 'clamp(2rem,4vw,3rem)' }}>
          {status === 'success' ? (
            <FadeUp>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '28px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.25rem' }} />
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>Application received.</div>
                <p style={{ ...BODY, color: '#555', marginBottom: '0.85rem' }}>Your payment has been authorised and held — nothing is charged until your application is reviewed and approved. We go through every application personally.</p>
                <p style={{ ...BODY, color: '#555', marginBottom: '0.85rem' }}>Keep an eye out for an email from <strong style={{ fontWeight: '500', color: '#1a1a1a' }}>jerry@canvasroutes.com</strong> — that&apos;s where you&apos;ll hear back from us.</p>
                <p style={{ ...BODY, color: '#888' }}>It can sometimes land in your junk or spam folder — please check there too.</p>
              </div>
            </FadeUp>
          ) : paymentStep && clientSecret ? (
            <Elements
              stripe={getStripe()}
              fonts={[{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap' }]}
              options={{
                clientSecret,
                appearance: {
                  theme: 'flat',
                  variables: {
                    colorPrimary: '#0F1E14',
                    colorBackground: '#ffffff',
                    colorText: '#1a1a1a',
                    colorTextSecondary: '#888',
                    colorTextPlaceholder: '#bbb',
                    colorDanger: '#d06070',
                    colorIconTab: '#888',
                    colorIconTabSelected: '#0F1E14',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSizeBase: '13px',
                    borderRadius: '0px',
                    spacingUnit: '5px',
                    spacingGridRow: '14px',
                  },
                  rules: {
                    '.Input': {
                      border: '0.5px solid rgba(0,0,0,0.15)',
                      padding: '10px 12px',
                      fontSize: '13px',
                      transition: 'border-color 0.15s',
                    },
                    '.Input:focus': {
                      border: '0.5px solid rgba(15,30,20,0.5)',
                      outline: '0',
                      boxShadow: 'none',
                    },
                    '.Input--invalid': {
                      border: '0.5px solid rgba(208,96,112,0.6)',
                    },
                    '.Label': {
                      fontSize: '9px',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#999',
                      marginBottom: '6px',
                    },
                    '.Tab': {
                      border: '0.5px solid rgba(0,0,0,0.12)',
                      boxShadow: 'none',
                      padding: '8px 12px',
                    },
                    '.Tab:hover': {
                      border: '0.5px solid rgba(0,0,0,0.25)',
                      boxShadow: 'none',
                    },
                    '.Tab--selected': {
                      border: '0.5px solid #0F1E14',
                      boxShadow: 'none',
                      color: '#0F1E14',
                    },
                    '.TabIcon--selected': {
                      fill: '#0F1E14',
                    },
                    '.TabLabel--selected': {
                      color: '#0F1E14',
                    },
                    '.Block': {
                      border: '0.5px solid rgba(0,0,0,0.1)',
                      boxShadow: 'none',
                    },
                  },
                },
              }}
            >
              <CheckoutForm
                formData={{ ...form, termsAccepted }}
                honeypot={honeypotRef.current?.value || ''}
                tier={form.tier}
                price={form.tier === 'Inner Circle' ? '249' : '99'}
                clientSecret={clientSecret}
                countryCode={countryCode}
                onSuccess={() => setStatus('success')}
                onBack={() => { setPaymentStep(false); setClientSecret(null) }}
              />
            </Elements>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <input ref={honeypotRef} type="text" name="_hp" tabIndex={-1} autoComplete="off"
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />

              {/* ── About you ── */}
              <SectionLabel>About you</SectionLabel>

              <div id="mem-field-name" style={{ marginBottom: '1.75rem' }}>
                <label htmlFor="inp-name" style={{ ...LABEL, color: errors.name ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'text' }}>
                  <User size={10} /><span>Full name</span><span style={{ color: '#d06070' }}>*</span>
                </label>
                <input id="inp-name" type="text" name="name" value={form.name} placeholder="First and Last name" autoComplete="name" inputMode="text"
                  aria-invalid={errors.name ? 'true' : 'false'} aria-required="true"
                  onChange={e => set('name', capitaliseName(e.target.value))}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  style={inp('name')} />
              </div>

              <div className="mem-car-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 2rem', marginBottom: '1.75rem' }}>
                <div id="mem-field-email">
                  <label htmlFor="inp-email" style={{ ...LABEL, color: errors.email ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'text' }}>
                    <Mail size={10} /><span>Email</span><span style={{ color: '#d06070' }}>*</span>
                  </label>
                  <input id="inp-email" type="email" name="email" value={form.email} placeholder="your@email.com" autoComplete="email" inputMode="email"
                    aria-invalid={errors.email ? 'true' : 'false'} aria-required="true"
                    onChange={e => set('email', e.target.value)}
                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                    style={inp('email')} />
                </div>
                <div id="mem-field-phone">
                  <label htmlFor="inp-phone" style={{ ...LABEL, color: errors.phone ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'text' }}>
                    <Phone size={10} /><span>Phone</span><span style={{ color: '#d06070' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${errors.phone ? 'rgba(208,96,112,0.8)' : focusedField === 'phone' || focusedField === 'countryCode' ? 'rgba(197,168,130,0.9)' : form.phone ? 'rgba(197,168,130,0.6)' : 'rgba(0,0,0,0.12)'}`, transition: 'border-color 0.2s' }}>
                    <select aria-label="Country code" autoComplete="off" value={countryCode} onChange={e => { setCountryCode(e.target.value); set('phone', '') }}
                      onFocus={() => setFocusedField('countryCode')} onBlur={() => setFocusedField(null)}
                      style={{ padding: '0.6rem 0.2rem 0.6rem 0', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', flexShrink: 0 }}>
                      {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span style={{ color: 'rgba(0,0,0,0.18)', margin: '0 0.5rem', fontSize: '13px', userSelect: 'none' }}>|</span>
                    <input id="inp-phone" type="tel" name="tel" value={form.phone}
                      placeholder={countryCode === '+1' ? '(514) 000-0000' : 'Phone number'}
                      autoComplete="tel-national"
                      aria-invalid={errors.phone ? 'true' : 'false'} aria-required="true"
                      onChange={e => set('phone', formatPhone(e.target.value, countryCode))}
                      onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                      style={{ flex: 1, padding: '0.6rem 0', fontSize: '16px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              <div id="mem-field-dob_month" style={{ marginBottom: '0.5rem' }}>
                <div style={{ ...LABEL, color: (errors.dob_month || errors.dob_day) ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={10} /><span>Date of birth</span><span style={{ color: '#d06070' }}>*</span>
                  <span style={{ color: 'rgba(197,168,130,0.5)', textTransform: 'none', letterSpacing: 0, fontSize: '10px', marginLeft: '4px' }}>year optional</span>
                </div>
                <div className="mem-dob-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '0 1.5rem' }}>
                  {[
                    { field: 'dob_month', placeholder: 'Month', ac: 'bday-month', options: MONTHS.map((m, i) => ({ v: String(i+1), l: m })) },
                    { field: 'dob_day',   placeholder: 'Day',   ac: 'bday-day',   options: Array.from({length:31},(_,i)=>({v:String(i+1),l:String(i+1)})) },
                    { field: 'dob_year',  placeholder: 'Year',  ac: 'bday-year',  options: Array.from({length:2006-1945+1},(_,i)=>({v:String(2006-i),l:String(2006-i)})) },
                  ].map(({ field, placeholder, ac, options }) => (
                    <div key={field} style={{ position: 'relative' }}>
                      <select id={`inp-${field}`} name={ac} autoComplete={ac} aria-label={placeholder} value={form[field]} onChange={e => set(field, e.target.value)}
                        onFocus={() => setFocusedField(field)} onBlur={() => setFocusedField(null)}
                        style={{ ...inp(field), paddingRight: '1.5rem', cursor: 'pointer', width: '100%' }}>
                        <option value="">{placeholder}</option>
                        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                      <svg style={{ position:'absolute', right:'2px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  ))}
                </div>
                {(errors.dob_month || errors.dob_day) && <div style={{ fontSize: '11px', color: '#d06070', marginTop: '0.4rem' }}>Month and day are required</div>}
              </div>

              {/* ── Your car ── */}
              <SectionLabel>Your car</SectionLabel>

              <div className="mem-car3-grid" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.5fr 2fr', gap: '0 2rem', marginBottom: '1.75rem' }}>
                <div id="mem-field-year">
                  <label htmlFor="inp-year" style={{ ...LABEL, color: errors.year ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <Car size={10} /><span>Year</span><span style={{ color: '#d06070' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select id="inp-year" autoComplete="off" aria-required="true" aria-invalid={errors.year ? 'true' : 'false'} value={form.year} onChange={e => set('year', e.target.value)}
                      onFocus={() => setFocusedField('year')} onBlur={() => setFocusedField(null)}
                      style={{ ...inp('year'), paddingRight: '1.5rem', cursor: 'pointer' }}>
                      <option value="">Year</option>
                      {Array.from({length:2027-1940+1},(_,i)=>2027-i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                    <svg style={{ position:'absolute', right:'2px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div id="mem-field-carMake">
                  <label htmlFor="inp-carMake" style={{ ...LABEL, color: errors.carMake ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <Car size={10} /><span>Make</span><span style={{ color: '#d06070' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select id="inp-carMake" autoComplete="off" aria-required="true" aria-invalid={errors.carMake ? 'true' : 'false'} value={form.carMake} onChange={e => set('carMake', e.target.value)}
                      onFocus={() => setFocusedField('carMake')} onBlur={() => setFocusedField(null)}
                      style={{ ...inp('carMake'), paddingRight: '1.5rem', cursor: 'pointer' }}>
                      <option value="">Select make</option>
                      {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <svg style={{ position:'absolute', right:'2px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div id="mem-field-carModel">
                  <label htmlFor="inp-carModel" style={{ ...LABEL, color: errors.carModel ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'text' }}>
                    <Car size={10} /><span>Model</span><span style={{ color: '#d06070' }}>*</span>
                  </label>
                  <input id="inp-carModel" type="text" name="car-model" autoComplete="off" value={form.carModel} placeholder="e.g. 911 Carrera, M3 Competition"
                    aria-required="true" aria-invalid={errors.carModel ? 'true' : 'false'}
                    onChange={e => set('carModel', e.target.value)}
                    onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)}
                    style={inp('carModel')} />
                </div>
              </div>

              <div id="mem-field-carPaint" style={{ marginBottom: '1.75rem' }}>
                <div style={{ ...LABEL, color: '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={10} /><span>Paint</span>
                  <span style={{ fontSize: '9px', letterSpacing: '0.04em', textTransform: 'none', color: '#bbb', fontWeight: '400' }}>optional</span>
                </div>
                <input type="text" autoComplete="off" value={form.carPaint} placeholder="e.g. Nardo Grey, Guards Red, Midnight Blue"
                  onChange={e => set('carPaint', e.target.value)}
                  onFocus={() => setFocusedField('carPaint')} onBlur={() => setFocusedField(null)}
                  style={inp('carPaint')} maxLength={60} />
              </div>

              {/* ── Choose your tier ── */}
              <SectionLabel>Choose your tier</SectionLabel>

              <div id="mem-field-tier" style={{ marginBottom: '0.5rem' }}>
                {errors.tier && <div style={{ fontSize: '11px', color: '#d06070', marginBottom: '0.75rem' }}>Please select a membership tier</div>}
                <div className="mem-tier-btns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  {/* Routes Member */}
                  {(() => {
                    const sel = form.tier === 'Routes Member'
                    return (
                      <button type="button" onClick={() => set('tier', 'Routes Member')} style={{
                        padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative', border: 'none',
                        background: sel ? '#1B2F1F' : '#1e3324',
                        borderLeft: sel ? '2px solid rgba(140,210,120,0.7)' : '2px solid rgba(140,210,120,0.15)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: '#F5F1EC', fontWeight: '500', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '3px' }}>Routes Member</div>
                            <div style={{ fontSize: '11px', color: 'rgba(245,241,236,0.45)', fontFamily: 'var(--font-inter),sans-serif' }}>Events, routes, community &amp; perks</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                            <div style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: '1.9rem', fontWeight: '400', color: sel ? 'rgba(140,210,120,0.9)' : 'rgba(245,241,236,0.5)', lineHeight: 1 }}>$99</div>
                            <div style={{ fontSize: '9px', color: 'rgba(245,241,236,0.3)', letterSpacing: '0.1em', marginTop: '2px' }}>CAD / season</div>
                          </div>
                        </div>
                        {sel && <svg style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(140,210,120,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    )
                  })()}

                  {/* Inner Circle */}
                  {(() => {
                    const sel = form.tier === 'Inner Circle'
                    return (
                      <button type="button" onClick={() => set('tier', 'Inner Circle')} style={{
                        padding: '1.25rem 1.5rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative', border: 'none',
                        background: sel ? '#0F1E14' : '#152318',
                        borderLeft: sel ? '2px solid rgba(140,210,120,0.7)' : '2px solid rgba(197,168,130,0.2)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: sel ? 'rgba(140,210,120,0.9)' : 'rgba(197,168,130,0.8)', fontWeight: '500', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '3px' }}>Inner Circle</div>
                            <div style={{ fontSize: '11px', color: 'rgba(197,168,130,0.4)', fontFamily: 'var(--font-inter),sans-serif' }}>Everything in Routes, plus exclusive access &amp; $70 route credit</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                            <div style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: '1.9rem', fontWeight: '400', color: sel ? 'rgba(140,210,120,0.9)' : 'rgba(197,168,130,0.5)', lineHeight: 1 }}>$249</div>
                            <div style={{ fontSize: '9px', color: 'rgba(197,168,130,0.3)', letterSpacing: '0.1em', marginTop: '2px' }}>CAD / season</div>
                          </div>
                        </div>
                        {sel && <svg style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(140,210,120,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    )
                  })()}

                </div>
              </div>

              {/* ── Final details ── */}
              <SectionLabel>Final details</SectionLabel>

              <div id="mem-field-source" style={{ marginBottom: '1.75rem' }}>
                <div style={{ ...LABEL, color: errors.source ? '#d06070' : '#c5a882', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Share2 size={10} /><span>How did you hear about us</span><span style={{ color: '#d06070' }}>*</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <select id="inp-source" autoComplete="off" aria-required="true" aria-invalid={errors.source ? 'true' : 'false'} value={form.source} onChange={e => { set('source', e.target.value); if (e.target.value !== 'Member referral') setErrors(p => ({ ...p, referredBy: false })) }}
                    onFocus={() => setFocusedField('source')} onBlur={() => setFocusedField(null)}
                    style={{ ...inp('source'), paddingRight: '1.5rem', cursor: 'pointer' }}>
                    <option value="">Select</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <svg style={{ position:'absolute', right:'2px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              {form.source === 'Member referral' && (
                <div id="mem-field-referredBy" style={{ marginBottom: '1.75rem' }}>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.55)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={10} /><span>Referred by</span><span style={{ color: '#c5a882', textTransform: 'none', letterSpacing: 0, fontSize: '11px', marginLeft: '2px' }}>*</span>
                  </div>
                  <input type="text" autoComplete="off" value={form.referredBy} placeholder="Member's name"
                    onChange={e => set('referredBy', capitaliseName(e.target.value))}
                    onFocus={() => setFocusedField('referredBy')} onBlur={() => setFocusedField(null)}
                    style={inp('referredBy')} />
                </div>
              )}

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ ...LABEL, color: '#c5a882', marginBottom: '0.5rem' }}>
                  Tell us about yourself <span style={{ color: 'rgba(197,168,130,0.35)', textTransform: 'none', letterSpacing: 0, fontSize: '10px', marginLeft: '4px' }}>optional</span>
                </div>
                <textarea value={form.more} rows={4} placeholder="Tell us about your car, your driving style, dream routes, hobbies — anything that tells us who you are."
                  onChange={e => set('more', e.target.value)}
                  onFocus={() => setFocusedField('more')} onBlur={() => setFocusedField(null)}
                  style={{ ...inp('more'), resize: 'vertical', minHeight: '80px' }} />
              </div>

              <label id="mem-field-termsAccepted" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '2rem', cursor: 'pointer', padding: errors.termsAccepted ? '0.75rem' : '0', border: errors.termsAccepted ? '0.5px solid rgba(208,96,112,0.4)' : 'none' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setErrors(er => ({ ...er, termsAccepted: false })) }}
                  style={{ accentColor: '#c5a882', width: '13px', height: '13px', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.45)', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.6 }}>
                  I have read and agree to the{' '}
                  <a href="/terms" style={{ color: '#c5a882', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Terms &amp; Conditions</a>
                </span>
              </label>

              {submitError && <div style={{ fontSize: '12px', color: '#d06070', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>{submitError}</div>}

              <button type="submit" disabled={status === 'loading'} style={{
                width: '100%', padding: '1.1rem', background: '#0F1E14',
                border: 'none', color: '#c5a882',
                fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
                fontFamily: 'var(--font-inter),sans-serif', fontWeight: '500',
                cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.5 : 1,
                transition: 'all 0.2s',
              }}>
                {status === 'loading' ? 'Processing…' : `Continue to Payment${form.tier ? ` — $${form.tier === 'Inner Circle' ? '249' : '99'}` : ''}`}
              </button>
            </form>
          )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
