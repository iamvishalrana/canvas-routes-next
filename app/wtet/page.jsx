'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User, Mail, Phone, Car, Users, Share2 } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js/pure'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import SiteFooter from '../../components/SiteFooter'
import FadeUp from '../../components/FadeUp'
import SiteNav from '../../components/SiteNav'
import PageLoader from '../../components/PageLoader'
import { computeTax } from '../../lib/tax'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { routeEventSharedT } from '../../lib/i18n/routeEventShared'
import { wtetT } from '../../lib/i18n/wtet'

const COUNTRY_CODES = [
  '+1',  '+7',  '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36',
  '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49',
  '+51', '+52', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62',
  '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91',
  '+92', '+94', '+351', '+352', '+353', '+358', '+380', '+420', '+852',
  '+886', '+961', '+962', '+965', '+966', '+968', '+971', '+972', '+973', '+974',
]

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

let _stripePromise = null
function getStripe() {
  if (!_stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    _stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return _stripePromise
}

function Chevron() {
  return (
    <svg style={{position:'absolute',right:'8px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ── Stripe payment form ───────────────────────────────────────────────────────

function PaymentForm({ name, email, price, clientSecret, isMember, onSuccess, onBack, onMemberConfirm }) {
  const stripe   = useStripe()
  const elements = useElements()
  const { lang } = useLanguage()
  const t = routeEventSharedT[lang]
  const et = wtetT[lang]
  const [paying, setPaying]         = useState(false)
  const [error,  setError]          = useState(null)
  const payingRef                   = useRef(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoApplying, setPromoApplying] = useState(false)
  const [promoError, setPromoError] = useState(null)
  const [promoResult, setPromoResult] = useState(null) // { discountedAmount, originalAmount, percentOff, amountOff }
  const [removingPromo, setRemovingPromo] = useState(false)

  const paymentIntentId = clientSecret?.split('_secret_')[0]
  const subtotalCents = Math.round(price * 100)
  // apply-promo returns subtotal/gst/qst/tax alongside discountedAmount once a
  // promo is applied — use those exact server-computed figures rather than
  // recomputing tax on a discounted price client-side.
  const taxBreakdown = promoResult
    ? { subtotal: promoResult.subtotal, gst: promoResult.gst, qst: promoResult.qst, total: promoResult.discountedAmount }
    : computeTax(subtotalCents)
  const displayPrice = (taxBreakdown.total / 100).toFixed(2)
  const originalTotal = computeTax(subtotalCents).total
  const fmt = cents => (cents / 100).toFixed(2)

  async function applyPromo() {
    if (!promoInput.trim() || !paymentIntentId) return
    setPromoApplying(true); setPromoError(null)
    try {
      const res = await fetch('/api/stripe/apply-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), paymentIntentId, email }),
      })
      const data = await res.json()
      if (!res.ok) { setPromoError(data.error || t.promoErrorInvalid); return }
      setPromoResult(data)
      setPromoInput('')
      // Instantly update the amount in Elements (including Apple Pay / Google Pay)
      if (elements) await elements.update({ amount: data.discountedAmount })
    } catch { setPromoError(t.promoErrorApply) }
    finally { setPromoApplying(false) }
  }

  async function removePromo() {
    if (!paymentIntentId || removingPromo) return
    setRemovingPromo(true)
    try {
      const res = await fetch('/api/stripe/apply-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: true, paymentIntentId, email }),
      })
      if (res.ok) {
        const original = promoResult?.originalAmount ?? originalTotal
        setPromoResult(null)
        if (elements) await elements.update({ amount: original })
      } else {
        setPromoError(t.promoErrorRemove)
      }
    } catch {
      setPromoError(t.promoErrorRemove)
    } finally {
      setRemovingPromo(false)
    }
  }

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements || payingRef.current) return
    payingRef.current = true

    if (promoInput.trim()) {
      setError(t.promoTypedNotApplied)
      payingRef.current = false
      return
    }

    setPaying(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message)
      setPaying(false); payingRef.current = false
      return
    }

    let confirmError
    try {
      const result = await stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: `${window.location.origin}/wtet?member_pi=${isMember ? paymentIntentId : ''}` }, redirect: 'if_required' })
      confirmError = result.error
    } catch {
      setError(t.paymentErrorGeneric)
      setPaying(false); payingRef.current = false
      return
    }

    if (confirmError) {
      const expired = confirmError.code === 'payment_intent_unexpected_state' || confirmError.payment_intent?.status === 'canceled'
      setError(expired ? t.paymentExpired : confirmError.message)
      setPaying(false); payingRef.current = false
      return
    }

    payingRef.current = false
    if (isMember && onMemberConfirm) onMemberConfirm(paymentIntentId)
    onSuccess()
  }

  return (
    <form onSubmit={handlePay} style={{display:'flex',flexDirection:'column',gap:0}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.45rem'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span style={{fontSize:'10px',letterSpacing:'0.16em',textTransform:'uppercase',color:'#999',fontFamily:'var(--font-inter),sans-serif'}}>{t.secureCheckout}</span>
        </div>
        <span style={{fontSize:'10px',color:'#bbb',fontFamily:'var(--font-inter),sans-serif'}}>{t.poweredByStripe}</span>
      </div>

      {/* Notice */}
      <div style={{padding:'0.75rem 1rem',background:isMember?'rgba(59,107,47,0.06)':'rgba(197,168,130,0.08)',border:`0.5px solid ${isMember?'rgba(59,107,47,0.25)':'rgba(197,168,130,0.3)'}`,marginBottom:'1.5rem'}}>
        <div style={{fontSize:'11px',color:isMember?'#3B6B2F':'#7B5B2E',lineHeight:'1.65',fontFamily:'var(--font-inter),sans-serif'}}>
          {isMember
            ? <><strong style={{fontWeight:'500'}}>{t.memberRateNoticeBold(displayPrice)}</strong> {t.memberRateNoticeRest}</>
            : <><strong style={{fontWeight:'500'}}>{t.howItWorksBold}</strong> {t.howItWorksMid(displayPrice)} <span style={{opacity:0.7}}>{t.howItWorksParen}</span> {t.howItWorksBut} <em>{t.howItWorksNotCharged}</em> {t.howItWorksRest}</>
          }
        </div>
      </div>

      {/* Order summary */}
      <div style={{borderTop:'0.5px solid rgba(0,0,0,0.08)',borderBottom:'0.5px solid rgba(0,0,0,0.08)',padding:'1.25rem 0',marginBottom:'1.25rem'}}>
        <div className="wtet-order-summary" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'1rem',marginBottom:'0.75rem'}}>
          <div>
            <div style={{fontSize:'10px',letterSpacing:'0.2em',textTransform:'uppercase',color:'#c5a882',marginBottom:'0.3rem',fontFamily:'var(--font-inter),sans-serif'}}>{et.orderSummaryDate}</div>
            <div style={{fontSize:'15px',color:'#1a1a1a',fontWeight:'500',fontFamily:'var(--font-inter),sans-serif'}}>Whips to Eastern Townships</div>
            <div style={{fontSize:'12px',color:'#999',marginTop:'0.2rem',fontFamily:'var(--font-inter),sans-serif',wordBreak:'break-all'}}>{email}</div>
          </div>
          <div className="wtet-order-price" style={{textAlign:'right',flexShrink:0}}>
            {promoResult ? (
              <>
                <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'1.1rem',fontWeight:'400',color:'#bbb',lineHeight:1,letterSpacing:'0.03em',textDecoration:'line-through'}}>${fmt(originalTotal)}</div>
                <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'1.8rem',fontWeight:'400',color:'#3B6B2F',lineHeight:1,letterSpacing:'0.03em'}}>${displayPrice}</div>
              </>
            ) : (
              <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'1.8rem',fontWeight:'400',color:'#1a1a1a',lineHeight:1,letterSpacing:'0.03em'}}>${displayPrice}</div>
            )}
            <div style={{fontSize:'10px',color:'#aaa',marginTop:'0.2rem',fontFamily:'var(--font-inter),sans-serif'}}>{t.cadPerCarUpTo2}</div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.2rem',padding:'0.65rem 0',marginBottom:'0.6rem',borderTop:'0.5px solid rgba(0,0,0,0.06)',fontFamily:'var(--font-inter),sans-serif'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#888'}}><span>{t.subtotalLabel}</span><span>${fmt(taxBreakdown.subtotal)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#888'}}><span>{t.gstLabel}</span><span>${fmt(taxBreakdown.gst)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#888'}}><span>{t.qstLabel}</span><span>${fmt(taxBreakdown.qst)}</span></div>
        </div>
        {et.orderSummaryIncludes.map((item, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.3rem'}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{fontSize:'11px',color:'#666',fontFamily:'var(--font-inter),sans-serif'}}>{item}</span>
          </div>
        ))}
      </div>

      {/* Promo code */}
      <div style={{marginBottom:'1.25rem'}}>
        {promoResult ? (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.65rem 0.9rem',background:'rgba(59,107,47,0.06)',border:'0.5px solid rgba(59,107,47,0.25)'}}>
            <div>
              <div style={{fontSize:'11px',color:'#3B6B2F',fontWeight:'500',fontFamily:'var(--font-inter),sans-serif'}}>
                ✓ {t.promoApplied(promoResult.percentOff, promoResult.percentOff == null ? (promoResult.amountOff/100).toFixed(2) : null)}
              </div>
              <div style={{fontSize:'11px',color:'#888',marginTop:'1px',fontFamily:'var(--font-inter),sans-serif'}}>
                ${fmt(originalTotal)} → ${displayPrice} CAD
              </div>
            </div>
            <button type="button" onClick={removePromo} disabled={removingPromo} style={{background:'none',border:'none',fontSize:'11px',color:'#aaa',cursor:removingPromo?'wait':'pointer',fontFamily:'var(--font-inter),sans-serif',textDecoration:'underline',textUnderlineOffset:'2px',padding:0,opacity:removingPromo?0.6:1}}>
              {removingPromo ? t.promoRemoving : t.promoRemove}
            </button>
          </div>
        ) : (
          <div style={{display:'flex',gap:'0.5rem'}}>
            <input
              type="text"
              placeholder={t.promoPlaceholder}
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setPromoError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyPromo() } }}
              maxLength={32}
              style={{flex:1,padding:'0.75rem 1rem',border:'1px solid rgba(0,0,0,0.18)',background:'#fff',fontSize:'13px',fontFamily:'var(--font-inter),sans-serif',color:'#1a1a1a',outline:'none',letterSpacing:'0.06em'}}
            />
            <button type="button" onClick={applyPromo} disabled={promoApplying || !promoInput.trim()}
              style={{padding:'0.75rem 1.25rem',background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.18)',fontSize:'11px',letterSpacing:'0.12em',textTransform:'uppercase',color:'#555',cursor:promoApplying||!promoInput.trim()?'not-allowed':'pointer',fontFamily:'var(--font-inter),sans-serif',opacity:promoApplying||!promoInput.trim()?0.5:1,whiteSpace:'nowrap'}}>
              {promoApplying ? '…' : t.promoApply}
            </button>
          </div>
        )}
        {promoError && (
          <div style={{fontSize:'11px',color:'#d06070',marginTop:'0.4rem',fontFamily:'var(--font-inter),sans-serif'}}>{promoError}</div>
        )}
      </div>

      {/* Stripe PaymentElement */}
      <div style={{marginBottom:'1.25rem'}}>
        <PaymentElement options={{layout:'tabs', wallets:{applePay:'auto', googlePay:'auto'}}} />
      </div>

      {error && (
        <div style={{display:'flex',alignItems:'flex-start',gap:'0.4rem',padding:'0.65rem 0.85rem',background:'rgba(208,96,112,0.06)',border:'0.5px solid rgba(208,96,112,0.25)',marginBottom:'1rem'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d06070" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,marginTop:'1px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{fontSize:'12px',color:'#d06070',fontFamily:'var(--font-inter),sans-serif',lineHeight:'1.5'}}>{error}</span>
        </div>
      )}

      <button type="submit" disabled={!stripe || paying}
        style={{width:'100%',padding:'1.05rem',background:paying?'rgba(15,30,20,0.5)':'#0F1E14',border:'none',color:'#c5a882',fontSize:'11px',letterSpacing:'0.22em',textTransform:'uppercase',fontWeight:'700',cursor:paying?'wait':'pointer',fontFamily:'var(--font-inter),sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.6rem',transition:'background 0.2s',marginBottom:'0.85rem'}}>
        {paying ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            {t.payProcessing}
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {t.payButton(isMember ? t.payVerbPay : t.payVerbAuthorize, displayPrice)}
          </>
        )}
      </button>

      <button type="button" onClick={onBack} disabled={paying}
        style={{background:'none',border:'none',padding:'0.5rem',fontSize:'11px',color:'#aaa',cursor:paying?'not-allowed':'pointer',fontFamily:'var(--font-inter),sans-serif',textDecoration:'underline',textDecorationColor:'rgba(0,0,0,0.15)',textUnderlineOffset:'2px'}}>
        {t.backToForm}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WtetPage() {
  const { lang } = useLanguage()
  const t = routeEventSharedT[lang]
  const et = wtetT[lang]
  const [form, setForm] = useState({ name:'', email:'', phone:'', dob_month:'', dob_day:'', dob_year:'', year:'', carMake:'', carModel:'', passengers:'', hasChildren:'', childrenAges:'', source:'', more:'', isMember:'' })
  const [errors, setErrors]           = useState({})
  const [phoneOptOut, setPhoneOptOut] = useState(false)
  const [countryCode, setCountryCode] = useState('+1')
  const [status, setStatus]           = useState(null) // null | 'loading' | 'payment' | 'success' | 'error'
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [regOpen, setRegOpen]         = useState(true)
  const [memberRegOpen, setMemberRegOpen] = useState(true)
  const [closedMsg, setClosedMsg]     = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [countdown, setCountdown]     = useState(null)
  const [memberProfile, setMemberProfile] = useState(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const wasMemberRef = useRef(false) // tracks if the payment step was entered as a member
  const honeypotRef = useRef(null)

  // Meta Pixel — ViewContent on page load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', { content_name: 'WTET Registration', content_category: 'Road Trip', currency: 'CAD' })
    }
  }, [])

  // Meta Pixel — InitiateCheckout when payment step opens, Purchase on success
  useEffect(() => {
    if (!window.fbq) return
    if (status === 'payment') {
      window.fbq('track', 'InitiateCheckout', { value: wasMemberRef.current ? 179 : 199, currency: 'CAD', num_items: 1 })
    }
    if (status === 'success') {
      window.fbq('track', 'Purchase', { value: wasMemberRef.current ? 179 : 199, currency: 'CAD' })
    }
  }, [status])

  useEffect(() => {
    const EVENT = new Date('2026-07-05T12:00:00Z') // 8 AM EDT
    function tick() {
      const diff = EVENT - new Date()
      if (diff <= 0) { setCountdown(null); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown({ d, h, m, s })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // Read registration status from the events table (toggled via admin Events → Reg toggle)
    fetch('/api/public/events')
      .then(r => r.ok ? r.json() : [])
      .then(events => {
        const ev = events.find(e => e.name?.toLowerCase().includes('eastern townships'))
        if (ev) {
          if (ev.registration_enabled === false) setMemberRegOpen(false)
          if (ev.public_registration_enabled === false) setRegOpen(false)
        }
      })
      .catch(() => {})
  }, [])

  // Handle Stripe redirect return (3DS auth) — detect payment_intent params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const piId           = params.get('payment_intent')
    const piSecret       = params.get('payment_intent_client_secret')
    const redirectStatus = params.get('redirect_status')
    if (!piId) return
    window.history.replaceState({}, '', '/wtet')
    if (redirectStatus === 'succeeded') {
      // member_pi is encoded in the return_url so it survives in-app browser context switches
      const memberPiParam = params.get('member_pi')
      if (memberPiParam === piId) {
        wasMemberRef.current = true
        // Member confirmation email was never sent (redirect interrupted the normal flow) — send now
        const doConfirm3ds = () => fetch('/api/wtet-member-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: piId }),
        }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`) })
        doConfirm3ds().catch(() => setTimeout(() =>
          doConfirm3ds().catch(err =>
            import('@sentry/nextjs').then(S => S.captureException(err, { tags: { context: 'wtet-member-confirm-3ds-redirect', piId } })).catch(() => {})
          ), 4000
        ))
      }
      if (piSecret) setClientSecret(piSecret)
      setStatus('success')
    } else if (redirectStatus === 'failed') {
      setServerError(t.paymentNotCompleted)
      setStatus('error')
    }
  }, [])

  // Detect logged-in members and pre-fill their details
  useEffect(() => {
    fetch('/api/member/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.member) return
        const m = data.member
        const email = data.user?.email || ''
        setMemberProfile({ name: m.name || '', email })
        setForm(f => ({
          ...f,
          isMember: 'yes',
          name:     m.name     || f.name,
          email:    email      || f.email,
          year:     m.car_year || f.year,
          carMake:  m.car_make || f.carMake,
          carModel: m.car_model
            ? m.car_model.replace(new RegExp(`^${(m.car_make || '').trim()}\\s*`, 'i'), '').trim()
            : f.carModel,
        }))
        fetch('/api/wtet-member-register')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.alreadyRegistered) setAlreadyRegistered(true) })
          .catch(() => {})
      })
      .catch(() => {})
  }, [])

  function updateForm(field, value) {
    if (field === 'carModel') value = value.replace(/(^|\s)\S/g, c => c.toUpperCase())
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'hasChildren' && value === 'no') next.childrenAges = ''
      return next
    })
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }))
    if (serverError) setServerError(null)
  }

  function formatPhone(v, code) {
    const c = code !== undefined ? code : countryCode
    if (c === '+1') {
      const d = v.replace(/\D/g,'').slice(0,10)
      if (d.length <= 3) return d
      if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`
      return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
    }
    return v.replace(/[^\d\s\-()]/g,'').slice(0,20)
  }

  function inputStyle(field) {
    const isFocused = focusedField === field, hasError = !!errors[field], hasValue = !!form[field]
    let border, background, boxShadow
    if (hasError)       { border='1px solid #93333E'; background='rgba(147,51,62,0.04)'; boxShadow='none' }
    else if (hasValue)  { border='1px solid #3B6B2F'; background='rgba(59,107,47,0.05)'; boxShadow='none' }
    else if (isFocused) { border='1px solid #c5a882'; background='transparent'; boxShadow='0 0 0 3px rgba(197,168,130,0.2)' }
    else                { border='1px solid rgba(0,0,0,0.2)'; background='transparent'; boxShadow='none' }
    return { width:'100%', padding:'0.9rem 1.2rem', border, background, boxShadow, fontSize:'13px', fontFamily:'var(--font-inter),sans-serif', outline:'none', color:'#1a1a1a', transition:'border-color 0.2s, box-shadow 0.2s, background 0.2s', WebkitAppearance:'none', MozAppearance:'none', appearance:'none' }
  }

  const price = form.isMember === 'yes' ? 179 : 199

  function validate() {
    const e = {}
    if (memberProfile) {
      // Logged-in member: only validate car + trip fields
      if (!form.year)               e.year        = true
      if (!form.carMake)            e.carMake     = true
      if (!form.carModel.trim())    e.carModel    = true
      if (!form.passengers)         e.passengers  = true
      if (!form.hasChildren)        e.hasChildren = true
      if (form.hasChildren === 'yes' && !form.childrenAges.trim()) e.childrenAges = true

    } else {
      if (!form.isMember) e.isMember = true
      if (form.isMember !== 'yes') {
        if (form.name.trim().length < 2) e.name = true
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true
        if (!phoneOptOut && (!form.phone.trim() || form.phone.replace(/\D/g,'').length < (countryCode === '+1' ? 10 : 6))) e.phone = true
        if (!form.dob_month) e.dob_month = true
        if (!form.dob_day)   e.dob_day   = true
        if (!form.year)      e.year      = true
        if (!form.carMake)   e.carMake   = true
        if (!form.carModel.trim()) e.carModel = true
        if (!form.passengers)  e.passengers  = true
        if (!form.hasChildren) e.hasChildren = true
        if (form.hasChildren === 'yes' && !form.childrenAges.trim()) e.childrenAges = true
        if (!form.source) e.source = true
      }
    }
    setErrors(e)
    return e
  }

  async function handleSubmit() {
    if (status === 'loading') return
    // Non-logged-in user who clicked "Member rate" → redirect to login
    if (form.isMember === 'yes' && !memberProfile) return
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      const order = memberProfile
        ? ['year','carMake','carModel','passengers','hasChildren','childrenAges']
        : ['isMember','name','email','phone','dob_month','dob_day','year','carMake','carModel','passengers','hasChildren','childrenAges','source']
      const first = order.find(f => errs[f])
      if (first) document.getElementById(`field-${first}`)?.scrollIntoView({ behavior:'smooth', block:'center' })
      return
    }

    setStatus('loading')
    setServerError(null)

    if (memberProfile) {
      // Logged-in member — immediate charge via member API
      const memberController = new AbortController()
      const memberTimeout = setTimeout(() => memberController.abort(), 30000)
      try {
        const res = await fetch('/api/wtet-member-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            carYear:       form.year,
            carMake:       form.carMake,
            carModel:      form.carModel,
            passengers:    form.passengers,
            hasChildren:   form.hasChildren,
            childrenAges:  form.childrenAges,
            more:          form.more,
          }),
          signal: memberController.signal,
        })
        clearTimeout(memberTimeout)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = res.status === 401
            ? t.sessionExpired
            : data.error || t.somethingWrong
          setServerError(msg); setStatus('error'); return
        }
        wasMemberRef.current = true
        setClientSecret(data.clientSecret)
        setStatus('payment')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (err) {
        clearTimeout(memberTimeout)
        setServerError(err?.name === 'AbortError' ? t.requestTimedOut : t.somethingWrong)
        setStatus('error')
      }
      return
    }

    // Non-member — authorization hold
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch('/api/wtet-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone ? `${countryCode} ${form.phone}`.trim() : '',
          dob: `${form.dob_year || '0000'}-${String(form.dob_month).padStart(2,'0')}-${String(form.dob_day).padStart(2,'0')}`,
          isMember: false,
          _hp: honeypotRef.current?.value || '',
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setServerError(data.error || t.somethingWrong); setStatus('error'); return }
      if (!data.clientSecret) { setServerError(t.somethingWrong); setStatus('error'); return }
      wasMemberRef.current = false
      setClientSecret(data.clientSecret)
      setStatus('payment')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      clearTimeout(timeout)
      setServerError(err?.name === 'AbortError' ? t.requestTimedOut : t.somethingWrong)
      setStatus('error')
    }
  }

  const effectiveRegOpen = memberProfile ? memberRegOpen : regOpen
  const showForm = effectiveRegOpen && status !== 'success' && status !== 'payment'

  return (
    <div style={{background:'#F5F1EC',fontFamily:'var(--font-inter),sans-serif',color:'#1a1a1a',minHeight:'100vh'}}>
      <PageLoader images={['/wtet.png']} minMs={2000} />
      <style>{`
        /* ── Hero entrance animations ── */
        @keyframes wtet-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wtet-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Date badge – periodic golden streak (same pattern as tier-badge-shimmer) ── */
        @keyframes wtet-date-streak {
          0%, 100% { left: -110%; opacity: 0; }
          6%        { opacity: 1; }
          20%       { left: 130%; opacity: 0; }
          21%, 99%  { left: -110%; opacity: 0; }
        }
        .wtet-date-badge {
          position: relative;
          overflow: hidden;
        }
        .wtet-date-badge::after {
          content: '';
          position: absolute;
          top: -20%; left: -110%;
          width: 55%; height: 140%;
          background: linear-gradient(105deg, transparent 15%, rgba(255,215,100,0.22) 50%, transparent 85%);
          transform: skewX(-12deg);
          animation: wtet-date-streak 4.5s ease-in-out 1.6s infinite;
          pointer-events: none;
        }

        /* ── Hero CTA – one-time shimmer sweep on load (same pattern as shimmer-card) ── */
        @keyframes wtet-cta-shimmer {
          0%   { left: -80%; opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 130%; opacity: 0; }
        }
        .wtet-hero-cta {
          position: relative;
          overflow: hidden;
        }
        .wtet-hero-cta::after {
          content: '';
          position: absolute;
          top: -10%; left: -80%;
          width: 40%; height: 120%;
          background: linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.28) 50%, transparent 90%);
          transform: skewX(-10deg);
          animation: wtet-cta-shimmer 0.9s cubic-bezier(0.4,0,0.2,1) 1.4s forwards;
          pointer-events: none;
        }

        /* ── Prevent iOS input zoom (font-size must be ≥16px) ── */
        input, select, textarea { font-size: 16px !important; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .wtet-hero    { padding: clamp(100px,14vw,160px) 1.25rem 3.5rem !important; background-position: center 30% !important; }
          .wtet-hero-overlay { background: linear-gradient(to bottom, rgba(8,16,10,0.5) 0%, rgba(8,16,10,0.82) 100%) !important; }
          .wtet-details { padding: 3rem 1.25rem !important; }
          .wtet-itinerary  { padding: 3.5rem 1.25rem 4.5rem !important; }
          .wtet-form-section { padding: 2.5rem 1.25rem 4.5rem !important; }
          .wtet-details-cta { display: block !important; text-align: center !important; }

          /* Stats */
          .wtet-stats-bar  { flex-wrap: wrap !important; gap: 0 !important; padding: 1.25rem 0.5rem !important; justify-content: center !important; }
          .wtet-stats-bar .stat-divider { display: none !important; }
          .wtet-stat       { flex: 0 0 33.333% !important; padding: 0.75rem 0.25rem !important; }

          /* Grids */
          .incl-grid       { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .wtet-price-row  { flex-direction: column !important; gap: 0.75rem !important; }
          .wtet-price-row .price-divider { display: none !important; }
          .wtet-member-grid { grid-template-columns: 1fr 1fr !important; }
          .reg-box-row     { flex-direction: column !important; gap: 0.25rem !important; }

          /* Hero CTA full-width */
          .wtet-hero-cta   { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }

          /* Itinerary stop items */
          .wtet-stop       { gap: 1rem !important; padding: 1.25rem 0 !important; }
        }
        @media (max-width: 480px) {
          /* Countdown */
          .wtet-countdown      { gap: 0 !important; }
          .wtet-countdown-cell { padding: 0.65rem 0.75rem !important; min-width: 52px !important; }
          .wtet-countdown-num  { font-size: 1.8rem !important; }

          /* Stats — 2 per row */
          .wtet-stat { flex: 0 0 50% !important; }

          /* Member selector — single column on very small screens */
          .wtet-member-grid { grid-template-columns: 1fr !important; }

          /* Form rows */
          .join-form-row { flex-direction: column !important; }

          /* DOB — stack month+day+year nicely */
          .wtet-dob-grid { grid-template-columns: 1fr 1fr !important; }
          .wtet-dob-year { grid-column: 1 / -1 !important; }

          /* Payment notice and order summary */
          .wtet-order-summary { flex-direction: column !important; gap: 0.75rem !important; }
          .wtet-order-price   { text-align: left !important; }
        }
      `}</style>

      <SiteNav showLangToggle />

      {/* HERO */}
      <section className="wtet-hero" style={{backgroundColor:'#0F1E14',padding:'clamp(140px,18vw,210px) 3rem 6rem',textAlign:'center',position:'relative',overflow:'hidden',backgroundImage:"url('/wtet.png')",backgroundSize:'cover',backgroundPosition:'center 50%'}}>
        <div className="wtet-hero-overlay" style={{position:'absolute',inset:0,background:'rgba(10,20,12,0.72)',zIndex:1}} />
        <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)',zIndex:2}} />
        <div style={{position:'relative',zIndex:2,fontSize:'11px',letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(197,168,130,0.6)',marginBottom:'1.2rem',animation:'wtet-fade-in 0.7s ease both',animationDelay:'100ms'}}>{et.heroEyebrow}</div>
        <div style={{position:'relative',zIndex:2}}>
          <h1 style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(3rem,7vw,5.5rem)',fontWeight:'300',color:'#F5F1EC',lineHeight:'1.05',marginBottom:'0.75rem',letterSpacing:'-0.01em',animation:'wtet-fade-up 0.8s ease both',animationDelay:'250ms'}}>
            Whips to Eastern Townships
          </h1>
          <div style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(1.2rem,2.8vw,1.55rem)',fontStyle:'italic',color:'rgba(245,241,236,0.82)',marginBottom:'1.2rem',letterSpacing:'0.01em',textShadow:'0 1px 12px rgba(0,0,0,0.6)',animation:'wtet-fade-up 0.7s ease both',animationDelay:'450ms'}}>
            {et.heroDestination}
          </div>
          <div className="wtet-date-badge" style={{display:'inline-block',padding:'0.5rem 1.4rem',border:'1px solid rgba(197,168,130,0.7)',background:'rgba(197,168,130,0.12)',fontSize:'11px',letterSpacing:'0.22em',textTransform:'uppercase',color:'#F5F1EC',marginBottom:'2.5rem',animation:'wtet-fade-in 0.6s ease both',animationDelay:'600ms'}}>
            {et.heroDateBadge}
          </div>
          <div style={{width:'40px',height:'0.5px',background:'rgba(197,168,130,0.5)',margin:'0 auto 2.5rem',animation:'wtet-fade-in 0.5s ease both',animationDelay:'700ms'}} />
          <p style={{fontSize:'15px',color:'rgba(245,241,236,0.55)',maxWidth:'460px',margin:'0 auto 3rem',lineHeight:'1.9',letterSpacing:'0.01em',animation:'wtet-fade-up 0.7s ease both',animationDelay:'800ms'}}>
            {et.heroBody}
          </p>

          {/* Countdown */}
          {countdown && (
            <div className="wtet-countdown" style={{display:'inline-flex',gap:'0',marginBottom:'3rem',border:'0.5px solid rgba(197,168,130,0.2)',overflow:'hidden',animation:'wtet-fade-in 0.6s ease both',animationDelay:'950ms'}}>
              {[
                { label: et.countdownDays,    val: countdown.d },
                { label: et.countdownHours,   val: countdown.h },
                { label: et.countdownMinutes, val: countdown.m },
                { label: et.countdownSeconds, val: countdown.s },
              ].map(({ label, val }, i) => (
                <div key={label} className="wtet-countdown-cell" style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'1rem 1.4rem',borderRight: i < 3 ? '0.5px solid rgba(197,168,130,0.15)' : 'none',minWidth:'72px'}}>
                  <div className="wtet-countdown-num" style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'2.8rem',fontWeight:'400',color:'#F5F1EC',lineHeight:1,letterSpacing:'0.05em'}}>{String(val).padStart(2,'0')}</div>
                  <div style={{fontSize:'8px',letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(197,168,130,0.5)',marginTop:'0.4rem',fontFamily:'var(--font-inter),sans-serif'}}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{animation:'wtet-fade-up 0.65s ease both',animationDelay:'1100ms'}}>
            <a href="#form" className="wtet-hero-cta" onClick={e => { e.preventDefault(); document.getElementById('form')?.scrollIntoView({ behavior:'smooth' }) }}
              style={{display:'inline-block',padding:'0.9rem 2.5rem',background:'#F5F1EC',color:'#0F1E14',fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',textDecoration:'none',fontFamily:'var(--font-inter),sans-serif',fontWeight:'600'}}>
              {t.secureYourSeatCta}
            </a>
          </div>
        </div>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)',zIndex:2}} />
      </section>

      {/* STATS BAR */}
      <div style={{background:'#F5F1EC',borderBottom:'0.5px solid rgba(0,0,0,0.07)'}}>
        <div className="wtet-stats-bar" style={{maxWidth:'860px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',gap:'0',padding:'1.5rem 3rem'}}>
          {et.stats.map(({ num, unit }, i, arr) => (
            <React.Fragment key={unit}>
              <div className="wtet-stat" style={{textAlign:'center',padding:'0 2rem'}}>
                <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'2.4rem',fontWeight:'400',color:'#1a1a1a',lineHeight:1,letterSpacing:'0.04em'}}>{num}</div>
                <div style={{fontSize:'9px',letterSpacing:'0.2em',textTransform:'uppercase',color:'#aaa',marginTop:'4px',fontFamily:'var(--font-inter),sans-serif'}}>{unit}</div>
              </div>
              {i < arr.length - 1 && <div className="stat-divider" style={{width:'1px',height:'32px',background:'rgba(0,0,0,0.1)',flexShrink:0}} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* DETAILS */}
      <section className="wtet-details" style={{background:'#EDE8E1',padding:'5rem 3rem'}}>
        <div style={{maxWidth:'680px',margin:'0 auto'}}>
          <FadeUp>
          <div style={{fontSize:'11px',letterSpacing:'0.22em',textTransform:'uppercase',color:'#888',marginBottom:'2rem'}}>{t.pricingAndDetails}</div>
          <div style={{border:'0.5px solid rgba(0,0,0,0.12)',padding:'1.8rem',marginBottom:'1.5rem',background:'#F5F1EC'}}>
            <div className="wtet-price-row" style={{display:'flex',alignItems:'baseline',gap:'2rem',flexWrap:'wrap'}}>
              <div style={{display:'flex',flexDirection:'column',gap:'0.2rem'}}>
                <div style={{fontSize:'10px',letterSpacing:'0.18em',textTransform:'uppercase',color:'#c5a882',fontFamily:'var(--font-inter),sans-serif'}}>{t.priceMembersLabel}</div>
                <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'3rem',fontWeight:'400',color:'#1a1a1a',lineHeight:'1',letterSpacing:'0.03em'}}>$179</div>
              </div>
              <div className="price-divider" style={{width:'1px',height:'52px',background:'rgba(0,0,0,0.1)',alignSelf:'center'}} />
              <div style={{display:'flex',flexDirection:'column',gap:'0.2rem'}}>
                <div style={{fontSize:'10px',letterSpacing:'0.18em',textTransform:'uppercase',color:'#888',fontFamily:'var(--font-inter),sans-serif'}}>{t.priceNonMembersLabel}</div>
                <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'3rem',fontWeight:'400',color:'#1a1a1a',lineHeight:'1',letterSpacing:'0.03em'}}>$199</div>
              </div>
            </div>
            <div style={{borderTop:'0.5px solid rgba(0,0,0,0.1)',marginTop:'1rem',paddingTop:'0.75rem',textAlign:'center',fontSize:'12px',color:'#aaa',fontFamily:'var(--font-inter),sans-serif',letterSpacing:'0.04em'}}>{t.perCarUpTo2PlusTax}</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'1rem',marginBottom:'1.5rem'}}>
            {et.routeNotes.map((note, i) => (
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'0.75rem'}}>
                <div style={{width:'3px',height:'3px',borderRadius:'50%',background:'#c5a882',flexShrink:0,marginTop:'9px'}} />
                <span style={{fontSize:'14px',color:'#555',lineHeight:'1.75'}}>{note}</span>
              </div>
            ))}
          </div>

          {/* Michelin highlight */}
          <div style={{borderLeft:'2px solid #c5a882',padding:'1rem 1.25rem',background:'rgba(197,168,130,0.06)',marginBottom:'2.5rem'}}>
            <div style={{fontSize:'9px',letterSpacing:'0.22em',textTransform:'uppercase',color:'#c5a882',fontFamily:'var(--font-inter),sans-serif',marginBottom:'0.5rem'}}>{et.finishLabel}</div>
            <p style={{margin:0,fontSize:'14px',color:'#444',lineHeight:'1.8',fontFamily:'var(--font-inter),sans-serif'}}>
              {et.finishBody}
            </p>
          </div>

          {/* Car eligibility callout */}
          <div style={{display:'flex',alignItems:'flex-start',gap:'1rem',padding:'1rem 1.25rem',border:'0.5px solid rgba(0,0,0,0.18)',background:'#F5F1EC',marginBottom:'2.5rem'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:'2px'}}><path d="M19 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z"/><circle cx="12" cy="11" r="3"/></svg>
            <div>
              <div style={{fontSize:'11px',fontWeight:'600',color:'#1a1a1a',letterSpacing:'0.04em',marginBottom:'0.25rem',fontFamily:'var(--font-inter),sans-serif'}}>{t.driverFocusedTitle}</div>
              <div style={{fontSize:'13px',color:'#666',lineHeight:'1.65',fontFamily:'var(--font-inter),sans-serif'}}>{t.driverFocusedBody}</div>
            </div>
          </div>

          <a href="#form" onClick={e => { e.preventDefault(); document.getElementById('form')?.scrollIntoView({ behavior:'smooth' }) }}
            className="wtet-details-cta"
            style={{display:'inline-block',padding:'0.85rem 2.2rem',background:'#45643c',color:'#F5F1EC',fontSize:'11px',letterSpacing:'0.18em',textTransform:'uppercase',textDecoration:'none',fontFamily:'var(--font-inter),sans-serif',fontWeight:'600'}}>
            {t.registerFrom('179')}
          </a>
          </FadeUp>
        </div>
      </section>

      {/* ITINERARY */}
      <section className="wtet-itinerary" style={{position:'relative',padding:'6rem 2rem 7rem',overflow:'hidden'}}>
        <img src="/Convoy.png" alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 40%',zIndex:0}} />
        <div style={{position:'absolute',inset:0,background:'rgba(8,16,10,0.88)',zIndex:1}} />
        <div style={{maxWidth:'560px',margin:'0 auto',position:'relative',zIndex:2}}>
          <FadeUp>
            <div style={{textAlign:'center',marginBottom:'4rem'}}>
              <div style={{fontSize:'11px',letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(197,168,130,0.6)',marginBottom:'1.2rem'}}>{et.itineraryDate}</div>
              <h2 style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:'300',color:'#F5F1EC',lineHeight:'1.1',margin:0}}>{et.itineraryTitle}</h2>
              <div style={{width:'30px',height:'0.5px',background:'rgba(197,168,130,0.4)',margin:'1.5rem auto'}} />
            </div>
          </FadeUp>

          {et.stops.map((stop, i, arr) => (
            <FadeUp key={i} delay={i * 80}>
            <div className="wtet-stop" style={{display:'flex',gap:'1.5rem',padding:'1.75rem 0',borderBottom: i < arr.length-1 ? '0.5px solid rgba(197,168,130,0.1)' : 'none'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:stop.pays?'#c5a882':'rgba(197,168,130,0.35)',flexShrink:0,marginTop:'6px'}} />
              <div style={{flex:1}}>
                <div style={{fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(197,168,130,0.6)',marginBottom:'0.35rem'}}>{stop.label}</div>
                {stop.venue && (
                  stop.venueHref
                    ? <a href={stop.venueHref} target="_blank" rel="noreferrer" style={{fontSize:'15px',fontWeight:'500',color:'#F5F1EC',marginBottom:'0.2rem',lineHeight:'1.4',display:'inline-flex',alignItems:'center',gap:'0.4rem',textDecoration:'none',borderBottom:'0.5px solid rgba(197,168,130,0.35)',paddingBottom:'1px'}}>
                        {stop.venue}
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    : <div style={{fontSize:'15px',fontWeight:'500',color:'#F5F1EC',marginBottom:'0.2rem',lineHeight:'1.4'}}>{stop.venue}</div>
                )}
                {stop.address && <div style={{fontSize:'12px',color:'rgba(245,241,236,0.35)',marginBottom:'0.65rem',letterSpacing:'0.02em'}}>{stop.address}</div>}
                <div style={{fontSize:'14px',color:'rgba(245,241,236,0.65)',lineHeight:'1.8'}}>
                  {stop.desc}{stop.pays && <span style={{color:'#c5a882',marginLeft:'0.35rem'}}>{t.includedInFee}</span>}
                </div>
              </div>
            </div>
            </FadeUp>
          ))}

          <div style={{height:'0.5px',background:'rgba(197,168,130,0.15)',margin:'4rem 0'}} />

          <FadeUp>
          <div className="incl-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3rem',marginBottom:'4rem'}}>
            <div>
              <div style={{fontSize:'11px',letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(197,168,130,0.6)',marginBottom:'1.25rem'}}>{t.whatsIncluded}</div>
              {et.includedList.map((item, i) => (
                <div key={i} style={{display:'flex',gap:'0.65rem',alignItems:'flex-start',marginBottom:'0.85rem'}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a9e4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:'2px'}}><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{fontSize:'14px',color:'rgba(245,241,236,0.7)',lineHeight:'1.65'}}>{item}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:'11px',letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(197,168,130,0.6)',marginBottom:'1.25rem'}}>{t.notIncluded}</div>
              {et.notIncludedList.map((item, i) => (
                <div key={i} style={{display:'flex',gap:'0.65rem',alignItems:'flex-start',marginBottom:'0.85rem'}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(245,241,236,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:'2px'}}><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{fontSize:'14px',color:'rgba(245,241,236,0.45)',lineHeight:'1.65'}}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          </FadeUp>

          <FadeUp delay={100}>
          <div style={{border:'0.5px solid rgba(197,168,130,0.25)',padding:'2rem',background:'rgba(197,168,130,0.05)'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div className="reg-box-row" style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',flexWrap:'wrap',gap:'0.5rem'}}>
                <div style={{fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(197,168,130,0.6)'}}>{t.priceEyebrow}</div>
                <div style={{display:'flex',gap:'1.5rem',alignItems:'baseline',flexWrap:'wrap'}}>
                  <span style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'1.7rem',fontWeight:'400',color:'#c5a882',letterSpacing:'0.04em'}}>$179 <span style={{fontSize:'11px',color:'rgba(197,168,130,0.55)',fontFamily:'var(--font-inter),sans-serif',letterSpacing:'0.06em'}}>{t.membersWord}</span></span>
                  <span style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'1.7rem',fontWeight:'400',color:'rgba(245,241,236,0.6)',letterSpacing:'0.04em'}}>$199 <span style={{fontSize:'11px',color:'rgba(245,241,236,0.35)',fontFamily:'var(--font-inter),sans-serif',letterSpacing:'0.06em'}}>{t.nonMembersWord}</span></span>
                </div>
              </div>
              <div style={{fontSize:'11px',color:'rgba(197,168,130,0.45)',fontFamily:'var(--font-inter),sans-serif',letterSpacing:'0.04em'}}>{t.perCarUpTo2PlusTaxAlt}</div>
              <div style={{height:'0.5px',background:'rgba(197,168,130,0.1)'}} />
              <div className="reg-box-row" style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',flexWrap:'wrap',gap:'0.5rem'}}>
                <div style={{fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(197,168,130,0.6)'}}>{t.registrationLabel}</div>
                <div style={{fontSize:'11px',letterSpacing:'0.06em',textTransform:'uppercase',color:effectiveRegOpen?'#c5a882':'rgba(197,168,130,0.5)'}}>{effectiveRegOpen ? t.openScrollDown : t.closedLabel}</div>
              </div>
            </div>
          </div>

          <div style={{marginTop:'1.5rem',textAlign:'center'}}>
            <span style={{fontSize:'14px',color:'rgba(245,241,236,0.35)',lineHeight:'1.8'}}>{t.questionsLabel} </span>
            <a href="mailto:info@canvasroutes.com" style={{fontSize:'14px',color:'rgba(197,168,130,0.6)',textDecoration:'underline',textUnderlineOffset:'3px'}}>info@canvasroutes.com</a>
          </div>
          </FadeUp>
        </div>
      </section>

      {/* FORM / PAYMENT / SUCCESS */}
      <section id="form" className="wtet-form-section" style={{padding:'6rem 2rem 8rem',background:'#F5F1EC'}}>
        <div style={{maxWidth:'560px',margin:'0 auto'}}>

          {/* CLOSED */}
          {!effectiveRegOpen && status !== 'success' && (
            <div style={{textAlign:'center',padding:'5rem 0'}}>
              <div style={{fontFamily:'var(--font-cormorant),serif',fontSize:'2.2rem',fontWeight:'300',color:'#1a1a1a',marginBottom:'1rem'}}>
                {closedMsg || t.registrationClosed}
              </div>
              <div style={{width:'30px',height:'0.5px',background:'#c5a882',margin:'1.2rem auto'}} />
              <p style={{fontSize:'0.9rem',color:'#777',lineHeight:'1.9',maxWidth:'420px',margin:'1.5rem auto'}}>
                {t.haveAQuestion}{' '}
                <a href="mailto:info@canvasroutes.com" style={{color:'#7B5B2E',textDecoration:'underline',textUnderlineOffset:'2px'}}>info@canvasroutes.com</a>
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {status === 'success' && (
            <div style={{textAlign:'center',padding:'5rem 0'}}>
              {wasMemberRef.current ? (
                <>
                  <div style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(1.7rem,6vw,2.2rem)',fontWeight:'300',color:'#1a1a1a',marginBottom:'1rem'}}>{et.successMemberTitle}</div>
                  <div style={{width:'30px',height:'0.5px',background:'#c5a882',margin:'1.2rem auto'}} />
                  <p style={{fontSize:'0.9rem',color:'#777',lineHeight:'1.9',maxWidth:'420px',margin:'1.5rem auto 1rem'}}>
                    {et.successMemberBody1} <strong style={{color:'#1a1a1a',fontWeight:'500'}}>{memberProfile?.email || form.email}</strong>.
                  </p>
                  <p style={{fontSize:'0.85rem',color:'#aaa',lineHeight:'1.8',maxWidth:'380px',margin:'0 auto 2rem'}}>
                    {et.successMemberBody2}
                  </p>
                </>
              ) : (
                <>
                  <div style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(1.7rem,6vw,2.2rem)',fontWeight:'300',color:'#1a1a1a',marginBottom:'1rem'}}>{et.successNonMemberTitle}</div>
                  <div style={{width:'30px',height:'0.5px',background:'#c5a882',margin:'1.2rem auto'}} />
                  <p style={{fontSize:'0.9rem',color:'#777',lineHeight:'1.9',maxWidth:'420px',margin:'1.5rem auto 1rem'}}>
                    {et.successNonMemberBody1(price)} <strong style={{color:'#1a1a1a',fontWeight:'500'}}>{form.email}</strong>.
                  </p>
                  <p style={{fontSize:'0.85rem',color:'#aaa',lineHeight:'1.8',maxWidth:'380px',margin:'0 auto 2rem'}}>
                    {et.successNonMemberBody2}
                  </p>
                </>
              )}
              {/* Add to contacts callout */}
              <div style={{maxWidth:'400px',margin:'0 auto 2rem',padding:'0.85rem 1rem',background:'rgba(197,168,130,0.08)',border:'0.5px solid rgba(197,168,130,0.35)',textAlign:'left'}}>
                <p style={{fontSize:'12px',color:'#777',lineHeight:'1.7',margin:'0 0 0.3rem',fontFamily:'var(--font-inter),sans-serif'}}>
                  {t.addToContactsNote}
                </p>
                <p style={{fontSize:'12px',color:'#999',margin:0,fontFamily:'var(--font-inter),sans-serif'}}>
                  <a href="mailto:info@canvasroutes.com" style={{color:'#7B5B2E',textDecoration:'none'}}>info@canvasroutes.com</a>
                  {' · '}
                  <a href="mailto:jerry@canvasroutes.com" style={{color:'#7B5B2E',textDecoration:'none'}}>jerry@canvasroutes.com</a>
                </p>
              </div>
              {/* Early check-in CTA — members only; non-members get this link in their capture confirmation email */}
              {wasMemberRef.current && clientSecret && (
                <div style={{marginBottom:'1.5rem'}}>
                  <Link
                    href={`/wtet/checkin?t=${clientSecret.split('_secret_')[0]}`}
                    style={{display:'inline-block',padding:'0.85rem 2rem',background:'#45643c',color:'#F5F1EC',fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',fontFamily:'var(--font-inter),sans-serif',textDecoration:'none'}}
                  >
                    {t.completeEarlyCheckin}
                  </Link>
                  <p style={{fontSize:'12px',color:'#bbb',marginTop:'0.75rem',fontFamily:'var(--font-inter),sans-serif'}}>
                    {t.ignoreCheckin}
                  </p>
                </div>
              )}
              <div>
                <Link href="/" style={{fontSize:'11px',letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',textDecoration:'none',fontFamily:'var(--font-inter),sans-serif'}}>{t.backToCanvasRoutes}</Link>
              </div>
            </div>
          )}

          {/* STRIPE PAYMENT STEP */}
          {status === 'payment' && clientSecret && (
            <div>
              <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
                <div style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(1.8rem,6vw,2.4rem)',fontWeight:'300',color:'#1a1a1a',marginBottom:'0.5rem'}}>{t.completeYourPayment}</div>
                <div style={{width:'30px',height:'0.5px',background:'#c5a882',margin:'1.2rem auto 0'}} />
              </div>
              <Elements
                key={lang}
                stripe={getStripe()}
                options={{
                  mode: 'payment',
                  amount: price * 100,
                  currency: 'cad',
                  locale: lang === 'fr' ? 'fr-CA' : 'en',
                  // Members pay immediately (automatic capture); non-members get an auth hold.
                  // capture_method must match the PI created by the respective API route.
                  ...(!memberProfile ? { capture_method: 'manual' } : {}),
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0F1E14',
                      colorBackground: '#ffffff',
                      colorText: '#1a1a1a',
                      colorDanger: '#93333E',
                      fontFamily: 'var(--font-inter), sans-serif',
                      borderRadius: '0px',
                      focusBoxShadow: '0 0 0 3px rgba(197,168,130,0.25)',
                    },
                  },
                }}
              >
                <PaymentForm
                  name={form.name || memberProfile?.name || ''}
                  email={form.email || memberProfile?.email || ''}
                  price={price}
                  clientSecret={clientSecret}
                  isMember={!!memberProfile}
                  onSuccess={() => setStatus('success')}
                  onBack={() => { setStatus(null); setClientSecret(null) }}
                  onMemberConfirm={piId => {
                    const confirm = () => fetch('/api/wtet-member-confirm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ paymentIntentId: piId }),
                    }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`) })
                    // Retry once after 4s on any failure (network error OR non-ok response).
                    // Final failure captured to Sentry — payment succeeded but confirm email may not arrive.
                    confirm().catch(() => setTimeout(() => confirm().catch(err => {
                      import('@sentry/nextjs').then(S => S.captureException(err, { tags: { context: 'wtet-member-confirm-client', piId } })).catch(() => {})
                    }), 4000))
                  }}
                />
              </Elements>
            </div>
          )}

          {/* REGISTRATION FORM */}
          {showForm && (
            <>
              <FadeUp>
              <div style={{textAlign:'center',marginBottom:'3.5rem'}}>
                <div style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(1.9rem,6vw,2.4rem)',fontWeight:'300',color:'#1a1a1a',marginBottom:'0.5rem'}}>{t.claimYourSeat}</div>
                <div style={{width:'30px',height:'0.5px',background:'#c5a882',margin:'1.2rem auto 1.5rem'}} />
                <p style={{fontSize:'14px',color:'#777',lineHeight:'1.8',maxWidth:'420px',margin:'0 auto',fontFamily:'var(--font-inter),sans-serif'}}>
                  {memberProfile
                    ? t.memberFormIntro('179')
                    : t.nonMemberFormIntro}
                </p>
              </div>
              </FadeUp>

              <form onSubmit={e => { e.preventDefault(); handleSubmit() }} noValidate>

                {/* Member status — only shown when NOT logged in as a member */}
                {!memberProfile && (
                  <div id="field-isMember" style={{marginBottom:'1.5rem'}}>
                    <div style={{fontSize:'10px',letterSpacing:'0.18em',textTransform:'uppercase',color:'#999',marginBottom:'1rem',fontFamily:'var(--font-inter),sans-serif'}}>
                      {t.chooseOneToSecure}
                    </div>
                    <div className="wtet-member-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                      {[
                        {val:'yes', price:'$179', label:t.memberRateLabel, sublabel:t.memberRateSublabel},
                        {val:'no',  price:'$199', label:t.standardRateLabel, sublabel:t.standardRateSublabel},
                      ].map(({val, price: p, label, sublabel}) => {
                        const sel = form.isMember === val
                        return (
                          <button key={val} type="button" onClick={() => updateForm('isMember', val)}
                            style={{padding:'1.1rem 1.25rem',border:`1.5px solid ${sel?'#c5a882':errors.isMember?'#93333E':'rgba(0,0,0,0.14)'}`,background:sel?'rgba(197,168,130,0.08)':'#fff',cursor:'pointer',fontFamily:'var(--font-inter),sans-serif',textAlign:'left',transition:'all 0.15s',display:'flex',flexDirection:'column',gap:'0.3rem'}}>
                            <span style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'1.6rem',letterSpacing:'0.04em',color:sel?'#1a1a1a':'#888',lineHeight:1}}>{p}</span>
                            <span style={{fontSize:'11px',fontWeight:'500',color:sel?'#1a1a1a':'#aaa',letterSpacing:'0.04em'}}>{label}</span>
                            <span style={{fontSize:'10px',color:sel?'#888':'#ccc',letterSpacing:'0.02em'}}>{sublabel}</span>
                          </button>
                        )
                      })}
                    </div>
                    {errors.isMember && <span style={{fontSize:'11px',color:'#93333E',display:'block',marginTop:'0.5rem'}}>{t.pleaseSelectOne}</span>}
                  </div>
                )}

                {/* Logged-in member badge */}
                {memberProfile && (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.9rem 1.1rem',background:'rgba(59,107,47,0.06)',border:'0.5px solid rgba(59,107,47,0.22)',marginBottom:'1.5rem'}}>
                    <div>
                      <div style={{fontSize:'10px',letterSpacing:'0.16em',textTransform:'uppercase',color:'#3B6B2F',marginBottom:'0.2rem',fontFamily:'var(--font-inter),sans-serif'}}>{t.memberRateLabel} · $179 + tax</div>
                      <div style={{fontSize:'14px',color:'#1a1a1a',fontWeight:'500',fontFamily:'var(--font-inter),sans-serif'}}>{memberProfile.name}</div>
                      <div style={{fontSize:'12px',color:'#888',fontFamily:'var(--font-inter),sans-serif'}}>{memberProfile.email}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}

                {/* Redirect box — only for non-logged-in users who select member rate */}
                {form.isMember === 'yes' && !memberProfile && (
                  <div style={{padding:'1.5rem',background:'#0F1E14',marginBottom:'1rem'}}>
                    <div style={{fontSize:'10px',letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(197,168,130,0.7)',marginBottom:'0.6rem',fontFamily:'var(--font-inter),sans-serif'}}>{t.logInForMemberRate}</div>
                    <p style={{fontSize:'13px',color:'rgba(245,241,236,0.65)',lineHeight:'1.7',margin:'0 0 1.25rem',fontFamily:'var(--font-inter),sans-serif'}}>
                      {t.logInForMemberRateBody('179')}
                    </p>
                    <a href={`/members/login?redirect=${encodeURIComponent('/wtet')}`}
                      style={{display:'inline-block',padding:'0.75rem 1.75rem',background:'#F5F1EC',color:'#0F1E14',fontSize:'11px',letterSpacing:'0.18em',textTransform:'uppercase',textDecoration:'none',fontFamily:'var(--font-inter),sans-serif',fontWeight:'600'}}>
                      {t.logInToRegister}
                    </a>
                  </div>
                )}

                {/* Rest of form — members and non-members both fill this out */}
                {(memberProfile || form.isMember === 'no') && <>

                {/* Name / email / phone / DOB — not needed for logged-in members */}
                {!memberProfile && <>
                {/* Name + Email */}
                <div className="join-form-row" style={{marginBottom:'1rem'}}>
                  <div className="join-form-field">
                    <label htmlFor="field-name" className="join-label">{t.fieldFullName}<User size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                    <input id="field-name" type="text" name="name" autoComplete="name" inputMode="text" placeholder={t.placeholderFullName} value={form.name} maxLength={100}
                      onChange={e => updateForm('name', e.target.value)} style={inputStyle('name')}
                      onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
                    {errors.name && <span style={{fontSize:'11px',color:'#93333E'}}>{t.required}</span>}
                  </div>
                  <div className="join-form-field">
                    <label htmlFor="field-email" className="join-label">{t.fieldEmail}<Mail size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                    <input id="field-email" type="email" name="email" autoComplete="email" inputMode="email" placeholder={t.placeholderEmail} value={form.email}
                      onChange={e => updateForm('email', e.target.value)} style={inputStyle('email')}
                      onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
                    {errors.email && <span style={{fontSize:'11px',color:'#93333E'}}>{t.validEmailRequired}</span>}
                  </div>
                </div>

                {/* Phone */}
                <div className="join-form-field" style={{marginBottom:'1rem'}}>
                  <label htmlFor="field-phone" className="join-label">{t.fieldPhone}<Phone size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                  {phoneOptOut ? (
                    <div style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.65rem 0.9rem',background:'rgba(0,0,0,0.03)',border:'0.5px solid rgba(0,0,0,0.1)'}}>
                      <span style={{fontSize:'13px',color:'#aaa',flex:1}}>{t.phoneNotProvided}</span>
                      <button type="button" onClick={() => { setPhoneOptOut(false); setErrors(p => ({...p,phone:undefined})) }} style={{background:'none',border:'none',padding:0,fontSize:'11px',color:'#888',cursor:'pointer',textDecoration:'underline',fontFamily:'var(--font-inter),sans-serif',whiteSpace:'nowrap'}}>{t.addNumber}</button>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const f=focusedField==='phone', err=!!errors.phone, val=!!form.phone
                        const border = err?'1px solid #93333E':val?'1px solid #3B6B2F':f?'1px solid #c5a882':'1px solid rgba(0,0,0,0.2)'
                        const bg = err?'rgba(147,51,62,0.04)':val?'rgba(59,107,47,0.05)':'transparent'
                        const shadow = f&&!err&&!val?'0 0 0 3px rgba(197,168,130,0.2)':'none'
                        return (
                          <div style={{display:'flex',alignItems:'stretch',border,background:bg,boxShadow:shadow,transition:'border-color 0.2s, box-shadow 0.2s, background 0.2s'}}>
                            <div style={{position:'relative',flexShrink:0}}>
                              <select name="tel-country-code" autoComplete="off" value={countryCode} onChange={e => { setCountryCode(e.target.value); setForm(p=>({...p,phone:''})) }}
                                style={{height:'100%',padding:'0.9rem 1.8rem 0.9rem 0.75rem',border:'none',borderRight:'1px solid rgba(0,0,0,0.1)',background:'transparent',fontSize:'13px',fontFamily:'var(--font-inter),sans-serif',color:'#1a1a1a',cursor:'pointer',outline:'none',WebkitAppearance:'none',appearance:'none',minWidth:'60px'}}>
                                {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <Chevron />
                            </div>
                            <input id="field-phone" type="tel" name="tel" autoComplete="tel-national" placeholder={countryCode==='+1'?'(514) 000-0000':t.placeholderPhoneOther} value={form.phone}
                              onChange={e => updateForm('phone', formatPhone(e.target.value))}
                              style={{flex:1,padding:'0.9rem 1.2rem',border:'none',background:'transparent',fontSize:'13px',fontFamily:'var(--font-inter),sans-serif',outline:'none',color:'#1a1a1a',appearance:'none'}}
                              onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
                          </div>
                        )
                      })()}
                      {errors.phone && <span style={{fontSize:'11px',color:'#93333E'}}>{countryCode==='+1'?t.phoneValid10:t.phoneValidGeneric}</span>}
                      <button type="button" onClick={() => { setPhoneOptOut(true); setForm(p=>({...p,phone:''})); setErrors(p=>({...p,phone:undefined})) }} style={{background:'none',border:'none',padding:'0.3rem 0',fontSize:'11px',color:'#aaa',cursor:'pointer',textDecoration:'underline',fontFamily:'var(--font-inter),sans-serif',textAlign:'left'}}>{t.preferNotToShare}</button>
                    </>
                  )}
                </div>

                {/* Date of birth */}
                <div id="field-dob_month" className="join-form-field" style={{marginBottom:'1rem'}}>
                  <div className="join-label" style={{marginBottom:'0.5rem'}}>{t.fieldDob}<span style={{color:'#93333E',marginLeft:'3px'}}>*</span> <span style={{color:'#888',fontWeight:'300',textTransform:'none',letterSpacing:0,fontSize:'11px'}}>{t.yearOptionalParen}</span></div>
                  <div className="wtet-dob-grid" style={{display:'grid',gridTemplateColumns:'1.4fr 1fr 1.2fr',gap:'0.75rem'}}>
                    <div style={{position:'relative'}}>
                      <select name="bday-month" autoComplete="bday-month" value={form.dob_month} onChange={e => updateForm('dob_month', e.target.value)} style={{...inputStyle('dob_month'),cursor:'pointer',paddingRight:'2rem'}}>
                        <option value="">{t.monthPlaceholder}</option>
                        {t.months.map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                      </select><Chevron />
                    </div>
                    <div style={{position:'relative'}}>
                      <select name="bday-day" autoComplete="bday-day" value={form.dob_day} onChange={e => updateForm('dob_day', e.target.value)} style={{...inputStyle('dob_day'),cursor:'pointer',paddingRight:'2rem'}}>
                        <option value="">{t.dayPlaceholder}</option>
                        {Array.from({length:31},(_,i)=>i+1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                      </select><Chevron />
                    </div>
                    <div className="wtet-dob-year" style={{position:'relative'}}>
                      <select name="bday-year" autoComplete="bday-year" value={form.dob_year} onChange={e => updateForm('dob_year', e.target.value)} style={{...inputStyle('dob_year'),cursor:'pointer',paddingRight:'2rem'}}>
                        <option value="">{t.yearPlaceholder}</option>
                        {Array.from({length:2015-1945+1},(_,i)=>2015-i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select><Chevron />
                    </div>
                  </div>
                  {(errors.dob_month||errors.dob_day) && <span style={{fontSize:'11px',color:'#93333E'}}>{t.dobRequired}</span>}
                </div>
                </>}

                {/* Car year + make */}
                <div className="join-form-row" style={{marginBottom:'1rem'}}>
                  <div className="join-form-field">
                    <label htmlFor="field-year" className="join-label">{t.fieldYear}<Car size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                    <div style={{position:'relative'}}>
                      <select id="field-year" autoComplete="off" value={form.year} onChange={e => updateForm('year', e.target.value)} style={{...inputStyle('year'),cursor:'pointer',paddingRight:'2rem'}}>
                        <option value="">{t.placeholderSelectYear}</option>
                        {Array.from({length:2027-1940+1},(_,i)=>2027-i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select><Chevron />
                    </div>
                    {errors.year && <span style={{fontSize:'11px',color:'#93333E'}}>{t.required}</span>}
                  </div>
                  <div className="join-form-field">
                    <label htmlFor="field-carMake" className="join-label">{t.fieldMake}<Car size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                    <div style={{position:'relative'}}>
                      <select id="field-carMake" autoComplete="off" value={form.carMake} onChange={e => updateForm('carMake', e.target.value)} style={{...inputStyle('carMake'),cursor:'pointer',paddingRight:'2rem'}}>
                        <option value="">{t.placeholderSelectMake}</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select><Chevron />
                    </div>
                    {errors.carMake && <span style={{fontSize:'11px',color:'#93333E'}}>{t.required}</span>}
                  </div>
                </div>

                {/* Model */}
                <div className="join-form-field" style={{marginBottom:'1rem'}}>
                  <label htmlFor="field-carModel" className="join-label">{t.fieldModel}<Car size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                  <input id="field-carModel" type="text" name="car-model" autoComplete="off" placeholder={t.placeholderModel} value={form.carModel} maxLength={100}
                    onChange={e => updateForm('carModel', e.target.value)} style={inputStyle('carModel')}
                    onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)} />
                  {errors.carModel && <span style={{fontSize:'11px',color:'#93333E'}}>{t.required}</span>}
                </div>

                {/* Passengers */}
                <div className="join-form-field" style={{marginBottom:'1rem'}}>
                  <label htmlFor="field-passengers" className="join-label">{t.fieldPassengers}<Users size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span> <span style={{color:'#888',fontWeight:'300',textTransform:'none',letterSpacing:0,fontSize:'11px'}}>{t.includingDriver}</span></label>
                  <div style={{position:'relative'}}>
                    <select id="field-passengers" autoComplete="off" value={form.passengers} onChange={e => updateForm('passengers', e.target.value)} style={{...inputStyle('passengers'),cursor:'pointer',paddingRight:'2rem'}}>
                      <option value="">{t.placeholderSelect}</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4+">4+</option>
                    </select><Chevron />
                  </div>
                  {errors.passengers && <span style={{fontSize:'11px',color:'#93333E'}}>{t.required}</span>}
                  {(form.passengers==='3'||form.passengers==='4+') && (
                    <div style={{marginTop:'0.6rem',padding:'0.75rem 1rem',border:'0.5px solid rgba(197,168,130,0.35)',background:'rgba(197,168,130,0.05)'}}>
                      <span style={{fontSize:'12px',color:'#7B5B2E',lineHeight:'1.7'}}>{t.extraPassengerNote}</span>
                    </div>
                  )}
                </div>

                {/* Children */}
                <div className="join-form-field" style={{marginBottom:'1rem'}}>
                  <div id="field-hasChildren" className="join-label" style={{marginBottom:'0.75rem'}}>{t.childrenQuestion}<span style={{color:'#93333E',marginLeft:'3px'}}>*</span></div>
                  <div style={{display:'flex',gap:'1rem'}}>
                    {[t.yesLabel, t.noLabel].map((v, vi) => {
                      const val = vi === 0 ? 'yes' : 'no', selected=form.hasChildren===val
                      return (
                        <button key={v} type="button" onClick={() => updateForm('hasChildren', val)}
                          style={{flex:1,padding:'0.9rem',border:`1px solid ${selected?'#3B6B2F':errors.hasChildren?'#93333E':'rgba(0,0,0,0.2)'}`,background:selected?'rgba(59,107,47,0.06)':errors.hasChildren?'rgba(147,51,62,0.03)':'transparent',cursor:'pointer',fontFamily:'var(--font-inter),sans-serif',fontSize:'13px',color:selected?'#3B6B2F':'#1a1a1a',transition:'all 0.2s',letterSpacing:'0.04em'}}>
                          {v}
                        </button>
                      )
                    })}
                  </div>
                  {errors.hasChildren && <span style={{fontSize:'11px',color:'#93333E'}}>{t.required}</span>}
                  {form.hasChildren==='yes' && (
                    <div style={{marginTop:'0.75rem',padding:'0.85rem 1rem',border:'0.5px solid rgba(197,168,130,0.4)',background:'rgba(197,168,130,0.08)'}}>
                      <span style={{fontSize:'12px',color:'#7B5B2E',lineHeight:'1.7'}}>{t.childrenNote}</span>
                    </div>
                  )}
                </div>

                {form.hasChildren==='yes' && (
                  <div className="join-form-field" style={{marginBottom:'1rem'}}>
                    <label htmlFor="field-childrenAges" className="join-label">{t.fieldChildrenAges}<span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                    <input id="field-childrenAges" type="text" autoComplete="off" placeholder={t.placeholderChildrenAges} value={form.childrenAges} maxLength={100}
                      onChange={e => updateForm('childrenAges', e.target.value)} style={inputStyle('childrenAges')}
                      onFocus={() => setFocusedField('childrenAges')} onBlur={() => setFocusedField(null)} />
                    {errors.childrenAges && <span style={{fontSize:'11px',color:'#93333E'}}>{t.childrenAgesRequired}</span>}
                  </div>
                )}

                {/* Source — only for non-members; members already know us */}
                {!memberProfile && (
                <div className="join-form-field" style={{marginBottom:'1rem'}}>
                  <label htmlFor="field-source" className="join-label">{t.fieldSource}<Share2 size={13} style={{marginLeft:'3px',verticalAlign:'middle'}}/><span style={{color:'#93333E',marginLeft:'3px'}}>*</span></label>
                  <div style={{position:'relative'}}>
                    <select id="field-source" autoComplete="off" value={form.source} onChange={e => updateForm('source', e.target.value)} style={{...inputStyle('source'),cursor:'pointer',paddingRight:'2rem'}}>
                      <option value="">{t.placeholderSelectOption}</option>
                      {['Instagram','Facebook','Friend / Word of mouth','Google','Other'].map((val, i) => (
                        <option key={val} value={val}>{t.sourceLabels[i]}</option>
                      ))}
                    </select><Chevron />
                  </div>
                  {errors.source && <span style={{fontSize:'11px',color:'#93333E'}}>{t.required}</span>}
                </div>
                )}

                {/* More */}
                <div className="join-form-field" style={{marginBottom:'1rem'}}>
                  <label htmlFor="field-more" className="join-label">{t.fieldTellUsMore} <span style={{color:'#888',fontWeight:'300'}}>{t.optionalParen}</span></label>
                  <textarea id="field-more" autoComplete="off" placeholder={t.placeholderTellUsMore} value={form.more}
                    onChange={e => updateForm('more', e.target.value)} rows={4} maxLength={500}
                    style={{...inputStyle('more'),resize:'vertical'}}
                    onFocus={() => setFocusedField('more')} onBlur={() => setFocusedField(null)} />
                  <div style={{textAlign:'right',fontSize:'10px',color:'#aaa',marginTop:'0.3rem'}}>{form.more.length}/500</div>
                </div>

                {/* Payment note */}
                <div style={{marginBottom:'2.5rem',padding:'1rem 1.2rem',border:`0.5px solid ${memberProfile?'rgba(59,107,47,0.2)':'rgba(0,0,0,0.12)'}`,background:memberProfile?'rgba(59,107,47,0.05)':'rgba(197,168,130,0.06)'}}>
                  {memberProfile ? (
                    <>
                      <div style={{fontSize:'10px',letterSpacing:'0.18em',textTransform:'uppercase',color:'#3B6B2F',marginBottom:'0.4rem'}}>{t.memberPaymentNoteTitle('179')}</div>
                      <div style={{fontSize:'13px',color:'#555',lineHeight:'1.7'}}>{t.memberPaymentNoteBody('179')}</div>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:'10px',letterSpacing:'0.18em',textTransform:'uppercase',color:'#7B5B2E',marginBottom:'0.4rem'}}>{t.authPaymentNoteTitle(price)}</div>
                      <div style={{fontSize:'13px',color:'#555',lineHeight:'1.7'}}>{t.authPaymentNoteBody(price)}</div>
                    </>
                  )}
                </div>

                {/* Honeypot */}
                <div style={{display:'none'}} aria-hidden="true">
                  <input ref={honeypotRef} type="text" name="cr_wt_field" tabIndex={-1} autoComplete="off" />
                </div>

                {(status==='error') && <div style={{fontSize:'12px',color:'#93333E',marginBottom:'0.75rem'}}>{serverError}</div>}

                {alreadyRegistered && memberProfile && (
                  <div style={{padding:'0.85rem 1rem',background:'rgba(59,107,47,0.06)',border:'0.5px solid rgba(59,107,47,0.3)',marginBottom:'1rem',fontSize:'13px',color:'#3B6B2F',fontFamily:'var(--font-inter),sans-serif',lineHeight:'1.5'}}>
                    {t.alreadyRegisteredNotice}
                  </div>
                )}

                <button type="submit" disabled={status==='loading' || (alreadyRegistered && !!memberProfile)}
                  style={{display:'block',width:'100%',padding:'1.1rem',fontSize:'11px',letterSpacing:'0.18em',textTransform:'uppercase',cursor:(status==='loading'||(alreadyRegistered&&!!memberProfile))?'not-allowed':'pointer',fontFamily:'var(--font-inter),sans-serif',fontWeight:'700',background:(status==='loading'||(alreadyRegistered&&!!memberProfile))?'rgba(15,30,20,0.5)':'#0F1E14',color:'#c5a882',border:'none',marginBottom:'1rem',opacity:(alreadyRegistered&&!!memberProfile)?0.5:1}}>
                  {status==='loading' ? t.settingUpPayment : memberProfile ? t.secureYourSpot('179') : form.isMember === 'no' ? t.continueToPayment(price) : t.continueToPaymentPlain}
                </button>

                </>}

              </form>
            </>
          )}

        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
