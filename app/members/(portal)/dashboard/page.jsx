import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard' }

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const STATUS_CARD_COLOR = {
  active:    '#7EC87A',
  pending:   '#c5a882',
  suspended: '#d06070',
  expired:   'rgba(245,241,236,0.35)',
}

const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.1)',   text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'  },
  pending:   { bg: 'rgba(123,91,46,0.1)',   text: '#7B5B2E', border: 'rgba(123,91,46,0.3)'  },
  suspended: { bg: 'rgba(123,32,50,0.1)',   text: '#7B2032', border: 'rgba(123,32,50,0.3)'  },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#888',    border: 'rgba(0,0,0,0.15)'      },
}

function CarDots({ car }) {
  const parts = [car.year, car.make, car.model].filter(Boolean)
  if (!parts.length) return null
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: '#c5a882', margin: '0 0.35rem', fontSize: '10px' }}>·</span>}
          {p}
        </span>
      ))}
    </span>
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
  const statusCardColor = STATUS_CARD_COLOR[status] || STATUS_CARD_COLOR.pending
  const rawFirst = member?.name?.split(' ')[0] || user.email.split('@')[0]
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1)
  const fullName = member?.name || firstName

  const carList = member?.cars?.length
    ? member.cars
    : (member?.car_year || member?.car_make || member?.car_model)
      ? [{ year: member.car_year, make: member.car_make, model: member.car_model, license_plate: '' }]
      : []

  const attendedEvents = (application?.registrations || []).filter(r => r.attended === true)

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

  return (
    <div>
      <style>{`
        .portal-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2.5rem; align-items: start; }
        @media (max-width: 700px) {
          .portal-grid { grid-template-columns: 1fr; gap: 1.75rem; }
          .dash-header { margin-bottom: 2rem !important; }
          .dash-card-header { padding: 0.9rem 1.1rem !important; }
          .dash-card-body { padding: 1rem 1.1rem !important; }
        }
        .dash-card { background: #fff; border: 0.5px solid rgba(0,0,0,0.08); }
        .dash-card-header { padding: 1.1rem 1.5rem; border-bottom: 0.5px solid rgba(0,0,0,0.07); }
        .dash-card-body { padding: 1.25rem 1.5rem; }
        .section-label { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #999; font-family: var(--font-inter),sans-serif; }
      `}</style>

      {/* ── Header ── */}
      <div className="dash-header" style={{ marginBottom: '3rem' }}>
        <div style={{ width: '28px', height: '1.5px', background: '#c5a882', marginBottom: '1.75rem' }} />
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.2rem,5vw,3.2rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.05, marginBottom: '1rem' }}>
          Welcome back,<br />{firstName}.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.3rem 0.85rem', border: `0.5px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.text }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusStyle.text, display: 'inline-block' }} />
            {status}
          </span>
          {tier && (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
              padding: '0.3rem 0.85rem',
              border: isInnerCircle ? '0.5px solid rgba(197,168,130,0.6)' : '0.5px solid rgba(197,168,130,0.3)',
              background: isInnerCircle ? 'rgba(197,168,130,0.1)' : 'transparent',
              color: '#c5a882',
            }}>
              {isInnerCircle ? 'Inner Circle' : 'Routes Member'}
            </span>
          )}
          {primaryCar && (
            <span style={{ fontSize: '12px', color: '#888', letterSpacing: '0.03em', borderLeft: '1px solid rgba(197,168,130,0.4)', paddingLeft: '0.75rem' }}>
              <CarDots car={primaryCar} />
            </span>
          )}
        </div>
      </div>

      <div className="portal-grid">

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Announcements */}
          <div className="dash-card">
            <div className="dash-card-header"><span className="section-label">Announcements</span></div>
            <div style={{ padding: '0 1.5rem' }}>
              {!announcements?.length ? (
                <p style={{ fontSize: '13px', color: '#bbb', margin: '1.25rem 0' }}>Nothing posted yet.</p>
              ) : announcements.map((a, i) => (
                <div key={a.id} style={{ padding: '1.25rem 0', borderBottom: i < announcements.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div style={{ width: '2px', background: '#c5a882', alignSelf: 'stretch', flexShrink: 0, marginTop: '3px', minHeight: '14px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.35rem', lineHeight: '1.4' }}>{a.title}</div>
                      <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.75', whiteSpace: 'pre-wrap' }}>{a.content}</div>
                      <div style={{ fontSize: '10px', color: '#ccc', marginTop: '0.6rem', letterSpacing: '0.08em' }}>
                        {new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="dash-card">
            <div className="dash-card-header"><span className="section-label">Upcoming Events</span></div>
            <div style={{ padding: '0 1.5rem' }}>
              {!events?.length ? (
                <p style={{ fontSize: '13px', color: '#bbb', margin: '1.25rem 0' }}>No events scheduled yet.</p>
              ) : events.map((ev, i) => (
                <div key={ev.id} style={{ padding: '1.25rem 0', borderBottom: i < events.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', lineHeight: '1.35' }}>{ev.name}</div>
                    <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.25)', padding: '2px 7px', flexShrink: 0, background: 'rgba(123,91,46,0.05)', marginTop: '1px' }}>{ev.type}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#c5a882', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{ev.date}</div>
                  {ev.location && <div style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.02em' }}>{ev.location}</div>}
                  {ev.description && <div style={{ fontSize: '12px', color: '#777', lineHeight: '1.65', marginTop: '0.5rem' }}>{ev.description}</div>}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Membership card — dark visual card */}
          <div style={{ background: isInnerCircle ? 'linear-gradient(135deg, #0F1E14 50%, rgba(197,168,130,0.1) 100%)' : '#0F1E14', padding: '1.75rem 1.75rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: isInnerCircle ? 'radial-gradient(circle, rgba(197,168,130,0.18) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(197,168,130,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Wordmark */}
            <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif' }}>
              Canvas Routes
            </div>
            <div style={{ fontSize: '8px', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginTop: '0.2rem', marginBottom: '1.3rem', fontFamily: 'var(--font-inter),sans-serif' }}>
              {isInnerCircle ? 'Inner Circle' : 'Routes Member'}
            </div>

            {/* Divider */}
            <div style={{ height: '0.5px', background: isInnerCircle ? 'rgba(197,168,130,0.45)' : 'rgba(197,168,130,0.25)', marginBottom: '1.5rem' }} />

            {/* Name */}
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.7rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '0.5rem' }}>
              {fullName}
            </div>

            {/* Status */}
            <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: statusCardColor, marginBottom: '1.6rem' }}>
              {status}
            </div>

            {/* Cars */}
            {carList.length > 0 && (
              <div style={{ marginBottom: '1.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {carList.map((car, i) => {
                  const parts = [car.year, car.make, car.model].filter(Boolean)
                  if (!parts.length) return null
                  return (
                    <div key={i} style={{ fontSize: '12px', color: 'rgba(245,241,236,0.65)', letterSpacing: '0.04em' }}>
                      {parts.map((p, pi) => (
                        <span key={pi}>
                          {pi > 0 && <span style={{ color: '#c5a882', margin: '0 0.35rem', fontSize: '10px' }}>·</span>}
                          {p}
                        </span>
                      ))}
                      {car.license_plate && (
                        <span style={{ fontSize: '9px', color: 'rgba(197,168,130,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid rgba(197,168,130,0.2)', padding: '1px 6px', marginLeft: '0.6rem' }}>{car.license_plate}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Bottom row */}
            <div style={{ height: '0.5px', background: isInnerCircle ? 'rgba(197,168,130,0.25)' : 'rgba(197,168,130,0.15)', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)' }}>
                {memberSince || 'Canvas Routes'}
              </div>
              {attendedEvents.length > 0 && (
                <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.3)' }}>
                  {attendedEvents.length} event{attendedEvents.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Car photo */}
          {carPhotoUrl && (
            <div style={{ position: 'relative', overflow: 'hidden', lineHeight: 0 }}>
              <img
                src={carPhotoUrl}
                alt={primaryCar ? [primaryCar.year, primaryCar.make, primaryCar.model].filter(Boolean).join(' ') : 'Your car'}
                style={{ width: '100%', height: '210px', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
              />
              {/* gradient caption overlay */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2.5rem 1.1rem 0.9rem', background: 'linear-gradient(to top, rgba(15,30,20,0.82) 0%, transparent 100%)', pointerEvents: 'none' }}>
                {primaryCar && [primaryCar.year, primaryCar.make, primaryCar.model].filter(Boolean).length > 0 && (
                  <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,241,236,0.75)', fontFamily: 'var(--font-inter),sans-serif' }}>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/members/profile" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', textDecoration: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.15)', paddingBottom: '1px' }}>
              Edit profile →
            </Link>
          </div>

          {/* Events attended */}
          {attendedEvents.length > 0 && (
            <div className="dash-card">
              <div className="dash-card-header"><span className="section-label">Events Attended</span></div>
              <div style={{ padding: '0 1.5rem' }}>
                {attendedEvents.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 0', borderBottom: i < attendedEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                    <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.5' }}>{r.event}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal details */}
          {(dob || member?.phone || member?.instagram) && (
            <div className="dash-card">
              <div className="dash-card-header"><span className="section-label">Your Details</span></div>
              <div className="dash-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {dob && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ccc' }}>Birthday</span>
                    <span style={{ fontSize: '12px', color: '#555' }}>{dob}</span>
                  </div>
                )}
                {member?.phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ccc' }}>Phone</span>
                    <span style={{ fontSize: '12px', color: '#555' }}>{member.phone}</span>
                  </div>
                )}
                {member?.instagram && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ccc' }}>Instagram</span>
                    <a href={`https://instagram.com/${member.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#c5a882', textDecoration: 'none' }}>@{member.instagram.replace(/^@/, '')}</a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
