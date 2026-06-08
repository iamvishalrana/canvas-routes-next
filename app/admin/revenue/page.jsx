import { createAdminClient } from '../../../lib/supabase/admin'
import RevenueClient from './RevenueClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revenue — Admin' }

const TYPE_LABELS = {
  membership_routes: 'Routes Member',
  membership_inner_circle: 'Inner Circle',
  road_trip_standard: 'Road Trip (Standard)',
  road_trip_member: 'Road Trip (Member)',
  road_trip_inner_circle: 'Road Trip (Inner Circle)',
}

export default async function RevenuePage() {
  const supabase = createAdminClient()

  const { data: payments } = await supabase
    .from('applications')
    .select('name, email, stripe_amount_paid, stripe_paid_at, stripe_payment_status, stripe_payment_type')
    .eq('stripe_payment_status', 'paid')
    .order('stripe_paid_at', { ascending: false })

  const rows = payments || []

  // Total revenue and count
  const totalRevenue = rows.reduce((sum, r) => sum + (r.stripe_amount_paid || 0), 0) / 100
  const totalPaid = rows.length

  // By payment type
  const byTypeMap = {}
  for (const r of rows) {
    const key = r.stripe_payment_type || 'unknown'
    if (!byTypeMap[key]) byTypeMap[key] = { count: 0, revenue: 0 }
    byTypeMap[key].count += 1
    byTypeMap[key].revenue += (r.stripe_amount_paid || 0) / 100
  }
  const byType = Object.entries(byTypeMap).map(([key, val]) => ({
    key,
    label: TYPE_LABELS[key] || key,
    count: val.count,
    revenue: val.revenue,
  }))

  // Monthly breakdown
  const byMonthMap = {}
  for (const r of rows) {
    if (!r.stripe_paid_at) continue
    const d = new Date(r.stripe_paid_at)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonthMap[ym]) byMonthMap[ym] = { count: 0, revenue: 0 }
    byMonthMap[ym].count += 1
    byMonthMap[ym].revenue += (r.stripe_amount_paid || 0) / 100
  }
  const byMonth = Object.entries(byMonthMap)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ym, val]) => {
      const [year, month] = ym.split('-')
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
      return { ym, label, count: val.count, revenue: val.revenue }
    })

  // Recent 10 payments
  const recentPayments = rows.slice(0, 10).map(r => ({
    name: r.name || '—',
    email: r.email || '—',
    amount: (r.stripe_amount_paid || 0) / 100,
    type: TYPE_LABELS[r.stripe_payment_type] || r.stripe_payment_type || '—',
    date: r.stripe_paid_at,
  }))

  return (
    <RevenueClient
      totalRevenue={totalRevenue}
      totalPaid={totalPaid}
      byType={byType}
      byMonth={byMonth}
      recentPayments={recentPayments}
    />
  )
}
