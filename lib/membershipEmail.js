// Shared membership "application received" email — used by both the normal
// flow (app/api/membership-waitlist) and the webhook rescue path
// (app/api/stripe/webhook, requires_capture handler). Keeping one source means
// the applicant gets the identical email no matter which path wins the race.
// Built on the shared email design system (lib/emailLayout.js).

import { emailShell, eyebrow, p, button, steps, instagram, defaultFooter, COLOR, FONT, escapeEmail as h } from './emailLayout.js'

// tier accepts either the label ('Routes Member' / 'Inner Circle') or the
// stripe type ('membership_inner_circle' / 'membership_routes'); anything that
// isn't Inner Circle falls back to Routes Member.
function tierLabelOf(tier) {
  return tier === 'Inner Circle' || tier === 'membership_inner_circle'
    ? 'Inner Circle'
    : 'Routes Member'
}

export function buildMembershipConfirmHtml(rawFirstName, tier) {
  const firstName = h(rawFirstName)
  const tierLabel = tierLabelOf(tier)

  const body = `
    ${p(`Your application for the 2026 Canvas Routes season is in. Your payment has been <strong style="color:${COLOR.head};font-weight:600;">authorised and held</strong> &mdash; your card has not been charged yet.`)}
    ${p(`We go through every application personally. Here&rsquo;s exactly what happens from here.`, { mb: '22px' })}

    ${eyebrow('What happens next', { color: COLOR.gold, mb: '14px' })}
    ${steps([
      ['We review your application', 'Every application is looked at personally. We keep the community intentional &mdash; this typically takes a few days.'],
      ['You hear from Jerry directly', `Expect an email from <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>. Add that address to your contacts now so it doesn&rsquo;t get missed.`],
      ['If approved &mdash; welcome to the community', 'Your payment is captured and you&rsquo;ll receive everything you need to get started. Your members kit will be ready to collect at your first event.'],
      ['If not approved &mdash; nothing is charged', 'Your authorisation hold is released in full. No charge, no questions asked.'],
    ])}

    ${p(`Our reply will come from <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>. If you don&rsquo;t hear from us within a few days, please check your <strong style="color:${COLOR.body};font-weight:600;">junk or spam folder</strong>.`, { tone: 'muted' })}
    ${p(`If you were referred by an existing member, that&rsquo;s noted and taken into account during review.`, { tone: 'muted', mb: '26px' })}

    ${instagram()}
  `

  return emailShell({
    title: 'Application received — Canvas Routes',
    preheader: `We've got you, ${rawFirstName || 'there'} — your ${tierLabel} application is in and your card is authorised, not charged.`,
    eyebrow: `Canvas Routes &middot; ${tierLabel} &middot; 2026 Season`,
    heading: `We&rsquo;ve got you, ${firstName}.`,
    body,
    footer: defaultFooter(),
  })
}

// Plain-text counterpart, kept in sync with the HTML above.
export function buildMembershipConfirmText(rawFirstName) {
  const firstName = rawFirstName || 'there'
  return `We've got you, ${firstName}.\n\nYour application for the 2026 Canvas Routes season is in. Your payment has been authorised and held — your card has not been charged yet.\n\nWhat happens next:\n1. We review your application — every application is looked at personally, typically within a few days.\n2. You'll hear from Jerry directly at jerry@canvasroutes.com — add that address to your contacts now.\n3. If approved, your payment is captured and you're in — your members kit will be ready to collect at your first event.\n4. If not approved, your authorisation hold is released in full — no charge, no questions asked.\n\nIf you don't hear from us within a few days, please check your junk or spam folder.\n\nFollow @canvasroutes on Instagram: https://www.instagram.com/canvasroutes\n\n© 2026 Canvas Routes. Montreal, QC.`
}
