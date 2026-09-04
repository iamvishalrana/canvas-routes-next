import { cookies } from 'next/headers'
import { mintToken } from './adminMfaToken'
import { ADMIN_MFA_COOKIE_NAME, ADMIN_MFA_SESSION_TTL_SEC } from './adminMfa'

// Single source of truth for minting the admin two-factor session cookie —
// shared by every route that completes a challenge (email code, recovery
// email, recovery code, security questions) so the cookie flags and TTL can't
// drift between them. The cookie value is a self-contained HMAC token
// (lib/adminMfaToken.js), so the middleware gate validates it with no Redis
// lookup — the MFA session survives a Redis outage. Bound to the account's
// current session epoch so a future "log out everywhere" invalidates it.
export async function mintAdminMfaSession(user) {
  const token = mintToken({
    uid: user.id,
    email: user.email,
    epoch: user.app_metadata?.mfa_session_epoch || 0,
  })
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_MFA_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_MFA_SESSION_TTL_SEC,
  })
}
