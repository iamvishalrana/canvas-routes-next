-- Lets a member/non-member add an optional one-line caption when submitting
-- their own photos (app/api/member/gallery-submission, app/api/gallery/[token]/submit-photo).
-- photo_share_items never had a caption column at all (non-member folders'
-- lightbox always showed caption: null, hardcoded in lib/gallerySharePhotos.js) —
-- added here too so a caption survives publish for either source.
alter table public.gallery_photo_submissions add column if not exists caption text;
alter table public.photo_share_items add column if not exists caption text;
