// Sent from the admin panel's "Send Link" button on a non-member's photo
// share (photo_share_people) — lets them know their photos are ready to
// view/download. Built on the shared design system (lib/emailLayout.js),
// replacing the old full-bleed dark-green template that lived inline in
// app/api/admin/photo-share-people/[personId]/send-link/route.js.
import { emailShell, p, button, accentCard, escapeEmail as h } from './emailLayout.js'

export function buildPhotoShareNotifyHtml({ firstName, link }) {
  const body = `
    ${p(`Here are your photos from Canvas Routes.`, { mb: '20px' })}
    ${accentCard(p(`Each event&rsquo;s photos are automatically removed 30 days after they&rsquo;re added, so it&rsquo;s worth downloading anything you&rsquo;d like to keep.`, { tone: 'muted', mb: '0' }), { mb: '26px' })}
    ${button(h(link), 'View Your Photos &rarr;', { variant: 'solid', mb: '26px' })}
    ${p(`See you on the road,<br/>Jerry<br/><span style="color:#8C8C8C;">Canvas Routes</span>`, { mb: '0' })}
  `
  return emailShell({
    title: 'Your Canvas Routes Photos',
    preheader: 'Here are your photos from Canvas Routes.',
    eyebrow: 'Canvas Routes',
    heading: `Hi ${h(firstName)},`,
    body,
  })
}

export function photoShareNotifyText({ firstName, link }) {
  return `Hi ${firstName},\n\nHere are your photos from Canvas Routes:\n${link}\n\nEach event's photos are automatically removed 30 days after they're added, so it's worth downloading anything you'd like to keep.\n\nSee you on the road,\nJerry\nCanvas Routes`
}
