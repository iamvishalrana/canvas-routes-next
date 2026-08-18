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

function urlsFor(token) {
  // No file extension needed on the path — the Content-Type header is what
  // tells iOS/Google/Outlook this is a calendar feed, and skipping it avoids
  // any dynamic-route parsing to strip a suffix back off the token.
  const path = `/api/calendar/${token}`
  return {
    url: `${SITE}${path}`,
    // webcal:// is what makes iOS open the "Subscribe to Calendar" sheet
    // directly instead of just downloading a one-off file.
    webcalUrl: `webcal://${SITE.replace(/^https?:\/\//, '')}${path}`,
  }
}

export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const { data: existing } = await supabase.from('settings').select('value').eq('key', KEY).maybeSingle()
  let token = existing?.value
  if (!token) {
    token = newToken()
    const { error } = await supabase.from('settings').upsert({ key: KEY, value: token, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) {
      captureException(error, { context: 'admin-calendar-token-create' })
      return Response.json({ error: error.message }, { status: 500 })
    }
  }
  return Response.json({ token, ...urlsFor(token) })
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
  return Response.json({ token, ...urlsFor(token) })
}
