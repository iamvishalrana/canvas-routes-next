'use client'
import { useState, useEffect, useRef } from 'react'
import { ROUTE_PATH } from './routePath'
import { RETURN_ROUTE_PATH } from './returnRoutePath'
import SiteFooter from '../../components/SiteFooter'
import PageLoader from '../../components/PageLoader'
import { captureException } from '../../lib/sentry'
import { normalizeEmail } from '../../lib/normalizeEmail'

const PASSWORD = 'montebello'
const ROUTE_SLUG = 'hello-to-montebello'

// Only real venues so this one array can drive both the itinerary timeline
// and the map markers. Meetup is the McDonald's on the south service road of
// Autoroute 440 in Laval (4610 Desserte Sud Autoroute 440 O, Laval, QC
// H7T 2Z8) — confirmed via https://maps.app.goo.gl/H1MhTqXNUzvxheCq7. Porte
// du Nord is the service area on Autoroute des Laurentides (A-15) reached
// directly from A-440 — confirmed via https://maps.app.goo.gl/frM6FQAgCirv7a359.
// Stop lat/lng are geocoded estimates, NOT independently verified against a
// traced route — confirm/correct the pins before relying on them for real
// navigation. The drawn road path in routePath.js is a routed polyline
// through this same route's waypoints (via OSRM, since Google's own
// turn-by-turn path isn't exposed through a shared link) — it approximates
// the real roads but is not a pixel-perfect copy of Google's route.
const ROUTE_LINK = 'https://maps.app.goo.gl/zpYKNJS6U4jaL7tq9'
const STOPS = [
  { label: "McDonald's — 440 Ouest, Back Parking", note: '9:00 AM · Laval', tag: 'Meetup & Departure', start: true, href: 'https://www.google.com/maps/search/?api=1&query=4610+Desserte+Sud+Autoroute+440+Ouest+Laval+QC', lat: 45.5586062, lng: -73.7921953 },
  { label: 'Porte du Nord', note: 'Saint-Jérôme · Fuel & regroup', href: 'https://maps.app.goo.gl/frM6FQAgCirv7a359', lat: 45.8419779, lng: -74.0682029 },
  { label: "L'Atelier des Deux P", note: 'Amherst · Coffee stop — coffee & snacks on you', href: 'https://www.google.com/maps/search/?api=1&query=270+Rue+Amherst,+Amherst,+QC+J0T+2L0', lat: 46.0105673, lng: -74.7612215 },
  { label: 'Fairmont Le Château Montebello', note: 'Montebello · Lunch at Aux Chantignoles', tag: 'Lunch & self-parking included', feature: true, end: true, href: 'https://www.google.com/maps/search/?api=1&query=392+Rue+Notre-Dame+Montebello+QC', lat: 45.6455317, lng: -74.9494418 },
]

// Drive back — confirmed via https://maps.app.goo.gl/KM6W62YvBBYVHEk59: leaves
// Fairmont, stops at Chocomotive, then A-50 to Route 329 north through
// Morin-Heights (no stop there — it's just a via-point for the drawn path,
// not a marker) before finishing at Porte du Nord again.
const RETURN_ROUTE_LINK = 'https://maps.app.goo.gl/KM6W62YvBBYVHEk59'
const RETURN_STOPS = [
  { label: 'Fairmont Le Château Montebello', note: 'Montebello · Depart after lunch', tag: 'Departure', start: true, href: 'https://www.google.com/maps/search/?api=1&query=392+Rue+Notre-Dame+Montebello+QC', lat: 45.6455317, lng: -74.9494418 },
  { label: 'Chocomotive', note: 'Montebello · Chocolate stop', href: 'https://www.google.com/maps/search/?api=1&query=502+Rue+Notre-Dame+Montebello+QC', lat: 45.6498295, lng: -74.9425688 },
  { label: 'Porte du Nord', note: 'Saint-Jérôme · Final regroup', tag: 'See Off Point', end: true, href: 'https://maps.app.goo.gl/frM6FQAgCirv7a359', lat: 45.8419779, lng: -74.0682029 },
]

// Jerry's entry stays manual (lead car + fact blurb) — everyone else is
// fetched live from /api/hello-to-montebello/roster, which reflects paid
// registrants automatically (added on capture, removed on refund/cancel).
const MANUAL_PARTICIPANTS = [
  { name: 'Jerry', car: '2021 BMW 3 Series', photo: '/car-jerry.jpeg', lead: true, group: null, fact: 'Perfect balance front to back, every option added — this is exactly how this car was meant to be built.' },
]

