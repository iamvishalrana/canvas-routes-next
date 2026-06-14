'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, User, Mail, Car, Phone, Instagram, NotebookPen, Share2, ClipboardList } from 'lucide-react'
import ErrorBoundary from '../components/ErrorBoundary'
import SiteFooter from '../components/SiteFooter'
import { getConsent } from '../lib/consent'

const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']

const COUNTRY_CODES = [
  '+1',  '+7',  '+20', '+27', '+30', '+31', '+32', '+33', '+34', '+36',
  '+39', '+40', '+41', '+43', '+44', '+45', '+46', '+47', '+48', '+49',
  '+51', '+52', '+54', '+55', '+56', '+57', '+58', '+60', '+61', '+62',
  '+63', '+64', '+65', '+66', '+81', '+82', '+84', '+86', '+90', '+91',
  '+92', '+94', '+351', '+352', '+353', '+358', '+380', '+420', '+852',
  '+886', '+961', '+962', '+965', '+966', '+968', '+971', '+972', '+973', '+974',
]

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
    img: '/june7-poster.jpg', imgAlt: 'Into the Laurentians route', imgPos: 'top',
    meta: 'Mont-Tremblant · June 7, 2026', title: 'Into the Laurentians',
    sub: 'First Route — Canvas Routes.',
    tags: ['June 7, 2026', 'Route', 'Members Only'],
    routeHref: '/itinerary-into-the-laurentians-june-7',
  },
}

