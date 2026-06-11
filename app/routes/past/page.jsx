'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SiteFooter from '../../../components/SiteFooter'

const PAST_ROUTES = [
  {
    name: 'Into the Laurentians',
    date: 'June 7, 2026',
    location: 'Montreal → Mont-Tremblant',
    description: 'Backroads through the Laurentians. Rain, sweeping corners, and a group of people who showed up for all of it.',
    cover: '/june7-poster.jpg',
    href: '/itinerary-into-the-laurentians-june-7',
    cars: 10,
    km: '~280 km',
  },
]

export default function PastRoutesPage() {
  return (
    <div style={{ minHeight: '100svh', background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif', backgroundImage: 'url(/membership-form.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <div style={{ minHeight: '100svh', background: 'rgba(15,30,20,0.93)' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '68px', borderBottom: '0.5px solid rgba(197,168,130,0.12)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,30,20,0.97)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <div style={{ width: '142px', height: '64px', overflow: 'hidden', flexShrink: 0 }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536} style={{ width: '142px', height: 'auto', marginTop: '-69px', display: 'block', opacity: 0.9 }} />
          </div>
        </Link>
        <Link href="/routes" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Routes</Link>
      </nav>

      {/* Header */}
      <div style={{ padding: '4rem 2rem 3rem', maxWidth: '960px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,6vw,4.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, margin: '0 0 1rem', letterSpacing: '-0.01em' }}>
          Past Routes
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.65)', lineHeight: 1.75, margin: 0, maxWidth: '480px' }}>
          Every route is password-protected — participants received the password at the time of the event.
        </p>
        <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.18)', marginTop: '2.5rem' }} />
      </div>

      {/* Route cards */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 2rem 6rem', display: 'flex', flexDirection: 'column', gap: '1.5px' }}>
        {PAST_ROUTES.map((route, i) => (
          <RouteCard key={i} route={route} />
        ))}
      </div>

      <SiteFooter />
      </div>
    </div>
  )
}

function RouteCard({ route }) {
  return (
    <Link href={route.href} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="route-card" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(197,168,130,0.12)', display: 'grid', gridTemplateColumns: '220px 1fr', overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s' }}>
        <style>{`
          .route-card:hover { border-color: rgba(197,168,130,0.35) !important; background: rgba(255,255,255,0.05) !important; }
          .route-card:hover .route-arrow { transform: translateX(4px); }
          .route-arrow { transition: transform 0.2s; display: inline-block; }
          @media (max-width: 580px) {
            .route-card { grid-template-columns: 1fr !important; }
            .route-cover { height: 180px !important; }
          }
        `}</style>

        {/* Cover image */}
        <div className="route-cover" style={{ position: 'relative', height: '100%', minHeight: '200px', overflow: 'hidden', background: '#111' }}>
          {route.cover ? (
            <img
              src={route.cover}
              alt={route.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.7 }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'rgba(197,168,130,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(15,30,20,0.6) 100%)' }} />
        </div>

        {/* Details */}
        <div style={{ padding: '2rem 2rem 2rem 1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '8.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.6rem' }}>
              {route.date}
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.6rem,3vw,2.1rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '0.5rem' }}>
              {route.name}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(197,168,130,0.5)', letterSpacing: '0.06em', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              {route.location}
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.75, margin: 0 }}>
              {route.description}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {route.cars && (
                <div>
                  <div style={{ fontSize: '7.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)', marginBottom: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>Cars</div>
                  <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.4rem', fontWeight: '300', color: 'rgba(245,241,236,0.7)', lineHeight: 1 }}>{route.cars}</div>
                </div>
              )}
              {route.km && (
                <div>
                  <div style={{ fontSize: '7.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)', marginBottom: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>Distance</div>
                  <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.4rem', fontWeight: '300', color: 'rgba(245,241,236,0.7)', lineHeight: 1 }}>{route.km}</div>
                </div>
              )}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif' }}>
              View Route
              <span className="route-arrow">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
