'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js/pure'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']
const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)

const inp = { width:'100%', padding:'0.7rem 0.9rem', border:'0.5px solid rgba(0,0,0,0.16)', background:'#fff', fontSize:'13px', fontFamily:'var(--font-inter),sans-serif', color:'#1a1a1a', outline:'none', boxSizing:'border-box', WebkitAppearance:'none', appearance:'none' }
const sel = { ...inp, cursor:'pointer' }
const LABEL = { fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.4rem', fontFamily:'var(--font-inter),sans-serif', display:'block' }

let _stripePromise = null
function getStripe() {
  if (!_stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    _stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  }
  return _stripePromise
}

function Chevron() {
  return <svg style={{position:'absolute',right:'9px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
}

// ── Stripe payment step ───────────────────────────────────────────────────────

function PaymentStep({ email, onSuccess, onBack }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error,  setError]  = useState(null)
  const payingRef = useRef(false)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements || payingRef.current) return
    payingRef.current = true
    setPaying(true); setError(null)

    const { error: submitErr } = await elements.submit()
    if (submitErr) { setError(submitErr.message); setPaying(false); payingRef.current = false; return }

    let confirmError
    try {
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/members/events/wtet` }, redirect: 'if_required' })
      confirmError = result.error
    } catch {
      setError('Payment could not be processed. Please try again.')
      setPaying(false); payingRef.current = false; return
    }

    if (confirmError) {
      const expired = confirmError.code === 'payment_intent_unexpected_state' || confirmError.payment_intent?.status === 'canceled'
      setError(expired ? 'Your payment session expired. Please go back and try again.' : confirmError.message)
      setPaying(false); payingRef.current = false; return
    }

    payingRef.current = false
    onSuccess()
  }

  return (
    <form onSubmit={handlePay}>

      {/* Hold notice */}
      <div style={{padding:'0.85rem 1rem',background:'rgba(197,168,130,0.08)',border:'0.5px solid rgba(197,168,130,0.28)',marginBottom:'1.25rem'}}>
        <div style={{fontSize:'12px',color:'#7B5B2E',lineHeight:'1.6',fontFamily:'var(--font-inter),sans-serif'}}>
          <strong style={{fontWeight:'500'}}>Member rate — $179 CAD.</strong> Your card will be authorized but not charged yet. We review each registration and only capture once your spot is confirmed.
        </div>
      </div>

      {/* Order summary */}
      <div style={{borderTop:'0.5px solid rgba(0,0,0,0.08)',borderBottom:'0.5px solid rgba(0,0,0,0.08)',padding:'1rem 0',marginBottom:'1.25rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem'}}>
          <div>
            <div style={{fontSize:'10px',letterSpacing:'0.18em',textTransform:'uppercase',color:'#c5a882',marginBottom:'0.25rem',fontFamily:'var(--font-inter),sans-serif'}}>Canvas Routes · July 5, 2026</div>
            <div style={{fontSize:'14px',fontWeight:'500',color:'#1a1a1a',fontFamily:'var(--font-inter),sans-serif'}}>Whips to Eastern Townships</div>
            <div style={{fontSize:'11px',color:'#999',marginTop:'0.15rem',fontFamily:'var(--font-inter),sans-serif'}}>{email}</div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'1.6rem',letterSpacing:'0.03em',color:'#1a1a1a',lineHeight:1}}>$179</div>
            <div style={{fontSize:'10px',color:'#aaa',fontFamily:'var(--font-inter),sans-serif'}}>CAD · member rate</div>
          </div>
        </div>
      </div>

      <div style={{marginBottom:'1.25rem'}}>
        <PaymentElement options={{layout:'tabs',wallets:{applePay:'auto',googlePay:'auto'}}} />
      </div>

      {error && (
        <div style={{display:'flex',gap:'0.4rem',padding:'0.65rem 0.85rem',background:'rgba(208,96,112,0.06)',border:'0.5px solid rgba(208,96,112,0.25)',marginBottom:'1rem'}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d06070" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,marginTop:'1px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{fontSize:'12px',color:'#d06070',lineHeight:'1.5',fontFamily:'var(--font-inter),sans-serif'}}>{error}</span>
        </div>
      )}

      <button type="submit" disabled={!stripe || paying}
        style={{width:'100%',padding:'0.9rem',background:paying?'#2a4f20':'#0F1E14',border:'none',color:'#F5F1EC',fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:'600',cursor:paying?'wait':'pointer',fontFamily:'var(--font-inter),sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',marginBottom:'0.75rem',transition:'background 0.2s'}}>
        {paying ? (
          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Processing…</>
        ) : (
          <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Authorize $179 CAD · 2 people per car</>
        )}
      </button>

      <button type="button" onClick={onBack} disabled={paying}
        style={{background:'none',border:'none',padding:'0.4rem',fontSize:'11px',color:'#aaa',cursor:paying?'not-allowed':'pointer',fontFamily:'var(--font-inter),sans-serif',textDecoration:'underline',textDecorationColor:'rgba(0,0,0,0.15)',textUnderlineOffset:'2px',display:'block',width:'100%',textAlign:'center'}}>
        ← Back to form
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WtetMemberPage() {
  const [profile, setProfile]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [alreadyReg, setAlreadyReg] = useState(false)

  const [form, setForm] = useState({ carYear:'', carMake:'', carModel:'', passengers:'', hasChildren:'', childrenAges:'', source:'', dietary:'', more:'' })
  const [errors, setErrors]         = useState({})
  const [status, setStatus]         = useState(null) // null | 'loading' | 'payment' | 'success' | 'error'
  const [serverError, setServerError] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)

  useEffect(() => {
    // If Stripe redirected back after 3DS authentication, redirect_status=succeeded
    // is in the URL but the page has reloaded with no payment state — detect and recover.
    const params = new URLSearchParams(window.location.search)
    const redirectStatus = params.get('redirect_status')
    if (redirectStatus === 'succeeded') {
      setStatus('success')
      window.history.replaceState({}, '', window.location.pathname)
    }

    Promise.all([
      fetch('/api/member/me').then(r => r.ok ? r.json() : null),
      fetch('/api/wtet-member-register').then(r => r.ok ? r.json() : null),
    ]).then(([meData, regData]) => {
      if (meData?.member) {
        const m = meData.member
        setProfile({ name: m.name, email: meData.user?.email })
        setForm(f => ({
          ...f,
          carYear:  m.car_year  || '',
          carMake:  m.car_make  || '',
          carModel: m.car_model ? m.car_model.replace(new RegExp(`^${m.car_make}\\s*`, 'i'), '').trim() : '',
        }))
      }
      if (regData?.alreadyRegistered) setAlreadyReg(true)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function update(field, value) {
    if (field === 'carModel') value = value.replace(/(^|\s)\S/g, c => c.toUpperCase())
    setForm(p => {
      const next = { ...p, [field]: value }
      if (field === 'hasChildren' && value === 'no') next.childrenAges = ''
      return next
    })
    if (errors[field]) setErrors(p => ({ ...p, [field]: false }))
    if (serverError) setServerError(null)
  }

  function validate() {
    const e = {}
    if (!form.carYear)        e.carYear     = true
    if (!form.carMake)        e.carMake     = true
    if (!form.carModel.trim()) e.carModel   = true
    if (!form.passengers)     e.passengers  = true
    if (!form.hasChildren)    e.hasChildren = true
    if (form.hasChildren === 'yes' && !form.childrenAges.trim()) e.childrenAges = true
    if (!form.source)         e.source      = true
    setErrors(e)
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'loading') return
    const errs = validate()
    if (Object.keys(errs).length) {
      const first = ['carYear','carMake','carModel','passengers','hasChildren','childrenAges','source'].find(f => errs[f])
      if (first) document.getElementById(`wtet-mem-${first}`)?.scrollIntoView({ behavior:'smooth', block:'center' })
      return
    }
    setStatus('loading'); setServerError(null)
    try {
      const res = await fetch('/api/wtet-member-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, carModel: [form.carMake, form.carModel].filter(Boolean).join(' '), source: form.source, dietary: form.dietary }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setServerError(data.error || 'Something went wrong.'); setStatus('error'); return }
      setClientSecret(data.clientSecret)
      setStatus('payment')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setServerError('Network error. Please try again.'); setStatus('error')
    }
  }

  if (loading) {
    return <div style={{padding:'3rem 0',textAlign:'center',fontSize:'13px',color:'#bbb',fontFamily:'var(--font-inter),sans-serif'}}>Loading…</div>
  }

  // Already registered
  if (alreadyReg) {
    return (
      <div style={{maxWidth:'540px'}}>
        <header style={{marginBottom:'2.5rem',paddingBottom:'1.5rem',borderBottom:'0.5px solid rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:'9px',letterSpacing:'0.38em',textTransform:'uppercase',color:'#c5a882',marginBottom:'0.75rem',fontFamily:'var(--font-inter),sans-serif'}}>July 5, 2026</div>
          <h1 style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(2rem,4vw,2.6rem)',fontWeight:'300',color:'#1a1a1a',lineHeight:1.05,margin:0}}>Whips to Eastern Townships</h1>
        </header>
        <div style={{padding:'1.5rem',background:'rgba(59,107,47,0.06)',border:'0.5px solid rgba(59,107,47,0.25)',marginBottom:'1.5rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.5rem'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{fontSize:'13px',fontWeight:'500',color:'#3B6B2F',fontFamily:'var(--font-inter),sans-serif'}}>You&apos;re already registered</span>
          </div>
          <p style={{fontSize:'13px',color:'#555',lineHeight:'1.65',margin:0,fontFamily:'var(--font-inter),sans-serif'}}>
            We have your registration on file. Your authorization hold is placed and we&apos;ll be in touch with confirmation details before July 5.
          </p>
        </div>
        <Link href="/members/events" style={{fontSize:'11px',letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',textDecoration:'none',fontFamily:'var(--font-inter),sans-serif'}}>← Back to Events</Link>
      </div>
    )
  }

  // Success
  if (status === 'success') {
    return (
      <div style={{maxWidth:'540px'}}>
        <header style={{marginBottom:'2.5rem',paddingBottom:'1.5rem',borderBottom:'0.5px solid rgba(0,0,0,0.07)'}}>
          <div style={{fontSize:'9px',letterSpacing:'0.38em',textTransform:'uppercase',color:'#c5a882',marginBottom:'0.75rem',fontFamily:'var(--font-inter),sans-serif'}}>July 5, 2026</div>
          <h1 style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(2rem,4vw,2.6rem)',fontWeight:'300',color:'#1a1a1a',lineHeight:1.05,margin:0}}>Authorization received.</h1>
        </header>
        <p style={{fontSize:'14px',color:'#555',lineHeight:'1.75',marginBottom:'1rem',fontFamily:'var(--font-inter),sans-serif'}}>
          Your $179 hold is placed — your card has not been charged. We&apos;ll review your registration and be in touch at <strong style={{color:'#1a1a1a',fontWeight:'500'}}>{profile?.email}</strong>.
        </p>
        <p style={{fontSize:'13px',color:'#888',lineHeight:'1.7',marginBottom:'2rem',fontFamily:'var(--font-inter),sans-serif'}}>
          Once confirmed, the charge goes through and you&apos;ll receive full event details. If we can&apos;t place you, the hold is released with no charge.
        </p>
        <Link href="/members/events" style={{fontSize:'11px',letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',textDecoration:'none',fontFamily:'var(--font-inter),sans-serif'}}>← Back to Events</Link>
      </div>
    )
  }

  return (
    <div style={{maxWidth:'640px'}}>
      {/* Header */}
      <header style={{marginBottom:'2rem',paddingBottom:'1.5rem',borderBottom:'0.5px solid rgba(0,0,0,0.07)'}}>
        <div style={{fontSize:'9px',letterSpacing:'0.38em',textTransform:'uppercase',color:'#c5a882',marginBottom:'0.75rem',fontFamily:'var(--font-inter),sans-serif'}}>Canvas Routes · Sunday, July 5, 2026</div>
        <h1 style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(2rem,4vw,2.8rem)',fontWeight:'300',color:'#1a1a1a',lineHeight:1.05,margin:'0 0 0.5rem'}}>Whips to Eastern Townships</h1>
        <p style={{fontSize:'13px',color:'#888',margin:0,fontFamily:'var(--font-inter),sans-serif'}}>Montreal → Lac Memphrémagog</p>
      </header>

      {/* Event info — only shown when not at payment step */}
      {status !== 'payment' && !alreadyReg && (
        <>
          {/* Description */}
          <p style={{fontSize:'14px',color:'#444',lineHeight:'1.85',marginBottom:'1.75rem',fontFamily:'var(--font-inter),sans-serif'}}>
            Backroads through wine country, a private winery experience at Vignoble Domaine du Brésée in Dunham, Chemin des Cantons through the Sutton Mountains, and a curated premium lunch to close the day. One of the best drives in Quebec.
          </p>

          {/* Route stops */}
          <div style={{marginBottom:'1.75rem',border:'0.5px solid rgba(0,0,0,0.09)',background:'#fff'}}>
            <div style={{padding:'0.85rem 1.25rem',borderBottom:'0.5px solid rgba(0,0,0,0.06)',fontSize:'9px',letterSpacing:'0.22em',textTransform:'uppercase',color:'#aaa',fontFamily:'var(--font-inter),sans-serif'}}>Route highlights</div>
            {[
              { label:'Meetup',             loc:'Quartier Dix 30, Brossard' },
              { label:'Winery Experience',  loc:'Vignoble Domaine du Brésée, Dunham' },
              { label:'Chemin des Cantons', loc:'Sutton → Glen Sutton → Highwater' },
              { label:'Through the Ridge',  loc:'Austin → Magog' },
              { label:'Premium Lunch',      loc:'Magog region — location TBD' },
            ].map(({ label, loc }, i, arr) => (
              <div key={i} style={{display:'flex',gap:'1rem',padding:'0.85rem 1.25rem',borderBottom:i<arr.length-1?'0.5px solid rgba(0,0,0,0.05)':'none',alignItems:'baseline'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'rgba(197,168,130,0.5)',flexShrink:0,marginTop:'5px'}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:'11px',fontWeight:'500',color:'#1a1a1a',letterSpacing:'0.02em',fontFamily:'var(--font-inter),sans-serif'}}>{label}</div>
                  <div style={{fontSize:'11px',color:'#aaa',marginTop:'1px',fontFamily:'var(--font-inter),sans-serif'}}>{loc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Included */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.75rem'}}>
            <div style={{border:'0.5px solid rgba(0,0,0,0.09)',padding:'1rem 1.25rem',background:'#fff'}}>
              <div style={{fontSize:'9px',letterSpacing:'0.2em',textTransform:'uppercase',color:'#c5a882',marginBottom:'0.85rem',fontFamily:'var(--font-inter),sans-serif'}}>Included</div>
              {['Winery tasting at Domaine du Brésée','Curated premium lunch','Guided convoy the full route','Access to private route itinerary'].map((item,i) => (
                <div key={i} style={{display:'flex',gap:'0.5rem',alignItems:'flex-start',marginBottom:'0.55rem'}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0,marginTop:'2px'}}><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{fontSize:'12px',color:'#555',lineHeight:'1.55',fontFamily:'var(--font-inter),sans-serif'}}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{border:'0.5px solid rgba(0,0,0,0.09)',padding:'1rem 1.25rem',background:'#fff'}}>
              <div style={{fontSize:'9px',letterSpacing:'0.2em',textTransform:'uppercase',color:'#aaa',marginBottom:'0.85rem',fontFamily:'var(--font-inter),sans-serif'}}>Not included</div>
              {['Gas for your car','Additional purchases at stops'].map((item,i) => (
                <div key={i} style={{display:'flex',gap:'0.5rem',alignItems:'flex-start',marginBottom:'0.55rem'}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,marginTop:'2px'}}><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{fontSize:'12px',color:'#aaa',lineHeight:'1.55',fontFamily:'var(--font-inter),sans-serif'}}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 1.25rem',border:'0.5px solid rgba(197,168,130,0.35)',background:'rgba(197,168,130,0.04)',marginBottom:'2rem',flexWrap:'wrap',gap:'0.5rem'}}>
            <div>
              <div style={{fontSize:'9px',letterSpacing:'0.2em',textTransform:'uppercase',color:'#c5a882',marginBottom:'0.2rem',fontFamily:'var(--font-inter),sans-serif'}}>Member rate</div>
              <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'2rem',color:'#1a1a1a',lineHeight:1,letterSpacing:'0.03em'}}>$179 <span style={{fontSize:'1rem',fontFamily:'var(--font-inter),sans-serif',color:'#aaa',letterSpacing:0}}>CAD · per car · up to 2 people</span></div>
            </div>
            <div style={{fontSize:'11px',color:'#888',fontFamily:'var(--font-inter),sans-serif',maxWidth:'180px',lineHeight:'1.5',textAlign:'right'}}>Authorization hold — nothing charged until your spot is confirmed</div>
          </div>

          {/* Section divider */}
          <div style={{borderTop:'0.5px solid rgba(0,0,0,0.07)',marginBottom:'2rem',paddingTop:'2rem'}}>
            <div style={{fontSize:'9px',letterSpacing:'0.28em',textTransform:'uppercase',color:'#999',fontFamily:'var(--font-inter),sans-serif'}}>Register your spot</div>
          </div>
        </>
      )}

      {/* Payment step */}
      {status === 'payment' && clientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme:'stripe', variables:{ colorPrimary:'#0F1E14', fontFamily:'var(--font-inter), sans-serif', borderRadius:'0px' } } }}>
          <PaymentStep email={profile?.email || ''} onSuccess={() => setStatus('success')} onBack={() => { setStatus(null); setClientSecret(null) }} />
        </Elements>
      )}

      {/* Registration form */}
      {status !== 'payment' && (
        <form onSubmit={handleSubmit} noValidate>

          {/* Who's registering */}
          {profile && (
            <div style={{padding:'0.85rem 1rem',background:'rgba(0,0,0,0.03)',border:'0.5px solid rgba(0,0,0,0.08)',marginBottom:'1.5rem'}}>
              <div style={{fontSize:'10px',letterSpacing:'0.14em',textTransform:'uppercase',color:'#bbb',marginBottom:'0.35rem',fontFamily:'var(--font-inter),sans-serif'}}>Registering as</div>
              <div style={{fontSize:'14px',color:'#1a1a1a',fontWeight:'500',fontFamily:'var(--font-inter),sans-serif'}}>{profile.name}</div>
              <div style={{fontSize:'12px',color:'#999',fontFamily:'var(--font-inter),sans-serif'}}>{profile.email}</div>
            </div>
          )}

          {/* Car */}
          <div style={{fontSize:'10px',letterSpacing:'0.18em',textTransform:'uppercase',color:'#888',marginBottom:'0.85rem',fontFamily:'var(--font-inter),sans-serif'}}>Your car</div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
            <div>
              <label style={LABEL} htmlFor="wtet-mem-carYear">Year *</label>
              <div style={{position:'relative'}}>
                <select id="wtet-mem-carYear" value={form.carYear} onChange={e => update('carYear', e.target.value)}
                  style={{...sel,border:`0.5px solid ${errors.carYear?'#d06070':'rgba(0,0,0,0.16)'}`}}>
                  <option value="">Year</option>
                  {CAR_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select><Chevron />
              </div>
              {errors.carYear && <span style={{fontSize:'11px',color:'#d06070'}}>Required</span>}
            </div>
            <div>
              <label style={LABEL} htmlFor="wtet-mem-carMake">Make *</label>
              <div style={{position:'relative'}}>
                <select id="wtet-mem-carMake" value={form.carMake} onChange={e => update('carMake', e.target.value)}
                  style={{...sel,border:`0.5px solid ${errors.carMake?'#d06070':'rgba(0,0,0,0.16)'}`}}>
                  <option value="">Make</option>
                  {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                </select><Chevron />
              </div>
              {errors.carMake && <span style={{fontSize:'11px',color:'#d06070'}}>Required</span>}
            </div>
          </div>

          <div style={{marginBottom:'1.5rem'}}>
            <label style={LABEL} htmlFor="wtet-mem-carModel">Model *</label>
            <input id="wtet-mem-carModel" type="text" value={form.carModel} onChange={e => update('carModel', e.target.value)}
              placeholder="e.g. 911 Carrera S"
              style={{...inp,border:`0.5px solid ${errors.carModel?'#d06070':'rgba(0,0,0,0.16)'}`}} />
            {errors.carModel && <span style={{fontSize:'11px',color:'#d06070'}}>Required</span>}
          </div>

          {/* Passengers */}
          <div style={{marginBottom:'1rem'}}>
            <label style={LABEL} htmlFor="wtet-mem-passengers">Passengers (including driver) *</label>
            <div style={{position:'relative'}}>
              <select id="wtet-mem-passengers" value={form.passengers} onChange={e => update('passengers', e.target.value)}
                style={{...sel,border:`0.5px solid ${errors.passengers?'#d06070':'rgba(0,0,0,0.16)'}`}}>
                <option value="">Select</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4+">4+</option>
              </select><Chevron />
            </div>
            {errors.passengers && <span style={{fontSize:'11px',color:'#d06070'}}>Required</span>}
            {(form.passengers === '3' || form.passengers === '4+') && (
              <div style={{marginTop:'0.5rem',padding:'0.6rem 0.85rem',background:'rgba(197,168,130,0.07)',border:'0.5px solid rgba(197,168,130,0.25)',fontSize:'12px',color:'#7B5B2E',lineHeight:'1.6',fontFamily:'var(--font-inter),sans-serif'}}>
                Base price covers 2 people. Additional passengers are subject to an extra charge — details will be confirmed with your registration.
              </div>
            )}
          </div>

          {/* Children */}
          <div style={{marginBottom:'1rem'}}>
            <div id="wtet-mem-hasChildren" style={{...LABEL,marginBottom:'0.65rem'}}>Any children attending? *</div>
            <div style={{display:'flex',gap:'0.75rem'}}>
              {['Yes','No'].map(v => {
                const val = v.toLowerCase(), sel2 = form.hasChildren === val
                return (
                  <button key={v} type="button" onClick={() => update('hasChildren', val)}
                    style={{flex:1,padding:'0.75rem',border:`0.5px solid ${sel2?'#3B6B2F':errors.hasChildren?'#d06070':'rgba(0,0,0,0.16)'}`,background:sel2?'rgba(59,107,47,0.06)':'#fff',cursor:'pointer',fontFamily:'var(--font-inter),sans-serif',fontSize:'13px',color:sel2?'#3B6B2F':'#555',transition:'all 0.15s'}}>
                    {v}
                  </button>
                )
              })}
            </div>
            {errors.hasChildren && <span style={{fontSize:'11px',color:'#d06070'}}>Required</span>}
            {form.hasChildren === 'yes' && (
              <div style={{marginTop:'0.65rem',padding:'0.65rem 0.85rem',background:'rgba(197,168,130,0.07)',border:'0.5px solid rgba(197,168,130,0.25)',fontSize:'12px',color:'#7B5B2E',lineHeight:'1.6',fontFamily:'var(--font-inter),sans-serif'}}>
                Each child attending is an additional charge. We&apos;ll reach out with details after registration.
              </div>
            )}
          </div>

          {form.hasChildren === 'yes' && (
            <div style={{marginBottom:'1rem'}}>
              <label style={LABEL} htmlFor="wtet-mem-childrenAges">Ages of children *</label>
              <input id="wtet-mem-childrenAges" type="text" placeholder="e.g. 4, 7, 12" value={form.childrenAges}
                onChange={e => update('childrenAges', e.target.value)}
                style={{...inp,border:`0.5px solid ${errors.childrenAges?'#d06070':'rgba(0,0,0,0.16)'}`}} />
              {errors.childrenAges && <span style={{fontSize:'11px',color:'#d06070'}}>Please enter the ages</span>}
            </div>
          )}

          {/* Source */}
          <div style={{marginBottom:'1rem'}}>
            <label style={LABEL} htmlFor="wtet-mem-source">How did you hear about this drive? *</label>
            <div style={{position:'relative'}}>
              <select id="wtet-mem-source" value={form.source} onChange={e => update('source', e.target.value)}
                style={{...sel,border:`0.5px solid ${errors.source?'#d06070':'rgba(0,0,0,0.16)'}`}}>
                <option value="">Select an option</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Friend / Word of mouth">Friend / Word of mouth</option>
                <option value="Members portal">Members portal</option>
                <option value="Email">Email</option>
                <option value="Other">Other</option>
              </select><Chevron />
            </div>
            {errors.source && <span style={{fontSize:'11px',color:'#d06070'}}>Required</span>}
          </div>

          {/* Dietary */}
          <div style={{marginBottom:'1rem'}}>
            <label style={LABEL} htmlFor="wtet-mem-dietary">Dietary restrictions <span style={{textTransform:'none',letterSpacing:0,opacity:0.6}}>(optional — for the lunch)</span></label>
            <input id="wtet-mem-dietary" type="text" placeholder="e.g. vegetarian, gluten-free, none" value={form.dietary}
              onChange={e => update('dietary', e.target.value)} maxLength={200}
              style={inp} />
          </div>

          {/* More */}
          <div style={{marginBottom:'1.75rem'}}>
            <label style={LABEL} htmlFor="wtet-mem-more">Anything else <span style={{textTransform:'none',letterSpacing:0,opacity:0.6}}>(optional)</span></label>
            <textarea id="wtet-mem-more" value={form.more} onChange={e => update('more', e.target.value)}
              rows={3} maxLength={400} placeholder="Anything you'd like us to know about your car or your passengers."
              style={{...inp,resize:'vertical',lineHeight:'1.6'}} />
          </div>

          {serverError && (
            <div style={{padding:'0.65rem 0.85rem',background:'rgba(208,96,112,0.06)',border:'0.5px solid rgba(208,96,112,0.2)',marginBottom:'1rem',fontSize:'13px',color:'#d06070',fontFamily:'var(--font-inter),sans-serif'}}>
              {serverError}
            </div>
          )}

          <button type="submit" disabled={status === 'loading'}
            style={{width:'100%',padding:'0.9rem',background:'#0F1E14',border:'none',color:'#F5F1EC',fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',cursor:status==='loading'?'wait':'pointer',fontFamily:'var(--font-inter),sans-serif',fontWeight:'600',opacity:status==='loading'?0.7:1}}>
            {status === 'loading' ? 'Setting up payment…' : 'Continue to payment — $179'}
          </button>

          <p style={{fontSize:'11px',color:'#bbb',textAlign:'center',marginTop:'0.85rem',lineHeight:'1.6',fontFamily:'var(--font-inter),sans-serif'}}>
            Your card is authorized, not charged. Spot confirmed by the team before payment is captured.
          </p>
        </form>
      )}
    </div>
  )
}