// Editorial car facts for specific live (roster-fetched) participants, shown
// in the same click-to-reveal modal as Jerry's — matched onto the roster by
// exact name. Nothing derived from the DB; add an entry here as we learn
// something worth mentioning about someone's car. Keep the words simple —
// not everyone reading this speaks English as a first language — but give it
// some life: vivid, exciting, a little fun. Not just sound — a rare or
// impressive fact about the car works too. No comparing one car or brand to
// another.
const CAR_FACTS = {
  'Karim Abdul Baki': 'This little engine just wants to scream. Push it past 7,000 RPM and it turns into a sharp, angry howl — and the car dances through corners like it was made for them.',
  'Joseph Dizazzo': 'The engine sits right behind your head instead of up front like most cars — so every bit of power feels like it explodes right next to you. Blistering speed, and every downshift cracks like a whip.',
  'Dany Bossé': 'Only two of these exist anywhere in the world in this exact shade — Phoenix Yellow. Push past 5,000 RPM and the flat-six wakes up into a wild howl that keeps climbing all the way to redline.',
  'Frederic Lefebvre': 'Five cylinders instead of the usual four or six, and it sounds like nothing else on the road. Snap, crackle, and pop on every lift off the gas, then a hard launch that shoves you back in your seat.',
  'Jean-Francois Rouette': "A five-cylinder engine tuned to Stage 2, pushing 554 horsepower and hitting 100 km/h in just 3.3 seconds — with a wild, uneven growl that only gets angrier the harder you push it.",
  'Michel Robert': 'The engine lives right behind the seats. Drop the roof and that flat-six sound wraps all the way around you. Balanced, playful, and built for exactly this kind of drive.',
  'Julien Fernandez': <>A <span style={{ textDecoration: 'line-through', textDecorationThickness: '1px', opacity: 0.55 }}>flat-six</span> <span style={{ fontWeight: 700 }}>6FLAT</span> that loves to rev high, with steering so direct it feels like the road is talking straight to your hands.</>,
  'Martin Griffin': "This V8 — nicknamed the Voodoo — has a special flat-plane crank inside, the same trick used in high-revving race engines, letting it scream all the way to 8,250 RPM, one of the highest redlines any V8 has ever had. Near the top, it turns sharp and wild, a sound no ordinary V8 can make.",
  'Alexandre Boutin': 'Looks like a calm family wagon, but hides two turbos and a monster V8 underneath. Dead quiet at idle, then it launches like it was shot out of a cannon.',
  'Elie Massuda': "Same trick as Michel's car — a flat-six engine right behind the seats. Small, light, and an absolute blast on winding backroads with the top down.",
  'Manon Cronier': 'A calm, quiet cruiser that eats up highway kilometres without breaking a sweat — smooth power and a relaxed ride the whole way there.',
  'Aleks Sahakian': 'A Fox-body drop-top with an old-school V8 and a deep, rumbling idle — no computers, no filters, just raw mechanical muscle from a different era, top down.',
  'Martin Boisvert': 'Small, light, and built purely for fun — a turbocharged inline-six sending power to the rear wheels only. One of the most exciting driver\'s cars BMW has ever made, built to be thrown into corners hard.',
  'Yvon Maggi': 'One of the fastest 911s ever built at the time — twin turbos, all-wheel drive, and launch control that slams you back into your seat. 0 to 100 km/h in under 3 seconds, gone before you can blink.',
  'Nicholas Talarico': 'A screaming V12 with no turbos at all — something you almost never see anymore. It revs to nearly 8,500 RPM and is loud enough to turn heads from blocks away. One of the last pure, naturally-aspirated Lamborghini V12s ever built — raw fury, no filter.',
  'Alain Sahakian': "Boost builds so smoothly here you'd barely notice the turbo at all — until a wall of torque shows up in the midrange and just keeps shoving, all the way to redline.",
}

const DRIVE_BULLETS = [
  { emoji: '🛣️', text: "We meet at 9:00 AM at McDonald's in Laval, then regroup at Porte du Nord in Saint-Jérôme before leaving the highway behind and heading east into the countryside." },
  { emoji: '☕', text: "A coffee stop at L'Atelier des Deux P in Amherst breaks up the drive before the backroads open up on the approach to the Outaouais." },
  { emoji: '🏰', text: "Lunch at Aux Chantignoles, inside Fairmont Le Château Montebello — the largest log château in the world, right on the Ottawa River. Cars self-park together in a display area out front for the afternoon. Enjoy a three-course lunch, with parking covered by Canvas Routes. Gourmet coffee and Lot 35 tea are included — any other beverages, including alcohol, can be purchased directly from the venue at your own cost." },
  { emoji: '🍫', text: 'A stroll around Montebello before the drive home — the convoy stops together at Chocomotive, an artisan chocolate workshop in the old train station. Also worth a look nearby: the Lieu historique national du Manoir-Papineau.' },
  { emoji: '🏁', text: 'From Chocomotive, the convoy drives back together — A-50 then Route 329 north through Morin-Heights — to Porte du Nord for one last regroup before everyone heads home.' },
]

const CONVOY_RULES = [
  'Follow the lead car at all times — do not overtake any car in the convoy.',
  "Maintain a safe following distance. Stay close enough to keep the group together, not so close that you can't react.",
  'Obey all traffic laws. Speed limits, signals, and road signs apply regardless of group pace.',
  'If you get separated, do not panic — proceed to the next stop on the route and wait.',
  'Do not race, push, or drive aggressively. This is a scenic drive, not a track day.',
  'If you need to stop urgently, hazard lights on immediately. The car behind will relay the signal forward.',
  'Fuel up before departure — options are limited once we leave the highway.',
  'Respect the roads and the communities we pass through.',
]

