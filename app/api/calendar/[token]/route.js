import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'
import { isValidCalendarToken } from '../../../../lib/adminCalendarToken'
import { buildCalendarFeed } from '../../../../lib/adminCalendarFeed'

// Combined feed — every event ever added (past and future), every
// member/applicant's birthday (recurring yearly), and every day note, all in
// one calendar. For separately toggleable calendars in iOS (e.g. "only show
// birthdays"), see the three single-category feeds at
// /api/calendar/[token]/[filter]. The token in the URL (see
// app/api/admin/calendar/token/route.js) is the only access control — no
// login, so iOS/Google/Outlook can poll it unattended. Same "unguessable
// bearer token, no auth flow" pattern as /api/events/[id]/ical and the
// site's other token-gated public routes (rsvp, gallery shares).
export async function GET(request, { params }) {
  const { token } = await params

  const ip = getClientIp(request)
  // Generous — calendar clients (and the admin manually refreshing) poll
  // repeatedly; the token's entropy is the real defence, this is just hygiene.
  if (await checkRateLimit(ip, 60, 60, 'calendar-ics')) return new Response('Too many requests.', { status: 429 })

  const supabase = createAdminClient()
  if (!await isValidCalendarToken(supabase, token)) return new Response('Not found', { status: 404 })

  const ics = await buildCalendarFeed(supabase, { events: true, birthdays: true, notes: true, calName: 'Canvas Routes' })

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="canvas-routes-calendar.ics"',
      'Cache-Control': 'private, max-age=900',
    },
  })
}
