-- Non-member photo shares (photo_share_people/folders) auto-expire and get
-- deleted by the photo-shares-cleanup cron after 30 days. To make sure that
-- person still has their photos if they ever become a member, every photo
-- uploaded to their share folder is now also mirrored into gallery_photos
-- (the permanent members-portal table) at upload time, tagged with
-- pending_email instead of member_id since they aren't a member yet. When
-- an admin later invites that same email as a member
-- (app/api/admin/members POST), these rows get claimed: member_id is set
-- and pending_email is cleared.
alter table public.gallery_photos add column if not exists pending_email text;
create index if not exists gallery_photos_pending_email_idx on public.gallery_photos (lower(pending_email)) where pending_email is not null;

alter table public.gallery_photos drop constraint if exists gallery_photos_category_shape_check;
alter table public.gallery_photos add constraint gallery_photos_category_shape_check check (
  (category = 'event'    and album is not null and member_id is null and pending_email is null) or
  (category = 'personal' and album is null and (
    (member_id is not null and pending_email is null) or
    (member_id is null and pending_email is not null)
  ))
);
