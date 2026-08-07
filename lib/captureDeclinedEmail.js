// Sent when an admin captures a previously-authorized hold and Stripe
// declines the capture itself (expired card, insufficient funds, card
// cancelled/blocked since the hold was placed, etc.). Single-language cover
// note matching the customer's checkout language; built on the shared design
// system (lib/emailLayout.js).
import { emailShell, p, defaultFooter, COLOR } from './emailLayout.js'

const COPY = {
  fr: {
    title: 'Problème de paiement — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Probl&egrave;me de paiement',
    greeting: firstName => `Bonjour, ${firstName}.`,
    body: itemLabel => `Nous avons essay&eacute; de traiter votre paiement pour ${itemLabel} et votre carte a &eacute;t&eacute; refus&eacute;e. Cela peut arriver si la carte a expir&eacute;, a &eacute;t&eacute; annul&eacute;e, ou ne dispose pas de fonds suffisants depuis l'autorisation initiale. <strong>Aucun montant n'a &eacute;t&eacute; pr&eacute;lev&eacute;.</strong>`,
    action: 'R&eacute;pondez directement &agrave; ce courriel ou &eacute;crivez-nous &agrave; <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a> et nous vous aiderons &agrave; r&eacute;gler le paiement autrement.',
    signoff: 'Merci,',
    footer: '&copy; 2026 &Eacute;v&eacute;nements Canvas Routes Inc. &mdash; Montr&eacute;al, QC',
  },
  en: {
    title: 'Payment issue — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Payment Issue',
    greeting: firstName => `Hi ${firstName},`,
    body: itemLabel => `We tried to process your payment for ${itemLabel} and your card was declined. This can happen if the card has since expired, been cancelled, or doesn't have sufficient funds since it was originally authorized. <strong>Nothing has been charged.</strong>`,
    action: 'Reply directly to this email or reach out at <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a> and we\'ll help you sort out another way to pay.',
    signoff: 'Thanks,',
    footer: '&copy; 2026 Canvas Routes Events Inc. &mdash; Montreal, QC',
  },
}

export function buildCaptureDeclinedEmailHtml({ lang, firstName, itemLabel }) {
  const t = COPY[lang === 'fr' ? 'fr' : 'en']
  const body = `
    ${p(t.body(itemLabel))}
    ${p(t.action, { tone: 'muted', mb: '24px' })}
    ${p(`${t.signoff}<br/><span style="color:${COLOR.muted};">Jerry</span>`, { mb: '0' })}
  `
  return emailShell({
    title: t.title,
    eyebrow: t.eyebrow,
    heading: t.greeting(firstName),
    body,
    footer: defaultFooter(t.footer),
  })
}
