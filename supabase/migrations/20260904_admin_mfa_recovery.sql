-- Admin MFA recovery methods (2026-09-04): recovery codes + security questions,
-- alongside the existing email-OTP + recovery-email factors. Secrets live here,
-- NOT in auth.users.app_metadata, because app_metadata is embedded in the JWT
-- the browser can decode — recovery-code and security-answer hashes must never
-- be client-readable.
--
-- All values are scrypt-hashed with a per-item salt in application code
-- (lib/adminMfaRecovery.js). This table only ever holds hashes, never plaintext.
create table if not exists public.admin_mfa_recovery (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  -- [{ h: "salt:hash", u: null | "<iso used-at>" }] — one-time recovery codes
  recovery_code_hashes jsonb not null default '[]'::jsonb,
  -- [{ q: "question text", h: "salt:hash of the answer" }]
  security_questions   jsonb not null default '[]'::jsonb,
  sq_failed_attempts   int   not null default 0,
  sq_locked_until      timestamptz,
  updated_at           timestamptz not null default now()
);

-- Service-role-only: RLS on, no policies → deny-all to anon/authenticated,
-- same pattern as every other admin table. All access is via createAdminClient().
alter table public.admin_mfa_recovery enable row level security;
