import { createAdminClient } from '../../../lib/supabase/admin'
import Link from 'next/link'
import StatNumber from './StatNumber'
import DeviceChart from './DeviceChart'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dashboard' }

const PAGE_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', boxShadow: '0 2px 16px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.03)' }

export default async function DashboardPage() {
  const supabase = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in180 = new Date(today)
  in180.setDate(in180.getDate() + 180)
  const todayStr = today.toISOString().slice(0, 10)
  const in180Str = in180.toISOString().slice(0, 10)
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  let totalMembers = 0, activeMembers = 0, totalContacts = 0, newMembersWeek = 0, authorizedHolds = 0
  let recentMembers = [], recentContacts = [], upcomingEvents = [], deviceRows = [], receipts = [], birthdayRows = []

  try {
    ;[
      { count: totalMembers },
      { count: activeMembers },
      { count: totalContacts },
      { count: newMembersWeek },
      { count: authorizedHolds },
      { data: recentMembers },
      { data: recentContacts },
      { data: upcomingEvents },
      { data: deviceRows },
      { data: receipts },
      { data: birthdayRows },
    ] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true }),
      supabase.from('members').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('members').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('stripe_payment_status', 'authorized'),
      supabase.from('members').select('id, name, email, created_at, membership_status, tier').order('created_at', { ascending: false }).limit(7),
      supabase.from('contacts').select('id, created_at, applications(name, email)').order('created_at', { ascending: false }).limit(5),
      supabase.from('events').select('id, name, date, type').gte('date', todayStr).lte('date', in180Str).order('date').limit(8),
      supabase.from('applications').select('device_type').not('device_type', 'is', null),
      supabase.from('payment_receipts').select('total_amount, paid_at'),
      supabase.from('members').select('name, dob_day, dob_month').eq('membership_status', 'active').not('dob_day', 'is', null).not('dob_month', 'is', null),
    ])
  } catch {
    // Partial failures degrade gracefully — stats will show 0/empty
  }

  // Revenue collected (from our own receipts ledger — fast + refund-agnostic
  // gross; the Revenue page is the authoritative net view).
  let revAll = 0, revMonth = 0
  for (const r of receipts || []) {
    const amt = r.total_amount || 0
    revAll += amt
    if (r.paid_at && new Date(r.paid_at) >= monthStart) revMonth += amt
  }
  const fmtMoney = cents => '$' + Math.round((cents || 0) / 100).toLocaleString('en-CA')

  // Upcoming birthdays in the next 21 days (active members), so the club can
  // send a note. dob_year isn't needed — just month/day.
  const birthdays = (() => {
    const now = new Date()
    const out = []
    for (const m of birthdayRows || []) {
      if (!m.dob_month || !m.dob_day) continue
      let next = new Date(now.getFullYear(), m.dob_month - 1, m.dob_day)
      next.setHours(0, 0, 0, 0)
      const t0 = new Date(now); t0.setHours(0, 0, 0, 0)
      if (next < t0) next = new Date(now.getFullYear() + 1, m.dob_month - 1, m.dob_day)
      const days = Math.round((next - t0) / 86400000)
      if (days <= 21) out.push({ name: m.name, days, month: m.dob_month, day: m.dob_day })
    }
    return out.sort((a, b) => a.days - b.days).slice(0, 6)
  })()

  // Aggregate the device split for the chart card
  const deviceCountMap = {}
  for (const r of deviceRows || []) {
    if (r.device_type) deviceCountMap[r.device_type] = (deviceCountMap[r.device_type] || 0) + 1
  }
  const deviceCounts = Object.entries(deviceCountMap).map(([label, count]) => ({ label, count }))

  const recentSignups = [
    ...(recentMembers || []).map(m => ({ name: m.name || m.email, type: 'Member', date: m.created_at, tier: m.tier, status: m.membership_status })),
    ...(recentContacts || []).map(c => ({ name: c.applications?.name || c.applications?.email, type: 'Contact', date: c.created_at })),
  ]
    .filter(r => r.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)

  const stats = [
    { label: 'Active Members', value: activeMembers ?? 0, href: '/admin/members?status=active', color: '#3B6B2F' },
    { label: 'New This Week', value: newMembersWeek ?? 0, href: '/admin/members', color: '#1a1a1a' },
    { label: 'Revenue · This Month', value: fmtMoney(revMonth), href: '/admin/revenue', color: '#3B6B2F', small: true },
    { label: 'Revenue · All Time', value: fmtMoney(revAll), href: '/admin/revenue', color: '#1a1a1a', small: true },
    { label: 'Holds to Capture', value: authorizedHolds ?? 0, href: '/admin/payments', color: (authorizedHolds ?? 0) > 0 ? '#8A6535' : '#1a1a1a' },
    { label: 'Total Contacts', value: totalContacts ?? 0, href: '/admin/contacts', color: '#1a1a1a' },
  ]

  const quickActions = [
    { label: 'Send Broadcast', href: '/admin/broadcasts' },
    { label: 'Add Expense', href: '/admin/expenses' },
    { label: 'Revenue', href: '/admin/revenue' },
    { label: 'Photo Gallery', href: '/admin/photos' },
    { label: 'Routes', href: '/admin/upcoming-routes' },
    { label: 'Events', href: '/admin/events' },
  ]

  return (
    <div style={PAGE_STYLE}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>Canvas Routes</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <Link key={s.label} href={s.href} className="admin-card-lift" style={{ ...CARD, padding: '1.25rem 1.5rem', textDecoration: 'none', display: 'block', opacity: 0, animation: 'adminFadeIn 0.35s ease-out forwards', animationDelay: `${i * 0.09}s` }}>
            <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: s.small ? '1.9rem' : '2.5rem', fontWeight: '400', color: s.color, lineHeight: 1, letterSpacing: '0.03em', wordBreak: 'break-word' }}><StatNumber value={s.value} /></div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.label}</div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Device split */}
        <div style={{ ...CARD, padding: '1.5rem', opacity: 0, animation: 'adminFadeIn 0.35s ease-out forwards', animationDelay: '0.3s' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1.1rem', fontFamily: 'var(--font-inter),sans-serif' }}>Devices</div>
          <DeviceChart counts={deviceCounts} />
        </div>

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
                {new Date(r.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })}
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
            <div style={{ fontSize: '12px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>No upcoming events in the next 180 days.</div>
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

        {/* Upcoming birthdays */}
        <div style={{ ...CARD, padding: '1.5rem', opacity: 0, animation: 'adminFadeIn 0.35s ease-out forwards', animationDelay: '0.56s' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>Upcoming Birthdays</div>
          {birthdays.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>None in the next 3 weeks.</div>
          ) : birthdays.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: i < birthdays.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-inter),sans-serif' }}>{b.name || '—'}</div>
              <div style={{ fontSize: '11px', color: b.days === 0 ? '#93333E' : '#c5a882', flexShrink: 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                {b.days === 0 ? 'Today 🎂' : b.days === 1 ? 'Tomorrow' : `in ${b.days} days`}
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ ...CARD, padding: '1.5rem', opacity: 0, animation: 'adminFadeIn 0.35s ease-out forwards', animationDelay: '0.65s' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {quickActions.map(a => (
              <Link key={a.href} href={a.href} className="admin-card-lift"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.7rem 0.85rem', borderRadius: '10px', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fafaf9', textDecoration: 'none', color: '#1a1a1a', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif' }}>
                {a.label}
                <span style={{ color: '#c5a882' }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
