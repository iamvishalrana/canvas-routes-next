'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Phone, Globe, NotebookPen, Building2 } from 'lucide-react'

export default function PartnersContent() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', company: '', type: '', website: '', phone: '', collab: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }))
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length < 4) return digits
    if (digits.length < 7) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  function validate() {
    const newErrors = {}
    if (form.name.trim().length < 2) newErrors.name = true
    if (!form.company.trim()) newErrors.company = true
    if (!form.type) newErrors.type = true
    if (!form.collab.trim()) newErrors.collab = true
    if (form.phone.trim() && form.phone.replace(/\D/g, '').length !== 10) newErrors.phone = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateField(field) {
    setErrors(prev => {
      const next = { ...prev }
      if (field === 'phone') {
        if (form.phone.trim() && form.phone.replace(/\D/g, '').length !== 10) next.phone = true
        else delete next.phone
      }
      return next
    })
  }

  async function handleSubmit() {
    if (status === 'loading') return
    if (!validate()) return
    setStatus('loading')
    setServerError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        setStatus('success')
        setForm({ name: '', company: '', type: '', website: '', phone: '', collab: '' })
        if (typeof window !== 'undefined' && localStorage.getItem('cookieConsent') === 'accepted' && window.gtag) {
          window.gtag('event', 'generate_lead', { event_category: 'partners' })
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setServerError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch (err) {
      clearTimeout(timeout)
      setServerError(err.name === 'AbortError' ? 'Request timed out. Please check your connection and try again.' : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function inputStyle(field) {
    const isFocused = focusedField === field
    return {
      width: '100%', padding: '0.9rem 1.2rem',
      border: `1px solid ${errors[field] ? '#7B2032' : isFocused ? '#c5a882' : 'rgba(0,0,0,0.2)'}`,
      background: errors[field] ? 'rgba(123,32,50,0.04)' : form[field] ? 'rgba(0,0,0,0.04)' : 'transparent',
      fontSize: '13px', fontFamily: "'Inter',sans-serif", outline: 'none', color: '#1a1a1a',
      boxShadow: isFocused ? '0 0 0 3px rgba(197,168,130,0.2)' : 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }
  }

  return (
    <div style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>

      {/* NAV */}
      <nav className="nav">
        <a href="/" onClick={e => { e.preventDefault(); router.push('/') }}>
          <img src="/canvas_routes_refined.png" alt="Canvas Routes" className="nav-logo" />
        </a>
        <div className="nav-links">
          <a href="/#about">About Us</a>
          <a href="/#events">Events</a>
          <a href="/#contact">Contact</a>
          <Link href="/register">Register</Link>
          <Link href="/partners" style={{ color: '#7B2032' }}>Partners</Link>
        </div>
        <Link href="/register" className="nav-join">Member Registration</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/#about" onClick={() => setMenuOpen(false)}>About Us</a>
        <a href="/#events" onClick={() => setMenuOpen(false)}>Events</a>
        <a href="/#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        <Link href="/register" onClick={() => setMenuOpen(false)}>Register</Link>
        <Link href="/partners" onClick={() => setMenuOpen(false)} style={{ color: '#7B2032', fontWeight: '500' }}>Partners</Link>
      </div>

      {/* HEADER */}
      <div style={{ padding: '5rem 2rem 3.5rem', textAlign: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1rem' }}>Collaborate</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '3rem', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.2', marginBottom: '0.5rem' }}>
          Partner with<br /><em style={{ color: '#7B2032' }}>Canvas Routes.</em>
        </div>
        <div style={{ width: '40px', height: '1px', background: '#c5a882', margin: '1.5rem auto' }}></div>
        <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#555', maxWidth: '480px', margin: '0 auto' }}>
          We work with photographers, media outlets, and businesses who share our passion for automotive culture. Tell us about yourself and how you'd like to collaborate.
        </p>
      </div>

      {/* WHO WE WORK WITH */}
      <div style={{ background: '#EDE8E1', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '3rem 2rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem', textAlign: 'center' }}>Who we work with</div>
          <div className="meets-cards-grid">
            {[
              { label: 'Photographers', desc: 'Automotive and lifestyle photographers to document our events and routes.' },
              { label: 'Media Outlets', desc: 'Automotive, lifestyle, and travel publications covering the Montreal scene.' },
              { label: 'Businesses', desc: 'Brands and venues aligned with our community and aesthetic.' },
              { label: 'Sponsors', desc: 'Partners looking to connect with a curated audience of automotive enthusiasts.' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '1.2rem 1.5rem', border: '0.5px solid rgba(0,0,0,0.12)', background: '#F5F1EC' }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7B2032', marginBottom: '0.5rem' }}>{item.label}</div>
                <p style={{ fontSize: '12px', lineHeight: '1.7', color: '#555' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FORM */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '4rem 2rem 6rem' }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 0' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2rem', fontWeight: '300', color: '#3B6B2F' }}>Inquiry received.</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.7', maxWidth: '400px' }}>We'll be in touch soon to explore how we can work together.</p>
            <button onClick={() => { setStatus(null); setServerError(null); setErrors({}) }} className="btn-push" style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', cursor: 'pointer', fontFamily: "'Inter',sans-serif", textDecoration: 'underline' }}>Submit another inquiry</button>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handleSubmit() }} noValidate>

            <div className="join-form-row">
              <div className="join-form-field">
                <label className="join-label">Full Name <User size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /></label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Your full name" value={form.name}
                    onChange={e => updateForm('name', e.target.value)} style={inputStyle('name')}
                    onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
                  {!form.name && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
                </div>
                {errors.name && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
              </div>
              <div className="join-form-field">
                <label className="join-label">Company or Handle <Building2 size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /></label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Your company or @handle" value={form.company} maxLength={100}
                    onChange={e => updateForm('company', e.target.value)} style={inputStyle('company')}
                    onFocus={() => setFocusedField('company')} onBlur={() => setFocusedField(null)} />
                  {!form.company && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
                </div>
                {errors.company && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
              </div>
            </div>

            <div className="join-form-field" style={{ marginTop: '1rem' }}>
              <label className="join-label">Type</label>
              <div style={{ position: 'relative' }}>
                <select value={form.type} onChange={e => updateForm('type', e.target.value)}
                  style={{ ...inputStyle('type'), appearance: 'none', cursor: 'pointer', paddingRight: '2rem' }}>
                  <option value="">Select a type</option>
                  <option value="Photographer">Photographer</option>
                  <option value="Media Outlet">Media Outlet</option>
                  <option value="Business">Business</option>
                  <option value="Sponsor">Sponsor</option>
                </select>
                {!form.type && <span style={{ position: 'absolute', right: '28px', top: '50%', transform: 'translateY(-50%)', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
                <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              {errors.type && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
            </div>

            <div className="join-form-row" style={{ marginTop: '1rem' }}>
              <div className="join-form-field">
                <label className="join-label">Website or Portfolio <Globe size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /> <span style={{ color: '#888', fontWeight: '300' }}>(optional)</span></label>
                <input type="url" placeholder="https://yoursite.com" value={form.website} maxLength={300}
                  onChange={e => updateForm('website', e.target.value)} style={inputStyle('website')}
                  onFocus={() => setFocusedField('website')} onBlur={() => setFocusedField(null)} />
              </div>
              <div className="join-form-field">
                <label className="join-label">Phone Number <Phone size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /> <span style={{ color: '#888', fontWeight: '300' }}>(optional)</span></label>
                <input type="tel" placeholder="Your phone number" value={form.phone}
                  onChange={e => updateForm('phone', formatPhone(e.target.value))} style={inputStyle('phone')}
                  onFocus={() => setFocusedField('phone')} onBlur={() => { setFocusedField(null); validateField('phone') }} />
                {errors.phone && <span style={{ fontSize: '11px', color: '#7B2032' }}>Please enter a valid 10-digit number</span>}
              </div>
            </div>

            <div className="join-form-field" style={{ marginTop: '1rem' }}>
              <label className="join-label">How would you like to collaborate? <NotebookPen size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /></label>
              <div style={{ position: 'relative' }}>
                <textarea placeholder="Tell us about your work and what you have in mind for Canvas Routes..." value={form.collab}
                  onChange={e => updateForm('collab', e.target.value)} rows={5} maxLength={1000}
                  style={{ ...inputStyle('collab'), resize: 'vertical' }}
                  onFocus={() => setFocusedField('collab')} onBlur={() => setFocusedField(null)} />
                {!form.collab && <span style={{ position: 'absolute', right: '10px', top: '14px', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
              </div>
              {errors.collab && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
              <div style={{ textAlign: 'right', fontSize: '10px', color: '#aaa', marginTop: '0.3rem' }}>{form.collab.trim() ? form.collab.length : 0}/1000</div>
            </div>

            <div style={{ marginTop: '1.5rem', fontSize: '10px', color: '#ccc', lineHeight: '1.7', textAlign: 'left' }}>
              By submitting, you agree to our{' '}
              <Link href="/privacy" style={{ fontSize: '10px', color: '#ccc', textDecoration: 'underline' }}>privacy policy</Link>
              {' '}and consent to being contacted by Canvas Routes regarding your inquiry. You may withdraw your consent at any time by contacting{' '}
              <a href="mailto:info@canvasroutes.com" style={{ fontSize: '10px', color: '#ccc', textDecoration: 'underline' }}>info@canvasroutes.com</a>.
            </div>

            <button type="submit" disabled={status === 'loading'} className="join-submit-btn"
              style={{ marginTop: '1.5rem', padding: '0.9rem 3rem', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: "'Inter',sans-serif", opacity: status === 'loading' ? 0.5 : 1 }}>
              {status === 'loading' ? 'Sending...' : 'Send Inquiry'}
            </button>
            {status === 'error' && <div style={{ marginTop: '1rem', fontSize: '12px', color: '#7B2032' }}>{serverError}</div>}
          </form>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '0.5px solid rgba(0,0,0,0.12)', padding: '2rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#F5F1EC' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.05em' }}>© 2026 Canvas Routes. Montreal, QC.</div>
          <Link href="/privacy" style={{ fontSize: '10px', color: '#aaa', textDecoration: 'none', letterSpacing: '0.03em' }}>Privacy Policy</Link>
          <button onClick={() => window.dispatchEvent(new Event('cookieConsentReset'))} style={{ background: 'none', border: 'none', padding: 0, fontSize: '10px', color: '#aaa', cursor: 'pointer', letterSpacing: '0.03em', fontFamily: "'Inter',sans-serif", textAlign: 'left' }}>Manage cookies</button>
        </div>
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
          <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{ color: '#555', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" style={{ color: '#555', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </a>
        </div>
      </footer>

    </div>
  )
}
