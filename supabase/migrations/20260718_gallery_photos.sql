-- Members photo gallery: admin-uploaded photos of members and their cars,
-- grouped into albums, viewable by members in the portal at /members/photos.
-- Files live in the public `gallery-photos` storage bucket (created lazily by
-- the upload API route, same pattern as member-photos / event-photos).

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  album text not null,
  album_date date,
  caption text,
  photo_url text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists gallery_photos_album_idx on public.gallery_photos (album);

-- RLS enabled with NO policies: anon/authenticated PostgREST access is denied.
-- All reads go through the service role (portal server components render for
-- authenticated members only; admin API routes use requireAdmin()).
alter table public.gallery_photos enable row level security;
