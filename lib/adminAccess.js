// Single source of truth for "is this user THE admin?" — used by both the
// middleware gate (middleware.js) and every admin API route via requireAdmin()
// (lib/supabase/authCheck.js). Kept as one pure function so the copies of this
// logic that used to live in three places can never drift out of sync.
//
// Admin identity is the set of addresses in the ADMIN_EMAILS env var
// (comma-separated). To restrict the admin panel to a single person, set
// ADMIN_EMAILS to exactly that one address on Vercel.
export function isAdminUser(user) {
  if (!user?.email) return false
  // Defense in depth: an admin must have a CONFIRMED email. Combined with the
  // fact that the app creates accounts only via admin-issued invite links (no
  // public sign-up), this means an account can never reach admin for an admin
  // address unless the real owner of that inbox confirmed it — even if
  // Supabase's own email-confirmation setting were ever misconfigured.
  if (!user.email_confirmed_at && !user.confirmed_at) return false
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(user.email.trim().toLowerCase())
}
