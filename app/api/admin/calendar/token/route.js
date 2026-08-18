import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'
const KEY = 'admin_calendar_token'

// A UUID (122 bits of randomness) — unguessable by brute force, but still
// just a copy/paste string, no separate login flow needed to subscribe.
// Same "unguessable bearer token in a public URL" pattern already used for
// rsvp_tokens and photo_shares elsewhere in this codebase.
function newToken() { return crypto.randomUUID() }

function feedUrls(path) {
  return {
    url: `${SITE}${path}`,
    // webcal:// is what makes iOS open the "Subscribe to Calendar" sheet
    // directly instead of just downloading a one-off file.
    webcalUrl: `webcal://${SITE.replace(/^https?:\/\//, '')}${path}`,
  }
}

// One combined feed plus three single-category ones. Subscribing to the
// single-category feeds instead of (or alongside) the combined one gives
// each its own entry in iOS's calendar list, toggleable independently —
// the only way to get "only show birthdays" in the native Calendar app.
// No file extension on any path — the Content-Type header is what tells
// iOS/Google/Outlook these are calendar feeds.
function urlsFor(token) {
  return {
    all:       feedUrls(`/api/calendar/${token}`),
    events:    feedUrls(`/api/calendar/${token}/events`),
    birthdays: feedUrls(`/api/calendar/${token}/birthdays`),
    notes:     feedUrls(`/api/calendar/${token}/notes`),
  }
}

export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const { data: existing } = await supabase.from('settings').select('value').eq('key', KEY).maybeSingle()
  let token = existing?.value
  if (!token) {
    // Insert-or-ignore, not a blind upsert: if two requests race here (e.g.
    // the calendar page opened in two tabs before this row has ever been
    // created), a plain upsert would let the second write silently clobber
    // the first — whichever tab read the response first would then be
    // holding a token that's already invalid. ON CONFLICT DO NOTHING means
    // whichever request's INSERT lands first wins and the other's is a
    // no-op; reading back afterward (below) always returns the one that
    // actually stuck, for both requests.
    const candidate = newToken()
    const { error } = await supabase.from('settings')
      .upsert({ key: KEY, value: candidate, updated_at: new Date().toISOString() }, { onConflict: 'key', ignoreDuplicates: true })
    if (error) {
      captureException(error, { context: 'admin-calendar-token-create' })
      return Response.json({ error: error.message }, { status: 500 })
    }
    const { data: row, error: readErr } = await supabase.from('settings').select('value').eq('key', KEY).maybeSingle()
    if (readErr || !row?.value) {
      captureException(readErr || new Error('admin_calendar_token missing after insert'), { context: 'admin-calendar-token-readback' })
      return Response.json({ error: 'Failed to create sync link.' }, { status: 500 })
    }
    token = row.value
  }
  return Response.json({ token, feeds: urlsFor(token) })
}

// Regenerate — invalidates the old link. Use if it's ever leaked/pasted
// somewhere it shouldn't have been.
export async function POST() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const token = newToken()
  const { error } = await supabase.from('settings').upsert({ key: KEY, value: token, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) {
    captureException(error, { context: 'admin-calendar-token-regenerate' })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ token, feeds: urlsFor(token) })
}
