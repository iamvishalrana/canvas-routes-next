'use client'
import { useState, useEffect } from 'react'
import EventRegisterButton from './EventRegisterButton'
import LocationMap from './LocationMap'
import FadeUp from './FadeUp'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getDateParts(rawDate) {
  const s = (rawDate || '').trim()
  if (!s) return { day: null, month: null, year: null }
  const isMonthYear = /^[A-Za-z]+ \d{4}$/.test(s)
  const isIsoMonthYear = /^\d{4}-\d{2}$/.test(s)
  let d = null
  if (isMonthYear) { const t = new Date(s.replace(/^([A-Za-z]+) (\d{4})$/, '$1 1, $2')); d = isNaN(t) ? null : t }
  else if (isIsoMonthYear) { const [y, m] = s.split('-').map(Number); d = new Date(y, m - 1, 1) }
  else { const t = new Date(s); d = isNaN(t) ? null : t }
  const isPartial = isMonthYear || isIsoMonthYear
  return {
    day: !isPartial && d ? d.getDate() : null,
    month: d ? MONTHS_SHORT[d.getMonth()] : null,
    year: isPartial && d ? d.getFullYear() : null,
  }
}

function DateBlock({ rawDate, large = false }) {
  const { day, month, year } = getDateParts(rawDate)
  if (day) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: large ? '3rem' : '2.6rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{day}</div>
      <div style={{ fontSize: '7.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginTop: '3px' }}>{month}</div>
    </div>
  )
  if (month) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: large ? '13px' : '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', fontWeight: '500' }}>{month}</div>
      <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'var(--font-inter), sans-serif', marginTop: '2px' }}>{year}</div>
    </div>
  )
  return <div style={{ fontSize: '10px', color: '#ccc', fontFamily: 'var(--font-inter), sans-serif' }}>{rawDate}</div>
}

