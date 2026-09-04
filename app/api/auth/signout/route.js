import { createClient } from '../../../../lib/supabase/server'
import { NextResponse } from 'next/server'
import { ADMIN_MFA_COOKIE_NAME } from '../../../../lib/adminMfa'

export async function POST(request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const origin = new URL(request.url).origin
  const res = NextResponse.redirect(new URL('/members/login', origin), { status: 302 })
  // Tear down the admin two-factor session alongside the Supabase session —
  // otherwise the second-factor proof (a separate httpOnly cookie, 24h TTL)
  // outlives logout, so anyone re-authenticating in the same browser within
  // that window skips the MFA challenge. Defeats the point of the factor on a
  // shared machine. Harmless for non-admins who never had the cookie.
  res.cookies.set(ADMIN_MFA_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return res
}
