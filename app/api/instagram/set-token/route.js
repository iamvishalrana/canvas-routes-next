import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json().catch(() => ({}))
  if (!token?.trim()) return Response.json({ error: 'Token is required.' }, { status: 400 })

  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appId || !appSecret) return Response.json({ error: 'INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET not set in Vercel env vars.' }, { status: 503 })

  // Exchange the short-lived token for a long-lived one (60 days)
  const res = await fetch(
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token.trim()}`
  )
  const data = await res.json()
  if (data.error) return Response.json({ error: data.error.message || 'Facebook rejected the token.' }, { status: 400 })

  const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString()

  const supabase = createAdminClient()
  await Promise.all([
    supabase.from('settings').upsert({ key: 'instagram_access_token', value: data.access_token, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
    supabase.from('settings').upsert({ key: 'instagram_token_expires_at', value: expiresAt, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
  ])

  const daysLeft = Math.round((data.expires_in || 5184000) / 86400)
  return Response.json({ ok: true, daysLeft, expiresAt })
}
