import { createAdminClient } from '../../../lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard — Admin' }

const PAGE_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in90 = new Date(today)
  in90.setDate(in90.getDate() + 90)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const in90Str = `${in90.getFullYear()}-${String(in90.getMonth() + 1).padStart(2, '0')}-${String(in90.getDate()).padStart(2, '0')}`

  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: totalContacts },
    { count: paidApplications },
    { data: recentMembers },
    { data: recentContacts },
    { data: upcomingEvents },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('stripe_payment_status', 'paid'),
    supabase.from('members').select('id, name, email, created_at, membership_status, tier').order('created_at', { ascending: false }).limit(7),
    supabase.from('contacts').select('id, created_at, applications(name, email)').order('created_at', { ascending: false }).limit(5),
    supabase.from('events').select('id, name, date, type').gte('date', todayStr).lte('date', in90Str).order('date').limit(5),
  ])

  const recentSignups = [
    ...(recentMembers || []).map(m => ({ name: m.name || m.email, type: 'Member', date: m.created_at, tier: m.tier, status: m.membership_status })),
    ...(recentContacts || []).map(c => ({ name: c.applications?.name || c.applications?.email, type: 'Contact', date: c.created_at })),
  ]
    .filter(r => r.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)

  const stats = [
    { label: 'Total Members', value: totalMembers ?? 0, href: '/admin/members', color: '#1a1a1a' },
    { label: 'Active Members', value: activeMembers ?? 0, href: '/admin/members?status=active', color: '#3B6B2F' },
    { label: 'Paid Applications', value: paidApplications ?? 0, href: '/admin/applications', color: '#8A6535' },
    { label: 'Total Contacts', value: totalContacts ?? 0, href: '/admin/contacts', color: '#1a1a1a' },
  ]

  return (
    <div style={PAGE_STYLE}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>Canvas Routes</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <Link key={s.label} href={s.href} style={{ ...CARD, padding: '1.25rem 1.5rem', textDecoration: 'none', display: 'block', opacity: 0, animation: 'adminFadeIn 0.35s ease-out forwards', animationDelay: `${i * 0.09}s` }}>
            <div style={{ fontSize: '2.2rem', fontWeight: '300', color: s.color, lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.label}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Recent sign-ups */}
        <div style={{ ...CARD, padding: '1.5rem', opacity: 0, animation: 'adminFadeIn 0.35s ease-out forwards', animationDelay: '0.38s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}>Recent Sign-Ups</div>
            <Link href="/admin/members" style={{ fontSize: '11px', color: '#c5a882', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>View all →</Link>
          </div>
          {recentSignups.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>None yet.</div>
          ) : recentSignups.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: i < recentSignups.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-inter),sans-serif' }}>{r.name || '—'}</div>
                <div style={{ fontSize: '10px', color: r.type === 'Member' ? '#3B6B2F' : '#8A6535', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>{r.type}{r.tier ? ` · ${r.tier === 'inner_circle' ? 'Inner Circle' : 'Routes'}` : ''}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#bbb', flexShrink: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                {new Date(r.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming events */}
        <div style={{ ...CARD, padding: '1.5rem', opacity: 0, animation: 'adminFadeIn 0.35s ease-out forwards', animationDelay: '0.47s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}>Upcoming Events</div>
            <Link href="/admin/events" style={{ fontSize: '11px', color: '#c5a882', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>Manage →</Link>
          </div>
          {(upcomingEvents || []).length === 0 ? (
            <div style={{ fontSize: '12px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>No upcoming events in the next 90 days.</div>
          ) : (upcomingEvents || []).map((e, i, arr) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-inter),sans-serif' }}>{e.name}</div>
                {e.type && <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A6535', marginTop: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>{e.type}</div>}
              </div>
              <div style={{ fontSize: '11px', color: '#c5a882', flexShrink: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{e.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
