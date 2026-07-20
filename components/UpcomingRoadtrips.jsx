'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import PastRouteRecapModal from './PastRouteRecapModal'

const ACCENT = '#c5a882'
export const ACCENT_BGS = [
  'linear-gradient(135deg, #1a3322 0%, #0F1E14 100%)',
  'linear-gradient(135deg, #1c2e28 0%, #0d1e18 100%)',
  'linear-gradient(135deg, #2a2418 0%, #1a160e 100%)',
  'linear-gradient(135deg, #271e14 0%, #1a1208 100%)',
  'linear-gradient(135deg, #141e2a 0%, #0a1018 100%)',
]
const INTRO = 'A route launches when enough drivers are in. Add your name — no payments, no strings — and you\'ll hear from us the moment it\'s a go.'
const CONTACT_KEY = 'cr_routes_contact' // returning-visitor prefill + registered flags
const TRIP_LABELS = { day: 'Day Trip', overnight: 'Overnight', multi_day: 'Multi-Day' }
// Budget brackets scale with the trip: a day loop and a five-day expedition
// shouldn't offer the same ranges. Fallback only — routes with a real
// price_range set (see admin "Avg. price range") get brackets anchored to
// that actual number instead, via budgetsFor() below.
const BUDGET_OPTIONS = {
  day:       ['$250–500', '$500–1,000', '$1,000+'],
  overnight: ['$500–1,000', '$1,000–1,500', '$1,500–2,000', '$2,000+'],
  multi_day: ['$1,000–1,500', '$1,500–2,000', '$2,000–3,000', '$3,000+'],
}
// Pulls the low/high numbers out of a free-text price_range like
// "$800–$1,200" or "$800-1200 per car" so brackets can anchor to it.
function parsePriceRange(str) {
  const nums = String(str || '').match(/[\d,]+/g)?.map(s => parseInt(s.replace(/,/g, ''), 10)).filter(Number.isFinite)
  if (!nums || nums.length === 0) return null
  return { low: Math.min(...nums), high: Math.max(...nums) }
}
function budgetsFor(route) {
  const parsed = parsePriceRange(route?.price_range)
  if (parsed) {
    const fmt = n => `$${n.toLocaleString('en-US')}`
    return [`Under ${fmt(parsed.low)}`, `${fmt(parsed.low)}–${fmt(parsed.high)}`, `${fmt(parsed.high)}+`]
  }
  return BUDGET_OPTIONS[route?.trip_type] || BUDGET_OPTIONS.overnight
}
const HOTEL_OPTIONS    = ['Budget-friendly', 'Mid-range', 'Boutique / Luxury', 'Camping / Rustic']
// Generic fallback — routes carry their own area-specific activity_options
const ACTIVITY_OPTIONS = ['Scenic drives', 'Local food', 'Fine dining', 'Photography', 'Sightseeing', 'Nightlife', 'Relaxing']

// Real route photography (optimized copies in /public/routes-photos).
// Routes without an entry fall back to the gradient + watermark art.
// Exported so the homepage teaser grid can reuse the exact same mapping.
export const ROUTE_PHOTOS = {
  'memoirs-to-charlevoix': '/routes-photos/memoirs-to-charlevoix.jpg',
  'the-gaspesie-odyssey':  '/routes-photos/the-gaspesie-odyssey.jpg',
  'the-tobermory-story':   '/routes-photos/the-tobermory-story.jpg',
  'the-calabogie-boogie':  '/routes-photos/the-calabogie-boogie.jpg',
  'the-cabot-trail-grail': '/routes-photos/the-cabot-trail-grail.jpg',
}

const MONTREAL = { lat: 45.5019, lng: -73.5674 }

