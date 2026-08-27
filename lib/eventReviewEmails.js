// Shared templates for the review-based public event registration flow
// (app/api/public/events/[id]/register + app/api/admin/events/[id]/registrants/review).
// A registration through that route starts as review_status 'pending'
// (auto-'accepted' for verified members), and these three states are the
// only ones it can ever be in — one email per state, used from both routes
// so accept/decline copy can't drift between "admin approves later" and
// "member approved instantly."
import { emailShell, p, infoCard } from './emailLayout.js'

export function buildPendingReviewHtml({ firstName, eventName, dateDisplay, location }) {
  const body = `
    ${p(`We&rsquo;ve received your registration for <strong style="color:#161616;font-weight:600;">${eventName}</strong>. Every registration is personally reviewed &mdash; we&rsquo;ll follow up by email with your confirmation before the event.`)}
    ${infoCard([
      dateDisplay && ['Date', dateDisplay],
      location && ['Location', location],
      ['Entry', 'Free'],
    ])}
    ${p(`Questions? Reply directly to this email &mdash; it comes straight to me.`, { mb: '6px' })}
    ${p(`&mdash; Jerry`, { tone: 'muted', mb: '0' })}
  `
  return emailShell({
    title: 'Registration received — Canvas Routes',
    preheader: `We've received your registration for ${eventName} — we'll follow up with confirmation before the event.`,
    eyebrow: 'Canvas Routes · Registration Received',
    heading: `Thanks, ${firstName}.`,
    body,
  })
}

export function buildAcceptedHtml({ firstName, eventName, dateDisplay, location }) {
  const body = `
    ${p(`Your spot at <strong style="color:#161616;font-weight:600;">${eventName}</strong> is confirmed. See you there.`)}
    ${infoCard([
      dateDisplay && ['Date', dateDisplay],
      location && ['Location', location],
      ['Entry', 'Free'],
    ])}
    ${p(`Questions? Reply directly to this email &mdash; it comes straight to me.`, { mb: '6px' })}
    ${p(`&mdash; Jerry`, { tone: 'muted', mb: '0' })}
  `
  return emailShell({
    title: 'You’re confirmed — Canvas Routes',
    preheader: `Your spot at ${eventName} is confirmed.`,
    eyebrow: 'Canvas Routes · Registration Confirmed',
    heading: `You&rsquo;re in, ${firstName}.`,
    body,
  })
}

export function buildDeclinedHtml({ firstName, eventName }) {
  const body = `
    ${p(`Thanks for your interest in <strong style="color:#161616;font-weight:600;">${eventName}</strong>. Every registration is personally reviewed, and we&rsquo;re not able to confirm your spot for this one.`)}
    ${p(`We&rsquo;d love to see you at a future meet &mdash; keep an eye on our Instagram or apply for membership for early access to what&rsquo;s next.`, { mb: '6px' })}
    ${p(`&mdash; Jerry`, { tone: 'muted', mb: '0' })}
  `
  return emailShell({
    title: 'Update on your registration — Canvas Routes',
    preheader: `An update on your registration for ${eventName}.`,
    eyebrow: 'Canvas Routes · Registration Update',
    heading: `Hey ${firstName}.`,
    body,
  })
}
