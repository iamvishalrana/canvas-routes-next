-- MembersClient.jsx computed event_attendance keys from the raw events.name
-- string ("Into The Laurentians", "Cars, Coffee & Dad Jokes") instead of
-- aliasing through EVENT_NAME_ALIASES/EVENT_ATTENDANCE_KEYS first (see
-- lib/eventMeta.js). Any attendance mark saved while that bug was live is
-- sitting under the wrong key and would go invisible now that the display
-- logic always resolves to the canonical short key. Merge them, preferring
-- whatever's already under the canonical key if both happen to be set.

UPDATE public.members
SET event_attendance = (
  (event_attendance - 'Into The Laurentians')
  || jsonb_build_object('laurentians_jun7', COALESCE(event_attendance->'laurentians_jun7', event_attendance->'Into The Laurentians'))
)
WHERE event_attendance ? 'Into The Laurentians';

UPDATE public.members
SET event_attendance = (
  (event_attendance - 'Cars, Coffee & Dad Jokes')
  || jsonb_build_object('ccd_jun20', COALESCE(event_attendance->'ccd_jun20', event_attendance->'Cars, Coffee & Dad Jokes'))
)
WHERE event_attendance ? 'Cars, Coffee & Dad Jokes';

-- Verify: should return zero rows after running.
-- SELECT id, event_attendance FROM public.members
-- WHERE event_attendance ? 'Into The Laurentians' OR event_attendance ? 'Cars, Coffee & Dad Jokes';
