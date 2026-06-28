'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ROUTE_PATH } from './routePath'
import SiteFooter from '../../components/SiteFooter'
import PageLoader from '../../components/PageLoader'

const PASSWORD = 'eastern'

const PARTICIPANTS = [
  { name: 'Alain Sahakian',        car: '2023 Toyota Supra',                          photo: null },
  { name: 'Alex Boutin',           car: '2026 Audi RS6 Performance',                  photo: '/WTET/Alex-Boutin.jpeg' },
  { name: 'Fred Lefebvre',         car: '2020 Audi RS3',                              photo: '/WTET/Fred-Lefebvre.jpeg' },
  { name: 'Jean-Philippe Remon',   car: '2011 BMW 135i',                              photo: '/WTET/Jean-Philippe.png' },
  { name: 'Jerry',                 car: null,                                         photo: null },
  { name: 'Louis Guindon',         car: '2023 Genesis G70 3.3T',                      photo: '/WTET/Louis-Guindon.png' },
  { name: 'Louis Philippe Mauger', car: '2020 BMW M2 Compétition',                   photo: '/WTET/Louis-Mauger.jpg' },
  { name: 'Michel Robert',         car: '2008 Porsche Boxster',                       photo: null },
  { name: 'Tanya Ghingold',        car: '2012 Porsche 718 Cayman S Black Edition',   photo: '/WTET/Tanya-Ghingold.png' },
  { name: 'Yvon Maggi',            car: '2014 Porsche 911 Turbo S',                   photo: '/WTET/Yvon-Maggi.png' },
]

const MAP_MARKERS = [
  { label: 'Shell — Brossard', note: 'Meetup · Departure', start: true, lat: 45.4502, lng: -73.4440 },
  { label: 'Vignoble Domaine du Brésée', note: 'Sutton · Winery experience', lat: 45.1477, lng: -72.6133 },
  { label: 'Auberge & Restaurant McGowan', note: 'Georgeville · Final destination', end: true, lat: 45.1394, lng: -72.2554 },
]

const STOPS = [
  { label: 'Quartier Dix 30 Parking', note: 'Meetup — TBD · Brossard', start: true, href: 'https://maps.app.goo.gl/QKzfxTBGnkmLvMCL6', lat: 45.4619, lng: -73.4632 },
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
      <PageLoader images={['/wtet.png']} minMs={1500} />
      <style>{`
        .map-wrap { height: 320px; }
        @media (min-width: 640px) { .map-wrap { height: 480px; } }
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
              <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' }}>TBD · Quartier Dix 30</div>
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px' }}>Brossard, QC</div>
            </div>

            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 160px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem', borderTop: '2px solid #7B2032' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7B2032', marginBottom: '5px', fontWeight: '600' }}>Contact</div>
              <a href="tel:5144373437" style={{ fontSize: '14px', color: '#7B2032', textDecoration: 'none', lineHeight: '1.4', display: 'block', fontWeight: '700', letterSpacing: '0.01em' }}>
                Jerry — 514-437-3437
              </a>
              <CopyButton text="514-437-3437" />
            </div>

            <div style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 130px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem' }}>
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

            <div style={{ padding: '1.1rem 0', flex: '1 1 130px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Photography</div>
              <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4' }}>On-route coverage</div>
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px', lineHeight: '1.5' }}>Photos &amp; video captured throughout the day</div>
            </div>

          </div>
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
            We end at Auberge &amp; Restaurant McGowan in Georgeville for lunch on the lake. The chef has worked in kitchens that held two Michelin stars — the standard follows. From there, we&rsquo;ll take a call as a group on whether to take the backroads or the highway back to Montreal.
          </p>
        </div>

        {/* Who's Coming */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1.5rem' }}>
            Who&rsquo;s Coming &mdash; {PARTICIPANTS.length} Cars
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
            {PARTICIPANTS.map(p => (
              <div key={p.name}>
                {p.photo ? (
                  <a href={p.photo} target="_blank" rel="noreferrer" style={{ display: 'block', aspectRatio: '4/3', overflow: 'hidden', background: '#e8e4de', marginBottom: '0.55rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.25s ease' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </a>
                ) : (
                  <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#e8e4de', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.22)', letterSpacing: '0.04em' }}>
                      {p.name.split(' ').map(w => w[0]).join('')}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#1a1a1a', letterSpacing: '0.01em' }}>{p.name}</div>
                {p.car && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{p.car}</div>}
              </div>
            ))}
          </div>
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

        {/* Route stops */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>Route</div>
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
