// Call this endpoint every ~50 days to extend the token for another 60 days.
// Requires INSTAGRAM_APP_SECRET in env vars.
// Returns the new token — paste it into Vercel as INSTAGRAM_ACCESS_TOKEN.
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET

  if (!token || !appId || !appSecret) {
    return Response.json({ error: 'Missing env vars: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`
    )
    const data = await res.json()

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString()

    return Response.json({
      message: 'Token refreshed. Update INSTAGRAM_ACCESS_TOKEN in Vercel with the new token below.',
      new_token: data.access_token,
      expires_in_days: Math.round((data.expires_in || 5184000) / 86400),
      expires_at: expiresAt,
    })
  } catch (err) {
    return Response.json({ error: 'Failed to refresh token' }, { status: 502 })
  }
}
