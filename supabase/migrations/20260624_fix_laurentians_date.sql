-- Fix Into the Laurentians date: event moved from May 31 to June 7
UPDATE events
SET
  date         = '2026-06-07',
  date_display = 'June 7, 2026'
WHERE
  LOWER(name) LIKE '%into the laurentians%'
  AND (date = '2026-05-31' OR date_display ILIKE '%may 31%');
