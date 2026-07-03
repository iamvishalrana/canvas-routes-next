import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { normalizeEmail } from '../../../../lib/normalizeEmail'
import { isWtetEventName } from '../../../../lib/wtetRegistrationContent'
import { normalizeEventName } from '../../../../lib/eventMeta'

// Temporary read-only diagnostic — visit /api/admin/wtet-debug?email=a@b.com,c@d.com
// while logged into /admin to see exactly why a given email does or doesn't
// pass the WTET check-in gate, without needing direct Supabase access.
export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('email') || ''
  const emails = raw.split(',').map(normalizeEmail).filter(Boolean)
  if (emails.length === 0) return Response.json({ error: 'Pass ?email=a@b.com,c@d.com' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('applications')
    .select('id, email, name, stripe_payment_type, stripe_payment_status, registrations, wtet_checkin, wtet_waiver, wtet_lunch')
    .in('email', emails)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results = emails.map(email => {
    const app = (data || []).find(a => a.email === email)
    if (!app) return { email, found: false }
    const isStripeWtet = app.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(app.stripe_payment_status)
    const isManualWtet = (app.registrations || []).some(r => r.source === 'admin_manual' && isWtetEventName(normalizeEventName(r.event)))
    return {
      email,
      found: true,
      id: app.id,
      name: app.name,
      stripe_payment_type: app.stripe_payment_type,
      stripe_payment_status: app.stripe_payment_status,
      registrations: app.registrations,
      passesCheckinGate: isStripeWtet || isManualWtet,
      isStripeWtet,
      isManualWtet,
      wtet_checkin: app.wtet_checkin,
      wtet_waiver: !!app.wtet_waiver,
      wtet_lunch: app.wtet_lunch,
    }
  })

  return Response.json({ results })
}
