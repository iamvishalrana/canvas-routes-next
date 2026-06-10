'use client'
import { useState } from 'react'

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export default function LocationMap({ location }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (!location) return null

  const encoded = encodeURIComponent(location)
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`
  const appleUrl = `https://maps.apple.com/?q=${encoded}`
  const staticMapUrl = GMAPS_KEY
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=14&size=560x440&scale=2&markers=color:0x0F1E14|${encoded}&key=${GMAPS_KEY}`
    : null

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase',
    color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.45rem 1rem',
    textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif', background: '#fff',
  }

  const PinIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {staticMapUrl && !imgFailed && (
        <a href={googleUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <img
            src={staticMapUrl}
            alt={location}
            style={{ width: '100%', height: '200px', objectFit: 'cover', objectPosition: 'center', display: 'block', border: '0.5px solid rgba(0,0,0,0.09)' }}
            onError={() => setImgFailed(true)}
          />
        </a>
      )}
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <a href={googleUrl} target="_blank" rel="noreferrer" style={btnStyle}>
          <PinIcon /> Google Maps
        </a>
        <a href={appleUrl} target="_blank" rel="noreferrer" style={btnStyle}>
          <PinIcon /> Apple Maps
        </a>
      </div>
    </div>
  )
}
