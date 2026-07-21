'use client'
import { useState } from 'react'
import Link from 'next/link'
import SiteFooter from './SiteFooter'
import SiteNav from './SiteNav'
import PageLoader from './PageLoader'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { partnersT } from '../lib/i18n/partners'

// Icons only — text for each entry comes from partnersT[lang].categories[i]
// (matched by array index).
const CATEGORY_ICONS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
    ),
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v10a2 2 0 0 1-2 2h-2"/><circle cx="9" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    ),
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
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
  const { lang } = useLanguage()
  const t = partnersT[lang]
  const [form, setForm] = useState({ _hp: '', name: '', business: '', city: '', type: '', email: '', phone: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState('')
  const [phoneOptOut, setPhoneOptOut] = useState(false)

  function setField(key, val) {
    setForm(p => ({ ...p, [key]: val }))
    if (errors[key]) setErrors(p => ({ ...p, [key]: undefined }))
    if (serverError) setServerError('')
  }

  function formatPhone(v) {
    const d = v.replace(/\D/g, '').slice(0, 10)
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = t.form.required
    if (!form.business.trim()) e.business = t.form.required
    if (!form.city.trim()) e.city = t.form.required
    if (!form.type) e.type = t.form.required
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t.form.validEmailRequired
    if (!form.message.trim()) e.message = t.form.required
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
        body: JSON.stringify({ ...form, phone: phoneOptOut ? '' : form.phone }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('success')
        setForm({ _hp: '', name: '', business: '', city: '', type: '', email: '', phone: '', message: '' })
        setErrors({})
        setPhoneOptOut(false)
      }
      else { setStatus('error'); setServerError(data.error || t.form.genericError) }
    } catch {
      setStatus('error')
      setServerError(t.form.connectionError)
    }
  }

  return (
    <div style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>
      <PageLoader images={['/route-photo.jpg']} minMs={2000} />
      <style>{`
        /* Prevent iOS Safari auto-zoom on input focus (triggered when font-size < 16px) */
        @media(max-width:768px){
          input, select, textarea { font-size: 16px !important; }
        }
        /* Stack two-column form rows on mobile */
        @media(max-width:520px){
          .pt-form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteNav />

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
          {t.hero.titleLine1}<br /><em style={{ fontStyle: 'italic' }}>{t.hero.titleLine2}</em>
        </h1>
        <div style={{ position: 'relative', zIndex: 1, width: '40px', height: '0.5px', background: 'rgba(197,168,130,0.6)', margin: '0 auto 1.75rem' }} />
        <p style={{ position: 'relative', zIndex: 1, fontSize: '14px', color: 'rgba(245,241,236,0.65)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.9', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.01em', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          {t.hero.subtitle}
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.25),transparent)' }} />
      </section>

      {/* ── Pillars bar ───────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '0.5px solid rgba(197,168,130,0.2)', background: '#F5F1EC' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 clamp(1.5rem,6vw,5rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {t.pillars.map((p, i) => (
            <div key={i} style={{ padding: 'clamp(1.75rem,3vw,2.5rem) 1rem', borderRight: i < t.pillars.length - 1 ? '0.5px solid rgba(197,168,130,0.2)' : 'none', textAlign: 'center' }}>
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
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.community.eyebrow}</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>
              {t.community.headingLine1}<br />{t.community.headingLine2}
            </h2>
          </div>
          <div style={{ paddingTop: '0.5rem' }}>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.9', margin: '0 0 1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              {t.community.para1}
            </p>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.9', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
              {t.community.para2}
            </p>
          </div>
        </div>
      </section>

      {/* ── Our audience ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.audienceHeader.eyebrow}</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: '0 0 0', letterSpacing: '-0.01em' }}>
            {t.audienceHeader.heading}
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 'clamp(2rem,4vw,3.5rem)' }}>
          {t.audience.map(item => (
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
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.categoriesHeader.eyebrow}</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>{t.categoriesHeader.heading}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.5px', background: 'rgba(197,168,130,0.2)' }}>
          {CATEGORY_ICONS.map((cat, i) => (
            <div key={i} style={{ background: '#F5F1EC', padding: 'clamp(1.75rem,3vw,2.5rem)' }}>
              <div style={{ color: 'rgba(197,168,130,0.85)', marginBottom: '1.1rem' }}>{cat.icon}</div>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.35rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.2 }}>{t.categories[i].name}</div>
              <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.8', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{t.categories[i].body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Partnership tracks — dark ─────────────────────────────────────────── */}
      <section style={{ background: '#0F1E14', padding: 'clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.4),transparent)' }} />
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'clamp(2.5rem,5vw,4rem)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.tracksHeader.eyebrow}</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>{t.tracksHeader.heading}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.5px', background: 'rgba(197,168,130,0.1)' }}>
            {t.tracks.map((track) => (
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
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.stepsHeader.eyebrow}</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: 0, letterSpacing: '-0.01em' }}>{t.stepsHeader.heading}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 'clamp(2rem,4vw,3rem)', position: 'relative' }}>
          {t.steps.map((step, i) => (
            <div key={step.n} style={{ position: 'relative' }}>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '3.5rem', fontWeight: '300', color: 'rgba(197,168,130,0.18)', lineHeight: 1, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>{step.n}</div>
              <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.35rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.2 }}>{step.heading}</div>
              <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.85', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{step.body}</p>
              {i < t.steps.length - 1 && (
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
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.contact.eyebrow}</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.2rem,4vw,3rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
              {t.contact.headingLine1}<br /><em style={{ fontStyle: 'italic' }}>{t.contact.headingLine2}</em>
            </h2>
            <div style={{ width: '32px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.5rem' }} />
            <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.9', margin: '0 0 2.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              {t.contact.intro}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { href: 'mailto:info@canvasroutes.com', label: 'info@canvasroutes.com', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
                { href: 'https://www.instagram.com/canvasroutes', label: '@canvasroutes', target: '_blank', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                { href: 'https://www.facebook.com/share/1B8GXiPHUe/', label: 'Canvas Routes', target: '_blank', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> },
              ].map(link => (
                <a key={link.label} href={link.href} target={link.target} rel={link.target ? 'noopener noreferrer' : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', color: '#999', fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', transition: 'color 0.18s', minHeight: '44px' }}
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
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>{t.form.successTitle}</div>
                <p style={{ fontSize: '13.5px', color: '#888', lineHeight: '1.85', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                  {t.form.successBody}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <input type="text" name="_hp" value={form._hp} onChange={e => setField('_hp', e.target.value)} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

                {/* Business name — prominent, full width */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: errors.business ? 'rgba(180,60,60,0.8)' : 'rgba(197,168,130,0.9)', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif', fontWeight: '500' }}>{t.form.businessName}<span style={{ color: '#b04040', marginLeft: '3px' }}>*</span></label>
                  <input type="text" autoComplete="organization" value={form.business} onChange={e => setField('business', e.target.value)} maxLength={150}
                    style={{ width: '100%', padding: '0.95rem 1rem', background: 'transparent', border: `0.5px solid ${errors.business ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '14px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                    onBlur={e => e.target.style.borderColor = errors.business ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                  {errors.business && <span style={{ fontSize: '11px', color: 'rgba(180,60,60,0.8)', fontFamily: 'var(--font-inter),sans-serif' }}>{errors.business}</span>}
                </div>

                {/* Your name + City */}
                <div className="pt-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { key: 'name', label: t.form.yourName, type: 'text', autoComplete: 'name' },
                    { key: 'city', label: t.form.city, type: 'text', autoComplete: 'address-level2' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors[f.key] ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{f.label}<span style={{ color: '#b04040', marginLeft: '3px' }}>*</span></label>
                      <input type={f.type} autoComplete={f.autoComplete} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} maxLength={f.key === 'name' ? 100 : undefined}
                        style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors[f.key] ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                        onBlur={e => e.target.style.borderColor = errors[f.key] ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                      {errors[f.key] && <span style={{ fontSize: '11px', color: 'rgba(180,60,60,0.8)', fontFamily: 'var(--font-inter),sans-serif' }}>{errors[f.key]}</span>}
                    </div>
                  ))}
                </div>

                {/* Type + Email */}
                <div className="pt-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.type ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.form.typeOfBusiness}<span style={{ color: '#b04040', marginLeft: '3px' }}>*</span></label>
                    <select value={form.type} onChange={e => setField('type', e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors.type ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: form.type ? '#1a1a1a' : '#aaa', outline: 'none', boxSizing: 'border-box', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.85rem center', cursor: 'pointer', transition: 'border-color 0.18s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                      onBlur={e => e.target.style.borderColor = errors.type ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}>
                      <option value="">{t.form.selectType}</option>
                      {t.partnerTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                    </select>
                    {errors.type && <span style={{ fontSize: '11px', color: 'rgba(180,60,60,0.8)', fontFamily: 'var(--font-inter),sans-serif' }}>{errors.type}</span>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.email ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.form.emailAddress}<span style={{ color: '#b04040', marginLeft: '3px' }}>*</span></label>
                    <input type="email" autoComplete="email" value={form.email} onChange={e => setField('email', e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors.email ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                      onBlur={e => e.target.style.borderColor = errors.email ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                    {errors.email && <span style={{ fontSize: '11px', color: 'rgba(180,60,60,0.8)', fontFamily: 'var(--font-inter),sans-serif' }}>{errors.email}</span>}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.form.phoneNumber}</label>
                  {phoneOptOut ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                      <span style={{ fontSize: '13.5px', color: '#aaa', flex: 1, fontFamily: 'var(--font-inter),sans-serif' }}>{t.form.phoneNotProvided}</span>
                      <button type="button" onClick={() => setPhoneOptOut(false)}
                        style={{ background: 'none', border: 'none', padding: '0.4rem 0.25rem', fontSize: '11px', color: '#888', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                        {t.form.addNumber}
                      </button>
                    </div>
                  ) : (
                    <>
                      <input type="tel" autoComplete="tel" placeholder="(514) 000-0000" value={form.phone}
                        onChange={e => setField('phone', formatPhone(e.target.value))}
                        style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.14)', fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.14)'} />
                      <button type="button" onClick={() => { setPhoneOptOut(true); setField('phone', '') }}
                        style={{ background: 'none', border: 'none', padding: '0.5rem 0', fontSize: '11px', color: '#aaa', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left' }}>
                        {t.form.preferNotShare}
                      </button>
                    </>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: errors.message ? 'rgba(180,60,60,0.8)' : '#aaa', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{t.form.howPartner}<span style={{ color: '#b04040', marginLeft: '3px' }}>*</span></label>
                  <textarea rows={4} value={form.message} onChange={e => setField('message', e.target.value)} maxLength={1000}
                    placeholder={t.form.messagePlaceholder}
                    style={{ width: '100%', padding: '0.85rem 1rem', background: 'transparent', border: `0.5px solid ${errors.message ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'}`, fontSize: '13.5px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '110px', lineHeight: '1.75', transition: 'border-color 0.18s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(197,168,130,0.65)'}
                    onBlur={e => e.target.style.borderColor = errors.message ? 'rgba(180,60,60,0.45)' : 'rgba(0,0,0,0.14)'} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    {errors.message ? <span style={{ fontSize: '11px', color: 'rgba(180,60,60,0.8)', fontFamily: 'var(--font-inter),sans-serif' }}>{errors.message}</span> : <span />}
                    <span style={{ fontSize: '10px', color: form.message.length > 900 ? 'rgba(180,60,60,0.7)' : '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>{form.message.length}/1000</span>
                  </div>
                </div>

                {serverError && <p style={{ fontSize: '13px', color: 'rgba(180,60,60,0.8)', margin: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{serverError}</p>}

                <button type="submit" disabled={status === 'loading'}
                  style={{ width: '100%', padding: '1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: status === 'loading' ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                  {status === 'loading' ? t.form.sending : t.form.sendInquiry}
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
