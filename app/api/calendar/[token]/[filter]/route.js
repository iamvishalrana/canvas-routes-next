import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { isValidCalendarToken } from '../../../../../lib/adminCalendarToken'
import { buildCalendarFeed } from '../../../../../lib/adminCalendarFeed'

// Single-category feeds — subscribing to these instead of (or alongside)
// the combined feed at /api/calendar/[token] gives each category its own
// entry in iOS's calendar list, which iOS lets you show/hide independently
// with its normal per-calendar checkbox. That's the only way to get "only
// show birthdays" in the native Calendar app — a single .ics feed has no
// concept of sub-filtering once subscribed.
const FILTERS = {
  events:    { events: true,  birthdays: false, notes: false, calName: 'Canvas Routes Events' },
  birthdays: { events: false, birthdays: true,  notes: false, calName: 'Canvas Routes Birthdays' },
  notes:     { events: false, birthdays: false, notes: true,  calName: 'Canvas Routes Notes' },
}

export async function GET(request, { params }) {
  const { token, filter } = await params
  const parts = FILTERS[filter]
  if (!parts) return new Response('Not found', { status: 404 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 60, 60, 'calendar-ics')) return new Response('Too many requests.', { status: 429 })

  const supabase = createAdminClient()
  if (!await isValidCalendarToken(supabase, token)) return new Response('Not found', { status: 404 })

  const ics = await buildCalendarFeed(supabase, parts)

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="canvas-routes-${filter}.ics"`,
      'Cache-Control': 'private, max-age=900',
    },
  })
}
