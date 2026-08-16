-- Folders for a member's personal photos. Personal photos previously had to
-- have album = null (they were one flat "My Car & Personal" set); non-member
-- shares already organised into folders. This relaxes the shape check so a
-- personal photo may carry an album (the folder name) — null still means
-- ungrouped ("General"), matching the non-member "General" convention.
alter table public.gallery_photos
  drop constraint if exists gallery_photos_category_shape_check;
alter table public.gallery_photos
  add constraint gallery_photos_category_shape_check check (
    (category = 'event'    and album is not null and member_id is null) or
    (category = 'personal' and member_id is not null)
  );
