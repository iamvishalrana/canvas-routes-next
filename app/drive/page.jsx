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
  { label: 'Aloe Cafe', note: 'Pointe-Claire — Final Destination', end: true, href: 'https://maps.app.goo.gl/szYVavrSxRoRWZoc6', lat: 45.4600, lng: -73.8353 },
]

const REGISTRANTS = [
  { name: 'Louis Guindon', car: '2023 Genesis G70 3.3T', color: 'Grey' },
  { name: 'Jean-Philippe Remon', car: '2011 BMW 135i', color: 'Grey' },
  { name: 'Julien Fernandez', car: '2005 Porsche 911 S Cab', color: 'Silver' },
  { name: 'Tanya Ghingold + Mark', car: '2012 Porsche Cayman S Black Edition 71/500', color: '' },
  { name: 'Frederic Lefebvre', car: '2020 Audi RS3', color: '' },
  { name: 'Marc-Antoine Sauvé', car: '2018 Audi Allroad A4', color: 'Gloss Steel Blue' },
  { name: 'Nicholas Kong', car: '2020 Subaru BRZ', color: 'Red' },
  { name: 'Alexandre Boutin', car: '2026 Audi RS6 Performance', color: '' },
  { name: 'Yvon Maggi', car: '2014 Porsche 911 Turbo S Cab', color: 'Black' },
  { name: 'Jerry', car: '2021 BMW 3 Series', color: 'White' },
]

function RouteMap({ stops }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    let cancelled = false

    import('@googlemaps/js-api-loader').then(({ Loader }) => {
      if (cancelled) return
      const loader = new Loader({ apiKey, version: 'weekly', libraries: ['marker'] })
      loader.load().then((google) => {
        if (cancelled || mapRef.current) return

        const bounds = new google.maps.LatLngBounds()
        stops.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }))

        const map = new google.maps.Map(containerRef.current, {
          mapTypeId: 'roadmap',
          disableDefaultUI: false,
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

        // Exact backroads route from KML
        new google.maps.Polyline({
          path: ROUTE_PATH,
          geodesic: true,
          strokeColor: '#0F1E14',
          strokeOpacity: 0.75,
          strokeWeight: 3,
          map,
        })

        // Markers
        stops.forEach((stop, i) => {
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
      })
    })

    return () => {
      cancelled = true
      mapRef.current = null
    }
  }, [stops])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
          <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{ width: '130px', marginBottom: '2.5rem', opacity: 0.9 }} />
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
      <div style={{ background: '#0F1E14', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{ width: '100px', display: 'block' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '15px' }}>Into the Laurentians</div>
          <div style={{ color: 'rgba(245,241,236,0.45)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>June 7, 2026</div>
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
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7B2032', marginBottom: '5px', fontWeight: '600' }}>Emergency</div>
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
                {/* Car placeholder — light with icon */}
                <div style={{
                  height: '110px', background: '#f4f2ef',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                  <CarIcon />
                  {r.color ? (
                    <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)', letterSpacing: '0.08em' }}>{r.color}</div>
                  ) : null}
                </div>
                <div style={{ padding: '0.8rem 0.85rem' }}>
                  <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '600', marginBottom: '4px', lineHeight: '1.3' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>{r.car}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
