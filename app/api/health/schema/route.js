import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureMessage } from '../../../../lib/sentry'

// Schema-sync health check — verifies the production DB has every column the
// public write paths depend on, without writing anything. limit(0) makes
// PostgREST validate the column list against the schema cache and return zero
// rows, so a migration that was never run in the SQL Editor fails here instead
// of at a real user's registration (as happened with applications.referred_by,
// which was missing in prod for a month while every membership upsert failed).
//
// Add a table/column here whenever a route starts writing or selecting a new
// column. Returns which check failed, never row data — safe to leave public.

const CHECKS = {
  // Union of columns written by /api/waitlist, /api/membership-waitlist,
  // and the Stripe webhook rescue path.
  applications: [
    'email', 'device_type', 'name', 'car_year', 'car_make', 'car_model',
    'car_paint', 'phone', 'instagram', 'dob', 'dob_month', 'dob_day',
    'dob_year', 'source', 'more', 'referred_by', 'registrations',
    'reregistered_at', 'stripe_payment_status', 'stripe_payment_type',
    'stripe_payment_intent_id', 'stripe_amount_paid', 'waitlist_notified_pi',
  ],
  // Full union of columns selected by /api/upcoming-routes, /past, and
  // /interest — the main list endpoint selects far more than the past one,
  // and a missing column on ANY of them 500s the routes page.
  upcoming_routes: [
    'id', 'slug', 'name', 'destination', 'month_label', 'description',
    'duration_label', 'distance_label', 'target_count', 'sort_order',
    'trip_type', 'price_per_car', 'price_range', 'itinerary',
    'activity_options', 'dest_lat', 'dest_lng', 'launched',
    'is_active', 'is_past', 'cars_rolled_out', 'photo_url', 'recap_href',
    'threshold_notified_at',
  ],
  // Columns written/read by /api/upcoming-routes/interest — the routes page
  // aggregates interested counts from this table on every load.
  route_interest: [
    'route_id', 'email', 'name', 'phone', 'car', 'preferences', 'is_member',
  ],
}

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()
  const failures = []
  for (const [table, columns] of Object.entries(CHECKS)) {
    const { error } = await supabase.from(table).select(columns.join(',')).limit(0)
    if (error) failures.push({ table, error: error.message })
  }
  if (failures.length) {
    // The daily Vercel cron hits this route — capturing here turns a schema
    // drift into a Sentry alert before any user hits the broken endpoint
    captureMessage(`Schema health check failed — ${failures.map(f => f.table).join(', ')}`, { failures })
    return Response.json({ ok: false, failures }, { status: 500 })
  }
  return Response.json({ ok: true, tables: Object.keys(CHECKS).length })
}
