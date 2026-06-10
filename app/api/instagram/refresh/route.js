import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

async function refreshToken() {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appId || !appSecret) throw new Error('Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET')

  const supabase = createAdminClient()
  const { data: row } = await supabase.from('settings').select('value').eq('key', 'instagram_access_token').maybeSingle()
  const currentToken = row?.value || process.env.INSTAGRAM_ACCESS_TOKEN
  if (!currentToken) throw new Error('No token found. Set INSTAGRAM_ACCESS_TOKEN in Vercel env vars for the first run.')

  const res = await fetch(
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`
  )
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString()

  await supabase.from('settings').upsert(
    { key: 'instagram_access_token', value: data.access_token, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  await supabase.from('settings').upsert(
    { key: 'instagram_token_expires_at', value: expiresAt, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )

  const daysLeft = Math.round((data.expires_in || 5184000) / 86400)
  console.log(`Instagram token refreshed — valid ${daysLeft} days until ${expiresAt}`)
  return { daysLeft, expiresAt }
}

// Called by Vercel cron (GET with Authorization: Bearer {CRON_SECRET})
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('Instagram cron: CRON_SECRET is not set — endpoint is disabled for safety')
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await refreshToken()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Instagram cron refresh failed:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Called manually from admin panel (POST, admin-only)
export async function POST() {
  try {
    const user = await requireAdmin()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await refreshToken()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Instagram refresh error:', err.message)
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
