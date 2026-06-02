'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, User, Mail, Car, Phone, Instagram, NotebookPen, Share2, ClipboardList } from 'lucide-react'
import ErrorBoundary from '../components/ErrorBoundary'
import { getConsent } from '../lib/consent'

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

const PAST_EVENTS = {
  'Cars & Coffee': {
    img: '/cc-page.jpg', imgAlt: 'Cars & Coffee event poster', imgPos: 'top',
    meta: 'Montreal · May 9, 2026', title: 'Cars & Coffee',
    sub: 'Good cars. Great coffee. Better people.',
    tags: ['09:30 – 12:00 PM', 'Open to all', 'Free entry'],
  },
  'Grand Prix Weekend - Cars, Coffee & Cruise': {
    img: null,
    meta: 'Montreal · May 23, 2026', title: 'Grand Prix Weekend',
    sub: 'Cars, Coffee & Cruise — GP Weekend.',
    tags: ['May 23, 2026', 'Exotics & Classics', 'Open to all'],
  },
  'Into the Laurentians': {
    img: '/june7-poster.png', imgAlt: 'Into the Laurentians road trip', imgPos: 'top',
    meta: 'Mont-Tremblant · June 7, 2026', title: 'Into the Laurentians',
    sub: 'First Route — Canvas Routes.',
    tags: ['June 7, 2026', 'Road Trip', 'Members Only'],
  },
}

