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
  'Car Care & Detailing',
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
    body: 'Detailing studios, dealers, tuners, accessories and everything that serves the car. Our members care deeply about their machines — they notice the difference.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v10a2 2 0 0 1-2 2h-2"/><circle cx="9" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    ),
  },
  {
    name: 'Car Care & Detailing',
    body: 'Detailing studios, ceramic coating, PPF, auto spas and paint correction. Our members take care of their cars — a partner who does the same speaks their language immediately.',
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

const BENEFITS = [
  {
    heading: 'Event presence',
    body: 'Your brand at every Canvas Routes Cars & Coffee — invite-only morning meets with Montreal\'s most carefully selected cars and drivers.',
  },
  {
    heading: 'Member exclusives',
    body: 'An exclusive discount or perk for Canvas Routes members, built into their membership. Real exposure to people who actually spend on the things they love.',
  },
  {
    heading: 'Road trip feature',
    body: 'Be part of a curated convoy — as a breakfast stop, destination, or featured partner on the route. Your location becomes part of the experience.',
  },
  {
    heading: 'Content & media',
    body: 'Featured in Canvas Routes photography and social coverage. Every event and road trip is documented — your brand in front of an audience that pays attention.',
  },
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
  const [form, setForm] = useState({ name: '', business: '', type: '', email: '', message: '' })
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
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </Link>
        <div className="nav-links">
          <Link href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
          <Link href="/#events" style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
          <Link href="/#contact" style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
          <Link href="/faq" style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
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
      <section style={{
        minHeight: 'clamp(420px,58vh,540px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(140px,16vw,200px) 2rem clamp(4rem,8vw,6rem)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src="/route-photo.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 45%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,15,10,0.82) 0%, rgba(8,15,10,0.68) 50%, rgba(8,15,10,0.88) 100%)' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />
        <div style={{ position: 'relative', zIndex: 1, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '2rem', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', alignItems: 'center', gap: '0.6rem', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          <span style={{ display: 'inline-block', width: '24px', height: '0.5px', background: 'rgba(197,168,130,0.5)' }} />
          Canvas Routes
          <span style={{ display: 'inline-block', width: '24px', height: '0.5px', background: 'rgba(197,168,130,0.5)' }} />
        </div>
        <h1 style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3rem,6.5vw,5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.0, marginBottom: '1.5rem', letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>
          Be part of<br /><em style={{ fontStyle: 'italic' }}>the drive.</em>
        </h1>
        <div style={{ position: 'relative', zIndex: 1, width: '40px', height: '0.5px', background: 'rgba(197,168,130,0.6)', margin: '0 auto 1.75rem' }} />
        <p style={{ position: 'relative', zIndex: 1, fontSize: '14px', color: 'rgba(245,241,236,0.65)', maxWidth: '380px', margin: '0 auto', lineHeight: '1.9', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.01em', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          Reach Montreal's most intentional drivers — at events, on the road, and everywhere in between.
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.25),transparent)' }} />
      </section>

      {/* ── The Pitch ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(2rem,5vw,5rem)', alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              Who we are
            </div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, marginBottom: 0, letterSpacing: '-0.01em' }}>
              A community built<br />around the road.
            </h2>
          </div>
          <div style={{ paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.9', margin: '0 0 1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              Canvas Routes is a Montreal-based automotive community organizing invite-only Cars &amp; Coffee events, curated convoy road trips, and overnight adventures across Quebec and beyond. Every event is deliberately small, every registration personally reviewed.
            </p>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.9', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
              The people who show up chose their car with intention. They are attentive, engaged, and loyal to brands that align with what they value. A Canvas Routes partnership puts you in front of that audience — not as an ad, but as part of the experience.
            </p>
          </div>
        </div>
      </section>

      {/* ── Divider ───────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 clamp(1.5rem,6vw,5rem)' }}>
        <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.3)' }} />
      </div>

      {/* ── Who we work with ──────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>
            Partner types
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>
            Who we work with.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.5px', background: 'rgba(197,168,130,0.2)' }}>
          {CATEGORIES.map((cat) => (
            <div key={cat.name} style={{ background: '#F5F1EC', padding: 'clamp(1.75rem,3vw,2.5rem)' }}>
              <div style={{ color: 'rgba(197,168,130,0.85)', marginBottom: '1.1rem' }}>
                {cat.icon}
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.35rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                {cat.name}
              </div>
              <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.8', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                {cat.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits — dark section ───────────────────────────────────────────── */}
      <section style={{ background: '#0F1E14', padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.4),transparent)' }} />
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              What it looks like
            </div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>
              What partnering<br />with Canvas Routes means.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1.5px', background: 'rgba(197,168,130,0.12)' }}>
            {BENEFITS.map((b) => (
              <div key={b.heading} style={{ background: '#0F1E14', padding: 'clamp(1.75rem,3vw,2.5rem)' }}>
                <div style={{ width: '28px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.5rem' }} />
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.35rem', fontWeight: '400', fontStyle: 'italic', color: '#F5F1EC', marginBottom: '0.9rem', lineHeight: 1.2 }}>
                  {b.heading}
                </div>
                <p style={{ fontSize: '13.5px', color: 'rgba(245,241,236,0.55)', lineHeight: '1.85', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* ── Contact form ─────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(2.5rem,5vw,6rem)', alignItems: 'start' }}>

          {/* Left — heading + copy */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              Get in touch
            </div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
              Interested in<br />partnering with us?
            </h2>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.9', margin: '0 0 1rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              Tell us about your business and how you'd like to work together. We review every inquiry personally and respond within a few days.
            </p>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.9', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
              You can also reach us directly at{' '}
              <a href="mailto:info@canvasroutes.com" style={{ color: '#1a1a1a', textDecoration: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.3)' }}>info@canvasroutes.com</a>.
            </p>
          </div>

          {/* Right — form */}
          <div>
            {status === 'success' ? (
              <div style={{ padding: 'clamp(2rem,4vw,3rem)', border: '0.5px solid rgba(197,168,130,0.35)', textAlign: 'center' }}>
                <div style={{ width: '32px', height: '0.5px', background: 'rgba(197,168,130,0.6)', margin: '0 auto 1.5rem' }} />
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.6rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>
                  Message received.
                </div>
                <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.85', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                  Thanks for reaching out. We'll be in touch within a few days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <input type="text" name="_hp" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                {/* Name + Business */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', marginBottom: '1px' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.name ? 'rgba(180,60,60,0.8)' : '#888', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                      Your name
                    </label>
                    <input
                      type="text" autoComplete="name" value={form.name}
                      onChange={e => setField('name', e.target.value)}
                      style={inputStyle(errors.name)}
                      onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.6)'}
                      onBlur={e => e.target.style.borderColor = errors.name ? 'rgba(180,60,60,0.55)' : 'rgba(0,0,0,0.18)'}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.business ? 'rgba(180,60,60,0.8)' : '#888', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                      Business name
                    </label>
                    <input
                      type="text" autoComplete="organization" value={form.business}
                      onChange={e => setField('business', e.target.value)}
                      style={inputStyle(errors.business)}
                      onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.6)'}
                      onBlur={e => e.target.style.borderColor = errors.business ? 'rgba(180,60,60,0.55)' : 'rgba(0,0,0,0.18)'}
                    />
                  </div>
                </div>

                {/* Type */}
                <div style={{ marginBottom: '1px' }}>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.type ? 'rgba(180,60,60,0.8)' : '#888', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                    Type of business
                  </label>
                  <select
                    value={form.type} onChange={e => setField('type', e.target.value)}
                    style={{ ...inputStyle(errors.type), appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.6)'}
                    onBlur={e => e.target.style.borderColor = errors.type ? 'rgba(180,60,60,0.55)' : 'rgba(0,0,0,0.18)'}
                  >
                    <option value="">Select a type</option>
                    {PARTNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Email */}
                <div style={{ marginBottom: '1px' }}>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.email ? 'rgba(180,60,60,0.8)' : '#888', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                    Email address
                  </label>
                  <input
                    type="email" autoComplete="email" value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    style={inputStyle(errors.email)}
                    onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.6)'}
                    onBlur={e => e.target.style.borderColor = errors.email ? 'rgba(180,60,60,0.55)' : 'rgba(0,0,0,0.18)'}
                  />
                </div>

                {/* Message */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.message ? 'rgba(180,60,60,0.8)' : '#888', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                    How you'd like to partner
                  </label>
                  <textarea
                    rows={5} value={form.message}
                    onChange={e => setField('message', e.target.value)}
                    placeholder="Tell us about your business and what a partnership might look like…"
                    style={{ ...inputStyle(errors.message), resize: 'vertical', minHeight: '120px', lineHeight: '1.7' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.6)'}
                    onBlur={e => e.target.style.borderColor = errors.message ? 'rgba(180,60,60,0.55)' : 'rgba(0,0,0,0.18)'}
                  />
                </div>

                {serverError && (
                  <p style={{ fontSize: '13px', color: 'rgba(180,60,60,0.85)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                    {serverError}
                  </p>
                )}

                <button
                  type="submit" disabled={status === 'loading'}
                  style={{ width: '100%', padding: '1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: status === 'loading' ? 0.65 : 1, transition: 'opacity 0.2s' }}
                >
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
