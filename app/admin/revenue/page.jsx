import { stripe } from '../../../lib/stripe.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import RevenueClient from './RevenueClient'

// Auth is already enforced by middleware.js — no need to re-check here.
// This page recomputes revenue totals from up to 2000 Stripe payment intents on every
// render — cache it for a minute instead of refetching on every navigation.
export const revalidate = 60
export const metadata = { title: 'Revenue — Admin' }

const TYPE_LABELS = {
  membership_routes:       'Routes Member',
  membership_inner_circle: 'Inner Circle',
  road_trip_standard:      'Route (Standard)',
  road_trip_member:        'Route (Member)',
  road_trip_inner_circle:  'Route (Inner Circle)',
  road_trip_wtet:          'WTET — July 5, 2026',
  event_registration:      'Event Registration',
}

export default async function RevenuePage() {
  let rows = []

  if (stripe) {
    const allPIs = await stripe.paymentIntents.list({ expand: ['data.latest_charge'] }).autoPagingToArray({ limit: 2000 })
    rows = allPIs
      .filter(pi => pi.metadata?.type && pi.status === 'succeeded')
      .map(pi => {
        const charge = pi.latest_charge
        const amountRefunded = (charge && typeof charge === 'object') ? (charge.amount_refunded || 0) : 0
        return {
          name:                   pi.metadata.name || '—',
          email:                  pi.metadata.email?.toLowerCase().trim() || '',
          stripe_amount_paid:     pi.amount_received,
          stripe_amount_refunded: amountRefunded,
          stripe_paid_at:         (charge && typeof charge === 'object' && charge.created)
            ? new Date(charge.created * 1000).toISOString()
            : new Date(pi.created * 1000).toISOString(),
          stripe_payment_type:    pi.metadata.type || '',
        }
      })
      .sort((a, b) => new Date(b.stripe_paid_at) - new Date(a.stripe_paid_at))
  }

  // Also include manual (e-transfer) payments from DB
  try {
    const supabase = createAdminClient()
    const stripeEmails = new Set(rows.map(r => r.email))
    const { data: manualApps } = await supabase
      .from('applications')
      .select('name, email, stripe_amount_paid, stripe_payment_type, stripe_paid_at')
      .eq('stripe_payment_status', 'paid')
      .not('stripe_amount_paid', 'is', null)
    for (const a of (manualApps || [])) {
      const email = a.email?.toLowerCase().trim()
      if (!email) continue
      if (stripeEmails.has(email)) continue
      rows.push({
        name:                   a.name || '—',
        email,
        stripe_amount_paid:     a.stripe_amount_paid,
        stripe_amount_refunded: 0,
        stripe_paid_at:         a.stripe_paid_at,
        stripe_payment_type:    a.stripe_payment_type || '',
      })
    }
    rows.sort((a, b) => new Date(b.stripe_paid_at || 0) - new Date(a.stripe_paid_at || 0))
  } catch {}

  const totalGross    = rows.reduce((sum, r) => sum + (r.stripe_amount_paid || 0), 0) / 100
  const totalRefunded = rows.reduce((sum, r) => sum + (r.stripe_amount_refunded || 0), 0) / 100
  const totalRevenue  = totalGross - totalRefunded
  const totalPaid     = rows.length

  // By payment type (net of refunds)
  const byTypeMap = {}
  for (const r of rows) {
    const key = r.stripe_payment_type || 'unknown'
    if (!byTypeMap[key]) byTypeMap[key] = { count: 0, revenue: 0 }
    byTypeMap[key].count += 1
    byTypeMap[key].revenue += ((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)) / 100
  }
  const byType = Object.entries(byTypeMap).map(([key, val]) => ({
    key, label: TYPE_LABELS[key] || key, count: val.count, revenue: val.revenue,
  }))

  // Monthly breakdown (net of refunds)
  const byMonthMap = {}
  for (const r of rows) {
    if (!r.stripe_paid_at) continue
    const d = new Date(r.stripe_paid_at)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonthMap[ym]) byMonthMap[ym] = { count: 0, revenue: 0 }
    byMonthMap[ym].count += 1
    byMonthMap[ym].revenue += ((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)) / 100
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
    name:   r.name,
    email:  r.email,
    amount: ((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)) / 100,
    type:   TYPE_LABELS[r.stripe_payment_type] || r.stripe_payment_type || '—',
    date:   r.stripe_paid_at,
  }))

  return (
    <RevenueClient
      totalRevenue={totalRevenue}
      totalPaid={totalPaid}
      byType={byType}
      byMonth={byMonth}
      recentPayments={recentPayments}
      payments={rows.map(r => ({
        name:   r.name,
        email:  r.email,
        type:   TYPE_LABELS[r.stripe_payment_type] || r.stripe_payment_type || '—',
        amount: ((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)) / 100,
        date:   r.stripe_paid_at,
      }))}
    />
  )
}
