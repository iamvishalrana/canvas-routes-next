'use client'
import { useState, useEffect, useRef } from 'react'
import SiteFooter from '../../components/SiteFooter'
import PageLoader from '../../components/PageLoader'
import { captureException } from '../../lib/sentry'
import { normalizeEmail } from '../../lib/normalizeEmail'

const PASSWORD = 'SUNDAY'
const ROUTE_SLUG = 'sunday-silhouette-2026'

// Only real venues so this one array can drive both the itinerary timeline
// and the map markers. Meetup is the same Starbucks used for Hello to
// Montebello — south service road of Autoroute 440 in Laval (4630 Desserte
// Sud Autoroute 440, Laval, QC H7T 2Z8), confirmed via
// https://maps.app.goo.gl/dj4LKV6nTD6GwnVD8. Full confirmed route (Laval →
// Rawdon → Saint-Côme → Café Marius, Saint-Donat-de-Montcalm → Petinos,
// Saint-Sauveur) locked in by Jerry via
// https://maps.app.goo.gl/vQMQdBm7M1VTJ1dJ7 — see ROUTE_LINK below.
// Rawdon and Saint-Côme are town-center geocoded estimates (waypoints
// through the towns, not one exact address) — good enough for a reference
// pin, not independently verified for turn-by-turn navigation. Café Marius
// and Petinos both now have confirmed street-level coordinates (Café Marius:
// Rue Principale, Saint-Donat-de-Montcalm; Petinos: 75 Avenue de la Gare,
// Saint-Sauveur).
const STOPS = [
  { label: 'Starbucks — Autoroute 440, Back Parking', note: { en: '7:30 AM · Laval · Departure sharp', fr: '7 h 30 · Laval · Départ précis' }, tag: { en: 'Meetup & Departure', fr: 'Rendez-vous et départ' }, start: true, href: 'https://www.google.com/maps/search/?api=1&query=4630+Desserte+Sud+Autoroute+440+Laval+QC', lat: 45.5586062, lng: -73.7921953 },
  { label: 'Rawdon', note: { en: 'Into Lanaudière — the first real stretch of backroads', fr: 'Direction Lanaudière — le premier vrai tronçon de routes secondaires' }, href: 'https://www.google.com/maps/search/?api=1&query=Rawdon,+QC', lat: 46.0470, lng: -73.7181 },
  { label: 'Saint-Côme', note: { en: 'Deeper into cottage country, quiet roads the whole way', fr: 'Plus profondément dans les chalets, des routes tranquilles tout du long' }, href: 'https://www.google.com/maps/search/?api=1&query=Saint-Côme,+QC', lat: 46.2710370, lng: -73.7714770 },
  { label: 'Café Marius', note: { en: 'Coffee stop — covered by Canvas Routes', fr: 'Arrêt café — couvert par Canvas Routes' }, tag: { en: 'Coffee Stop', fr: 'Arrêt café' }, href: 'https://www.google.com/maps/search/?api=1&query=Café+Marius+Rue+Principale+Saint-Donat-de-Montcalm+QC', lat: 46.3107848, lng: -74.2103737 },
  { label: 'Petinos Saint-Sauveur', note: { en: 'Brunch in Saint-Sauveur — covered by Canvas Routes', fr: 'Brunch à Saint-Sauveur — couvert par Canvas Routes' }, tag: { en: 'Brunch', fr: 'Brunch' }, end: true, href: 'https://www.google.com/maps/search/?api=1&query=Petinos+75+Avenue+de+la+Gare+Saint-Sauveur+QC', lat: 45.8908004, lng: -74.1535634 },
]

const MAP_STOPS = STOPS.filter(s => s.lat != null && s.lng != null)
// Jerry's actual confirmed-route share link (Laval → Rawdon → Saint-Côme →
// Café Marius → Petinos) — used directly instead of a synthesized
// /maps/dir/ chain now that every stop is real, not a placeholder.
const ROUTE_LINK = 'https://maps.app.goo.gl/vQMQdBm7M1VTJ1dJ7'