export default function Home() {
  const [form, setForm] = useState({ registerFor:'', name:'', email:'', year:'', carMake:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'', downtown_cruise:'' })
  const [errors, setErrors] = useState({})
  const [phoneOptOut, setPhoneOptOut] = useState(false)
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [meetsOpen, setMeetsOpen] = useState(false)
  const [routesOpen, setRoutesOpen] = useState(false)
  const [pastModalEvent, setPastModalEvent] = useState(null)
  const [routesLaunched, setRoutesLaunched] = useState(true)
  const [showEventsPopup, setShowEventsPopup] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const [cookieBannerVisible, setCookieBannerVisible] = useState(false)
  const refSource = useRef('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) refSource.current = ref.slice(0, 100)
  }, [])

  useEffect(() => {
    if (Date.now() >= new Date('2026-06-08T04:00:00Z').getTime()) return
    try { if (sessionStorage.getItem('laurentiansPopupDismissed')) return } catch {}
    const t = setTimeout(() => setShowEventsPopup(true), 800)
    return () => clearTimeout(t)
  }, [])


  useEffect(() => {
    document.body.style.overflow = (pastModalEvent !== null || showEventsPopup) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [pastModalEvent, showEventsPopup])

  useEffect(() => {
    setCookieBannerVisible(getConsent() === null)
    function handleConsentChanged() { setCookieBannerVisible(getConsent() === null) }
    window.addEventListener('cookieConsentChanged', handleConsentChanged)
    window.addEventListener('cookieConsentReset', handleConsentChanged)
    return () => {
      window.removeEventListener('cookieConsentChanged', handleConsentChanged)
      window.removeEventListener('cookieConsentReset', handleConsentChanged)
    }
  }, [])

  useEffect(() => {
    function updateBannerHeight() {
      requestAnimationFrame(() => {
        const banner = document.querySelector('.cookie-banner')
        if (banner) {
          document.documentElement.style.setProperty('--cookie-banner-height', `${banner.offsetHeight}px`)
        }
      })
    }
    updateBannerHeight()
    window.addEventListener('resize', updateBannerHeight)
    window.addEventListener('cookieConsentReset', updateBannerHeight)
    return () => {
      window.removeEventListener('resize', updateBannerHeight)
      window.removeEventListener('cookieConsentReset', updateBannerHeight)
    }
  }, [])

  const stickyState = useRef({ pastAbout: false, atJoin: false })
  const honeypotRef = useRef(null)

  useEffect(() => {
    const about = document.getElementById('about')
    const join = document.getElementById('join')
    if (!about || !join) return

    if (!('IntersectionObserver' in window)) {
      setShowStickyCta(true)
      return
    }

    const aboutObserver = new IntersectionObserver(
      ([entry]) => {
        stickyState.current.pastAbout = entry.isIntersecting || entry.boundingClientRect.top < 0
        setShowStickyCta(stickyState.current.pastAbout && !stickyState.current.atJoin)
      },
      { threshold: 0 }
    )
    const joinObserver = new IntersectionObserver(
      ([entry]) => {
        stickyState.current.atJoin = entry.isIntersecting
        setShowStickyCta(stickyState.current.pastAbout && !stickyState.current.atJoin)
      },
      { threshold: 0 }
    )

    aboutObserver.observe(about)
    joinObserver.observe(join)
    return () => { aboutObserver.disconnect(); joinObserver.disconnect() }
  }, [])


  const GPCC = 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026'
  const gpccClosed = new Date() >= new Date('2026-05-23T14:00:00-04:00')
  const laurentiansIsPast = Date.now() >= new Date('2026-06-08T04:00:00Z').getTime()

  function updateForm(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'registerFor' && value !== GPCC) next.downtown_cruise = ''
      if (field === 'registerFor' && value === GPCC) next.downtown_cruise = 'yes'
      return next
    })
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }))
    if (serverError) setServerError(null)
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length < 4) return digits
    if (digits.length < 7) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  function validate() {
    const newErrors = {}
    if (!form.registerFor) newErrors.registerFor = true
    if (form.name.trim().length < 2) newErrors.name = true
    if (!form.email.trim()) newErrors.email = 'required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'invalid'
    else if (['.con','.cmo','.ocm','.cm','.vom','.cpm','.c'].some(t => form.email.toLowerCase().endsWith(t))) newErrors.email = 'typo'
    if (!form.year.trim()) newErrors.year = true
    if (!form.carMake) newErrors.carMake = true
    if (!form.carModel.trim()) newErrors.carModel = true
    if (!form.dob_month) newErrors.dob_month = true
    if (!form.dob_day) newErrors.dob_day = true
    if (!form.source) newErrors.source = true
    if (form.registerFor === GPCC && !form.downtown_cruise) newErrors.downtown_cruise = true
    if (!phoneOptOut && (!form.phone.trim() || form.phone.replace(/\D/g,'').length !== 10)) newErrors.phone = true
    if (form.instagram.trim() && /\S\s+\S/.test(form.instagram.replace(/^@+/, '').trim())) newErrors.instagram = true
    setErrors(newErrors)
    return newErrors
  }

  function validateField(field) {
    setErrors(prev => {
      const next = { ...prev }
      if (field === 'email') {
        if (!form.email.trim()) { delete next.email }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'invalid'
        else if (['.con','.cmo','.ocm','.cm','.vom','.cpm','.c'].some(t => form.email.toLowerCase().endsWith(t))) next.email = 'typo'
        else delete next.email
      }
      if (field === 'phone') {
        if (form.phone.trim() && form.phone.replace(/\D/g,'').length !== 10) next.phone = true
        else delete next.phone
      }
      if (field === 'instagram') {
        if (form.instagram.trim() && /\S\s+\S/.test(form.instagram.trim())) next.instagram = true
        else delete next.instagram
      }
      return next
    })
  }

  async function handleSubmit() {
    if (status === 'loading') return
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      const fieldOrder = ['registerFor', 'downtown_cruise', 'name', 'email', 'year', 'carMake', 'carModel', 'dob_month', 'phone', 'instagram', 'more', 'source']
      const firstError = fieldOrder.find(f => newErrors[f])
      if (firstError) {
        const el = document.getElementById(`field-${firstError}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setStatus('loading')
    setServerError(null)
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeout = setTimeout(() => controller?.abort(), 30000)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, carModel: [form.carMake, form.carModel].filter(Boolean).join(' '), instagram: form.instagram.trim().replace(/^@+/, ''), ref: refSource.current || undefined, _hp: honeypotRef.current?.value || '' }),
        ...(controller ? { signal: controller.signal } : {}),
      })
      clearTimeout(timeout)
      if (res.ok) {
        setStatus('success')
        setForm({ registerFor:'', name:'', email:'', year:'', carMake:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'', downtown_cruise:'' })
        if (honeypotRef.current) honeypotRef.current.value = ''
        if (typeof window !== 'undefined') {
          if (getConsent() === 'accepted' && window.gtag) window.gtag('event', 'generate_lead', { event_category: 'waitlist' })
          if (window.fbq) window.fbq('track', 'Lead')
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setServerError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        setServerError('Request timed out. Please check your connection — if you\'re on public WiFi, make sure you\'re fully logged in and try again.')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
      setStatus('error')
    }
  }

  function dismissEventsPopup() {
    try { sessionStorage.setItem('laurentiansPopupDismissed', '1') } catch {}
    setShowEventsPopup(false)
  }

  function smoothScroll(id) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  function inputStyle(field) {
    const isFocused = focusedField === field
    const hasError = !!errors[field]
    const hasValue = !!form[field]
    let border, background, boxShadow
    if (hasError) {
      border = '1px solid #7B2032'; background = 'rgba(123,32,50,0.04)'; boxShadow = 'none'
    } else if (hasValue) {
      border = '1px solid #3B6B2F'; background = 'rgba(59,107,47,0.05)'; boxShadow = 'none'
    } else if (isFocused) {
      border = '1px solid #c5a882'; background = 'transparent'; boxShadow = '0 0 0 3px rgba(197,168,130,0.2)'
    } else {
      border = '1px solid rgba(0,0,0,0.2)'; background = 'transparent'; boxShadow = 'none'
    }
    return {
      width:'100%', padding:'0.9rem 1.2rem',
      border, background, boxShadow,
      fontSize:'13px', fontFamily:"var(--font-inter),sans-serif", outline:'none', color:'#1a1a1a',
      transition:'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      WebkitAppearance:'none', MozAppearance:'none', appearance:'none',
    }
  }

  return (
    <ErrorBoundary>
    <div style={{background:"#F5F1EC",fontFamily:"var(--font-inter),sans-serif",color:"#1a1a1a"}}>

      {/* NAV */}
      <nav className="nav">
        <a href="/" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </a>
        <div className="nav-links">
          <a href="#about" onClick={e => { e.preventDefault(); smoothScroll('about') }}>About Us</a>
          <a href="#events" onClick={e => { e.preventDefault(); smoothScroll('events') }}>Events</a>
          <a href="#contact" onClick={e => { e.preventDefault(); smoothScroll('contact') }}>Contact</a>
          <Link href="/faq">FAQ</Link>
        </div>
        <div className="nav-cta">
          <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="nav-join">Join</a>
          <Link href="/members/login" className="nav-members">Members Login</Link>
        </div>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="#about" onClick={e => { e.preventDefault(); smoothScroll('about') }}>About Us</a>
        <a href="#meets" onClick={e => { e.preventDefault(); smoothScroll('meets') }}>Car Meets</a>
        <a href="#routes" onClick={e => { e.preventDefault(); smoothScroll('routes') }}>Routes</a>
        <a href="#events" onClick={e => { e.preventDefault(); smoothScroll('events') }}>Events</a>
        <a href="#contact" onClick={e => { e.preventDefault(); smoothScroll('contact') }}>Contact</a>
        <Link href="/faq">FAQ</Link>
        <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} style={{color:"#1a1a1a",fontWeight:"500"}}>Join</a>
        <Link href="/members/login" style={{color:"#3B6B2F",fontWeight:"500"}}>Members Login</Link>
      </div>

      {/* HERO */}
      <section id="top" className="hero">
        <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"2rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem"}}><MapPin size={12} strokeWidth={1.5} />Montreal · Est. 2025</div>
        <div style={{width:"1px",height:"80px",background:"#c5a882",margin:"0 auto 2rem"}}></div>
        <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="hero-logo" />
        <div style={{width:"40px",height:"1px",background:"#c5a882",margin:"0 auto 1.5rem"}}></div>
        <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.4rem",fontWeight:"300",color:"#444",marginBottom:"3rem",letterSpacing:"0.02em"}}>The Community. The Routes. The Canvas.</div>
        <div className="hero-buttons">
          <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join</a>
          <a href="#about" onClick={e => { e.preventDefault(); smoothScroll('about') }} className="btn-push" style={{display:"inline-block",padding:"0.9rem 2.5rem",border:"1px solid #1a1a1a",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#1a1a1a",textDecoration:"none",background:"transparent"}}>About Us</a>
        </div>
        <a href="#about" onClick={e => { e.preventDefault(); smoothScroll('about') }}
          aria-label="Scroll down"
          className={`hero-scroll-arrow${showStickyCta ? ' hero-scroll-arrow--hidden' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </svg>
        </a>
      </section>

      {/* ABOUT */}
      <section id="about" style={{background:"#EDE8E1",padding:"6rem 3rem"}}>
        <div className="about-grid">
          <div>
            <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>About Us</div>
            <div className="section-title" style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.8rem",fontWeight:"300",lineHeight:"1.2",color:"#1a1a1a",marginBottom:"1.5rem"}}>Driving is an <em style={{color:"#7B2032"}}>art form.</em><br/>We treat it like one.</div>
            <div style={{fontSize:"0.95rem",lineHeight:"1.9",color:"#555",maxWidth:"520px",marginBottom:"1.5rem"}}>
              <strong style={{color:"#1a1a1a",fontWeight:"500"}}>We are driving enthusiasts before car enthusiasts.</strong> Canvas Routes was born from a simple idea — that driving should be more than just getting from A to B. We are not a show-and-tell club. We drive. The best roads deserve the best company, and great cars are meant to be experienced, not just owned.
              <br/><br/>
              Based in Montreal, we take the best roads in Quebec, Ontario, Vermont, Maine and New York — and fill them with people who actually care about the drive. Every route is hand-picked. Every detail is considered. Every event ends with you already thinking about the next one.
              <br/><br/>
              Canvas Routes is for those who understand that a great car deserves great roads. If you've chosen your car for the way it makes you feel — the sound, the handling, the experience — you're exactly who we built this for.
            </div>
            <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
              <a href="#meets" onClick={e => { e.preventDefault(); smoothScroll('meets') }} style={{display:"inline-block",padding:"0.75rem 1.8rem",border:"1px solid #3B6B2F",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#3B6B2F",textDecoration:"none"}}>Car Meets</a>
              <a href="#routes" onClick={e => { e.preventDefault(); smoothScroll('routes') }} style={{display:"inline-block",padding:"0.75rem 1.8rem",border:"1px solid #7B2032",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#7B2032",textDecoration:"none"}}>Routes</a>
            </div>
          </div>
          <div className="about-img" style={{position:"relative"}}>
            <div style={{width:"100%",height:"100%",backgroundImage:"url('/route-photo.jpg')",backgroundSize:"cover",backgroundPosition:"center"}} />
            <div style={{position:"absolute",inset:0}} onContextMenu={e=>e.preventDefault()} />
          </div>
        </div>
      </section>

      {/* CAR MEETS */}
      <section id="meets" style={{background:"#F5F1EC",borderTop:"0.5px solid rgba(0,0,0,0.08)"}}>
        <button onClick={() => setMeetsOpen(!meetsOpen)} className="expand-btn btn-push" aria-expanded={meetsOpen} aria-controls="meets-content">
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"0.4rem"}}>
            <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888"}}>Community</div>
            <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a"}}>Car Meets</div>
          </div>
          <div className="expand-plus" style={{transform:meetsOpen?"rotate(45deg)":"rotate(0deg)"}}>+</div>
        </button>
        {meetsOpen && (
          <div id="meets-content" className="expand-content">
            <div className="expand-grid">
              <div>
                <p style={{fontSize:"0.95rem",lineHeight:"1.9",color:"#555",marginBottom:"2rem"}}>
                  Our car meets are where the community comes together — great cars, genuine conversation, and the kind of energy that doesn't need to be manufactured. First time or fifth time, the vibe is the same.
                </p>
                <div className="meets-cards-grid">
                  <div style={{padding:"1.5rem",border:"0.5px solid rgba(0,0,0,0.12)",background:"#EDE8E1"}}>
                    <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#3B6B2F",marginBottom:"0.8rem"}}>Open Meets</div>
                    <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.2rem",color:"#1a1a1a",marginBottom:"0.8rem"}}>Everyone welcome</div>
                    <p style={{fontSize:"0.85rem",lineHeight:"1.7",color:"#555"}}>No membership required — just show up. Meet people who get it, see what Canvas Routes is about, and find out why people keep coming back. The format changes, the energy doesn't.</p>
                  </div>
                  <div style={{padding:"1.5rem",border:"0.5px solid rgba(0,0,0,0.12)",background:"#EDE8E1"}}>
                    <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#7B2032",marginBottom:"0.8rem"}}>Private Meets</div>
                    <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.2rem",color:"#1a1a1a",marginBottom:"0.8rem"}}>Members only</div>
                    <p style={{fontSize:"0.85rem",lineHeight:"1.7",color:"#555"}}>Exclusive to Canvas Routes members. Private venues, a tighter group, and a different kind of evening. Members are notified directly when one is announced — these don't get advertised.</p>
                  </div>
                </div>
                <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join</a>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px",minHeight:"300px",overflow:"hidden"}}>
                <div style={{flex:1,minHeight:"180px",backgroundImage:"url('/events/cc-may9-overview.jpeg')",backgroundSize:"cover",backgroundPosition:"center top"}} onContextMenu={e=>e.preventDefault()} />
                <div style={{flex:1,minHeight:"180px",backgroundImage:"url('/events/cc-may9-ferraris.jpeg')",backgroundSize:"cover",backgroundPosition:"center"}} onContextMenu={e=>e.preventDefault()} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ROUTES */}
      <section id="routes" style={{background:"#F5F1EC",borderTop:"0.5px solid rgba(0,0,0,0.08)"}}>
        <button onClick={() => setRoutesOpen(!routesOpen)} className="expand-btn btn-push" aria-expanded={routesOpen} aria-controls="routes-content">
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"0.4rem"}}>
            <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888"}}>Experiences</div>
            <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a"}}>Routes</div>
          </div>
          <div className="expand-plus" style={{transform:routesOpen?"rotate(45deg)":"rotate(0deg)"}}>+</div>
        </button>
        {routesOpen && (
          <div id="routes-content" className="expand-content">
            <div className="expand-grid">
              <div>
                <p style={{fontSize:"0.95rem",lineHeight:"1.9",color:"#555",marginBottom:"1.5rem"}}>
                  Our routes are designed for those who drive not just to arrive, but to <em>feel something</em>. Every drive is hand-curated — from the road itself to where it takes you. Expect winding roads through North America's most stunning landscapes, stops at local and premium dining, wineries, golf courses, and even overnight adventures for those who want to go further.
                </p>
                <p style={{fontSize:"0.95rem",lineHeight:"1.9",color:"#555",marginBottom:"2rem"}}>
                  At the heart of every route are the backroads — the kind that reward a driver-focused car. The twists, the elevation changes, the open stretches where the car finally gets to breathe. That's what we build our drives around.
                </p>
                <div style={{marginBottom:"2rem"}}>
                  <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>Where we go</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem"}}>
                    {["Wineries","Golf Courses","Local Eats","Premium Dining","Overnight Trips","Scenic Backroads"].map((tag,i) => (
                      <span key={i} style={{padding:"0.4rem 1rem",border:"0.5px solid rgba(0,0,0,0.2)",fontSize:"12px",letterSpacing:"0.05em",color:"#555"}}>{tag}</span>
                    ))}
                  </div>
                </div>
                <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join</a>
              </div>
              <div style={{background:"#D9D2C7",minHeight:"300px",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",inset:0,backgroundImage:"url('/route-photo.jpg')",backgroundSize:"cover",backgroundPosition:"center"}} />
                <div style={{position:"absolute",inset:0}} onContextMenu={e=>e.preventDefault()} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* EVENTS */}
      <section id="events" style={{background:"#0F1E14",padding:"6rem 3rem"}}>
        <div style={{textAlign:"center",marginBottom:"4rem"}}>
          <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#666",marginBottom:"1rem"}}>On the calendar</div>
          <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.8rem",fontWeight:"300",color:"#F5F1EC",marginBottom:"0.5rem"}}>2026 Season</div>
          <div style={{fontSize:"0.85rem",color:"#888",letterSpacing:"0.05em"}}>Exclusive to members and invited guests</div>
        </div>
        <div className="events-grid">
          {[
            {date:"May 9, 2026",name:"Cars & Coffee",loc:"Montreal, QC",type:"Past Event",past:true},
            {date:"May 23, 2026",name:"Grand Prix Weekend - Cars, Coffee & Cruise",loc:"Exotics and Classics",type:"Past Event",past:true},
            ...(Date.now() >= new Date('2026-06-08T04:00:00Z').getTime()
              ? [{date:"June 7, 2026",name:"Into the Laurentians",loc:"Mont-Tremblant, QC",type:"Past Event",past:true}]
              : [{date:"June 7, 2026",name:"Into the Laurentians",loc:"Mont-Tremblant, QC",type:"Route",href:"/routes"}]
            ),
            {date:"June 2026",name:"Whips to Eastern Townships",loc:"Cantons-de-l'Est, QC",type:"Route",teaser:"Wine country roads and sweeping valleys through the Eastern Townships — a route built for a summer day.",membersOnly:true},
            {date:"August 2026",name:"Charlevoix Coastal Route",loc:"Charlevoix, QC",type:"Route",teaser:"Quebec's most dramatic coastline — clifftop roads, river views, and countryside that earns every kilometre.",membersOnly:true},
          ].map((e,i) => (
            <div key={i} className="event-card" style={e.past
              ? {background:"#0F1E14",border:"1px solid rgba(197,168,130,0.55)",padding:"2rem",position:"relative",overflow:"hidden",cursor:"pointer"}
              : e.inviteOnly
                ? {background:"#F5F1EC",border:"0.5px solid rgba(0,0,0,0.1)",padding:"2rem",cursor:"pointer"}
                : {background:"#F5F1EC",border:"0.5px solid rgba(0,0,0,0.1)",padding:"2rem"}
            } onClick={e.past ? () => setPastModalEvent(e) : undefined}>
              {e.past && <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.8),transparent)"}} />}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:e.past?"rgba(197,168,130,0.65)":"#7B2032"}}>{e.date}</div>
                <div style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:e.past?"rgba(197,168,130,0.6)":"#7B5B2E",border:`0.5px solid ${e.past?"rgba(197,168,130,0.5)":"#7B5B2E"}`,padding:"2px 8px"}}>{e.type}</div>
              </div>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.4rem",fontWeight:"300",color:e.past?"#F5F1EC":"#1A1008",marginBottom:"0.5rem"}}>{e.name}</div>
              <div style={{fontSize:"12px",color:e.past?"rgba(245,241,236,0.4)":"#5A4A38",marginBottom:e.teaser?"0.75rem":"1.5rem"}}>{e.loc}</div>
              {e.teaser && <p style={{fontSize:"12px",color:"#7A6A58",lineHeight:"1.65",marginBottom:"1.25rem"}}>{e.teaser}</p>}
              {e.past
                ? <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",display:"inline-flex",alignItems:"center",gap:"0.4rem"}}>View Recap <span style={{fontSize:"13px"}}>→</span></div>
                : e.inviteOnly
                  ? <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7B2032",paddingBottom:"2px",display:"inline-block"}}>Invite Only</div>
                  : e.membersOnly
                  ? <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#3B6B2F",border:"0.5px solid rgba(59,107,47,0.35)",padding:"3px 10px",display:"inline-block",background:"rgba(59,107,47,0.06)"}}>Members Only</div>
                  : e.href
                    ? routesLaunched
                      ? <Link href={e.href} className="btn-push" style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7B2032",border:"0.5px solid #7B2032",padding:"0.4rem 1rem",background:"transparent",cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",textDecoration:"none",display:"inline-block"}}>View Details</Link>
                      : <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7A6A58",paddingBottom:"2px",display:"inline-block"}}>Details coming soon</div>
                    : <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7A6A58",paddingBottom:"2px",display:"inline-block"}}>Details coming soon</div>
              }
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{background:"#EDE8E1",padding:"6rem 3rem",textAlign:"center"}}>
        <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>Get in touch</div>
        <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.8rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem",lineHeight:"1.2"}}>Let's talk <em style={{color:"#7B2032"}}>routes.</em></div>
        <div style={{width:"40px",height:"1px",background:"#c5a882",margin:"1.5rem auto"}}></div>
        <p style={{fontSize:"0.95rem",lineHeight:"1.8",color:"#555",maxWidth:"420px",margin:"0 auto 3rem"}}>Have a question, a partnership idea, or just want to know more? Reach out — we'd love to hear from you.</p>
        <div className="contact-links" style={{flexDirection:"column",alignItems:"center",gap:"1.5rem"}}>
          <div style={{display:"flex",gap:"3rem",justifyContent:"center",flexWrap:"wrap"}}>
          <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="contact-link">
            <div className="contact-link-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#888",marginBottom:"0.3rem"}}>Instagram</div>
              <div style={{fontSize:"0.95rem",color:"#1a1a1a"}}>@canvasroutes</div>
            </div>
          </a>
          <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="contact-link">
            <div className="contact-link-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </div>
            <div>
              <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#888",marginBottom:"0.3rem"}}>Facebook</div>
              <div style={{fontSize:"0.95rem",color:"#1a1a1a"}}>Canvas Routes</div>
            </div>
          </a>
          </div>
          <div style={{display:"flex",justifyContent:"center"}}>
          <a href="mailto:info@canvasroutes.com" className="contact-link">
            <div className="contact-link-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#888",marginBottom:"0.3rem"}}>Email</div>
              <div style={{fontSize:"0.95rem",color:"#1a1a1a"}}>info@canvasroutes.com</div>
            </div>
          </a>
          </div>
        </div>
      </section>

      {/* JOIN */}
      <section id="join" style={{textAlign:"center",padding:"8rem 2rem",background:"#F5F1EC"}}>
        <div style={{width:"1px",height:"80px",background:"#c5a882",margin:"0 auto 2rem"}}></div>
        <div className="join-title" style={{fontFamily:"var(--font-cormorant),serif",fontSize:"3.5rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem",lineHeight:"1.1"}}>Reserve your<br/>seat at the wheel.</div>
        <div style={{fontSize:"0.9rem",color:"#777",maxWidth:"400px",margin:"1rem auto 3rem",lineHeight:"1.7"}}>Membership is by application. Tell us about yourself.</div>
        {routesLaunched && !laurentiansIsPast && (
          <div style={{maxWidth:"560px",margin:"-1rem auto 3rem",padding:"1.2rem 1.6rem",border:"0.5px solid rgba(197,168,130,0.45)",background:"rgba(197,168,130,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:"10px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#c5a882",marginBottom:"0.3rem"}}>Road Trip · 7 Jun 2026</div>
              <div style={{fontSize:"0.9rem",color:"#1a1a1a",lineHeight:"1.4"}}>Into the Laurentians — First Route</div>
            </div>
            <Link href="/routes#form" style={{fontSize:"11px",letterSpacing:"0.14em",textTransform:"uppercase",color:"#7B2032",border:"0.5px solid #7B2032",padding:"0.5rem 1.1rem",textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>Register →</Link>
          </div>
        )}
        {status === 'success' ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1.5rem"}}>
            <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.4rem",fontWeight:"300",color:"#3B6B2F"}}>Application received. We'll review it and get back to you — usually within 48 hours.</div>
            <p style={{fontSize:"0.85rem",color:"#777",lineHeight:"1.75",maxWidth:"420px",textAlign:"center"}}>A confirmation email is on its way from <strong style={{color:"#555",fontWeight:"500"}}>info@canvasroutes.com</strong> or <strong style={{color:"#555",fontWeight:"500"}}>jerry@canvasroutes.com</strong> — add both to your contacts and check your spam/junk folder so you don't miss it. Once we've reviewed your application, you'll hear from our team directly. If you don't hear from us, reach out via <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer" style={{color:"#555",textDecoration:"underline"}}>Instagram</a> or <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" style={{color:"#555",textDecoration:"underline"}}>Facebook</a> DM.</p>
            <button onClick={() => { setStatus(null); setServerError(null); setForm({ registerFor:'', name:'', email:'', year:'', carMake:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'', downtown_cruise:'' }); setErrors({}) }} className="btn-push" style={{background:"none",border:"none",padding:0,fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#aaa",cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",textDecoration:"underline"}}>Submit another application</button>
          </div>
        ) : (
          <form className="join-form" onSubmit={e => { e.preventDefault(); handleSubmit() }} noValidate>
            <div id="field-registerFor" role="group" aria-required="true" className="join-form-field" style={{marginBottom:"1.5rem"}}>
              <div className="join-label" style={{marginBottom:"0.75rem"}}>Registering for<ClipboardList size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></div>
              <div className="join-form-row" style={{gridTemplateColumns:'1fr'}}>
                {[
                  {value:"Canvas Routes Membership", label:"Canvas Routes Membership", sub:"Curated community, by application"},
                  ...(!gpccClosed ? [{value:"Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026", label:"Grand Prix Weekend - Cars, Coffee & Cruise", sub:"Spots are full · Downtown Cruise registrations open until 2:00 PM", full:true}] : []),
                ].map(opt => {
                  const selected = form.registerFor === opt.value
                  const borderColor = selected ? '#3B6B2F' : errors.registerFor ? '#7B2032' : 'rgba(0,0,0,0.2)'
                  const bgColor = selected ? 'rgba(59,107,47,0.06)' : errors.registerFor ? 'rgba(123,32,50,0.04)' : 'transparent'
                  const labelColor = selected ? '#3B6B2F' : errors.registerFor ? '#7B2032' : opt.full ? '#888' : '#1a1a1a'
                  return (
                    <button key={opt.value} type="button" onClick={() => updateForm('registerFor', opt.value)} style={{padding:"1rem 1.2rem",border:`1px solid ${opt.full && !selected ? 'rgba(0,0,0,0.12)' : borderColor}`,background:opt.full && !selected ? 'rgba(0,0,0,0.02)' : bgColor,textAlign:"left",cursor:"pointer",transition:"border-color 0.2s,background 0.2s",fontFamily:"var(--font-inter),sans-serif",position:"relative"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem"}}>
                        <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:labelColor,fontWeight:selected?"500":"400"}}>{opt.label}</div>
                        {opt.full && <span style={{fontSize:"9px",letterSpacing:"0.12em",textTransform:"uppercase",color:"#fff",background:"#7B2032",padding:"0.15rem 0.5rem"}}>Full</span>}
                      </div>
                      <div style={{fontSize:"11px",color: opt.full ? '#c5a882' : "#888"}}>{opt.sub}</div>
                    </button>
                  )
                })}
              </div>
              {form.registerFor === GPCC && (
                <div style={{marginTop:"0.75rem",padding:"0.8rem 1rem",background:"rgba(197,168,130,0.08)",border:"0.5px solid rgba(197,168,130,0.4)",fontSize:"11px",color:"#7B2032",lineHeight:"1.6"}}>
                  Cars, Coffee &amp; Cruise is at capacity. Registrations for the Downtown Cruise only — closes at 2:00 PM today.
                </div>
              )}
              {errors.registerFor && <span style={{fontSize:"11px",color:"#7B2032"}}>Please select an option</span>}
            </div>

            {form.registerFor === GPCC && (
              <div id="field-downtown_cruise" className="join-form-field" style={{marginBottom:"1.5rem"}}>
                <div className="join-label" style={{marginBottom:"0.75rem"}}>
                  Interested in joining the downtown cruise after the event?
                  <span style={{color:"#7B2032",marginLeft:"3px"}}>*</span>
                </div>
                <div style={{display:"flex",gap:"1rem"}}>
                  {['Yes','No'].map(v => {
                    const val = v.toLowerCase()
                    const selected = form.downtown_cruise === val
                    const isNo = val === 'no'
                    const activeColor = isNo ? '#7B2032' : '#3B6B2F'
                    const activeBg = isNo ? 'rgba(123,32,50,0.06)' : 'rgba(59,107,47,0.06)'
                    return (
                      <button key={v} type="button" onClick={() => updateForm('downtown_cruise', val)}
                        style={{flex:1,padding:"0.9rem",border:`1px solid ${selected?activeColor:errors.downtown_cruise?'#7B2032':'rgba(0,0,0,0.2)'}`,background:selected?activeBg:errors.downtown_cruise?'rgba(123,32,50,0.03)':'transparent',cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",fontSize:"13px",color:selected?activeColor:'#1a1a1a',transition:"all 0.2s",letterSpacing:"0.04em"}}>
                        {v}
                      </button>
                    )
                  })}
                </div>
                {errors.downtown_cruise && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
              </div>
            )}

            <div className="join-form-row">
              <div className="join-form-field">
                <label htmlFor="field-name" className="join-label">Full name<User size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/></label>
                <div style={{position:"relative"}}>
                  <input id="field-name" type="text" placeholder="Your full name" value={form.name}
                    onChange={e => updateForm('name', e.target.value)} style={inputStyle('name')} maxLength={100}
                    aria-required="true"
                    onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
                  {!form.name && <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
                </div>
                {errors.name && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
              </div>
              <div className="join-form-field">
                <label htmlFor="field-email" className="join-label">Email<Mail size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/></label>
                <div style={{position:"relative"}}>
                  <input id="field-email" type="email" placeholder="Your email address" value={form.email}
                    onChange={e => updateForm('email', e.target.value)} style={inputStyle('email')}
                    aria-required="true"
                    onFocus={() => setFocusedField('email')} onBlur={() => { setFocusedField(null); validateField('email') }} />
                  {!form.email && <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
                </div>
                {errors.email === 'required' && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                {errors.email === 'invalid' && <span style={{fontSize:"11px",color:"#7B2032"}}>Please enter a valid email address</span>}
                {errors.email === 'typo' && <span style={{fontSize:"11px",color:"#7B2032"}}>Please check your email address</span>}
              </div>
            </div>
            <div className="join-form-row" style={{marginTop:"1rem"}}>
              <div className="join-form-field">
                <label htmlFor="field-year" className="join-label">Year<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                <div style={{position:"relative"}}>
                  <select id="field-year" value={form.year} onChange={e => updateForm('year', e.target.value)}
                    style={{...inputStyle('year'), cursor:"pointer", paddingRight:"2rem"}}
                    aria-required="true">
                    <option value="">Select year</option>
                    {Array.from({length:2027-1940+1},(_,i)=>2027-i).map(y=>(
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                  {!form.year && <span style={{position:"absolute",right:"28px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
                  <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {errors.year && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
              </div>
              <div className="join-form-field">
                <label htmlFor="field-carMake" className="join-label">Make<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                <div style={{position:"relative"}}>
                  <select id="field-carMake" value={form.carMake} onChange={e => updateForm('carMake', e.target.value)}
                    style={{...inputStyle('carMake'), cursor:"pointer", paddingRight:"2rem"}}
                    aria-required="true">
                    <option value="">Select make</option>
                    {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {!form.carMake && <span style={{position:"absolute",right:"28px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
                  <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {errors.carMake && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
              </div>
            </div>
            <div className="join-form-field" style={{marginTop:"1rem"}}>
              <label htmlFor="field-carModel" className="join-label">Model<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
              <div style={{position:"relative"}}>
                <input id="field-carModel" type="text" placeholder="e.g. 911 Carrera S" value={form.carModel}
                  onChange={e => updateForm('carModel', e.target.value)} style={inputStyle('carModel')}
                  aria-required="true" maxLength={100}
                  onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)} />
                {!form.carModel && <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
              </div>
              {errors.carModel && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
            </div>
            <div id="field-dob_month" className="join-form-field" style={{marginTop:"1rem"}}>
              <div className="join-label" style={{marginBottom:"0.5rem"}}>Date of birth <span style={{color:"#7B2032",marginLeft:"2px"}}>*</span> <span style={{color:"#888",fontWeight:"300",textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(year optional)</span></div>
              <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.2fr",gap:"0.75rem"}}>
                <div style={{position:"relative"}}>
                  <select value={form.dob_month} onChange={e => updateForm('dob_month', e.target.value)}
                    style={{...inputStyle('dob_month'), cursor:"pointer", paddingRight:"2rem"}}
                    aria-required="true">
                    <option value="">Month</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => (
                      <option key={i+1} value={String(i+1)}>{m}</option>
                    ))}
                  </select>
                  <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div style={{position:"relative"}}>
                  <select value={form.dob_day} onChange={e => updateForm('dob_day', e.target.value)}
                    style={{...inputStyle('dob_day'), cursor:"pointer", paddingRight:"2rem"}}
                    aria-required="true">
                    <option value="">Day</option>
                    {Array.from({length:31},(_,i)=>i+1).map(d => (
                      <option key={d} value={String(d)}>{d}</option>
                    ))}
                  </select>
                  <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div style={{position:"relative"}}>
                  <select value={form.dob_year} onChange={e => updateForm('dob_year', e.target.value)}
                    style={{...inputStyle('dob_year'), cursor:"pointer", paddingRight:"2rem"}}>
                    <option value="">Year</option>
                    {Array.from({length:2015-1945+1},(_,i)=>2015-i).map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                  <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              {(errors.dob_month || errors.dob_day) && <span style={{fontSize:"11px",color:"#7B2032"}}>Month and day are required</span>}
            </div>

            <div className="join-form-row" style={{marginTop:"1rem"}}>
              <div className="join-form-field">
                <label htmlFor="field-phone" className="join-label">Phone<Phone size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                {phoneOptOut ? (
                  <div style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0.9rem",background:"rgba(0,0,0,0.03)",border:"0.5px solid rgba(0,0,0,0.1)"}}>
                    <span style={{fontSize:"13px",color:"#aaa",flex:1}}>Phone not provided</span>
                    <button type="button" onClick={() => { setPhoneOptOut(false); setErrors(p => ({...p, phone: undefined})) }} style={{background:"none",border:"none",padding:0,fontSize:"11px",color:"#888",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",whiteSpace:"nowrap"}}>Add number</button>
                  </div>
                ) : (
                  <>
                    <input id="field-phone" type="tel" placeholder="Your phone number" value={form.phone}
                      onChange={e => updateForm('phone', formatPhone(e.target.value))} style={inputStyle('phone')}
                      onFocus={() => setFocusedField('phone')} onBlur={() => { setFocusedField(null); validateField('phone') }} />
                    {errors.phone && <span style={{fontSize:"11px",color:"#7B2032"}}>Please enter a valid 10-digit number</span>}
                    <button type="button" onClick={() => { setPhoneOptOut(true); updateForm('phone',''); setErrors(p => ({...p, phone: undefined})) }} style={{background:"none",border:"none",padding:"0.3rem 0",fontSize:"11px",color:"#aaa",cursor:"pointer",textDecoration:"underline",fontFamily:"var(--font-inter),sans-serif",textAlign:"left"}}>Prefer not to share my number</button>
                  </>
                )}
              </div>
              <div className="join-form-field">
                <label htmlFor="field-instagram" className="join-label">Instagram<Instagram size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/> <span style={{color:"#888",fontWeight:"300"}}>(optional)</span></label>
                <input id="field-instagram" type="text" placeholder="@yourhandle" value={form.instagram} maxLength={50}
                  onChange={e => updateForm('instagram', e.target.value)} style={inputStyle('instagram')}
                  onFocus={() => setFocusedField('instagram')} onBlur={() => { setFocusedField(null); validateField('instagram') }} />
                {errors.instagram && <span style={{fontSize:"11px",color:"#7B2032"}}>No spaces allowed in username</span>}
              </div>
            </div>
            <div className="join-form-field" style={{marginTop:"1rem"}}>
              <label htmlFor="field-more" className="join-label">Tell us more<NotebookPen size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/> <span style={{color:"#888",fontWeight:"300"}}>(optional)</span></label>
              <textarea id="field-more" placeholder="Tell us about your interests, dream routes, or anything else..." value={form.more}
                onChange={e => updateForm('more', e.target.value)} rows={4} maxLength={500}
                style={{...inputStyle('more'), resize:"vertical"}}
                onFocus={() => setFocusedField('more')} onBlur={() => setFocusedField(null)} />
              <div style={{textAlign:"right",fontSize:"10px",color:"#aaa",marginTop:"0.3rem"}}>{form.more.length}/500</div>
            </div>
            <div className="join-form-field" style={{marginTop:"1rem"}}>
              <label htmlFor="field-source" className="join-label">How did you hear about us?<Share2 size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/></label>
              <div style={{position:"relative"}}>
                <select id="field-source" value={form.source} onChange={e => updateForm('source', e.target.value)}
                  style={{...inputStyle('source'), cursor:"pointer", paddingRight:"2rem"}}
                  aria-required="true">
                  <option value="">Select an option</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Friend / Word of mouth">Friend / Word of mouth</option>
                  <option value="Google">Google</option>
                  <option value="Other">Other</option>
                </select>
                {!form.source && <span style={{position:"absolute",right:"28px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
                <svg style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {errors.source && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
            </div>
            <div style={{marginTop:"1.5rem",fontSize:"10px",color:"#ccc",lineHeight:"1.7",textAlign:"left"}}>
              By applying, you agree to our{' '}
              <Link href="/privacy" style={{fontSize:"10px",color:"#ccc",textDecoration:"underline"}}>privacy policy</Link>
              {' '}and{' '}
              <Link href="/terms" style={{fontSize:"10px",color:"#ccc",textDecoration:"underline"}}>terms & conditions</Link>
              {' '}and consent to receive updates from Canvas Routes about events and membership. You may withdraw your consent at any time by contacting{' '}
              <a href="mailto:info@canvasroutes.com" style={{fontSize:"10px",color:"#ccc",textDecoration:"underline"}}>info@canvasroutes.com</a>.
            </div>
            <button type="submit" disabled={status==='loading'} className="join-submit-btn"
              style={{marginTop:"1.5rem",padding:"0.9rem 3rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",cursor:status==='loading'?'not-allowed':'pointer',fontFamily:"var(--font-inter),sans-serif",opacity:status==='loading'?0.5:1}}>
              {status === 'loading' ? 'Sending...' : 'Register'}
            </button>
            {status === 'error' && <div style={{marginTop:"1rem",fontSize:"12px",color:"#7B2032"}}>{serverError}</div>}
            <div style={{display:'none'}} aria-hidden="true">
              <input ref={honeypotRef} type="text" name="cr_field" tabIndex={-1} autoComplete="off" />
            </div>
          </form>
        )}
      </section>



      {/* PAST EVENT MODAL */}
      {pastModalEvent && (() => {
          const d = PAST_EVENTS[pastModalEvent.name] || { meta: pastModalEvent.date, title: pastModalEvent.name, sub: null, tags: [], img: null }
          return (
            <div
              key="past-modal"
              onClick={() => setPastModalEvent(null)}
              style={{position:"fixed",inset:0,background:"rgba(15,30,20,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}
            >
              <div
                onClick={ev => ev.stopPropagation()}
                style={{background:"#0F1E14",maxWidth:"420px",width:"100%",position:"relative",fontFamily:"var(--font-inter),sans-serif",overflow:"hidden",border:"1px solid rgba(197,168,130,0.35)"}}
              >
                <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.75),transparent)",zIndex:1}} />
                <button onClick={() => setPastModalEvent(null)} style={{position:"absolute",top:"0.6rem",right:"0.6rem",zIndex:10,background:"rgba(0,0,0,0.45)",border:"none",cursor:"pointer",color:"#fff",fontSize:"18px",lineHeight:1,width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontFamily:"var(--font-inter),sans-serif"}}>×</button>
                {d.img && <Image src={d.img} alt={d.imgAlt||''} width={842} height={1215} style={{width:"100%",height:"220px",objectFit:"cover",objectPosition:d.imgPos||"top",display:"block"}} />}
                <div style={{padding:"1.8rem 2rem 2rem"}}>
                  <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",marginBottom:"0.5rem"}}>{d.meta}</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.4rem"}}>{d.title}</div>
                  {d.sub && <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1rem",fontStyle:"italic",color:"rgba(245,241,236,0.5)",marginBottom:"1.4rem"}}>{d.sub}</div>}
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1.8rem"}}>
                    {d.tags.map((tag,idx) => (
                      <span key={idx} style={{fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(197,168,130,0.75)",border:"0.5px solid rgba(197,168,130,0.3)",padding:"0.3rem 0.75rem"}}>{tag}</span>
                    ))}
                  </div>
                  <div style={{width:"30px",height:"0.5px",background:"rgba(197,168,130,0.35)",marginBottom:"1.4rem"}} />
                  <div style={{fontSize:"12px",color:"rgba(245,241,236,0.55)",lineHeight:"1.75"}}>
                    To see photos &amp; videos from this event, follow us on{' '}
                    <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{color:"#c5a882",textDecoration:"none",borderBottom:"0.5px solid rgba(197,168,130,0.45)"}}>Instagram</a>
                    {' '}and{' '}
                    <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" style={{color:"#c5a882",textDecoration:"none",borderBottom:"0.5px solid rgba(197,168,130,0.45)"}}>Facebook</a>.
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {/* EVENTS POPUP */}
      {showEventsPopup && (
          <div
            onClick={dismissEventsPopup}
            style={{position:"fixed",inset:0,background:"rgba(10,22,14,0.94)",zIndex:1002,display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"2rem 1.25rem",overflowY:"auto"}}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="events-popup-cards"
              style={{display:"flex",gap:"1.25rem",position:"relative"}}
            >
              <button onClick={dismissEventsPopup} style={{position:"absolute",top:"-0.5rem",right:"-0.5rem",zIndex:10,background:"rgba(0,0,0,0.6)",border:"none",cursor:"pointer",color:"#fff",fontSize:"18px",lineHeight:1,width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontFamily:"var(--font-inter),sans-serif"}}>×</button>

              {/* Into the Laurentians */}
              <div style={{flex:1,maxWidth:"420px",background:"#0F1E14",border:"1px solid rgba(197,168,130,0.35)",overflow:"hidden",position:"relative",fontFamily:"var(--font-inter),sans-serif"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.75),transparent)",zIndex:1}} />
                <img src="/june7-poster.png" alt="Into the Laurentians road trip" style={{width:"100%",height:"200px",objectFit:"cover",objectPosition:"top",display:"block"}} />
                <div style={{padding:"1.6rem 1.8rem 2rem"}}>
                  <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",marginBottom:"0.5rem"}}>Mont-Tremblant · June 7, 2026</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.85rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.35rem"}}>Into the<br/>Laurentians</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"0.95rem",fontStyle:"italic",color:"rgba(245,241,236,0.45)",marginBottom:"1.3rem"}}>First Route — Canvas Routes</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"1.5rem"}}>
                    {["June 7, 2026","Road Trip"].map((tag,idx) => (
                      <span key={idx} style={{fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(197,168,130,0.75)",border:"0.5px solid rgba(197,168,130,0.3)",padding:"0.3rem 0.75rem"}}>{tag}</span>
                    ))}
                  </div>
                  <Link href="/routes#form" onClick={dismissEventsPopup}
                    style={{display:"inline-block",padding:"0.8rem 1.8rem",background:"rgba(197,168,130,0.1)",border:"1px solid rgba(197,168,130,0.5)",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",color:"#c5a882",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif"}}>
                    Register
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}

      {/* STICKY MOBILE CTA */}
      <div className={`sticky-cta${showStickyCta ? ' sticky-cta--visible' : ''}`} style={cookieBannerVisible ? {bottom:'var(--cookie-banner-height, 80px)'} : {}}>
        <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"block",width:"100%",padding:"1rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none",textAlign:"center"}}>
          Join
        </a>
      </div>

      {/* FOOTER */}
      <footer style={{borderTop:"0.5px solid rgba(0,0,0,0.12)",padding:"2rem 3rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",background:"#F5F1EC"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
          <div style={{fontSize:"11px",color:"#888",letterSpacing:"0.05em"}}>© 2026 Canvas Routes. Montreal, QC.</div>
          <Link href="/privacy" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em"}}>Privacy Policy</Link>
          <Link href="/terms" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em"}}>Terms</Link>
          <Link href="/faq" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em"}}>FAQ</Link>
          <button onClick={() => window.dispatchEvent(new Event('cookieConsentReset'))} style={{background:"none",border:"none",padding:0,fontSize:"10px",color:"#aaa",cursor:"pointer",letterSpacing:"0.03em",fontFamily:"var(--font-inter),sans-serif",textAlign:"left"}}>Manage cookies</button>
        </div>
        <div style={{display:"flex",gap:"1.2rem",alignItems:"center"}}>
          <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Canvas Routes on Instagram" style={{color:"#555",display:"flex"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Canvas Routes on Facebook" style={{color:"#555",display:"flex"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </a>
        </div>
      </footer>

    </div>
    </ErrorBoundary>
  )
}
