'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ROUTE_PATH } from './routePath'
import SiteFooter from '../../components/SiteFooter'
import PageLoader from '../../components/PageLoader'
import { WTET_PARTICIPANTS as PARTICIPANTS } from '../../lib/wtetParticipants'

const PASSWORD = 'eastern'

const MAP_MARKERS = [
  { label: 'Shell — Brossard', note: '10:00 AM · Meetup & Departure', start: true, lat: 45.4502, lng: -73.4440 },
  { label: 'Vignoble Domaine du Brésée', note: 'Sutton · Winery experience', lat: 45.1477, lng: -72.6133 },
  { label: 'Auberge & Restaurant McGowan', note: 'Georgeville · Final destination', end: true, lat: 45.1394, lng: -72.2554 },
]

const STOPS = [
  { label: 'Shell — 8700 Boul. Leduc', note: '10:00 AM · Meetup · Brossard', start: true, href: 'https://maps.app.goo.gl/Ye8mVsi15rwcgGWj7', lat: 45.4502, lng: -73.4440 },
  { label: 'Vignoble Domaine du Brésée', note: 'Sutton · Private winery experience', href: 'https://maps.app.goo.gl/CcVDgmpEdRHK6c7L6', lat: 45.1477, lng: -72.6133 },
  { label: 'Sutton', note: 'Chemin des Cantons · Rolling through', href: 'https://www.google.com/maps?q=45.1038,-72.5544', lat: 45.1038, lng: -72.5544 },
  { label: 'Glen Sutton', note: 'Chemin des Cantons · Mountain roads', href: 'https://www.google.com/maps?q=45.0539,-72.5245', lat: 45.0539, lng: -72.5245 },
  { label: 'Highwater', note: 'Chemin des Cantons · Near the border', href: 'https://www.google.com/maps?q=45.0053,-72.4400', lat: 45.0053, lng: -72.4400 },
  { label: 'Austin', note: 'Chemin des Cantons · Lake Memphrémagog area', href: 'https://www.google.com/maps?q=45.1863,-72.2440', lat: 45.1863, lng: -72.2440 },
  { label: 'Magog', note: 'Chemin des Cantons · Lake view', href: 'https://www.google.com/maps?q=45.2679,-72.1493', lat: 45.2679, lng: -72.1493 },
  { label: 'Auberge & Restaurant McGowan', note: 'Georgeville · Chef from Michelin-starred kitchens · Final destination', end: true, href: 'https://maps.app.goo.gl/fsWhM2GNVLoG55ar9', lat: 45.1394, lng: -72.2554 },
]

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
    <button onClick={copy} style={{ background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', fontSize: '10px', color: copied ? '#3B6B2F' : '#bbb', letterSpacing: '0.06em', fontFamily: 'sans-serif', display: 'block', marginTop: '3px' }}>
      {copied ? '✓ Copied' : 'Copy number'}
    </button>
  )
}

