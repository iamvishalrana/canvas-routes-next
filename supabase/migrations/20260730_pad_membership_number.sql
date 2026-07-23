-- membership_number is free-text and was stored unpadded (e.g. "1", "42"),
-- so a plain column sort put "10" before "9". Zero-pad to 6 digits so the
-- Members admin page's default "lowest number first" sort is a correct
-- global DB-level order via a plain .order('membership_number'), not a
-- page-local re-sort. Display everywhere still shows the clean "#001"-style
-- number — see lib/memberNumber.js's formatForDisplay(), which parses back
-- to an integer before re-padding to 3 digits for the badge.
UPDATE public.members
SET membership_number = LPAD(membership_number, 6, '0')
WHERE membership_number IS NOT NULL
  AND membership_number ~ '^[0-9]+$'
  AND length(membership_number) < 6;
