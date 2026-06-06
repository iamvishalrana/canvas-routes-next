'use client'
import { useState, useEffect, useRef } from 'react'
import { ROUTE_PATH } from './routePath'

const PASSWORD = 'laurentians'

const STOPS = [
  { label: 'Petinos, LaSalle', note: 'Meetup — 7:00am sharp', start: true, href: 'https://maps.app.goo.gl/okpsXCTYa4aoQiis8', lat: 45.4431, lng: -73.6172 },
  { label: 'Esso Porte du Nord', note: 'Saint-Sauveur', href: 'https://maps.app.goo.gl/JeVTLfLvkGE8NYEF9', lat: 45.8957004, lng: -74.1564982 },
  { label: 'Lac des Sables Photo Stop', note: 'Sainte-Agathe-des-Monts (Park the cars along the side of the lake)', href: 'https://www.google.com/maps?q=46.0331833,-74.2849984', lat: 46.0331833, lng: -74.2849984 },
  { label: 'Le Café Mont Blanc', note: 'Mont-Blanc', href: 'https://www.google.com/maps?q=46.1160535,-74.4784365', lat: 46.1160535, lng: -74.4784365 },
  { label: 'Mont-Tremblant Casino', note: '(Optional photography stop)', href: 'https://www.google.com/maps?q=46.2017179,-74.5695010', lat: 46.2017179, lng: -74.5695010 },
  { label: '163 Chem. des Voyageurs', note: 'VIP Parking · Mont-Tremblant', href: 'https://www.google.com/maps?q=46.2089655,-74.5846753', lat: 46.2089655, lng: -74.5846753 },
  { label: 'Pizzéria NO.900', note: 'Lunch Stop · Mont-Tremblant', href: 'https://www.google.com/maps?q=46.1346041,-74.6141983', lat: 46.1346041, lng: -74.6141983 },
  { label: 'Esso Porte du Nord', note: 'Fuel & Rest Stop · Saint-Sauveur', href: 'https://maps.app.goo.gl/JeVTLfLvkGE8NYEF9', lat: 45.8957004, lng: -74.1564982 },
  { label: 'Aloe Cafe', note: 'Pointe-Claire — Final Destination', end: true, href: 'https://maps.app.goo.gl/szYVavrSxRoRWZoc6', lat: 45.4600, lng: -73.8353 },
]

const REGISTRANTS = [
  { name: 'Louis Guindon', car: '2023 Genesis G70 3.3T', color: 'Grey', photo: '/car-louis-guindon.png' },
  { name: 'Jean-Philippe Remon', car: '2011 BMW 135i', color: 'Grey', photo: '/car-jean-philippe.png' },
  { name: 'Julien Fernandez', car: '2005 Porsche 911 S Cab', color: 'Silver', tag: '6FLAT', photo: '/car-julien-fernandez.jpeg' },
  { name: 'Tanya Ghingold', car: '2012 Porsche Cayman S Black Edition 71/500', color: '', photo: '/car-tanya-ghingold.jpg', photoFit: 'contain', photoBg: '#1a1a1a' },
  { name: 'Frederic Lefebvre', car: '2020 Audi RS3', color: '', photo: null },
  { name: 'Marc-Antoine Sauvé', car: '2018 Audi Allroad A4', color: 'Gloss Steel Blue', photo: '/car-marc-antoine-sauve.jpg', photoScale: 1.2 },
  { name: 'Nicholas Kong', car: '2020 Subaru BRZ', color: 'Red', photo: '/car-nicholas-kong.jpeg' },
  { name: 'Alexandre Boutin', car: '2026 Audi RS6 Performance', color: '', photo: '/car-alexandre-boutin.jpeg' },
  { name: 'Yvon Maggi', car: '2014 Porsche 911 Turbo S Cab', color: 'Black', photo: '/car-yvon-maggi.jpeg' },
  { name: 'Jerry', car: '2021 BMW 3 Series', color: 'White', photo: '/car-jerry.jpeg' },
]

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
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
            { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f5e9d6' }] },
            { featureType: 'landscape', stylers: [{ color: '#f0ede8' }] },
            { featureType: 'water', stylers: [{ color: '#c8d8e8' }] },
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

        stops.forEach((stop) => {
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
      if (!destroyed) { setErrorMsg('Auth failure — key invalid or domain not allowed in Google Cloud restrictions'); setStatus('error') }
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
      script.onerror = () => {
        if (!destroyed) { setErrorMsg('Script failed to load — key may be invalid or blocked'); setStatus('error') }
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
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', opacity: status === 'ready' ? 1 : 0 }}
      />
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8' }}>
          <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Loading map…</span>
        </div>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0ede8', gap: '0.75rem', padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Map unavailable</span>
          {errorMsg && <span style={{ fontSize: '10px', color: '#c0392b', maxWidth: '280px', lineHeight: '1.5' }}>{errorMsg}</span>}
          <a href="https://www.google.com/maps/d/viewer?mid=1Nqcw4_7P3M3FSEBpdwawyizSd7dY_KA" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px' }}>Open route in Google Maps →</a>
        </div>
      )}
    </div>
  )
}

function CarIcon() {
  return (
    <svg width="60" height="30" viewBox="0 0 60 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 21h52" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 21L15 11h30l7 10" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 11l3-5h20l3 5" stroke="rgba(0,0,0,0.1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="23" r="3.5" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5"/>
      <circle cx="42" cy="23" r="3.5" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5"/>
    </svg>
  )
}

