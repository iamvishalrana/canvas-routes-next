import { after } from 'next/server'
import { buildCheckinCompleteHtml } from './checkinCompleteEmail.js'
import { captureException, captureMessage } from './sentry.js'

// Called from each of the three check-in section routes (trip-details,
// waiver, lunch) after a successful save — whichever section happens to be
// completed last for a given registrant is what triggers the email, so this
// re-checks all three every time rather than assuming a fixed order.
export async function maybeSendCheckinCompleteEmail(admin, eventId, email, eventName) {
  const { data: event } = await admin.from('events')
    .select('checkin_sections').eq('id', eventId).maybeSingle()
  const sections = event?.checkin_sections || []
  const hasTrip = sections.includes('trip_details')
  const hasWaiver = sections.includes('waiver')
  const hasLunch = sections.includes('lunch')

  const { data: row } = await admin.from('event_checkins')
    .select('name, trip_details, waiver, lunch, completion_email_sent_at')
    .eq('event_id', eventId).eq('email', email).maybeSingle()
  if (!row) return

  const allDone = (!hasTrip || !!row.trip_details) && (!hasWaiver || !!row.waiver) && (!hasLunch || (row.lunch?.length > 0))
  if (!allDone || row.completion_email_sent_at || !process.env.RESEND_API_KEY) return

  // Atomic claim — two of the three section saves can race to be "the last
  // one", only whichever wins this update actually sends the email.
  const { data: claimed } = await admin.from('event_checkins')
    .update({ completion_email_sent_at: new Date().toISOString() })
    .eq('event_id', eventId).eq('email', email).is('completion_email_sent_at', null)
    .select('id')
  if (!claimed?.length) return

  const firstName = (row.name || email.split('@')[0] || 'there').trim().split(' ')[0]

  after(() =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        reply_to: 'jerry@canvasroutes.com',
        subject: `You're all set — ${eventName}`,
        html: buildCheckinCompleteHtml(firstName, eventName, row.waiver),
        text: `Hey ${firstName},\n\nYour check-in for ${eventName} is complete.\n\nThe full itinerary will be shared with you a few days before the day of the route.\n\nSee you on the road,\nJerry\nCanvas Routes`,
      }),
    }).then(r => { if (r && !r.ok) captureMessage('Resend non-200 — checkin-complete-email', { status: r.status }) }).catch(err => captureException(err, { context: 'checkin-complete-email', email, eventId }))
  )
}