// Real map for the Map view — same parchment styling as the itinerary pages
// (whips-to-eastern-townships RouteMap). Plots Montreal plus every route
// destination; the selected route gets a bold Montreal→destination line.
function RoutesMap({ routes, selectedId, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlaysRef = useRef([])
  const fittedRef = useRef(false)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) { setStatus('error'); return }
    let destroyed = false

    const initMap = () => {
      if (destroyed || !containerRef.current || mapRef.current) return
      try {
        const google = window.google
        if (!google?.maps) { setStatus('error'); return }
        const map = new google.maps.Map(containerRef.current, {
          mapTypeId: 'roadmap',
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: 'poi',          elementType: 'labels',   stylers: [{ visibility: 'off' }] },
            { featureType: 'transit',                               stylers: [{ visibility: 'off' }] },
            { featureType: 'road',         elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f5e9d6' }] },
            { featureType: 'landscape',                             stylers: [{ color: '#f0ede8' }] },
            { featureType: 'water',                                 stylers: [{ color: '#c8d8e8' }] },
          ],
        })
        new google.maps.Marker({
          position: MONTREAL, map, title: 'Montreal — departure',
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#3B6B2F', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
        })
        mapRef.current = map
        if (!destroyed) setStatus('ready')
      } catch { if (!destroyed) setStatus('error') }
    }

    const scriptId = 'gmap-script'
    if (window.google?.maps) {
      initMap()
    } else if (document.getElementById(scriptId)) {
      document.getElementById(scriptId).addEventListener('load', initMap)
    } else {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
      script.async = true
      script.onload = initMap
      script.onerror = () => { if (!destroyed) setStatus('error') }
      document.head.appendChild(script)
    }
    return () => { destroyed = true }
  }, [])

  // (Re)draw destination markers + Montreal lines whenever selection changes
  useEffect(() => {
    const google = window.google
    if (status !== 'ready' || !google?.maps || !mapRef.current) return
    overlaysRef.current.forEach(o => o.setMap(null))
    overlaysRef.current = []
    const pts = routes.filter(r => r.dest_lat != null && r.dest_lng != null)
    const bounds = new google.maps.LatLngBounds()
    bounds.extend(MONTREAL)
    pts.forEach(r => {
      const pos = { lat: parseFloat(r.dest_lat), lng: parseFloat(r.dest_lng) }
      bounds.extend(pos)
      const sel = r.id === selectedId
      const line = new google.maps.Polyline({
        path: [MONTREAL, pos], geodesic: true, map: mapRef.current,
        strokeColor: '#0F1E14', strokeOpacity: sel ? 0.8 : 0.16, strokeWeight: sel ? 3 : 2,
      })
      const marker = new google.maps.Marker({
        position: pos, map: mapRef.current, title: r.name,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: sel ? 10 : 7, fillColor: sel ? '#0F1E14' : ACCENT, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
      })
      marker.addListener('click', () => onSelect(r.id))
      overlaysRef.current.push(line, marker)
    })
    if (!fittedRef.current && pts.length) { mapRef.current.fitBounds(bounds, 48); fittedRef.current = true }
  }, [routes, selectedId, status, onSelect])

  if (status === 'error') {
    return (
      <div className="rt-map-canvas" style={{ background: '#EDE8E1', border: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#bbb', marginBottom: '6px' }}>Route Map</div>
          <div style={{ fontSize: '12px', color: '#ccc', fontWeight: 300 }}>Map unavailable right now</div>
        </div>
      </div>
    )
  }
  return <div ref={containerRef} className="rt-map-canvas" style={{ border: '0.5px solid rgba(0,0,0,0.07)', background: '#EDE8E1', boxShadow: '0 6px 28px rgba(15,30,20,0.08)' }} />
}

function PinIcon() {
  return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}
function CheckIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

export default function UpcomingRoadtrips({ isMember = false, memberName = '', memberEmail = '', memberPhone = '', memberCar = '', profileMissing = [], embedded = false }) {
  const [routes, setRoutes]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [view, setView]           = useState('grid')
  const [selectedId, setSelectedId] = useState(null)
  const [shareRoute, setShareRoute] = useState(null)
  const [animated, setAnimated]   = useState(false)
  const [copied, setCopied]       = useState(false)
  const [sheetId, setSheetId]     = useState(null)  // route id with the interest sheet open
  const [sheetSuccess, setSheetSuccess] = useState(false) // show in-sheet confirmation after submit
  const [emailIsMember, setEmailIsMember] = useState(false) // live check: typed email belongs to a member
  const hpRef = useRef(null) // honeypot
  const [showBar, setShowBar]     = useState(false) // sticky context bar past the hero
  const [howOpen, setHowOpen]     = useState(false) // How-It-Works accordion (mobile)
  const [isMobileView, setIsMobileView] = useState(false)
  const [recapRoute, setRecapRoute] = useState(null) // past route showing the "View Recap" modal
  const [pastRoutes, setPastRoutes] = useState([]) // completed routes — DB-backed (admin: Routes tab), was hardcoded lib/pastRoutes.js

  useEffect(() => {
    fetch('/api/upcoming-routes/past')
      .then(r => r.ok ? r.json() : [])
      .then(list => setPastRoutes((Array.isArray(list) ? list : []).map(r => ({
        slug: r.slug, name: r.name, destination: r.destination, month_label: r.month_label,
        description: r.description, photo: r.photo_url, href: r.recap_href,
        cars: r.cars_rolled_out, target: r.target_count,
      }))))
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    // Returning visitors: reuse the contact they submitted with last time so
    // their cards come back pre-marked and the form is prefilled.
    let stored = {}
    try { stored = JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}') || {} } catch {}
    const knownEmail = memberEmail || stored.email || ''
    const qs = knownEmail ? `?email=${encodeURIComponent(knownEmail)}` : ''
    setLoadError(false)
    fetch(`/api/upcoming-routes${qs}`)
      .then(r => { if (!r.ok) throw new Error(`upcoming-routes HTTP ${r.status}`); return r.json() })
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setRoutes(list.map(r => ({
          ...r,
          showForm: false,
          showItinerary: false,
          interested: !!r.registered,
          error: null,
          submitting: false,
          formName: memberName || stored.name || '',
          formEmail: memberEmail || stored.email || '',
          formPhone: memberPhone || stored.phone || '',
          formCar: memberCar || stored.car || '',
          formBudget: '',
          formDates: '',
          formHotel: '',
          formActivities: [],
          formNotes: '',
        })))
        setLoading(false)
        setSelectedId(list[0]?.id ?? null)
      })
      .catch(() => { setLoadError(true); setLoading(false) })
  }, [memberEmail, memberName, memberPhone, memberCar, isMember])
  useEffect(() => { load() }, [load])

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 140); return () => clearTimeout(t) }, [loading])

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Sticky context bar: slides in once the route list reaches the top
  useEffect(() => {
    if (embedded) return
    const onScroll = () => {
      const el = document.getElementById('routes-list')
      setShowBar(window.scrollY > (el ? el.offsetTop - 120 : 600))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [embedded])

  // While the context bar is shown, slide the tall fixed SiteNav out of the way
  // so they never half-overlap — the slim bar takes over as the header.
  useEffect(() => {
    if (embedded) return
    const nav = document.querySelector('.nav')
    if (!nav) return
    nav.style.transition = 'transform .3s cubic-bezier(.22,.68,0,1)'
    nav.style.transform = showBar ? 'translateY(-105%)' : ''
    return () => { nav.style.transform = ''; nav.style.transition = '' }
  }, [showBar, embedded])

  // Lock body scroll while the sheet or share modal is open. iOS Safari
  // ignores overflow:hidden alone — needs the position:fixed technique
  // (same as the homepage popup), with scroll restored on close.
  useEffect(() => {
    const lock = !!(sheetId || shareRoute)
    if (!lock) return
    const scrollY = window.scrollY
    const body = document.body
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    return () => {
      const top = body.style.top
      body.style.overflow = ''; body.style.position = ''; body.style.top = ''; body.style.width = ''
      if (top) window.scrollTo(0, -parseInt(top, 10))
    }
  }, [sheetId, shareRoute])

  // Live member-email check: as a guest types their email, quietly ask the
  // server whether it belongs to a member account — warn before submit.
  const sheetEmailValue = !isMember && sheetId ? (routes.find(r => r.id === sheetId)?.formEmail || '') : ''
  useEffect(() => {
    setEmailIsMember(false)
    const email = sheetEmailValue.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    const t = setTimeout(() => {
      fetch('/api/upcoming-routes/member-check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
        .then(r => r.ok ? r.json() : { member: false })
        .then(d => setEmailIsMember(!!d.member))
        .catch(() => {})
    }, 450)
    return () => clearTimeout(t)
  }, [sheetEmailValue, isMember, sheetId])

  // Reveal-on-scroll: below-the-fold cards/sections animate when they actually
  // enter the viewport instead of invisibly on mount.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = document.querySelectorAll('.rt-reveal:not(.rt-in)')
    if (!els.length) return
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('rt-in'); io.unobserve(e.target) } })
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [routes, loading, view, howOpen, embedded])

  function patch(id, changes) {
    setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...(typeof changes === 'function' ? changes(r) : changes) } : r))
  }

  async function submitInterest(route) {
    const name = (route.formName || '').trim()
    const email = (route.formEmail || '').trim()
    if (!name || name.length < 2) { patch(route.id, { error: 'Please enter your name.' }); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { patch(route.id, { error: 'Please enter a valid email.' }); return }
    if (!(route.formPhone || '').trim()) { patch(route.id, { error: 'Please enter your phone number.' }); return }
    if (!(route.formCar || '').trim()) { patch(route.id, { error: 'Please tell us your car — year, make and model.' }); return }
    if (!route.formBudget) { patch(route.id, { error: 'Please pick a budget range.' }); return }
    if (!(route.formDates || '').trim()) { patch(route.id, { error: 'Please tell us which dates work for you.' }); return }
    if ((route.trip_type === 'overnight' || route.trip_type === 'multi_day') && !route.formHotel) { patch(route.id, { error: 'Please pick a hotel preference.' }); return }
    if (!(route.formActivities || []).length) { patch(route.id, { error: 'Please pick at least one activity.' }); return }
    if (!(route.formNotes || '').trim()) { patch(route.id, { error: 'Please add a note — even a line about what you\'re hoping for helps.' }); return }
    patch(route.id, { submitting: true, error: null })
    try {
      const res = await fetch('/api/upcoming-routes/interest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: route.slug, name, email,
          phone: (route.formPhone || '').trim(),
          car: (route.formCar || '').trim(),
          preferences: {
            budget: route.formBudget || '',
            dates: (route.formDates || '').trim(),
            hotel: route.formHotel || '',
            activities: route.formActivities || [],
            notes: (route.formNotes || '').trim(),
          },
          is_member: isMember,
          _hp: hpRef.current?.value || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        patch(route.id, { submitting: false, error: data.error || 'Something went wrong.', memberPrompt: !!data.member })
        return
      }
      // Remember the contact so return visits prefill + pre-mark their cards
      try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ name, email, phone: (route.formPhone || '').trim(), car: (route.formCar || '').trim() })) } catch {}
      patch(route.id, {
        submitting: false, showForm: false, interested: true, error: null,
        interested_count: typeof data.interested_count === 'number' ? data.interested_count : route.interested_count + 1,
      })
      setSheetSuccess(true) // sheet stays open showing the confirmation
    } catch { patch(route.id, { submitting: false, error: 'Network error. Please try again.' }) }
  }

  function scrollToRoutes() {
    document.getElementById('routes-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // One share message everywhere — native sheet, copy, and tweet
  function shareText(r) {
    return `I put my name down for ${r.name} — ${r.month_label} 🏁 It launches once enough drivers are in. Add yours:`
  }

  // Native share sheet on iOS/Android; falls back to the modal on desktop
  function shareInterest(r) {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ text: shareText(r), url: 'https://canvasroutes.com/routes' }).catch(() => {})
    } else {
      setShareRoute(r); setCopied(false)
    }
  }

  function copyShare() {
    if (!shareRoute) return
    // Clipboard API is missing in some in-app browsers — only confirm a real
    // copy; the preview text below is tap-selectable as the manual fallback.
    const text = `${shareText(shareRoute)} canvasroutes.com/routes`
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
        .catch(() => {})
    }
  }
  function shareTwitter() {
    if (!shareRoute) return
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText(shareRoute)} canvasroutes.com/routes`)}`, '_blank')
  }

  const myInterestCount = routes.filter(r => r.interested).length
  const sheetRoute = routes.find(r => r.id === sheetId) || null
  const heroBg = '#0F1E14', heroText = '#F5F1EC', heroMuted = 'rgba(245,241,236,0.55)'
  const PADX = embedded ? '0px' : 'clamp(1.5rem,4vw,3rem)' // portal supplies its own gutter

  return (
    <div style={{ background: embedded ? 'transparent' : '#F5F1EC', minHeight: embedded ? undefined : '100vh', overflowX: embedded ? undefined : 'hidden', fontFamily: "'Inter',var(--font-inter),sans-serif" }}>
      <style>{`
        @keyframes rtFadeUp { from { opacity:0; transform:translateY(28px);} to { opacity:1; transform:translateY(0);} }
        @keyframes rtFadeIn { from { opacity:0;} to { opacity:1;} }
        @keyframes rtShimmer { 0% { background-position:-400px 0;} 100% { background-position:400px 0;} }
        @keyframes rtSuccessPop { 0% { transform:scale(0.92); opacity:0;} 60% { transform:scale(1.03);} 100% { transform:scale(1); opacity:1;} }
        @keyframes rtHeroDivider { from { width:0;} to { width:48px;} }
        @keyframes rtFormDown { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:translateY(0);} }
        .rt-hero-1 { opacity:0; animation:rtFadeUp .8s cubic-bezier(.22,.68,0,1.2) .1s forwards; }
        .rt-hero-2 { opacity:0; animation:rtFadeUp .8s cubic-bezier(.22,.68,0,1.2) .28s forwards; }
        .rt-hero-sub { opacity:0; animation:rtFadeIn .7s ease .6s forwards; }
        .rt-hero-meta { opacity:0; animation:rtFadeIn .7s ease .85s forwards; }
        .rt-hero-divider { display:block; height:1px; background:rgba(197,168,130,0.4); margin:28px 0; width:0; animation:rtHeroDivider .8s ease .5s forwards; }
        @keyframes rtCtaShimmer { 0% { left:-80%; opacity:0; } 15% { opacity:1; } 85% { opacity:1; } 100% { left:130%; opacity:0; } }
        .rt-hero-cta { position:relative; overflow:hidden; display:inline-block; min-height:44px; padding:13px 34px; background:#F5F1EC; color:#0F1E14; border:none; font-family:inherit; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; font-weight:600; cursor:pointer; -webkit-tap-highlight-color:transparent; touch-action:manipulation; transition:transform .1s; }
        .rt-hero-cta { box-shadow:0 10px 34px rgba(0,0,0,0.35); }
        .rt-hero-cta:active { transform:scale(0.98); }
        .rt-hero-cta::after { content:''; position:absolute; top:-10%; left:-80%; width:40%; height:120%; background:linear-gradient(105deg, transparent 10%, rgba(197,168,130,0.35) 50%, transparent 90%); transform:skewX(-10deg); animation:rtCtaShimmer .9s cubic-bezier(.4,0,.2,1) 1.6s forwards; pointer-events:none; }
        @media (max-width:480px) { .rt-hero-cta { display:block; width:100%; text-align:center; } }
        /* Scroll-triggered reveal — elements animate in as they enter the viewport */
        .rt-reveal { opacity:0; transform:translateY(22px); }
        .rt-reveal.rt-in { animation:rtFadeUp .6s cubic-bezier(.22,.68,0,1.1) forwards; }
        .rt-card { background:#fff; border:0.5px solid rgba(0,0,0,0.07); display:flex; flex-direction:column; overflow:hidden; transition:box-shadow .35s ease, transform .35s ease, border-color .35s ease; box-shadow:0 6px 28px rgba(15,30,20,0.08), 0 1px 4px rgba(0,0,0,0.05); }
        @media (hover:hover) { .rt-card:hover { box-shadow:0 18px 56px rgba(15,30,20,0.16), 0 3px 10px rgba(197,168,130,0.16); transform:translateY(-4px); border-color:rgba(197,168,130,0.4); } .rt-card:hover .rt-card-photo { transform:scale(1.05); } }
        /* Touch feedback — hover never fires on phones, so press states carry the weight */
        @media (hover:none) {
          .rt-card:active { transform:scale(0.988); box-shadow:0 3px 14px rgba(15,30,20,0.1); }
          .rt-maprow:active { background:#f2efe9; }
          .rt-pill:active, .rt-ghost:active { background:rgba(0,0,0,0.04); }
        }
        .rt-card-photo { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:transform .6s ease; }
        @keyframes rtCountPulse { 0% { transform:scale(1); } 45% { transform:scale(1.16); } 100% { transform:scale(1); } }
        .rt-pulse-once { animation:rtCountPulse .5s ease .1s; }
        @keyframes rtCheckDraw { to { stroke-dashoffset:0; } }
        .rt-check-draw polyline { stroke-dasharray:24; stroke-dashoffset:24; animation:rtCheckDraw .5s cubic-bezier(.4,0,.2,1) .18s forwards; }
        @media (prefers-reduced-motion: reduce) {
          .rt-reveal, .rt-card, .rt-hero-1, .rt-hero-2, .rt-hero-sub, .rt-hero-meta { opacity:1 !important; transform:none !important; animation:none !important; }
          .rt-fill, .rt-hero-cta::after, .rt-pulse-once { animation:none !important; }
        }
        .rt-track { background:rgba(0,0,0,0.06); height:3px; overflow:hidden; }
        .rt-fill { height:100%; width:0%; transition:width 1.2s cubic-bezier(.4,0,.2,1); background:linear-gradient(90deg, #c5a882 25%, #f0ddb8 50%, #c5a882 75%); background-size:400px 100%; animation:rtShimmer 2s ease-in-out infinite; }
        .rt-btn { background:#0F1E14; color:#F5F1EC; border:none; font-family:inherit; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; padding:13px 20px; cursor:pointer; transition:background .2s, transform .1s; width:100%; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
        .rt-btn:hover { background:#1a3322; } .rt-btn:active { transform:scale(0.98); } .rt-btn:disabled { opacity:0.6; cursor:default; }
        .rt-ghost { background:transparent; color:#888; border:0.5px solid rgba(0,0,0,0.15); font-family:inherit; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; padding:13px 16px; cursor:pointer; transition:border-color .2s, color .2s; }
        .rt-ghost:hover { border-color:#999; color:#555; }
        .rt-form { overflow:hidden; animation:rtFormDown .35s ease forwards; }
        .rt-input { width:100%; padding:11px 12px; border:0.5px solid rgba(0,0,0,0.15); background:#faf9f7; font-family:inherit; font-size:12px; color:#1a1a1a; outline:none; transition:border-color .2s, background .2s; margin-bottom:8px; }
        .rt-input:focus { border-color:#c5a882; background:#fff; }
        .rt-success { animation:rtSuccessPop .4s cubic-bezier(.22,.68,0,1.2) forwards; }
        .rt-pill { background:transparent; border:0.5px solid rgba(0,0,0,0.18); font-family:inherit; font-size:10px; letter-spacing:0.16em; text-transform:uppercase; padding:9px 22px; min-height:38px; cursor:pointer; color:#666; transition:all .2s; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
        .rt-pill-active { background:#0F1E14; color:#F5F1EC; border-color:#0F1E14; }
        .rt-maprow { border:0.5px solid rgba(0,0,0,0.07); background:#fff; padding:14px 18px; cursor:pointer; transition:border-color .2s, background .2s, box-shadow .2s; border-left:3px solid transparent; box-shadow:0 3px 14px rgba(15,30,20,0.06); }
        .rt-maprow-active { box-shadow:0 8px 24px rgba(15,30,20,0.12); }
        .rt-maprow:hover { background:#faf9f7; border-color:rgba(197,168,130,0.4); }
        .rt-maprow-active { border-left-color:#c5a882 !important; background:#faf9f7; }
        @keyframes rtSheetUp { from { transform:translateY(100%);} to { transform:translateY(0);} }
        .rt-sheet-backdrop { position:fixed; inset:0; background:rgba(15,30,20,0.55); backdrop-filter:blur(3px); z-index:1100; animation:rtFadeIn .2s ease forwards; }
        .rt-sheet { position:fixed; left:0; right:0; bottom:0; z-index:1101; background:#F5F1EC; border-radius:18px 18px 0 0; max-height:88vh; max-height:88dvh; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; padding:10px 20px calc(24px + env(safe-area-inset-bottom)); animation:rtSheetUp .32s cubic-bezier(.22,.68,0,1) forwards; box-shadow:0 -8px 40px rgba(0,0,0,0.25); }
        .rt-sheet-handle { width:36px; height:4px; border-radius:99px; background:rgba(0,0,0,0.15); margin:6px auto 14px; }
        @media (min-width:769px) {
          .rt-sheet { left:50%; right:auto; bottom:auto; top:50%; width:460px; max-height:82vh; transform:translate(-50%,-50%); border-radius:4px; padding:28px 32px 32px; animation:rtFadeIn .25s ease forwards; }
          .rt-sheet-handle { display:none; }
        }
        .rt-backdrop { position:fixed; inset:0; background:rgba(15,30,20,0.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1200; padding:16px; animation:rtFadeIn .2s ease forwards; }
        .rt-modal { background:#F5F1EC; padding:40px; max-width:420px; width:100%; border:0.5px solid rgba(0,0,0,0.1); animation:rtFadeUp .3s cubic-bezier(.22,.68,0,1.1) forwards; }
        .rt-map-canvas { height:580px; }
        @media (max-width:768px) {
          .rt-map-grid { grid-template-columns:1fr !important; }
          .rt-map-canvas { height:340px; }
          .rt-modal { padding:28px 22px; }
        }
      `}</style>

      {/* ── STICKY CONTEXT BAR (mobile-first, slides over the tall nav) ── */}
      {!embedded && (
        <div onClick={scrollToRoutes} role="button" aria-label="Back to routes"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 102, background: '#0F1E14', borderBottom: '0.5px solid rgba(197,168,130,0.25)', padding: 'env(safe-area-inset-top) clamp(1rem,4vw,3rem) 0', transform: showBar ? 'translateY(0)' : 'translateY(-110%)', transition: 'transform .3s cubic-bezier(.22,.68,0,1)', cursor: 'pointer', boxShadow: showBar ? '0 8px 28px rgba(8,14,10,0.4)' : 'none' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '48px', gap: '12px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '16px', color: '#F5F1EC', whiteSpace: 'nowrap' }}>
              Routes <span style={{ color: ACCENT }}>· {routes.length}</span>
            </span>
            <span style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, whiteSpace: 'nowrap' }}>
              {myInterestCount} registered ↑
            </span>
          </div>
        </div>
      )}

      {/* Compact header for the members-portal embed */}
      {embedded && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: ACCENT, marginBottom: '1rem' }}>Canvas Routes · 2026 Season</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(2.4rem,5vw,3.4rem)', fontWeight: 300, color: '#1a1a1a', lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>Routes</h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '0.9rem', maxWidth: '520px', lineHeight: 1.75 }}>{INTRO}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.25rem' }}>
            <span style={{ width: '6px', height: '6px', background: ACCENT, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: '#8a7a5c', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Member Access · Priority Spots Reserved</span>
          </div>
        </div>
      )}

      {/* ── HERO — convoy aerial with dark scrim (event-hero pattern) ── */}
      {!embedded && (
      <div style={{ backgroundColor: heroBg, backgroundImage: "url('/convoy-hero.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 40%', padding: 'clamp(124px,14vw,168px) clamp(1.5rem,4vw,3rem) clamp(48px,7vw,80px)', position: 'relative', overflow: 'hidden' }}>
        {/* Dark overlay so cream/gold text stays readable over the busy image */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,12,0.78)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(197,168,130,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(197,168,130,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <div className="rt-hero-1" style={{ fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: ACCENT, opacity: 0.7, marginBottom: '20px', fontWeight: 400 }}>Canvas Routes · 2026 Season</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(3rem,7vw,6rem)', fontWeight: 300, color: heroText, lineHeight: 1.05, margin: 0 }}>
            <span className="rt-hero-2" style={{ display: 'block', color: ACCENT, fontStyle: 'italic' }}>Routes</span>
          </h1>
          <span className="rt-hero-divider" />
          <p className="rt-hero-sub" style={{ fontSize: '14px', color: heroMuted, maxWidth: '520px', lineHeight: 1.85, fontWeight: 300 }}>{INTRO}</p>
          <div className="rt-hero-meta" style={{ display: 'flex', gap: '40px', marginTop: '36px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '2.4rem', fontWeight: 400, color: heroText, lineHeight: 1, letterSpacing: '0.03em' }}>{routes.length}</div>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: heroMuted, marginTop: '4px' }}>Routes Planned</div>
            </div>
          </div>
          <div className="rt-hero-meta" style={{ marginTop: '32px' }}>
            <button onClick={scrollToRoutes} className="rt-hero-cta">
              View Routes ↓
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── SEASON STRIP — the story so far, editorial stat row ── */}
      {!embedded && (
        <div style={{ background: '#EDE8E1', borderBottom: '0.5px solid rgba(0,0,0,0.06)', padding: `26px ${PADX} 22px` }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8a7a5c', marginBottom: '16px' }}>2026 Season — The Story So Far</div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
              {pastRoutes.map((p, i) => (
                <div key={p.name} className="rt-reveal" style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0, animationDelay: `${i * 0.09}s` }}>
                  {i > 0 && <div style={{ width: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '4px 26px' }} />}
                  <div style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '18px', fontWeight: 400, color: '#1a1a1a', lineHeight: 1.2 }}>{p.name}</div>
                    <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT, margin: '4px 0 6px' }}>
                      <CheckIcon /> <span style={{ verticalAlign: '1px' }}>Ran {p.month_label}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', letterSpacing: '0.02em' }}>
                      Target {p.target} cars — <span style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '19px', color: '#45643c', letterSpacing: '0.03em' }}>{p.cars}</span><span style={{ color: '#45643c' }}> rolled out</span>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
                <div style={{ width: '0.5px', background: 'rgba(0,0,0,0.12)', margin: '4px 26px' }} />
                <button onClick={scrollToRoutes} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '18px', fontStyle: 'italic', color: '#8a6535', lineHeight: 1.2 }}>Next up</div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8a7a5c', margin: '4px 0 6px' }}>Gathering crews</div>
                  <div style={{ fontSize: '12px', color: '#555' }}>
                    <span style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '19px', color: '#1a1a1a', letterSpacing: '0.03em' }}>{routes.length}</span> routes open <span style={{ color: '#8a6535' }}>→</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS — accordion on mobile, always open on desktop ── */}
      {!embedded && (
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.07)', padding: isMobileView ? '24px clamp(1.5rem,4vw,3rem)' : '56px clamp(1.5rem,4vw,3rem)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button type="button" onClick={isMobileView ? () => setHowOpen(o => !o) : undefined}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: isMobileView ? 'pointer' : 'default', fontFamily: 'inherit', minHeight: isMobileView ? '44px' : undefined }}>
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, marginBottom: '12px' }}>How It Works</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(1.8rem,3vw,2.4rem)', fontWeight: 300, color: '#1a1a1a', margin: (!isMobileView || howOpen) ? '0 20px 12px 0' : 0 }}>Routes launch when the crew is ready.</h2>
              {(!isMobileView || howOpen) && (
                <p style={{ fontSize: '12px', color: '#999', lineHeight: 1.8, margin: '0 0 32px 0', maxWidth: '680px', fontWeight: 300 }}>
                  This applies to our longer <em>routes</em> — overnight and multi-day drives we plan months out. Shorter day drives are announced only a few weeks before they run: no interest list, first come first served, with priority given to members.
                </p>
              )}
            </div>
            {isMobileView && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"
                style={{ flexShrink: 0, transform: howOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>
          {(!isMobileView || howOpen) && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 0, border: '0.5px solid rgba(0,0,0,0.07)' }}>
                {[
                  ['01', 'Raise Your Hand', "See a road that calls to you? Put your name down. Takes thirty seconds, costs nothing — it just tells us you'd be in the convoy."],
                  ['02', 'The Crew Comes Together', 'Every route needs a certain number of cars to feel right. As more drivers add their names, the bar on each card fills — and when the crew is complete, the route comes to life.'],
                  ['03', 'You Hear From Us First', "The moment your route launches, you'll be the first to know — one email with everything: where we meet, the roads we take, the convoy rules, and how to make your seat official."],
                  ['04', 'Then We Drive', 'Show up, shake hands, roll out. Every route carries its own per-car fee — shaped by the distance, the stops, and the nights away — confirmed in your launch email. The rest is just you, the crew, and the road.'],
                ].map(([num, title, body], i, arr) => (
                  <div key={num} className="rt-reveal" style={{ padding: '32px', borderRight: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none', animationDelay: `${i * 0.08}s` }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '3rem', fontWeight: 300, color: 'rgba(197,168,130,0.3)', lineHeight: 1, marginBottom: '20px' }}>{num}</div>
                    <h3 style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', margin: '0 0 10px 0', letterSpacing: '0.04em' }}>{title}</h3>
                    <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{body}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#bbb', margin: '20px 0 0 0', lineHeight: 1.7, maxWidth: '680px' }}>Per-car fees are set per route based on length, stops, and overnight stays — exact pricing is confirmed in the launch email. Routes that don't reach their threshold by 30 days before the planned date are postponed to a future season.</p>
            </>
          )}
        </div>
      </div>
      )}

      {/* ── MEMBERSHIP NUDGE / MEMBER BADGE ── */}
      {!embedded && (!isMember ? (
        <div style={{ background: '#0F1E14', padding: '13px clamp(1.5rem,4vw,3rem)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.5)', margin: 0, letterSpacing: '0.05em' }}>Members receive priority spots and early launch notifications.</p>
            <a href="/membership" style={{ fontSize: '10px', color: ACCENT, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none', border: '0.5px solid rgba(197,168,130,0.35)', padding: '7px 18px' }}>Apply for Membership →</a>
          </div>
        </div>
      ) : (
        <div style={{ background: '#0F1E14', padding: '10px clamp(1.5rem,4vw,3rem)', borderTop: '0.5px solid rgba(197,168,130,0.1)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '6px', height: '6px', background: ACCENT, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: 'rgba(197,168,130,0.8)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Member Access · Priority Spots Reserved</span>
          </div>
        </div>
      ))}

      {/* ── VIEW TOGGLE ── */}
      <div id="routes-list" style={{ background: embedded ? 'transparent' : '#F5F1EC', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: `20px ${PADX}`, marginTop: embedded ? '0.5rem' : 0, scrollMarginTop: '84px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setView('grid')} className={`rt-pill${view === 'grid' ? ' rt-pill-active' : ''}`}>Grid</button>
          <button onClick={() => setView('map')} className={`rt-pill${view === 'map' ? ' rt-pill-active' : ''}`}>Map</button>
          <div style={{ width: '0.5px', height: '16px', background: 'rgba(0,0,0,0.12)', margin: '0 12px' }} />
          <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em' }}>{myInterestCount} / {routes.length} routes registered</span>
        </div>
      </div>

      {/* ── GRID / MAP ── */}
      {loading ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `clamp(48px,8vw,96px) ${PADX}`, textAlign: 'center', fontSize: '13px', color: '#bbb' }}>Loading routes…</div>
      ) : loadError ? (
        /* API failure — show a retry instead of a silently empty section */
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `clamp(48px,8vw,96px) ${PADX}`, textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
            The routes couldn&apos;t be loaded right now.
          </div>
          <button onClick={() => { setLoading(true); load() }}
            style={{ padding: '0.75rem 2rem', background: '#45643c', border: 'none', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            Try again
          </button>
        </div>
      ) : view === 'grid' ? (
        <div key="grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: `clamp(32px,5vw,56px) ${PADX}`, animation: 'rtFadeIn .3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))', gap: '20px' }}>
            {routes.map((r, i) => {
              const pct = Math.min(100, Math.round((r.interested_count / r.target_count) * 100))
              const slotsLeft = Math.max(0, r.target_count - r.interested_count)
              return (
                <div key={r.id} className="rt-card rt-reveal" style={{ animationDelay: `${(i % 3) * 0.08 + 0.05}s` }}>
                  {/* Image area */}
                  <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', background: ACCENT_BGS[i % ACCENT_BGS.length] }}>
                    <div className="rt-card-img" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
                      {ROUTE_PHOTOS[r.slug] && (
                        <img src={ROUTE_PHOTOS[r.slug]} alt="" className="rt-card-photo"
                          loading={i < 2 ? 'eager' : 'lazy'} decoding="async" />
                      )}
                      {ROUTE_PHOTOS[r.slug] ? (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,30,20,0.35) 0%, rgba(15,30,20,0.05) 45%, rgba(15,30,20,0.45) 100%)' }} />
                      ) : (
                        <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 300, color: 'rgba(245,241,236,0.18)', textAlign: 'center', letterSpacing: '0.06em', lineHeight: 1.2 }}>{r.name}</div>
                      )}
                      <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(15,30,20,0.75)', backdropFilter: 'blur(6px)', padding: '5px 12px', border: '0.5px solid rgba(197,168,130,0.2)' }}>
                        <span style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: ACCENT, fontWeight: 500 }}>{r.month_label}</span>
                      </div>
                      {isMember && (
                        <div style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(15,30,20,0.75)', backdropFilter: 'blur(6px)', padding: '4px 10px', border: '0.5px solid rgba(197,168,130,0.35)' }}>
                          <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, fontWeight: 600 }}>Priority</span>
                        </div>
                      )}
                      <div className={r.interested ? 'rt-pulse-once' : ''} style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(15,30,20,0.75)', backdropFilter: 'blur(6px)', padding: '5px 12px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ fontSize: '9px', color: 'rgba(245,241,236,0.6)', letterSpacing: '0.1em' }}>{r.interested_count} interested</span>
                      </div>
                      {TRIP_LABELS[r.trip_type] && (
                        <div style={{ position: 'absolute', bottom: '14px', right: '14px', background: 'rgba(15,30,20,0.75)', backdropFilter: 'blur(6px)', padding: '5px 12px', border: '0.5px solid rgba(197,168,130,0.35)' }}>
                          <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT, fontWeight: 600 }}>{TRIP_LABELS[r.trip_type]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <h3 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '21px', fontWeight: 300, color: '#1a1a1a', marginBottom: '5px', lineHeight: 1.2 }}>{r.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <PinIcon /><span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.04em' }}>{r.destination}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#777', lineHeight: 1.8, marginBottom: '20px', flex: 1, fontWeight: 300 }}>{r.description}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '0.5px solid rgba(0,0,0,0.06)', marginBottom: '18px' }}>
                      <div style={{ padding: '11px 14px', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ccc', marginBottom: '3px' }}>Duration</div>
                        <div style={{ fontSize: '13px', color: '#333' }}>{r.duration_label}</div>
                      </div>
                      <div style={{ padding: '11px 14px' }}>
                        <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ccc', marginBottom: '3px' }}>Distance</div>
                        <div style={{ fontSize: '13px', color: '#333' }}>{r.distance_label}</div>
                      </div>
                    </div>
                    {r.price_per_car != null && r.price_per_car !== '' ? (
                      <div style={{ fontSize: '12px', color: '#8a6535', marginBottom: '18px', letterSpacing: '0.02em' }}>
                        <span style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '19px', color: '#1a1a1a', letterSpacing: '0.03em' }}>${Number(r.price_per_car).toFixed(Number.isInteger(Number(r.price_per_car)) ? 0 : 2)}</span> per car + tax
                      </div>
                    ) : r.price_range && (
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '18px', letterSpacing: '0.02em' }}>
                        <span style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '19px', color: '#8a6535', letterSpacing: '0.03em' }}>{r.price_range}</span> <span style={{ fontSize: '10px' }}>+ tax · est. for 2 per car — confirmed at launch</span>
                      </div>
                    )}
                    {r.itinerary && (
                      <div style={{ marginBottom: '18px' }}>
                        <button onClick={() => patch(r.id, s => ({ showItinerary: !s.showItinerary }))}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT, display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' }}>
                          {r.showItinerary ? 'Hide itinerary' : 'View itinerary'}
                          <span style={{ display: 'inline-block', transform: r.showItinerary ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>↓</span>
                        </button>
                        {r.showItinerary && <p className="rt-form" style={{ fontSize: '12px', color: '#777', lineHeight: 1.8, marginTop: '10px', whiteSpace: 'pre-wrap', fontWeight: 300 }}>{r.itinerary}</p>}
                      </div>
                    )}
                    {/* Progress */}
                    <div style={{ marginBottom: '18px' }}>
                      <div className="rt-track" style={{ marginBottom: '7px' }}>
                        <div className="rt-fill" style={{ width: animated ? `${pct}%` : '0%' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.06em' }}>{r.interested_count} / {r.target_count}</span>
                        <span style={{ fontSize: '10px', color: ACCENT, letterSpacing: '0.06em' }}>{slotsLeft} spots left</span>
                      </div>
                    </div>
                    {/* CTA */}
                    {r.interested ? (
                      <div className="rt-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(197,168,130,0.06)', border: '0.5px solid rgba(197,168,130,0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <CheckIcon /><span style={{ fontSize: '10px', color: '#7B5B2E', letterSpacing: '0.18em', textTransform: 'uppercase' }}>You're on the list</span>
                        </div>
                        <button onClick={() => shareInterest(r)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: '13px', padding: '8px 10px' }} aria-label="Share">↗</button>
                      </div>
                    ) : r.launched ? (
                      <div style={{ padding: '12px 14px', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B5B2E', textAlign: 'center' }}>Route launched — check your email</div>
                    ) : (
                      <button onClick={() => { patch(r.id, { error: null }); setSheetSuccess(false); setSheetId(r.id) }} className="rt-btn">Express Interest</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Past routes — DB-backed (admin: Routes tab), a distinct section
              below the active grid rather than mixed into it. Toned down
              (greyscale photo, muted colors) so past clearly reads as past
              at a glance. */}
          {pastRoutes.length > 0 && (
          <div style={{ marginTop: 'clamp(48px,7vw,72px)', paddingTop: 'clamp(32px,5vw,48px)', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#999', marginBottom: '24px' }}>Past Routes</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))', gap: '20px' }}>
              {pastRoutes.map((p, i) => (
                <Link key={p.slug} href={p.href} onClick={e => { e.preventDefault(); setRecapRoute(p) }}
                  className="rt-card rt-reveal" style={{ animationDelay: `${(i % 3) * 0.08 + 0.05}s`, textDecoration: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.82 }}>
                  <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9' }}>
                    <img src={p.photo} alt="" className="rt-card-photo" loading="lazy" decoding="async" style={{ filter: 'grayscale(0.65) brightness(0.85)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,30,20,0.35) 0%, rgba(15,30,20,0.15) 45%, rgba(15,30,20,0.6) 100%)' }} />
                    <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(90,90,90,0.85)', padding: '5px 12px' }}>
                      <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F5F1EC', fontWeight: 600 }}>Past Route · {p.month_label}</span>
                    </div>
                  </div>
                  <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '14px' }}>
                      <h3 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '21px', fontWeight: 300, color: '#555', marginBottom: '5px', lineHeight: 1.2 }}>{p.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <PinIcon /><span style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.04em' }}>{p.destination}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#999', lineHeight: 1.8, marginBottom: '20px', flex: 1, fontWeight: 300 }}>{p.description}</p>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '18px', letterSpacing: '0.02em' }}>
                      <span style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '19px', color: '#777', letterSpacing: '0.03em' }}>{p.cars}</span> of {p.target} cars rolled out
                    </div>
                    <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.04)', border: '0.5px solid rgba(0,0,0,0.1)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', textAlign: 'center' }}>View Recap →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          )}
        </div>
      ) : (
        <div key="map" style={{ maxWidth: '1200px', margin: '0 auto', padding: `clamp(32px,5vw,56px) ${PADX}`, animation: 'rtFadeIn .3s ease' }}>
          <div className="rt-map-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
            <RoutesMap routes={routes} selectedId={selectedId} onSelect={setSelectedId} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', marginBottom: '8px', paddingLeft: '4px' }}>All Routes</div>
              {routes.map(r => {
                const pct = Math.min(100, Math.round((r.interested_count / r.target_count) * 100))
                return (
                  <div key={r.id} onClick={() => setSelectedId(r.id)} className={`rt-maprow${selectedId === r.id ? ' rt-maprow-active' : ''}`}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '3px', fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif" }}>{r.name}</div>
                    <div style={{ fontSize: '9px', color: ACCENT, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>{r.month_label}</div>
                    <div className="rt-track"><div className="rt-fill" style={{ width: animated ? `${pct}%` : '0%', animation: 'none', background: ACCENT }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#bbb' }}>{r.interested_count}/{r.target_count}</span>
                      <span style={{ fontSize: '10px', color: '#aaa' }}>{r.destination}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── EXPRESS INTEREST — bottom sheet on mobile, centered dialog on desktop ── */}
      {sheetRoute && (
        <div className="rt-sheet-backdrop" onClick={() => setSheetId(null)}>
          <div className="rt-sheet" onClick={e => e.stopPropagation()}>
            <div className="rt-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, marginBottom: '8px' }}>Express Interest</div>
                <h2 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '24px', fontWeight: 300, color: '#1a1a1a', margin: 0, lineHeight: 1.15 }}>{sheetRoute.name}</h2>
                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{sheetRoute.month_label} · {sheetRoute.destination}</div>
              </div>
              <button onClick={() => setSheetId(null)} aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '20px', lineHeight: 1, padding: '10px', margin: '-10px -10px 0 0', flexShrink: 0 }}>✕</button>
            </div>

            {sheetSuccess && sheetRoute.interested ? (
              /* In-sheet confirmation — closing abruptly on success felt broken
                 when the card was scrolled out of view. */
              <div className="rt-success" style={{ textAlign: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', border: '1px solid rgba(197,168,130,0.5)', background: 'rgba(197,168,130,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg className="rt-check-draw" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '23px', fontWeight: 300, color: '#1a1a1a', marginBottom: '8px' }}>You're on the list.</div>
                <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.75, margin: '0 0 20px', padding: '0 8px' }}>
                  {sheetRoute.interested_count} of {sheetRoute.target_count} drivers in — we'll email you the moment {sheetRoute.name} launches.
                </p>
                <button onClick={() => shareInterest(sheetRoute)} className="rt-btn">Tell your crew ↗</button>
                <button onClick={() => { setSheetId(null); setSheetSuccess(false) }}
                  style={{ display: 'block', width: '100%', marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '12px', minHeight: '44px', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
                  Done
                </button>
              </div>
            ) : isMember && profileMissing.length > 0 ? (
              /* Member with an incomplete profile — finish it first so every
                 registration carries full, reliable info. */
              <div>
                <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.75, margin: '0 0 14px' }}>
                  Almost there — complete your member profile first, and we'll fill your registrations automatically from now on.
                </p>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '14px 16px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#bbb', marginBottom: '8px' }}>Missing from your profile</div>
                  {profileMissing.map(f => (
                    <div key={f} style={{ fontSize: '12px', color: '#93333E', lineHeight: 1.9 }}>• {f} *</div>
                  ))}
                </div>
                <a href="/members/profile" className="rt-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Complete my profile →</a>
                <div style={{ fontSize: '10px', color: '#bbb', textAlign: 'center', marginTop: '10px', lineHeight: 1.6 }}>Takes under a minute — then come back and add your name.</div>
              </div>
            ) : (
            <form onSubmit={e => { e.preventDefault(); submitInterest(sheetRoute) }}>
            <input ref={hpRef} type="text" name="cr_routes_field" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }} />
            <input type="text" name="name" autoComplete="name" placeholder="Your name *" value={sheetRoute.formName} onChange={e => patch(sheetRoute.id, { formName: e.target.value, error: null })} className="rt-input" />
            <input type="email" name="email" inputMode="email" autoComplete="email" placeholder="Your email *" value={sheetRoute.formEmail} onChange={e => patch(sheetRoute.id, { formEmail: e.target.value, error: null })} className="rt-input" />
            {!isMember && emailIsMember && (
              <div style={{ background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.4)', padding: '12px 14px', margin: '2px 0 10px' }}>
                <div style={{ fontSize: '11.5px', color: '#6b5535', lineHeight: 1.7 }}>
                  <strong style={{ color: '#1a1a1a', fontWeight: 500 }}>This email belongs to a Canvas Routes member.</strong> Log in to register instead — your name, phone and car fill in automatically, the registration is tied to your membership, and members get priority when spots are confirmed.
                </div>
                <a href="/members/login?redirect=/members/routes" className="rt-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '12px', marginTop: '10px' }}>Log in to continue →</a>
              </div>
            )}
            <input type="tel" name="phone" inputMode="tel" autoComplete="tel" placeholder="Phone *" value={sheetRoute.formPhone} onChange={e => patch(sheetRoute.id, { formPhone: e.target.value, error: null })} className="rt-input" />
            <input type="text" placeholder="Car — year, make, model *" value={sheetRoute.formCar} onChange={e => patch(sheetRoute.id, { formCar: e.target.value, error: null })} className="rt-input" />

            {/* Trip preferences */}
            <select className="rt-input" value={sheetRoute.formBudget} onChange={e => patch(sheetRoute.id, { formBudget: e.target.value, error: null })}>
              <option value="">Budget per car *</option>
              {budgetsFor(sheetRoute).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input type="text" placeholder="Preferred dates — e.g. any August weekend *" value={sheetRoute.formDates} onChange={e => patch(sheetRoute.id, { formDates: e.target.value, error: null })} className="rt-input" />
            {(sheetRoute.trip_type === 'overnight' || sheetRoute.trip_type === 'multi_day') && (
              <select className="rt-input" value={sheetRoute.formHotel} onChange={e => patch(sheetRoute.id, { formHotel: e.target.value, error: null })}>
                <option value="">Hotel preference *</option>
                {HOTEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            <div style={{ margin: '4px 0 10px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', marginBottom: '7px' }}>Activities you'd want * — pick at least one</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(sheetRoute.activity_options?.length ? sheetRoute.activity_options : ACTIVITY_OPTIONS).map(a => {
                  const on = (sheetRoute.formActivities || []).includes(a)
                  return (
                    <button type="button" key={a}
                      onClick={() => patch(sheetRoute.id, s => ({ formActivities: on ? s.formActivities.filter(x => x !== a) : [...(s.formActivities || []), a] }))}
                      style={{ fontSize: '11px', letterSpacing: '0.03em', padding: '8px 12px', minHeight: '36px', border: `0.5px solid ${on ? ACCENT : 'rgba(0,0,0,0.15)'}`, background: on ? 'rgba(197,168,130,0.12)' : 'transparent', color: on ? '#8a6535' : '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {a}
                    </button>
                  )
                })}
              </div>
            </div>
            <textarea placeholder="Anything else we should know? *" value={sheetRoute.formNotes} onChange={e => patch(sheetRoute.id, { formNotes: e.target.value, error: null })} className="rt-input" style={{ minHeight: '60px', resize: 'vertical' }} maxLength={500} />
            {/* Suppress the 409 duplicate when the live member notice (with its
                own login button) is already showing above */}
            {sheetRoute.error && !(sheetRoute.memberPrompt && emailIsMember) && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#93333E', marginBottom: sheetRoute.memberPrompt ? '10px' : 0 }}>{sheetRoute.error}</div>
                {sheetRoute.memberPrompt && (
                  <a href="/members/login?redirect=/members/routes" className="rt-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '12px' }}>
                    Log in to register →
                  </a>
                )}
              </div>
            )}
            <button type="submit" disabled={sheetRoute.submitting || (!isMember && emailIsMember)} className="rt-btn" style={{ marginTop: '4px' }}>
              {sheetRoute.submitting ? 'Adding you…' : 'Add My Name'}
            </button>
            <div style={{ fontSize: '10px', color: '#bbb', textAlign: 'center', marginTop: '10px', lineHeight: 1.6 }}>No payment, no commitment — just a signal that you're in. Payment details arrive with the full itinerary once the route launches.</div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ── */}
      {shareRoute && (
        <div className="rt-backdrop" onClick={() => setShareRoute(null)}>
          <div className="rt-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, marginBottom: '12px' }}>Share Route</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',var(--font-cormorant),serif", fontSize: '26px', fontWeight: 300, color: '#1a1a1a', marginBottom: '6px' }}>{shareRoute.name}</h2>
            <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '28px', lineHeight: 1.7 }}>Let your crew know you've got your name down for this drive.</p>
            <div style={{ background: '#EDE8E1', padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '24px' }}>
              <p style={{ fontSize: '11px', color: '#666', lineHeight: 1.65, userSelect: 'all', WebkitUserSelect: 'all' }}>{shareText(shareRoute)} canvasroutes.com/routes</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={copyShare} className="rt-btn" style={{ flex: 1, padding: '12px' }}>{copied ? 'Copied ✓' : 'Copy Text'}</button>
              <button onClick={shareTwitter} className="rt-ghost" style={{ flex: 1 }}>Twitter / X</button>
            </div>
            <button onClick={() => setShareRoute(null)} style={{ width: '100%', background: 'transparent', border: 'none', fontFamily: 'inherit', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', padding: '8px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      <PastRouteRecapModal route={recapRoute} onClose={() => setRecapRoute(null)} />

      {/* Breathing room before the site footer (rendered by the page) */}
      {!embedded && <div style={{ height: '80px' }} />}
    </div>
  )
}
