-- Tracks whether a pending submission has already been included in an admin
-- notification email. Lets the batched "finish" endpoints derive the real
-- count from the DB (closing a client-spoofing gap) and lets the digest cron
-- safety-net pick up anything a finish call never fired for (tab closed
-- mid-batch) without double-notifying rows a finish call already covered.
alter table public.gallery_photo_submissions
  add column if not exists notified_at timestamptz;

create index if not exists gallery_photo_submissions_notify_idx
  on public.gallery_photo_submissions (status, notified_at)
  where status = 'pending';
