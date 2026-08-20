import { nowInMontreal } from './mtlTime'

// Which of three states a road-trip registration page should show. See
// lib/i18n/routeEventShared.js for the EN/FR copy for each.
//
// - 'open': registration is actually open right now — normal form flow.
// - 'not_yet_open': the event is still in the future and this route has
//   never been launched (upcoming_routes.launched) — nothing has gone
//   wrong, the page just isn't live yet. An encouraging "check back" message,
//   not an alarming "closed" one.
// - 'closed': the event is happening today or has already happened, OR the
//   route WAS launched and registration has since been manually turned off.
//
// Distinguishing "never opened" from "manually turned off" needs no new DB
// state — `launched` already means "this route's page has gone public"
// (set once, by the admin Launch action), so registration_open:false while
// launched:false can only be the pre-launch case, and registration_open:false
// while launched:true can only be a deliberate after-the-fact close.
export function getRegistrationStatus({ registrationOpen, launched, eventDate }) {
  if (registrationOpen) return 'open'

  const today = nowInMontreal()
  const event = nowInMontreal(eventDate)
  const todayNum = today.year * 10000 + today.month * 100 + today.day
  const eventNum = event.year * 10000 + event.month * 100 + event.day
  if (todayNum >= eventNum) return 'closed'

  return launched ? 'closed' : 'not_yet_open'
}