const SECTION_LABEL = { fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', display: 'block', fontWeight: '400', fontStyle: 'normal' }

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    if (!navigator?.clipboard?.writeText) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <button onClick={copy} style={{ background: 'none', border: 'none', padding: '10px 0', margin: '-8px 0 -2px', cursor: 'pointer', fontSize: '10px', color: copied ? '#3B6B2F' : '#bbb', letterSpacing: '0.06em', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {copied ? '✓ Copied' : (
        <>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5.5" y="5.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.5 10.5H2.5C1.94772 10.5 1.5 10.0523 1.5 9.5V2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H9.5C10.0523 1.5 10.5 1.94772 10.5 2.5V3.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          Copy number
        </>
      )}
    </button>
  )
}

// Extracted so the "Who's Coming" section can render either one flat grid or
// one grid per convoy group without duplicating the card markup.
function CarGrid({ cars, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
      {cars.map((p, i) => (
        <div key={`${p.name}-${i}`} className="car-wrap">
          <button type="button" onClick={() => onSelect(p)}
            className="car-card"
            aria-label={`${p.name} — ${p.car}`}
            style={{ background: '#fff', border: 'none', padding: '0', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.09)', width: '100%' }}>
            <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#e8e4de', position: 'relative' }}>
              {p.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo} alt={`${p.name}'s ${p.car}`} className="car-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span aria-hidden="true" style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.22)', letterSpacing: '0.04em' }}>
                    {p.name.split(' ').map(w => w[0]).join('')}
                  </span>
                </div>
              )}
            </div>
            <div style={{ padding: '0.6rem 0.75rem 0.75rem' }}>
              {p.lead && (
                <p style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', margin: '0 0 3px' }}>Lead Car</p>
              )}
              <p style={{ fontSize: '12px', color: '#1a1a1a', letterSpacing: '0.01em', margin: 0 }}>{p.name}</p>
              {p.car && <p style={{ fontSize: '11px', color: '#999', marginTop: '2px', marginBottom: 0 }}>{p.car}</p>}
            </div>
          </button>
        </div>
      ))}
    </div>
  )
}

function ModalImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#e8e4de', flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={alt}
        loading="eager" decoding="sync"
        onLoad={() => setLoaded(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
      />
    </div>
  )
}

