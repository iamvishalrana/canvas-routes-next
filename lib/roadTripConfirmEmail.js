// Road-trip hold + confirmation emails — shared by every road-trip flow
// (WTET, Hello to Montebello, future routes) via eventLabel. Built on the
// shared email design system (lib/emailLayout.js).
import { emailShell, p, button, infoCard, instagram, defaultFooter, COLOR } from './emailLayout.js'

const EVENT_NAME = 'Whips to Eastern Townships — July 5, 2026'

export function buildWtetHoldHtml(firstName, amount, eventLabel = EVENT_NAME) {
  const body = `
    ${p(`We&rsquo;ve received your registration for <strong style="color:${COLOR.head};font-weight:600;">${eventLabel}</strong>.`)}
    ${infoCard([
      ['Event', eventLabel],
      ['Authorization hold', `<span style="color:#8A6A2E;font-weight:500;">${amount} &mdash; held, not charged</span>`],
    ])}
    ${p(`Your card has been authorized but <strong style="color:${COLOR.head};font-weight:600;">nothing has been charged yet.</strong> We review every registration personally &mdash; if you&rsquo;re confirmed, the charge goes through and you&rsquo;ll receive full event details. If we can&rsquo;t place you, the hold is released with no charge.`)}
    ${p(`Add <strong style="color:${COLOR.body};font-weight:600;">jerry@canvasroutes.com</strong> to your contacts so our reply gets through.`, { tone: 'muted' })}
    ${p(`Questions? Reply directly to this email or reach out at <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>.`, { mb: '26px' })}
    ${instagram()}
  `
  return emailShell({
    title: 'Registration received — Canvas Routes',
    preheader: `We've received your registration for ${eventLabel}. Your ${amount} hold is placed — nothing charged yet.`,
    eyebrow: 'Canvas Routes &middot; Route',
    heading: `Registration received, ${firstName}.`,
    body,
  })
}

export function buildWtetConfirmHtml(firstName, amount, checkinUrl, eventLabel = EVENT_NAME) {
  const body = `
    ${p(`Your payment for <strong style="color:${COLOR.head};font-weight:600;">${eventLabel}</strong> has been received. You&rsquo;re on the list.`)}
    ${infoCard([
      ['Event', eventLabel],
      ['Payment', `<span style="color:#3B6B2F;font-weight:500;">${amount} &mdash; Confirmed</span>`],
    ])}
    ${p(`You&rsquo;ll receive a full itinerary, meeting point, and everything you need closer to the date. Keep an eye on <a href="https://www.instagram.com/canvasroutes" style="color:#3B6B2F;text-decoration:none;">@canvasroutes</a> for updates.`)}
    ${p(`Add <strong style="color:${COLOR.body};font-weight:600;">info@canvasroutes.com</strong> and <strong style="color:${COLOR.body};font-weight:600;">jerry@canvasroutes.com</strong> to your contacts so you don&rsquo;t miss any updates &mdash; our emails may land in spam.`)}
    ${checkinUrl ? `${button(checkinUrl, 'Complete Check-in &rarr;', { variant: 'solid', mb: '8px' })}
    ${p(`If you&rsquo;ve already completed the check-in, you can ignore this button.`, { tone: 'fine', mb: '26px' })}` : ''}
    ${p(`Please note that we will have a <strong style="color:${COLOR.head};font-weight:600;">waiver for you to sign</strong> before the trip begins. This is standard for all Canvas Routes events and covers all passengers in your vehicle.`)}
    ${p(`Any questions &mdash; reply directly to this email or reach out at <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>.`, { mb: '26px' })}
    ${instagram()}
  `
  return emailShell({
    title: 'You’re confirmed — Canvas Routes',
    preheader: `Your payment for ${eventLabel} is confirmed — you're on the list. Itinerary and meeting point to come.`,
    eyebrow: 'Canvas Routes &middot; Route',
    heading: `You&rsquo;re confirmed, ${firstName}.`,
    body,
  })
}
