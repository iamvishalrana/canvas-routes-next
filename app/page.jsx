'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, User, Mail, Car, Phone, Instagram, NotebookPen, Share2, ClipboardList } from 'lucide-react'
import FadeIn from '../components/FadeIn'
import ErrorBoundary from '../components/ErrorBoundary'

export default function Home() {
  const [form, setForm] = useState({ registerFor:'', name:'', email:'', year:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [meetsOpen, setMeetsOpen] = useState(false)
  const [routesOpen, setRoutesOpen] = useState(false)
  const [showPastModal, setShowPastModal] = useState(false)
  const [routesLaunched, setRoutesLaunched] = useState(false)
  const [showRoutesPopup, setShowRoutesPopup] = useState(false)
  const [showEventsPopup, setShowEventsPopup] = useState(false)
  const [showGpccModal, setShowGpccModal] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const [cookieBannerVisible, setCookieBannerVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowEventsPopup(true), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const LAUNCH = new Date('2026-05-13T23:00:00Z').getTime()
    const preview = new URLSearchParams(window.location.search).has('preview')
    if (Date.now() >= LAUNCH || preview) setRoutesLaunched(true)
    else {
      const interval = setInterval(() => {
        if (Date.now() >= LAUNCH) { setRoutesLaunched(true); clearInterval(interval) }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = (showPastModal || showRoutesPopup || showEventsPopup || showGpccModal) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showPastModal, showRoutesPopup, showEventsPopup, showGpccModal])

  useEffect(() => {
    try { setCookieBannerVisible(localStorage.getItem('cookieConsent') === null) } catch { setCookieBannerVisible(false) }
    function handleConsentChanged() {
      try { setCookieBannerVisible(localStorage.getItem('cookieConsent') === null) } catch { setCookieBannerVisible(false) }
    }
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


  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
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
    if (!form.carModel.trim()) newErrors.carModel = true
    if (!form.dob_month) newErrors.dob_month = true
    if (!form.dob_day) newErrors.dob_day = true
    if (!form.source) newErrors.source = true
    if (form.phone.trim() && form.phone.replace(/\D/g,'').length !== 10) newErrors.phone = true
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
      const fieldOrder = ['registerFor', 'name', 'email', 'year', 'carModel', 'dob_month', 'phone', 'instagram', 'more', 'source']
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
        body: JSON.stringify({ ...form, instagram: form.instagram.trim().replace(/^@+/, ''), _hp: honeypotRef.current?.value || '' }),
        ...(controller ? { signal: controller.signal } : {}),
      })
      clearTimeout(timeout)
      if (res.ok) {
        setStatus('success')
        setForm({ registerFor:'', name:'', email:'', year:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'' })
        if (honeypotRef.current) honeypotRef.current.value = ''
        if (typeof window !== 'undefined' && (() => { try { return localStorage.getItem('cookieConsent') } catch { return null } })() === 'accepted' && window.gtag) {
          window.gtag('event', 'generate_lead', { event_category: 'waitlist' })
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
        <FadeIn><div className="about-grid">
          <div>
            <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>About Us</div>
            <div className="section-title" style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.8rem",fontWeight:"300",lineHeight:"1.2",color:"#1a1a1a",marginBottom:"1.5rem"}}>Driving is an <em style={{color:"#7B2032"}}>art form.</em><br/>We treat it like one.</div>
            <div style={{fontSize:"0.95rem",lineHeight:"1.9",color:"#555",maxWidth:"520px",marginBottom:"1.5rem"}}>
              <strong style={{color:"#1a1a1a",fontWeight:"500"}}>For driving enthusiasts first.</strong> Canvas Routes was born from a simple idea — that driving should be more than just getting from A to B. We believe the best roads deserve the best company, and that cars are meant to be experienced, not just owned.
              <br/><br/>
              Based in Montreal, we bring together a curated circle of automotive enthusiasts for scenic drives, exclusive car meets, and unforgettable experiences across Quebec and beyond. Every route is hand-picked. Every detail is considered. Every event is designed to leave you wanting more.
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
        </div></FadeIn>
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
                  Our car meets are where the community comes alive — fuelled by great cars, genuine passion, and good company. Whether you're just discovering Canvas Routes or a seasoned member, there's always a place for you here.
                </p>
                <div className="meets-cards-grid">
                  <div style={{padding:"1.5rem",border:"0.5px solid rgba(0,0,0,0.12)",background:"#EDE8E1"}}>
                    <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#3B6B2F",marginBottom:"0.8rem"}}>Open Meets</div>
                    <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.2rem",color:"#1a1a1a",marginBottom:"0.8rem"}}>Everyone welcome</div>
                    <p style={{fontSize:"0.85rem",lineHeight:"1.7",color:"#555"}}>Open to all car enthusiasts. Come meet like-minded people and discover what Canvas Routes is about. Formats vary — from casual gatherings to the occasional cars & coffee morning. Fun, welcoming, and always a good time.</p>
                  </div>
                  <div style={{padding:"1.5rem",border:"0.5px solid rgba(0,0,0,0.12)",background:"#EDE8E1"}}>
                    <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#7B2032",marginBottom:"0.8rem"}}>Private Meets</div>
                    <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.2rem",color:"#1a1a1a",marginBottom:"0.8rem"}}>Members only</div>
                    <p style={{fontSize:"0.85rem",lineHeight:"1.7",color:"#555"}}>Exclusive to Canvas Routes members. Private venues, curated company, and a more intimate experience. Members are notified directly when a private meet is announced.</p>
                  </div>
                </div>
                <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join</a>
              </div>
              <div style={{background:"#D9D2C7",minHeight:"300px",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",inset:0,backgroundImage:"url('/meet-photo.png')",backgroundSize:"cover",backgroundPosition:"center"}} />
                <div style={{position:"absolute",inset:0}} onContextMenu={e=>e.preventDefault()} />
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
        <FadeIn><div style={{textAlign:"center",marginBottom:"4rem"}}>
          <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#666",marginBottom:"1rem"}}>On the calendar</div>
          <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.8rem",fontWeight:"300",color:"#F5F1EC",marginBottom:"0.5rem"}}>Upcoming events</div>
          <div style={{fontSize:"0.85rem",color:"#888",letterSpacing:"0.05em"}}>Exclusive to members and invited guests</div>
        </div>
        <div className="events-grid">
          {[
            {date:"May 9, 2026",name:"Cars & Coffee",loc:"Montreal, QC",type:"Past Event",past:true},
            {date:"May 23, 2026",name:"Grand Prix Weekend Cars & Coffee",loc:"Exotics and Classics",type:"Cars & Coffee",inviteOnly:true},
            {date:"May 2026",name:"Into the Laurentians",loc:"Mont-Tremblant, QC",type:"Route",href:"/routes"},
            {date:"June 2026",name:"Whips to Eastern Townships",loc:"Cantons-de-l'Est, QC",type:"Route"},
            {date:"August 2026",name:"Charlevoix Coastal Route",loc:"Charlevoix, QC",type:"Route"},
          ].map((e,i) => (
            <div key={i} className="event-card" style={e.past
              ? {background:"#0F1E14",border:"1px solid rgba(197,168,130,0.55)",padding:"2rem",position:"relative",overflow:"hidden",cursor:"pointer"}
              : e.inviteOnly
                ? {background:"#F5F1EC",border:"0.5px solid rgba(0,0,0,0.1)",padding:"2rem",cursor:"pointer"}
                : {background:"#F5F1EC",border:"0.5px solid rgba(0,0,0,0.1)",padding:"2rem"}
            } onClick={e.past ? () => setShowPastModal(true) : e.inviteOnly ? () => setShowGpccModal(true) : undefined}>
              {e.past && <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.8),transparent)"}} />}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:e.past?"rgba(197,168,130,0.65)":"#7B2032"}}>{e.date}</div>
                <div style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:e.past?"rgba(197,168,130,0.6)":"#7B5B2E",border:`0.5px solid ${e.past?"rgba(197,168,130,0.5)":"#7B5B2E"}`,padding:"2px 8px"}}>{e.type}</div>
              </div>
              <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.4rem",fontWeight:"300",color:e.past?"#F5F1EC":"#1A1008",marginBottom:"0.5rem"}}>{e.name}</div>
              <div style={{fontSize:"12px",color:e.past?"rgba(245,241,236,0.4)":"#5A4A38",marginBottom:"1.5rem"}}>{e.loc}</div>
              {e.past
                ? <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",display:"inline-flex",alignItems:"center",gap:"0.4rem"}}>View Recap <span style={{fontSize:"13px"}}>→</span></div>
                : e.inviteOnly
                  ? <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7B2032",paddingBottom:"2px",display:"inline-block"}}>Invite Only</div>
                  : e.href
                    ? routesLaunched
                      ? <Link href={e.href} className="btn-push" style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7B2032",border:"0.5px solid #7B2032",padding:"0.4rem 1rem",background:"transparent",cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",textDecoration:"none",display:"inline-block"}}>View Details</Link>
                      : <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7A6A58",paddingBottom:"2px",display:"inline-block"}}>Details coming soon</div>
                    : <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7A6A58",paddingBottom:"2px",display:"inline-block"}}>Details coming soon</div>
              }
            </div>
          ))}
        </div></FadeIn>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{background:"#EDE8E1",padding:"6rem 3rem",textAlign:"center"}}>
        <FadeIn><div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>Get in touch</div>
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
        </div></FadeIn>
      </section>

      {/* JOIN */}
      <section id="join" style={{textAlign:"center",padding:"8rem 2rem",background:"#F5F1EC"}}>
        <FadeIn><div style={{width:"1px",height:"80px",background:"#c5a882",margin:"0 auto 2rem"}}></div>
        <div className="join-title" style={{fontFamily:"var(--font-cormorant),serif",fontSize:"3.5rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem",lineHeight:"1.1"}}>Reserve your<br/>seat at the wheel.</div>
        <div style={{fontSize:"0.9rem",color:"#777",maxWidth:"400px",margin:"1rem auto 3rem",lineHeight:"1.7"}}>Membership is by application. Tell us about yourself.</div>
        {routesLaunched && (
          <div style={{maxWidth:"560px",margin:"-1rem auto 3rem",padding:"1.2rem 1.6rem",border:"0.5px solid rgba(197,168,130,0.45)",background:"rgba(197,168,130,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:"10px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#c5a882",marginBottom:"0.3rem"}}>Road Trip · 31 May 2026</div>
              <div style={{fontSize:"0.9rem",color:"#1a1a1a",lineHeight:"1.4"}}>Into the Laurentians — First Route</div>
            </div>
            <Link href="/routes#form" style={{fontSize:"11px",letterSpacing:"0.14em",textTransform:"uppercase",color:"#7B2032",border:"0.5px solid #7B2032",padding:"0.5rem 1.1rem",textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>Register →</Link>
          </div>
        )}
        {status === 'success' ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1.5rem"}}>
            <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.4rem",fontWeight:"300",color:"#3B6B2F"}}>Application received. We'll review it and get back to you shortly.</div>
            <p style={{fontSize:"0.85rem",color:"#777",lineHeight:"1.75",maxWidth:"420px",textAlign:"center"}}>Keep an eye on your inbox — and check your spam folder too. Once we've reviewed your application, you'll receive a personal email from our team. If you don't hear from us, feel free to reach out via <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer" style={{color:"#555",textDecoration:"underline"}}>Instagram</a> or <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" style={{color:"#555",textDecoration:"underline"}}>Facebook</a> DM.</p>
            <button onClick={() => { setStatus(null); setServerError(null); setForm({ registerFor:'', name:'', email:'', year:'', carModel:'', dob_month:'', dob_day:'', dob_year:'', phone:'', instagram:'', more:'', source:'' }); setErrors({}) }} className="btn-push" style={{background:"none",border:"none",padding:0,fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#aaa",cursor:"pointer",fontFamily:"var(--font-inter),sans-serif",textDecoration:"underline"}}>Submit another application</button>
          </div>
        ) : (
          <form className="join-form" onSubmit={e => { e.preventDefault(); handleSubmit() }} noValidate>
            <div id="field-registerFor" role="group" aria-required="true" className="join-form-field" style={{marginBottom:"1.5rem"}}>
              <div className="join-label" style={{marginBottom:"0.75rem"}}>Registering for<ClipboardList size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></div>
              <div className="join-form-row" style={{gridTemplateColumns:'1fr'}}>
                {[
                  {value:"Canvas Routes Membership", label:"Canvas Routes Membership", sub:"Curated community, by application"},
                  {value:"Grand Prix Weekend Cars & Coffee — May 23, 2026", label:"Grand Prix Weekend Cars & Coffee", sub:"Invite Only · May 23, 2026 · 12:30 – 3:00 PM"},
                ].map(opt => {
                  const selected = form.registerFor === opt.value
                  const borderColor = selected ? '#3B6B2F' : errors.registerFor ? '#7B2032' : 'rgba(0,0,0,0.2)'
                  const bgColor = selected ? 'rgba(59,107,47,0.06)' : errors.registerFor ? 'rgba(123,32,50,0.04)' : 'transparent'
                  const labelColor = selected ? '#3B6B2F' : errors.registerFor ? '#7B2032' : '#1a1a1a'
                  return (
                    <button key={opt.value} type="button" onClick={() => updateForm('registerFor', opt.value)} style={{padding:"1rem 1.2rem",border:`1px solid ${borderColor}`,background:bgColor,textAlign:"left",cursor:"pointer",transition:"border-color 0.2s,background 0.2s",fontFamily:"var(--font-inter),sans-serif"}}>
                      <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:labelColor,marginBottom:"0.3rem",fontWeight:selected?"500":"400"}}>{opt.label}</div>
                      <div style={{fontSize:"11px",color:"#888"}}>{opt.sub}</div>
                    </button>
                  )
                })}
              </div>
              {errors.registerFor && <span style={{fontSize:"11px",color:"#7B2032"}}>Please select an option</span>}
            </div>
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
                <label htmlFor="field-carModel" className="join-label">Make &amp; Model<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/><span style={{color:"#7B2032",marginLeft:"3px"}}>*</span></label>
                <div style={{position:"relative"}}>
                  <input id="field-carModel" type="text" placeholder="e.g. Porsche 911" value={form.carModel}
                    onChange={e => updateForm('carModel', e.target.value)} style={inputStyle('carModel')}
                    aria-required="true" maxLength={100}
                    onFocus={() => setFocusedField('carModel')} onBlur={() => setFocusedField(null)} />
                  {!form.carModel && <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
                </div>
                {errors.carModel && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
              </div>
            </div>
            <div id="field-dob_month" className="join-form-field" style={{marginTop:"1rem"}}>
              <div className="join-label" style={{marginBottom:"0.5rem"}}>Date of birth <span style={{color:"#7B2032",marginLeft:"2px"}}>*</span> <span style={{color:"#888",fontWeight:"300",textTransform:"none",letterSpacing:0,fontSize:"11px"}}>(year optional)</span></div>
              <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.2fr",gap:"0.75rem"}}>
                <div style={{position:"relative"}}>
                  <select id="field-dob_month" value={form.dob_month} onChange={e => updateForm('dob_month', e.target.value)}
                    style={{...inputStyle('dob_month'), cursor:"pointer", paddingRight:"2rem"}}
                    aria-required="true">
                    <option value="">Month *</option>
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
                    <option value="">Day *</option>
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
                <label htmlFor="field-phone" className="join-label">Phone<Phone size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/> <span style={{color:"#888",fontWeight:"300"}}>(optional)</span></label>
                <input id="field-phone" type="tel" placeholder="Your phone number" value={form.phone}
                  onChange={e => updateForm('phone', formatPhone(e.target.value))} style={inputStyle('phone')}
                  onFocus={() => setFocusedField('phone')} onBlur={() => { setFocusedField(null); validateField('phone') }} />
                {errors.phone && <span style={{fontSize:"11px",color:"#7B2032"}}>Please enter a valid 10-digit number</span>}
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
              {' '}and consent to receive updates from Canvas Routes about events and membership. You may withdraw your consent at any time by contacting{' '}
              <a href="mailto:info@canvasroutes.com" style={{fontSize:"10px",color:"#ccc",textDecoration:"underline"}}>info@canvasroutes.com</a>.
            </div>
            <button type="submit" disabled={status==='loading'} className="join-submit-btn"
              style={{marginTop:"1.5rem",padding:"0.9rem 3rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",cursor:status==='loading'?'not-allowed':'pointer',fontFamily:"var(--font-inter),sans-serif",opacity:status==='loading'?0.5:1}}>
              {status === 'loading' ? 'Sending...' : 'Register'}
            </button>
            {status === 'error' && <div style={{marginTop:"1rem",fontSize:"12px",color:"#7B2032"}}>{serverError}</div>}
            <div style={{position:'absolute',left:'-9999px',width:1,height:1,overflow:'hidden'}} aria-hidden="true">
              <input ref={honeypotRef} type="text" name="cr_field" tabIndex={-1} autoComplete="off" />
            </div>
          </form>
        )}</FadeIn>
      </section>



      {/* ROUTES REGISTRATION POPUP */}
      <AnimatePresence>
        {showRoutesPopup && (
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            transition={{duration:0.25}}
            onClick={() => setShowRoutesPopup(false)}
            style={{position:"fixed",inset:0,background:"rgba(15,30,20,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}
          >
            <motion.div
              initial={{opacity:0,scale:0.93,y:24}}
              animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.95,y:10}}
              transition={{duration:0.35,ease:[0.16,1,0.3,1]}}
              onClick={e => e.stopPropagation()}
              style={{background:"#0F1E14",maxWidth:"440px",width:"100%",position:"relative",overflow:"hidden",border:"1px solid rgba(197,168,130,0.4)",fontFamily:"var(--font-inter),sans-serif"}}
            >
              <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.8),transparent)"}} />
              <button onClick={() => setShowRoutesPopup(false)} style={{position:"absolute",top:"0.6rem",right:"0.6rem",zIndex:10,background:"rgba(0,0,0,0.45)",border:"none",cursor:"pointer",color:"#fff",fontSize:"18px",lineHeight:1,width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontFamily:"var(--font-inter),sans-serif"}}>×</button>
              <div style={{padding:"2.4rem 2.2rem 2.2rem"}}>
                <div style={{fontSize:"10px",letterSpacing:"0.26em",textTransform:"uppercase",color:"rgba(197,168,130,0.65)",marginBottom:"1rem"}}>Canvas Routes · 31 May 2026</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.4rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.5rem"}}>Into the Laurentians</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1rem",fontStyle:"italic",color:"rgba(245,241,236,0.4)",marginBottom:"1.6rem"}}>First Route — Mont-Tremblant, QC</div>
                <div style={{width:"30px",height:"0.5px",background:"rgba(197,168,130,0.35)",marginBottom:"1.6rem"}} />
                <p style={{fontSize:"13px",color:"rgba(245,241,236,0.6)",lineHeight:"1.85",marginBottom:"2rem"}}>
                  Registration is now open. Spots are limited and selection is curated — apply before they're gone.
                </p>
                <div style={{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
                  <Link href="/routes#form" onClick={() => setShowRoutesPopup(false)}
                    style={{display:"inline-block",padding:"0.85rem 2rem",background:"rgba(197,168,130,0.12)",border:"1px solid rgba(197,168,130,0.55)",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",color:"#c5a882",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif"}}>
                    Register Now
                  </Link>
                  <button onClick={() => setShowRoutesPopup(false)}
                    style={{background:"none",border:"none",padding:0,fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(245,241,236,0.3)",cursor:"pointer",fontFamily:"var(--font-inter),sans-serif"}}>
                    Maybe later
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAST EVENT MODAL */}
      <AnimatePresence>
        {showPastModal && (
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            transition={{duration:0.2}}
            onClick={() => setShowPastModal(false)}
            style={{position:"fixed",inset:0,background:"rgba(15,30,20,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}
          >
            <motion.div
              initial={{opacity:0,scale:0.92,y:20}}
              animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.94,y:10}}
              transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
              onClick={e => e.stopPropagation()}
              style={{background:"#0F1E14",maxWidth:"420px",width:"100%",position:"relative",fontFamily:"var(--font-inter),sans-serif",overflow:"hidden",border:"1px solid rgba(197,168,130,0.35)"}}
            >
              <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.75),transparent)",zIndex:1}} />
              <button onClick={() => setShowPastModal(false)} style={{position:"absolute",top:"0.6rem",right:"0.6rem",zIndex:10,background:"rgba(0,0,0,0.45)",border:"none",cursor:"pointer",color:"#fff",fontSize:"18px",lineHeight:1,width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontFamily:"var(--font-inter),sans-serif"}}>×</button>
              <Image src="/cc-page.jpg" alt="Cars & Coffee event poster" width={842} height={1215} style={{width:"100%",height:"220px",objectFit:"cover",display:"block"}} />
              <div style={{padding:"1.8rem 2rem 2rem"}}>
                <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",marginBottom:"0.5rem"}}>Montreal · May 9, 2026</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.4rem"}}>Cars &amp; Coffee</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1rem",fontStyle:"italic",color:"rgba(245,241,236,0.5)",marginBottom:"1.4rem"}}>Good cars. Great coffee. Better people.</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1.8rem"}}>
                  {["09:30 – 12:00 PM","Open to all","Free entry"].map((tag,idx) => (
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GPCC MODAL */}
      <AnimatePresence>
        {showGpccModal && (
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            transition={{duration:0.2}}
            onClick={() => setShowGpccModal(false)}
            style={{position:"fixed",inset:0,background:"rgba(15,30,20,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}
          >
            <motion.div
              initial={{opacity:0,scale:0.92,y:20}}
              animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.94,y:10}}
              transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
              onClick={e => e.stopPropagation()}
              style={{background:"#0F1E14",maxWidth:"420px",width:"100%",position:"relative",fontFamily:"var(--font-inter),sans-serif",overflow:"hidden",border:"1px solid rgba(197,168,130,0.35)"}}
            >
              <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.75),transparent)",zIndex:1}} />
              <button onClick={() => setShowGpccModal(false)} style={{position:"absolute",top:"0.6rem",right:"0.6rem",zIndex:10,background:"rgba(0,0,0,0.45)",border:"none",cursor:"pointer",color:"#fff",fontSize:"18px",lineHeight:1,width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontFamily:"var(--font-inter),sans-serif"}}>×</button>
              <img src="/ccgp.jpeg" alt="Grand Prix Weekend Cars & Coffee" style={{width:"100%",height:"220px",objectFit:"cover",objectPosition:"top",display:"block"}} />
              <div style={{padding:"1.8rem 2rem 2rem"}}>
                <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",marginBottom:"0.5rem"}}>Montreal · May 23, 2026</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"2.2rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.4rem"}}>Grand Prix Weekend<br/>Cars &amp; Coffee</div>
                <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1rem",fontStyle:"italic",color:"rgba(245,241,236,0.5)",marginBottom:"1.4rem"}}>Exotics and Classics</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"1.8rem"}}>
                  {["12:30 – 3:00 PM","Invite Only"].map((tag,idx) => (
                    <span key={idx} style={{fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(197,168,130,0.75)",border:"0.5px solid rgba(197,168,130,0.3)",padding:"0.3rem 0.75rem"}}>{tag}</span>
                  ))}
                </div>
                <div style={{width:"30px",height:"0.5px",background:"rgba(197,168,130,0.35)",marginBottom:"1.4rem"}} />
                <a href="#join" onClick={e => { e.preventDefault(); setShowGpccModal(false); smoothScroll('join') }}
                  style={{display:"inline-block",padding:"0.85rem 2rem",background:"rgba(197,168,130,0.12)",border:"1px solid rgba(197,168,130,0.55)",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",color:"#c5a882",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif"}}>
                  Register
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EVENTS POPUP */}
      <AnimatePresence>
        {showEventsPopup && (
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            transition={{duration:0.25}}
            onClick={() => setShowEventsPopup(false)}
            style={{position:"fixed",inset:0,background:"rgba(10,22,14,0.94)",zIndex:1002,display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"2rem 1.25rem",overflowY:"auto"}}
          >
            <motion.div
              initial={{opacity:0,y:28}}
              animate={{opacity:1,y:0}}
              exit={{opacity:0,y:12}}
              transition={{duration:0.38,ease:[0.16,1,0.3,1]}}
              onClick={e => e.stopPropagation()}
              className="events-popup-cards"
              style={{display:"flex",gap:"1.25rem",position:"relative"}}
            >
              <button onClick={() => setShowEventsPopup(false)} style={{position:"absolute",top:"-0.5rem",right:"-0.5rem",zIndex:10,background:"rgba(0,0,0,0.6)",border:"none",cursor:"pointer",color:"#fff",fontSize:"18px",lineHeight:1,width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontFamily:"var(--font-inter),sans-serif"}}>×</button>

              {/* Grand Prix Weekend Cars & Coffee */}
              <div style={{flex:1,background:"#0F1E14",border:"1px solid rgba(197,168,130,0.35)",overflow:"hidden",position:"relative",fontFamily:"var(--font-inter),sans-serif"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.75),transparent)",zIndex:1}} />
                <img src="/ccgp.jpeg" alt="Grand Prix Weekend Cars & Coffee" style={{width:"100%",height:"200px",objectFit:"cover",objectPosition:"top",display:"block"}} />
                <div style={{padding:"1.6rem 1.8rem 2rem"}}>
                  <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",marginBottom:"0.5rem"}}>Montreal · May 23, 2026</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.85rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.35rem"}}>Grand Prix Weekend<br/>Cars &amp; Coffee</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"0.95rem",fontStyle:"italic",color:"rgba(245,241,236,0.45)",marginBottom:"1.3rem"}}>Exotics and Classics</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"1.5rem"}}>
                    {["12:30 – 3:00 PM","Invite Only"].map((tag,idx) => (
                      <span key={idx} style={{fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(197,168,130,0.75)",border:"0.5px solid rgba(197,168,130,0.3)",padding:"0.3rem 0.75rem"}}>{tag}</span>
                    ))}
                  </div>
                  <a href="#join" onClick={e => { e.preventDefault(); setShowEventsPopup(false); smoothScroll('join') }}
                    style={{display:"inline-block",padding:"0.8rem 1.8rem",background:"rgba(197,168,130,0.1)",border:"1px solid rgba(197,168,130,0.5)",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",color:"#c5a882",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif"}}>
                    Register
                  </a>
                </div>
              </div>

              {/* Into the Laurentians */}
              <div style={{flex:1,background:"#0F1E14",border:"1px solid rgba(197,168,130,0.35)",overflow:"hidden",position:"relative",fontFamily:"var(--font-inter),sans-serif"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(197,168,130,0.75),transparent)",zIndex:1}} />
                <img src="/itl.png" alt="Into the Laurentians road trip" style={{width:"100%",height:"200px",objectFit:"cover",objectPosition:"top",display:"block"}} />
                <div style={{padding:"1.6rem 1.8rem 2rem"}}>
                  <div style={{fontSize:"10px",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(197,168,130,0.7)",marginBottom:"0.5rem"}}>Mont-Tremblant · May 31, 2026</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"1.85rem",fontWeight:"300",color:"#F5F1EC",lineHeight:"1.1",marginBottom:"0.35rem"}}>Into the<br/>Laurentians</div>
                  <div style={{fontFamily:"var(--font-cormorant),serif",fontSize:"0.95rem",fontStyle:"italic",color:"rgba(245,241,236,0.45)",marginBottom:"1.3rem"}}>First Route — Canvas Routes</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"1.5rem"}}>
                    {["31 May 2026","Road Trip","Members Only"].map((tag,idx) => (
                      <span key={idx} style={{fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(197,168,130,0.75)",border:"0.5px solid rgba(197,168,130,0.3)",padding:"0.3rem 0.75rem"}}>{tag}</span>
                    ))}
                  </div>
                  <Link href="/routes#form" onClick={() => setShowEventsPopup(false)}
                    style={{display:"inline-block",padding:"0.8rem 1.8rem",background:"rgba(197,168,130,0.1)",border:"1px solid rgba(197,168,130,0.5)",fontSize:"11px",letterSpacing:"0.18em",textTransform:"uppercase",color:"#c5a882",textDecoration:"none",fontFamily:"var(--font-inter),sans-serif"}}>
                    Register
                  </Link>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
