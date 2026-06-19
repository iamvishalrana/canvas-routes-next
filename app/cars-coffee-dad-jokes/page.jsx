'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import SiteFooter from '../../components/SiteFooter'

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

const COUNTRY_CODES = ['+1','+7','+20','+27','+30','+31','+32','+33','+34','+36','+39','+40','+41','+43','+44','+45','+46','+47','+48','+49','+51','+52','+54','+55','+56','+57','+58','+60','+61','+62','+63','+64','+65','+66','+81','+82','+84','+86','+90','+91','+92','+94','+351','+352','+353','+358','+380','+420','+852','+886','+961','+962','+965','+966','+968','+971','+972','+973','+974']

const SOURCES = ['Instagram','Facebook','Friend / Word of mouth','Google','Other']

const YEARS = Array.from({ length: 60 }, (_, i) => String(new Date().getFullYear() - i))
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1))
const DOB_YEARS = Array.from({ length: 85 }, (_, i) => String(2009 - i))

function Chevron() {
  return (
    <svg style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function inp(focused, filled, error) {
  if (error)  return { border: '1px solid #7B2032', background: 'rgba(123,32,50,0.03)' }
  if (filled) return { border: '1px solid #3B6B2F', background: 'rgba(59,107,47,0.04)' }
  if (focused)return { border: '1px solid #c5a882', background: 'transparent', boxShadow: '0 0 0 3px rgba(197,168,130,0.15)' }
  return { border: '1px solid rgba(0,0,0,0.18)', background: 'transparent' }
}

const base = {
  width: '100%', boxSizing: 'border-box', padding: '0.85rem 1rem',
  fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', borderRadius: 0, transition: 'border-color 0.15s, box-shadow 0.15s',
  appearance: 'none', WebkitAppearance: 'none',
}

export default function CCDPage() {
  const [form, setForm] = useState({ name:'', email:'', year:'', carMake:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'' })
  const [countryCode, setCountryCode] = useState('+1')
  const [phoneOptOut, setPhoneOptOut] = useState(false)
  const [focused, setFocused] = useState(null)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // null | 'loading' | 'success'
  const [serverError, setServerError] = useState(null)
  const honeypotRef = useRef(null)

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

  async function handleSubmit(e) {
    e.preventDefault()
    const newErrors = {}
    if (!form.name.trim() || form.name.trim().length < 2) newErrors.name = true
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = true
    if (!form.year) newErrors.year = true
    if (!form.carMake) newErrors.carMake = true
    if (!form.carModel.trim()) newErrors.carModel = true
    if (!form.dob_month) newErrors.dob_month = true
    if (!form.dob_day) newErrors.dob_day = true
    if (!phoneOptOut && !form.phone.trim()) newErrors.phone = true
    if (!form.source) newErrors.source = true

    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      const first = ['name','email','year','carMake','carModel','dob_month','dob_day','phone','source'].find(f => newErrors[f])
      if (first) document.getElementById(`ccd-${first}`)?.scrollIntoView({ behavior:'smooth', block:'center' })
      return
    }

    setStatus('loading')
    setServerError(null)
    try {
      const res = await fetch('/api/ccd-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          year: form.year,
          carMake: form.carMake,
          carModel: form.carModel.trim(),
          phone: !phoneOptOut && form.phone.trim() ? `${countryCode} ${form.phone.trim()}` : '',
          instagram: form.instagram.trim().replace(/^@+/,'') || '',
          dob_month: form.dob_month || '',
          dob_day: form.dob_day || '',
          dob_year: form.dob_year || '',
          more: form.more.trim() || '',
          source: form.source,
          _hp: honeypotRef.current?.value || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setServerError(data.error || 'Something went wrong. Please try again.'); setStatus(null); return }
      setStatus('success')
    } catch {
      setServerError('Network error. Please check your connection and try again.')
      setStatus(null)
    }
  }

  return (
    <>
      {/* ── Nav ── */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.9rem 2rem', background:'#0F1E14', borderBottom:'0.5px solid rgba(197,168,130,0.12)' }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" style={{ height:'72px', width:'auto', display:'block' }} />
        </Link>
        <Link href="/" style={{ fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(245,241,236,0.55)', textDecoration:'none', fontFamily:'var(--font-inter), sans-serif' }}>
          ← Back to site
        </Link>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background:'#0F1E14', paddingTop:'72px' }}>
        <div style={{ maxWidth:'520px', margin:'0 auto', padding:'3rem 1.5rem 0' }}>
          <Image
            src="/CCD.png"
            alt="Cars, Coffee & Dad Jokes — Father's Day Weekend Special, June 20 at Cafe Napoleon"
            width={1254}
            height={1254}
            style={{ width:'100%', height:'auto', display:'block' }}
            priority
          />
        </div>
        {/* Event detail bar */}
        <div style={{ borderTop:'0.5px solid rgba(197,168,130,0.15)', padding:'1.5rem 2rem' }}>
          <div style={{ maxWidth:'520px', margin:'0 auto', display:'flex', flexWrap:'wrap', gap:'1rem', justifyContent:'center' }}>
            {[
              { label:'Date',     value:'Saturday, June 20' },
              { label:'Time',     value:'9:00 AM – 11:30 AM' },
              { label:'Venue',    value:'Cafe Napoleon, LaSalle' },
              { label:'Entry',    value:'Invite only' },
              { label:'Cost',     value:'Free' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign:'center', minWidth:'110px' }}>
                <div style={{ fontSize:'9px', letterSpacing:'0.2em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.3rem' }}>{label}</div>
                <div style={{ fontSize:'13px', color:'#F5F1EC', fontFamily:'var(--font-inter), sans-serif' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div style={{ background:'#F5F1EC', padding:'5rem 1.5rem 6rem' }}>
        <div style={{ maxWidth:'520px', margin:'0 auto' }}>

          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div style={{ width:'1px', height:'52px', background:'#c5a882', margin:'0 auto 1.75rem' }} />
            <div style={{ fontSize:'10px', letterSpacing:'0.28em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter), sans-serif', marginBottom:'1rem' }}>
              Father&apos;s Day Weekend · June 20
            </div>
            <h1 style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'clamp(2.2rem,6vw,3rem)', fontWeight:'300', color:'#1a1a1a', lineHeight:1.1, marginBottom:'1.25rem' }}>
              Request your spot.
            </h1>
            <p style={{ fontSize:'14px', color:'#666', lineHeight:1.8, fontFamily:'var(--font-inter), sans-serif', maxWidth:'380px', margin:'0 auto 1rem' }}>
              Entry is invite-only and completely free. Fill in your details below and we&apos;ll follow up with confirmation before the event.
            </p>
            <div style={{ display:'inline-block', fontSize:'11px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#3B6B2F', border:'0.5px solid rgba(59,107,47,0.35)', background:'rgba(59,107,47,0.06)', padding:'4px 14px', fontFamily:'var(--font-inter), sans-serif' }}>
              No cost to attend
            </div>
          </div>

          {status === 'success' ? (
            <div style={{ textAlign:'center', padding:'3rem 2rem', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)' }}>
              <div style={{ width:'1px', height:'40px', background:'#c5a882', margin:'0 auto 1.5rem' }} />
              <div style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'2.2rem', fontWeight:'300', color:'#1a1a1a', marginBottom:'0.75rem' }}>
                You&apos;re registered.
              </div>
              <p style={{ fontSize:'13px', color:'#666', lineHeight:1.8, fontFamily:'var(--font-inter), sans-serif', marginBottom:'1rem', maxWidth:'360px', margin:'0 auto 1rem' }}>
                We&apos;ve got your details. Check your inbox for a confirmation — we&apos;ll follow up with everything you need before June 20.
              </p>
              <p style={{ fontSize:'12px', color:'#aaa', lineHeight:1.7, fontFamily:'var(--font-inter), sans-serif', marginBottom:'2.5rem', maxWidth:'320px', margin:'0 auto 2.5rem' }}>
                If you don&apos;t see it, check your junk or spam folder and mark it as not spam so our follow-up reaches you.
              </p>
              <div style={{ width:'40px', height:'0.5px', background:'rgba(197,168,130,0.4)', margin:'0 auto 2rem' }} />
              <div style={{ fontSize:'9px', letterSpacing:'0.22em', textTransform:'uppercase', color:'#c5a882', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.75rem' }}>
                While you wait
              </div>
              <div style={{ fontFamily:'var(--font-cormorant), serif', fontSize:'1.5rem', fontWeight:'300', color:'#1a1a1a', lineHeight:1.2, marginBottom:'0.75rem' }}>
                Canvas Routes Membership
              </div>
              <p style={{ fontSize:'13px', color:'#666', lineHeight:1.75, fontFamily:'var(--font-inter), sans-serif', maxWidth:'340px', margin:'0 auto 1rem' }}>
                Road trips, invite-only meets, and partner perks — built for drivers who love the road.
              </p>
              <p style={{ fontSize:'12px', color:'#666', lineHeight:1.7, fontFamily:'var(--font-inter), sans-serif', maxWidth:'340px', margin:'0 auto 1.25rem' }}>
                As a thank-you for coming out, use code{' '}
                <span style={{ fontFamily:'var(--font-inter), sans-serif', letterSpacing:'0.12em', color:'#0F1E14', fontWeight:'500', background:'rgba(197,168,130,0.15)', padding:'2px 8px', border:'0.5px solid rgba(197,168,130,0.4)' }}>FOUNDING</span>
                {' '}for a special discount when you apply for membership.
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
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* Honeypot */}
              <input ref={honeypotRef} type="text" name="_hp" style={{ display:'none' }} tabIndex={-1} autoComplete="off" />

              {/* Name */}
              <div>
                <label htmlFor="ccd-name" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.name ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Full Name <span style={{ color:'#d06070' }}>*</span></label>
                <input
                  id="ccd-name" type="text" autoComplete="name"
                  value={form.name} onChange={e => update('name', e.target.value)}
                  onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                  style={{ ...base, ...inp(focused==='name', !!form.name, errors.name) }}
                  placeholder="Your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="ccd-email" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.email ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Email <span style={{ color:'#d06070' }}>*</span></label>
                <input
                  id="ccd-email" type="email" autoComplete="email"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  value={form.email} onChange={e => update('email', e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  style={{ ...base, ...inp(focused==='email', !!form.email, errors.email) }}
                  placeholder="your@email.com"
                />
              </div>

              {/* Car year + make */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:'0.75rem' }}>
                <div>
                  <label htmlFor="ccd-year" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.year ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Year <span style={{ color:'#d06070' }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <select
                      id="ccd-year"
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
                  <label htmlFor="ccd-carMake" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.carMake ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Make <span style={{ color:'#d06070' }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <select
                      id="ccd-carMake"
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

              {/* Car model */}
              <div>
                <label htmlFor="ccd-carModel" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.carModel ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Model <span style={{ color:'#d06070' }}>*</span></label>
                <input
                  id="ccd-carModel" type="text"
                  value={form.carModel} onChange={e => update('carModel', e.target.value)}
                  onFocus={() => setFocused('carModel')} onBlur={() => setFocused(null)}
                  style={{ ...base, ...inp(focused==='carModel', !!form.carModel, errors.carModel) }}
                  placeholder="e.g. M3 Competition"
                />
              </div>

              {/* Date of birth */}
              <div>
                <div style={{ fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: (errors.dob_month || errors.dob_day) ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>
                  Date of Birth <span style={{ color:'#d06070' }}>*</span> <span style={{ color:'#bbb', textTransform:'none', letterSpacing:0, fontSize:'9px' }}>(year optional)</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 1.2fr', gap:'0.75rem' }}>
                  <div style={{ position:'relative' }}>
                    <select
                      id="ccd-dob_month"
                      value={form.dob_month} onChange={e => update('dob_month', e.target.value)}
                      onFocus={() => setFocused('dob_month')} onBlur={() => setFocused(null)}
                      style={{ ...base, ...inp(focused==='dob_month', !!form.dob_month, errors.dob_month), paddingRight:'2rem', cursor:'pointer' }}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m, i) => <option key={m} value={String(i+1)}>{m}</option>)}
                    </select>
                    <Chevron />
                  </div>
                  <div style={{ position:'relative' }}>
                    <select
                      id="ccd-dob_day"
                      value={form.dob_day} onChange={e => update('dob_day', e.target.value)}
                      onFocus={() => setFocused('dob_day')} onBlur={() => setFocused(null)}
                      style={{ ...base, ...inp(focused==='dob_day', !!form.dob_day, errors.dob_day), paddingRight:'2rem', cursor:'pointer' }}
                    >
                      <option value="">Day</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <Chevron />
                  </div>
                  <div style={{ position:'relative' }}>
                    <select
                      id="ccd-dob_year"
                      value={form.dob_year} onChange={e => update('dob_year', e.target.value)}
                      onFocus={() => setFocused('dob_year')} onBlur={() => setFocused(null)}
                      style={{ ...base, ...inp(focused==='dob_year', !!form.dob_year, false), paddingRight:'2rem', cursor:'pointer' }}
                    >
                      <option value="">Year</option>
                      {DOB_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="ccd-phone" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.phone ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>
                  Phone {phoneOptOut ? <span style={{ color:'#aaa', letterSpacing:0, textTransform:'none' }}>(skipped)</span> : <span style={{ color:'#d06070' }}>*</span>}
                </label>
                {!phoneOptOut && (
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    <div style={{ position:'relative', width:'80px', flexShrink:0 }}>
                      <select
                        value={countryCode} onChange={e => setCountryCode(e.target.value)}
                        onFocus={() => setFocused('cc')} onBlur={() => setFocused(null)}
                        style={{ ...base, ...inp(focused==='cc', true, false), paddingRight:'1.2rem', fontSize:'16px', cursor:'pointer' }}
                      >
                        {COUNTRY_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Chevron />
                    </div>
                    <input
                      id="ccd-phone" type="tel" autoComplete="tel"
                      value={form.phone}
                      onChange={e => update('phone', formatPhone(e.target.value))}
                      onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                      style={{ ...base, ...inp(focused==='phone', !!form.phone, errors.phone), flex:1 }}
                      placeholder="(514) 555-0100"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setPhoneOptOut(p => !p); if (errors.phone) setErrors(p => ({ ...p, phone:false })) }}
                  style={{ marginTop:'0.4rem', background:'none', border:'none', padding:0, fontSize:'11px', color:'#aaa', cursor:'pointer', fontFamily:'var(--font-inter), sans-serif', textDecoration:'underline', textDecorationColor:'rgba(0,0,0,0.2)' }}
                >
                  {phoneOptOut ? 'Add phone number' : "I'd rather not share my number"}
                </button>
              </div>

              {/* Instagram */}
              <div>
                <label htmlFor="ccd-instagram" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color:'#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>Instagram <span style={{ color:'#bbb', textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'#aaa', fontSize:'14px', fontFamily:'var(--font-inter), sans-serif', pointerEvents:'none' }}>@</span>
                  <input
                    id="ccd-instagram" type="text" autoComplete="username"
                    autoCapitalize="none" autoCorrect="off" spellCheck={false}
                    value={form.instagram} onChange={e => update('instagram', e.target.value.replace(/^@+/,''))}
                    onFocus={() => setFocused('instagram')} onBlur={() => setFocused(null)}
                    style={{ ...base, ...inp(focused==='instagram', !!form.instagram, false), paddingLeft:'1.85rem' }}
                    placeholder="yourhandle"
                  />
                </div>
              </div>

              {/* Tell us about yourself */}
              <div>
                <label htmlFor="ccd-more" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color:'#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>
                  Tell us more <span style={{ color:'#bbb', textTransform:'none', letterSpacing:0 }}>(optional)</span>
                </label>
                <textarea
                  id="ccd-more"
                  value={form.more} onChange={e => update('more', e.target.value)}
                  onFocus={() => setFocused('more')} onBlur={() => setFocused(null)}
                  maxLength={500}
                  rows={3}
                  placeholder="Anything else you'd like us to know."
                  style={{ ...base, resize:'vertical', lineHeight:1.65, ...inp(focused==='more', !!form.more, false) }}
                />
              </div>

              {/* Source */}
              <div>
                <label htmlFor="ccd-source" style={{ display:'block', fontSize:'10px', letterSpacing:'0.18em', textTransform:'uppercase', color: errors.source ? '#7B2032' : '#999', fontFamily:'var(--font-inter), sans-serif', marginBottom:'0.4rem' }}>How did you hear about us? <span style={{ color:'#d06070' }}>*</span></label>
                <div style={{ position:'relative' }}>
                  <select
                    id="ccd-source"
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

              {serverError && (
                <p style={{ fontSize:'13px', color:'#7B2032', margin:0, fontFamily:'var(--font-inter), sans-serif' }}>{serverError}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{ marginTop:'0.5rem', width:'100%', padding:'1.1rem', background:'#0F1E14', color:'#F5F1EC', border:'none', fontSize:'10px', letterSpacing:'0.26em', textTransform:'uppercase', cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1, fontFamily:'var(--font-inter), sans-serif', transition:'opacity 0.15s' }}
              >
                {status === 'loading' ? 'Submitting…' : 'Request My Spot'}
              </button>

              <p style={{ textAlign:'center', fontSize:'11px', color:'#bbb', fontFamily:'var(--font-inter), sans-serif', lineHeight:1.6, margin:0 }}>
                Entry is strictly invite-only. Submitting this form is not a guarantee of attendance — we&apos;ll confirm by email.
              </p>
            </form>
          )}
        </div>
      </div>

      <SiteFooter />
    </>
  )
}
