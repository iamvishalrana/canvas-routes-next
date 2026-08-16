-- Automatic "your photos are removed soon" reminder for non-member photo
-- shares. A folder's photos are deleted 30 days after they're added (see the
-- photo-shares-cleanup cron); previously nothing warned the recipient before
-- that happened. The photo-shares-expiry-reminder cron now emails them ~3 days
-- before a folder expires.
--
-- reminder_sent_at is the once-only guard: null = not yet reminded. It's set
-- when the reminder email sends, and reset back to null whenever a folder's
-- expiry is extended/changed (see the folder PATCH route) so a renewed folder
-- gets a fresh reminder before its new expiry.
alter table public.photo_share_folders
  add column if not exists reminder_sent_at timestamptz;
