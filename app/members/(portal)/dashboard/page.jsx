import { createClient } from '../../../../lib/supabase/server'

const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.08)',  text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'  },
  pending:   { bg: 'rgba(123,91,46,0.08)',  text: '#7B5B2E', border: 'rgba(123,91,46,0.3)'  },
  suspended: { bg: 'rgba(123,32,50,0.08)',  text: '#7B2032', border: 'rgba(123,32,50,0.3)'  },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#888',    border: 'rgba(0,0,0,0.15)'      },
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: member }, { data: announcements }, { data: events }] = await Promise.all([
    supabase.from('members').select('*').eq('id', user.id).single(),
    supabase.from('announcements').select('*').eq('published', true).order('created_at', { ascending: false }).limit(4),
    supabase.from('events').select('*').order('created_at', { ascending: false }).limit(6),
  ])

  const status = member?.membership_status || 'pending'
  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.pending
  const firstName = member?.name?.split(' ')[0] || user.email.split('@')[0]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Members Portal</div>
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.4rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem' }}>
          Welcome back, {firstName}.
        </div>
        <span style={{ display: 'inline-block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0.3rem 0.9rem', border: `0.5px solid ${statusStyle.border}`, background: statusStyle.bg, color: statusStyle.text }}>
          {status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>

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

        {/* Events */}
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

      </div>
    </div>
  )
}
