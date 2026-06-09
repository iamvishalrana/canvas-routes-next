export const revalidate = 3600 // cache 1 hour on Vercel edge

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID

  if (!token || !accountId) {
    return Response.json({ error: 'Instagram not configured' }, { status: 503 })
  }

  const url = `https://graph.facebook.com/${accountId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp&limit=9&access_token=${token}`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
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
