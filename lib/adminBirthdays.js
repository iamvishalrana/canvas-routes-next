// Single source of truth for "who has a birthday and when" — used by the
// admin sidebar's BirthdaysWidget, the /admin/calendar month view, and the
// personal .ics feed. Previously this logic lived only inline in
// app/api/admin/birthdays/route.js; pulled out so the calendar feed can't
// drift from what the widget already shows.

export function isLeapYear(y) { return new Date(y, 1, 29).getMonth() === 1 }
export function isLeapDayBirthday(b) { return b.month === 2 && b.day === 29 }

// Where a Feb 29 birthday's marker/reminder should land within a specific
// calendar year. Every other date exists in every year and needs no
// remapping. Observed on Feb 28 in a non-leap year — the common real-world
// convention — rather than the alternative of just not showing up that
// year, which is what a literal day-29 lookup does by default (there's no
// 29th cell in February to place it in).
export function observedBirthdayDay(b, year) {
  return (isLeapDayBirthday(b) && !isLeapYear(year)) ? 28 : b.day
}

export async function getBirthdays(supabase) {
  const [{ data: members }, { data: applications }] = await Promise.all([
    supabase.from('members').select('name, email, dob_month, dob_day').not('dob_month', 'is', null).not('dob_day', 'is', null).not('email', 'is', null),
    supabase.from('applications').select('name, email, dob_month, dob_day').not('dob_month', 'is', null).not('dob_day', 'is', null).not('email', 'is', null),
  ])

  // Deduplicate by email — member record wins
  const seen = new Set()
  const all = []
  for (const m of (members || [])) { seen.add(m.email?.toLowerCase()); all.push({ ...m, type: 'member' }) }
  for (const a of (applications || [])) { if (!seen.has(a.email?.toLowerCase())) all.push({ ...a, type: 'application' }) }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const birthdays = []

  for (const m of all) {
    if (!m.dob_month || !m.dob_day || m.dob_day < 1 || m.dob_day > 31 || m.dob_month < 1 || m.dob_month > 12) continue
    // The range check above allows impossible combos (day 31 in April, day
    // 30 in February — no day-count-per-month validation happens where DOB
    // is originally captured). A bad stored value would otherwise roll
    // forward silently below (JS Date normalizes rather than rejecting an
    // invalid day) and quietly show the wrong person on the wrong day
    // everywhere this data flows (widget, calendar grid, .ics feed) — catch
    // it once here for all three instead of downstream in each.
    const roundTrip = new Date(2020, m.dob_month - 1, m.dob_day) // 2020: a leap year, so a real Feb 29 still passes
    if (roundTrip.getMonth() + 1 !== m.dob_month || roundTrip.getDate() !== m.dob_day) continue

    // Resolve the NEXT occurrence using the observed day for whichever year
    // it lands in — a naive `new Date(year, 1, 29)` in a non-leap year rolls
    // forward to March 1 instead of landing on Feb 28, which used to throw
    // the countdown off by a day (and mislabel the date) for every Feb 29
    // birthday whenever "today" fell in a non-leap year.
    const thisYearDay = observedBirthdayDay(m, today.getFullYear())
    let bday = new Date(today.getFullYear(), m.dob_month - 1, thisYearDay)
    if (bday < today) {
      const nextYearDay = observedBirthdayDay(m, today.getFullYear() + 1)
      bday = new Date(today.getFullYear() + 1, m.dob_month - 1, nextYearDay)
    }
    const daysUntil = Math.round((bday - today) / (1000 * 60 * 60 * 24))
    birthdays.push({
      name: m.name || m.email,
      email: m.email,
      type: m.type,
      month: m.dob_month,
      day: m.dob_day,
      daysUntil,
    })
  }

  // Sort by month/day so any month view is already ordered
  birthdays.sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day)
  return birthdays
}
