'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import SiteFooter from '../../../components/SiteFooter'
import TermsPrivacyNote from '../../../components/TermsPrivacyNote'

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

const COUNTRY_CODES = ['+1','+7','+20','+27','+30','+31','+32','+33','+34','+36','+39','+40','+41','+43','+44','+45','+46','+47','+48','+49','+51','+52','+54','+55','+56','+57','+58','+60','+61','+62','+63','+64','+65','+66','+81','+82','+84','+86','+90','+91','+92','+94','+351','+352','+353','+358','+380','+420','+852','+886','+961','+962','+965','+966','+968','+971','+972','+973','+974']

const SOURCES = ['Instagram','Facebook','Friend / Word of mouth','Google','Other']

const YEARS = Array.from({ length: 60 }, (_, i) => String(new Date().getFullYear() - i))

function Chevron() {
  return (
    <svg style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function inp(focused, filled, error) {
  if (error)  return { border: '1px solid #93333E', background: 'rgba(147,51,62,0.03)' }
  if (filled) return { border: '1px solid #3B6B2F', background: 'rgba(59,107,47,0.04)' }
  if (focused)return { border: '1px solid #c5a882', background: 'transparent', boxShadow: '0 0 0 3px rgba(197,168,130,0.15)' }
  return { border: '1px solid rgba(0,0,0,0.18)', background: 'transparent' }
}

const base = {
  width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem',
  fontSize: '15px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', borderRadius: 0, transition: 'border-color 0.15s, box-shadow 0.15s',
  appearance: 'none', WebkitAppearance: 'none',
}

// Mirrors the open/not-yet-open/closed gating app/page.jsx's homepage events
// grid and EventRegisterButton already use for events with
// registration_opens_at/registration_closes_at.
function registrationStatus(ev) {
  if (ev.public_registration_enabled === false) return 'closed'
  const now = new Date()
  const opens = ev.registration_opens_at ? new Date(ev.registration_opens_at) : null
  const closes = ev.registration_closes_at ? new Date(ev.registration_closes_at) : null
  if (closes && now > closes) return 'closed'
  if (opens && now < opens) return 'not_yet_open'
  return 'open'
}

export default function MeetRegisterForm({ event }) {
  const status = registrationStatus(event)
  const [form, setForm] = useState({ name:'', email:'', year:'', carMake:'', carModel:'', phone:'', instagram:'', more:'', source:'' })
  const [countryCode, setCountryCode] = useState('+1')
  const [phoneShown, setPhoneShown] = useState(false)
  const [focused, setFocused] = useState(null)
  const [errors, setErrors] = useState({})
  const [formStatus, setFormStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const honeypotRef = useRef(null)

  useEffect(() => {
    fetch('/api/member/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.member) setIsMember(true) })
      .catch(() => {})
  }, [])

  function update(field, value) {
    if (field === 'carModel') value = value.replace(/(^|\s)\S/g, c => c.toUpperCase())
    setForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: false }))
    if (serverError) setServerError(null)
  }

  function formatPhone(v) {
    if (countryCode === '+1') {
      const d = v.replace(/\D/g,'').slice(0,10)
      if (d.length <= 3) return d
      if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`
      return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
    }
    return v.replace(/[^\d\s\-()]/g,'').slice(0,20)
  }

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: event.name, text: `${event.name} — Canvas Routes`, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }).catch(() => {})
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const newErrors = {}
    if (!form.name.trim() || form.name.trim().length < 2) newErrors.name = true
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = true
    if (!form.year) newErrors.year = true
    if (!form.carMake) newErrors.carMake = true
    if (!form.carModel.trim()) newErrors.carModel = true
    if (phoneShown && !form.phone.trim()) newErrors.phone = true
    if (!isMember && !form.source) newErrors.source = true

    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      const first = ['name','email','year','carMake','carModel','phone','source'].find(f => newErrors[f])
      if (first) document.getElementById(`meet-${first}`)?.scrollIntoView({ behavior:'smooth', block:'center' })
      return
    }

    setFormStatus('loading')
    setServerError(null)
    try {
      const res = await fetch(`/api/public/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          year: form.year,
          carMake: form.carMake,
          carModel: form.carModel.trim(),
          phone: phoneShown && form.phone.trim() ? `${countryCode} ${form.phone.trim()}` : '',
          instagram: form.instagram.trim().replace(/^@+/,'') || '',
          more: form.more.trim() || '',
          source: form.source,
          isMember,
          _hp: honeypotRef.current?.value || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setServerError(data.error || 'Something went wrong. Please try again.'); setFormStatus(null); return }
      setFormStatus('success')
    } catch {
      setServerError('Network error. Please check your connection and try again.')
      setFormStatus(null)
    }
  }

  const dateLine = event.date_display || event.date || null

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .meet-submit-wrap { position: fixed; bottom: 0; left: 0; right: 0; padding: 1rem 1.5rem calc(1rem + env(safe-area-inset-bottom)); background: #F5F1EC; border-top: 0.5px solid rgba(0,0,0,0.1); z-index: 50; }
          .meet-form-pad { padding-bottom: calc(5.5rem + env(safe-area-inset-bottom)) !important; }
        }
        input, select, textarea { font-size: 16px !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 2rem', background:'#0F1E14', borderBottom:'0.5px solid rgba(197,168,130,0.12)' }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" style={{ height:'72px', width:'auto', display:'block' }} />
        </Link>
        <Link href="/" style={{ fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(245,241,236,0.55)', textDecoration:'none', fontFamily:'var(--font-inter), sans-serif' }}>
          ← Back to site
        </Link>
      </nav>

      {/* Hero */}
      <div style={{
        background: '#0F1E14', paddingTop:'72px', position:'relative',
        ...(event.photo_url ? {
          backgroundImage: `linear-gradient(180deg, rgba(10,20,12,0.55) 0%, rgba(15,30,20,0.92) 100%), url('${event.photo_url}')`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        } : {}),
      }}>
        <div style={{ borderTop:'0.5px solid rgba(197,168,130,0.15)', padding:'3.5rem 2rem 2rem' }}>
          <div style={{ maxWidth:'520px', margin:'0 auto', textAlign:'center' }}>
            <div style={{ fontSize:'10px', letterSpacing:'0.28em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter), sans-serif', marginBottom:'1rem' }}>
              Canvas Routes
            </div>
            <h1 style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'clamp(2.2rem,6vw,3rem)', fontWeight:'300', color:'#F5F1EC', lineHeight:1.1, marginBottom:'1.25rem' }}>
              {event.name}
            </h1>
            {event.description && (
              <p style={{ fontSize:'14px', color:'rgba(245,241,236,0.65)', lineHeight:1.8, fontFamily:'var(--font-inter), sans-serif', maxWidth:'420px', margin:'0 auto 1.5rem' }}>
                {event.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ borderTop:'0.5px solid rgba(197,168,130,0.15)', padding:'1.5rem 2rem' }}>
          <div style={{ maxWidth:'520px', margin:'0 auto', display:'flex', flexWrap:'wrap', gap:'1rem', justifyContent:'center' }}>
            {[
              dateLine && { label:'Date', value: dateLine },
              event.location && { label:'Venue', value: event.location },
              { label:'Cost', value:'Free' },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} style={{ textAlign:'center', minWidth:'110px' }}>
                <div style={{ fontSize:'9px', letterSpacing:'0.2em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.3rem' }}>{label}</div>
                <div style={{ fontSize:'13px', color:'#F5F1EC', fontFamily:'var(--font-inter), sans-serif' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="meet-form-pad" style={{ background:'#F5F1EC', padding:'5rem 1.5rem 6rem' }}>
        <div style={{ maxWidth:'520px', margin:'0 auto' }}>

          {status !== 'open' ? (
            <div style={{ textAlign:'center', padding:'3rem 2rem', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)' }}>
              <div style={{ width:'1px', height:'40px', background:'#c5a882', margin:'0 auto 1.5rem' }} />
              <div style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'2rem', fontWeight:'300', color:'#1a1a1a', marginBottom:'0.75rem' }}>
                {status === 'not_yet_open' ? 'Registration opens soon.' : 'Registration is closed.'}
              </div>
              <p style={{ fontSize:'13px', color:'#666', lineHeight:1.8, fontFamily:'var(--font-inter), sans-serif', maxWidth:'340px', margin:'0 auto' }}>
                {status === 'not_yet_open'
                  ? "Check back shortly — this page will open up for registration soon."
                  : "This event is no longer taking registrations. Follow Canvas Routes for the next one."}
              </p>
            </div>
          ) : formStatus === 'success' ? (
            <div style={{ textAlign:'center', padding:'3rem 2rem', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)' }}>
              <div style={{ width:'1px', height:'40px', background:'#c5a882', margin:'0 auto 1.5rem' }} />
              <div style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'2.2rem', fontWeight:'300', color:'#1a1a1a', marginBottom:'0.75rem' }}>
                You&apos;re registered.
              </div>
              <p style={{ fontSize:'13px', color:'#666', lineHeight:1.8, fontFamily:'var(--font-inter), sans-serif', maxWidth:'360px', margin:'0 auto 1rem' }}>
                We&apos;ve got your details. Check your inbox for a confirmation — see you at {event.name}.
              </p>
              <p style={{ fontSize:'12px', color:'#aaa', lineHeight:1.7, fontFamily:'var(--font-inter), sans-serif', maxWidth:'320px', margin:'0 auto 2rem' }}>
                If you don&apos;t see it, check your junk folder and mark it as not spam.
              </p>

              <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.07)', paddingTop:'1.75rem', marginBottom:'1.75rem' }}>
                <div style={{ fontSize:'9px', letterSpacing:'0.22em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.6rem' }}>
                  Know someone who drives?
                </div>
                <p style={{ fontSize:'13px', color:'#888', lineHeight:1.7, fontFamily:'var(--font-inter), sans-serif', maxWidth:'300px', margin:'0 auto 1.25rem' }}>
                  If you know someone who&apos;d love this, send them the link.
                </p>
                <button
                  onClick={handleShare}
                  style={{ background: shareCopied ? '#3B6B2F' : '#0F1E14', color:'#F5F1EC', border:'none', padding:'0.85rem 2rem', fontSize:'10px', letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', fontFamily:'var(--font-inter), sans-serif', transition:'background 0.2s' }}
                >
                  {shareCopied ? '✓ Link copied' : 'Share this event →'}
                </button>
              </div>

              {!isMember && (
                <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.07)', paddingTop:'1.75rem' }}>
                  <div style={{ fontSize:'9px', letterSpacing:'0.22em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.75rem' }}>
                    While you wait
                  </div>
                  <div style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'1.5rem', fontWeight:'300', color:'#1a1a1a', lineHeight:1.2, marginBottom:'0.75rem' }}>
                    Canvas Routes Membership
                  </div>
                  <p style={{ fontSize:'13px', color:'#666', lineHeight:1.75, fontFamily:'var(--font-inter), sans-serif', maxWidth:'340px', margin:'0 auto 1.25rem' }}>
                    Curated routes, invite-only meets, and partner perks — built for drivers who love the road.
                  </p>
                  <Link href="/membership" style={{ display:'inline-block', background:'#0F1E14', color:'#F5F1EC', padding:'0.85rem 2.5rem', fontSize:'10px', letterSpacing:'0.22em', textTransform:'uppercase', textDecoration:'none', fontFamily:'var(--font-inter), sans-serif', marginBottom:'1.5rem' }}>
                    Apply for Membership
                  </Link>
                  <div>
                    <Link href="/" style={{ fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'#aaa', textDecoration:'none', fontFamily:'var(--font-inter), sans-serif' }}>
                      Back to Canvas Routes
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ textAlign:'center', marginBottom:'3rem' }}>
                <div style={{ width:'1px', height:'52px', background:'#c5a882', margin:'0 auto 1.75rem' }} />
                <h2 style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'clamp(2rem,5vw,2.6rem)', fontWeight:'300', color:'#1a1a1a', lineHeight:1.1, marginBottom:'1.25rem' }}>
                  Request your spot.
                </h2>
                <p style={{ fontSize:'14px', color:'#666', lineHeight:1.8, fontFamily:'var(--font-inter), sans-serif', maxWidth:'380px', margin:'0 auto 1rem' }}>
                  Fill in your details below and we&apos;ll see you there.
                </p>
                <div style={{ display:'inline-block', fontSize:'11px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#3B6B2F', border:'0.5px solid rgba(59,107,47,0.35)', background:'rgba(59,107,47,0.06)', padding:'4px 14px', fontFamily:'var(--font-inter), sans-serif' }}>
                  No cost to attend
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <input ref={honeypotRef} type="text" name="_hp" style={{ display:'none' }} tabIndex={-1} autoComplete="off" />

                <div>
                  <label htmlFor="meet-name" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.name ? '#93333E' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Full Name <span style={{ color:'#d06070' }}>*</span></label>
                  <input
                    id="meet-name" type="text" autoComplete="name"
                    value={form.name} onChange={e => update('name', e.target.value)}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                    style={{ ...base, ...inp(focused==='name', !!form.name, errors.name) }}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="meet-email" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.email ? '#93333E' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Email <span style={{ color:'#d06070' }}>*</span></label>
                  <input
                    id="meet-email" type="email" autoComplete="email"
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    value={form.email} onChange={e => update('email', e.target.value)}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                    style={{ ...base, ...inp(focused==='email', !!form.email, errors.email) }}
                    placeholder="your@email.com"
                  />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:'0.75rem' }}>
                  <div>
                    <label htmlFor="meet-year" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.year ? '#93333E' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Year <span style={{ color:'#d06070' }}>*</span></label>
                    <div style={{ position:'relative' }}>
                      <select
                        id="meet-year"
                        value={form.year} onChange={e => update('year', e.target.value)}
                        onFocus={() => setFocused('year')} onBlur={() => setFocused(null)}
                        style={{ ...base, ...inp(focused==='year', !!form.year, errors.year), paddingRight:'2rem', cursor:'pointer' }}
                      >
                        <option value="">Year</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <Chevron />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="meet-carMake" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.carMake ? '#93333E' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Make <span style={{ color:'#d06070' }}>*</span></label>
                    <div style={{ position:'relative' }}>
                      <select
                        id="meet-carMake"
                        value={form.carMake} onChange={e => update('carMake', e.target.value)}
                        onFocus={() => setFocused('carMake')} onBlur={() => setFocused(null)}
                        style={{ ...base, ...inp(focused==='carMake', !!form.carMake, errors.carMake), paddingRight:'2rem', cursor:'pointer' }}
                      >
                        <option value="">Make</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <Chevron />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="meet-carModel" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.carModel ? '#93333E' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Model <span style={{ color:'#d06070' }}>*</span></label>
                  <input
                    id="meet-carModel" type="text"
                    value={form.carModel} onChange={e => update('carModel', e.target.value)}
                    onFocus={() => setFocused('carModel')} onBlur={() => setFocused(null)}
                    style={{ ...base, ...inp(focused==='carModel', !!form.carModel, errors.carModel) }}
                    placeholder="e.g. M3 Competition"
                  />
                </div>

                <div>
                  <label htmlFor="meet-instagram" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color:'#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Instagram <span style={{ color:'#bbb', textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'#aaa', fontSize:'14px', fontFamily:'var(--font-inter), sans-serif', pointerEvents:'none' }}>@</span>
                    <input
                      id="meet-instagram" type="text" autoComplete="username"
                      autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      value={form.instagram} onChange={e => update('instagram', e.target.value.replace(/^@+/,''))}
                      onFocus={() => setFocused('instagram')} onBlur={() => setFocused(null)}
                      style={{ ...base, ...inp(focused==='instagram', !!form.instagram, false), paddingLeft:'1.85rem' }}
                      placeholder="yourhandle"
                    />
                  </div>
                </div>

                {phoneShown ? (
                  <div>
                    <label htmlFor="meet-phone" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.phone ? '#93333E' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>
                      Phone <span style={{ color:'#d06070' }}>*</span>
                    </label>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                      <div style={{ position:'relative', width:'80px', flexShrink:0 }}>
                        <select
                          value={countryCode} onChange={e => setCountryCode(e.target.value)}
                          onFocus={() => setFocused('cc')} onBlur={() => setFocused(null)}
                          style={{ ...base, ...inp(focused==='cc', true, false), paddingRight:'1.2rem', fontSize:'15px', cursor:'pointer' }}
                        >
                          {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <Chevron />
                      </div>
                      <input
                        id="meet-phone" type="tel" autoComplete="tel"
                        value={form.phone}
                        onChange={e => update('phone', formatPhone(e.target.value))}
                        onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                        style={{ ...base, ...inp(focused==='phone', !!form.phone, errors.phone), flex:1 }}
                        placeholder="(514) 555-0100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPhoneShown(false); setForm(p => ({ ...p, phone:'' })); setErrors(p => ({ ...p, phone:false })) }}
                      style={{ marginTop:'0.4rem', background:'none', border:'none', padding:0, fontSize:'11px', color:'#aaa', cursor:'pointer', fontFamily:'var(--font-inter), sans-serif', textDecoration:'underline', textDecorationColor:'rgba(0,0,0,0.2)' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setPhoneShown(true)}
                      style={{ background:'none', border:'0.5px solid rgba(0,0,0,0.15)', padding:'0.7rem 1rem', width:'100%', textAlign:'left', fontSize:'13px', color:'#aaa', cursor:'pointer', fontFamily:'var(--font-inter), sans-serif', display:'flex', alignItems:'center', gap:'0.5rem' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add phone number
                      <span style={{ marginLeft:'auto', fontSize:'10px', color:'#c5a882', letterSpacing:'0.06em' }}>helps us reach you directly</span>
                    </button>
                  </div>
                )}

                <div>
                  <label htmlFor="meet-more" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color:'#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>
                    Tell us more <span style={{ color:'#bbb', textTransform:'none', letterSpacing:0 }}>(optional)</span>
                  </label>
                  <textarea
                    id="meet-more"
                    value={form.more} onChange={e => update('more', e.target.value)}
                    onFocus={() => setFocused('more')} onBlur={() => setFocused(null)}
                    maxLength={300}
                    rows={2}
                    placeholder="Anything else you'd like us to know."
                    style={{ ...base, resize:'none', lineHeight:1.65, ...inp(focused==='more', !!form.more, false) }}
                  />
                </div>

                {!isMember && (
                <div>
                  <label htmlFor="meet-source" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.source ? '#93333E' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>How did you hear about us? <span style={{ color:'#d06070' }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <select
                      id="meet-source"
                      value={form.source} onChange={e => update('source', e.target.value)}
                      onFocus={() => setFocused('source')} onBlur={() => setFocused(null)}
                      style={{ ...base, ...inp(focused==='source', !!form.source, errors.source), paddingRight:'2rem', cursor:'pointer' }}
                    >
                      <option value="">Select…</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
                )}

                {serverError && (
                  <p style={{ fontSize:'13px', color:'#93333E', margin:0, fontFamily:'var(--font-inter), sans-serif' }}>{serverError}</p>
                )}

                <div className="meet-submit-wrap">
                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    style={{ width:'100%', padding:'1.1rem', background:'#0F1E14', color:'#F5F1EC', border:'none', fontSize:'10px', letterSpacing:'0.26em', textTransform:'uppercase', cursor: formStatus === 'loading' ? 'not-allowed' : 'pointer', opacity: formStatus === 'loading' ? 0.7 : 1, fontFamily:'var(--font-inter), sans-serif', transition:'opacity 0.15s' }}
                  >
                    {formStatus === 'loading' ? 'Submitting…' : 'Request My Spot'}
                  </button>
                </div>

                <p style={{ textAlign:'center', fontSize:'11px', color:'#bbb', fontFamily:'var(--font-inter), sans-serif', lineHeight:1.6, margin:0 }}>
                  Submitting is not a guarantee of attendance — we&apos;ll confirm by email.
                </p>
                <TermsPrivacyNote style={{ marginTop: '0.5rem' }} />
              </form>
            </>
          )}
        </div>
      </div>

      <SiteFooter />
    </>
  )
}