export default function DrivePage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const urlPw = new URLSearchParams(window.location.search).get('pw')
    if (urlPw?.toLowerCase() === PASSWORD) { setAuthed(true); setChecked(true); return }
    if (sessionStorage.getItem('drive_auth') === '1') { setAuthed(true) }
    setChecked(true)
  }, [])

  function submit(e) {
    e.preventDefault()
    if (pw.toLowerCase().trim() === PASSWORD) {
      sessionStorage.setItem('drive_auth', '1')
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
          <img src="/white-outline.png" alt="Canvas Routes" style={{ width: '180px', marginBottom: '2.5rem' }} />
          <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '22px', marginBottom: '0.4rem' }}>Into the Laurentians</div>
          <div style={{ color: 'rgba(245,241,236,0.4)', fontFamily: 'sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '2.5rem' }}>June 7, 2026</div>
          <form onSubmit={submit}>
            <input
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(false) }}
              placeholder="Password"
              type="password"
              autoComplete="off"
              style={{
                display: 'block', width: '100%', padding: '0.9rem 1rem',
                background: 'rgba(255,255,255,0.07)',
                border: `0.5px solid ${err ? '#7B2032' : 'rgba(255,255,255,0.18)'}`,
                color: '#F5F1EC', fontSize: '16px', outline: 'none',
                fontFamily: 'Georgia, serif', marginBottom: '0.75rem',
                textAlign: 'center', letterSpacing: '0.12em', boxSizing: 'border-box',
                WebkitAppearance: 'none', borderRadius: '0',
              }}
            />
            {err && <div style={{ color: '#c0392b', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Incorrect password</div>}
            <button type="submit" style={{
              width: '100%', background: '#F5F1EC', color: '#0F1E14', border: 'none',
              padding: '0.9rem', fontSize: '11px', letterSpacing: '0.2em',
              textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'sans-serif', fontWeight: '600',
              WebkitAppearance: 'none', borderRadius: '0', minHeight: '48px',
            }}>
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100svh', background: '#F5F1EC', fontFamily: 'sans-serif', color: '#1a1a1a' }}>
      <style>{`
        .map-wrap { height: 320px; }
        @media (min-width: 640px) { .map-wrap { height: 480px; } }
        .leaflet-container { background: #f0ede8; }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'relative', padding: '3.5rem 1.25rem 3rem', textAlign: 'center',
        backgroundImage: 'url(/faq-page.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(15,30,20,0.82) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <img src="/white-outline.png" alt="Canvas Routes" style={{ width: '160px', display: 'block', margin: '0 auto 1.5rem' }} />
          <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '28px', letterSpacing: '0.01em', lineHeight: '1.2' }}>Into the Laurentians</div>
          <div style={{ color: 'rgba(245,241,236,0.6)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '0.6rem' }}>June 7, 2026</div>
        </div>
      </div>

      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>

        {/* Quick info */}
        <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 120px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Depart</div>
              <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' }}>7:00am · Petinos, LaSalle</div>
            </div>

            {/* Emergency — prominent red */}
            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 160px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem', borderTop: '2px solid #7B2032' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7B2032', marginBottom: '5px', fontWeight: '600' }}>Contact</div>
              <a href="tel:5144373437" style={{ fontSize: '14px', color: '#7B2032', textDecoration: 'none', lineHeight: '1.4', display: 'block', fontWeight: '700', letterSpacing: '0.01em' }}>
                Jerry — 514-437-3437
              </a>
            </div>

            <div style={{ padding: '1.1rem 0', flex: '1 1 130px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Convoy App</div>
              <a
                href="https://apps.apple.com/ca/app/velox-drive-convoy-explore/id6754770506"
                target="_blank" rel="noreferrer"
                style={{ fontSize: '13px', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: '1.4', display: 'block' }}
              >
                Download Velox →
              </a>
              <div style={{ fontSize: '10px', color: '#bbb', marginTop: '3px' }}>iOS only</div>
            </div>

          </div>
        </div>

        {/* Route stops */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1.5rem' }}>Route</div>
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
                <div style={{ fontSize: '12px', color: '#999', marginTop: '2px', marginBottom: '10px' }}>{stop.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Map</div>
          <div className="map-wrap" style={{ overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)' }}>
            <RouteMap stops={STOPS} />
          </div>
        </div>

        {/* Who's coming */}
        <div style={{ padding: '2rem 0' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1.5rem' }}>
            Who&apos;s Coming — {REGISTRANTS.length} Cars
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1px',
            background: 'rgba(0,0,0,0.08)',
            border: '0.5px solid rgba(0,0,0,0.08)',
          }}>
            {REGISTRANTS.map((r, i) => (
              <div key={i} style={{ background: '#fff', overflow: 'hidden' }}>
                {r.photo ? (
                  <img src={r.photo} alt={r.car} style={{ width: '100%', height: '140px', objectFit: r.photoFit || 'cover', background: r.photoBg || 'transparent', display: 'block', transform: r.photoScale ? `scale(${r.photoScale})` : undefined }} />
                ) : (
                  <div style={{
                    height: '140px', background: '#f4f2ef',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                    <CarIcon />
                    {r.color ? <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)', letterSpacing: '0.08em' }}>{r.color}</div> : null}
                  </div>
                )}
                <div style={{ padding: '0.8rem 0.85rem' }}>
                  <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '600', marginBottom: '4px', lineHeight: '1.3' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>{r.car}</div>
                  {r.tag && <div style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#0F1E14', marginTop: '4px', fontWeight: '600' }}>{r.tag}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
