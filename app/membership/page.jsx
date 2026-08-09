import MembershipContent from '../../components/MembershipContent'
import { createAdminClient } from '../../lib/supabase/admin'
import { captureException } from '../../lib/sentry'

// Matches every other page in this codebase that calls createAdminClient()
// (see app/admin/revenue/page.jsx, app/admin/payments/page.jsx, etc.) —
// the service-role key isn't available during the build's static-generation
// pass, only at request time, and an admin flipping membership_open off
// should take effect immediately rather than waiting on a stale cache.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: { absolute: 'Membership | Canvas Routes' },
  description: 'Apply to join Canvas Routes — the Montreal automotive community. Curated road trips, Cars & Coffee events, and a network of drivers who care about the craft.',
  alternates: { canonical: 'https://canvasroutes.com/membership' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Membership | Canvas Routes',
    description: 'Apply to join Canvas Routes — curated road trips, Cars & Coffee, and a community of drivers in Montreal.',
    url: 'https://canvasroutes.com/membership',
    images: [{ url: 'https://canvasroutes.com/membership-hero.jpeg', width: 1200, height: 630, alt: 'Canvas Routes Membership — Montreal Automotive Community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Membership | Canvas Routes',
    description: 'Apply to join Canvas Routes — curated road trips, Cars & Coffee, and a community of drivers in Montreal.',
    images: ['https://canvasroutes.com/membership-hero.jpeg'],
  },
}

// membership_open used to only be checked by the membership-waitlist API route
// — after the card was already authorized via Stripe. Checking it here too
// means a paused membership program actually stops people before they pay,
// matching what this toggle's own description on the Settings page promises.
//
// Fails open on any Supabase hiccup (missing env, transient DB error) rather
// than crashing the whole page — this is a public marketing/application page,
// not an admin tool, so it must stay up even if the settings lookup can't
// complete. membership-waitlist's own check of the same setting already
// follows this same fail-open pattern.
export default async function MembershipPage() {
  let settings = {}
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('settings').select('key, value').in('key', ['membership_open', 'membership_closed_message'])
    settings = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  } catch (err) {
    captureException(err, { context: 'membership-page-settings-check' })
  }
  const membershipOpen = settings.membership_open !== 'false'
  return <MembershipContent membershipOpen={membershipOpen} closedMessage={settings.membership_closed_message} />
}
