import { cookies } from 'next/headers'
import { createSession } from './otp'
import { ADMIN_MFA_COOKIE_NAME, ADMIN_MFA_SESSION_TTL_SEC } from './adminMfa'

// Single source of truth for minting the admin two-factor session cookie —
// shared by every route that completes a challenge (email code, recovery
// email, recovery code, security questions) so the cookie flags and TTL can't
// drift between them. The session is bound to (userId, email) in Redis; the
// middleware gate re-validates it against the same pair on each request.
export async function mintAdminMfaSession(userId, email) {
  const sessionId = await createSession(userId, email, ADMIN_MFA_SESSION_TTL_SEC)
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_MFA_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_MFA_SESSION_TTL_SEC,
  })
}
