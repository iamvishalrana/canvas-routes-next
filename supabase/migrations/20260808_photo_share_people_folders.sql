-- Restructures non-member photo sharing from one flat "share" per link into
-- a real hierarchy: a Person (name + email, the email doubles as their one
-- password for one link that covers everything) can have multiple Folders
-- underneath them — one per event they attended — each with its own 30-day
-- expiry. Previously every event required a brand new link+password for the
-- same person; now the admin adds a folder under the person they already
-- have on file.
--
-- This is a clean cut, not a compatible migration — the whole point of the
-- change is the new shape. Any shares created under the old flat
-- photo_shares table (this feature only shipped earlier this same week) are
-- dropped along with their storage files.
create table if not exists public.photo_share_people (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text not null,
  token      uuid unique not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create unique index if not exists photo_share_people_email_idx on public.photo_share_people (lower(email));
create index if not exists photo_share_people_token_idx on public.photo_share_people (token);

create table if not exists public.photo_share_folders (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.photo_share_people(id) on delete cascade,
  title      text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists photo_share_folders_person_idx on public.photo_share_folders (person_id);
create index if not exists photo_share_folders_expires_idx on public.photo_share_folders (expires_at);

-- photo_share_items now hangs off a folder instead of the old flat share.
drop table if exists public.photo_share_items cascade;
create table public.photo_share_items (
  id           uuid primary key default gen_random_uuid(),
  folder_id    uuid not null references public.photo_share_folders(id) on delete cascade,
  storage_path text not null,
  original_path text,
  created_at   timestamptz not null default now()
);
create index if not exists photo_share_items_folder_idx on public.photo_share_items (folder_id);

drop table if exists public.photo_shares cascade;

alter table public.photo_share_people enable row level security;
alter table public.photo_share_folders enable row level security;
alter table public.photo_share_items enable row level security;
-- RLS enabled with NO policies — all access goes through the service role
-- (admin API routes, plus the public /gallery/[token] page which looks the
-- row up by the unguessable per-person token, not via RLS).
