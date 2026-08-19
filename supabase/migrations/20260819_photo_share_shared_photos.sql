-- Lets the same physical photo (e.g. a group shot admin uploads once but
-- that belongs to several attendees) be linked into multiple people's
-- folders instead of stored as a separate copy per person. Restructures the
-- previous strict 1:1 "photo belongs to exactly one folder" shape
-- (photo_share_items) into a canonical-photo table plus a per-folder link
-- table, so one photo can have many folder links, each with its own
-- independent expiry (via the folder it's linked from) and its own caption.
--
-- Matching for "is this the same photo already uploaded elsewhere" is done
-- client-side via a SHA-256 hash of the file's actual bytes (never by
-- filename — camera-default names like IMG_1234.jpg collide constantly
-- across different people's completely different photos), scoped to folders
-- that share the exact same title (the admin's event-name grouping).
--
-- Existing photo_share_items rows are migrated in with content_hash left
-- NULL (a NULL never matches anything, by design — see the unique index
-- below) since retroactively hashing already-uploaded files isn't something
-- a SQL migration can do. Dedup only applies to uploads from this point on;
-- nothing already stored gets merged. The old table is renamed rather than
-- dropped, as a rollback safety net — drop it later once the new tables are
-- confirmed working in production.

create table public.photo_share_photos (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null,   -- compressed display copy
  original_path text,            -- full-resolution original
  content_hash  text,            -- sha256 hex of the original file's bytes, client-computed; NULL for pre-migration rows
  folder_title  text not null,   -- the folder title this photo was first uploaded under — dedup is scoped to matching titles only
  created_at    timestamptz not null default now()
);
-- NULLs are never considered equal by a unique index in Postgres, so this
-- only actually constrains rows that DO have a hash (new uploads) — exactly
-- the "NULL never matches" behavior described above, enforced at the DB
-- level rather than just in application code.
create unique index photo_share_photos_hash_title_idx on public.photo_share_photos (content_hash, folder_title);

create table public.photo_share_folder_items (
  id         uuid primary key default gen_random_uuid(),
  folder_id  uuid not null references public.photo_share_folders(id) on delete cascade,
  photo_id   uuid not null references public.photo_share_photos(id) on delete cascade,
  caption    text,
  created_at timestamptz not null default now(),
  unique (folder_id, photo_id) -- the same photo can't be linked twice into one folder
);
create index photo_share_folder_items_folder_idx on public.photo_share_folder_items (folder_id);
create index photo_share_folder_items_photo_idx on public.photo_share_folder_items (photo_id);

-- Migrate existing data: one photo_share_photos row + one link row per
-- existing photo_share_items row, preserving folder_id, paths, caption, and
-- created_at exactly. Joined back on storage_path alone — every upload path
-- embeds a timestamp + random suffix (see the upload-url routes), so it's
-- already guaranteed unique per row without needing a compound key.
with migrated_photos as (
  insert into public.photo_share_photos (storage_path, original_path, folder_title, created_at)
  select i.storage_path, i.original_path, f.title, i.created_at
  from public.photo_share_items i
  join public.photo_share_folders f on f.id = i.folder_id
  returning id, storage_path
)
insert into public.photo_share_folder_items (folder_id, photo_id, caption, created_at)
select i.folder_id, mp.id, i.caption, i.created_at
from public.photo_share_items i
join migrated_photos mp on mp.storage_path = i.storage_path;

alter table public.photo_share_items rename to photo_share_items_old_backup;

alter table public.photo_share_photos enable row level security;
alter table public.photo_share_folder_items enable row level security;
-- RLS enabled with NO policies, matching every other table in this feature
-- (photo_share_people/folders/items) — all access goes through the service
-- role (admin API routes) or the public /gallery/[token] page, which looks
-- rows up by the unguessable per-person token, not via RLS.
