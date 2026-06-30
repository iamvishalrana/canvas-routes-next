import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('settings').select('key, value')
  if (error) {
    captureException(error, { context: 'admin-settings-get' })
    return Response.json({}, { status: 200 }) // return empty if table missing
  }
  const obj = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  return Response.json(obj)
}

export async function PATCH(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const { key, value } = body
  if (!key || typeof key !== 'string' || !key.trim()) return Response.json({ error: 'Key required.' }, { status: 400 })
  if (typeof value !== 'string') return Response.json({ error: 'Value must be a string.' }, { status: 400 })

  const ALLOWED_KEYS = [
    'membership_open',
    'membership_closed_message',
    'event_registration_open',
    'event_closed_message',
    'notify_email',
    'founder_promo_code',
    'admin_banner',
    'homepage_banner',
    'event_page_url',
  ]
  if (!ALLOWED_KEYS.includes(key)) return Response.json({ error: 'Unknown setting key.' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('settings').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) {
    captureException(error, { context: 'admin-settings-patch', key })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ key, value })
}
