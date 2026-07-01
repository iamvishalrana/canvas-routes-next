'use client'
import { useState, useEffect, useRef } from 'react'
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
  { label: 'Shell — 8700 Boul. Leduc', note: '10:00 AM · Brossard', tag: 'Meetup & Departure', start: true, href: 'https://maps.app.goo.gl/Ye8mVsi15rwcgGWj7', lat: 45.4502, lng: -73.4440 },
  { label: 'Vignoble Domaine du Brésée', note: 'Sutton', tag: 'Private Winery Experience', href: 'https://maps.app.goo.gl/CcVDgmpEdRHK6c7L6', lat: 45.1477, lng: -72.6133 },
  { label: 'Sutton', note: 'Chemin des Cantons · Rolling through', href: 'https://www.google.com/maps?q=45.1038,-72.5544', lat: 45.1038, lng: -72.5544 },
  { label: 'Glen Sutton', note: 'Chemin des Cantons · Mountain roads', href: 'https://www.google.com/maps?q=45.0539,-72.5245', lat: 45.0539, lng: -72.5245 },
  { label: 'Highwater', note: 'Chemin des Cantons · Near the border', href: 'https://www.google.com/maps?q=45.0053,-72.4400', lat: 45.0053, lng: -72.4400 },
  { label: 'Austin', note: 'Chemin des Cantons · Lake Memphrémagog area', href: 'https://www.google.com/maps?q=45.1863,-72.2440', lat: 45.1863, lng: -72.2440 },
  { label: 'Magog', note: 'Chemin des Cantons · Lake view', href: 'https://www.google.com/maps?q=45.2679,-72.1493', lat: 45.2679, lng: -72.1493 },
  { label: 'Auberge & Restaurant McGowan', note: 'Georgeville', tag: 'Lakeside Lunch', end: true, href: 'https://maps.app.goo.gl/fsWhM2GNVLoG55ar9', lat: 45.1394, lng: -72.2554 },
]

