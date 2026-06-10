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

      // Gather diagnostics in parallel
      const [pagesRes, meRes, permsRes] = await Promise.all([
        fetch(`https://graph.facebook.com/me/accounts?access_token=${longLivedToken}`),
        fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${longLivedToken}`),
        fetch(`https://graph.facebook.com/me/permissions?access_token=${longLivedToken}`),
      ])
      const [pagesData, meData, permsData] = await Promise.all([pagesRes.json(), meRes.json(), permsRes.json()])
      const pages = pagesData.data || []
      const grantedPerms = (permsData.data || []).filter(p => p.status === 'granted').map(p => p.permission)

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

      // No pages from /me/accounts — try to find the connected page directly from the Instagram account ID
      let connectedPage = null
      if (accountId) {
        const igPageRes = await fetch(`https://graph.facebook.com/${accountId}?fields=page{id,name,access_token}&access_token=${longLivedToken}`)
        const igPageData = await igPageRes.json()
        if (igPageData.page?.access_token) {
          connectedPage = igPageData.page
        } else if (igPageData.page?.id) {
          // Found the page but no access_token — token user isn't admin of it
          const expiresAt = new Date(Date.now() + (exchData.expires_in || 5184000) * 1000).toISOString()
          await Promise.all([
            supabase.from('settings').upsert({ key: 'instagram_access_token', value: longLivedToken, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
            supabase.from('settings').upsert({ key: 'instagram_token_expires_at', value: expiresAt, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
          ])
          const daysLeft = Math.round((exchData.expires_in || 5184000) / 86400)
          return Response.json({ ok: true, daysLeft, expiresAt, tokenType: 'user', warning: `Saved as a user token. Token belongs to "${meData.name}" (${meData.id}). Instagram is connected to Facebook Page "${igPageData.page.name}" (ID: ${igPageData.page.id}) — but this Facebook account is not an admin of that Page. Log into Graph Explorer as the admin of "${igPageData.page.name}" to get a permanent page token.` })
        }
      }

      if (connectedPage?.access_token) {
        await Promise.all([
          supabase.from('settings').upsert({ key: 'instagram_access_token', value: connectedPage.access_token, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
          supabase.from('settings').upsert({ key: 'instagram_token_expires_at', value: 'never', updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        ])
        return Response.json({ ok: true, daysLeft: null, expiresAt: 'never', tokenType: 'page', pageName: connectedPage.name })
      }

      // True fallback — no page found anywhere
      const expiresAt = new Date(Date.now() + (exchData.expires_in || 5184000) * 1000).toISOString()
      await Promise.all([
        supabase.from('settings').upsert({ key: 'instagram_access_token', value: longLivedToken, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        supabase.from('settings').upsert({ key: 'instagram_token_expires_at', value: expiresAt, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
      ])
      const daysLeft = Math.round((exchData.expires_in || 5184000) / 86400)
      return Response.json({ ok: true, daysLeft, expiresAt, tokenType: 'user', warning: `Saved as user token for "${meData.name}" (${meData.id}). No Facebook Page found. Permissions on this token: ${grantedPerms.join(', ') || 'none listed'}. pages_show_list present: ${grantedPerms.includes('pages_show_list') ? 'YES' : 'NO — this is the missing permission'}. Connect the Instagram to a Facebook Page and try again.` })
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
