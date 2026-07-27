-- Non-member photo shares: admin uploads a batch of photos (for one specific
-- non-member, or a whole event's worth to hand out broadly) and gets back a
-- public, token-gated link. No login required — the unguessable token in the
-- URL is the access control, same pattern as rsvp_tokens. Auto-expires 30
-- days after creation; a daily cron (see app/api/cron/photo-shares-cleanup)
-- deletes both the DB rows and the storage files once expires_at passes.
create table if not exists public.photo_shares (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  recipient_name  text,
  recipient_email text,
  token           uuid unique not null default gen_random_uuid(),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);
create index if not exists photo_shares_token_idx on public.photo_shares (token);
create index if not exists photo_shares_expires_idx on public.photo_shares (expires_at);

create table if not exists public.photo_share_items (
  id           uuid primary key default gen_random_uuid(),
  share_id     uuid not null references public.photo_shares(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);
create index if not exists photo_share_items_share_idx on public.photo_share_items (share_id);

-- RLS enabled with NO policies — all access goes through the service role
-- (admin API routes, plus the public /gallery/[token] page which looks the
-- row up by the unguessable token, not via RLS).
alter table public.photo_shares enable row level security;
alter table public.photo_share_items enable row level security;
