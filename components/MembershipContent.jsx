'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── Typography tokens ────────────────────────────────────────────────────────
// LABEL:   Inter 9px / uppercase / 0.28em              → color varies
// BODY:    Inter 13px / 400 / lineHeight 1.85          → #555 or rgba(245,241,236,0.55)
// SMALL:   Inter 11px / 400 / letterSpacing 0.04em     → #aaa
// CARD H:  Cormorant 1.5rem / 300
// SECTION: Cormorant clamp(2rem,4vw,2.8rem) / 300
// HERO:    Cormorant clamp(3.8rem,8vw,6.5rem) / 300
// PRICE:   Cormorant clamp(3.5rem,6vw,4.5rem) / 300
// ────────────────────────────────────────────────────────────────────────────

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']
const SOURCES = ['Instagram','Facebook','Friend / Word of mouth','Google','Other']

const LABEL = { fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }
const BODY  = { fontSize: '14px', lineHeight: '1.85', fontFamily: 'var(--font-inter),sans-serif' }
const SMALL = { fontSize: '13px', letterSpacing: '0.02em', fontFamily: 'var(--font-inter),sans-serif' }

function FadeUp({ children, delay = 0, style, className }) {
  return <div style={style} className={className}>{children}</div>
}

function StaggerGrid({ children, style, className }) {
  return <div style={style} className={className}>{children}</div>
}

const TIER1 = [
  'Access to the Canvas Routes members community — a private group of drivers who chose their car with intention',
  'Priority access to all Cars & Coffee events',
  'Access to Canvas Routes road trips',
  '10% discount on your next road trip when referring a member',
  '25% discount at one Canvas Routes partner',
  'Canvas Routes car perfume — refreshed every 2 months, picked up at any event throughout the season',
  'Canvas Routes full grain leather keychain',
]

const TIER2_EXTRA = [
  'Exclusive 48hr priority access to all Canvas Routes events before public registration opens',
  '25% referral discount when referring a Tier 2 member',
  'Professional car photoshoot on a Canvas Routes road trip',
  '$70 off one of the next two road trips — your membership starts paying for itself from day one',
  'Exclusive discounts from all Canvas Routes partners — new partners added throughout the season',
  'Canvas Routes merchandise baseball cap',
]

const PERKS = [
  { label: 'Leather Keychain', sub: 'Full grain leather. Canvas Routes merchandise. Handed to you at the first Canvas Routes event you attend after your membership is confirmed.', tier: 1 },
  { label: 'Car Perfume', sub: 'Refreshed every 2 months throughout the season, picked up at any Canvas Routes event.', tier: 1 },
  { label: 'Cap', sub: 'Canvas Routes merchandise cap — handed to you at your first event of the season.', tier: 2 },
  { label: 'Car Photoshoot', sub: 'One professional shoot of your car on a Canvas Routes road trip.', tier: 2 },
]

