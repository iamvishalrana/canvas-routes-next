// Shared by both app/api/admin/members/route.js (first invite) and
// app/api/admin/members/[id]/resend-invite/route.js — one shared builder so
// the first invite and any resend can never drift into two different-looking
// emails again. Built on the shared email design system (lib/emailLayout.js).
import { emailShell, p, button, infoCard, defaultFooter, COLOR, escapeEmail as h } from './emailLayout.js'

export function buildMemberInviteEmailHtml({ firstName, tier, actionLink }) {
  const tierLabel = tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'
  const body = `
    ${p(`Your membership is confirmed &mdash; glad to have you with us for the 2026 season.`)}
    ${p(`This is going to be a good one. Scenic routes across Quebec and beyond, morning meets with the right crowd, and a season built around actually driving. We&rsquo;ll be in touch with everything you need before we hit the road.`, { tone: 'muted', mb: '26px' })}
    ${infoCard([
      ['Season', '2026 Season'],
      ['Your membership', tierLabel],
    ])}
    ${button(h(actionLink), 'Set up your account &rarr;', { variant: 'solid', mb: '26px' })}
    ${p(`See you on the road.<br/><span style="color:${COLOR.muted};">Jerry</span>`, { mb: '10px' })}
    ${p(`The setup link expires in 7 days. Questions? Reply here or reach us at <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a>.`, { tone: 'fine', mb: '0' })}
  `
  return emailShell({
    title: 'You’re in — Canvas Routes 2026',
    preheader: `Welcome to Canvas Routes — your ${tierLabel} membership is confirmed. Set up your account to get started.`,
    eyebrow: 'Canvas Routes &middot; 2026 Season',
    heading: `Welcome, ${h(firstName)}.`,
    body,
    footer: defaultFooter(),
  })
}

export function memberInviteEmailText({ firstName, actionLink }) {
  return `Hey ${firstName},\n\nYou're in — welcome to Canvas Routes.\n\nSet up your member portal here:\n${actionLink}\n\nSee you on the road,\nJerry\nCanvas Routes`
}