function RouteMap({ stops }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

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

        new google.maps.Polyline({
          path: ROUTE_PATH,
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
  }, [stops])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', opacity: status === 'ready' ? 1 : 0 }} />
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8' }}>
          <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Loading map…</span>
        </div>
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

export default function EasternTownshipsPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState(false)
  const [checked, setChecked] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)

  useEffect(() => {
    const urlPw = new URLSearchParams(window.location.search).get('pw')
    if (urlPw?.trim().toLowerCase() === PASSWORD.toLowerCase()) { setAuthed(true); setChecked(true); return }
    try { if (localStorage.getItem('eastern_auth') === '1') { setAuthed(true) } } catch {}
    setChecked(true)
  }, [])

  function submit(e) {
    e.preventDefault()
    if (pw.trim().toLowerCase() === PASSWORD.toLowerCase()) {
      try { localStorage.setItem('eastern_auth', '1') } catch {}
      setAuthed(true)
    } else {
      setErr(true)
      setPw('')
    }
  }

  if (!checked) return null

  if (!authed) {
    return (
      <div style={{ minHeight: '100svh', background: '#0F1E14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" style={{ width: '180px', marginBottom: '2.5rem' }} />
          <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '22px', marginBottom: '0.4rem' }}>Whips to Eastern Townships</div>
          <div style={{ color: 'rgba(245,241,236,0.4)', fontFamily: 'sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>July 5, 2026</div>
          <form onSubmit={submit}>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <input
                value={pw}
                onChange={e => { setPw(e.target.value); setErr(false) }}
                placeholder="Password"
                type={showPw ? 'text' : 'password'}
                autoComplete="off"
                style={{
                  display: 'block', width: '100%', padding: '0.9rem 2.75rem 0.9rem 1rem',
                  background: 'rgba(255,255,255,0.07)',
                  border: `0.5px solid ${err ? '#7B2032' : 'rgba(255,255,255,0.18)'}`,
                  color: '#F5F1EC', fontSize: '16px', outline: 'none',
                  fontFamily: 'Georgia, serif',
                  textAlign: 'center', letterSpacing: '0.12em', boxSizing: 'border-box',
                  WebkitAppearance: 'none', borderRadius: '0',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.4)', fontSize: '11px', letterSpacing: '0.06em', fontFamily: 'sans-serif' }}
              >
                {showPw ? 'hide' : 'show'}
              </button>
            </div>
            {err && <div style={{ color: '#c5a882', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Incorrect password — try again</div>}
            <button
              type="submit"
              style={{ width: '100%', padding: '0.9rem', background: '#c5a882', color: '#0F1E14', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: '700' }}
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: '#F5F1EC', fontFamily: 'sans-serif', color: '#1a1a1a' }}>
      <PageLoader images={['/wtet.png']} minMs={2000} />
      <style>{`
        .map-wrap { height: 320px; }
        @media (min-width: 640px) { .map-wrap { height: 480px; } }
        .car-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .car-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.12); transform: translateY(-2px); }
        .car-card .car-img { transition: transform 0.3s ease; }
        .car-card:hover .car-img { transform: scale(1.04); }
        .section-card { box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'relative', padding: '3.5rem 1.25rem 3rem', textAlign: 'center',
        backgroundImage: 'url(/wtet.png)', backgroundSize: 'cover', backgroundPosition: 'center',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(15,30,20,0.88) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" style={{ width: '210px', display: 'block', margin: '0 auto 1.5rem' }} />
          <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '28px', letterSpacing: '0.01em', lineHeight: '1.2' }}>Whips to Eastern Townships</div>
          <div style={{ color: 'rgba(245,241,236,0.6)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '0.6rem' }}>Sunday · July 5, 2026</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}>
            {['Chemin des Cantons', 'Vineyard Stop', 'Lakeside Lunch'].map(tag => (
              <span key={tag} style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '4px 12px' }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>

        {/* Quick info */}
        <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 140px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Meetup</div>
              <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' }}>10:00 AM · Shell — 8700 Boul. Leduc</div>
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px' }}>Brossard, QC</div>
            </div>

            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 160px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem', borderTop: '2px solid #7B2032' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7B2032', marginBottom: '5px', fontWeight: '600' }}>Contact</div>
              <a href="tel:5144373437" style={{ fontSize: '14px', color: '#7B2032', textDecoration: 'none', lineHeight: '1.4', display: 'block', fontWeight: '700', letterSpacing: '0.01em' }}>
                Jerry — 514-437-3437
              </a>
              <CopyButton text="514-437-3437" />
            </div>

            <div style={{ padding: '1.1rem 0', flex: '1 1 130px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Convoy App</div>
              <a
                href="https://apps.apple.com/ca/app/velox-drive-convoy-explore/id6754770506"
                target="_blank" rel="noreferrer"
                style={{ fontSize: '13px', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: '1.4', display: 'block', fontWeight: '700' }}
              >
                Download Velox →
              </a>
              <div style={{ fontSize: '10px', color: '#bbb', marginTop: '3px', lineHeight: '1.5' }}>Stay connected in real time · iOS only</div>
            </div>


          </div>
        </div>

        {/* Route stops */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Itinerary</div>
            <div style={{ fontSize: '10px', color: '#bbb', fontStyle: 'italic' }}>Tap a stop to open in Maps</div>
          </div>
          {STOPS.map((stop, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '14px' }}>
                <div style={{
                  width: stop.start || stop.end ? '10px' : '8px',
                  height: stop.start || stop.end ? '10px' : '8px',
                  borderRadius: stop.start || stop.end ? '0' : '50%',
                  background: stop.start ? '#3B6B2F' : stop.end ? '#0F1E14' : 'rgba(0,0,0,0.22)',
                  marginTop: '5px', flexShrink: 0,
                }} />
                {i < STOPS.length - 1 && (
                  <div style={{ width: '1px', height: '36px', background: 'rgba(0,0,0,0.1)', marginTop: '4px' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <a
                  href={stop.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '15px', color: '#1a1a1a',
                    fontWeight: stop.start || stop.end ? '600' : '400',
                    lineHeight: '1.35', textDecoration: 'underline',
                    textUnderlineOffset: '3px', textDecorationColor: 'rgba(0,0,0,0.22)',
                    display: 'block', WebkitTapHighlightColor: 'rgba(0,0,0,0.05)',
                  }}
                >
                  {stop.label}
                </a>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '2px', marginBottom: '10px' }}>
                  {stop.note}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* About the drive */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>The Drive</div>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.8', margin: '0 0 0.75rem' }}>
            We leave Brossard and take Autoroute 10 East, exiting at Farnham. From there we head south on Route 233, winding through Dunham and down into Frelighsburg for a private winery experience at Vignoble Domaine du Brésée — cars on the grounds, a chance to take in the property. Canvas Routes guests get a special price on any purchases at the winery.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.8', margin: '0 0 0.75rem' }}>
            From there we pick up Chemin des Cantons. The road climbs into the Sutton Mountains in tight, technical corners, tightens through Glen Sutton, and cuts deep into the Appalachian forest at Highwater — quiet, undisturbed pavement with almost no traffic. Coming through Austin, the trees open and Lake Memphrémagog spreads out below.
          </p>
          <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.8', margin: 0 }}>
            Auberge &amp; Restaurant McGowan in Georgeville is where the route closes — lunch on the lake. The chef has worked in kitchens that held two Michelin stars — the standard follows. From there, we&rsquo;ll take a call as a group on whether to take the backroads or the highway back to Montreal.
          </p>
        </div>

        {/* Photography */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Photography</div>
          <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.6' }}>On-route photos and video captured throughout the day.</div>
        </div>

        {/* Who's Coming */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>
            Who&rsquo;s Coming &mdash; {PARTICIPANTS.length} Cars · 3 Groups
          </div>

          {/* Groups explanation */}
          <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.8', margin: '0 0 1.25rem' }}>
            With {PARTICIPANTS.length} cars on the road, running as a single convoy isn&rsquo;t safe or practical — it creates gaps at lights, puts strain on slower traffic, and makes it impossible to keep everyone together on tight sections. We&rsquo;re splitting into three groups of 6&ndash;7, departing 5 minutes apart. Each group runs as its own self-contained convoy with a designated lead car.
          </p>

          {/* Group rules */}
          <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem 1.25rem', marginBottom: '2rem', borderLeft: '2px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.75rem' }}>Group Rules</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                'Stay with your group for the entire drive — do not switch groups on route.',
                'Depart in group order. Wait for the group ahead to fully clear before your group moves.',
                'No racing between groups. If you catch the group ahead, hold your position and maintain the gap.',
                'Do not race or push within the group either — this is a scenic drive, not a track day.',
                'If your group gets split, pull over safely at the nearest stop and wait to regroup.',
                'Group leads set the pace — follow their lead, not the car directly in front of you.',
              ].map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#c5a882', fontSize: '10px', fontWeight: '600', flexShrink: 0, paddingTop: '2px' }}>—</span>
                  <span style={{ fontSize: '12px', color: '#555', lineHeight: '1.65' }}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tap hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
            <span style={{ fontSize: '15px' }}>👆</span>
            <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.04em' }}>Tap any car to learn more about the build</span>
          </div>

          {/* Grouped car grids */}
          {[1, 2, 3].map(g => {
            const groupCars = PARTICIPANTS.filter(p => p.group === g)
            return (
              <div key={g} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', whiteSpace: 'nowrap' }}>
                    Group {g} &mdash; {groupCars.length} Cars
                  </div>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.1)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
                  {groupCars.map(p => (
                    <button key={p.name} type="button" onClick={() => setSelectedCar(p)}
                      className="car-card"
                      style={{ background: '#fff', border: 'none', padding: '0', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#e8e4de', position: 'relative' }}>
                        {p.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.photo} alt={p.name} className="car-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.22)', letterSpacing: '0.04em' }}>
                              {p.name.split(' ').map(w => w[0]).join('')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.6rem 0.75rem 0.75rem' }}>
                        <div style={{ fontSize: '12px', color: '#1a1a1a', letterSpacing: '0.01em' }}>{p.name}</div>
                        {p.car && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{p.car}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Car modal */}
          {selectedCar && (
            <div
              onClick={() => setSelectedCar(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,12,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ background: '#fff', maxWidth: '480px', width: '100%', position: 'relative', overflow: 'hidden' }}
              >
                {/* Close */}
                <button onClick={() => setSelectedCar(null)}
                  style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', lineHeight: 1 }}>
                  ×
                </button>

                {/* Photo */}
                {selectedCar.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedCar.photo} alt={selectedCar.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '4/3', background: '#e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '48px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.18)' }}>
                      {selectedCar.name.split(' ').map(w => w[0]).join('')}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.35rem' }}>Canvas Routes · Whips to Eastern Townships 2026</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.2rem' }}>{selectedCar.name}</div>
                  {selectedCar.car && (
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '1rem', letterSpacing: '0.02em' }}>{selectedCar.car}</div>
                  )}
                  {selectedCar.fact && (
                    <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.8', margin: 0 }}>{selectedCar.fact}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Convoy rules */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <button
            onClick={() => setRulesOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999' }}>Convoy Rules</div>
            <div style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em' }}>{rulesOpen ? '▲ Close' : '▼ Read'}</div>
          </button>
          {rulesOpen && (
            <ul style={{ margin: '1.25rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                'Follow the lead car at all times — do not overtake any car in the convoy.',
                'Maintain a safe following distance. Stay close enough to keep the group together, not so close that you can\'t react.',
                'Obey all traffic laws. Speed limits, signals, and road signs apply regardless of group pace.',
                'If you get separated, do not panic — proceed to the next stop on the route and wait.',
                'Do not race, push, or drive aggressively. This is a scenic drive, not a track day.',
                'If you need to stop urgently, hazard lights on immediately. The car behind will relay the signal forward.',
                'Fuel up at the Shell station in Bromont before heading into the backroads.',
                'Respect the roads and the communities we pass through.',
              ].map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#c5a882', fontSize: '11px', fontWeight: '600', flexShrink: 0, paddingTop: '2px' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: '13px', color: '#444', lineHeight: '1.6' }}>{rule}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Map */}
        <div style={{ padding: '2rem 0' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Map</div>
          <div className="map-wrap" style={{ overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)' }}>
            <RouteMap stops={MAP_MARKERS} />
          </div>
        </div>

      </div>
      <SiteFooter />
    </div>
  )
}
