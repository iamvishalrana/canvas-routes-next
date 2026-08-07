import { emailShell, p, button, infoCard, instagram, FONT, COLOR, EMAIL_SITE as SITE } from './emailLayout.js'

function googleCalUrl({ eventName, date, location }) {
  if (!date) return null
  // Supabase DATE columns return YYYY-MM-DD; strip any time component that may sneak in
  const isoDate = typeof date === 'string' ? date.slice(0, 10) : String(date).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null

  const d = isoDate.replace(/-/g, '')
  const dt = new Date(`${isoDate}T12:00:00Z`)
  if (isNaN(dt.getTime())) return null
  dt.setUTCDate(dt.getUTCDate() + 1)
  const nextDay = dt.toISOString().slice(0, 10).replace(/-/g, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventName,
    dates: `${d}/${nextDay}`,
    details: `Canvas Routes Event — ${SITE}/members/events`,
    ...(location ? { location } : {}),
    sf: 'true',
    output: 'xml',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildEventConfirmHtml({ firstName, eventName, dateDisplay, location, isFree, amountPaid, eventId, date, isMember = false, profileUrl = null }) {
  const dateLabel = dateDisplay || null
  const amountStr = isFree ? 'Free' : amountPaid > 0 ? `$${(amountPaid / 100).toFixed(2)} CAD` : null
  const icalUrl = eventId ? `${SITE}/api/events/${eventId}/ical` : null
  const gCalUrl = googleCalUrl({ eventName, date, location })

  const calLink = (href, label) => `<a href="${href}" style="display:inline-block;padding:11px 20px;font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:#555;text-decoration:none;border:1px solid rgba(0,0,0,0.18);border-radius:7px;">${label}</a>`

  const calendarButtons = (icalUrl || gCalUrl) ? `
    <p style="margin:0 0 10px;font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.muted};">Add to calendar</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr>
      ${icalUrl ? `<td style="padding-right:8px;">${calLink(icalUrl, 'Apple / Outlook')}</td>` : ''}
      ${gCalUrl ? `<td>${calLink(gCalUrl, 'Google Calendar')}</td>` : ''}
    </tr></table>` : ''

  const body = `
    ${p(`Your spot at <strong style="color:${COLOR.head};font-weight:600;">${eventName}</strong> is confirmed. We&rsquo;ll be in touch with any details as the date gets closer.`)}
    ${infoCard([
      ['Event', eventName],
      dateLabel && ['Date', dateLabel],
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
