// Warm "Happy Birthday" email — sent automatically by
// app/api/cron/birthday-email/route.js. Built from the shared email design
// system (lib/emailLayout.js) like every other Canvas Routes email, but with
// its own hand-built unsubscribe button (the shared buildBulkEmail() footer
// is a plain text link; this one's explicitly a button per request).
//
// Two variants, chosen by isMember (getBirthdays()'s type === 'member'):
// members get a longer, warmer note that thanks them for being part of the
// club specifically; non-members (applicants who gave a DOB but never
// joined) get a shorter, upbeat one with no membership language that
// wouldn't apply to them.
import { emailShell, eyebrow, p, accentCard, FONT } from './emailLayout.js'

export function buildBirthdayEmailHtml({ firstName, isMember }) {
  const body = isMember
    ? `
      ${eyebrow('From the whole club')}
      ${p(`Happy birthday, ${firstName}! 🎉 We hope today is full of good roads, good company, and — no judgment — cake before noon if that's how you like to celebrate.`)}
      ${accentCard(`
        ${p(`We also just want to say: we're really glad you're part of Canvas Routes. Every meet, every route, every "who's got the keys" moment out there — it's better with you in it, and we don't take that for granted.`, { mb: '0' })}
      `)}
      ${p('Here\'s to another great year, on the road and off it.', { mb: '18px' })}
      ${p('— Jerry & the Canvas Routes team', { tone: 'muted', mb: '0' })}
    `
    : `
      ${eyebrow('From the whole club')}
      ${p(`Happy birthday, ${firstName}! 🎉 Another trip around the sun deserves a good drive to celebrate it.`)}
      ${p(`We hope your day is full of good roads, good company, and maybe a slice of cake too. Here's to a great year ahead.`)}
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

export function birthdayEmailText({ firstName, isMember, unsubUrl }) {
  const message = isMember
    ? `Happy birthday, ${firstName}! 🎉 We hope today is full of good roads, good company, and — no judgment — cake before noon if that's how you like to celebrate.\n\nWe also just want to say: we're really glad you're part of Canvas Routes. Every meet, every route, every "who's got the keys" moment out there — it's better with you in it, and we don't take that for granted.\n\nHere's to another great year, on the road and off it.`
    : `Happy birthday, ${firstName}! 🎉 Another trip around the sun deserves a good drive to celebrate it.\n\nWe hope your day is full of good roads, good company, and maybe a slice of cake too. Here's to a great year ahead.`
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
