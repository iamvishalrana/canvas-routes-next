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
  { name: 'Louis Guindon', car: '2023 Genesis G70 3.3T', color: 'Grey', photo: '/car-louis-guindon.png', desc: 'Twin-turbo V6 pushing 365hp in a chassis tuned for the driver — understated outside, serious where it counts.' },
  { name: 'Jean-Philippe Remon', nick: 'JP', car: '2011 BMW 135i', color: 'Grey', photo: '/car-jean-philippe.png', desc: 'N55 straight-six in the lightest BMW chassis of its era — and a turbo spool that makes you look twice every time.' },
  { name: 'Julien Fernandez', car: '2005 Porsche 911 S Cab', color: 'Silver', tag: '6FLAT', photo: '/car-julien-fernandez.jpeg', desc: 'Naturally aspirated flat-six at its finest — the 997 generation before Porsche turbocharged everything.' },
  { name: 'Tanya Ghingold', car: '2012 Porsche Cayman S Black Edition 71/500', color: '', photo: '/car-tanya-ghingold.jpg', photoFit: 'contain', photoBg: '#1a1a1a', desc: '1 of 500 built worldwide — factory Black Edition with a mid-engine flat-six Porsche deliberately kept beneath 911 spec.' },
  { name: 'Frederic Lefebvre', car: '2020 Audi RS3', color: '', photo: null, desc: '400hp five-cylinder turbo with a spool that sounds like nothing else on the road — one of Audi\'s most characterful engines.' },
  { name: 'Marc-Antoine Sauvé', car: '2018 Audi Allroad A4', color: 'Gloss Steel Blue', photo: '/car-marc-antoine-sauve.jpg', desc: 'Full-body gloss steel blue PPF, H&R coilovers, and an upgraded rear sway bar — a properly sorted sporty wagon that earns every head turn.' },
  { name: 'Nicholas Kong', car: '2020 Subaru BRZ', color: 'Red', photo: '/car-nicholas-kong.jpeg', desc: 'Rear-wheel drive, naturally aspirated, under 2,800 lbs — built purely for the corner, not the straight.' },
  { name: 'Alexandre Boutin', car: '2026 Audi RS6 Performance', color: '', photo: '/car-alexandre-boutin.jpeg', desc: '630hp twin-turbo V8 in a full-size wagon — the most capable family car Audi has ever built.' },
  { name: 'Yvon Maggi', car: '2014 Porsche 911 Turbo S Cab', color: 'Black', photo: '/car-yvon-maggi.jpeg', desc: '560hp, all-wheel drive, roof down — Porsche\'s Turbo S proves savage performance and open-air driving aren\'t mutually exclusive.' },
  { name: 'Jerry', car: '2021 BMW 3 Series', color: 'White', photo: '/car-jerry.jpeg', desc: 'Perfect 50:50 weight distribution, every option selected — the benchmark sport sedan exactly as it should be.' },
]

