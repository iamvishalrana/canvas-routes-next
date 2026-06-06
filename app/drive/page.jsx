'use client'
import { useState, useEffect } from 'react'

const PASSWORD = 'laurentians'

const STOPS = [
  { label: 'LaSalle, Montreal', note: 'Meetup — 7:00am sharp', start: true, href: 'https://www.google.com/maps?q=45.4305611,-73.6346777' },
  { label: 'Esso Porte du Nord', note: 'Saint-Sauveur', href: 'https://www.google.com/maps?q=45.8957004,-74.1564982' },
  { label: '243 Rue St Venant', note: 'Sainte-Agathe-des-Monts', href: 'https://www.google.com/maps?q=46.0331833,-74.2849984' },
  { label: 'Le Café Mont Blanc', note: 'Mont-Blanc', href: 'https://www.google.com/maps?q=46.1160535,-74.4784365' },
  { label: 'Mont-Tremblant', note: 'Convoy Point', href: 'https://www.google.com/maps?q=46.2017179,-74.569501' },
  { label: '163 Chem. des Voyageurs', note: 'Mont-Tremblant', href: 'https://www.google.com/maps?q=46.2089655,-74.5846753' },
  { label: 'Aloe Cafe', note: 'Mont-Tremblant — Final Destination', end: true, href: 'https://maps.app.goo.gl/j6kTSg7HHZdAPejH6' },
]

const REGISTRANTS = [
  { name: 'Louis Guindon', car: '2023 Genesis G70 3.3T — Grey' },
  { name: 'Jean-Philippe Remon', car: '2011 BMW 135i — Grey' },
  { name: 'Julien Fernandez', car: '2005 Porsche 911 S Cab — Silver' },
  { name: 'Tanya Ghingold + Mark', car: '2012 Porsche Cayman S Black Edition 71/500' },
  { name: 'Frederic Lefebvre', car: '2020 Audi RS3' },
  { name: 'Marc-Antoine Sauvé', car: '2018 Audi Allroad A4 — Gloss Steel Blue' },
  { name: 'Nicholas Kong', car: '2020 Subaru BRZ — Red' },
  { name: 'Alexandre Boutin', car: '2026 Audi RS6 Performance' },
  { name: 'Yvon Maggi', car: '2014 Porsche 911 Turbo S Cab — Black' },
]

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
      <div style={{ minHeight: '100vh', background: '#0F1E14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
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
              autoFocus
              style={{
                display: 'block', width: '100%', padding: '0.85rem 1rem',
                background: 'rgba(255,255,255,0.07)',
                border: `0.5px solid ${err ? '#7B2032' : 'rgba(255,255,255,0.18)'}`,
                color: '#F5F1EC', fontSize: '15px', outline: 'none',
                fontFamily: 'Georgia, serif', marginBottom: '0.75rem',
                textAlign: 'center', letterSpacing: '0.12em', boxSizing: 'border-box',
              }}
            />
            {err && (
              <div style={{ color: '#7B2032', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                Incorrect password
              </div>
            )}
            <button
              type="submit"
              style={{
                width: '100%', background: '#F5F1EC', color: '#0F1E14', border: 'none',
                padding: '0.85rem', fontSize: '11px', letterSpacing: '0.2em',
                textTransform: 'uppercase', cursor: 'pointer',
                fontFamily: 'sans-serif', fontWeight: '500',
              }}
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'sans-serif', color: '#1a1a1a' }}>

      {/* Header */}
      <div style={{ background: '#0F1E14', padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{ width: '110px', display: 'block' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#F5F1EC', fontFamily: 'Georgia, Times New Roman, serif', fontSize: '15px' }}>Into the Laurentians</div>
          <div style={{ color: 'rgba(245,241,236,0.45)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3px' }}>June 7, 2026</div>
        </div>
      </div>

      <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>

        {/* Quick info bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
          marginBottom: '0',
        }}>
          {[
            { label: 'Depart', value: '7:00am · LaSalle', href: null },
            { label: 'Emergency', value: 'Jerry — 514-437-3437', href: 'tel:5144373437' },
            { label: 'Convoy App', value: 'Download Velox →', href: 'https://apps.apple.com/ca/app/velox-drive-convoy-explore/id6754770506' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '1.25rem 0.75rem',
              borderRight: i < 2 ? '0.5px solid rgba(0,0,0,0.1)' : 'none',
            }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '5px' }}>{item.label}</div>
              {item.href ? (
                <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                  style={{ fontSize: '12px', color: '#0F1E14', textDecoration: 'underline', textUnderlineOffset: '3px', lineHeight: '1.4', display: 'block' }}>
                  {item.value}
                </a>
              ) : (
                <div style={{ fontSize: '12px', color: '#1a1a1a', lineHeight: '1.4' }}>{item.value}</div>
              )}
            </div>
          ))}
        </div>

        {/* Route stops */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1.5rem' }}>Route</div>
          {STOPS.map((stop, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              {/* Timeline spine */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '16px' }}>
                <div style={{
                  width: stop.start || stop.end ? '10px' : '8px',
                  height: stop.start || stop.end ? '10px' : '8px',
                  borderRadius: stop.start || stop.end ? '0' : '50%',
                  background: stop.start ? '#3B6B2F' : stop.end ? '#0F1E14' : 'rgba(0,0,0,0.2)',
                  marginTop: '4px', flexShrink: 0,
                }} />
                {i < STOPS.length - 1 && (
                  <div style={{ width: '1px', height: '32px', background: 'rgba(0,0,0,0.1)', marginTop: '4px' }} />
                )}
              </div>
              {/* Stop info */}
              <div style={{ paddingBottom: i < STOPS.length - 1 ? '0' : '0', marginBottom: i < STOPS.length - 1 ? '0' : '0' }}>
                <a
                  href={stop.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: stop.start || stop.end ? '500' : '400', lineHeight: '1.3', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(0,0,0,0.25)', display: 'block' }}
                >
                  {stop.label}
                </a>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', marginBottom: '8px' }}>{stop.note}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ padding: '2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Map</div>
          <div style={{ position: 'relative', paddingBottom: '65%', height: 0, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.1)' }}>
            <iframe
              src="https://www.google.com/maps/d/embed?mid=1Nqcw4_7P3M3FSEBpdwawyizSd7dY_KA"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
              title="Route Map"
            />
          </div>
        </div>

        {/* Who's coming */}
        <div style={{ padding: '2rem 0' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '1.5rem' }}>
            Who&apos;s Coming — {REGISTRANTS.length} Cars
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1px',
            background: 'rgba(0,0,0,0.08)',
            border: '0.5px solid rgba(0,0,0,0.08)',
          }}>
            {REGISTRANTS.map((r, i) => (
              <div key={i} style={{ background: '#fff', overflow: 'hidden' }}>
                {/* Car photo placeholder */}
                <div style={{
                  height: '130px', background: '#0F1E14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '40px', color: 'rgba(245,241,236,0.15)', userSelect: 'none' }}>
                    {r.name.charAt(0)}
                  </span>
                </div>
                <div style={{ padding: '0.85rem 0.9rem' }}>
                  <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500', marginBottom: '3px', lineHeight: '1.3' }}>
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
