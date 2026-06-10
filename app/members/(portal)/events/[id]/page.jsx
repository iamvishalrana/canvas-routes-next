import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EventRegisterButton from '../../../../../components/EventRegisterButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const { id } = await params
  const admin = createAdminClient()
  const { data: ev } = await admin.from('events').select('name').eq('id', id).single()
  return { title: { absolute: ev ? `${ev.name} | Canvas Routes` : 'Event | Canvas Routes' } }
}

export default async function EventDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')

  const admin = createAdminClient()
  const [{ data: ev }, { data: registration }, { data: member }] = await Promise.all([
    admin.from('events').select('*').eq('id', id).single(),
    admin.from('event_registrations').select('stripe_payment_status').eq('event_id', id).eq('member_id', user.id).maybeSingle(),
    admin.from('members').select('tier, name').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) notFound()

  const tier = member?.tier || 'routes_member'
  const isRegistered = !!(registration && ['free', 'paid'].includes(registration.stripe_payment_status))
  const now = new Date()
  const inPriorityWindow = ev.priority_window_end && now < new Date(ev.priority_window_end)
  const isInnerCircle = tier === 'inner_circle'

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/members/events" style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', textDecoration: 'none', fontFamily: 'var(--font-inter)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Events
        </Link>
      </div>

      <header style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.22)', padding: '3px 10px', background: 'rgba(123,91,46,0.04)', fontFamily: 'var(--font-inter)' }}>
            {ev.type}
          </span>
          {isRegistered && (
            <span style={{ fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 10px', background: 'rgba(59,107,47,0.04)', fontFamily: 'var(--font-inter)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Registered
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2rem, 4.5vw, 2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, margin: '0 0 0.75rem', letterSpacing: '-0.01em' }}>
          {ev.name}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
          {ev.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {ev.date}
            </div>
          )}
          {ev.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {ev.location}
            </div>
          )}
        </div>
      </header>

      {ev.description && (
        <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.85, letterSpacing: '0.01em', marginBottom: '2.5rem' }}>
          {ev.description}
        </p>
      )}

      {/* Registration section */}
      {ev.registration_enabled && (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.09)', padding: '1.75rem 2rem', background: '#fff', marginBottom: '2rem' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#888', fontFamily: 'var(--font-inter)', marginBottom: '1.25rem' }}>
            Registration
          </div>

          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter)', marginBottom: '0.3rem' }}>Member Price</div>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>
                {ev.member_price ? `$${(ev.member_price / 100).toFixed(2)}` : 'Free'}
              </div>
              {ev.member_price > 0 && (
                <div style={{ fontSize: '8.5px', color: '#999', fontFamily: 'var(--font-inter)', marginTop: '0.2rem' }}>CAD</div>
              )}
            </div>
            {ev.capacity && (
              <div>
                <div style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter)', marginBottom: '0.3rem' }}>Capacity</div>
                <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{ev.capacity}</div>
              </div>
            )}
          </div>

          {inPriorityWindow && (
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: isInnerCircle ? 'rgba(197,168,130,0.06)' : 'rgba(0,0,0,0.03)', border: `0.5px solid ${isInnerCircle ? 'rgba(197,168,130,0.3)' : 'rgba(0,0,0,0.1)'}` }}>
              {isInnerCircle ? (
                <p style={{ fontSize: '12px', color: '#8A6535', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                  You have priority access as an Inner Circle member. Registration opens to all members on {new Date(ev.priority_window_end).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
                </p>
              ) : (
                <p style={{ fontSize: '12px', color: '#777', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-inter)' }}>
                  Registration opens on {new Date(ev.priority_window_end).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
                </p>
              )}
            </div>
          )}

          <EventRegisterButton
            event={ev}
            isRegistered={isRegistered}
            memberTier={tier}
            compact={false}
          />
        </div>
      )}

      {!ev.registration_enabled && ev.registration_url && (
        <a href={ev.registration_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#F5F1EC', background: '#0F1E14', padding: '0.8rem 2rem', textDecoration: 'none', fontFamily: 'var(--font-inter)' }}>
          Register
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      )}
    </div>
  )
}
