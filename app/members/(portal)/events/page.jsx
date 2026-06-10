import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import EventsGrid from '../../../../components/EventsGrid'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Events | Canvas Routes' } }

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
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const upcoming = (events || []).filter(ev => {
    const d = parseEventDate(ev.date_display || ev.date)
    return !d || d >= today
  })
  const past = (events || []).filter(ev => {
    const d = parseEventDate(ev.date_display || ev.date)
    return d && d < today
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

      <EventsGrid upcoming={upcoming} past={past} regMap={regMap} tier={tier} />
    </div>
  )
}