function CheckIcon({ gold }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke={gold ? '#c5a882' : '#3B6B2F'} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: '3px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const INIT_FORM = { name:'', email:'', phone:'', dob_month:'', dob_day:'', dob_year:'', year:'', carMake:'', carModel:'', tier:'', source:'', more:'' }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function MembershipContent() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'ViewContent', { content_name: 'Membership' })
  }, [])

  const [menuOpen, setMenuOpen]         = useState(false)
  const [form, setForm]                 = useState(INIT_FORM)
  const [errors, setErrors]             = useState({})
  const [focusedField, setFocusedField] = useState(null)
  const [status, setStatus]             = useState(null)
  const [submitError, setSubmitError]   = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const honeypotRef                     = useRef(null)

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: false }))
    if (submitError) setSubmitError(null)
  }

  function capitaliseName(v) {
    return v.replace(/\b\w/g, c => c.toUpperCase())
  }

  function formatPhone(v) {
    let d = v.replace(/\D/g, '')
    // Strip leading country code 1 if the user typed it themselves
    if (d.startsWith('1') && d.length > 1) d = d.slice(1)
    d = d.slice(0, 10)
    if (!d) return ''
    const p = '+1 '
    if (d.length <= 3) return p + d
    if (d.length <= 6) return `${p}(${d.slice(0,3)}) ${d.slice(3)}`
    return `${p}(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  }

  function inp(field) {
    const base = { width:'100%', padding:'0.85rem 1rem', fontSize:'13px', fontFamily:'var(--font-inter),sans-serif', color:'#F5F1EC', outline:'none', WebkitAppearance:'none', MozAppearance:'none', appearance:'none', transition:'border 0.2s, background 0.2s', boxSizing:'border-box' }
    if (errors[field]) return { ...base, border:'0.5px solid rgba(208,96,112,0.7)', background:'rgba(208,96,112,0.06)' }
    if (form[field])   return { ...base, border:'0.5px solid rgba(197,168,130,0.45)', background:'rgba(197,168,130,0.07)' }
    if (focusedField === field) return { ...base, border:'0.5px solid rgba(197,168,130,0.5)', background:'rgba(255,255,255,0.06)' }
    return { ...base, border:'0.5px solid rgba(197,168,130,0.18)', background:'rgba(255,255,255,0.04)' }
  }

  function validate() {
    const e = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = true
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true
    if (!form.phone.trim() || form.phone.replace(/\D/g,'').length < 11) e.phone = true
    if (!form.dob_month) e.dob_month = true
    if (!form.dob_day) e.dob_day = true
    if (!form.year.trim()) e.year = true
    if (!form.carMake) e.carMake = true
    if (!form.tier) e.tier = true
    if (!form.source) e.source = true
    if (!termsAccepted) e.termsAccepted = true
    setErrors(e)
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'loading') return
    const errs = validate()
    if (Object.keys(errs).length) {
      const order = ['name','email','phone','dob_month','dob_day','year','carMake','tier','source','termsAccepted']
      const first = order.find(f => errs[f])
      if (first) {
        // dob_day lives inside the dob_month container — scroll to that
        const scrollTarget = first === 'dob_day' ? 'dob_month' : first
        const el = document.getElementById(`mem-field-${scrollTarget}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setStatus('loading'); setSubmitError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch('/api/membership-waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _hp: honeypotRef.current?.value || '' }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('success')
        if (typeof window !== 'undefined' && window.fbq) window.fbq('track', 'Lead')
      }
      else { setSubmitError(data.error || 'Something went wrong. Please try again.'); setStatus('error') }
    } catch (err) {
      clearTimeout(timeout)
      if (err?.name === 'AbortError') {
        setSubmitError('Request timed out. Please check your connection and try again.')
      } else {
        setSubmitError('Something went wrong. Please try again.')
      }
      setStatus('error')
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
        }
        @media(max-width:480px){
          .mem-perks { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <Link href="/"><Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" /></Link>
        <div className="nav-links">
          {['/', '/#events', '/#contact', '/faq'].map((href, i) => (
            <Link key={i} href={href} style={{ color: '#555', textDecoration: 'none' }}>
              {['Home', 'Events', 'Contact', 'FAQ'][i]}
            </Link>
          ))}
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {[['/', 'Home'], ['/#events', 'Events'], ['/#contact', 'Contact'], ['/faq', 'FAQ']].map(([href, label]) => (
          <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>{label}</Link>
        ))}
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#3B6B2F', fontWeight: '500' }}>Members Login</Link>
      </div>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background photo */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src="/membership-hero.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(6,12,8,0.75) 0%, rgba(6,12,8,0.55) 45%, rgba(6,12,8,0.85) 100%)' }} />
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(140px,18vw,200px) 2rem 5rem', maxWidth: '800px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif', color: '#c5a882', marginBottom: '1.75rem', textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>
            Canvas Routes · Membership · Season 2026
          </div>
          <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3rem,6vw,5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, marginBottom: '1.5rem', letterSpacing: '-0.01em', textShadow: '0 2px 20px rgba(0,0,0,0.85)' }}>
            For those who chose<br />their car on purpose.
          </h1>
          <div style={{ width: '32px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.5rem' }} />
          <div style={{ ...LABEL, color: 'rgba(197,168,130,0.7)', letterSpacing: '0.28em', textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>
            Season 2026 &nbsp;·&nbsp; Limited spots &nbsp;·&nbsp; Two tiers
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
          <span style={{ ...LABEL, color: 'rgba(197,168,130,0.35)' }}>Scroll</span>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.35)" strokeWidth="1.2" strokeLinecap="round">
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
            <p style={{ ...BODY, color: '#444', marginBottom: '1.1rem' }}>
              Canvas Routes membership is built around the drive. Not the parking lot. Not the Instagram photo. The act of getting behind the wheel and going somewhere worth going — with people who feel the same way.
            </p>
            <p style={{ ...BODY, color: '#444' }}>
              From June to November, members get priority access to every Cars &amp; Coffee, every road trip, and every experience on the Canvas Routes calendar. Two tiers, both built to give you more of what brought you here.
            </p>
          </FadeUp>

          <FadeUp delay={0.15} style={{ display: 'flex', flexDirection: 'column' }} className="mem-about-img">
            <div style={{ overflow: 'hidden', height: 'clamp(240px,30vw,380px)' }}>
              <img src="/events/may9-lineup.jpeg" alt="Canvas Routes" style={{ width: '100%', height: '117%', objectFit: 'cover', objectPosition: 'center top', display: 'block', marginTop: '-7%' }} />
            </div>
            <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderTop: 'none' }}>
              {[['Season', 'June — November'], ['Membership', 'Limited spots per season'], ['Events', 'Cars & Coffee · Cruises · Road Trips']].map(([k, v], i, arr) => (
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
      <div style={{ position: 'relative', height: 'clamp(260px,36vw,460px)', overflow: 'hidden' }}>
        <img src="/events/may9-cars-row.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
      </div>

      {/* ── TIERS ───────────────────────────────────────────────────── */}
      <section style={{ background: '#EDE8E1', padding: 'clamp(5rem,8vw,8rem) clamp(1.5rem,5vw,5rem)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

          <FadeUp style={{ textAlign: 'center', marginBottom: 'clamp(3rem,5vw,5rem)' }}>
            <div style={{ ...LABEL, color: '#bbb', marginBottom: '0.75rem' }}>2026 Season</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a' }}>Choose your tier</div>
          </FadeUp>

          <div className="mem-tiers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* TIER 1 */}
            <FadeUp delay={0.05}>
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', height: '100%' }}>
                <div className="mem-tier-inner" style={{ padding: '2.25rem 2.25rem 0' }}>
                  <div style={{ ...LABEL, color: '#999', marginBottom: '0.5rem' }}>Tier 1</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '2rem', lineHeight: 1.2, fontFamily: 'var(--font-inter),sans-serif' }}>
                    Routes Member
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,5vw,3.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>$99</span>
                    <span style={{ ...SMALL, color: '#999', paddingBottom: '0.4rem' }}>CAD</span>
                  </div>
                  <div style={{ ...SMALL, color: '#999', marginBottom: '2rem' }}>per season</div>
                  <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.07)', marginBottom: '1.25rem' }} />
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ ...LABEL, color: '#bbb', marginBottom: '0.35rem' }}>Why choose this</div>
                    <div style={{ ...BODY, color: '#444' }}>Full access to every Canvas Routes event and road trip all season — priority registration included.</div>
                  </div>
                </div>
                <div className="mem-tier-body" style={{ padding: '0 2.25rem 2.25rem' }}>
                  <div style={{ ...LABEL, color: '#999', marginBottom: '1.1rem' }}>Includes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {TIER1.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                        <CheckIcon />
                        <span style={{ ...BODY, color: '#333' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* TIER 2 */}
            <FadeUp delay={0.15}>
              <div style={{ background: '#0F1E14', position: 'relative', overflow: 'hidden', height: '100%' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(197,168,130,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div className="mem-tier-inner" style={{ padding: '2.25rem 2.25rem 0' }}>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.8)', marginBottom: '0.5rem' }}>Tier 2</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '600', color: '#F5F1EC', marginBottom: '2rem', lineHeight: 1.2, fontFamily: 'var(--font-inter),sans-serif' }}>
                    Inner Circle
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,5vw,3.8rem)', fontWeight: '300', color: '#c5a882', lineHeight: 1 }}>$249</span>
                    <span style={{ ...SMALL, color: 'rgba(197,168,130,0.75)', paddingBottom: '0.4rem' }}>CAD</span>
                  </div>
                  <div style={{ ...SMALL, color: 'rgba(245,241,236,0.55)', marginBottom: '2rem' }}>per season</div>
                  <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.12)', marginBottom: '1.25rem' }} />
                  <div style={{ marginBottom: '1.75rem' }}>
                    <div style={{ ...LABEL, color: 'rgba(197,168,130,0.5)', marginBottom: '0.35rem' }}>Why choose this</div>
                    <div style={{ ...BODY, color: 'rgba(245,241,236,0.75)' }}>First access to everything, plus a $70 road trip credit — your membership starts paying for itself from day one.</div>
                  </div>
                </div>
                <div className="mem-tier-body" style={{ padding: '0 2.25rem 2.25rem' }}>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.8)', marginBottom: '1.1rem' }}>Everything in Tier 1, plus</div>
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

      {/* ── ROAD TRIP SAVINGS ───────────────────────────────────────── */}
      <section style={{ background: '#F5F1EC', padding: 'clamp(4rem,6vw,6rem) clamp(1.5rem,5vw,5rem)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <style>{`
          .rt-savings{display:grid;grid-template-columns:1fr 1fr;gap:clamp(3rem,6vw,7rem);align-items:start}
          @media(max-width:680px){.rt-savings{grid-template-columns:1fr !important}}
        `}</style>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <div className="rt-savings">
            <FadeUp>
              <div style={{ ...LABEL, color: '#c5a882', marginBottom: '1.25rem' }}>Road trips</div>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.15', marginBottom: '1.5rem' }}>
                Your seat is held<br />before the doors open.
              </div>
              <p style={{ ...BODY, color: '#555' }}>
                Every Canvas Routes road trip begins with a dedicated window exclusive to members — at a rate that reflects the commitment you've made to this community. Once that window closes, remaining spots are made available to the public. The drive is open to everyone. Members simply never have to wonder if there's room for them.
              </p>
            </FadeUp>
            <FadeUp delay={0.1}>
              <div style={{ border: '0.5px solid rgba(197,168,130,0.3)', background: 'rgba(197,168,130,0.04)', padding: 'clamp(1.75rem,3vw,2.5rem)' }}>
                <div style={{ ...LABEL, color: '#c5a882', marginBottom: '1.25rem' }}>Member rate</div>
                <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1a1a1a', lineHeight: '1.4', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                  Every road trip, at a rate built for members.
                </div>
                <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.25)', marginBottom: '1.25rem' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    'Early access window on every road trip',
                    'Preferred member pricing across both tiers',
                    'Inner Circle members receive an additional $70 credit',
                    'Public registration opens once the member window closes',
                  ].map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#c5a882', flexShrink: 0, marginTop: '7px' }} />
                      <span style={{ ...BODY, fontSize: '13px', color: '#666' }}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── PHOTO BREAK 2 ───────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 'clamp(200px,28vw,360px)', overflow: 'hidden' }}>
        <img src="/events/may9-cars2.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 72%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,13,0.4)' }} />
      </div>

      {/* ── PHYSICAL PERKS ──────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(5rem,8vw,8rem) clamp(1.5rem,5vw,5rem)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <FadeUp style={{ marginBottom: 'clamp(2.5rem,4vw,4rem)' }}>
            <div style={{ ...LABEL, color: '#bbb', marginBottom: '0.75rem' }}>What you receive</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a' }}>
              Membership you can hold.
            </div>
          </FadeUp>

          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(0,0,0,0.07)' }} className="mem-perks">
            {PERKS.map((p, i) => (
              <div key={i}
                style={{ background: p.tier === 2 ? '#0F1E14' : '#F5F1EC', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '20px', height: '0.5px', background: p.tier === 2 ? 'rgba(197,168,130,0.5)' : '#c5a882' }} />
                  <span style={{ ...LABEL, color: p.tier === 2 ? 'rgba(197,168,130,0.85)' : '#888', background: p.tier === 2 ? 'rgba(197,168,130,0.08)' : 'rgba(0,0,0,0.05)', border: `0.5px solid ${p.tier === 2 ? 'rgba(197,168,130,0.2)' : 'rgba(0,0,0,0.1)'}`, padding: '2px 8px' }}>
                    {p.tier === 2 ? 'Inner Circle' : 'All members'}
                  </span>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: p.tier === 2 ? '#F5F1EC' : '#1a1a1a', marginBottom: '0.65rem', lineHeight: 1.3, fontFamily: 'var(--font-inter),sans-serif' }}>{p.label}</div>
                <div style={{ ...BODY, color: p.tier === 2 ? 'rgba(245,241,236,0.72)' : '#555' }}>{p.sub}</div>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── WHAT HAPPENS NEXT ───────────────────────────────────────── */}
      <section style={{ background: '#EDE8E1', padding: 'clamp(4rem,6vw,6rem) clamp(1.5rem,5vw,5rem)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <FadeUp style={{ marginBottom: 'clamp(2.5rem,4vw,4rem)' }}>
            <div style={{ ...LABEL, color: '#bbb', marginBottom: '0.75rem' }}>After you register</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a' }}>What happens next.</div>
          </FadeUp>
          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(0,0,0,0.07)' }} className="mem-steps">
            {[
              { n: '01', title: 'Register your interest', body: 'Fill in the form below. Tell us about yourself, your car, and the tier you\'re interested in.' },
              { n: '02', title: 'We reach out', body: 'Every application is reviewed personally. We contact you directly to confirm your spot and tier.' },
              { n: '03', title: 'You\'re in', body: 'Complete payment, join the members community, and collect your welcome kit at your first event of the season.' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#F5F1EC', padding: '2rem 1.75rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '300', color: 'rgba(197,168,130,0.45)', lineHeight: 1, marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.n}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.65rem', lineHeight: 1.3, fontFamily: 'var(--font-inter),sans-serif' }}>{s.title}</div>
                <div style={{ ...BODY, color: '#666' }}>{s.body}</div>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── REGISTRATION ────────────────────────────────────────────── */}
      <section style={{ background: '#0F1E14', padding: 'clamp(5rem,8vw,7rem) clamp(1.5rem,5vw,5rem)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.45),transparent)' }} />
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <FadeUp style={{ marginBottom: 'clamp(2.5rem,4vw,3.5rem)' }}>
            <div style={{ ...LABEL, color: 'rgba(197,168,130,0.85)', marginBottom: '1rem' }}>Founding access</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.1 }}>
              Spots are limited.
            </div>
            <p style={{ ...BODY, color: 'rgba(245,241,236,0.65)' }}>
              The 2026 season has a fixed number of members. Leave your details and we&apos;ll be in touch personally.
            </p>
          </FadeUp>

          {status === 'success' ? (
            <FadeUp>
              <div style={{ padding: '2rem', border: '0.5px solid rgba(197,168,130,0.25)', background: 'rgba(197,168,130,0.06)', textAlign: 'center' }}>
                <div style={{ width: '28px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.25rem' }} />
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem' }}>You&apos;re on the list.</div>
                <p style={{ ...BODY, color: 'rgba(245,241,236,0.65)' }}>We&apos;ll be in touch shortly. Check your inbox for a confirmation.</p>
              </div>
            </FadeUp>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <input ref={honeypotRef} type="text" name="_hp" tabIndex={-1} autoComplete="off"
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>

                {/* Name */}
                <div id="mem-field-name">
                  <div style={{ ...LABEL, color: errors.name ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.4rem' }}>Full name</div>
                  <input type="text" value={form.name} placeholder="First and last name" autoComplete="name"
                    onChange={e => set('name', capitaliseName(e.target.value))}
                    onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                    style={inp('name')} />
                </div>

                {/* Email */}
                <div id="mem-field-email">
                  <div style={{ ...LABEL, color: errors.email ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.4rem', marginTop: '1rem' }}>Email</div>
                  <input type="email" value={form.email} placeholder="your@email.com" autoComplete="email"
                    onChange={e => set('email', e.target.value)}
                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                    style={inp('email')} />
                </div>

                {/* Phone */}
                <div id="mem-field-phone">
                  <div style={{ ...LABEL, color: errors.phone ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.4rem', marginTop: '1rem' }}>Phone</div>
                  <input type="tel" value={form.phone} placeholder="+1 (514) 000-0000" autoComplete="tel"
                    onChange={e => set('phone', formatPhone(e.target.value))}
                    onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                    style={inp('phone')} />
                </div>

                {/* Date of birth */}
                <div id="mem-field-dob_month" style={{ marginTop: '1rem' }}>
                  <div style={{ ...LABEL, color: (errors.dob_month || errors.dob_day) ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.4rem' }}>
                    Date of birth <span style={{ color: 'rgba(197,168,130,0.3)', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>year optional</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: '1px' }}>
                    <div style={{ position: 'relative' }}>
                      <select value={form.dob_month} onChange={e => set('dob_month', e.target.value)}
                        onFocus={() => setFocusedField('dob_month')} onBlur={() => setFocusedField(null)}
                        style={{ ...inp('dob_month'), paddingRight: '2rem', cursor: 'pointer' }}>
                        <option value="">Month</option>
                        {MONTHS.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <select value={form.dob_day} onChange={e => set('dob_day', e.target.value)}
                        onFocus={() => setFocusedField('dob_day')} onBlur={() => setFocusedField(null)}
                        style={{ ...inp('dob_day'), paddingRight: '2rem', cursor: 'pointer' }}>
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <select value={form.dob_year} onChange={e => set('dob_year', e.target.value)}
                        onFocus={() => setFocusedField('dob_year')} onBlur={() => setFocusedField(null)}
                        style={{ ...inp('dob_year'), paddingRight: '2rem', cursor: 'pointer' }}>
                        <option value="">Year</option>
                        {Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  {(errors.dob_month || errors.dob_day) && <div style={{ fontSize: '11px', color: '#d06070', marginTop: '0.3rem' }}>Month and day are required</div>}
                </div>

                {/* Year + Make */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1px', marginTop: '1rem' }}>
                  <div id="mem-field-year">
                    <div style={{ ...LABEL, color: errors.year ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.4rem' }}>Year</div>
                    <div style={{ position: 'relative' }}>
                      <select value={form.year} onChange={e => set('year', e.target.value)}
                        onFocus={() => setFocusedField('year')} onBlur={() => setFocusedField(null)}
                        style={{ ...inp('year'), paddingRight: '2rem', cursor: 'pointer' }}>
                        <option value="">Year</option>
                        {Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i).map(y => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div id="mem-field-carMake">
                    <div style={{ ...LABEL, color: errors.carMake ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.4rem' }}>Make</div>
                    <div style={{ position: 'relative' }}>
                      <select value={form.carMake} onChange={e => set('carMake', e.target.value)}
                        onFocus={() => setFocusedField('carMake')} onBlur={() => setFocusedField(null)}
                        style={{ ...inp('carMake'), paddingRight: '2rem' }}>
                        <option value="">Select make</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <svg style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>

                {/* Model */}
                <div>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.7)', marginBottom: '0.4rem', marginTop: '1rem' }}>Model <span style={{ color: 'rgba(197,168,130,0.3)', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>optional</span></div>
                  <input type="text" value={form.carModel} placeholder="e.g. 911 Carrera, M3 Competition"
                    onChange={e => set('carModel', e.target.value)}
                    onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)}
                    style={inp('carModel')} />
                </div>

                {/* Tier */}
                <div id="mem-field-tier" style={{ marginTop: '1rem' }}>
                  <div style={{ ...LABEL, color: errors.tier ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.75rem' }}>Membership tier</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: errors.tier ? 'rgba(208,96,112,0.3)' : 'rgba(197,168,130,0.1)' }}>
                    {[['Routes Member', '$99'], ['Inner Circle', '$249']].map(([t, price]) => (
                      <button key={t} type="button" onClick={() => set('tier', t)}
                        style={{ padding: '1.1rem 1rem', background: form.tier === t ? '#c5a882' : 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative' }}>
                        <div style={{ ...SMALL, color: form.tier === t ? '#0F1E14' : 'rgba(245,241,236,0.5)', marginBottom: '0.2rem', fontWeight: form.tier === t ? '600' : '400' }}>{t}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '500', fontFamily: 'var(--font-inter),sans-serif', color: form.tier === t ? '#0F1E14' : 'rgba(245,241,236,0.4)' }}>{price} <span style={{ fontSize: '11px', color: form.tier === t ? 'rgba(15,30,20,0.6)' : 'rgba(245,241,236,0.3)', fontWeight: '400' }}>CAD / season</span></div>
                        {form.tier === t && (
                          <svg style={{ position: 'absolute', top: '0.6rem', right: '0.75rem' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F1E14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source */}
                <div id="mem-field-source">
                  <div style={{ ...LABEL, color: errors.source ? '#d06070' : 'rgba(197,168,130,0.7)', marginBottom: '0.4rem', marginTop: '1rem' }}>How did you hear about us</div>
                  <div style={{ position: 'relative' }}>
                    <select value={form.source} onChange={e => set('source', e.target.value)}
                      onFocus={() => setFocusedField('source')} onBlur={() => setFocusedField(null)}
                      style={{ ...inp('source'), paddingRight: '2rem' }}>
                      <option value="">Select</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <svg style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {/* More */}
                <div>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.7)', marginBottom: '0.4rem', marginTop: '1rem' }}>Anything else <span style={{ color: 'rgba(197,168,130,0.3)', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>optional</span></div>
                  <textarea value={form.more} rows={3} placeholder="Questions, thoughts, or anything you'd like us to know."
                    onChange={e => set('more', e.target.value)}
                    onFocus={() => setFocusedField('more')} onBlur={() => setFocusedField(null)}
                    style={{ ...inp('more'), resize: 'vertical', minHeight: '80px' }} />
                </div>

              </div>

              <label id="mem-field-termsAccepted" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '1.5rem', padding: '0.75rem', border: `0.5px solid ${errors.termsAccepted ? 'rgba(208,96,112,0.7)' : 'transparent'}`, background: errors.termsAccepted ? 'rgba(208,96,112,0.06)' : 'transparent', cursor: 'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => { setTermsAccepted(e.target.checked); if (e.target.checked) setErrors(er => ({ ...er, termsAccepted: false })) }} style={{ accentColor: '#c5a882', width: '12px', height: '12px', flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '11px', color: 'rgba(245,241,236,0.55)', fontFamily: 'var(--font-inter),sans-serif' }}>
                  I have read and agree to the{' '}
                  <a href="/terms" target="_blank" rel="noreferrer" style={{ color: 'rgba(197,168,130,0.8)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Terms &amp; Conditions</a>
                  .
                </span>
              </label>

              {submitError && <div style={{ ...SMALL, color: '#d06070', marginTop: '1rem' }}>{submitError}</div>}

              <button type="submit" disabled={status === 'loading'}
                style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', background: '#c5a882', border: 'none', color: '#0F1E14', ...LABEL, letterSpacing: '0.2em', fontWeight: '600', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
                {status === 'loading' ? 'Submitting…' : 'Register interest'}
              </button>
            </form>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '2rem 3rem', textAlign: 'center', borderTop: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ ...SMALL, color: '#ccc' }}>© 2026 Canvas Routes. Montreal, QC.</span>
        <Link href="/terms" style={{ ...SMALL, color: '#ccc', textDecoration: 'none' }}>Terms</Link>
        <Link href="/privacy" style={{ ...SMALL, color: '#ccc', textDecoration: 'none' }}>Privacy</Link>
        <a href="https://instagram.com/canvasroutes" target="_blank" rel="noreferrer" style={{ ...LABEL, color: '#c5a882', textDecoration: 'none', borderBottom: '0.5px solid rgba(197,168,130,0.3)', paddingBottom: '1px' }}>@canvasroutes</a>
      </footer>
    </div>
  )
}
