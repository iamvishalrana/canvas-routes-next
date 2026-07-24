import { createAdminClient } from '../../../lib/supabase/admin'
import EmailActivityClient from './EmailActivityClient'

// Auth is already enforced by middleware.js — no need to re-check here.
export const revalidate = 30
export const metadata = { title: 'Email Activity — Admin' }

export default async function EmailActivityPage() {
  let events = []
  let loadError = false
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('email_events')
      .select('id, resend_message_id, event_type, recipient, subject, from_address, bounce_type, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(500)
    if (error) throw error
    events = data || []
  } catch {
    loadError = true
  }

  const counts = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1
    return acc
  }, {})

  return <EmailActivityClient events={events} counts={counts} configured={!!process.env.RESEND_WEBHOOK_SECRET} loadError={loadError} />
}