// Resolves a translatable field — either a plain string (untranslated, e.g.
// a proper noun) or an {en, fr} pair — against the current language.
function pick(value, lang) {
  return value && typeof value === 'object' && 'en' in value ? value[lang] : value
}

// Jerry's entry stays manual (lead car + fact blurb) — everyone else is
// fetched live from /api/sunday-silhouette/roster, which reflects paid
// registrants automatically. Same pattern as the Hello to Montebello page.
const MANUAL_PARTICIPANTS = [
  { name: 'Jerry', car: '2021 BMW 3 Series', photo: '/car-jerry.jpeg', lead: true, group: null, fact: 'Perfect balance front to back, every option added — this is exactly how this car was meant to be built.' },
]

// Editorial car facts, matched onto the live roster by exact name — empty
// until registrants exist to write facts about (see CAR_FACTS in the Hello
// to Montebello itinerary page for the pattern once this fills in).
const CAR_FACTS = {}

const DRIVE_BULLETS = [
  { emoji: '📸', text: { en: "Arrive on time — it's a quick, low-key morning, so there's no long mingling window before we roll out together.", fr: "Arrivez à l'heure — c'est une matinée rapide et décontractée, il n'y a pas de longue période pour discuter avant le départ." } },
  { emoji: '🛣️', text: { en: "We meet at 7:30 AM at Starbucks in Laval — departure is sharp, so don't be late. From there the convoy heads north into Lanaudière through Rawdon, then deeper into cottage country through Saint-Côme — backroads the whole way.", fr: "Rendez-vous à 7 h 30 au Starbucks à Laval — départ précis, alors ne soyez pas en retard. De là, le convoi file vers le nord en Lanaudière par Rawdon, puis plus profondément dans les chalets par Saint-Côme — des routes secondaires tout du long." } },
  { emoji: '☕', text: { en: 'A coffee stop at Café Marius in Saint-Donat-de-Montcalm, covered by Canvas Routes, breaks up the drive right in the middle of the loop.', fr: 'Un arrêt café chez Café Marius à Saint-Donat-de-Montcalm, couvert par Canvas Routes, casse la route en plein milieu de la boucle.' } },
  { emoji: '🏁', text: { en: 'From Saint-Donat, the convoy heads west into the Laurentians toward Saint-Sauveur — the last real stretch of backroads before things open up again near home.', fr: "De Saint-Donat, le convoi file vers l'ouest dans les Laurentides en direction de Saint-Sauveur — le dernier vrai tronçon de routes secondaires avant que ça s'ouvre de nouveau près de la maison." } },
  { emoji: '🥐', text: { en: 'Brunch at Petinos Saint-Sauveur closes the morning, covered by Canvas Routes.', fr: 'Le brunch chez Petinos Saint-Sauveur clôture la matinée, couvert par Canvas Routes.' } },
  { emoji: '🕛', text: { en: "Back on the road by around noon — a short, genuinely great morning drive, not a full-day production.", fr: "De retour sur la route vers midi — une courte et vraiment belle balade matinale, pas une production d'une journée complète." } },
]

const CONVOY_RULES = [
  { en: 'Follow the lead car at all times — do not overtake any car in the convoy.', fr: 'Suivez toujours la voiture de tête — ne dépassez aucune voiture du convoi.' },
  { en: "Maintain a safe following distance. Stay close enough to keep the group together, not so close that you can't react.", fr: 'Gardez une distance de sécurité. Restez assez proche pour garder le groupe uni, mais pas trop pour pouvoir réagir.' },
  { en: 'Obey all traffic laws. Speed limits, signals, and road signs apply regardless of group pace.', fr: "Respectez le code de la route. Les limites de vitesse, les feux et les panneaux s'appliquent peu importe le rythme du groupe." },
  { en: 'If you get separated, do not panic — proceed to the next stop on the route and wait.', fr: 'Si vous êtes séparé du groupe, pas de panique — rendez-vous au prochain arrêt et attendez.' },
  { en: 'Do not race, push, or drive aggressively. This is a scenic drive, not a track day.', fr: "Ne faites pas la course et ne conduisez pas de façon agressive. C'est une balade panoramique, pas une journée piste." },
  { en: 'If you need to stop urgently, hazard lights on immediately. The car behind will relay the signal forward.', fr: "En cas d'arrêt d'urgence, allumez vos feux de détresse immédiatement. La voiture derrière relaiera le signal." },
  { en: 'Fuel up before departure — options are limited once we leave the highway.', fr: "Faites le plein avant le départ — les options sont limitées une fois sortis de l'autoroute." },
  { en: 'Respect the roads and the communities we pass through.', fr: 'Respectez les routes et les communautés que nous traversons.' },
]