export default function Home() {
  const [form, setForm] = useState({ registerFor:'', name:'', email:'', year:'', carMake:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'', downtown_cruise:'' })
  const [errors, setErrors] = useState({})
  const [phoneOptOut, setPhoneOptOut] = useState(false)
  const [countryCode, setCountryCode] = useState('+1')
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [igPosts, setIgPosts] = useState([])

  useEffect(() => {
    fetch('/api/instagram/feed')
      .then(r => r.json())
      .then(d => { if (d.posts?.length) setIgPosts(d.posts) })
      .catch(() => {})
  }, [])
  const [meetsOpen, setMeetsOpen] = useState(false)
  const [routesOpen, setRoutesOpen] = useState(false)
  const [pastModalEvent, setPastModalEvent] = useState(null)
  const [pastModalImageFailed, setPastModalImageFailed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [routesLaunched, setRoutesLaunched] = useState(true)
  const [dbEvents, setDbEvents] = useState([])

  useEffect(() => {
    function parseEventDate(str) {
      if (!str) return null
      const s = str.trim()
      if (/^[A-Za-z]+ \d{4}$/.test(s)) {
        const d = new Date(s.replace(/^([A-Za-z]+) (\d{4})$/, '$1 1, $2'))
        if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      }
      if (/^\d{4}-\d{2}$/.test(s)) {
        const [y, m] = s.split('-').map(Number)
        return new Date(y, m, 0)
      }
      const d = new Date(s)
      return isNaN(d) ? null : d
    }
    fetch('/api/public/events')
      .then(r => r.json())
      .then(events => {
        const now = new Date(); now.setHours(0, 0, 0, 0)
        setDbEvents(events.filter(ev => {
          const d = parseEventDate(ev.date_display || ev.date)
          return !d || d >= now
        }))
      })
      .catch(() => {})
  }, [])
  const [showEventsPopup] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const [membershipLive, setMembershipLive] = useState(false)
  const [showCCDPopup, setShowCCDPopup] = useState(false)
  const [queryForm, setQueryForm] = useState({ name: '', email: '', message: '' })
  const [queryStatus, setQueryStatus] = useState(null)
  const [queryError, setQueryError] = useState(null)

  async function handleQuerySubmit(e) {
    e.preventDefault()
    if (!queryForm.name.trim() || !queryForm.email.trim()) { setQueryError('Please enter your name and email.'); return }
    setQueryStatus('loading'); setQueryError(null)
    try {
      const res = await fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(queryForm) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setQueryError(data.error || 'Could not send. Please try again.'); setQueryStatus(null) }
      else setQueryStatus('success')
    } catch { setQueryError('Network error. Please try again.'); setQueryStatus(null) }
  }

  useEffect(() => {
    const LAUNCH = new Date('2026-06-10T23:00:00Z')
    if (new Date() >= LAUNCH) { setMembershipLive(true); return }
    const t = setInterval(() => { if (new Date() >= LAUNCH) { setMembershipLive(true); clearInterval(t) } }, 15000)
    return () => clearInterval(t)
  }, [])
  const [cookieBannerVisible, setCookieBannerVisible] = useState(false)
  const refSource = useRef('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) refSource.current = ref.slice(0, 100)
  }, [])



  useEffect(() => {
    if (localStorage.getItem('cr_ccd_popup_v1')) return
    const t = setTimeout(() => setShowCCDPopup(true), 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setPastModalImageFailed(false) }, [pastModalEvent])

  useEffect(() => {
    document.body.style.overflow = (pastModalEvent !== null || showEventsPopup || showCCDPopup) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [pastModalEvent, showEventsPopup, showCCDPopup])

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
    let rafId = 0
    function updateBannerHeight() {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
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
      cancelAnimationFrame(rafId)
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
  const laurentiansIsPast = true

  function updateForm(field, value) {
    if (field === 'carModel') value = value.replace(/(^|\s)\S/g, c => c.toUpperCase())
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'registerFor' && value !== GPCC) next.downtown_cruise = ''
      if (field === 'registerFor' && value === GPCC) next.downtown_cruise = 'yes'
      return next
    })
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
    if (serverError) setServerError(null)
  }

  function formatPhone(value, code) {
    const resolvedCode = code !== undefined ? code : countryCode
    if (resolvedCode === '+1') {
      const digits = value.replace(/\D/g, '').slice(0, 10)
      if (digits.length < 4) return digits
      if (digits.length < 7) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
    }
    return value.replace(/[^\d\s\-()]/g, '').slice(0, 20)
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
    if (!phoneOptOut && (!form.phone.trim() || (countryCode === '+1' ? form.phone.replace(/\D/g,'').length < 10 : form.phone.replace(/\D/g,'').length < 6))) newErrors.phone = true
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
        const minDigits = countryCode === '+1' ? 10 : 6
        if (form.phone.trim() && form.phone.replace(/\D/g,'').length < minDigits) next.phone = true
        else delete next.phone
      }
      if (field === 'instagram') {
        if (form.instagram.replace(/^@+/, '').trim() && /\S\s+\S/.test(form.instagram.replace(/^@+/, '').trim())) next.instagram = true
        else delete next.instagram
      }
      return next
    })
  }

  async function handleSubmit() {
    if (status === 'loading') return
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      const fieldOrder = ['registerFor', 'downtown_cruise', 'name', 'email', 'year', 'carMake', 'carModel', 'dob_month', 'dob_day', 'phone', 'instagram', 'more', 'source']
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
        body: JSON.stringify({ ...form, phone: form.phone ? `${countryCode} ${form.phone}`.trim() : '', carModel: [form.carMake, form.carModel].filter(Boolean).join(' '), instagram: form.instagram.trim().replace(/^@+/, ''), ref: refSource.current || undefined, _hp: honeypotRef.current?.value || '' }),
        ...(controller ? { signal: controller.signal } : {}),
      })
      clearTimeout(timeout)
      if (res.ok) {
        setStatus('success')
        setForm({ registerFor:'', name:'', email:'', year:'', carMake:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'', downtown_cruise:'' })
        setPhoneOptOut(false)
        setCountryCode('+1')
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
          <Link href="/membership" className="nav-join">
            {membershipLive ? 'Membership' : 'Join'}
          </Link>
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
        <Link href="/membership" style={{color:"#0F1E14",fontWeight:"500"}}>
          {membershipLive ? 'Membership' : 'Join'}
        </Link>
        <Link href="/members/login" style={{color:"#7B2032",fontWeight:"500"}}>Members Login</Link>
      </div>

      {/* HERO */}
      <section id="top" className="hero">
        <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"2rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem"}}><MapPin size={12} strokeWidth={1.5} />Montreal · Est. 2025</div>
        <div style={{width:"1px",height:"80px",background:"#c5a882",margin:"0 auto 2rem"}}></div>
        <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="hero-logo" />
        <div style={{width:"40px",height:"1px",background:"#c5a882",margin:"0 auto 1.5rem"}}></div>
        <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.4rem",fontWeight:"300",color:"#444",marginBottom:"3rem",letterSpacing:"0.02em"}}>The Community. The Routes. The Canvas.</div>
        <div className="hero-buttons">
          <Link href="/membership" className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join</Link>
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
                <Link href="/membership" className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join</Link>
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
                <div style={{display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
                  <Link href="/membership" className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join</Link>
                  <Link href="/routes/past" style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#555",textDecoration:"none",borderBottom:"0.5px solid rgba(0,0,0,0.25)",paddingBottom:"1px"}}>Past Routes →</Link>
                </div>
              </div>
              <div style={{background:"#D9D2C7",minHeight:"300px",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",inset:0,backgroundImage:"url('/route-photo.jpg')",backgroundSize:"cover",backgroundPosition:"center"}} />
                <div style={{position:"absolute",inset:0}} onContextMenu={e=>e.preventDefault()} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MID-PAGE MEMBERSHIP CTA */}
      {membershipLive && (
        <section style={{background:"#0F1E14",padding:"4rem 3rem",textAlign:"center",borderTop:"0.5px solid rgba(197,168,130,0.15)"}}>
          <div style={{maxWidth:"520px",margin:"0 auto"}}>
            <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"#c5a882",marginBottom:"1rem"}}>2026 Season · Now open</div>
            <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(1.8rem,4vw,2.5rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:1.2,marginBottom:"1.25rem"}}>Ready to be part of it?</div>
            <p style={{fontSize:"14px",color:"rgba(245,241,236,0.6)",lineHeight:"1.75",marginBottom:"2rem",fontFamily:"var(--font-inter),sans-serif"}}>Spots are limited and every application is reviewed personally. Apply now before the season fills up.</p>
            <Link href="/membership" className="btn-push btn-waitlist" style={{display:"inline-block",padding:"1rem 3rem",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",textDecoration:"none"}}>Apply for Membership</Link>
          </div>
        </section>
      )}

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
            {date:"June 7, 2026",name:"Into the Laurentians",loc:"Mont-Tremblant, QC",type:"Past Event",past:true},
            ...dbEvents.map(ev => ({
              date: ev.date, name: ev.name, loc: ev.location || '', type: ev.type,
              teaser: ev.description || '', _id: ev.id,
              photo_url: ev.photo_url || null,
              registration_opens_at: ev.registration_opens_at, registration_closes_at: ev.registration_closes_at,
              member_price: ev.member_price,
            })),
          ].map((e,i) => (
            <div key={i} className="event-card" style={e.past
              ? {background:"#0F1E14",border:"1px solid rgba(197,168,130,0.55)",padding:"2rem",position:"relative",overflow:"hidden",cursor:"pointer"}
              : (e.photo_url || e.inviteOnly)
                ? {background:"#F5F1EC",border:"0.5px solid rgba(0,0,0,0.1)",padding:"2rem",cursor:"pointer"}
                : {background:"#F5F1EC",border:"0.5px solid rgba(0,0,0,0.1)",padding:"2rem"}
            } onClick={(e.past || e.photo_url) ? () => setPastModalEvent(e) : undefined}>
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
                  : e.registration_opens_at ? (() => {
                      const now = new Date()
                      const opens = new Date(e.registration_opens_at)
                      const closes = e.registration_closes_at ? new Date(e.registration_closes_at) : null
                      const isOpen = now >= opens && (!closes || now <= closes)
                      if (isOpen) return <Link href="/members/events" style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#3B6B2F",border:"0.5px solid rgba(59,107,47,0.35)",padding:"3px 10px",display:"inline-block",background:"rgba(59,107,47,0.06)",textDecoration:"none"}}>Register — Members</Link>
                      if (now < opens) return <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7A6A58",paddingBottom:"2px",display:"inline-block"}}>Registration opens {opens.toLocaleDateString('en-CA', {month:'short',day:'numeric'})}</div>
                      return <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#999",paddingBottom:"2px",display:"inline-block"}}>Registration Closed</div>
                    })()
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

      {/* INSTAGRAM FILM STRIP */}
      <section id="gallery" style={{background:"#0F1E14",padding:igPosts.length > 0 ? "4.5rem 0" : "0",overflow:"hidden"}}>
      {igPosts.length > 0 && (<>
          <style>{`
            @keyframes film-scroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .ig-strip-wrap {
              overflow: hidden;
              width: 100%;
              cursor: pointer;
            }
            .ig-strip-wrap:hover .ig-strip { animation-play-state: paused; }
            .ig-strip {
              display: flex;
              gap: 4px;
              width: max-content;
              animation: film-scroll 55s linear infinite;
            }
            .ig-strip-photo {
              width: 220px;
              height: 220px;
              flex-shrink: 0;
              overflow: hidden;
              display: block;
            }
            .ig-strip-photo img {
              width: 100%; height: 100%;
              object-fit: cover; display: block;
              opacity: 0.78;
              transition: opacity 0.3s;
            }
            .ig-strip-wrap:hover .ig-strip-photo img { opacity: 0.92; }
            @media (max-width: 640px) {
              .ig-strip-photo { width: 160px; height: 160px; }
            }
          `}</style>

          {/* Title */}
          <div style={{padding:"0 2rem",marginBottom:"2rem",display:"flex",alignItems:"flex-end",justifyContent:"space-between",maxWidth:"1200px",margin:"0 auto 2rem"}}>
            <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"clamp(2rem,4vw,3rem)",fontWeight:"300",color:"#F5F1EC",lineHeight:1,letterSpacing:"-0.01em"}}>Gallery</div>
            <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer"
              style={{display:"inline-flex",alignItems:"center",gap:"0.45rem",fontSize:"10px",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(197,168,130,0.55)",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif",flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
              @canvasroutes
            </a>
          </div>

          {/* Scrolling strip */}
          <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer" className="ig-strip-wrap" style={{textDecoration:"none"}}>
            <div className="ig-strip">
              {[...igPosts, ...igPosts].map((post, i) => (
                <div key={i} className="ig-strip-photo">
                  {post.image && <img src={post.image} alt="" loading="lazy" />}
                </div>
              ))}
            </div>
          </a>
        </>)}
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

        {membershipLive ? (
          <div style={{marginBottom:"3rem"}}>
            <p style={{fontSize:"0.9rem",color:"#777",maxWidth:"420px",margin:"1rem auto 2rem",lineHeight:"1.7"}}>Season 2026 memberships are now open. Apply online — limited spots available.</p>
            <Link href="/membership" className="btn-push btn-waitlist" style={{display:"inline-block",padding:"1.1rem 3rem",fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",textDecoration:"none"}}>Apply for Membership</Link>
          </div>
        ) : (
          <p style={{fontSize:"0.9rem",color:"#777",maxWidth:"400px",margin:"1rem auto 3rem",lineHeight:"1.7"}}>Season 2026 memberships open tonight at 7 PM. Leave your details and we'll be in touch.</p>
        )}

        <div style={{width:"40px",height:"1px",background:"rgba(197,168,130,0.35)",margin:"0 auto 2.5rem"}}></div>
        <div style={{fontSize:"10px",letterSpacing:"0.26em",textTransform:"uppercase",color:"#bbb",marginBottom:"2rem",fontFamily:"var(--font-inter),sans-serif"}}>Have a question?</div>

        {queryStatus === 'success' ? (
          <div>
            <p style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.6rem",fontWeight:"300",color:"#3B6B2F",marginBottom:"0.75rem"}}>Message received.</p>
            <p style={{fontSize:"0.9rem",color:"#777",lineHeight:"1.7"}}>We'll get back to you at {queryForm.email}.</p>
          </div>
        ) : (
          <form style={{maxWidth:"480px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"1rem"}} onSubmit={handleQuerySubmit} noValidate>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
              <input type="text" placeholder="Your name" value={queryForm.name} onChange={e => setQueryForm(p=>({...p,name:e.target.value}))} required style={{padding:"0.9rem 1rem",border:`1px solid ${queryError&&!queryForm.name.trim()?"#7B2032":"rgba(0,0,0,0.15)"}`,background:"transparent",fontSize:"13px",fontFamily:"var(--font-inter),sans-serif",outline:"none"}} />
              <input type="email" placeholder="Your email" value={queryForm.email} onChange={e => setQueryForm(p=>({...p,email:e.target.value}))} required style={{padding:"0.9rem 1rem",border:`1px solid ${queryError&&!queryForm.email.trim()?"#7B2032":"rgba(0,0,0,0.15)"}`,background:"transparent",fontSize:"13px",fontFamily:"var(--font-inter),sans-serif",outline:"none"}} />
            </div>
            <textarea placeholder="Your message or question (optional)" value={queryForm.message} onChange={e => setQueryForm(p=>({...p,message:e.target.value}))} rows={3} style={{padding:"0.9rem 1rem",border:"1px solid rgba(0,0,0,0.15)",background:"transparent",fontSize:"13px",fontFamily:"var(--font-inter),sans-serif",outline:"none",resize:"vertical"}} />
            {queryError && <p style={{fontSize:"12px",color:"#7B2032",margin:0}}>{queryError}</p>}
            <button type="submit" disabled={queryStatus==='loading'} className="btn-push btn-waitlist" style={{padding:"1rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",cursor:queryStatus==='loading'?"not-allowed":"pointer",opacity:queryStatus==='loading'?0.6:1}}>
              {queryStatus === 'loading' ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}
      </section>



      {/* PAST EVENT MODAL */}
      {pastModalEvent && (() => {
          const d = PAST_EVENTS[pastModalEvent.name] || { meta: pastModalEvent.date, title: pastModalEvent.name, sub: pastModalEvent.loc || null, tags: pastModalEvent.type ? [pastModalEvent.type] : [], img: pastModalEvent.photo_url || null }
          return (
            <div
              key="past-modal"
              onClick={() => setPastModalEvent(null)}
              style={{position:"fixed",inset:0,background:"rgba(15,30,20,0.92)",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:"1.5rem"}}
            >
              <div
                onClick={ev => ev.stopPropagation()}
                style={{background:"#0F1E14",maxWidth:"420px",width:"100%",position:"relative",fontFamily:"var(--font-inter),sans-serif",overflow:"hidden",border:"1px solid rgba(197,168,130,0.35)",borderRadius:isMobile?"16px 16px 0 0":"0",maxHeight:isMobile?"92svh":"none",overflowY:isMobile?"auto":"visible",WebkitOverflowScrolling:"touch"}}
              >
                <div style={{position:"sticky",top:0,zIndex:10,display:"flex",justifyContent:"flex-end",padding:"0.6rem 0.75rem",background:"#0F1E14"}}>
                  <button onClick={() => setPastModalEvent(null)} style={{background:"rgba(255,255,255,0.12)",border:"none",cursor:"pointer",color:"#fff",width:isMobile?"36px":"28px",height:isMobile?"36px":"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontFamily:"var(--font-inter),sans-serif"}}>×</button>
                </div>
                <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.75),transparent)",zIndex:1}} />
                {d.img && !pastModalImageFailed && <Image src={d.img} alt={d.imgAlt||''} width={842} height={1215} style={{width:"100%",height:"auto",display:"block",marginTop:"-44px"}} onError={() => setPastModalImageFailed(true)} />}
                <div style={{padding:isMobile?"1.25rem 1.25rem calc(2rem + env(safe-area-inset-bottom))":"1.8rem 2rem 2rem"}}>
                  <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",marginBottom:"0.5rem"}}>{d.meta}</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.4rem"}}>{d.title}</div>
                  {d.sub && <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1rem",fontStyle:"italic",color:"rgba(245,241,236,0.5)",marginBottom:"1.4rem"}}>{d.sub}</div>}
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1.8rem"}}>
                    {d.tags.map((tag,idx) => (
                      <span key={idx} style={{fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(197,168,130,0.75)",border:"0.5px solid rgba(197,168,130,0.3)",padding:"0.3rem 0.75rem"}}>{tag}</span>
                    ))}
                  </div>
                  <div style={{width:"30px",height:"0.5px",background:"rgba(197,168,130,0.35)",marginBottom:"1.4rem"}} />
                  {pastModalEvent.teaser && !PAST_EVENTS[pastModalEvent.name] ? (
                    <div style={{fontSize:"12px",color:"rgba(245,241,236,0.55)",lineHeight:"1.75"}}>{pastModalEvent.teaser}</div>
                  ) : (
                    <div style={{fontSize:"12px",color:"rgba(245,241,236,0.55)",lineHeight:"1.75"}}>
                      To see photos &amp; videos from this event, follow us on{' '}
                      <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{color:"#c5a882",textDecoration:"none",borderBottom:"0.5px solid rgba(197,168,130,0.45)"}}>Instagram</a>
                      {' '}and{' '}
                      <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" style={{color:"#c5a882",textDecoration:"none",borderBottom:"0.5px solid rgba(197,168,130,0.45)"}}>Facebook</a>.
                    </div>
                  )}
                  {d.routeHref && (
                    <div style={{marginTop:"1.5rem"}}>
                      <Link href={d.routeHref} style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",fontSize:"10px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#0F1E14",background:"#c5a882",padding:"0.75rem 1.5rem",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif",fontWeight:"500"}}>
                        View Route
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}


      {/* STICKY MOBILE CTA */}
      <div className={`sticky-cta${showStickyCta ? ' sticky-cta--visible' : ''}`} style={cookieBannerVisible ? {bottom:'var(--cookie-banner-height, 80px)'} : {}}>
        <Link href="/membership" className="btn-push btn-waitlist" style={{display:"block",width:"100%",padding:"1rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none",textAlign:"center"}}>
          Join
        </Link>
      </div>

      {/* CARS, COFFEE & DAD JOKES POPUP */}
      {showCCDPopup && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setShowCCDPopup(false); localStorage.setItem('cr_ccd_popup_v1', '1') } }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,30,20,0.78)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.25rem', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ position: 'relative', maxWidth: '460px', width: '100%', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', margin: 'auto' }}>
            {/* Close */}
            <button
              onClick={() => { setShowCCDPopup(false); localStorage.setItem('cr_ccd_popup_v1', '1') }}
              style={{ position: 'absolute', top: '0.65rem', right: '0.65rem', zIndex: 10, background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', color: '#fff', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {/* Poster image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CCD.png"
              alt="Cars, Coffee & Dad Jokes — Father's Day Weekend Special, June 20 at Cafe Napoleon"
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
            {/* CTA bar */}
            <div style={{ background: '#0F1E14', padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.5)' }}>
                June 20 · Cafe Napoleon · LaSalle
              </div>
              <Link
                href="/cars-coffee-dad-jokes"
                onClick={() => { setShowCCDPopup(false); localStorage.setItem('cr_ccd_popup_v1', '1') }}
                style={{ background: '#c5a882', color: '#0F1E14', padding: '0.65rem 1.6rem', fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif', fontWeight: '500', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-block' }}
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <SiteFooter />

    </div>
    </ErrorBoundary>
  )
}
