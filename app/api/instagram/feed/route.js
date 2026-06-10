import { createAdminClient } from '../../../../lib/supabase/admin'

export const revalidate = 3600

export async function GET() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  if (!accountId) return Response.json({ error: 'Instagram not configured' }, { status: 503 })

  // Read token from Supabase first, fall back to env var
  const supabase = createAdminClient()
  const { data: row } = await supabase.from('settings').select('value').eq('key', 'instagram_access_token').maybeSingle()
  const token = row?.value || process.env.INSTAGRAM_ACCESS_TOKEN

  if (!token) return Response.json({ error: 'No Instagram token' }, { status: 503 })

  try {
    const res = await fetch(
      `https://graph.facebook.com/${accountId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp&limit=12&access_token=${token}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Instagram feed fetch failed:', err)
      return Response.json({ error: 'Failed to fetch feed' }, { status: 502 })
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