const SECTION_LABEL = { fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', display: 'block', fontWeight: '400', fontStyle: 'normal' }

const T = {
  en: {
    date: 'Sunday · July 5, 2026',
    headerTags: ['Chemin des Cantons', 'Vineyard Stop', 'Lakeside Lunch'],
    meetup: 'Meetup', meetupDetail: '10:00 AM · Shell — 8700 Boul. Leduc', meetupSub: 'Brossard, QC',
    contact: 'Contact',
    appLabel: 'Convoy App', appLink: 'Download Velox →', appSub: 'Stay connected in real time · iOS only',
    itineraryLabel: 'Itinerary', itineraryHint: 'Tap a stop to open in Maps',
    stopNotes: ['10:00 AM · Brossard', 'Sutton', 'Chemin des Cantons · Rolling through', 'Chemin des Cantons · Mountain roads', 'Chemin des Cantons · Near the border', 'Chemin des Cantons · Lake Memphrémagog area', 'Chemin des Cantons · Lake view', 'Georgeville'],
    stopTags: ['Meetup & Departure', 'Private Winery Experience', null, null, null, null, null, 'Lakeside Lunch'],
    driveLabel: 'The Drive',
    driveBullets: [
      { emoji: '🛣️', text: 'We roll out of Brossard on Autoroute 10 East, exit at Farnham, and head south — windows down, convoy forming.' },
      { emoji: '🍷', text: 'First stop is Vignoble Domaine du Brésée in Frelighsburg. Cars on the grounds, a private winery experience, and an exclusive $10 off every 3 bottles for our group.' },
      { emoji: '⛰️', text: 'Then we hit Chemin des Cantons — tight corners through the Sutton Mountains, deep into the forest at Glen Sutton and Highwater. Some of the best pavement in Quebec with almost no traffic. This is the part everyone talks about.' },
      { emoji: '🏔️', text: 'Coming through Austin, the trees open and Lake Memphrémagog appears below. Take it in — it\'s earned.' },
      { emoji: '🍽️', text: 'We finish at Auberge & Restaurant McGowan in Georgeville for lunch on the lake. The chef comes from Michelin-starred kitchens — the food matches the drive.' },
      { emoji: '🏁', text: 'After lunch, the group decides together — backroads home or straight back on the highway. Either way, a good day.' },
    ],
    wineryLabel: 'Winery Stop', wineryVenue: 'Vignoble Domaine du Brésée · Sutton',
    wineryHeadline: '$10 off every 3 wine bottles',
    wineryBody: 'Canvas Routes participants get an exclusive discount on wine bottle purchases at the winery. Buy any 3 wine bottles and take $10 off. Vignoble Domaine du Brésée has earned numerous awards for their wines. Cash or card accepted on site.',
    photoLabel: 'Photography', photoBody: 'On-route photos and video captured throughout the day.',
    whoLabel: n => `Who's Coming — ${n} Cars · 3 Groups + Media`,
    groupsExplain: 'With 20 cars on the road, running as a single convoy isn\'t safe or practical — it creates gaps at lights, puts strain on slower traffic, and makes it impossible to keep everyone together on tight sections. We\'re splitting into three groups of 6–7, departing 5 minutes apart. Each group runs as its own self-contained convoy with a designated lead car.',
    groupRulesLabel: 'Group Rules',
    groupRules: ['Stay with your group for the entire drive — do not switch groups on route.', 'Depart in group order. Wait for the group ahead to fully clear before your group moves.', 'No racing between groups. If you catch the group ahead, hold your position and maintain the gap.', 'Do not race or push within the group either — this is a scenic drive, not a track day.', 'If your group gets split, pull over safely at the nearest stop and wait to regroup.', 'Group leads set the pace — follow the car directly in front of you and trust the flow.'],
    tapHint: 'Tap a photo to learn more about the car',
    groupLabel: (g, n) => `Group ${g} — ${n} Cars`, groupLead: 'Group Lead',
    convoyLabel: 'Convoy Rules', convoyRead: '▼ Read', convoyClose: '▲ Close',
    convoyRules: ['Follow the lead car at all times — do not overtake any car in the convoy.', 'Maintain a safe following distance. Stay close enough to keep the group together, not so close that you can\'t react.', 'Obey all traffic laws. Speed limits, signals, and road signs apply regardless of group pace.', 'If you get separated, do not panic — proceed to the next stop on the route and wait.', 'Do not race, push, or drive aggressively. This is a scenic drive, not a track day.', 'If you need to stop urgently, hazard lights on immediately. The car behind will relay the signal forward.', 'Fuel up at the Shell in Brossard before we depart — there are limited options once we hit the backroads.', 'Respect the roads and the communities we pass through.', 'Give way to the media car at all times — it may move between groups to capture footage. Do not block or race it.'],
    mapLabel: 'Map', modalBrand: 'Canvas Routes · Whips to Eastern Townships 2026',
    scrollText: 'scroll', participantsOnly: 'Participants only', incorrectPw: 'Incorrect password — try again', enterBtn: 'Enter', copyBtn: 'Copy number', copied: '✓ Copied',
  },
  fr: {
    date: 'Dimanche · 5 juillet 2026',
    headerTags: ['Chemin des Cantons', 'Arrêt au vignoble', 'Déjeuner au lac'],
    meetup: 'Rendez-vous', meetupDetail: '10h00 · Shell — 8700 Boul. Leduc', meetupSub: 'Brossard, QC',
    contact: 'Contact',
    appLabel: 'App Convoi', appLink: 'Télécharger Velox →', appSub: 'Restez connectés en temps réel · iOS seulement',
    itineraryLabel: 'Itinéraire', itineraryHint: 'Appuyez sur un arrêt pour ouvrir dans Maps',
    stopNotes: ['10h00 · Brossard', 'Sutton', 'Chemin des Cantons · En transit', 'Chemin des Cantons · Routes de montagne', 'Chemin des Cantons · Près de la frontière', 'Chemin des Cantons · Région du lac Memphrémagog', 'Chemin des Cantons · Vue sur le lac', 'Georgeville'],
    stopTags: ['Rassemblement & Départ', 'Expérience vignoble privée', null, null, null, null, null, 'Déjeuner au bord du lac'],
    driveLabel: 'La Route',
    driveBullets: [
      { emoji: '🛣️', text: 'On quitte Brossard par l\'Autoroute 10 Est, on sort à Farnham et on met le cap au sud — vitres baissées, le convoi se forme.' },
      { emoji: '🍷', text: 'Premier arrêt au Vignoble Domaine du Brésée à Frelighsburg. Voitures sur les lieux, expérience vignoble privée, et un rabais exclusif de 10 $ pour tout achat de 3 bouteilles.' },
      { emoji: '⛰️', text: 'On s\'engage ensuite sur le Chemin des Cantons — virages serrés dans les montagnes de Sutton, au cœur de la forêt à Glen Sutton et Highwater. Du bitume parmi les meilleurs au Québec, avec quasi zéro circulation. C\'est la partie dont tout le monde parle.' },
      { emoji: '🏔️', text: 'En approchant d\'Austin, la forêt s\'ouvre et le lac Memphrémagog apparaît en contrebas. Profitez-en — vous l\'avez mérité.' },
      { emoji: '🍽️', text: 'On termine à l\'Auberge & Restaurant McGowan à Georgeville pour le déjeuner au bord du lac. Le chef vient de cuisines étoilées Michelin — la bouffe est à la hauteur du trajet.' },
      { emoji: '🏁', text: 'Après le repas, le groupe décide ensemble — retour par les chemins de campagne ou directement par l\'autoroute. Dans tous les cas, une belle journée.' },
    ],
    wineryLabel: 'Arrêt au Vignoble', wineryVenue: 'Vignoble Domaine du Brésée · Sutton',
    wineryHeadline: '10 $ de rabais pour 3 bouteilles de vin',
    wineryBody: 'Les participants Canvas Routes bénéficient d\'un rabais exclusif sur les achats de bouteilles de vin au vignoble. Achetez 3 bouteilles et obtenez 10 $ de rabais. Le Vignoble Domaine du Brésée a remporté de nombreux prix pour ses vins. Paiement comptant ou par carte accepté sur place.',
    photoLabel: 'Photographie', photoBody: 'Photos et vidéos captées tout au long de la journée sur la route.',
    whoLabel: n => `Qui vient — ${n} voitures · 3 groupes + Média`,
    groupsExplain: 'Avec 20 voitures sur la route, rouler en un seul convoi n\'est ni sécuritaire ni pratique — ça crée des écarts aux feux, met de la pression sur la circulation et rend impossible de garder tout le monde ensemble dans les sections serrées. On se divise en trois groupes de 6 à 7, avec 5 minutes d\'écart entre chaque départ. Chaque groupe forme son propre convoi avec une voiture de tête désignée.',
    groupRulesLabel: 'Règles des groupes',
    groupRules: ['Restez avec votre groupe pour toute la durée du trajet — pas de changement de groupe en route.', 'Départ dans l\'ordre des groupes. Attendez que le groupe précédent soit complètement parti avant de bouger.', 'Pas de course entre les groupes. Si vous rattrapez le groupe devant, maintenez votre position et gardez la distance.', 'Pas de course non plus à l\'intérieur du groupe — c\'est une balade, pas une journée sur circuit.', 'Si votre groupe se sépare, arrêtez-vous en sécurité au prochain arrêt et attendez de vous regrouper.', 'Les chefs de groupe donnent le rythme — suivez la voiture directement devant vous et faites confiance au flux.'],
    tapHint: 'Appuyez sur une photo pour en savoir plus sur la voiture',
    groupLabel: (g, n) => `Groupe ${g} — ${n} voitures`, groupLead: 'Chef de groupe',
    convoyLabel: 'Règles du convoi', convoyRead: '▼ Lire', convoyClose: '▲ Fermer',
    convoyRules: ['Suivez toujours la voiture de tête — ne dépassez aucune voiture dans le convoi.', 'Maintenez une distance de sécurité. Restez assez proche pour garder le groupe ensemble, sans être si proche que vous ne pouvez pas réagir.', 'Respectez le code de la route. Les limites de vitesse, les signaux et les panneaux s\'appliquent peu importe le rythme du groupe.', 'Si vous vous retrouvez séparé, ne paniquez pas — rendez-vous au prochain arrêt de l\'itinéraire et attendez.', 'Ne faites pas la course et ne conduisez pas de manière agressive. C\'est une balade, pas une journée sur circuit.', 'Si vous devez vous arrêter d\'urgence, allumez immédiatement vos feux de détresse. La voiture derrière relayera le signal.', 'Faites le plein au Shell de Brossard avant le départ — les options sont limitées sur les routes secondaires.', 'Respectez les routes et les communautés que vous traversez.', 'Cédez toujours la place à la voiture média — elle peut se déplacer entre les groupes pour filmer. Ne la bloquez pas.'],
    mapLabel: 'Carte', modalBrand: 'Canvas Routes · Whips to Eastern Townships 2026',
    scrollText: 'défiler', participantsOnly: 'Participants seulement', incorrectPw: 'Mot de passe incorrect — réessayez', enterBtn: 'Entrer', copyBtn: 'Copier le numéro', copied: '✓ Copié',
  },
}

function CopyButton({ text, copyLabel, copiedLabel }) {
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
      {copied ? copiedLabel : copyLabel}
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
  const [groupsOpen, setGroupsOpen] = useState([true, true, true])
  const [atBottom, setAtBottom] = useState(false)
  const [lang, setLang] = useState('en')
  const t = T[lang]

  useEffect(() => {
    function onScroll() {
      setAtBottom(window.innerHeight + window.scrollY >= document.body.scrollHeight - 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll-triggered reveal animations
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
      <div style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', fontFamily: 'sans-serif' }}>
        <style>{`
          @media (max-width: 640px) { .pw-half { flex: 1 1 100% !important; min-height: 45vh !important; } }
        `}</style>
        {/* Left — beige */}
        <div className="pw-half" style={{ flex: '1 1 50%', minHeight: '50vh', background: '#F5F1EC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2.5rem', textAlign: 'center', position: 'relative', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '0.5px', background: 'rgba(0,0,0,0.08)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{ width: '140px', marginBottom: '2.5rem', opacity: 0.88 }} />
          <h1 style={{ color: '#0F1E14', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '22px', lineHeight: '1.25', marginBottom: '0.5rem', fontWeight: '400' }}>Whips to Eastern Townships</h1>
          <p style={{ color: '#999', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>Sunday · July 5, 2026</p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.75rem' }}>
            {['Chemin des Cantons', 'Vineyard Stop', 'Lakeside Lunch'].map(tag => (
              <span key={tag} style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', border: '0.5px solid rgba(0,0,0,0.12)', padding: '3px 10px' }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Right — dark green */}
        <div className="pw-half" style={{ flex: '1 1 50%', minHeight: '50vh', background: '#0F1E14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2.5rem', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: '300px' }}>
            <p style={{ color: 'rgba(197,168,130,0.6)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: '1.75rem', textAlign: 'center', margin: '0 0 1.75rem' }}>{t.participantsOnly}</p>
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
                    background: 'rgba(255,255,255,0.05)',
                    border: `0.5px solid ${err ? '#7B2032' : 'rgba(255,255,255,0.14)'}`,
                    color: '#F5F1EC', fontSize: '16px', outline: 'none',
                    fontFamily: 'Georgia, serif',
                    textAlign: 'center', letterSpacing: '0.12em',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.35)', fontSize: '11px', letterSpacing: '0.06em', fontFamily: 'sans-serif' }}
                >
                  {showPw ? 'hide' : 'show'}
                </button>
              </div>
              {err && <p style={{ color: '#c5a882', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '0.75rem', textAlign: 'center' }}>{t.incorrectPw}</p>}
              <button
                type="submit"
                style={{ width: '100%', padding: '0.9rem', background: '#c5a882', color: '#0F1E14', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: '700' }}
              >
                {t.enterBtn}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'sans-serif', color: '#1a1a1a' }}>
      <PageLoader images={['/wtet.png', ...PARTICIPANTS.filter(p => p.photo).map(p => p.photo)]} minMs={2000} />

      {/* Language toggle */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, display: 'flex', background: '#0F1E14', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        {['en', 'fr'].map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ padding: '0.45rem 0.75rem', background: lang === l ? '#c5a882' : 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: lang === l ? '#0F1E14' : 'rgba(197,168,130,0.55)', fontWeight: lang === l ? '700' : '400', fontFamily: 'sans-serif', transition: 'all 0.15s ease' }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Scroll indicator */}
      <button
        className="scroll-btn"
        style={{ opacity: atBottom ? 0 : 1, pointerEvents: atBottom ? 'none' : 'auto' }}
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })}
        aria-label="Scroll down"
      >
        <span style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.8)', fontFamily: 'sans-serif' }}>{t.scrollText}</span>
        <svg className="scroll-chevron" width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 1.5L8 8.5L15 1.5" stroke="#c5a882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <style>{`
        /* Android/cross-browser base */
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button, a { touch-action: manipulation; }
        input { -webkit-appearance: none; appearance: none; border-radius: 0; }

        .map-wrap { height: 320px; }
        @media (min-width: 640px) { .map-wrap { height: 480px; } }

        /* Scroll-triggered reveal */
        .scroll-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .scroll-reveal.revealed { opacity: 1; transform: translateY(0); }

        /* Car card — shake on wrapper only, button/image never inside a changing compositing layer */
        .car-wrap { animation: car-nudge 10s ease-in-out infinite; }
        .car-wrap:nth-child(2) { animation-delay: 1.2s; }
        .car-wrap:nth-child(3) { animation-delay: 2.4s; }
        .car-wrap:nth-child(4) { animation-delay: 3.6s; }
        .car-wrap:nth-child(5) { animation-delay: 4.8s; }
        .car-wrap:nth-child(6) { animation-delay: 6.0s; }
        .car-wrap:nth-child(7) { animation-delay: 7.2s; }
        .car-wrap:hover, .car-wrap:focus-within { animation-play-state: paused; }
        .car-card { transition: box-shadow 0.2s ease; }
        .car-card:hover, .car-card:active { box-shadow: 0 10px 28px rgba(0,0,0,0.14) !important; }
        .car-card .car-img { transition: transform 0.3s ease; }
        .car-card:hover .car-img, .car-card:active .car-img { transform: scale(1.04); }
        @keyframes car-nudge {
          0%, 90%, 100% { transform: translateY(0) rotate(0deg); }
          92% { transform: translateY(-3px) rotate(-1.2deg); }
          94% { transform: translateY(1px) rotate(1deg); }
          96% { transform: translateY(-2px) rotate(-0.6deg); }
          98% { transform: translateY(0) rotate(0deg); }
        }

        /* Scroll indicator */
        .scroll-btn { position: fixed; right: 1.25rem; bottom: 1.75rem; z-index: 50; display: flex; flex-direction: column; align-items: center; gap: 6px; background: #0F1E14; border: none; padding: 0.75rem 0.9rem 0.65rem; cursor: pointer; transition: opacity 0.4s ease, box-shadow 0.2s ease; box-shadow: 0 4px 18px rgba(0,0,0,0.22); pointer-events: auto; }
        .scroll-btn:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
        @keyframes bounce-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        .scroll-chevron { animation: bounce-down 1.6s ease-in-out infinite; }

        /* Mobile quick info stacking */
        @media (max-width: 480px) {
          .quick-info-item { border-right: none !important; margin-right: 0 !important; border-bottom: 0.5px solid rgba(0,0,0,0.08); padding-right: 0 !important; }
          .quick-info-item:last-child { border-bottom: none; }
        }

        /* Password page — stack halves on mobile */
        @media (max-width: 640px) {
          .pw-half { flex: 1 1 100% !important; min-height: 45vh !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'relative', padding: '3.5rem 1.25rem 3rem', textAlign: 'center',
        backgroundImage: 'url(/wtet.png)', backgroundSize: 'cover', backgroundPosition: 'center',
        overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(15,30,20,0.88) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" style={{ width: '210px', display: 'block', margin: '0 auto 1.5rem' }} />
          <h1 style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '28px', letterSpacing: '0.01em', lineHeight: '1.2', margin: 0, fontWeight: '400' }}>Whips to Eastern Townships</h1>
          <p style={{ color: 'rgba(245,241,236,0.6)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: '0.6rem', marginBottom: 0 }}>{t.date}</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.5rem' }}>
            {t.headerTags.map(tag => (
              <span key={tag} style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '4px 12px' }}>{tag}</span>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '740px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>

        {/* Quick info */}
        <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div className="quick-info-item" style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 140px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem' }}>
              <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>{t.meetup}</h2>
              <p style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.4', margin: 0 }}>{t.meetupDetail}</p>
              <p style={{ fontSize: '11px', color: '#bbb', marginTop: '3px', marginBottom: 0 }}>{t.meetupSub}</p>
            </div>
            <div className="quick-info-item" style={{ padding: '1.1rem 1rem 1.1rem 0', flex: '1 1 160px', borderRight: '0.5px solid rgba(0,0,0,0.1)', marginRight: '1rem', borderTop: '2px solid #7B2032' }}>
              <h2 style={{ ...SECTION_LABEL, color: '#7B2032', marginBottom: '5px', fontWeight: '600' }}>{t.contact}</h2>
              <a href="tel:5144373437" style={{ fontSize: '14px', color: '#7B2032', textDecoration: 'none', lineHeight: '1.4', display: 'block', fontWeight: '700', letterSpacing: '0.01em' }}>
                Jerry — 514-437-3437
              </a>
              <CopyButton text="514-437-3437" copyLabel={t.copyBtn} copiedLabel={t.copied} />
            </div>
            <div className="quick-info-item" style={{ padding: '1.1rem 0', flex: '1 1 130px' }}>
              <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>{t.appLabel}</h2>
              <a
                href="https://apps.apple.com/ca/app/velox-drive-convoy-explore/id6754770506"
                target="_blank" rel="noreferrer"
                style={{ fontSize: '13px', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: '1.4', display: 'block', fontWeight: '700' }}
              >
                {t.appLink}
              </a>
              <p style={{ fontSize: '10px', color: '#bbb', marginTop: '3px', lineHeight: '1.5', marginBottom: 0 }}>{t.appSub}</p>
            </div>
          </div>
        </div>

        {/* Itinerary */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>{t.itineraryLabel}</h2>
            <p style={{ fontSize: '10px', color: '#bbb', fontStyle: 'italic', margin: 0 }}>{t.itineraryHint}</p>
          </div>
          {STOPS.map((stop, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '14px' }}>
                <div style={{
                  width: stop.start || stop.end ? '10px' : '8px',
                  height: stop.start || stop.end ? '10px' : '8px',
                  borderRadius: stop.start || stop.end ? '0' : '50%',
                  background: stop.start ? '#3B6B2F' : stop.end ? '#0F1E14' : 'rgba(0,0,0,0.22)',
                  marginTop: '5px', flexShrink: 0,
                }} />
                {i < STOPS.length - 1 && (
                  <div style={{ width: '1px', flexGrow: 1, minHeight: '44px', background: 'rgba(0,0,0,0.1)', marginTop: '4px' }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: stop.tag ? 0 : '10px' }}>
                <a
                  href={stop.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '15px', color: '#1a1a1a',
                    fontWeight: stop.start || stop.end ? '600' : '400',
                    lineHeight: '1.35', textDecoration: 'underline',
                    textUnderlineOffset: '3px', textDecorationColor: 'rgba(0,0,0,0.22)',
                    display: 'block',
                  }}
                >
                  {stop.label}
                </a>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '2px', marginBottom: t.stopTags[i] ? '5px' : '10px' }}>
                  {t.stopNotes[i]}
                </p>
                {t.stopTags[i] && (
                  <div style={{ display: 'inline-block', marginBottom: '10px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.4)', padding: '2px 8px' }}>
                    {t.stopTags[i]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* The Drive */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>{t.driveLabel}</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {t.driveBullets.map(({ emoji, text }, i) => (
              <li key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{emoji}</span>
                <span style={{ fontSize: '14px', color: '#444', lineHeight: '1.75' }}>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Winery pricing */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>{t.wineryLabel}</h2>
          <div style={{ background: '#0F1E14', padding: '1.5rem 1.75rem', boxShadow: '0 6px 24px rgba(0,0,0,0.22)' }}>
            <p style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '0.6rem', marginTop: 0 }}>{t.wineryVenue}</p>
            <p style={{ fontFamily: 'Georgia, Times New Roman, serif', fontSize: '1.2rem', color: '#F5F1EC', fontWeight: '400', lineHeight: '1.3', marginBottom: '0.75rem', marginTop: 0 }}>
              {t.wineryHeadline}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(245,241,236,0.55)', lineHeight: '1.75', margin: 0 }}>
              {t.wineryBody}
            </p>
          </div>
        </section>

        {/* Photography */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '5px' }}>{t.photoLabel}</h2>
          <p style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: '1.6', margin: 0 }}>{t.photoBody}</p>
        </section>

        {/* Who's Coming */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>
            {t.whoLabel(PARTICIPANTS.length + 1)}
          </h2>

          <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.8', margin: '0 0 1.25rem' }}>
            {t.groupsExplain}
          </p>

          {/* Group rules */}
          <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem 1.25rem', marginBottom: '2rem', borderLeft: '2px solid rgba(0,0,0,0.08)', boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
            <h3 style={{ ...SECTION_LABEL, marginBottom: '0.75rem' }}>{t.groupRulesLabel}</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {t.groupRules.map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ color: '#c5a882', fontSize: '10px', fontWeight: '600', flexShrink: 0, paddingTop: '2px' }}>—</span>
                  <span style={{ fontSize: '12px', color: '#555', lineHeight: '1.65' }}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Grouped car grids */}
          {[1, 2, 3].map((g, idx) => {
            const groupCars = PARTICIPANTS.filter(p => p.group === g).sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0))
            const isOpen = groupsOpen[idx]
            return (
              <div key={g} style={{ marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setGroupsOpen(prev => prev.map((v, i) => i === idx ? !v : v))}
                  aria-expanded={isOpen}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', background: 'none', border: 'none', padding: '0.5rem 0', cursor: 'pointer', marginBottom: isOpen ? '0.75rem' : 0 }}
                >
                  <h3 style={{ ...SECTION_LABEL, whiteSpace: 'nowrap', margin: 0 }}>
                    {t.groupLabel(g, groupCars.length)}
                  </h3>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.1)' }} />
                  <span aria-hidden="true" style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <p style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.04em', margin: '0 0 1rem' }}>{t.tapHint}</p>
                )}
                {isOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                    {groupCars.map(p => (
                      <div key={p.name} className="car-wrap">
                      <button type="button" onClick={() => setSelectedCar(p)}
                        className="car-card"
                        aria-label={`${p.name} — ${p.car}`}
                        style={{ background: '#fff', border: 'none', padding: '0', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 10px rgba(0,0,0,0.09)', width: '100%' }}>
                        <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#e8e4de', position: 'relative' }}>
                          {p.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photo} alt={`${p.name}'s ${p.car}`} className="car-img" style={{ width: '100%', height: '100%', objectFit: p.containPhoto ? 'contain' : 'cover', display: 'block' }} />
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
                            <p style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', margin: '0 0 3px' }}>{t.groupLead}</p>
                          )}
                          <p style={{ fontSize: '12px', color: '#1a1a1a', letterSpacing: '0.01em', margin: 0 }}>{p.name}</p>
                          {p.car && <p style={{ fontSize: '11px', color: '#999', marginTop: '2px', marginBottom: 0 }}>{p.car}</p>}
                        </div>
                      </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

        </section>

        {/* Convoy Rules */}
        <section className="scroll-reveal" style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <button
            onClick={() => setRulesOpen(o => !o)}
            aria-expanded={rulesOpen}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <h2 style={{ ...SECTION_LABEL, margin: 0 }}>{t.convoyLabel}</h2>
            <span aria-hidden="true" style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em' }}>{rulesOpen ? t.convoyClose : t.convoyRead}</span>
          </button>
          {rulesOpen && (
            <ol style={{ margin: '1.25rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {t.convoyRules.map((rule, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ color: '#c5a882', fontSize: '11px', fontWeight: '600', flexShrink: 0, paddingTop: '2px' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: '13px', color: '#444', lineHeight: '1.6' }}>{rule}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Map */}
        <section className="scroll-reveal" style={{ padding: '2rem 0' }}>
          <h2 style={{ ...SECTION_LABEL, marginBottom: '1rem' }}>{t.mapLabel}</h2>
          <div className="map-wrap" style={{ overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <RouteMap stops={MAP_MARKERS} />
          </div>
        </section>

      </main>
      {/* Car modal — must live outside <main> so CSS transforms on scroll-reveal sections don't break position:fixed */}
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
              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 2, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', lineHeight: 1 }}>
              ×
            </button>
            {selectedCar.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedCar.photo} alt={`${selectedCar.name}'s ${selectedCar.car}`} loading="eager" decoding="sync" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', background: '#e8e4de' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '4/3', background: '#e8e4de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span aria-hidden="true" style={{ fontSize: '48px', fontFamily: 'Georgia, serif', color: 'rgba(0,0,0,0.18)' }}>
                  {selectedCar.name.split(' ').map(w => w[0]).join('')}
                </span>
              </div>
            )}
            <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
              <p style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.35rem', marginTop: 0 }}>{t.modalBrand}</p>
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
      <SiteFooter />
    </div>
  )
}