function RouteMap({ stops, path = ROUTE_PATH }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const boundsRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) { setStatus('error'); return }

    let destroyed = false

    const initMap = () => {
      if (destroyed || !containerRef.current || mapRef.current) return
      try {
        const google = window.google
        if (!google?.maps) { setStatus('error'); return }

        const bounds = new google.maps.LatLngBounds()
        stops.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }))
        boundsRef.current = bounds

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
        map.fitBounds(bounds, 40)
        mapRef.current = map

        // Only flag the map as "moved" (to show the recenter button) once the
        // initial fitBounds has settled — fitBounds itself fires drag/zoom-like
        // events that would otherwise show the button immediately on load.
        let settled = false
        google.maps.event.addListenerOnce(map, 'idle', () => { settled = true })
        map.addListener('dragstart', () => { if (settled) setMoved(true) })
        map.addListener('zoom_changed', () => { if (settled) setMoved(true) })

        new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#0F1E14',
          strokeOpacity: 0.75,
          strokeWeight: 3,
          map,
        })

        stops.forEach(stop => {
          const color = stop.start ? '#3B6B2F' : stop.end ? '#0F1E14' : '#c5a882'
          const marker = new google.maps.Marker({
            position: { lat: stop.lat, lng: stop.lng },
            map,
            title: stop.label,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: stop.start || stop.end ? 9 : 7,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          })
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="font-family:sans-serif;padding:2px 4px"><strong style="font-size:13px">${stop.label}</strong><br/><span style="color:#888;font-size:11px">${stop.note}</span></div>`,
          })
          marker.addListener('click', () => infoWindow.open(map, marker))
        })

        if (!destroyed) setStatus('ready')
      } catch (e) {
        if (!destroyed) { setErrorMsg(String(e)); setStatus('error') }
      }
    }

    window.gm_authFailure = () => {
      if (!destroyed) { setErrorMsg('Auth failure — key invalid or domain not allowed'); setStatus('error') }
    }

    const scriptId = 'gmap-script'
    if (window.google?.maps) {
      initMap()
    } else if (document.getElementById(scriptId)) {
      const existing = document.getElementById(scriptId)
      if (existing.dataset.error) {
        if (!destroyed) { setErrorMsg('Script failed to load previously'); setStatus('error') }
      } else {
        existing.addEventListener('load', initMap)
        existing.addEventListener('error', () => { if (!destroyed) setStatus('error') })
      }
    } else {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
      script.async = true
      script.onload = initMap
      script.onerror = () => {
        script.dataset.error = '1'
        if (!destroyed) { setErrorMsg('Script failed to load'); setStatus('error') }
      }
      document.head.appendChild(script)
    }

    return () => {
      destroyed = true
      if (mapRef.current) { mapRef.current = null }
    }
  }, [stops, path])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', opacity: status === 'ready' ? 1 : 0 }} />
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8' }}>
          <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Loading map…</span>
        </div>
      )}
      {status === 'ready' && moved && (
        <button
          onClick={() => {
            if (mapRef.current && boundsRef.current) {
              mapRef.current.fitBounds(boundsRef.current, 40)
              setMoved(false)
            }
          }}
          style={{
            position: 'absolute', top: '10px', right: '10px', zIndex: 2,
            display: 'flex', alignItems: 'center', gap: '5px', minHeight: '36px',
            background: '#0F1E14', color: '#F5F1EC', border: 'none', padding: '0 0.85rem',
            fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '600',
            cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          ⟲ Recenter
        </button>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0ede8', gap: '0.75rem', padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Map unavailable</span>
          {errorMsg && <span style={{ fontSize: '10px', color: '#c0392b', maxWidth: '280px', lineHeight: '1.5' }}>{errorMsg}</span>}
        </div>
      )}
    </div>
  )
}

export default function HelloToMontebelloItineraryPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const [checked, setChecked] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)
  const [atBottom, setAtBottom] = useState(false)
  const [bannerHeight, setBannerHeight] = useState(0)
  const [fetchedParticipants, setFetchedParticipants] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [mapView, setMapView] = useState('to')

  useEffect(() => {
    const MEETUP = new Date('2026-08-01T13:00:00Z') // 9 AM Montreal (EDT)
    function tick() {
      const diff = MEETUP - new Date()
      if (diff <= 0) { setCountdown(null); return }
      setCountdown({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // CookieBanner.jsx shows for any first-time visitor and sits at z-index
  // 1000 across the full width, covering this page's own bottom-right
  // scroll-down button (z-index 50) underneath it. It signals its own
  // height by setting body.style.paddingBottom — read that instead of
  // duplicating its visibility logic, and shift the button up by it.
  useEffect(() => {
    function syncBannerHeight() {
      const px = parseFloat(document.body.style.paddingBottom) || 0
      setBannerHeight(px)
    }
    syncBannerHeight()
    const mo = new MutationObserver(syncBannerHeight)
    mo.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    if (!authed) return
    fetch('/api/hello-to-montebello/roster')
      .then(r => r.ok ? r.json() : { participants: [] })
      .then(d => setFetchedParticipants(Array.isArray(d.participants) ? d.participants : []))
      .catch(() => {})
  }, [authed])

  // Jerry is now a real registrant (see lib/jerryRegistrant.js) so he comes
  // back from the roster fetch too — his richer hardcoded entry above (lead
  // flag, fact blurb, fixed photo) is what's actually shown, so drop the
  // fetched duplicate rather than listing him twice.
  const allParticipants = [
    ...MANUAL_PARTICIPANTS,
    ...fetchedParticipants
      .filter(p => p.name !== 'Jerry')
      .map(p => CAR_FACTS[p.name] ? { ...p, fact: CAR_FACTS[p.name] } : p),
  ]
  const groupNumbers = [...new Set(allParticipants.map(p => p.group).filter(g => g != null))].sort((a, b) => a - b)
  const ungrouped = allParticipants.filter(p => p.group == null)

  useEffect(() => {
    function onScroll() {
      setAtBottom(window.innerHeight + window.scrollY >= document.body.scrollHeight - 80)
    }
    onScroll() // page may already be shorter than the viewport
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    // The roster (fetched async, after the password gate) can add a whole
    // "Who's Coming" section below the fold without any window resize event
    // — that left atBottom stuck true from before the roster loaded, hiding
    // the scroll-down button even with the new section still below it.
    const ro = new ResizeObserver(onScroll)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    const els = document.querySelectorAll('.scroll-reveal')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.06 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [authed])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlPw = params.get('pw')
    if (urlPw?.trim().toLowerCase() === PASSWORD.toLowerCase()) { setAuthed(true); setChecked(true); return }
    if (localStorage.getItem('htm_itinerary_auth') === '1') { setAuthed(true); setChecked(true); return }
    setChecked(true)

    // Handoff from the check-in page's personalized link — re-verify
    // automatically so they don't have to retype the email they just used.
    const urlEmail = params.get('email')
    if (urlEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(urlEmail)) {
      setEmail(urlEmail)
      submit(null, urlEmail)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit(e, emailOverride) {
    e?.preventDefault()
    setErrMsg(null)
    const entered = normalizeEmail(emailOverride ?? email)
    if (entered === PASSWORD.toLowerCase()) {
      localStorage.setItem('htm_itinerary_auth', '1')
      setAuthed(true)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entered)) {
      setErrMsg('Please enter a valid email address.')
      return
    }
    setChecking(true)
    try {
      const idRes = await fetch(`/api/route-event-id/${ROUTE_SLUG}`)
      const idData = await idRes.json().catch(() => ({}))
      if (!idRes.ok || !idData.eventId) throw new Error('route-event-id lookup failed')

      const res = await fetch(`/api/checkin/${idData.eventId}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: entered }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 404) {
          setErrMsg("We couldn't find a registration matching that email.")
        } else {
          setErrMsg(data.error || 'Something went wrong. Please try again.')
          captureException(new Error(`htm-itinerary-gate lookup failed: HTTP ${res.status}`), { context: 'htm-itinerary-gate-lookup', status: res.status, serverError: data.error })
        }
        setChecking(false)
        return
      }

      const passengersList = data.tripDetails?.passengers_list || []
      const sections = data.sections || []
      const hasTrip = sections.includes('trip_details')
      const hasWaiver = sections.includes('waiver')
      const hasLunch = sections.includes('lunch')
      const allDone = (!hasTrip || !!data.tripDetails) && (!hasWaiver || !!data.waiver)
        && (!hasLunch || (data.lunch?.length > 0 && data.lunch.length === passengersList.length))

      if (allDone) {
        localStorage.setItem('htm_itinerary_auth', '1')
        setAuthed(true)
      } else {
        window.location.href = `/checkin/${idData.eventId}?email=${encodeURIComponent(entered)}`
      }
    } catch (err) {
      captureException(err, { context: 'htm-itinerary-gate-lookup-network' })
      setErrMsg('Something went wrong. Please try again.')
      setChecking(false)
    }
  }

  if (!checked) return null

  if (!authed) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
        backgroundColor: '#0F1E14',
        backgroundImage: 'url(/montebello-itinerary.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 40%',
        fontFamily: 'sans-serif', padding: 'clamp(2rem,6vw,4rem) 1.25rem',
      }}>
        <style>{`
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          input { -webkit-appearance: none; appearance: none; border-radius: 0; }
          @keyframes gate-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes gate-fade-in { from { opacity: 0; } to { opacity: 1; } }
          .gate-eyebrow { animation: gate-fade-in 0.7s ease both; animation-delay: 100ms; }
          .gate-logo    { animation: gate-fade-in 0.7s ease both; animation-delay: 200ms; }
          .gate-title   { animation: gate-fade-up 0.8s ease both; animation-delay: 320ms; }
          .gate-date    { animation: gate-fade-in 0.6s ease both; animation-delay: 480ms; }
          .gate-tags    { animation: gate-fade-in 0.6s ease both; animation-delay: 600ms; }
          .gate-divider { animation: gate-fade-in 0.5s ease both; animation-delay: 700ms; }
          .gate-body    { animation: gate-fade-up 0.7s ease both; animation-delay: 800ms; }
          .gate-form    { animation: gate-fade-up 0.7s ease both; animation-delay: 950ms; }
          .gate-input:focus { border-color: rgba(197,168,130,0.65) !important; background: rgba(255,255,255,0.08) !important; }
          .gate-submit-btn:active { transform: scale(0.99); }
          @media (max-width: 480px) { .gate-card { padding: 2.25rem 1.5rem !important; } }
        `}</style>

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(6,14,9,0.87) 0%, rgba(15,30,20,0.93) 55%, rgba(10,20,13,0.97) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)' }} />

        <div className="gate-card" style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', textAlign: 'center',
          padding: '3rem 2.5rem', background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(197,168,130,0.22)',
        }}>
          <div className="gate-eyebrow" style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.65)', marginBottom: '1.5rem' }}>
            Canvas Routes
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" className="gate-logo" style={{ width: '120px', margin: '0 auto 1.75rem', display: 'block', opacity: 0.92 }} />
          <h1 className="gate-title" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#F5F1EC', fontSize: 'clamp(1.5rem,5.5vw,2.1rem)', fontWeight: '400', lineHeight: '1.2', margin: '0 0 0.85rem' }}>
            Hello to Montebello
          </h1>
          <div className="gate-date" style={{ display: 'inline-block', padding: '0.4rem 1.1rem', border: '1px solid rgba(197,168,130,0.5)', background: 'rgba(197,168,130,0.09)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F5F1EC', marginBottom: '1.5rem' }}>
            Saturday · August 1, 2026
          </div>
          <div className="gate-tags" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.75rem' }}>
            {['Scenic Backroads', '~300km Drive', 'Château Lunch'].map(tag => (
              <span key={tag} style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.5)', border: '0.5px solid rgba(197,168,130,0.25)', padding: '3px 9px' }}>{tag}</span>
            ))}
          </div>
          <div className="gate-divider" style={{ width: '34px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.75rem' }} />
          <div className="gate-body">
            <p style={{ color: 'rgba(197,168,130,0.65)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', margin: '0 0 0.85rem' }}>Participants only</p>
            <p style={{ color: 'rgba(245,241,236,0.55)', fontSize: '12.5px', lineHeight: '1.7', margin: '0 0 1.75rem' }}>Enter the email address you registered with.</p>
          </div>
          <form onSubmit={submit} className="gate-form">
            <div style={{ marginBottom: '0.85rem' }}>
              <input
                className="gate-input"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrMsg(null) }}
                placeholder="Email"
                type="text"
                inputMode="email"
                autoComplete="email"
                style={{
                  display: 'block', width: '100%', padding: '0.95rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: `0.5px solid ${errMsg ? '#c0526a' : 'rgba(255,255,255,0.16)'}`,
                  color: '#F5F1EC', fontSize: '16px', outline: 'none',
                  fontFamily: 'Georgia, serif', textAlign: 'center', letterSpacing: '0.02em',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
              />
            </div>
            {errMsg && <p style={{ color: '#e2919f', fontSize: '11px', letterSpacing: '0.04em', lineHeight: '1.6', marginBottom: '0.85rem' }}>{errMsg}</p>}
            <button
              type="submit"
              disabled={checking}
              className="gate-submit-btn"
              style={{ width: '100%', padding: '0.95rem', background: '#c5a882', color: '#0F1E14', border: 'none', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: checking ? 'wait' : 'pointer', fontFamily: 'sans-serif', fontWeight: '700', opacity: checking ? 0.7 : 1, transition: 'opacity 0.2s ease' }}
            >
              {checking ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F1EC', fontFamily: 'sans-serif', color: '#1a1a1a' }}>
      <PageLoader images={['/montebello-itinerary.jpg', ...allParticipants.filter(p => p.photo).map(p => p.photo)]} minMs={2000} />

      {/* Scroll indicator */}
      <button
        className="scroll-btn"
        style={{ opacity: atBottom ? 0 : 1, pointerEvents: atBottom ? 'none' : 'auto', bottom: `calc(1.75rem + ${bannerHeight}px + env(safe-area-inset-bottom))`, right: `calc(1.25rem + env(safe-area-inset-right))` }}
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })}
        aria-label="Scroll down"
      >
        <span style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', fontFamily: 'sans-serif' }}>scroll</span>
        <svg className="scroll-chevron" width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 1.5L8 8.5L15 1.5" stroke="#c5a882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button, a { touch-action: manipulation; }
        input { -webkit-appearance: none; appearance: none; border-radius: 0; }

        .map-wrap { height: 320px; }
        @media (min-width: 640px) { .map-wrap { height: 480px; } }

        .scroll-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .scroll-reveal.revealed { opacity: 1; transform: translateY(0); }
        /* Per-stop stagger inside the timeline — children fade in sequence once
           the section reveals (inline transitionDelay sets the cascade) */
        .scroll-reveal .itin-stop { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .scroll-reveal.revealed .itin-stop { opacity: 1; transform: translateY(0); }

        .car-wrap { animation: car-nudge 10s ease-in-out infinite; }
        .car-wrap:focus-within { animation-play-state: paused; }
        @media (hover: hover) { .car-wrap:hover { animation-play-state: paused; } }
        .car-card { transition: box-shadow 0.2s ease; }
        .car-card:active { box-shadow: 0 10px 28px rgba(0,0,0,0.14) !important; }
        @media (hover: hover) { .car-card:hover { box-shadow: 0 10px 28px rgba(0,0,0,0.14) !important; } }
        .car-card .car-img { transition: transform 0.3s ease; }
        .car-card:active .car-img { transform: scale(1.04); }
        @media (hover: hover) { .car-card:hover .car-img { transform: scale(1.04); } }
        @keyframes car-nudge {
          0%, 90%, 100% { transform: translateY(0) rotate(0deg); }
          92% { transform: translateY(-3px) rotate(-1.2deg); }
          94% { transform: translateY(1px) rotate(1deg); }
          96% { transform: translateY(-2px) rotate(-0.6deg); }
          98% { transform: translateY(0) rotate(0deg); }
        }

        .scroll-btn { position: fixed; right: 1.25rem; bottom: 1.75rem; z-index: 1001; display: flex; flex-direction: column; align-items: center; gap: 6px; background: #0F1E14; border: none; padding: 0.75rem 0.9rem 0.65rem; cursor: pointer; transition: opacity 0.4s ease, box-shadow 0.2s ease, bottom 0.2s ease; box-shadow: 0 4px 18px rgba(0,0,0,0.22); pointer-events: auto; }
        @media (hover: hover) { .scroll-btn:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.35); } }
        @keyframes bounce-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        .scroll-chevron { animation: bounce-down 1.6s ease-in-out infinite; }

        @media (max-width: 480px) {
          .quick-info-item { border-right: none !important; margin-right: 0 !important; border-bottom: 0.5px solid rgba(0,0,0,0.08); padding-right: 0 !important; }
          .quick-info-item:last-child { border-bottom: none; }
        }

        /* Header entrance — staggered fade-in the moment the itinerary unlocks */
        @keyframes itin-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes itin-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .itin-hero-logo      { animation: itin-fade-in 0.7s ease both; animation-delay: 100ms; }
        .itin-hero-title     { animation: itin-fade-up 0.8s ease both; animation-delay: 220ms; }
        .itin-hero-date      { animation: itin-fade-in 0.6s ease both; animation-delay: 380ms; }
        .itin-hero-tags      { animation: itin-fade-in 0.6s ease both; animation-delay: 500ms; }
        .itin-hero-countdown { animation: itin-fade-up 0.7s ease both; animation-delay: 620ms; }
        .itin-quick-info     { animation: itin-fade-up 0.7s ease both; animation-delay: 740ms; }

        /* Countdown digits — a quiet pulse each time a second ticks over */
        @keyframes itin-tick { 0% { transform: scale(1.12); } 100% { transform: scale(1); } }
        .itin-countdown-num { display: inline-block; animation: itin-tick 0.4s ease-out; }

        /* Quick info cards — gentle lift on tap/hover so they don't feel inert */
        .quick-info-item { transition: transform 0.15s ease; }
        @media (hover: hover) {
          .quick-info-item:hover { transform: translateY(-2px); }
        }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'relative', padding: '3.5rem 1.25rem 3rem', textAlign: 'center',
        backgroundImage: 'url(/montebello-itinerary.jpg)', backgroundSize: 'cover', backgroundPosition: 'center',
        overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(15,30,20,0.88) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" className="itin-hero-logo" style={{ width: '210px', display: 'block', margin: '0 auto 1.5rem' }} />
          <h1 className="itin-hero-title" style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '28px', letterSpacing: '0.01em', lineHeight: '1.2', margin: 0, fontWeight: '400' }}>Hello to Montebello</h1>
          <p className="itin-hero-date" style={{ color: 'rgba(245,241,236,0.6)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '0.6rem', marginBottom: 0 }}>Saturday · August 1, 2026</p>
          <div className="itin-hero-tags" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}>
            {['Scenic Backroads', '~300km Drive', 'Château Lunch'].map(tag => (
              <span key={tag} style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '4px 12px' }}>{tag}</span>
            ))}
          </div>

          {countdown && (
            <div className="itin-hero-countdown" style={{ display: 'inline-flex', gap: 0, marginTop: '1.75rem', border: '0.5px solid rgba(197,168,130,0.25)', overflow: 'hidden' }}>
              {[
                { label: 'Days', val: countdown.d },
                { label: 'Hrs', val: countdown.h },
                { label: 'Min', val: countdown.m },
                { label: 'Sec', val: countdown.s },
              ].map(({ label, val }, i, arr) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.55rem 0.9rem', borderRight: i < arr.length - 1 ? '0.5px solid rgba(197,168,130,0.15)' : 'none', minWidth: '54px' }}>
                  <div key={val} className="itin-countdown-num" style={{ fontFamily: 'var(--font-bebas),sans-serif', fontSize: '1.8rem', fontWeight: '400', color: '#F5F1EC', lineHeight: 1, letterSpacing: '0.05em' }}>{String(val).padStart(2, '0')}</div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.65)', marginTop: '3px' }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '740px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>

        {/* Quick info */}
        <div className="itin-quick-info" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div className="quick-info-item" style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 140px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem' }}>
              <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>Meetup</h2>
              <p style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4', margin: 0 }}>McDonald's — 440 Ouest, Back Parking</p>
              <p style={{ fontSize: '11px', color: '#bbb', marginTop: '3px', marginBottom: 0 }}>9:00 AM · Laval, QC</p>
            </div>
            <div className="quick-info-item" style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 160px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem', borderTop: '2px solid #93333E' }}>
              <h2 style={{ ...SECTION_LABEL, color: '#93333E', marginBottom: '5px', fontWeight: '600' }}>Contact</h2>
              <a href="tel:5144373437" style={{ fontSize: '14px', color: '#93333E', textDecoration: 'none', lineHeight: '1.4', display: 'block', fontWeight: '700', letterSpacing: '0.01em' }}>
                Jerry — 514-437-3437
              </a>
              <CopyButton text="514-437-3437" />
            </div>
            <div className="quick-info-item" style={{ padding: '1.1rem 0', flex: '1 1 130px' }}>
              <h2 style={{ ...SECTION_LABEL, marginBottom: '3px' }}>Convoy App</h2>
              <p style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '700', letterSpacing: '0.01em', margin: '0 0 5px' }}>Velox</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="https://apps.apple.com/ca/app/velox-drive-convoy-explore/id6754770506"
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: '13px', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: '1.4', fontWeight: '700' }}
                >
                  iOS →
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.jaamways.velox"
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: '13px', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: '1.4', fontWeight: '700' }}
                >
                  Android →
                </a>
              </div>
              <p style={{ fontSize: '10px', color: '#bbb', marginTop: '3px', lineHeight: '1.5', marginBottom: 0 }}>See the whole convoy live on the map and never lose the group — download it now, before August 1.</p>
            </div>
          </div>
        </div>

        {/* Convoy Rules */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <button
            onClick={() => setRulesOpen(o => !o)}
            aria-expanded={rulesOpen}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <h2 style={{ ...SECTION_LABEL, margin: 0 }}>Convoy Rules</h2>
            <span aria-hidden="true" style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em' }}>{rulesOpen ? '▲ Close' : '▼ Read'}</span>
          </button>
          {rulesOpen && (
            <ol style={{ margin: '1.25rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {CONVOY_RULES.map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ color: '#c5a882', fontSize: '11px', fontWeight: '600', flexShrink: 0, paddingTop: '2px' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: '13px', color: '#444', lineHeight: '1.6' }}>{rule}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Itinerary */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>Itinerary</h2>
            <p style={{ fontSize: '10px', color: '#bbb', fontStyle: 'italic', margin: 0 }}>Tap a stop to open in Maps</p>
          </div>
          {STOPS.map((stop, i) => (
            <div key={i} className="itin-stop" style={{ display: 'flex', alignItems: 'stretch', gap: '1rem', transitionDelay: `${0.15 + i * 0.09}s`, background: stop.feature ? 'rgba(197,168,130,0.08)' : 'transparent', margin: stop.feature ? '0 -1.25rem' : 0, padding: stop.feature ? '0.5rem 1.25rem' : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '14px' }}>
                <div style={{
                  width: stop.start || stop.end || stop.feature ? '10px' : '8px',
                  height: stop.start || stop.end || stop.feature ? '10px' : '8px',
                  borderRadius: stop.start || stop.end ? '0' : '50%',
                  background: stop.start ? '#3B6B2F' : stop.end ? '#0F1E14' : stop.feature ? '#c5a882' : 'rgba(0,0,0,0.22)',
                  marginTop: '5px', flexShrink: 0,
                }} />
                {i < STOPS.length - 1 && (
                  <div style={{ width: '1px', flexGrow: 1, minHeight: '44px', background: 'rgba(0,0,0,0.1)', marginTop: '4px' }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: stop.tag ? '10px' : '10px', paddingTop: stop.feature ? '10px' : 0 }}>
                {stop.href ? (
                  <a
                    href={stop.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: stop.feature ? '17px' : '15px', color: '#1a1a1a',
                      fontWeight: stop.start || stop.end || stop.feature ? '600' : '400',
                      lineHeight: '1.35', textDecoration: 'underline',
                      textUnderlineOffset: '3px', textDecorationColor: 'rgba(0,0,0,0.22)',
                      display: 'block',
                    }}
                  >
                    {stop.label}
                  </a>
                ) : (
                  <div style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '400', lineHeight: '1.35' }}>{stop.label}</div>
                )}
                <p style={{ fontSize: '12px', color: '#999', marginTop: '2px', marginBottom: '5px' }}>
                  {stop.note}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {stop.tag && (
                    <div style={{ display: 'inline-block', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.4)', padding: '2px 8px' }}>
                      {stop.tag}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* The Drive */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>The Drive</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {DRIVE_BULLETS.map(({ emoji, text }, i) => (
              <li key={i} className="itin-stop" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', transitionDelay: `${0.12 + i * 0.08}s` }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{emoji}</span>
                <span style={{ fontSize: '14px', color: '#444', lineHeight: '1.75' }}>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Who's Coming */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>Who&apos;s Coming — {allParticipants.length} Car{allParticipants.length !== 1 ? 's' : ''}</h2>
          <p style={{ fontSize: '13px', color: '#0F1E14', fontWeight: '700', letterSpacing: '0.02em', margin: '0 0 1.25rem' }}>👆 Tap a photo to learn more about the car</p>
          {groupNumbers.length > 0 ? (
            <>
              {groupNumbers.map(g => (
                <div key={g} style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c5a882', margin: '0 0 0.75rem' }}>Group {g}</p>
                  <CarGrid cars={allParticipants.filter(p => p.group === g)} onSelect={setSelectedCar} />
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', margin: '0 0 0.75rem' }}>Ungrouped</p>
                  <CarGrid cars={ungrouped} onSelect={setSelectedCar} />
                </div>
              )}
            </>
          ) : (
            <CarGrid cars={allParticipants} onSelect={setSelectedCar} />
          )}
        </section>

        {/* Map */}
        <section className="scroll-reveal" style={{ padding: '2rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <h2 style={{ ...SECTION_LABEL, marginBottom: 0 }}>Map</h2>
            <a
              href={mapView === 'to' ? ROUTE_LINK : RETURN_ROUTE_LINK}
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', padding: '6px 0', margin: '-6px 0', fontSize: '11px', letterSpacing: '0.06em', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: '600' }}
            >
              Open {mapView === 'to' ? 'To Montebello' : 'Drive Back'} Route in Google Maps →
            </a>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
            {[{ key: 'to', label: 'To Montebello' }, { key: 'back', label: 'Drive Back' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMapView(key)}
                style={{
                  fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '600',
                  padding: '0.5rem 1.1rem', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  border: mapView === key ? '1px solid #0F1E14' : '1px solid rgba(0,0,0,0.15)',
                  background: mapView === key ? '#0F1E14' : 'transparent',
                  color: mapView === key ? '#F5F1EC' : '#666',
                  transition: 'background 0.18s ease, color 0.18s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="map-wrap" style={{ overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <RouteMap key={mapView} stops={mapView === 'to' ? STOPS : RETURN_STOPS} path={mapView === 'to' ? ROUTE_PATH : RETURN_ROUTE_PATH} />
          </div>
        </section>

      </main>

      {/* Car modal */}
      {selectedCar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedCar.name} — ${selectedCar.car}`}
          onClick={() => setSelectedCar(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,12,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', maxWidth: '480px', width: '100%', position: 'relative', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            <button
              onClick={() => setSelectedCar(null)}
              aria-label="Close"
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 2, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
            {selectedCar.photo ? (
              <ModalImage key={selectedCar.photo} src={selectedCar.photo} alt={`${selectedCar.name}'s ${selectedCar.car}`} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/3', background: '#e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span aria-hidden="true" style={{ fontSize: '48px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.18)' }}>
                  {selectedCar.name.split(' ').map(w => w[0]).join('')}
                </span>
              </div>
            )}
            <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
              <p style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.35rem', marginTop: 0 }}>Canvas Routes · Hello to Montebello 2026</p>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.2rem', marginTop: 0 }}>{selectedCar.name}</h2>
              {selectedCar.car && (
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '1rem', letterSpacing: '0.02em', marginTop: 0 }}>{selectedCar.car}</p>
              )}
              {selectedCar.fact && (
                <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.8', margin: 0 }}>{selectedCar.fact}</p>
              )}
            </div>
          </div>
        </div>
      )}
      <SiteFooter hideLangToggle />
    </div>
  )
}
