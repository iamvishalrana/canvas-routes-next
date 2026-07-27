-- photo_share_items.storage_path now holds a client-compressed display copy
-- (see lib/compressImageClient.js) rather than the raw original — Supabase's
-- on-the-fly image transform endpoint proved unreliable for large camera
-- originals. original_path holds the untouched original for full-quality
-- download, mirroring gallery_photos' storage_path/original_path split.
alter table public.photo_share_items
  add column if not exists original_path text;
