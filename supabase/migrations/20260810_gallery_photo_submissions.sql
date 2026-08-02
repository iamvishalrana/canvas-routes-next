-- Staging table for member/non-member self-uploaded event photos. Nothing
-- a member or non-member uploads becomes visible anywhere (including back to
-- themselves) until an admin publishes it from /admin/photos/submissions —
-- publishing copies the row into gallery_photos (member source) or
-- photo_share_items (non-member source) and deletes this row; rejecting
-- deletes the storage files and this row. Never both places at once.
create table if not exists public.gallery_photo_submissions (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('member', 'non_member')),
  member_id uuid references auth.users(id) on delete cascade,
  photo_share_folder_id uuid references public.photo_share_folders(id) on delete cascade,
  contributor_name text not null,
  album text,
  album_date date,
  photo_url text not null,
  storage_path text not null,
  original_path text,
  original_url text,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.gallery_photo_submissions
  add constraint gallery_photo_submissions_shape_check check (
    (source = 'member'     and member_id is not null and photo_share_folder_id is null and album is not null) or
    (source = 'non_member' and photo_share_folder_id is not null and member_id is null)
  );

create index if not exists gallery_photo_submissions_status_idx on public.gallery_photo_submissions (status);
create index if not exists gallery_photo_submissions_member_idx on public.gallery_photo_submissions (member_id) where source = 'member';
create index if not exists gallery_photo_submissions_folder_idx on public.gallery_photo_submissions (photo_share_folder_id) where source = 'non_member';

-- RLS enabled with NO policies — service role only, same convention as
-- gallery_photos / photo_share_items.
alter table public.gallery_photo_submissions enable row level security;
