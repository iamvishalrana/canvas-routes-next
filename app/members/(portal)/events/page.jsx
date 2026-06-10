import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EventRegisterButton from '../../../../components/EventRegisterButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Events | Canvas Routes' } }

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function EventCard({ ev, regMap, tier, now }) {
  const evDate = new Date(ev.date)
  const day = !isNaN(evDate) ? evDate.getDate() : null
  const month = !isNaN(evDate) ? MONTHS_SHORT[evDate.getMonth()] : null
  const isRegistered = ['free', 'paid'].includes(regMap[ev.id])
  const inPriorityWindow = ev.priority_window_end && now < new Date(ev.priority_window_end)

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      {ev.photo_url && (
        <Link href={`/members/events/${ev.id}`} style={{ display: 'block' }}>
          <img src={ev.photo_url} alt={ev.name} style={{ width: '100%', height: '180px', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
        </Link>
      )}
      <div style={{ padding: '1.75rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'center', flexShrink: 0, width: '48px' }}>
        {day ? (
          <>
            <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.6rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{day}</div>
            <div style={{ fontSize: '7.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginTop: '3px' }}>{month}</div>
          </>
        ) : (
          <div style={{ fontSize: '10px', color: '#ccc' }}>{ev.date}</div>
        )}
      </div>
      <div style={{ width: '0.5px', background: 'rgba(197,168,130,0.2)', alignSelf: 'stretch', minHeight: '40px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
          <Link href={`/members/events/${ev.id}`} style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', textDecoration: 'none', letterSpacing: '0.01em', lineHeight: 1.3 }}>
            {ev.name}
          </Link>
          <span style={{ fontSize: '7px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.22)', padding: '2px 8px', flexShrink: 0, background: 'rgba(123,91,46,0.04)', fontFamily: 'var(--font-inter), sans-serif' }}>
            {ev.type}
          </span>
        </div>
        {ev.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '11px', color: '#999', marginBottom: '0.4rem' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {ev.location}
          </div>
        )}
        {ev.description && (
          <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.75, margin: '0 0 0.75rem' }}>{ev.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {ev.registration_opens_at ? (
            <>
              {ev.member_price > 0 && !isRegistered && (
                <span style={{ fontSize: '11px', color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>
                  Member price: <strong style={{ color: '#1a1a1a' }}>${(ev.member_price / 100).toFixed(2)} CAD</strong>
                </span>
              )}
              {ev.capacity && !isRegistered && (
                <span style={{ fontSize: '11px', color: '#999' }}>{ev.capacity} spots</span>
              )}
              {inPriorityWindow && tier === 'inner_circle' && (
                <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.3)', padding: '2px 8px', fontFamily: 'var(--font-inter)' }}>
                  IC Priority Open
                </span>
              )}
              <EventRegisterButton event={ev} isRegistered={isRegistered} memberTier={tier} compact={false} />
            </>
          ) : ev.registration_url ? (
            <a href={ev.registration_url} target="_blank" rel="noreferrer" style={{ fontSize: '8.5px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#F5F1EC', background: '#0F1E14', padding: '0.6rem 1.4rem', textDecoration: 'none', fontFamily: 'var(--font-inter)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              Register
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  )
}

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')

  const admin = createAdminClient()
  const [{ data: events }, { data: registrations }, { data: member }] = await Promise.all([
    admin.from('events').select('*').order('date', { ascending: true }).limit(50),
    admin.from('event_registrations').select('event_id, stripe_payment_status').eq('member_id', user.id),
    admin.from('members').select('tier, name').eq('id', user.id).maybeSingle(),
  ])

  const regMap = {}
  for (const r of (registrations || [])) regMap[r.event_id] = r.stripe_payment_status

  const tier = member?.tier || 'routes_member'
  const now = new Date()
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const upcoming = (events || []).filter(ev => {
    const d = new Date(ev.date)
    return !isNaN(d) && d >= today
  })
  const past = (events || []).filter(ev => {
    const d = new Date(ev.date)
    return !isNaN(d) && d < today
  }).reverse()

  return (
    <div>
      <header style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem', fontFamily: 'var(--font-inter), sans-serif' }}>
          Canvas Routes &mdash; Season 2026
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Events
        </h1>
      </header>

      {upcoming.length === 0 && past.length === 0 && (
        <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.7 }}>No events scheduled yet — check back soon.</p>
      )}

      {upcoming.length > 0 && (
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#999', fontFamily: 'var(--font-inter)', marginBottom: '1.25rem' }}>Upcoming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcoming.map(ev => <EventCard key={ev.id} ev={ev} regMap={regMap} tier={tier} now={now} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <div style={{ fontSize: '8px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter)', marginBottom: '1.25rem' }}>Past</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.6 }}>
            {past.map(ev => <EventCard key={ev.id} ev={ev} regMap={regMap} tier={tier} now={now} />)}
          </div>
        </section>
      )}
    </div>
  )
}
