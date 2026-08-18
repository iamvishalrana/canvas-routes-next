// Warm, short "Happy Birthday" email — sent automatically by
// app/api/cron/birthday-email/route.js. Built from the shared email design
// system (lib/emailLayout.js) like every other Canvas Routes email, but with
// its own hand-built unsubscribe button (the shared buildBulkEmail() footer
// is a plain text link; this one's explicitly a button per request).
import { emailShell, eyebrow, p, FONT } from './emailLayout.js'

export function buildBirthdayEmailHtml({ firstName }) {
  const body = `
    ${eyebrow('From the whole club')}
    ${p(`Wishing you a great one today, ${firstName} — hope the year ahead brings a few more good roads.`)}
    ${p('— Jerry & the Canvas Routes team', { tone: 'muted', mb: '0' })}
  `
  return emailShell({
    title: 'Happy Birthday from Canvas Routes',
    preheader: `Happy Birthday, ${firstName}!`,
    eyebrow: 'Canvas Routes',
    heading: `Happy Birthday, ${firstName}! 🎂`,
    body,
    footer: birthdayFooter(),
  })
}

export function birthdayEmailText({ firstName, unsubUrl }) {
  return `Happy Birthday, ${firstName}! 🎂\n\nWishing you a great one today — hope the year ahead brings a few more good roads.\n\n— Jerry & the Canvas Routes team\n\nUnsubscribe: ${unsubUrl}`
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
