import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PARTNERS } from '../../../../lib/partners'
import { ATTENDANCE_KEY_TO_EVENT, normalizeEventName as resolveEventName } from '../../../../lib/eventMeta.js'
import FadeUp from '../../../../components/FadeUp'
import CountUp from '../../../../components/CountUp'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Dashboard | Canvas Routes' } }

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_CARD_DOT = {
  active:    '#7EC87A',
  pending:   '#c5a882',
  suspended: '#d06070',
  expired:   'rgba(245,241,236,0.35)',
}

const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.08)',   text: '#3B6B2F', border: 'rgba(59,107,47,0.25)'  },
  pending:   { bg: 'rgba(123,91,46,0.08)',   text: '#7B5B2E', border: 'rgba(123,91,46,0.25)'  },
  suspended: { bg: 'rgba(123,32,50,0.08)',   text: '#7B2032', border: 'rgba(123,32,50,0.25)'  },
  expired:   { bg: 'rgba(0,0,0,0.04)',       text: '#888',    border: 'rgba(0,0,0,0.12)'       },
}

function CarDots({ car }) {
  const parts = [car.year, car.make, car.model].filter(Boolean)
  if (!parts.length) return null
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: '#c5a882', margin: '0 0.3rem', fontSize: '9px' }}>·</span>}
          {p}
        </span>
      ))}
    </span>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')

  const admin = createAdminClient()
  const [{ data: member }, { data: announcements }, { data: events }, { data: application }, { data: eventRegs }] = await Promise.all([
    admin.from('members').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('announcements').select('*').eq('published', true).order('created_at', { ascending: false }).limit(4),
    admin.from('events').select('*').order('date', { ascending: true }),
    user.email
      ? admin.from('applications').select('registrations, stripe_payment_status, stripe_payment_type').eq('email', user.email.toLowerCase()).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('event_registrations').select('event_id, stripe_payment_status').eq('member_id', user.id),
  ])

  const eventRegMap = {}
  for (const r of (eventRegs || [])) eventRegMap[r.event_id] = r.stripe_payment_status

  // WTET registrations live in applications (not event_registrations) — map payment type to event name
  const ROAD_TRIP_TYPE_TO_NAME = {
    'road_trip_wtet': 'Whips to Eastern Townships — July 5, 2026',
  }
  const paidRoadTripEventName = (['paid', 'authorized'].includes(application?.stripe_payment_status) && application?.stripe_payment_type)
    ? (ROAD_TRIP_TYPE_TO_NAME[application.stripe_payment_type] || null)
    : null

  const status = member?.membership_status || 'pending'
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.pending
  const statusDot = STATUS_CARD_DOT[status] || STATUS_CARD_DOT.pending
  const rawFirst = member?.name?.split(' ')[0] || user.email.split('@')[0]
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1)
  const fullName = member?.name || firstName

  const carList = member?.cars?.length
    ? member.cars
    : (member?.car_year || member?.car_make || member?.car_model)
      ? [{ year: member.car_year, make: member.car_make, model: member.car_model, license_plate: '' }]
      : []

  // Attendance can come from two sources:
  // 1. applications.registrations[].attended (road trip registrations)
  // 2. members.event_attendance keyed by short slug (set from the Members admin panel)
  const appAttended = (application?.registrations || [])
    .filter(r => r.attended === true)
    .map(r => ({ event: resolveEventName(r.event) }))

  const memberAttended = Object.entries(member?.event_attendance || {})
    .filter(([, v]) => v === true)
    .map(([key]) => ({ event: ATTENDANCE_KEY_TO_EVENT[key] || key }))

  // Union both sources; deduplicate by resolved event name
  const appAttendedNames = new Set(appAttended.map(r => r.event))
  const attendedEvents = [
    ...appAttended,
    ...memberAttended.filter(r => !appAttendedNames.has(r.event)),
  ]

  const memberSince = member?.created_at
    ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const dobParts = []
  if (member?.dob_month) dobParts.push(MONTHS_SHORT[member.dob_month - 1])
  if (member?.dob_day) dobParts.push(member.dob_day)
  if (member?.dob_year) dobParts.push(member.dob_year)
  const dob = dobParts.length ? dobParts.join(' ') : null

  const primaryCar = carList[0]
  const tier = member?.tier || 'routes_member'
  const isInnerCircle = tier === 'inner_circle'
  const carPhotoUrl = member?.car_photo_url || null
  const membershipNumber = member?.membership_number ? String(member.membership_number).padStart(3, '0') : null

  const today = new Date(); today.setHours(0, 0, 0, 0)

  function parseEventDate(str) {
    if (!str) return null
    const s = str.trim()
    if (/^[A-Za-z]+ \d{4}$/.test(s)) {
      const d = new Date(s.replace(/^([A-Za-z]+) (\d{4})$/, '$1 1, $2'))
      if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    }
    if (/^\d{4}-\d{2}$/.test(s)) {
      const [y, m] = s.split('-').map(Number)
      return new Date(y, m, 0)
    }
    const d = new Date(s)
    return isNaN(d) ? null : d
  }

  const upcomingEvents = (events || []).filter(ev => {
    const d = parseEventDate(ev.date_display || ev.date)
    return !d || d >= today
  })

  return (
    <div>
      <style>{`
        .portal-grid {
          display: grid;
          grid-template-columns: 1.45fr 1fr;
          gap: 3rem;
          align-items: start;
        }
        @media (max-width: 768px) {
          .portal-grid { grid-template-columns: 1fr; gap: 2rem; }
          .dash-header { margin-bottom: 2.5rem !important; padding-bottom: 2rem !important; }
          .event-row { grid-template-columns: 42px 1px 1fr !important; gap: 1rem !important; padding: 1.25rem 0 !important; }
          .card-pad { padding: 0 1.35rem !important; }
          .card-head { padding: 1.1rem 1.35rem !important; }
          .membership-inner { padding: 1.5rem !important; }
          .membership-name { font-size: 1.65rem !important; }
        }
        @keyframes dash-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dash-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .dash-anim-header {
          animation: dash-fade-up 0.4s ease both;
        }
        .dash-anim-card-1 {
          animation: dash-fade-up 0.38s ease both;
          animation-delay: 0.08s;
        }
        .dash-anim-card-2 {
          animation: dash-fade-up 0.38s ease both;
          animation-delay: 0.14s;
        }
        .dash-anim-card-3 {
          animation: dash-fade-up 0.38s ease both;
          animation-delay: 0.2s;
        }
        .dash-anim-card-4 {
          animation: dash-fade-up 0.38s ease both;
          animation-delay: 0.26s;
        }
        .dash-anim-card-5 {
          animation: dash-fade-up 0.38s ease both;
          animation-delay: 0.32s;
        }
        .dash-anim-membership {
          animation: dash-scale-in 0.42s cubic-bezier(0.34,1.3,0.64,1) both;
          animation-delay: 0.06s;
        }
        .dash-card { background: #fff; border: 0.5px solid rgba(0,0,0,0.08); overflow: hidden; }
        .card-head {
          padding: 1.25rem 1.75rem;
          border-bottom: 0.5px solid rgba(0,0,0,0.06);
          display: flex; align-items: center; justify-content: space-between;
        }
        .card-pad { padding: 0 1.75rem; }
        .section-label {
          font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase;
          color: #aaa; font-family: var(--font-inter), sans-serif;
        }
        .event-row {
          display: grid;
          grid-template-columns: 52px 1px 1fr;
          gap: 1.5rem;
          padding: 1.5rem 0;
          align-items: start;
        }
        .ann-item { padding: 1.5rem 0; }
        .ann-item + .ann-item { border-top: 0.5px solid rgba(0,0,0,0.06); }
        .membership-card {
          background: #0F1E14;
          position: relative;
          overflow: hidden;
          transition: transform 0.38s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.38s ease;
        }
        .membership-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.45);
        }
        .membership-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            -55deg,
            transparent 0, transparent 26px,
            rgba(197,168,130,0.028) 26px, rgba(197,168,130,0.028) 27px
          );
          pointer-events: none;
        }
        .membership-inner { position: relative; z-index: 2; padding: 1.75rem; }
        .membership-name {
          font-family: var(--font-cormorant), serif;
          font-size: 1.9rem;
          font-weight: 300;
          color: #F5F1EC;
          line-height: 1.1;
          letter-spacing: 0.02em;
          margin-bottom: 0.5rem;
        }
        .detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.75rem 0;
          border-bottom: 0.5px solid rgba(0,0,0,0.06);
        }
        .detail-row:last-child { border-bottom: none; }
      `}</style>

      {/* ── Header ── */}
      <header className="dash-header dash-anim-header" style={{ marginBottom: '3.5rem', paddingBottom: '2.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.25rem', fontFamily: 'var(--font-inter), sans-serif' }}>
          Canvas Routes &mdash; Season 2026
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.8rem, 6vw, 4rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1, margin: '0 0 1.5rem', letterSpacing: '-0.01em' }}>
          Welcome back,<br />
          <span style={{ fontStyle: 'italic' }}>{firstName}.</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.38rem 1rem', border: `0.5px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.text, fontFamily: 'var(--font-inter), sans-serif' }}>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: statusStyle.text, flexShrink: 0 }} />
            {status}
          </span>
          <span className="tier-shimmer" style={{ fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.38rem 1rem', border: isInnerCircle ? '0.5px solid rgba(197,168,130,0.55)' : '0.5px solid rgba(197,168,130,0.28)', background: isInnerCircle ? 'rgba(197,168,130,0.09)' : 'transparent', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif' }}>
            {isInnerCircle ? 'Inner Circle' : 'Routes Member'}
          </span>
          {primaryCar && (
            <span style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.04em', paddingLeft: '0.6rem', borderLeft: '0.5px solid rgba(0,0,0,0.12)' }}>
              <CarDots car={primaryCar} />
            </span>
          )}
        </div>
      </header>

      <div className="portal-grid">

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* Announcements */}
          {announcements?.length > 0 && (
            <FadeUp delay={60}><div className="dash-card">
              <div className="card-head">
                <span className="section-label">Announcements</span>
                <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.1rem', fontWeight: '300', color: '#ddd', lineHeight: 1 }}>{announcements.length}</span>
              </div>
              <div className="card-pad">
                {announcements.map((a, i) => (
                  <div key={a.id} className="ann-item">
                    <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '1.5px', background: 'linear-gradient(180deg, #c5a882 0%, rgba(197,168,130,0.12) 100%)', alignSelf: 'stretch', flexShrink: 0, minHeight: '22px' }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.45rem', lineHeight: 1.4, letterSpacing: '0.01em' }}>{a.title}</div>
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{a.content}</div>
                        <div style={{ fontSize: '8.5px', color: '#ccc', marginTop: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif' }}>
                          {new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div></FadeUp>
          )}

          {/* Upcoming Events */}
          <FadeUp delay={120}><div className="dash-card">
            <div className="card-head">
              <span className="section-label">Upcoming Events</span>
              <Link href="/members/events" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
                View all
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
            <div className="card-pad">
              {!upcomingEvents.length ? (
                <p style={{ fontSize: '13px', color: '#ccc', margin: '1.5rem 0', letterSpacing: '0.02em', lineHeight: 1.7 }}>Nothing scheduled yet — check back soon.</p>
              ) : upcomingEvents.map((ev, i) => {
                const rawDate = ev.date_display || ev.date || ''
                const ds = rawDate.trim()
                const isMonthYear = /^[A-Za-z]+ \d{4}$/.test(ds)
                const isIsoMonthYear = /^\d{4}-\d{2}$/.test(ds)
                const isPartial = isMonthYear || isIsoMonthYear
                let evDate = null
                if (isMonthYear) { const d = new Date(ds.replace(/^([A-Za-z]+) (\d{4})$/, '$1 1, $2')); evDate = isNaN(d) ? null : d }
                else if (isIsoMonthYear) { const [y, m] = ds.split('-').map(Number); evDate = new Date(y, m - 1, 1) }
                else { const d = new Date(ds); evDate = isNaN(d) ? null : d }
                const day = !isPartial && evDate ? evDate.getDate() : null
                const month = evDate ? MONTHS_SHORT[evDate.getMonth()] : null
                const year = isPartial && evDate ? evDate.getFullYear() : null
                return (
                  <Link key={ev.id} href={`/members/events/${ev.id}`} className="event-row" style={{ borderBottom: i < upcomingEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', textDecoration: 'none', display: 'grid', gridTemplateColumns: '52px 1px 1fr', gap: '1.5rem', padding: '1.5rem 0', alignItems: 'start', cursor: 'pointer' }}>
                    {/* Date */}
                    <div style={{ textAlign: 'center', paddingTop: '1px' }}>
                      {day ? (
                        <>
                          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.4rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{day}</div>
                          <div style={{ fontSize: '7.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginTop: '3px' }}>{month}</div>
                        </>
                      ) : month ? (
                        <>
                          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', fontWeight: '500' }}>{month}</div>
                          <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'var(--font-inter), sans-serif', marginTop: '2px' }}>{year}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '10px', color: '#ccc', fontFamily: 'var(--font-inter), sans-serif' }}>{rawDate}</div>
                      )}
                    </div>
                    {/* Divider */}
                    <div style={{ background: 'rgba(197,168,130,0.2)', alignSelf: 'stretch', minHeight: '30px' }} />
                    {/* Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', lineHeight: 1.35, letterSpacing: '0.01em' }}>{ev.name}</div>
                        <span style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.22)', padding: '2px 8px', flexShrink: 0, background: 'rgba(123,91,46,0.04)', fontFamily: 'var(--font-inter), sans-serif', marginTop: '2px' }}>{ev.type}</span>
                      </div>
                      {ev.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '11px', color: '#999', letterSpacing: '0.02em', marginBottom: '0.2rem' }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {ev.location}
                        </div>
                      )}
                      {ev.description && (
                        <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.75, marginTop: '0.5rem' }}>{ev.description}</div>
                      )}
                      <div style={{ marginTop: '0.85rem' }}>
                        {ev.registration_enabled === false ? null
                          : (paidRoadTripEventName === ev.name || ['free', 'paid'].includes(eventRegMap[ev.id])) ? (
                          <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '2px 8px', background: 'rgba(59,107,47,0.04)', fontFamily: 'var(--font-inter), sans-serif', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Registered
                          </span>
                        ) : ev.registration_opens_at && (() => { const now = new Date(); const opens = new Date(ev.registration_opens_at); const closes = ev.registration_closes_at ? new Date(ev.registration_closes_at) : null; return now >= opens && (!closes || now <= closes) })() ? (
                          <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', padding: '2px 8px', fontFamily: 'var(--font-inter), sans-serif' }}>
                            Registration Open →
                          </span>
                        ) : ev.registration_url ? (
                          <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#555', border: '0.5px solid rgba(0,0,0,0.15)', padding: '2px 8px', fontFamily: 'var(--font-inter), sans-serif' }}>
                            Register →
                          </span>
                        ) : ev.registration_enabled ? (
                          <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.3)', padding: '2px 8px', fontFamily: 'var(--font-inter), sans-serif', background: 'rgba(197,168,130,0.04)' }}>
                            Opening Soon
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div></FadeUp>

        </div>

        {/* ── Right column ── */}
        <FadeUp delay={40} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Membership card — clickable, links to full card page */}
          <Link href="/members/card" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="membership-card" style={{ cursor: 'pointer', ...(isInnerCircle ? { background: 'linear-gradient(148deg, #0F1E14 55%, #172419 100%)' } : {}) }}>
            {/* Ambient glows */}
            <div style={{ position: 'absolute', top: '-25px', right: '-25px', width: '180px', height: '180px', background: isInnerCircle ? 'radial-gradient(circle, rgba(197,168,130,0.22) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(197,168,130,0.1) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
            {isInnerCircle && (
              <div style={{ position: 'absolute', bottom: '-20px', left: '-10px', width: '110px', height: '110px', background: 'radial-gradient(circle, rgba(197,168,130,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />
            )}

            <div className="membership-inner">
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.75rem' }}>
                <div>
                  <div style={{ fontSize: '7.5px', letterSpacing: '0.44em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif' }}>Canvas Routes</div>
                  {member?.membership_number && (
                    <div style={{ fontSize: '7px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', fontFamily: 'var(--font-inter), sans-serif', marginTop: '5px' }}>No. <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '0.95rem', fontWeight: '300', color: 'rgba(197,168,130,0.72)', letterSpacing: '0.1em', fontStyle: 'normal' }}><CountUp to={member.membership_number} pad={3} prefix="#" duration={800} /></span></div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '6.5px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)', fontFamily: 'var(--font-inter), sans-serif' }}>Season</div>
                  <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.15rem', fontWeight: '300', fontStyle: 'italic', color: 'rgba(197,168,130,0.72)', lineHeight: 1.1, marginTop: '2px' }}>2026</div>
                </div>
              </div>

              {/* Name */}
              <div className="membership-name">{fullName}</div>

              {/* Cars */}
              {carList.length > 0 && (
                <div style={{ marginBottom: '2.25rem', display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
                  {carList.map((car, i) => {
                    const parts = [car.year, car.make, car.model].filter(Boolean)
                    if (!parts.length) return null
                    return (
                      <div key={i} style={{ fontSize: '11px', color: 'rgba(245,241,236,0.42)', letterSpacing: '0.06em', fontFamily: 'var(--font-inter), sans-serif' }}>
                        {parts.map((p, pi) => (
                          <span key={pi}>
                            {pi > 0 && <span style={{ color: 'rgba(197,168,130,0.38)', margin: '0 0.35rem' }}>·</span>}
                            {p}
                          </span>
                        ))}
                        {car.license_plate && (
                          <span style={{ fontSize: '7.5px', color: 'rgba(197,168,130,0.32)', letterSpacing: '0.16em', textTransform: 'uppercase', border: '0.5px solid rgba(197,168,130,0.14)', padding: '1px 5px', marginLeft: '0.5rem' }}>{car.license_plate}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Divider */}
              <div style={{ height: '0.5px', background: isInnerCircle ? 'rgba(197,168,130,0.32)' : 'rgba(197,168,130,0.14)', marginBottom: '1rem' }} />

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusDot, boxShadow: `0 0 7px ${statusDot}55` }} />
                  <span style={{ fontSize: '7.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.38)', fontFamily: 'var(--font-inter), sans-serif' }}>{status}</span>
                </div>
                <span className="tier-shimmer" style={{ fontSize: '7.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: isInnerCircle ? 'rgba(197,168,130,0.58)' : 'rgba(197,168,130,0.32)', fontFamily: 'var(--font-inter), sans-serif' }}>
                  {isInnerCircle ? 'Inner Circle' : 'Routes Member'}
                </span>
              </div>
            </div>
          </div>
          </Link>

          {/* Car photo */}
          {carPhotoUrl && (
            <div style={{ position: 'relative', overflow: 'hidden', lineHeight: 0 }}>
              <img
                src={carPhotoUrl}
                alt={primaryCar ? [primaryCar.year, primaryCar.make, primaryCar.model].filter(Boolean).join(' ') : 'Your car'}
                style={{ width: '100%', height: '250px', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '3.5rem 1.25rem 1.1rem', background: 'linear-gradient(to top, rgba(15,30,20,0.9) 0%, rgba(15,30,20,0.25) 60%, transparent 100%)', pointerEvents: 'none' }}>
                {primaryCar && [primaryCar.year, primaryCar.make, primaryCar.model].filter(Boolean).length > 0 && (
                  <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,241,236,0.82)', fontFamily: 'var(--font-inter), sans-serif' }}>
                    {[primaryCar.year, primaryCar.make, primaryCar.model].filter(Boolean).map((p, i) => (
                      <span key={i}>
                        {i > 0 && <span style={{ color: '#c5a882', margin: '0 0.35rem', fontSize: '9px' }}>·</span>}
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit profile link */}
          <Link href="/members/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.25rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span style={{ fontSize: '8.5px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999' }}>Edit Profile</span>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>

          {/* Events attended */}
          {attendedEvents.length > 0 && (
            <FadeUp delay={80}><div className="dash-card">
              <div className="card-head">
                <span className="section-label">Events Attended</span>
                <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', fontWeight: '300', color: '#c5a882', lineHeight: 1 }}>{attendedEvents.length}</span>
              </div>
              <div className="card-pad">
                {attendedEvents.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.9rem 0', borderBottom: i < attendedEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                    <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.5, letterSpacing: '0.02em' }}>{r.event}</div>
                  </div>
                ))}
              </div>
            </div></FadeUp>
          )}

          {/* Personal details */}
          {(dob || member?.phone || member?.instagram) && (
            <FadeUp delay={120}><div className="dash-card">
              <div className="card-head"><span className="section-label">Your Details</span></div>
              <div style={{ padding: '0.25rem 1.75rem 0.5rem' }}>
                {[
                  dob && { label: 'Birthday', value: dob, href: null },
                  member?.phone && { label: 'Phone', value: member.phone, href: null },
                  member?.instagram && { label: 'Instagram', value: `@${member.instagram.replace(/^@/, '')}`, href: `https://instagram.com/${member.instagram.replace(/^@/, '')}` },
                ].filter(Boolean).map((item) => (
                  <div key={item.label} className="detail-row">
                    <span style={{ fontSize: '8.5px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ccc', fontFamily: 'var(--font-inter), sans-serif' }}>{item.label}</span>
                    {item.href ? (
                      <a href={item.href} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#c5a882', textDecoration: 'none', letterSpacing: '0.02em' }}>{item.value}</a>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#555', letterSpacing: '0.02em' }}>{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div></FadeUp>
          )}

          {/* Partner Discounts */}
          <FadeUp delay={160}><div className="dash-card">
            <div className="card-head">
              <span className="section-label">Partner Perks</span>
              <Link href="/members/perks" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
                View all
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
            <div style={{ padding: '0 1.75rem' }}>
              {PARTNERS.map((p, i) => (
                <div key={i} style={{ padding: '1rem 0', borderBottom: i < PARTNERS.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', letterSpacing: '0.01em' }}>{p.name}</span>
                    <span style={{ fontSize: '10px', color: '#c5a882', letterSpacing: '0.04em', flexShrink: 0, fontFamily: 'var(--font-inter), sans-serif' }}>{p.discount}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', lineHeight: 1.6, letterSpacing: '0.01em' }}>{p.how}</div>
                </div>
              ))}
            </div>
          </div></FadeUp>

        </FadeUp>
      </div>
    </div>
  )
}