function EventCard({ ev, isRegistered, isPast, onClick }) {
  const rawDate = ev.date_display || ev.date || ''
  return (
    <div
      onClick={onClick}
      style={{ background: isPast ? 'rgba(255,255,255,0.7)' : '#fff', border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', cursor: 'pointer' }}
    >
      {ev.photo_url && (
        <img src={ev.photo_url} alt={ev.name} style={{ width: '100%', height: 'auto', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
      )}
      <div style={{ padding: '1.75rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, width: '48px' }}>
          <DateBlock rawDate={rawDate} />
        </div>
        <div style={{ width: '0.5px', background: 'rgba(197,168,130,0.2)', alignSelf: 'stretch', minHeight: '40px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', letterSpacing: '0.01em', lineHeight: 1.3 }}>{ev.name}</div>
            <span style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.22)', padding: '2px 8px', flexShrink: 0, background: 'rgba(123,91,46,0.04)', fontFamily: 'var(--font-inter), sans-serif' }}>{ev.type}</span>
          </div>
          {ev.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '11px', color: '#999', marginBottom: '0.4rem' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {ev.location}
            </div>
          )}
          {ev.description && (
            <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.75, margin: '0 0 0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ev.description}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {isRegistered && (
              <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '2px 8px', background: 'rgba(59,107,47,0.04)', fontFamily: 'var(--font-inter), sans-serif', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Registered
              </span>
            )}
            <span style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter), sans-serif', marginLeft: 'auto' }}>
              View details →
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EventModal({ ev, isRegistered, tier, onClose, onRegistered }) {
  const rawDate = ev.date_display || ev.date || ''

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: '#F5F1EC', width: '100%', maxWidth: '480px', maxHeight: '88vh', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        {/* Close — sticky header row so button never scrolls away */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'flex-end', padding: '0.6rem 0.75rem', background: '#F5F1EC' }}>
          <button
            onClick={onClose}
            style={{ background: 'rgba(15,30,20,0.85)', border: 'none', cursor: 'pointer', color: '#F5F1EC', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Photo — wrapper div handles the overlap behind the sticky bar.
            Padding on <img> is unreliable across browsers; use overflow:hidden
            on the container instead. onError hides the whole wrapper. */}
        {ev.photo_url && (
          <div style={{ marginTop: '-44px', height: '244px', overflow: 'hidden', flexShrink: 0 }}>
            <img
              src={ev.photo_url}
              alt=""
              style={{ width: '100%', height: '244px', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
              onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
            />
          </div>
        )}

        <div style={{ padding: '1.25rem 1.5rem 1.75rem' }}>
          {/* Type + registered */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.22)', padding: '3px 10px', background: 'rgba(123,91,46,0.04)', fontFamily: 'var(--font-inter), sans-serif' }}>{ev.type}</span>
            {isRegistered && (
              <span style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 10px', background: 'rgba(59,107,47,0.04)', fontFamily: 'var(--font-inter), sans-serif', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Registered
              </span>
            )}
          </div>

          {/* Name */}
          <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, margin: '0 0 0.85rem', letterSpacing: '-0.01em' }}>{ev.name}</h2>

          {/* Date + location */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            {rawDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {rawDate}
              </div>
            )}
            {ev.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {ev.location}
              </div>
            )}
          </div>

          {/* Mini map */}
          {ev.location && <LocationMap location={ev.location} />}

          {/* Description */}
          {ev.description && (
            <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.75, letterSpacing: '0.01em', marginBottom: '1.25rem' }}>{ev.description}</p>
          )}

          {/* Registration — only render the section when there is content to show */}
          {ev.registration_enabled !== false && (ev.registration_enabled || ev.registration_opens_at || ev.registration_url) && (
            <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '1.5rem' }}>
              {ev.registration_url ? (
                isRegistered ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '0.45rem 1rem', background: 'rgba(59,107,47,0.04)', fontFamily: 'var(--font-inter), sans-serif' }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Registered
                  </span>
                ) : (
                  <a href={ev.registration_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#F5F1EC', background: '#0F1E14', padding: '0.8rem 2rem', textDecoration: 'none', fontFamily: 'var(--font-inter)' }}>
                    Register
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </a>
                )
              ) : ev.registration_opens_at ? (
                <div>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter)', marginBottom: '0.25rem' }}>Member Price</div>
                      <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>
                        {ev.member_price > 0 ? <>{`$${(ev.member_price / 100).toFixed(2)}`} <span style={{ fontSize: '9px', color: '#aaa', fontFamily: 'var(--font-inter)', fontWeight: '400' }}>CAD</span></> : 'Free'}
                      </div>
                    </div>
                    {ev.capacity && (
                      <div>
                        <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter)', marginBottom: '0.25rem' }}>Capacity</div>
                        <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{ev.capacity}</div>
                      </div>
                    )}
                  </div>
                  <EventRegisterButton event={ev} isRegistered={isRegistered} memberTier={tier} compact={false}
                    onRegistrationComplete={() => onRegistered?.(ev.id, ev.member_price > 0 ? 'paid' : 'free')} />
                </div>
              ) : ev.registration_enabled ? (
                <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.3)', padding: '0.5rem 1.1rem', fontFamily: 'var(--font-inter)', background: 'rgba(197,168,130,0.04)', display: 'inline-block' }}>
                  Registration Opening Soon
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EventsGrid({ upcoming, past, regMap, tier }) {
  const [selected, setSelected] = useState(null)
  const [localRegMap, setLocalRegMap] = useState(regMap)

  function handleRegistered(eventId, status = 'free') {
    setLocalRegMap(prev => ({ ...prev, [eventId]: status }))
  }

  const selectedIsRegistered = selected ? ['free', 'paid'].includes(localRegMap[selected.id]) : false

  return (
    <>
      {upcoming.length === 0 && past.length === 0 && (
        <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.7 }}>No events scheduled yet — check back soon.</p>
      )}

      {upcoming.length > 0 && (
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', fontFamily: 'var(--font-inter)', marginBottom: '1.25rem' }}>Upcoming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcoming.map((ev, i) => (
              <FadeUp key={ev.id} delay={i * 70}>
                <EventCard ev={ev} isRegistered={['free', 'paid'].includes(localRegMap[ev.id])} isPast={false} onClick={() => setSelected(ev)} />
              </FadeUp>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <div style={{ fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter)', marginBottom: '1.25rem' }}>Past</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.6 }}>
            {past.map((ev, i) => (
              <FadeUp key={ev.id} delay={i * 60}>
                <EventCard ev={ev} isRegistered={['free', 'paid'].includes(localRegMap[ev.id])} isPast={true} onClick={() => setSelected(ev)} />
              </FadeUp>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <EventModal
          ev={selected}
          isRegistered={selectedIsRegistered}
          tier={tier}
          onClose={() => setSelected(null)}
          onRegistered={handleRegistered}
        />
      )}
    </>
  )
}
