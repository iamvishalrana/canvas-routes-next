import { createAdminClient } from '../../../../lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  if (!accountId) return Response.json({ error: 'Instagram not configured' }, { status: 503 })

  // Read token from Supabase first, fall back to env var
  let token = process.env.INSTAGRAM_ACCESS_TOKEN
  try {
    const supabase = createAdminClient()
    const { data: row } = await supabase.from('settings').select('value').eq('key', 'instagram_access_token').maybeSingle()
    if (row?.value) token = row.value
  } catch {
    // settings table may not exist yet — use env var fallback
  }

  if (!token) return Response.json({ error: 'No Instagram token' }, { status: 503 })

  try {
    const res = await fetch(
      `https://graph.facebook.com/${accountId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp&limit=12&access_token=${token}`,
      { cache: 'no-store' }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Instagram feed fetch failed:', err)

      // If token is dead, send an alert — rate-limited to once per 4 hours via settings table
      const isAuthError = err?.error?.code === 190 || err?.error?.type === 'OAuthException'
      if (isAuthError) {
        try {
          const supabase = createAdminClient()
          const { data: lastAlert } = await supabase.from('settings').select('value').eq('key', 'instagram_alert_sent_at').maybeSingle()
          const lastSent = lastAlert?.value ? new Date(lastAlert.value) : null
          const hoursSince = lastSent ? (Date.now() - lastSent.getTime()) / 3600000 : Infinity
          if (hoursSince >= 4) {
            await supabase.from('settings').upsert({ key: 'instagram_alert_sent_at', value: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'key' })
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'Canvas Routes <info@canvasroutes.com>',
                to: 'info@canvasroutes.com',
                subject: '🚨 Canvas Routes — Instagram gallery is broken',
                text: `The Instagram token is invalid and the gallery has disappeared.\n\nError: ${err?.error?.message || 'Unknown'}\n\nTo fix:\n1. Go to https://developers.facebook.com/tools/explorer/\n2. Select the Canvas Routes app → Generate Token\n3. Go to canvasroutes.com/admin → Tools → Instagram Token → paste and save.\n\nGallery reappears within a minute.`,
              }),
            }).catch(() => {})
          }
        } catch { /* non-fatal */ }
      }

      return Response.json({ posts: [] })
    }
    const data = await res.json()
    const posts = (data.data || []).map(p => ({
      id: p.id,
      type: p.media_type,
      image: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
      permalink: p.permalink,
      timestamp: p.timestamp,
    }))
    return Response.json({ posts })
  } catch (err) {
    console.error('Instagram feed error:', err)
    return Response.json({ error: 'Failed to fetch feed' }, { status: 502 })
  }
}
