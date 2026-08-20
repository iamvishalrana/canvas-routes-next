-- Admin-only visibility into when a non-member last actually opened their
-- photo-share link (as opposed to just having one, or having had a code
-- emailed to them). Set every time loadPersonFolders() runs — both a fresh
-- email+code verification and the silent same-device session re-entry mean
-- they're looking at their folders right now. Null = never opened.
alter table public.photo_share_people
  add column if not exists last_viewed_at timestamptz;
