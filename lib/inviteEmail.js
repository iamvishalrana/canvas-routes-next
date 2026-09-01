import { MONTREAL_TZ } from './mtlTime'
import { emailShell, p, button, infoCard, instagram, COLOR } from './emailLayout.js'

export function buildInviteHtml(firstName, eventName, eventDate, eventLocation, rsvpUrl, expiresAt, isRoadTrip, isResend = false) {
  const expiry = new Date(expiresAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
  // eventDate is a date-only "YYYY-MM-DD" (ev.date) — parsing it directly
  // gives UTC midnight, and formatting that without a timeZone on a non-UTC
  // runtime would roll the displayed day (and weekday name!) back by one.
  // Anchor to noon UTC instead, same trick used everywhere else in the
  // codebase for date-only values, so it renders the same regardless of
  // where this actually runs.
  const dateLabel = eventDate
    ? new Date(`${eventDate}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : eventDate

  const label = isRoadTrip ? 'Canvas Routes &middot; Route &middot; You&rsquo;re Confirmed'
                            : 'Canvas Routes &middot; Car Meet &middot; You&rsquo;re Confirmed'

  const headline = isResend
    ? (isRoadTrip ? `Still here for you, ${firstName}.` : `Your spot&rsquo;s still open, ${firstName}.`)
    : (isRoadTrip ? `The road is calling, ${firstName}.` : `Your spot&rsquo;s ready, ${firstName}.`)

  const bodyCopy = isResend
    ? (isRoadTrip
        ? `Just a quick reminder &mdash; your invitation to join us for <strong style="color:${COLOR.head};font-weight:600;">${eventName}</strong> is still open. Check in below before the link expires.`
        : `Just a quick reminder &mdash; your spot at <strong style="color:${COLOR.head};font-weight:600;">${eventName}</strong> is still available. One click and you&rsquo;re confirmed.`)
    : (isRoadTrip
        ? `We&rsquo;ve reviewed your application and we&rsquo;d love to have you on the road with us for <strong style="color:${COLOR.head};font-weight:600;">${eventName}</strong>. Check in below &mdash; it takes 30 seconds and helps us plan the day around everyone coming.`
        : `We&rsquo;ve reviewed your application and we&rsquo;d love to see you at <strong style="color:${COLOR.head};font-weight:600;">${eventName}</strong>. One click to confirm and you&rsquo;re in.`)

  const signoff = isRoadTrip
    ? `Questions about the route? Reply directly to this email &mdash; it comes straight to me.`
    : `Questions? Reply directly to this email &mdash; it comes straight to me.`

  const body = `
    ${p(bodyCopy)}
    ${infoCard([
      [isRoadTrip ? 'Route' : 'Event', eventName],
      dateLabel && ['Date', dateLabel],
      eventLocation && [isRoadTrip ? 'Departure Point' : 'Location', eventLocation],
    ])}
    ${button(rsvpUrl, 'Check In &rarr;', { variant: 'solid', mb: '24px' })}
    ${p(`This link expires on <strong style="color:${COLOR.body};font-weight:600;">${expiry}</strong>. If it expires before you can confirm, reply to this email and we&rsquo;ll sort it out.`, { tone: 'fine' })}
    ${p(signoff, { mb: '6px' })}
    ${p(`&mdash; Jerry`, { tone: 'muted', mb: '26px' })}
    ${instagram()}
  `

  return emailShell({
    title: 'You’re confirmed — Canvas Routes',
    preheader: isResend ? `A quick reminder — your spot for ${eventName} is still open.` : `We'd love to have you at ${eventName}. Check in — it takes 30 seconds.`,
    eyebrow: label,
    heading: headline,
    body,
  })
}
