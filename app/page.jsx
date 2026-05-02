'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { MapPin, User, Mail, Car, Phone, Instagram, NotebookPen, Share2, ClipboardList } from 'lucide-react'
import FadeIn from '../components/FadeIn'
import ErrorBoundary from '../components/ErrorBoundary'

export default function Home() {
  const [form, setForm] = useState({ registerFor:'', name:'', email:'', car:'', phone:'', instagram:'', more:'', source:'' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [meetsOpen, setMeetsOpen] = useState(false)
  const [routesOpen, setRoutesOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const [cookieBannerVisible, setCookieBannerVisible] = useState(false)

  useEffect(() => {
    setCookieBannerVisible(localStorage.getItem('cookieConsent') === null)
    function handleConsentChanged() {
      setCookieBannerVisible(localStorage.getItem('cookieConsent') === null)
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

  useEffect(() => {
    const about = document.getElementById('about')
    const join = document.getElementById('join')
    if (!about || !join) return

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

  useEffect(() => {
    const LAUNCH = new Date('2026-05-02T18:00:00Z').getTime() // 2 PM EDT
    const preview = new URLSearchParams(window.location.search).has('preview')
    const live = Date.now() >= LAUNCH || preview
    if (live) {
      setIsLive(true)
      const t = setTimeout(() => setShowBanner(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

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
    if (!form.registerFor) newErrors.registerFor = true
    if (form.name.trim().length < 2) newErrors.name = true
    if (!form.email.trim()) newErrors.email = 'required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'invalid'
    else if (['.con','.co','.cmo','.ocm','.cm','.vom','.cpm','.c'].some(t => form.email.toLowerCase().endsWith(t))) newErrors.email = 'typo'
    if (!form.car.trim()) newErrors.car = true
    if (!form.source) newErrors.source = true
    if (form.phone.trim() && form.phone.replace(/\D/g,'').length !== 10) newErrors.phone = true
    if (form.instagram.trim() && /\S\s+\S/.test(form.instagram.trim())) newErrors.instagram = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function validateField(field) {
    setErrors(prev => {
      const next = { ...prev }
      if (field === 'email') {
        if (!form.email.trim()) { delete next.email }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'invalid'
        else if (['.con','.co','.cmo','.ocm','.cm','.vom','.cpm','.c'].some(t => form.email.toLowerCase().endsWith(t))) next.email = 'typo'
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
    if (!validate()) return
    setStatus('loading')
    setServerError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        setStatus('success')
        setForm({ name:'', email:'', car:'', phone:'', instagram:'', more:'', source:'' })
        if (typeof window !== 'undefined' && localStorage.getItem('cookieConsent') === 'accepted' && window.gtag) {
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
        setServerError('Request timed out. Please check your connection and try again.')
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
    const borderColor = hasError ? '#7B2032' : hasValue ? '#3B6B2F' : isFocused ? '#c5a882' : 'rgba(0,0,0,0.2)'
    const bgColor = hasError ? 'rgba(123,32,50,0.04)' : hasValue ? 'rgba(59,107,47,0.05)' : 'transparent'
    const shadow = isFocused ? (hasValue ? '0 0 0 3px rgba(59,107,47,0.15)' : '0 0 0 3px rgba(197,168,130,0.2)') : 'none'
    return {
      width:'100%', padding:'0.9rem 1.2rem',
      border:`1px solid ${borderColor}`,
      background: bgColor,
      fontSize:'13px', fontFamily:"'Inter',sans-serif", outline:'none', color:'#1a1a1a',
      boxShadow: shadow,
      transition:'border-color 0.2s, box-shadow 0.2s, background 0.2s',
    }
  }

  return (
    <ErrorBoundary>
    <div style={{background:"#F5F1EC",fontFamily:"'Inter',sans-serif",color:"#1a1a1a"}}>

      {/* NAV */}
      <nav className="nav">
        <a href="/" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <img src="/canvas_routes_refined.png" alt="Canvas Routes" className="nav-logo" />
        </a>
        <div className="nav-links">
          <a href="#about" onClick={e => { e.preventDefault(); smoothScroll('about') }}>About Us</a>
          <a href="#events" onClick={e => { e.preventDefault(); smoothScroll('events') }}>Events</a>
          <a href="#contact" onClick={e => { e.preventDefault(); smoothScroll('contact') }}>Contact</a>
        </div>
        <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="nav-join">Join</a>
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
        <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} style={{color:"#1a1a1a",fontWeight:"500"}}>Join the waitlist</a>
      </div>

      {/* HERO */}
      <section id="top" className="hero">
        <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"2rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.4rem"}}><MapPin size={12} strokeWidth={1.5} />Montreal · Est. 2025</div>
        <div style={{width:"1px",height:"80px",background:"#c5a882",margin:"0 auto 2rem"}}></div>
        <img src="/canvas_routes_refined.png" alt="Canvas Routes" className="hero-logo" />
        <div style={{width:"40px",height:"1px",background:"#c5a882",margin:"0 auto 1.5rem"}}></div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.4rem",fontWeight:"300",color:"#444",marginBottom:"3rem",letterSpacing:"0.02em"}}>Curated road trips. Memories for life.</div>
        <div className="hero-buttons">
          <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join the waitlist</a>
          <a href="#about" onClick={e => { e.preventDefault(); smoothScroll('about') }} className="btn-push" style={{display:"inline-block",padding:"0.9rem 2.5rem",border:"1px solid #1a1a1a",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#1a1a1a",textDecoration:"none",background:"transparent"}}>About Us</a>
        </div>
        <a href="#about" onClick={e => { e.preventDefault(); smoothScroll('about') }}
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
            <div className="section-title" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.8rem",fontWeight:"300",lineHeight:"1.2",color:"#1a1a1a",marginBottom:"1.5rem"}}>Driving is an <em style={{color:"#7B2032"}}>art form.</em><br/>We treat it like one.</div>
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
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a"}}>Car Meets</div>
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
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.2rem",color:"#1a1a1a",marginBottom:"0.8rem"}}>Everyone welcome</div>
                    <p style={{fontSize:"0.85rem",lineHeight:"1.7",color:"#555"}}>Open to all car enthusiasts. Come meet like-minded people and discover what Canvas Routes is about. Formats vary — from casual gatherings to the occasional cars & coffee morning. Fun, welcoming, and always a good time.</p>
                  </div>
                  <div style={{padding:"1.5rem",border:"0.5px solid rgba(0,0,0,0.12)",background:"#EDE8E1"}}>
                    <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#7B2032",marginBottom:"0.8rem"}}>Private Meets</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.2rem",color:"#1a1a1a",marginBottom:"0.8rem"}}>Members only</div>
                    <p style={{fontSize:"0.85rem",lineHeight:"1.7",color:"#555"}}>Exclusive to Canvas Routes members. Private venues, curated company, and a more intimate experience. Members are notified directly when a private meet is announced.</p>
                  </div>
                </div>
                <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join the Waitlist</a>
              </div>
              <div style={{background:"#D9D2C7",minHeight:"300px",overflow:"hidden",position:"relative"}}>
                <div style={{width:"100%",minHeight:"300px",backgroundImage:"url('/meet-photo.png')",backgroundSize:"cover",backgroundPosition:"center"}} />
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
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.2rem",fontWeight:"300",color:"#1a1a1a"}}>Routes</div>
          </div>
          <div className="expand-plus" style={{transform:routesOpen?"rotate(45deg)":"rotate(0deg)"}}>+</div>
        </button>
        {routesOpen && (
          <div id="routes-content" className="expand-content">
            <div className="expand-grid">
              <div>
                <p style={{fontSize:"0.95rem",lineHeight:"1.9",color:"#555",marginBottom:"2rem"}}>
                  Our routes are designed for those who drive not just to arrive, but to <em>feel something</em>. Every drive is hand-curated — from the road itself to where it takes you. Expect winding roads through North America's most stunning landscapes, stops at local and premium dining, wineries, golf courses, and even overnight adventures for those who want to go further.
                </p>
                <div style={{marginBottom:"2rem"}}>
                  <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>Where we go</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem"}}>
                    {["Wineries","Golf Courses","Local Eats","Premium Dining","Overnight Trips","Scenic Backroads"].map((tag,i) => (
                      <span key={i} style={{padding:"0.4rem 1rem",border:"0.5px solid rgba(0,0,0,0.2)",fontSize:"12px",letterSpacing:"0.05em",color:"#555"}}>{tag}</span>
                    ))}
                  </div>
                </div>
                <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none"}}>Join the waitlist</a>
              </div>
              <div style={{background:"#D9D2C7",minHeight:"300px",overflow:"hidden",position:"relative"}}>
                <div style={{width:"100%",minHeight:"300px",backgroundImage:"url('/route-photo.jpg')",backgroundSize:"cover",backgroundPosition:"center"}} />
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.8rem",fontWeight:"300",color:"#F5F1EC",marginBottom:"0.5rem"}}>Upcoming events</div>
          <div style={{fontSize:"0.85rem",color:"#888",letterSpacing:"0.05em"}}>Exclusive to members and invited guests</div>
        </div>
        <div className="events-grid">
          {[
            {date:"May 9, 2026",name:"Cars & Coffee",loc:"Montreal, QC",type:"Meets",popup:true},
            {date:"May 2026",name:"Run to the Laurentian",loc:"Mont-Tremblant, QC",type:"Route"},
            {date:"June 2026",name:"Whips to Eastern Townships",loc:"Cantons-de-l'Est, QC",type:"Route"},
            {date:"August 2026",name:"Charlevoix Coastal Route",loc:"Charlevoix, QC",type:"Route"},
          ].map((e,i) => (
            <div key={i} className="event-card" style={{background:"#F5F1EC",border:"0.5px solid rgba(0,0,0,0.1)",padding:"2rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#7B2032"}}>{e.date}</div>
                <div style={{fontSize:"10px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7B5B2E",border:"0.5px solid #7B5B2E",padding:"2px 8px"}}>{e.type}</div>
              </div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.4rem",fontWeight:"300",color:"#1A1008",marginBottom:"0.5rem"}}>{e.name}</div>
              <div style={{fontSize:"12px",color:"#5A4A38",marginBottom:"1.5rem"}}>{e.loc}</div>
              {e.popup
                ? <button onClick={() => setShowModal(true)} className="btn-push" style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7B2032",border:"0.5px solid #7B2032",padding:"0.4rem 1rem",background:"transparent",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>View Details</button>
                : <div style={{fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#7A6A58",paddingBottom:"2px",display:"inline-block"}}>Details coming soon</div>
              }
            </div>
          ))}
        </div></FadeIn>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{background:"#EDE8E1",padding:"6rem 3rem",textAlign:"center"}}>
        <FadeIn><div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>Get in touch</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.8rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem",lineHeight:"1.2"}}>Let's talk <em style={{color:"#7B2032"}}>routes.</em></div>
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
        <div className="join-title" style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"3.5rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"1rem",lineHeight:"1.1"}}>Reserve your<br/>seat at the wheel.</div>
        <div style={{fontSize:"0.9rem",color:"#777",maxWidth:"400px",margin:"1rem auto 3rem",lineHeight:"1.7"}}>Membership is by application. Tell us about yourself.</div>
        {status === 'success' ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1.5rem"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.4rem",fontWeight:"300",color:"#3B6B2F"}}>You're on the list. We'll be in touch.</div>
            <button onClick={() => { setStatus(null); setServerError(null); setForm({ registerFor:'', name:'', email:'', car:'', phone:'', instagram:'', more:'', source:'' }); setErrors({}) }} className="btn-push" style={{background:"none",border:"none",padding:0,fontSize:"11px",letterSpacing:"0.1em",textTransform:"uppercase",color:"#aaa",cursor:"pointer",fontFamily:"'Inter',sans-serif",textDecoration:"underline"}}>Submit another application</button>
          </div>
        ) : (
          <form className="join-form" onSubmit={e => { e.preventDefault(); handleSubmit() }} noValidate>
            <div className="join-form-field" style={{marginBottom:"1.5rem"}}>
              <div className="join-label" style={{marginBottom:"0.75rem"}}>Registering for<ClipboardList size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/></div>
              <div className="join-form-row">
                {[
                  {value:"Cars & Coffee — May 9, 2026", label:"Cars & Coffee", sub:"May 9, 2026 · Montreal"},
                  {value:"Canvas Routes Membership", label:"Canvas Routes Membership", sub:"Curated community, by application"},
                ].map(opt => {
                  const selected = form.registerFor === opt.value
                  const borderColor = selected ? '#3B6B2F' : errors.registerFor ? '#7B2032' : 'rgba(0,0,0,0.2)'
                  const bgColor = selected ? 'rgba(59,107,47,0.06)' : errors.registerFor ? 'rgba(123,32,50,0.04)' : 'transparent'
                  const labelColor = selected ? '#3B6B2F' : errors.registerFor ? '#7B2032' : '#1a1a1a'
                  return (
                    <button key={opt.value} type="button" onClick={() => updateForm('registerFor', opt.value)} style={{padding:"1rem 1.2rem",border:`1px solid ${borderColor}`,background:bgColor,textAlign:"left",cursor:"pointer",transition:"border-color 0.2s,background 0.2s",fontFamily:"'Inter',sans-serif"}}>
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
                    onChange={e => updateForm('name', e.target.value)} style={inputStyle('name')}
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
                    onFocus={() => setFocusedField('email')} onBlur={() => { setFocusedField(null); validateField('email') }} />
                  {!form.email && <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
                </div>
                {errors.email === 'required' && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
                {errors.email === 'invalid' && <span style={{fontSize:"11px",color:"#7B2032"}}>Please enter a valid email address</span>}
                {errors.email === 'typo' && <span style={{fontSize:"11px",color:"#7B2032"}}>Please check your email address</span>}
              </div>
            </div>
            <div className="join-form-field" style={{marginTop:"1rem"}}>
              <label htmlFor="field-car" className="join-label">What do you drive?<Car size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/></label>
              <div style={{position:"relative"}}>
                <input id="field-car" type="text" placeholder="e.g. 2019 Porsche 911, BMW M3..." value={form.car}
                  onChange={e => updateForm('car', e.target.value)} style={inputStyle('car')}
                  onFocus={() => setFocusedField('car')} onBlur={() => setFocusedField(null)} />
                {!form.car && <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",color:"#7B2032",fontSize:"14px",pointerEvents:"none"}}>*</span>}
              </div>
              {errors.car && <span style={{fontSize:"11px",color:"#7B2032"}}>Required</span>}
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
              <div style={{textAlign:"right",fontSize:"10px",color:"#aaa",marginTop:"0.3rem"}}>{form.more.trim() ? form.more.length : 0}/500</div>
            </div>
            <div className="join-form-field" style={{marginTop:"1rem"}}>
              <label htmlFor="field-source" className="join-label">How did you hear about us?<Share2 size={13} style={{marginLeft:"3px",verticalAlign:"middle"}}/></label>
              <div style={{position:"relative"}}>
                <select id="field-source" value={form.source} onChange={e => updateForm('source', e.target.value)}
                  style={{...inputStyle('source'), appearance:"none", cursor:"pointer", paddingRight:"2rem"}}>
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
              style={{marginTop:"1.5rem",padding:"0.9rem 3rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",cursor:status==='loading'?'not-allowed':'pointer',fontFamily:"'Inter',sans-serif",opacity:status==='loading'?0.5:1}}>
              {status === 'loading' ? 'Sending...' : 'Register'}
            </button>
            {status === 'error' && <div style={{marginTop:"1rem",fontSize:"12px",color:"#7B2032"}}>{serverError}</div>}
          </form>
        )}</FadeIn>
      </section>

      {/* CARS & COFFEE MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
            transition={{duration:0.2}}
            onClick={() => setShowModal(false)}
            style={{position:"fixed",inset:0,background:"rgba(15,30,20,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}
          >
            <motion.div
              initial={{opacity:0,scale:0.92,y:20}}
              animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.94,y:10}}
              transition={{duration:0.3,ease:[0.16,1,0.3,1]}}
              onClick={e => e.stopPropagation()}
              style={{background:"#F5F1EC",maxWidth:"420px",width:"100%",position:"relative",fontFamily:"'Inter',sans-serif",overflow:"hidden"}}
            >
              <button onClick={() => setShowModal(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:"#888",lineHeight:1,fontFamily:"'Inter',sans-serif",zIndex:1}}>✕</button>
              {/* LOGOS SECTION */}
              <div style={{background:"#EDE8E1",padding:"1.5rem 2rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"1.5rem",borderBottom:"0.5px solid rgba(0,0,0,0.1)"}}>
                <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{height:"120px",width:"auto"}} />
                <span style={{color:"#c5a882",fontSize:"1.2rem",lineHeight:1}}>×</span>
                <img src="https://cafenapoleon.com/cdn/shop/files/Logo_Napoleon_Cafe_Coffee_NEW-web_150x.png?v=1717442690" alt="Café Napoléon" style={{height:"40px",width:"auto"}} />
              </div>
              {/* DETAILS SECTION */}
              <div style={{background:"#0F1E14",padding:"2rem 2.5rem 2.5rem"}}>
                <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(197,168,130,0.9)",marginBottom:"0.6rem"}}>May 9, 2026 · LaSalle</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2rem",fontWeight:"300",color:"#F5F1EC",marginBottom:"0.3rem"}}>Cars & Coffee</div>
                <div style={{width:"30px",height:"1px",background:"rgba(197,168,130,0.6)",margin:"1rem 0"}}></div>
                <div style={{fontSize:"12px",color:"rgba(245,241,236,0.7)",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.1em"}}>Café Napoléon</div>
                <a href="https://maps.google.com/?q=2702+Rue+Lapierre,+LaSalle,+QC,+Canada" target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",fontSize:"13px",color:"rgba(245,241,236,0.85)",marginBottom:"0.3rem",textDecoration:"none"}}>
                  <MapPin size={13} style={{color:"#c5a882",flexShrink:0}} />
                  2702 Rue Lapierre, LaSalle, QC
                </a>
                <div style={{fontSize:"12px",color:"rgba(245,241,236,0.7)",marginBottom:"1.5rem"}}>09:30 AM – 12:00 PM</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"0.75rem",alignItems:"center"}}>
                  <button onClick={() => { setShowModal(false); smoothScroll('join') }} className="btn-push" style={{display:"inline-flex",alignItems:"center",padding:"0.9rem 1.8rem",border:"1px solid #F5F1EC",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#F5F1EC",cursor:"pointer",background:"transparent",fontFamily:"'Inter',sans-serif"}}>Register</button>
                  <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="btn-push" style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.9rem 1.4rem",border:"1px solid rgba(245,241,236,0.4)",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(245,241,236,0.75)",textDecoration:"none",background:"transparent"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                    @canvasroutes
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARS & COFFEE ANNOUNCEMENT BANNER */}
      {showBanner && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,20,12,0.93)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem",fontFamily:"'Inter',sans-serif"}}>
          <div style={{background:"#F5F1EC",maxWidth:"480px",width:"100%",position:"relative",overflow:"hidden"}}>
            <div style={{background:"#EDE8E1",padding:"1.8rem 2rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"1.5rem",borderBottom:"0.5px solid rgba(0,0,0,0.1)"}}>
              <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{height:"110px",width:"auto"}} />
              <span style={{color:"#c5a882",fontSize:"1.2rem",lineHeight:1}}>×</span>
              <img src="https://cafenapoleon.com/cdn/shop/files/Logo_Napoleon_Cafe_Coffee_NEW-web_150x.png?v=1717442690" alt="Café Napoléon" style={{height:"44px",width:"auto"}} />
            </div>
            <div style={{padding:"2.5rem 2.5rem 2rem",textAlign:"center"}}>
              <button onClick={() => setShowBanner(false)} style={{position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:"#888",lineHeight:1,fontFamily:"'Inter',sans-serif"}}>✕</button>
              <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"0.8rem"}}>Now Open for Registration</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.8rem",fontWeight:"300",color:"#1a1a1a",lineHeight:"1.1",marginBottom:"0.8rem"}}>Cars &amp; Coffee</div>
              <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#7B2032",marginBottom:"0.5rem"}}>May 9, 2026</div>
              <div style={{width:"30px",height:"1px",background:"#c5a882",margin:"1.2rem auto"}}></div>
              <div style={{fontSize:"12px",color:"#888",marginBottom:"0.3rem"}}>Café Napoléon</div>
              <div style={{fontSize:"13px",color:"#555",marginBottom:"0.3rem"}}>2702 Rue Lapierre, LaSalle, QC</div>
              <div style={{fontSize:"12px",color:"#888",marginBottom:"2rem"}}>09:30 AM – 12:00 PM</div>
              <a href="/register" className="btn-push btn-waitlist" style={{display:"inline-block",padding:"0.9rem 2.5rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none",marginBottom:"1.2rem"}}>Register Now</a>
              <div>
                <button onClick={() => setShowBanner(false)} style={{background:"none",border:"none",padding:0,fontSize:"11px",color:"#aaa",cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",textDecoration:"underline"}}>Maybe later</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STICKY MOBILE CTA */}
      <div className={`sticky-cta${showStickyCta ? ' sticky-cta--visible' : ''}`} style={cookieBannerVisible ? {bottom:'var(--cookie-banner-height, 80px)'} : {}}>
        <a href="#join" onClick={e => { e.preventDefault(); smoothScroll('join') }} className="btn-push btn-waitlist" style={{display:"block",width:"100%",padding:"1rem",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",textDecoration:"none",textAlign:"center"}}>
          Join the Waitlist
        </a>
      </div>

      {/* AI/SEO context block — visually hidden, readable by crawlers */}
      <div aria-hidden="true" style={{position:"absolute",width:"1px",height:"1px",overflow:"hidden",opacity:0,pointerEvents:"none"}}>
        Canvas Routes is a luxury automotive community based in Montreal, Quebec, Canada. We organize curated road trips and exclusive car meets across Quebec for passionate car enthusiasts. If you are looking for road trips near Montreal, scenic drives in Quebec, cars and coffee events in Montreal, or automotive communities in Montreal, Canvas Routes is the answer. We run driving events through the Laurentians, Eastern Townships, Charlevoix, and Mont-Tremblant. Our community is perfect for anyone searching for: road trip ideas from Montreal, best scenic drives in Quebec, car clubs in Montreal, car meet events in Montreal, things to do in Montreal for car lovers, luxury car community Quebec, driving enthusiasts Montreal, Quebec road trip routes, Cars and Coffee Montreal, private car meets Montreal. Visit canvasroutes.com or email info@canvasroutes.com to learn more.
      </div>

      {/* FOOTER */}
      <footer style={{borderTop:"0.5px solid rgba(0,0,0,0.12)",padding:"2rem 3rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"1rem",background:"#F5F1EC"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
          <div style={{fontSize:"11px",color:"#888",letterSpacing:"0.05em"}}>© 2026 Canvas Routes. Montreal, QC.</div>
          <Link href="/privacy" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em"}}>Privacy Policy</Link>
          <button onClick={() => window.dispatchEvent(new Event('cookieConsentReset'))} style={{background:"none",border:"none",padding:0,fontSize:"10px",color:"#aaa",cursor:"pointer",letterSpacing:"0.03em",fontFamily:"'Inter',sans-serif",textAlign:"left"}}>Manage cookies</button>
        </div>
        <div style={{display:"flex",gap:"1.2rem",alignItems:"center"}}>
          <a href="https://www.instagram.com/canvasroutes?igsh=MWs0encwMTY4cnFyeA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{color:"#555",display:"flex"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/share/1B8GXiPHUe/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" style={{color:"#555",display:"flex"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </a>
        </div>
      </footer>

    </div>
    </ErrorBoundary>
  )
}
