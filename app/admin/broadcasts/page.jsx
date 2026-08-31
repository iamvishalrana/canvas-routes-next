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

    // Tag each event with the broadcast it belongs to (if any) — joins via
    // resend_message_id, same correlation the per-broadcast stats route
    // (app/api/admin/broadcasts/[id]/stats) already does. Lets the merged
    // Email Activity tab show which rows came from a broadcast vs. a
    // transactional send, without duplicating the flat event list per-broadcast.
    const messageIds = [...new Set(emailEvents.map(e => e.resend_message_id).filter(Boolean))]
    if (messageIds.length > 0) {
      const { data: recipients } = await supabase
        .from('broadcast_recipients')
        .select('resend_message_id, broadcast_id')
        .in('resend_message_id', messageIds)
      const broadcastIds = [...new Set((recipients || []).map(r => r.broadcast_id).filter(Boolean))]
      const { data: broadcasts } = broadcastIds.length
        ? await supabase.from('broadcasts').select('id, subject').in('id', broadcastIds)
        : { data: [] }
      const subjectById = new Map((broadcasts || []).map(b => [b.id, b.subject]))
      const broadcastByMessageId = new Map((recipients || []).map(r => [r.resend_message_id, { broadcastId: r.broadcast_id, subject: subjectById.get(r.broadcast_id) || null }]))
      emailEvents = emailEvents.map(e => {
        const match = e.resend_message_id ? broadcastByMessageId.get(e.resend_message_id) : null
        return { ...e, broadcast_id: match?.broadcastId || null, broadcast_subject: match?.subject || null }
      })
    }
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
