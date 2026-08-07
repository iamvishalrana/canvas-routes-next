import { buildPlainEmailShell } from './emailSignature.js'
import { emailShell, p, button, infoCard, accentCard, FONT, COLOR, EMAIL_SITE as SITE, escapeEmail as esc } from './emailLayout.js'

// Route photos that exist in /public/routes-photos — keep in sync with
// ROUTE_PHOTOS in components/UpcomingRoadtrips.jsx. Unknown slugs get no banner.
const EMAIL_PHOTO_SLUGS = ['memoirs-to-charlevoix', 'the-gaspesie-odyssey', 'the-tobermory-story', 'the-calabogie-boogie', 'the-cabot-trail-grail']

// Sent to a visitor right after they express interest in a route.
export function buildRouteInterestHtml({ firstName, route, interestedCount, isMember = false }) {
  const routeName = route?.name || 'this route'
  const rows = [
    route?.destination && ['Destination', esc(route.destination)],
    route?.month_label && ['When', esc(route.month_label)],
    route?.duration_label && ['Duration', esc(route.duration_label)],
    route?.distance_label && ['Distance', esc(route.distance_label)],
    (interestedCount && route?.target_count) && ['Crew status', `${interestedCount} of ${route.target_count} drivers in`],
  ].filter(Boolean)

  const memberBlock = isMember
    ? accentCard(p(`<strong style="color:${COLOR.head};font-weight:600;">Your member priority is noted</strong> &mdash; when this route launches, you&rsquo;re at the front of the line.`, { tone: 'muted', mb: '0' }), { mb: '0' })
    : `${accentCard(`
        ${p(`One thing worth knowing while you wait: <strong style="color:${COLOR.head};font-weight:600;">Canvas Routes members are first in line</strong> when spots are confirmed, hear about every launch before anyone else, and get member pricing across the season.`, { tone: 'muted' })}
        ${p(`If the roads are calling you more than once this season, membership is the better way to ride.`, { tone: 'muted', mb: '0' })}`)}
      ${button(`${SITE}/membership`, 'Become a Member &rarr;', { variant: 'green', mb: '0' })}`

  const body = `
    ${p(`Your name is down for <strong style="color:${COLOR.head};font-weight:600;">${esc(routeName)}</strong>. No payment, no commitment &mdash; just a signal that you&rsquo;re in.`)}
    ${rows.length ? infoCard(rows) : ''}
    ${p(`The route launches once enough drivers are in. The moment we hit the crew we need, you&rsquo;ll get an email with the full details &mdash; meeting point, the route, convoy rules, and how to confirm your spot.`)}
    ${memberBlock}
  `

  return emailShell({
    title: 'You’re on the list — Canvas Routes',
    preheader: `Your name is down for ${routeName}. We'll email you the moment it launches.`,
    eyebrow: 'Canvas Routes &middot; Upcoming Routes',
    heading: `You&rsquo;re on the list${firstName ? `, ${esc(firstName)}` : ''}.`,
    photoUrl: EMAIL_PHOTO_SLUGS.includes(route?.slug) ? `${SITE}/routes-photos/${route.slug}.jpg` : '',
    body,
  })
}

// Sent to every interested driver when an admin launches the route.
export function buildRouteLaunchHtml({ firstName, routeName, monthLabel, destination, message, pricePerCar, maxCars, itinerary }) {
  const note = (message || '').trim()
  const detailRows = [
    (pricePerCar != null && pricePerCar !== '') && ['Per-car fee', `$${Number(pricePerCar).toFixed(2)}`],
    maxCars && ['Cars', `${esc(maxCars)} max`],
  ].filter(Boolean)
  const itin = (itinerary || '').trim()

  const body = `
    ${p(`${firstName ? `${esc(firstName)}, we` : 'We'} hit the crew we needed &mdash; <strong style="color:${COLOR.head};font-weight:600;">${esc(routeName)}</strong>${destination ? ` to ${esc(destination)}` : ''}${monthLabel ? `, ${esc(monthLabel)},` : ''} is officially launching.`)}
    ${note ? accentCard(`<div style="font-family:${FONT};font-size:15px;line-height:1.75;color:${COLOR.body};white-space:pre-wrap;">${esc(note)}</div>`) : ''}
    ${detailRows.length ? infoCard(detailRows) : ''}
    ${itin ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};">Itinerary</p>
      <div style="font-family:${FONT};font-size:14px;line-height:1.8;color:${COLOR.body};white-space:pre-wrap;margin:0 0 26px;">${esc(itin)}</div>` : ''}
    ${p(`We&rsquo;ll follow up with the meeting point and convoy rules. Questions? Just reply to this email.`, { mb: '0' })}
  `

  return emailShell({
    title: `${routeName} is a go — Canvas Routes`,
    preheader: `${routeName} hit the crew it needed and is officially launching.`,
    eyebrow: 'Canvas Routes &middot; Route Launched',
    heading: `${esc(routeName)} is a go.`,
    body,
  })
}

// Sent when an admin broadcasts an update to everyone interested in a route.
// Plain, personal-looking shell (matching the main Broadcasts tool) — not the
// branded shell above. A free-text update from Jerry should read like an email
// he typed, not an official launch announcement.
export function buildRouteBroadcastHtml({ firstName, routeName, message }) {
  return buildPlainEmailShell(`
        ${firstName ? `<p style="margin:0 0 0.75em;font-family:inherit;font-size:15px;line-height:1.7;color:#333;">Hi ${esc(firstName)},</p>` : ''}
        <p style="margin:0 0 0.75em;font-family:inherit;font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap;">${esc((message || '').trim())}</p>
        <p style="margin:0.75em 0 0;font-family:inherit;font-size:12px;line-height:1.6;color:#999;">You're receiving this because you registered interest in ${esc(routeName)}.</p>`)
}
