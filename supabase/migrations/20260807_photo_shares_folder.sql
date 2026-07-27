-- Groups shares into folders in the admin list (e.g. by event) — the list
-- was a single flat list with no organization as it grows. Null/blank
-- folder displays as "General", same convention as gallery_photos albums.
alter table public.photo_shares
  add column if not exists folder text;
