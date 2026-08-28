import { emailShell, p, button, infoCard, instagram, COLOR, EMAIL_SITE as SITE } from './emailLayout.js'
import { calendarButtonsHtml } from './eventCalendarLinks.js'
import { getEventTimes } from './eventMeta.js'

export function buildEventConfirmHtml({ firstName, eventName, dateDisplay, location, isFree, amountPaid, eventId, date, isMember = false, profileUrl = null }) {
  const dateLabel = dateDisplay || null
  const timeDisplay = eventId ? getEventTimes(eventId)?.display || null : null
  const amountStr = isFree ? 'Free' : amountPaid > 0 ? `$${(amountPaid / 100).toFixed(2)} CAD` : null

  // Shared with the public Cars & Coffee confirmation — timed & timezone-correct
  // when the event has a start/end in EVENT_TIMES, a clean all-day entry otherwise.
  const calendarButtons = calendarButtonsHtml({ eventId, eventName, date, location })

  const body = `
    ${p(`Your spot at <strong style="color:${COLOR.head};font-weight:600;">${eventName}</strong> is confirmed. We&rsquo;ll be in touch with any details as the date gets closer.`)}
    ${infoCard([
      ['Event', eventName],
      dateLabel && ['Date', dateLabel],
      timeDisplay && ['Time', timeDisplay],
      location && ['Location', location],
      amountStr && ['Payment', amountStr],
    ])}
    ${profileUrl ? button(profileUrl, 'Your Event Profile &rarr;', { variant: 'green', mb: isMember ? '12px' : '28px' }) : ''}
    ${isMember ? button(`${SITE}/members/events`, 'View My Events &rarr;', { variant: 'solid', mb: '28px' }) : ''}
    ${calendarButtons}
    ${p(`Questions? Reply directly to this email &mdash; it comes straight to me.`, { mb: '6px' })}
    ${p(`&mdash; Jerry`, { tone: 'muted', mb: '26px' })}
    ${instagram()}
  `

  return emailShell({
    title: 'You’re in — Canvas Routes',
    preheader: `Your spot at ${eventName} is confirmed.`,
    eyebrow: 'Canvas Routes &middot; Event Registration &middot; Confirmed',
    heading: `You&rsquo;re in, ${firstName}.`,
    body,
  })
}
