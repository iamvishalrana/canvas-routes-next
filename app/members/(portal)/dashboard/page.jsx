import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.1)',   text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'  },
  pending:   { bg: 'rgba(123,91,46,0.1)',   text: '#7B5B2E', border: 'rgba(123,91,46,0.3)'  },
  suspended: { bg: 'rgba(123,32,50,0.1)',   text: '#7B2032', border: 'rgba(123,32,50,0.3)'  },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#888',    border: 'rgba(0,0,0,0.15)'      },
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '1.5rem', ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
      {children}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const [{ data: member }, { data: announcements }, { data: events }, { data: application }] = await Promise.all([
    admin.from('members').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('announcements').select('*').eq('published', true).order('created_at', { ascending: false }).limit(4),
    supabase.from('events').select('*').order('created_at', { ascending: false }).limit(6),
    admin.from('applications').select('registrations').eq('email', user.email.toLowerCase()).maybeSingle(),
  ])

  const status = member?.membership_status || 'pending'
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.pending
  const rawFirst = member?.name?.split(' ')[0] || user.email.split('@')[0]
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1)

  const carList = member?.cars?.length
    ? member.cars
    : (member?.car_year || member?.car_make || member?.car_model)
      ? [{ year: member.car_year, make: member.car_make, model: member.car_model, license_plate: '' }]
      : []

  const attendedEvents = (application?.registrations || []).filter(r => r.attended === true)

  const dobParts = []
  if (member?.dob_month) dobParts.push(MONTHS_SHORT[member.dob_month - 1])
  if (member?.dob_day) dobParts.push(member.dob_day)
  if (member?.dob_year) dobParts.push(member.dob_year)
  const dob = dobParts.length ? dobParts.join(' ') : null

  const hasProfile = carList.length > 0 || dob || member?.phone || member?.instagram

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.5rem' }}>Members Portal</div>
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.6rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem', lineHeight: 1.1 }}>
          Welcome, {firstName}.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '0.3rem 0.85rem',
            border: `0.5px solid ${statusStyle.border}`,
            background: statusStyle.bg, color: statusStyle.text,
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusStyle.text, display: 'inline-block' }} />
            {status}
          </span>
          {carList.slice(0, 2).map((car, i) => (
            <span key={i} style={{ fontSize: '12px', color: '#666', borderLeft: '1px solid rgba(197,168,130,0.5)', paddingLeft: '0.75rem', letterSpacing: '0.02em' }}>
              {[car.year, car.make, car.model].filter(Boolean).join(' ') || 'Unnamed car'}
            </span>
          ))}
        </div>
      </div>

      {/* ── Body grid ── */}
      <style>{`
        .portal-grid { display: grid; grid-template-columns: 1.45fr 1fr; gap: 2rem; align-items: start; }
        @media (max-width: 700px) { .portal-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="portal-grid">

        {/* ── Left: main content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Announcements */}
          <Card>
            <SectionLabel>Announcements</SectionLabel>
            {!announcements?.length ? (
              <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>Nothing posted yet.</p>
            ) : (
              <div>
                {announcements.map((a, i) => (
                  <div key={a.id} style={{ paddingBottom: '1.1rem', marginBottom: '1.1rem', borderBottom: i < announcements.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.35rem' }}>{a.title}</div>
                    <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{a.content}</div>
                    <div style={{ fontSize: '10px', color: '#ccc', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
                      {new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Events */}
          <Card>
            <SectionLabel>Upcoming Events</SectionLabel>
            {!events?.length ? (
              <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>No events scheduled yet.</p>
            ) : (
              <div>
                {events.map((ev, i) => (
                  <div key={ev.id} style={{ paddingBottom: '1.1rem', marginBottom: '1.1rem', borderBottom: i < events.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{ev.name}</div>
                      <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.25)', padding: '2px 7px', flexShrink: 0, background: 'rgba(123,91,46,0.05)' }}>{ev.type}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#c5a882', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{ev.date}</div>
                    {ev.location && <div style={{ fontSize: '11px', color: '#999' }}>{ev.location}</div>}
                    {ev.description && <div style={{ fontSize: '12px', color: '#777', lineHeight: '1.6', marginTop: '0.4rem' }}>{ev.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* ── Right: sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Membership card */}
          <Card>
            <SectionLabel>Your Membership</SectionLabel>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.3rem 0.85rem', border: `0.5px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.text }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusStyle.text, display: 'inline-block' }} />
                {status}
              </span>
            </div>

            {/* Cars */}
            {carList.length > 0 && (
              <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ccc', marginBottom: '0.6rem' }}>
                  {carList.length === 1 ? 'Car' : 'Cars'}
                </div>
                {carList.map((car, i) => (
                  <div key={i} style={{ marginBottom: i < carList.length - 1 ? '0.75rem' : 0 }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>
                      {[car.year, car.make, car.model].filter(Boolean).join(' ') || 'Unnamed car'}
                    </div>
                    {car.license_plate && (
                      <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginTop: '0.15rem' }}>
                        {car.license_plate}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Personal details */}
            {(dob || member?.phone || member?.instagram) && (
              <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                {dob && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#bbb', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Birthday</span>
                    <span style={{ color: '#444' }}>{dob}</span>
                  </div>
                )}
                {member?.phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#bbb', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Phone</span>
                    <span style={{ color: '#444' }}>{member.phone}</span>
                  </div>
                )}
                {member?.instagram && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#bbb', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Instagram</span>
                    <span style={{ color: '#444' }}>@{member.instagram.replace(/^@/, '')}</span>
                  </div>
                )}
              </div>
            )}

            {!hasProfile && (
              <p style={{ fontSize: '12px', color: '#bbb', margin: '0 0 1rem' }}>Complete your profile to add car and personal details.</p>
            )}

            <Link href="/members/profile" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', textDecoration: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.2)', paddingBottom: '1px' }}>
              Edit profile →
            </Link>
          </Card>

          {/* Events attended */}
          {attendedEvents.length > 0 && (
            <Card>
              <SectionLabel>Events Attended</SectionLabel>
              <div>
                {attendedEvents.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: i < attendedEvents.length - 1 ? '0.75rem' : 0, marginBottom: i < attendedEvents.length - 1 ? '0.75rem' : 0, borderBottom: i < attendedEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3B6B2F', flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.5' }}>{r.event}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
