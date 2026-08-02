-- "Seen"/"unseen" tracking for admin Applications used to live in
-- localStorage — per-browser, not shared across devices, and every
-- first-ever load on a new browser silently marked ALL existing
-- applications as seen. Moving it server-side so it's the same for every
-- admin session regardless of device.
alter table public.applications add column if not exists seen_at timestamptz;

-- Backfill: treat every application that existed before this migration as
-- already seen (mirrors the old localStorage first-load seeding behavior)
-- so this doesn't suddenly flag a backlog of old applications as "new".
-- Anything inserted after this runs starts with seen_at = null (unseen),
-- same as before.
update public.applications set seen_at = created_at where seen_at is null;
