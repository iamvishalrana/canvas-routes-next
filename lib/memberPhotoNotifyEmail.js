// Sent from the admin panel's "Notify" button in a member's Car & Personal
// photo folder — a manual, one-off action. Built on the shared design system
// (lib/emailLayout.js).
import { emailShell, p, button, COLOR, escapeEmail as h } from './emailLayout.js'

export function buildMemberPhotoNotifyHtml({ firstName, link }) {
  const body = `
    ${p(`We&rsquo;ve added new photos to your Car &amp; Personal folder in the members portal.`, { mb: '26px' })}
    ${button(h(link), 'View Your Photos &rarr;', { variant: 'solid', mb: '26px' })}
    ${p(`See you on the road,<br/>Jerry<br/><span style="color:${COLOR.muted};">Canvas Routes</span>`, { mb: '0' })}
  `
  return emailShell({
    title: 'New Photos — Canvas Routes',
    preheader: 'We’ve added new photos to your Car & Personal folder in the members portal.',
    eyebrow: 'Canvas Routes &middot; Members',
    heading: `Hi ${h(firstName)},`,
    body,
  })
}

export function memberPhotoNotifyText({ firstName, link }) {
  return `Hi ${firstName},\n\nWe've added new photos to your Car & Personal folder in the members portal:\n${link}\n\nSee you on the road,\nJerry\nCanvas Routes`
}
