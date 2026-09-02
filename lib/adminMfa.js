// Shared constants for the admin email-code second factor (self-serve,
// opt-in via app/admin/settings). Centralized here so middleware.js and the
// two API routes that set/clear the cookie can never drift on name or TTL.
export const ADMIN_MFA_COOKIE_NAME = 'admin_mfa_session'
// Deliberately shorter than the 30-day gallery session default in
// lib/otp.js — this cookie guards the admin panel, not a photo share link.
export const ADMIN_MFA_SESSION_TTL_SEC = 24 * 60 * 60
