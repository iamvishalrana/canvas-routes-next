import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export const dynamic = 'force-dynamic'

const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.08)',  text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'  },
  pending:   { bg: 'rgba(123,91,46,0.08)',  text: '#7B5B2E', border: 'rgba(123,91,46,0.3)'  },
  suspended: { bg: 'rgba(123,32,50,0.08)',  text: '#7B2032', border: 'rgba(123,32,50,0.3)'  },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#888',    border: 'rgba(0,0,0,0.15)'      },
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

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Members Portal</div>
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.4rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem' }}>
          Welcome back, {firstName}.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.3rem 0.9rem', border: `0.5px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.text }}>
            {status}
          </span>
          {carList.map((car, i) => (
            <div key={i} style={{ borderLeft: '1.5px solid #c5a882', paddingLeft: '0.85rem' }}>
              <div style={{ fontSize: '13px', color: '#1a1a1a', letterSpacing: '0.02em', fontWeight: '400' }}>
                {[car.year, car.make, car.model].filter(Boolean).join(' ') || 'Unnamed car'}
              </div>
              {car.license_plate && (
                <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginTop: '0.2rem' }}>
                  {car.license_plate}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gap: '3rem', alignItems: 'start' }}>

        {/* Announcements */}
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem' }}>Announcements</div>
          {!announcements?.length ? (
            <p style={{ fontSize: '13px', color: '#aaa' }}>Nothing posted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {announcements.map(a => (
                <div key={a.id} style={{ padding: '1.2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.4rem' }}>{a.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{a.content}</div>
                  <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
                    {new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem' }}>Upcoming Events</div>
          {!events?.length ? (
            <p style={{ fontSize: '13px', color: '#aaa' }}>No events scheduled yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {events.map(ev => (
                <div key={ev.id} style={{ padding: '1.2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1a1a1a' }}>{ev.name}</div>
                    <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.3)', padding: '2px 6px', flexShrink: 0, marginLeft: '0.5rem' }}>{ev.type}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#c5a882', marginBottom: '0.25rem', letterSpacing: '0.06em' }}>{ev.date}</div>
                  {ev.location && <div style={{ fontSize: '11px', color: '#888' }}>{ev.location}</div>}
                  {ev.description && <div style={{ fontSize: '12px', color: '#777', lineHeight: '1.6', marginTop: '0.4rem' }}>{ev.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Cars */}
        {carList.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem' }}>My Cars</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {carList.map((car, i) => (
                <div key={i} style={{ padding: '1.2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.4rem' }}>
                    {[car.year, car.make, car.model].filter(Boolean).join(' ') || 'Unnamed car'}
                  </div>
                  {car.license_plate && (
                    <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>
                      {car.license_plate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Attended */}
        {attendedEvents.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem' }}>Events Attended</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {attendedEvents.map((r, i) => (
                <div key={i} style={{ padding: '1.2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3B6B2F', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.875rem', color: '#1a1a1a' }}>{r.event}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
