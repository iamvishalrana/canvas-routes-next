'use client'

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export default function LocationMap({ location }) {
  if (!location) return null

  const encoded = encodeURIComponent(location)
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`
  const appleUrl = `https://maps.apple.com/?q=${encoded}`

  return (
    <div style={{ marginBottom: '2rem' }}>
      {GMAPS_KEY ? (
        <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.09)' }}>
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${encoded}&zoom=14`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={location}
          />
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: GMAPS_KEY ? '0.75rem' : '0' }}>
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.45rem 1rem',
            textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif',
            background: '#fff',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Google Maps
        </a>
        <a
          href={appleUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.45rem 1rem',
            textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif',
            background: '#fff',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Apple Maps
        </a>
      </div>
    </div>
  )
}
