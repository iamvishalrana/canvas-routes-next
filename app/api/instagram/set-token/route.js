import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json().catch(() => ({}))
  if (!token?.trim()) return Response.json({ error: 'Token is required.' }, { status: 400 })

  const raw = token.trim()
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  const supabase = createAdminClient()

  // Try to exchange for a long-lived token (works for personal user tokens)
  if (appId && appSecret) {
    const exchRes = await fetch(
      `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${raw}`
    )
    const exchData = await exchRes.json()

    if (!exchData.error) {
      const longLivedToken = exchData.access_token

      // Try to get a Page Access Token — these never expire and survive user logouts
      const pagesRes = await fetch(`https://graph.facebook.com/me/accounts?access_token=${longLivedToken}`)
      const pagesData = await pagesRes.json()
      const pages = pagesData.data || []

      // Pick the Canvas Routes page (or the first one if only one page)
      const page = pages.length === 1 ? pages[0] : pages.find(p => /canvas.?routes/i.test(p.name)) || pages[0]

      if (page?.access_token) {
        // Page token — never expires, not tied to personal login
        await Promise.all([
          supabase.from('settings').upsert({ key: 'instagram_access_token', value: page.access_token, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
          supabase.from('settings').upsert({ key: 'instagram_token_expires_at', value: 'never', updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        ])
        return Response.json({ ok: true, daysLeft: null, expiresAt: 'never', tokenType: 'page', pageName: page.name })
      }

      // No page found — fall back to storing the long-lived user token (60 days)
      const expiresAt = new Date(Date.now() + (exchData.expires_in || 5184000) * 1000).toISOString()
      await Promise.all([
        supabase.from('settings').upsert({ key: 'instagram_access_token', value: longLivedToken, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        supabase.from('settings').upsert({ key: 'instagram_token_expires_at', value: expiresAt, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
      ])
      const daysLeft = Math.round((exchData.expires_in || 5184000) / 86400)
      return Response.json({ ok: true, daysLeft, expiresAt, tokenType: 'user' })
    }
    // Exchange failed — likely a System User token; fall through to direct verification
  }

  // System User tokens can't be exchanged — verify directly against the Instagram API
  const verifyRes = await fetch(
    `https://graph.facebook.com/${accountId}/media?fields=id&limit=1&access_token=${raw}`
  )
  const verifyData = await verifyRes.json()
  if (verifyData.error) {
    return Response.json({ error: verifyData.error.message || 'Token is not valid for this Instagram account.' }, { status: 400 })
  }

  // Token works — store as-is (System User tokens never expire)
  await Promise.all([
    supabase.from('settings').upsert({ key: 'instagram_access_token', value: raw, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
    supabase.from('settings').upsert({ key: 'instagram_token_expires_at', value: 'never', updated_at: new Date().toISOString() }, { onConflict: 'key' }),
  ])
  return Response.json({ ok: true, daysLeft: null, expiresAt: 'never', tokenType: 'system_user' })
}
