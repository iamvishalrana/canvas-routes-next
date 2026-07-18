-- Members photo gallery v2: split into two per-member "folders":
--   'event'    — shared photos from a specific event (group/car shots), visible
--                to any member whose members.event_attendance confirms they
--                attended that event. Optionally tagged with which members
--                appear in each photo (gallery_photo_tags), used to filter
--                "photos of X" within an event album — the tag does NOT gate
--                visibility, attendance does.
--   'personal' — a single member's own car/personal photos, private: visible
--                only to that member (and admins).

-- album was NOT NULL from the original migration — personal photos have no
-- album, so relax it and enforce the real invariant with a CHECK instead.
alter table public.gallery_photos alter column album drop not null;

alter table public.gallery_photos
  add column if not exists category text not null default 'event',
  add column if not exists member_id uuid references auth.users(id) on delete cascade;

alter table public.gallery_photos
  drop constraint if exists gallery_photos_category_check;
alter table public.gallery_photos
  add constraint gallery_photos_category_check check (category in ('event', 'personal'));

alter table public.gallery_photos
  drop constraint if exists gallery_photos_category_shape_check;
alter table public.gallery_photos
  add constraint gallery_photos_category_shape_check check (
    (category = 'event'    and album is not null and member_id is null) or
    (category = 'personal' and member_id is not null and album is null)
  );

create index if not exists gallery_photos_member_idx on public.gallery_photos (member_id) where category = 'personal';
create index if not exists gallery_photos_category_idx on public.gallery_photos (category);

create table if not exists public.gallery_photo_tags (
  photo_id  uuid not null references public.gallery_photos(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  primary key (photo_id, member_id)
);
create index if not exists gallery_photo_tags_member_idx on public.gallery_photo_tags (member_id);

-- RLS enabled with NO policies, same as gallery_photos — all reads go through
-- the service role (admin API + members portal server components).
alter table public.gallery_photo_tags enable row level security;
