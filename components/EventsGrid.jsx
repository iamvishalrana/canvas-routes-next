'use client'
import { useRouter } from 'next/navigation'
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

function DateBlock({ rawDate }) {
  const { day, month, year } = getDateParts(rawDate)
  if (day) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.6rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{day}</div>
      <div style={{ fontSize: '7.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginTop: '3px' }}>{month}</div>
    </div>
  )
  if (month) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', fontWeight: '500' }}>{month}</div>
      <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'var(--font-inter), sans-serif', marginTop: '2px' }}>{year}</div>
    </div>
  )
  return <div style={{ fontSize: '10px', color: '#ccc', fontFamily: 'var(--font-inter), sans-serif' }}>{rawDate}</div>
}

function EventCard({ ev, isRegistered, isPast, isAttended, onClick }) {
  const rawDate = ev.date_display || ev.date || ''
  return (
    <div
      onClick={onClick}
      className="ev-card"
      style={{ background: isPast ? 'rgba(255,255,255,0.7)' : '#fff', border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden', cursor: 'pointer' }}
    >
      <div className="ev-card-inner" style={{ padding: '1.75rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0, width: '48px' }}>
          <DateBlock rawDate={rawDate} />
        </div>
        <div style={{ width: '0.5px', background: 'rgba(197,168,130,0.2)', alignSelf: 'stretch', minHeight: '40px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <div className="ev-card-name" style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', letterSpacing: '0.01em', lineHeight: 1.3 }}>{ev.name}</div>
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
            {isAttended && (
              <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '2px 8px', background: 'rgba(59,107,47,0.04)', fontFamily: 'var(--font-inter), sans-serif', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Attended
              </span>
            )}
            {!isPast && isRegistered && (
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

export default function EventsGrid({ upcoming, past, regMap, tier, attendedNames = [], paidRoadTripEventName = null }) {
  const router = useRouter()

  function isAttendedEvent(ev) {
    const evLower = (ev.name || '').toLowerCase()
    return attendedNames.some(name => name.includes(evLower) || evLower.includes(name.split(' —')[0].trim()))
  }

  function isRegisteredForEvent(ev) {
    if (['free', 'paid'].includes(regMap[ev.id])) return true
    // Road trip events (e.g. WTET) register via applications table, not event_registrations
    if (paidRoadTripEventName && ev.name === paidRoadTripEventName) return true
    return false
  }

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
                <EventCard
                  ev={ev}
                  isRegistered={isRegisteredForEvent(ev)}
                  isPast={false}
                  onClick={() => {
                    // Events with a full registration URL go there directly — skip the detail page
                    if (ev.registration_url?.startsWith('http')) window.location.href = ev.registration_url
                    else router.push(`/members/events/${ev.id}`)
                  }}
                />
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
                <EventCard
                  ev={ev}
                  isRegistered={isRegisteredForEvent(ev)}
                  isPast={true}
                  isAttended={isAttendedEvent(ev)}
                  onClick={() => router.push(`/members/events/${ev.id}`)}
                />
              </FadeUp>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .ev-card {
          transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
        }
        @media (hover: hover) {
          .ev-card:hover {
            box-shadow: 0 6px 28px rgba(0,0,0,0.08);
            transform: translateY(-2px);
            border-color: rgba(197,168,130,0.35) !important;
          }
        }
        @media (max-width: 480px) {
          .ev-card-inner { padding: 1.25rem !important; gap: 1rem !important; }
          .ev-card-name { font-size: 14px !important; }
        }
      `}</style>
    </>
  )
}
