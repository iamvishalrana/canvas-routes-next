import { createAdminClient } from '../../../lib/supabase/admin'
import BroadcastsClient from './BroadcastsClient'

// force-dynamic — BroadcastsClient reads ?email= via useSearchParams() (the
// EmailLink shortcut from Members/Applications/Contacts), which requires a
// Suspense boundary on a statically-generated page. Opting the whole route
// out of static generation sidesteps that instead of adding a boundary.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Broadcasts' }

export default async function BroadcastsPage() {
  // Feeds the Email Activity tab (folded in from the former /admin/email-activity
  // top-level page — same query that page used).
  let emailEvents = []
  let emailLoadError = false
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('email_events')
      .select('id, resend_message_id, event_type, recipient, subject, from_address, bounce_type, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(500)
    if (error) throw error
    emailEvents = data || []
  } catch {
    emailLoadError = true
  }
  const emailCounts = emailEvents.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1
    return acc
  }, {})

  return (
    <BroadcastsClient
      emailEvents={emailEvents}
      emailCounts={emailCounts}
      emailConfigured={!!process.env.RESEND_WEBHOOK_SECRET}
      emailLoadError={emailLoadError}
      emailFetchedAt={new Date().toISOString()}
    />
  )
}