const UI = {
  en: {
    meetupLabel: 'Meetup', meetupLine: 'Meetup — 7:30 AM · Laval, QC', departure: 'Departure 7:30 AM sharp',
    contactLabel: 'Contact', convoyAppLabel: 'Convoy App',
    convoyAppBody: 'See the whole convoy live on the map and never lose the group — download it now, before August 30.',
    copyNumber: 'Copy number', copied: '✓ Copied',
    convoyRulesLabel: 'Convoy Rules', rulesClose: '▲ Close', rulesRead: '▼ Read',
    itineraryLabel: 'Itinerary', itineraryHint: 'Tap a stop to open in Maps',
    driveLabel: 'The Drive',
    whosComing: n => `Who's Coming — ${n} Car${n !== 1 ? 's' : ''}`,
    tapPhoto: '👇 Tap a photo to learn more about the car',
    groupLabel: n => `Group ${n}`, ungrouped: 'Ungrouped', groupLead: 'Group Lead',
    mapLabel: 'Map',
    openRoute: 'Open Route in Google Maps →',
    modalEyebrow: 'Canvas Routes · Sunday Silhouette 2026',
    heroTags: ['Laurentian Backroads', '~220km Drive', 'Coffee + Brunch'],
    countdownUnits: ['Days', 'Hrs', 'Min', 'Sec'],
  },
  fr: {
    meetupLabel: 'Rendez-vous', meetupLine: 'Rendez-vous — 7 h 30 · Laval, QC', departure: 'Départ à 7 h 30 précises',
    contactLabel: 'Contact', convoyAppLabel: 'Appli de convoi',
    convoyAppBody: 'Voyez tout le convoi en direct sur la carte et ne perdez jamais le groupe — téléchargez-la maintenant, avant le 30 août.',
    copyNumber: 'Copier le numéro', copied: '✓ Copié',
    convoyRulesLabel: 'Règles du convoi', rulesClose: '▲ Fermer', rulesRead: '▼ Lire',
    itineraryLabel: 'Itinéraire', itineraryHint: "Touchez un arrêt pour l'ouvrir dans Maps",
    driveLabel: 'La route',
    whosComing: n => `Qui vient — ${n} voiture${n !== 1 ? 's' : ''}`,
    tapPhoto: '👇 Touchez une photo pour en savoir plus sur la voiture',
    groupLabel: n => `Groupe ${n}`, ungrouped: 'Sans groupe', groupLead: 'Chef de groupe',
    mapLabel: 'Carte',
    openRoute: "Ouvrir l'itinéraire dans Google Maps →",
    modalEyebrow: 'Canvas Routes · Sunday Silhouette 2026',
    heroTags: ['Routes secondaires laurentiennes', '~220 km de route', 'Café + brunch'],
    countdownUnits: ['Jours', 'Hres', 'Min', 'Sec'],
  },
}

