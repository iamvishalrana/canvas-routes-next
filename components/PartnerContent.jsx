'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const PARTNER_TYPES = [
  'Cafe or Restaurant',
  'Bar or Lounge',
  'Photography or Videography',
  'Media or Content',
  'Automotive',
  'Car Care & Product Brand',
  'Hotel or Hospitality',
  'Retail or Lifestyle brand',
  'Other',
]

const CATEGORIES = [
  {
    name: 'Cafes & Restaurants',
    body: 'Cars & Coffee venues, road trip breakfast stops, group lunches and farewell drinks. The places we eat and drink are as curated as the roads we drive.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
  },
  {
    name: 'Photography & Media',
    body: 'Event coverage, road trip photography, videography and content creation. We document every drive — the right creative partnership amplifies both of us.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
  {
    name: 'Automotive',
    body: 'Dealers, performance shops, tuners and accessories. Our members are informed buyers — they research, they ask questions, and they spend on what they trust.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v10a2 2 0 0 1-2 2h-2"/><circle cx="9" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    ),
  },
  {
    name: 'Car Care & Product Brands',
    body: 'Detailing products, tire brands, engine oil and performance chemicals — Meguiar\'s, Chemical Guys, Michelin, Pirelli, Mobil 1 and the like. Our members know exactly what\'s on their car and what goes into it.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    name: 'Hospitality',
    body: 'Hotels, chalets, lodges and experiences for overnight and multi-day adventures. As Canvas Routes grows beyond day trips, the right hospitality partners travel with us.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    name: 'Brands & Lifestyle',
    body: 'Premium apparel, spirits, accessories, watches — brands with the right fit. Canvas Routes attracts a specific kind of person. If your brand resonates with them, it belongs here.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
]

const TRACKS = [
  {
    label: '01',
    heading: 'Event Partner',
    body: 'Your brand at every Canvas Routes Cars & Coffee — the invite-only morning meets that define our season. Sampling, display, signage, or simply the right name in the right room. Every attendee came because they wanted to be there.',
    points: ['Brand presence at Cars & Coffee events', 'Product sampling or display', 'Social mention and event coverage', 'Access to a curated, engaged audience'],
  },
  {
    label: '02',
    heading: 'Route Partner',
    body: 'Be woven into a Canvas Routes road trip — as a breakfast stop, destination, product supplied on the route, or named sponsor of the convoy itself. Every trip is photographed and documented. Your partnership lives long after the drive ends.',
    points: ['Named presence on a curated road trip', 'Featured in route photography and media', 'Breakfast, lunch, or destination stop', 'Product placement throughout the day'],
  },
  {
    label: '03',
    heading: 'Member Partner',
    body: 'An exclusive discount or perk built directly into the Canvas Routes membership — available to every Routes Member and Inner Circle member from day one of their season. Ongoing, recurring exposure to people who chose to invest in this community.',
    points: ['Exclusive member discount or offer', 'Listed in the Canvas Routes member benefits', 'Promoted at every onboarding and event', 'Renewed each season with the membership'],
  },
]

const STEPS = [
  { n: '1', heading: 'Reach out', body: 'Fill in the form below with your business and how you\'d like to get involved. No deck required — just tell us who you are.' },
  { n: '2', heading: 'We connect', body: 'We review every inquiry personally. If there\'s a fit, we\'ll set up a quick conversation to talk through the right kind of partnership.' },
  { n: '3', heading: 'Season begins', body: 'We build a custom plan around your goals and activate it at your first Canvas Routes event. From there it runs with us for the season.' },
]

const PILLARS = [
  { stat: 'Invite-only', label: 'Every event is personally curated — no open registration, no walk-ins' },
  { stat: 'Montreal', label: 'Based in Quebec, with road trips stretching across North America' },
  { stat: 'All season', label: 'Events, road trips and content running from spring through fall' },
  { stat: 'Community', label: 'People who chose their car with intention and stay fiercely loyal' },
]

function inputStyle(err) {
  return {
    width: '100%', padding: '0.9rem 1rem',
    background: 'transparent',
    border: `0.5px solid ${err ? 'rgba(180,60,60,0.55)' : 'rgba(0,0,0,0.18)'}`,
    fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif',
    color: '#1a1a1a', outline: 'none',
    transition: 'border-color 0.18s',
    boxSizing: 'border-box',
  }
}

export default function PartnerContent() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({ name: '', business: '', city: '', type: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState('')

  function setField(key, val) {
    setForm(p => ({ ...p, [key]: val }))
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.business.trim()) e.business = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.type) e.type = 'Required'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required'
    if (!form.message.trim()) e.message = 'Required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setStatus('loading'); setServerError('')
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { setStatus('success') }
      else { setStatus('error'); setServerError(data.error || 'Something went wrong. Please try again.') }
    } catch {
      setStatus('error')
      setServerError('Connection error. Please check your network and try again.')
    }
  }

  return (
    <div style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav className="nav">
        <Link href="/"><Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" /></Link>
        <div className="nav-links">
          <Link href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
          <Link href="/#events" style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
          <Link href="/#contact" style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
          <Link href="/faq" style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu"><span /><span /><span /></button>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
        <Link href="/#events" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
        <Link href="/#contact" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
        <Link href="/faq" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#3B6B2F', fontWeight: '500' }}>Members Login</Link>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: 'clamp(480px,62vh,580px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(140px,16vw,200px) 2rem clamp(4rem,8vw,6rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src="/route-photo.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 45%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,15,10,0.82) 0%, rgba(8,15,10,0.65) 50%, rgba(8,15,10,0.9) 100%)' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />
        <div style={{ position: 'relative', zIndex: 1, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '2rem', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', alignItems: 'center', gap: '0.6rem', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          <span style={{ display: 'inline-block', width: '24px', height: '0.5px', background: 'rgba(197,168,130,0.5)' }} />
          Canvas Routes
          <span style={{ display: 'inline-block', width: '24px', height: '0.5px', background: 'rgba(197,168,130,0.5)' }} />
        </div>
        <h1 style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3.2rem,7vw,5.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.0, marginBottom: '1.5rem', letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>
          Be part of<br /><em style={{ fontStyle: 'italic' }}>the drive.</em>
        </h1>
        <div style={{ position: 'relative', zIndex: 1, width: '40px', height: '0.5px', background: 'rgba(197,168,130,0.6)', margin: '0 auto 1.75rem' }} />
        <p style={{ position: 'relative', zIndex: 1, fontSize: '14px', color: 'rgba(245,241,236,0.65)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.9', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.01em', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          Reach Montreal's most intentional drivers — at events, on the road, and everywhere in between.
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.25),transparent)' }} />
      </section>

      {/* ── Pillars bar ───────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '0.5px solid rgba(197,168,130,0.2)', background: '#F5F1EC' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 clamp(1.5rem,6vw,5rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {PILLARS.map((p, i) => (
            <div key={i} style={{ padding: 'clamp(1.75rem,3vw,2.5rem) 1rem', borderRight: i < PILLARS.length - 1 ? '0.5px solid rgba(197,168,130,0.2)' : 'none', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.5rem', lineHeight: 1.1 }}>{p.stat}</div>
              <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6', fontFamily: 'var(--font-inter),sans-serif' }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Community pitch ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(2rem,5vw,5rem)', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>Who we are</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>
              A community built<br />around the road.
            </h2>
          </div>
          <div style={{ paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.9', margin: '0 0 1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              Canvas Routes is a Montreal-based automotive community organizing invite-only Cars & Coffee events, curated convoy road trips, and overnight adventures across Quebec and beyond. Every event is deliberately small and every registration personally reviewed.
            </p>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.9', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
              A Canvas Routes partnership puts your brand in front of that audience — not as an ad, but as part of the experience. The people who show up chose their car with intention. They are attentive, engaged, and loyal to brands that align with what they value.
            </p>
          </div>
        </div>
      </section>

      {/* ── Our audience ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>The audience</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: '0 0 0', letterSpacing: '-0.01em' }}>
            Who you're reaching.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 'clamp(2rem,4vw,3.5rem)' }}>
          {[
            { heading: 'Intentional buyers', body: 'Canvas Routes members chose their car specifically. They research, they compare, and they invest — in their machine and in everything around it. They do not buy impulsively and they do not forget a brand that earns their trust.' },
            { heading: 'Influential network', body: 'Word of mouth is how Canvas Routes grows. Members bring other members. A recommendation from someone in this community carries weight. A brand that resonates here spreads through a network that is hard to buy into any other way.' },
            { heading: 'Across Quebec and beyond', body: 'Based in Montreal with events stretching across Quebec, Ontario, Vermont and Nova Scotia. The Canvas Routes community is growing and so is the geographic reach of every partnership.' },
          ].map(item => (
            <div key={item.heading}>
              <div style={{ width: '24px', height: '0.5px', background: 'rgba(197,168,130,0.6)', marginBottom: '1.25rem' }} />
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.25rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.8rem', lineHeight: 1.2 }}>{item.heading}</div>
              <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.85', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 clamp(1.5rem,6vw,5rem)' }}>
        <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.3)' }} />
      </div>

      {/* ── Who we work with ──────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>Partner types</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>Who we work with.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.5px', background: 'rgba(197,168,130,0.2)' }}>
          {CATEGORIES.map((cat) => (
            <div key={cat.name} style={{ background: '#F5F1EC', padding: 'clamp(1.75rem,3vw,2.5rem)' }}>
              <div style={{ color: 'rgba(197,168,130,0.85)', marginBottom: '1.1rem' }}>{cat.icon}</div>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.35rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.2 }}>{cat.name}</div>
              <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.8', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{cat.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Partnership tracks — dark ─────────────────────────────────────────── */}
      <section style={{ background: '#0F1E14', padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.4),transparent)' }} />
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>How to partner</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>Three ways to get involved.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.5px', background: 'rgba(197,168,130,0.1)' }}>
            {TRACKS.map((track) => (
              <div key={track.label} style={{ background: '#0F1E14', padding: 'clamp(1.75rem,3vw,2.5rem)' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(197,168,130,0.5)', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '1.25rem' }}>{track.label}</div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.45rem', fontWeight: '400', fontStyle: 'italic', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>{track.heading}</div>
                <p style={{ fontSize: '13.5px', color: 'rgba(245,241,236,0.55)', lineHeight: '1.85', margin: '0 0 1.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>{track.body}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {track.points.map(pt => (
                    <li key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '12.5px', color: 'rgba(245,241,236,0.45)', lineHeight: '1.7', marginBottom: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                      <span style={{ color: 'rgba(197,168,130,0.5)', flexShrink: 0, marginTop: '0.25rem' }}>—</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>The process</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>Simple to start.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 'clamp(2rem,4vw,3rem)', position: 'relative' }}>
          {STEPS.map((step, i) => (
            <div key={step.n} style={{ position: 'relative' }}>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '3.5rem', fontWeight: '300', color: 'rgba(197,168,130,0.18)', lineHeight: 1, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>{step.n}</div>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.35rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.2 }}>{step.heading}</div>
              <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.85', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{step.body}</p>
              {i < STEPS.length - 1 && (
                <div style={{ display: 'none', position: 'absolute', top: '2rem', right: '-1rem', width: '2rem', height: '0.5px', background: 'rgba(197,168,130,0.3)' }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact form ─────────────────────────────────────────────────────── */}
      <section style={{ background: '#F5F1EC', borderTop: '0.5px solid rgba(197,168,130,0.25)', padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 'clamp(3rem,6vw,6rem)', alignItems: 'start' }}>

          {/* Left — heading + contact details */}
          <div style={{ maxWidth: '340px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>Get in touch</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.2rem,4vw,3rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
              Let's build<br /><em style={{ fontStyle: 'italic' }}>something together.</em>
            </h2>
            <div style={{ width: '32px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.5rem' }} />
            <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.9', margin: '0 0 2.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              Tell us about your business and how you'd like to get involved. We review every inquiry personally and respond within a few days.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { href: 'mailto:info@canvasroutes.com', label: 'info@canvasroutes.com', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
                { href: 'https://www.instagram.com/canvasroutes', label: '@canvasroutes', target: '_blank', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
              ].map(link => (
                <a key={link.label} href={link.href} target={link.target} rel={link.target ? 'noopener noreferrer' : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: '#999', fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', transition: 'color 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#c5a882'}
                  onMouseLeave={e => e.currentTarget.style.color = '#999'}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', border: '0.5px solid rgba(197,168,130,0.35)', color: 'rgba(197,168,130,0.65)', flexShrink: 0 }}>
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right — form card */}
          <div style={{ background: '#FAFAF8', border: '0.5px solid rgba(197,168,130,0.3)', padding: 'clamp(2rem,4vw,2.75rem)' }}>
            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: '32px', height: '0.5px', background: 'rgba(197,168,130,0.55)', margin: '0 auto 1.75rem' }} />
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>Message received.</div>
                <p style={{ fontSize: '13.5px', color: '#888', lineHeight: '1.85', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                  Thanks for reaching out. We'll be in touch within a few days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <input type="text" name="_hp" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                {/* Business name — prominent, full width */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: errors.business ? 'rgba(180,60,60,0.8)' : 'rgba(197,168,130,0.9)', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif', fontWeight: '500' }}>Business name</label>
                  <input type="text" autoComplete="organization" value={form.business} onChange={e => setField('business', e.target.value)}
                    style={{ width: '100%', padding: '0.95rem 1rem', background: 'transparent', border: `0.5px solid ${errors.business ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '14px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                    onBlur={e => e.target.style.borderColor = errors.business ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                </div>

                {/* Your name + City */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { key: 'name', label: 'Your name', type: 'text', autoComplete: 'name' },
                    { key: 'city', label: 'City / Town', type: 'text', autoComplete: 'address-level2' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors[f.key] ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{f.label}</label>
                      <input type={f.type} autoComplete={f.autoComplete} value={form[f.key]} onChange={e => setField(f.key, e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors[f.key] ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                        onBlur={e => e.target.style.borderColor = errors[f.key] ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                    </div>
                  ))}
                </div>

                {/* Type + Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.type ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>Type of business</label>
                    <select value={form.type} onChange={e => setField('type', e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors.type ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: form.type ? '#1a1a1a' : '#aaa', outline: 'none', boxSizing: 'border-box', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.85rem center', cursor: 'pointer', transition: 'border-color 0.18s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                      onBlur={e => e.target.style.borderColor = errors.type ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}>
                      <option value="">Select a type</option>
                      {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.email ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>Email address</label>
                    <input type="email" autoComplete="email" value={form.email} onChange={e => setField('email', e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors.email ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                      onBlur={e => e.target.style.borderColor = errors.email ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.message ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>How you'd like to partner</label>
                  <textarea rows={4} value={form.message} onChange={e => setField('message', e.target.value)}
                    placeholder="Tell us about your business and what a partnership might look like…"
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors.message ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '110px', lineHeight: '1.75', transition: 'border-color 0.18s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                    onBlur={e => e.target.style.borderColor = errors.message ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                </div>

                {serverError && <p style={{ fontSize: '13px', color: 'rgba(180,60,60,0.8)', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{serverError}</p>}

                <button type="submit" disabled={status === 'loading'}
                  style={{ width: '100%', padding: '1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: status === 'loading' ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                  {status === 'loading' ? 'Sending…' : 'Send Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '0.5px solid rgba(197,168,130,0.2)', padding: '2rem clamp(1.25rem,5vw,2.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ fontSize: '11px', color: '#aaa', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>© 2026 Canvas Routes. Montreal, QC.</p>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <Link href="/privacy" style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Terms</Link>
        </div>
      </div>

    </div>
  )
}
