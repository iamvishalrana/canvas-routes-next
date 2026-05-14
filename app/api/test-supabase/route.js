export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let pingResult = 'not tested'
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    })
    pingResult = `status ${res.status}`
  } catch (e) {
    pingResult = `fetch error: ${e.message}`
  }

  return Response.json({
    url: url || 'MISSING',
    keyPrefix: key ? key.substring(0, 20) + '...' : 'MISSING',
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ping: pingResult,
  })
}