const SECTION_LABEL = { fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', display: 'block', fontWeight: '400', fontStyle: 'normal' }

function CopyButton({ text, label, copiedLabel }) {
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
      {copied ? copiedLabel : (
        <>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5.5" y="5.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3.5 10.5H2.5C1.94772 10.5 1.5 10.0523 1.5 9.5V2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H9.5C10.0523 1.5 10.5 1.94772 10.5 2.5V3.5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

function CarThumb({ p }) {
  const [errored, setErrored] = useState(false)
  const initials = (p.name || '?').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 3) || '?'
  if (!p.photo || errored) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span aria-hidden="true" style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.22)', letterSpacing: '0.04em' }}>{initials}</span>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.photo} alt={`${p.name}'s ${p.car}`} className="car-img"
      draggable={false}
      onContextMenu={e => e.preventDefault()}
      onError={() => setErrored(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    />
  )
}

function CarGrid({ cars, onSelect, groupLeadLabel }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
      {cars.map((p, i) => (
        <div key={`${p.name}-${i}`} className="car-wrap">
          <button type="button" onClick={() => onSelect(p)}
            className="car-card"
            aria-label={`${p.name} — ${p.car}`}
            style={{ background: '#fff', border: 'none', padding: '0', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.09)', width: '100%' }}>
            <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#e8e4de', position: 'relative' }}>
              <CarThumb p={p} />
            </div>
            <div style={{ padding: '0.6rem 0.75rem 0.75rem' }}>
              {p.lead && (
                <p style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', margin: '0 0 3px' }}>{groupLeadLabel}</p>
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
  const [errored, setErrored] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#e8e4de', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {errored ? (
        <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)' }}>Photo unavailable</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src} alt={alt}
          loading="eager" decoding="sync"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          draggable={false}
          onContextMenu={e => e.preventDefault()}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        />
      )}
    </div>
  )
}

// Draws straight geodesic lines between the confirmed stop markers — this is
// NOT a traced road route (no real routing data available yet for this
// page), just an honest reference map. See the STOPS comment above.
function RouteMap({ stops, lang = 'en' }) {
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

        let settled = false
        google.maps.event.addListenerOnce(map, 'idle', () => { settled = true })
        map.addListener('dragstart', () => { if (settled) setMoved(true) })
        map.addListener('zoom_changed', () => { if (settled) setMoved(true) })

        new google.maps.Polyline({
          path: stops.map(s => ({ lat: s.lat, lng: s.lng })),
          geodesic: true,
          strokeColor: '#0F1E14',
          strokeOpacity: 0.55,
          strokeWeight: 3,
          icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '14px' }],
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
            content: `<div style="font-family:sans-serif;padding:2px 4px"><strong style="font-size:13px">${stop.label}</strong><br/><span style="color:#888;font-size:11px">${pick(stop.note, lang)}</span></div>`,
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
  }, [stops, lang])

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

export default function SundaySilhouetteItineraryPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const [checked, setChecked] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)
  const [modalCar, setModalCar] = useState(null)
  const [modalClosing, setModalClosing] = useState(false)
  const [atBottom, setAtBottom] = useState(false)
  const [toggleHidden, setToggleHidden] = useState(false)
  const [bannerHeight, setBannerHeight] = useState(0)
  const [fetchedParticipants, setFetchedParticipants] = useState([])
  const [countdown, setCountdown] = useState(null)
  const [lang, setLang] = useState('en')
  const t = UI[lang]

  useEffect(() => {
    if (selectedCar) {
      setModalCar(selectedCar)
      setModalClosing(false)
    }
  }, [selectedCar])

  function closeCarModal() {
    setModalClosing(true)
    setTimeout(() => {
      setSelectedCar(null)
      setModalCar(null)
      setModalClosing(false)
    }, 200)
  }

  useEffect(() => {
    const MEETUP = new Date('2026-08-30T11:30:00Z') // 7:30 AM Montreal (EDT)
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
    fetch('/api/sunday-silhouette/roster')
      .then(r => r.ok ? r.json() : { participants: [] })
      .then(d => setFetchedParticipants(Array.isArray(d.participants) ? d.participants : []))
      .catch(() => {})
  }, [authed])

  const jerryFromRoster = fetchedParticipants.find(p => p.name === 'Jerry')
  const allParticipants = [
    ...MANUAL_PARTICIPANTS.map(p => p.name === 'Jerry' ? { ...p, group: jerryFromRoster?.group ?? p.group } : p),
    ...fetchedParticipants
      .filter(p => p.name !== 'Jerry')
      .map(p => CAR_FACTS[p.name] ? { ...p, fact: CAR_FACTS[p.name] } : p),
  ]
  const groupNumbers = [...new Set(allParticipants.map(p => p.group).filter(g => g != null))].sort((a, b) => a - b)
  const ungrouped = allParticipants.filter(p => p.group == null)

  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      setAtBottom(window.innerHeight + window.scrollY >= document.body.scrollHeight - 80)
      const y = window.scrollY
      if (y < 60) setToggleHidden(false)
      else if (y > lastY + 4) setToggleHidden(true)
      else if (y < lastY - 4) setToggleHidden(false)
      lastY = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
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
    // Some in-app browsers (Instagram/Facebook WebViews with restrictive
    // storage settings) throw on localStorage access instead of just
    // returning null — unguarded, that throw aborts this effect before
    // setChecked(true) below ever runs, permanently stranding the page on
    // its `if (!checked) return null` blank screen. Same failure class as
    // the messageHandlers crash the layout.jsx polyfill guards against.
    let storedAuth = null
    try { storedAuth = localStorage.getItem('ss_itinerary_auth') } catch {}
    if (storedAuth === '1') { setAuthed(true); setChecked(true); return }
    setChecked(true)

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
      try { localStorage.setItem('ss_itinerary_auth', '1') } catch {}
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
          captureException(new Error(`ss-itinerary-gate lookup failed: HTTP ${res.status}`), { context: 'ss-itinerary-gate-lookup', status: res.status, serverError: data.error })
        }
        setChecking(false)
        return
      }

      const passengersList = data.tripDetails?.passengers_list || []
      const sections = data.sections || []
      const hasTrip = sections.includes('trip_details')
      const hasWaiver = sections.includes('waiver')
      const hasLunch = sections.includes('lunch')
      const hasCarPhoto = sections.includes('car_photo')
      const allDone = (!hasTrip || !!data.tripDetails) && (!hasWaiver || !!data.waiver)
        && (!hasLunch || (data.lunch?.length > 0 && data.lunch.length === passengersList.length))
        && (!hasCarPhoto || !!data.carPhoto)

      if (allDone) {
        try { localStorage.setItem('ss_itinerary_auth', '1') } catch {}
        setAuthed(true)
      } else {
        // Includes the email in the return URL too, so coming back auto-submits
        // via the urlEmail effect below instead of asking them to type it again.
        const returnUrl = `${window.location.pathname}?email=${encodeURIComponent(entered)}`
        window.location.href = `/checkin/${idData.eventId}?email=${encodeURIComponent(entered)}&returnTo=${encodeURIComponent(returnUrl)}`
      }
    } catch (err) {
      captureException(err, { context: 'ss-itinerary-gate-lookup-network' })
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
        backgroundImage: 'url(/laurentian-cars-morning-mirrored.png)', backgroundSize: 'cover', backgroundPosition: 'center 40%',
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
            Sunday Silhouette
          </h1>
          <div className="gate-date" style={{ display: 'inline-block', padding: '0.4rem 1.1rem', border: '1px solid rgba(197,168,130,0.5)', background: 'rgba(197,168,130,0.09)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F5F1EC', marginBottom: '1.5rem' }}>
            Sunday · August 30, 2026
          </div>
          <div className="gate-tags" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.75rem' }}>
            {['Laurentian Backroads', '~220km Drive', 'Coffee + Brunch'].map(tag => (
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
    <div style={{
      minHeight: '100dvh',
      background: 'repeating-linear-gradient(45deg, rgba(15,30,20,0.028) 0px, rgba(15,30,20,0.028) 1px, transparent 1px, transparent 13px), #F5F1EC',
      fontFamily: 'sans-serif', color: '#1a1a1a',
    }}>
      <PageLoader images={['/laurentian-cars-morning-mirrored.png', ...allParticipants.filter(p => p.photo).map(p => p.photo)]} minMs={2000} />

      <button
        className="scroll-btn"
        style={{ opacity: atBottom ? 0 : 1, pointerEvents: atBottom ? 'none' : 'auto', bottom: `calc(1.75rem + ${bannerHeight}px + env(safe-area-inset-bottom))`, right: `calc(1.25rem + env(safe-area-inset-right))` }}
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })}
        aria-label="Scroll down"
      >
        <svg className="scroll-chevron" width="18" height="11" viewBox="0 0 16 10" fill="none">
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

        .scroll-btn { position: fixed; right: 1.25rem; bottom: 1.75rem; z-index: 1001; display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 50%; background: rgba(15,30,20,0.82); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border: 0.5px solid rgba(197,168,130,0.3); cursor: pointer; transition: opacity 0.4s ease, box-shadow 0.2s ease, bottom 0.2s ease, transform 0.15s ease; box-shadow: 0 4px 14px rgba(0,0,0,0.22); pointer-events: auto; }
        .scroll-btn:active { transform: scale(0.93); }
        @media (hover: hover) { .scroll-btn:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.35); } }
        @keyframes bounce-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        .scroll-chevron { animation: bounce-down 1.6s ease-in-out infinite; }

        @media (max-width: 480px) {
          .quick-info-item { border-right: none !important; margin-right: 0 !important; border-bottom: 0.5px solid rgba(0,0,0,0.08); padding-right: 0 !important; }
          .quick-info-item:last-child { border-bottom: none; }
        }

        @keyframes itin-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes itin-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .itin-hero-logo      { animation: itin-fade-in 0.7s ease both; animation-delay: 100ms; }
        .itin-hero-title     { animation: itin-fade-up 0.8s ease both; animation-delay: 220ms; }
        .itin-hero-date      { animation: itin-fade-in 0.6s ease both; animation-delay: 380ms; }
        .itin-hero-tags      { animation: itin-fade-in 0.6s ease both; animation-delay: 500ms; }
        .itin-hero-countdown { animation: itin-fade-up 0.7s ease both; animation-delay: 620ms; }
        .itin-quick-info     { animation: itin-fade-up 0.7s ease both; animation-delay: 740ms; }

        @keyframes itin-tick { 0% { transform: scale(1.12); } 100% { transform: scale(1); } }
        .itin-countdown-num { display: inline-block; animation: itin-tick 0.4s ease-out; }

        .quick-info-item { transition: transform 0.15s ease; }
        @media (hover: hover) {
          .quick-info-item:hover { transform: translateY(-2px); }
        }

        @keyframes car-modal-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes car-modal-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes car-modal-card-in { from { opacity: 0; transform: scale(0.94) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes car-modal-card-out { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.96) translateY(6px); } }
        .car-modal-backdrop.opening { animation: car-modal-backdrop-in 0.2s ease both; }
        .car-modal-backdrop.closing { animation: car-modal-backdrop-out 0.18s ease both; }
        .car-modal-card.opening { animation: car-modal-card-in 0.24s cubic-bezier(0.2,0.7,0.3,1) both; }
        .car-modal-card.closing { animation: car-modal-card-out 0.18s ease both; }

        @media (max-width: 640px) and (prefers-reduced-motion: no-preference) {
          @keyframes itin-hero-pan { from { transform: scale(1.18); } to { transform: scale(1); } }
          .itin-hero-bg { animation: itin-hero-pan 16s ease-out both; will-change: transform; }
        }

        @keyframes lang-toggle-punch { 0% { transform: scale(0.7); opacity: 0.4; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        .lang-toggle-btn { animation: lang-toggle-punch 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
        .lang-toggle-btn:active { transform: scale(0.93); }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'relative', padding: '3.5rem 1.25rem 3rem', textAlign: 'center',
        overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        <div className="itin-hero-bg" style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/laurentian-cars-morning-mirrored.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(15,30,20,0.88) 100%)' }} />
        <div style={{
          position: 'fixed', top: 'calc(1rem + env(safe-area-inset-top))', right: 'calc(1rem + env(safe-area-inset-right))', zIndex: 100, display: 'flex', background: '#0F1E14', boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          opacity: toggleHidden ? 0 : 1, transform: toggleHidden ? 'translateY(-12px)' : 'translateY(0)', pointerEvents: toggleHidden ? 'none' : 'auto', transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          {['en', 'fr'].map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={lang === l ? 'lang-toggle-btn' : undefined}
              style={{ padding: '0.45rem 0.75rem', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: lang === l ? '#c5a882' : 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: lang === l ? '#0F1E14' : 'rgba(197,168,130,0.55)', fontWeight: lang === l ? '700' : '400', fontFamily: 'sans-serif', transition: 'all 0.15s ease', WebkitTapHighlightColor: 'transparent' }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" className="itin-hero-logo" style={{ width: '210px', display: 'block', margin: '0 auto 1.5rem' }} />
          <h1 className="itin-hero-title" style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '28px', letterSpacing: '0.01em', lineHeight: '1.2', margin: 0, fontWeight: '400' }}>Sunday Silhouette</h1>
          <p className="itin-hero-date" style={{ color: 'rgba(245,241,236,0.6)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '0.6rem', marginBottom: 0 }}>{lang === 'fr' ? 'Dimanche · 30 août 2026' : 'Sunday · August 30, 2026'}</p>
          <div className="itin-hero-tags" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}>
            {t.heroTags.map(tag => (
              <span key={tag} style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '4px 12px' }}>{tag}</span>
            ))}
          </div>

          {countdown && (
            <div className="itin-hero-countdown" style={{ display: 'inline-flex', gap: 0, marginTop: '1.75rem', border: '0.5px solid rgba(197,168,130,0.25)', overflow: 'hidden' }}>
              {[
                { label: t.countdownUnits[0], val: countdown.d },
                { label: t.countdownUnits[1], val: countdown.h },
                { label: t.countdownUnits[2], val: countdown.m },
                { label: t.countdownUnits[3], val: countdown.s },
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
              <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>{t.meetupLabel}</h2>
              <a href={STOPS[0].href} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4', display: 'block', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(0,0,0,0.22)' }}>{STOPS[0].label}</a>
              <p style={{ fontSize: '12px', color: '#45643C', marginTop: '3px', marginBottom: 0, fontWeight: '700' }}>{t.meetupLine}</p>
              <p style={{ fontSize: '11px', color: '#93333E', marginTop: '2px', marginBottom: 0, fontWeight: '600' }}>{t.departure}</p>
            </div>
            <div className="quick-info-item" style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 160px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem', borderTop: '2px solid #93333E' }}>
              <h2 style={{ ...SECTION_LABEL, color: '#93333E', marginBottom: '5px', fontWeight: '600' }}>{t.contactLabel}</h2>
              <a href="tel:5144373437" style={{ fontSize: '14px', color: '#93333E', textDecoration: 'none', lineHeight: '1.4', display: 'block', fontWeight: '700', letterSpacing: '0.01em' }}>
                Jerry — 514-437-3437
              </a>
              <CopyButton text="514-437-3437" label={t.copyNumber} copiedLabel={t.copied} />
            </div>
            <div className="quick-info-item" style={{ padding: '1.1rem 0', flex: '1 1 130px' }}>
              <h2 style={{ ...SECTION_LABEL, marginBottom: '3px' }}>{t.convoyAppLabel}</h2>
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
              <p style={{ fontSize: '11px', color: '#999', marginTop: '3px', lineHeight: '1.5', marginBottom: 0 }}>{t.convoyAppBody}</p>
            </div>
          </div>
        </div>

        {/* Convoy Rules */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <button
            onClick={() => setRulesOpen(o => !o)}
            aria-expanded={rulesOpen}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '44px', background: 'none', border: 'none', padding: '0.5rem 0', margin: '-0.5rem 0', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}
          >
            <h2 style={{ ...SECTION_LABEL, margin: 0 }}>{t.convoyRulesLabel}</h2>
            <span aria-hidden="true" style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em' }}>{rulesOpen ? t.rulesClose : t.rulesRead}</span>
          </button>
          {rulesOpen && (
            <ol style={{ margin: '1.25rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {CONVOY_RULES.map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ color: '#c5a882', fontSize: '11px', fontWeight: '600', flexShrink: 0, paddingTop: '2px' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: '13px', color: '#444', lineHeight: '1.6' }}>{pick(rule, lang)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Itinerary */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>{t.itineraryLabel}</h2>
            <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', margin: 0 }}>{t.itineraryHint}</p>
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
              <div style={{ flex: 1, paddingBottom: '10px', paddingTop: stop.feature ? '10px' : 0 }}>
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
                  <div style={{ fontSize: stop.feature ? '17px' : '15px', color: '#1a1a1a', fontWeight: stop.start || stop.end || stop.feature ? '600' : '400', lineHeight: '1.35' }}>{stop.label}</div>
                )}
                <p style={{ fontSize: '12px', color: '#999', marginTop: '2px', marginBottom: '5px' }}>
                  {pick(stop.note, lang)}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {stop.tag && (
                    <div style={{ display: 'inline-block', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.4)', padding: '2px 8px' }}>
                      {pick(stop.tag, lang)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* The Drive */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>{t.driveLabel}</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {DRIVE_BULLETS.map(({ emoji, text }, i) => (
              <li key={i} className="itin-stop" style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', transitionDelay: `${0.12 + i * 0.08}s` }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{emoji}</span>
                <span style={{ fontSize: '14px', color: '#444', lineHeight: '1.75' }}>{pick(text, lang)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Who's Coming */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>{t.whosComing(allParticipants.length)}</h2>
          <p style={{ fontSize: '13px', color: '#0F1E14', fontWeight: '700', letterSpacing: '0.02em', margin: '0 0 1.25rem' }}>{t.tapPhoto}</p>
          {groupNumbers.length > 0 ? (
            <>
              {groupNumbers.map(g => (
                <div key={g} style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c5a882', margin: '0 0 0.75rem' }}>{t.groupLabel(g)}</p>
                  <CarGrid cars={allParticipants.filter(p => p.group === g).sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0))} onSelect={setSelectedCar} groupLeadLabel={t.groupLead} />
                </div>
              ))}
              {ungrouped.length > 0 && (
                <div>
                  <p style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', margin: '0 0 0.75rem' }}>{t.ungrouped}</p>
                  <CarGrid cars={ungrouped} onSelect={setSelectedCar} groupLeadLabel={t.groupLead} />
                </div>
              )}
            </>
          ) : (
            <CarGrid cars={allParticipants} onSelect={setSelectedCar} groupLeadLabel={t.groupLead} />
          )}
        </section>

        {/* Map */}
        <section className="scroll-reveal" style={{ padding: '2rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <h2 style={{ ...SECTION_LABEL, marginBottom: 0 }}>{t.mapLabel}</h2>
            <a
              href={ROUTE_LINK}
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', padding: '6px 0', margin: '-6px 0', fontSize: '11px', letterSpacing: '0.06em', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', fontWeight: '600' }}
            >
              {t.openRoute}
            </a>
          </div>
          <div className="map-wrap" style={{ overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <RouteMap key={lang} stops={MAP_STOPS} lang={lang} />
          </div>
        </section>

      </main>

      {/* Car modal */}
      {modalCar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${modalCar.name} — ${modalCar.car}`}
          onClick={closeCarModal}
          className={modalClosing ? 'car-modal-backdrop closing' : 'car-modal-backdrop opening'}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,12,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={modalClosing ? 'car-modal-card closing' : 'car-modal-card opening'}
            style={{ background: '#fff', maxWidth: '480px', width: '100%', position: 'relative', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            <button
              onClick={closeCarModal}
              aria-label="Close"
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 2, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', lineHeight: 1 }}>
              ×
            </button>
            {modalCar.photo ? (
              <ModalImage key={modalCar.photo} src={modalCar.photo} alt={`${modalCar.name}'s ${modalCar.car}`} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/3', background: '#e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span aria-hidden="true" style={{ fontSize: '48px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.18)' }}>
                  {modalCar.name.split(' ').map(w => w[0]).join('')}
                </span>
              </div>
            )}
            <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
              <p style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.35rem', marginTop: 0 }}>{t.modalEyebrow}</p>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.2rem', marginTop: 0 }}>{modalCar.name}</h2>
              {modalCar.car && (
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '1rem', letterSpacing: '0.02em', marginTop: 0 }}>{modalCar.car}</p>
              )}
              {modalCar.fact && (
                <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.8', margin: 0 }}>{modalCar.fact}</p>
              )}
            </div>
          </div>
        </div>
      )}
      <SiteFooter hideLangToggle />
    </div>
  )
}
