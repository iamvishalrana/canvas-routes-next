import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit.js'

export async function GET(request) {
  const ip = getClientIp(request)
  if (await checkRateLimit(ip)) return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return Response.json({ error: 'No code.' }, { status: 400 })

  // Direct REST call — omits code_verifier entirely (not empty string).
  // The SDK sends code_verifier:"" which Supabase rejects. Admin-initiated
  // invite/reset codes have no stored challenge so Supabase accepts them
  // without a verifier when the field is absent.
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ auth_code: code }),
    }
  )

  const data = await res.json()
  if (!res.ok || !data.access_token) {
    return Response.json(
      { error: data.error_description || data.error || 'Exchange failed.' },
      { status: 400 }
    )
  }

  return Response.json({ token: data.access_token })
}
