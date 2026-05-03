'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Phone, Instagram, Car, NotebookPen } from 'lucide-react'

export default function RegisterContent() {
  const router = useRouter()
  const honeypotRef = useRef(null)
  const [form, setForm] = useState({ name: '', instagram: '', phone: '', car: '', ride: '', why: '' })
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
    if (!form.instagram.trim()) newErrors.instagram = true
    if (!form.car.trim()) newErrors.car = true
    if (!form.ride.trim()) newErrors.ride = true
    if (!form.why.trim()) newErrors.why = true
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
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeout = setTimeout(() => controller?.abort(), 30000)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _hp: honeypotRef.current?.value || '' }),
        ...(controller ? { signal: controller.signal } : {}),
      })
      clearTimeout(timeout)
      if (res.ok) {
        setStatus('success')
        setForm({ name: '', instagram: '', phone: '', car: '', ride: '', why: '' })
        if (honeypotRef.current) honeypotRef.current.value = ''
        if (typeof window !== 'undefined' && localStorage.getItem('cookieConsent') === 'accepted' && window.gtag) {
          window.gtag('event', 'generate_lead', { event_category: 'register' })
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
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </a>
        <div className="nav-links">
          <a href="/#about">About Us</a>
          <a href="/#events">Events</a>
          <a href="/#contact">Contact</a>
          <Link href="/register" style={{ color: '#7B2032' }}>Register</Link>
        </div>
        <a href="/#join" className="nav-join">Join</a>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="/#about" onClick={() => setMenuOpen(false)}>About Us</a>
        <a href="/#events" onClick={() => setMenuOpen(false)}>Events</a>
        <a href="/#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        <Link href="/register" onClick={() => setMenuOpen(false)} style={{ color: '#7B2032', fontWeight: '500' }}>Register</Link>
      </div>

      {/* HEADER */}
      <div style={{ padding: '5rem 2rem 3.5rem', textAlign: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1rem' }}>Membership</div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '3rem', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.2', marginBottom: '0.5rem' }}>
          Apply to join<br /><em style={{ color: '#7B2032' }}>Canvas Routes.</em>
        </div>
        <div style={{ width: '40px', height: '1px', background: '#c5a882', margin: '1.5rem auto' }}></div>
        <p style={{ fontSize: '0.9rem', lineHeight: '1.8', color: '#555', maxWidth: '480px', margin: '0 auto' }}>
          Membership is by application. Tell us about yourself and your car — we'll be in touch when spots open.
        </p>
      </div>

      {/* FORM */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '4rem 2rem 6rem' }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 0' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2rem', fontWeight: '300', color: '#3B6B2F' }}>Application received.</div>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.7', maxWidth: '400px' }}>We'll review your application and reach out when spots become available. Welcome to the waitlist.</p>
            <button onClick={() => { setStatus(null); setServerError(null); setErrors({}) }} className="btn-push" style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', cursor: 'pointer', fontFamily: "'Inter',sans-serif", textDecoration: 'underline' }}>Submit another application</button>
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
                <label className="join-label">Instagram <Instagram size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /></label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="@yourhandle" value={form.instagram} maxLength={50}
                    onChange={e => updateForm('instagram', e.target.value)} style={inputStyle('instagram')}
                    onFocus={() => setFocusedField('instagram')} onBlur={() => setFocusedField(null)} />
                  {!form.instagram && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
                </div>
                {errors.instagram && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
              </div>
            </div>

            <div className="join-form-field" style={{ marginTop: '1rem' }}>
              <label className="join-label">Phone Number <Phone size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /> <span style={{ color: '#888', fontWeight: '300' }}>(optional)</span></label>
              <input type="tel" placeholder="Your phone number" value={form.phone}
                onChange={e => updateForm('phone', formatPhone(e.target.value))} style={inputStyle('phone')}
                onFocus={() => setFocusedField('phone')} onBlur={() => { setFocusedField(null); validateField('phone') }} />
              {errors.phone && <span style={{ fontSize: '11px', color: '#7B2032' }}>Please enter a valid 10-digit number</span>}
            </div>

            <div className="join-form-field" style={{ marginTop: '1rem' }}>
              <label className="join-label">Car Make / Model / Year <Car size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /></label>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="e.g. 2022 BMW M3, 2019 Porsche 911 GT3" value={form.car} maxLength={200}
                  onChange={e => updateForm('car', e.target.value)} style={inputStyle('car')}
                  onFocus={() => setFocusedField('car')} onBlur={() => setFocusedField(null)} />
                {!form.car && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
              </div>
              {errors.car && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
            </div>

            <div className="join-form-field" style={{ marginTop: '1rem' }}>
              <label className="join-label">Tell us about your ride <NotebookPen size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /></label>
              <div style={{ position: 'relative' }}>
                <textarea placeholder="What makes your car special? Modifications, history, how it drives..." value={form.ride}
                  onChange={e => updateForm('ride', e.target.value)} rows={4} maxLength={1000}
                  style={{ ...inputStyle('ride'), resize: 'vertical' }}
                  onFocus={() => setFocusedField('ride')} onBlur={() => setFocusedField(null)} />
                {!form.ride && <span style={{ position: 'absolute', right: '10px', top: '14px', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
              </div>
              {errors.ride && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
              <div style={{ textAlign: 'right', fontSize: '10px', color: '#aaa', marginTop: '0.3rem' }}>{form.ride.trim() ? form.ride.length : 0}/1000</div>
            </div>

            <div className="join-form-field" style={{ marginTop: '1rem' }}>
              <label className="join-label">Why do you want to join Canvas Routes? <NotebookPen size={13} style={{ marginLeft: '3px', verticalAlign: 'middle' }} /></label>
              <div style={{ position: 'relative' }}>
                <textarea placeholder="Tell us what drew you to Canvas Routes and what you're looking for..." value={form.why}
                  onChange={e => updateForm('why', e.target.value)} rows={4} maxLength={1000}
                  style={{ ...inputStyle('why'), resize: 'vertical' }}
                  onFocus={() => setFocusedField('why')} onBlur={() => setFocusedField(null)} />
                {!form.why && <span style={{ position: 'absolute', right: '10px', top: '14px', color: '#7B2032', fontSize: '14px', pointerEvents: 'none' }}>*</span>}
              </div>
              {errors.why && <span style={{ fontSize: '11px', color: '#7B2032' }}>Required</span>}
              <div style={{ textAlign: 'right', fontSize: '10px', color: '#aaa', marginTop: '0.3rem' }}>{form.why.trim() ? form.why.length : 0}/1000</div>
            </div>

            <div style={{ marginTop: '1.5rem', fontSize: '10px', color: '#ccc', lineHeight: '1.7', textAlign: 'left' }}>
              By applying, you agree to our{' '}
              <Link href="/privacy" style={{ fontSize: '10px', color: '#ccc', textDecoration: 'underline' }}>privacy policy</Link>
              {' '}and consent to receive updates from Canvas Routes. You may withdraw your consent at any time by contacting{' '}
              <a href="mailto:info@canvasroutes.com" style={{ fontSize: '10px', color: '#ccc', textDecoration: 'underline' }}>info@canvasroutes.com</a>.
            </div>

            <button type="submit" disabled={status === 'loading'} className="join-submit-btn"
              style={{ marginTop: '1.5rem', padding: '0.9rem 3rem', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: "'Inter',sans-serif", opacity: status === 'loading' ? 0.5 : 1 }}>
              {status === 'loading' ? 'Sending...' : 'Submit Application'}
            </button>
            {status === 'error' && <div style={{ marginTop: '1rem', fontSize: '12px', color: '#7B2032' }}>{serverError}</div>}
            <div style={{position:'absolute',left:'-9999px',width:1,height:1,overflow:'hidden'}} aria-hidden="true">
              <input ref={honeypotRef} type="text" name="cr_field" tabIndex={-1} autoComplete="off" />
            </div>
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
