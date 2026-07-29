'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Err } from '../../_components/shared'
import RouteEventConfigClient from '../../_components/RouteEventConfigClient'
import WtetClient from '../../wtet/WtetClient'
import WtetAwardsClient from '../../wtet-awards/WtetAwardsClient'

const WTET_SLUG = 'whips-to-eastern-townships'

// Registrants / Check-in (trip details, waiver, lunch) / Route Awards used to
// live inline inside each route's card on the Routes list, toggled open
// alongside half a dozen other buttons and panels (Edit, Email, Launch,
// Interested list...) — everything stacking into one very long, very busy
// card. Moved to its own page so it's a normal, uncluttered place to work,
// reached with a link instead of another inline toggle.
export default function RouteCheckinClient() {
  const { routeId } = useParams()
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetch(`/api/admin/upcoming-routes/${routeId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setRoute(data); setLoading(false) })
      .catch(() => { setErr('Failed to load — this route may not exist.'); setLoading(false) })
  }, [routeId])

  if (loading) {
    return <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontSize: '13px', color: '#ccc', textAlign: 'center' }}>Loading…</div>
  }
  if (!route) {
    return (
      <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
        <Link href="/admin/upcoming-routes" style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>← Routes</Link>
        <Err msg={err || 'Not found.'} />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem) clamp(1.5rem, 3vw, 2.5rem) 0' }}>
        <Link href="/admin/upcoming-routes" style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>← Routes</Link>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: '300', color: '#1a1a1a', margin: '0.75rem 0 0.2rem', letterSpacing: '-0.01em' }}>
          {route.name}
        </h1>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Registrants, Waiver, Lunch &amp; Awards
          {route.destination ? ` · ${route.destination}` : ''}
        </div>
      </div>

      {route.slug === WTET_SLUG ? (
        <>
          <WtetClient />
          <WtetAwardsClient />
        </>
      ) : route.event_id ? (
        <RouteEventConfigClient eventId={route.event_id} />
      ) : (
        <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontSize: '12px', color: '#bbb' }}>
          This route isn't linked to an events row yet — re-save it from the Routes list or contact support to link one.
        </div>
      )}
    </div>
  )
}
