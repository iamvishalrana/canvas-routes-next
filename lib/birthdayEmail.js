// Warm "Happy Birthday" email — sent automatically by
// app/api/cron/birthday-email/route.js. Built from the shared email design
// system (lib/emailLayout.js) like every other Canvas Routes email, but with
// its own hand-built unsubscribe button (the shared buildBulkEmail() footer
// is a plain text link; this one's explicitly a button per request).
//
// Two variants, chosen by isMember (getBirthdays()'s type === 'member'):
// members get a longer, warmer note that thanks them for being part of the
// club specifically; non-members (applicants who gave a DOB but never
// joined) get a shorter one with no membership language that wouldn't apply
// to them. Both are centered on the recipient and their own car (getBirthdays()'s
// `car` field — their car's make on file) rather than generic birthday
// filler, with a car-agnostic fallback line for the rare case nothing's on file.
import { emailShell, eyebrow, p, accentCard, button, FONT } from './emailLayout.js'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

export function buildBirthdayEmailHtml({ firstName, isMember, car }) {
  const driveLine = car
    ? `Hope the ${car} gets out for a good drive today — you two have earned it.`
    : `Hope you get out for a good drive today, wherever the road takes you.`

  const body = isMember
    ? `
      ${eyebrow('From the whole club')}
      ${p(`Happy birthday, ${firstName}! 🎉 ${driveLine}`)}
      ${accentCard(`
        ${p(`We also just want to say: we're really glad you're part of Canvas Routes. Every meet, every route, every "who's got the keys" moment out there — it's better with you in it, and we don't take that for granted.`, { mb: '0' })}
      `)}
      ${p('While it\'s your day — a little treat: your member perks are waiting in your portal, in case it\'s been a while since you checked.', { mb: '18px' })}
      ${button(`${SITE}/members/perks`, 'View My Perks &rarr;', { variant: 'gold', mb: '28px' })}
      ${p('Here\'s to another great year, on the road and off it.', { mb: '18px' })}
      ${p('— Jerry & the Canvas Routes team', { tone: 'muted', mb: '0' })}
    `
    : `
      ${eyebrow('From the whole club')}
      ${p(`Happy birthday, ${firstName}! 🎉 ${driveLine}`)}
      ${p('— Jerry & the Canvas Routes team', { tone: 'muted', mb: '0' })}
    `
  return emailShell({
    title: 'Happy Birthday from Canvas Routes',
    preheader: `Happy Birthday, ${firstName}!`,
    eyebrow: 'Canvas Routes',
    heading: `Happy Birthday, ${firstName}! 🎉`,
    body,
    footer: birthdayFooter(),
  })
}

export function birthdayEmailText({ firstName, isMember, car, unsubUrl }) {
  const driveLine = car
    ? `Hope the ${car} gets out for a good drive today — you two have earned it.`
    : `Hope you get out for a good drive today, wherever the road takes you.`
  const message = isMember
    ? `Happy birthday, ${firstName}! 🎉 ${driveLine}\n\nWe also just want to say: we're really glad you're part of Canvas Routes. Every meet, every route, every "who's got the keys" moment out there — it's better with you in it, and we don't take that for granted.\n\nWhile it's your day — a little treat: your member perks are waiting in your portal, in case it's been a while since you checked: ${SITE}/members/perks\n\nHere's to another great year, on the road and off it.`
    : `Happy birthday, ${firstName}! 🎉 ${driveLine}`
  return `Happy Birthday, ${firstName}! 🎉\n\n${message}\n\n— Jerry & the Canvas Routes team\n\nUnsubscribe: ${unsubUrl}`
}

// Unsubscribe rendered as an actual button (not the usual plain-text link)
// per request — still points at the human-facing /unsubscribe page, same as
// every other email's link; the RFC 8058 one-click List-Unsubscribe header
// (added by the cron route) separately points at the API endpoint for mail
// clients that support one-click.
function birthdayFooter() {
  return `
    <p style="margin:0 0 16px;font-family:${FONT};font-size:11px;line-height:1.6;color:rgba(245,241,236,0.42);">
      &copy; 2026 Canvas Routes &middot; Montreal, QC
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:6px;border:1px solid rgba(245,241,236,0.25);">
        <a href="{{UNSUB_URL}}" style="display:inline-block;padding:9px 18px;font-family:${FONT};font-size:10px;line-height:1;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(245,241,236,0.7);text-decoration:none;border-radius:6px;">Unsubscribe</a>
      </td>
    </tr></table>`
}

// The footer above is built once (no per-recipient email yet), so the
// unsubscribe URL is a placeholder swapped in per recipient here.
export function withUnsubUrl(html, unsubUrl) {
  return html.replaceAll('{{UNSUB_URL}}', unsubUrl)
}
