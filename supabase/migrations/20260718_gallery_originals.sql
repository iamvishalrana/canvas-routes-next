-- Gallery photos now store two files per photo: a compressed display version
-- (photo_url / storage_path — used in grids and the lightbox) and the untouched
-- full-resolution original (original_url / original_path — offered to members
-- as a download). Originals are uploaded browser → Supabase Storage directly
-- via signed upload URLs, bypassing the serverless request-body limit.

alter table public.gallery_photos
  add column if not exists original_path text,
  add column if not exists original_url text;