function CopyButton({ text, label, dark }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      style={{
        background: 'none',
        border: `0.5px solid ${dark ? 'rgba(245,241,236,0.25)' : 'rgba(0,0,0,0.18)'}`,
        padding: '3px 10px', fontSize: '9px', letterSpacing: '0.12em',
        textTransform: 'uppercase', cursor: 'pointer',
        color: dark ? (copied ? '#c5a882' : 'rgba(245,241,236,0.6)') : (copied ? '#3B6B2F' : '#888'),
        transition: 'color 0.2s, border-color 0.2s',
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function CarPlaceholder({ color, name }) {
  const isFrederic = name === 'Frederic Lefebvre'
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('pw', 'laurentians')
    const res = await fetch('/api/drive/upload-photo', { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) setUploaded(true)
  }

  return (
    <div style={{ height: '140px', background: '#f4f2ef', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative' }}>
      <CarIcon />
      {color ? <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.3)', letterSpacing: '0.08em' }}>{color}</div> : null}
      {isFrederic && !uploaded && (
        <>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ marginTop: '4px', background: 'none', border: '0.5px solid rgba(0,0,0,0.2)', padding: '3px 10px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', color: '#666' }}
          >
            {uploading ? 'Uploading…' : '+ Add Photo'}
          </button>
        </>
      )}
      {isFrederic && uploaded && (
        <div style={{ fontSize: '10px', color: '#3B6B2F', letterSpacing: '0.08em' }}>✓ Uploaded — refresh to see</div>
      )}
    </div>
  )
}

function Lightbox({ src, alt, name, car, desc, onClose }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [src, onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.93)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)',
      }}
    >
      <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1.25rem', background: 'none', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer', lineHeight: 1, opacity: 0.7 }}>✕</button>
      <img
        key={src}
        src={src}
        alt={alt}
        loading="eager"
        decoding="sync"
        onClick={e => e.stopPropagation()}
        onContextMenu={e => e.preventDefault()}
        onLoad={() => setLoaded(true)}
        draggable={false}
        style={{
          maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain',
          userSelect: 'none', WebkitUserSelect: 'none', display: 'block',
          opacity: loaded ? 1 : 0, transition: 'opacity 0.2s',
          WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)',
        }}
      />
      {!loaded && <div style={{ position: 'absolute', color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '0.1em' }}>Loading…</div>}
      <div onClick={e => e.stopPropagation()} style={{ marginTop: '1.25rem', textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, serif', fontSize: '16px', marginBottom: '0.4rem' }}>{name}</div>
        <div style={{ color: 'rgba(245,241,236,0.5)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>{car}</div>
        {desc && <div style={{ color: 'rgba(245,241,236,0.75)', fontSize: '13px', lineHeight: '1.7', fontStyle: 'italic' }}>{desc}</div>}
      </div>
    </div>
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
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    const urlPw = new URLSearchParams(window.location.search).get('pw')
    if (urlPw?.toLowerCase() === PASSWORD) { setAuthed(true); setChecked(true); return }
    if (localStorage.getItem('drive_auth') === '1') { setAuthed(true) }
    setChecked(true)
  }, [])

  function submit(e) {
    e.preventDefault()
    if (pw.toLowerCase().trim() === PASSWORD) {
      localStorage.setItem('drive_auth', '1')
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
      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} name={lightbox.name} car={lightbox.car} desc={lightbox.desc} onClose={() => setLightbox(null)} />}
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
          <img src="/white-outline.png" alt="Canvas Routes" style={{ width: '210px', display: 'block', margin: '0 auto 1.5rem' }} />
          <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '28px', letterSpacing: '0.01em', lineHeight: '1.2' }}>Into the Laurentians</div>
          <div style={{ color: 'rgba(245,241,236,0.6)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '0.6rem' }}>June 7, 2026</div>
        </div>
      </div>

      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>

        {/* Quick info */}
        <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 120px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Meetup</div>
              <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' }}>7:00am · Petinos, LaSalle</div>
            </div>

            {/* Emergency — prominent red */}
            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 160px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem', borderTop: '2px solid #7B2032' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7B2032', marginBottom: '5px', fontWeight: '600' }}>Contact</div>
              <a href="tel:5144373437" style={{ fontSize: '14px', color: '#7B2032', textDecoration: 'none', lineHeight: '1.4', display: 'block', fontWeight: '700', letterSpacing: '0.01em' }}>
                Jerry — 514-437-3437
              </a>
              <CopyButton text="514-437-3437" label="Copy number" />
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

        {/* Ziptrek discount */}
        <div style={{ padding: '1.75rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Exclusive Perk</div>
          <div style={{ background: '#0F1E14', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, serif', fontSize: '16px' }}>Ziptrek Ecotours</div>
              <div style={{ color: '#c5a882', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>20% Off</div>
            </div>
            <div style={{ color: 'rgba(245,241,236,0.6)', fontSize: '12px', lineHeight: '1.6' }}>
              Falcon Adventure at Mont-Tremblant. Book online or over the phone with code below — let Jerry know if you book.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, serif', fontSize: '20px', letterSpacing: '0.08em' }}>CANVASR20</div>
              <CopyButton text="CANVASR20" label="Copy code" dark />
            </div>
            <a
              href="https://tremblant.ziptrek.com/en_US/"
              target="_blank"
              rel="noreferrer"
              style={{ marginTop: '0.25rem', display: 'inline-block', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(245,241,236,0.3)' }}
            >
              Book Online →
            </a>
          </div>
        </div>

        {/* Who's coming */}
        <div style={{ padding: '2rem 0' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1.5rem' }}>
            Who&apos;s Coming — {REGISTRANTS.length} Cars · 1 Camera
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
                  <img
                    src={r.photo} alt={r.car}
                    onClick={() => setLightbox({ src: r.photo, alt: r.car, name: r.name, car: r.car, desc: r.desc })}
                    onContextMenu={e => e.preventDefault()}
                    draggable={false}
                    style={{ width: '100%', height: '140px', objectFit: r.photoFit || 'cover', background: r.photoBg || 'transparent', display: 'block', transform: r.photoScale ? `scale(${r.photoScale})` : undefined, cursor: 'zoom-in', userSelect: 'none', WebkitUserSelect: 'none' }}
                  />
                ) : (
                  <CarPlaceholder color={r.color} name={r.name} />
                )}
                <div style={{ padding: '0.8rem 0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '600', lineHeight: '1.3' }}>{r.name}</div>
                    {r.nick && <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.06em' }}>({r.nick})</div>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.5' }}>{r.car}</div>
                  {r.tag && <div style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#0F1E14', marginTop: '4px', fontWeight: '600' }}>{r.tag}</div>}
                  {!r.photo && r.desc && <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.6', marginTop: '6px', fontStyle: 'italic' }}>{r.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Photographer */}
        <div style={{ padding: '1.5rem 0', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb' }}>Shot by</div>
          <a
            href="https://www.instagram.com/jidhin_paul?igsh=MTA3czU2dGZsc28wbg=="
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '13px', color: '#1a1a1a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
            <span>Jidhin Paul</span>
            <span style={{ color: '#bbb', fontSize: '11px' }}>@jidhin_paul</span>
          </a>
        </div>

      </div>
    </div>
  )
}
