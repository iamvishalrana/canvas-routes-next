// Sent when a visitor signs up for event notifications (no membership). Built
// on the shared design system (lib/emailLayout.js).
import { emailShell, p, button, accentCard, instagram, EMAIL_SITE as SITE, COLOR } from './emailLayout.js'

export function buildNotifySignupHtml({ firstName }) {
  const body = `
    ${p(`We&rsquo;ll email you when new car meets and routes are announced &mdash; no membership required.`)}
    ${accentCard(p(`One thing worth knowing: <strong style="color:${COLOR.head};font-weight:600;">priority for events is always given to Canvas Routes members.</strong> Spots for non-members are limited and go quickly.`, { tone: 'muted', mb: '0' }))}
    ${button(`${SITE}/membership`, 'Become a Member &rarr;', { variant: 'green' })}
    ${p(`Questions? Reply directly to this email.`, { mb: '26px' })}
    ${instagram()}
  `
  return emailShell({
    title: 'You’re on the list — Canvas Routes',
    preheader: `You're on the list — we'll email you when new car meets and routes are announced.`,
    eyebrow: 'Canvas Routes &middot; Event Notifications',
    heading: `You&rsquo;re on the list${firstName ? `, ${firstName}` : ''}.`,
    body,
  })
}
