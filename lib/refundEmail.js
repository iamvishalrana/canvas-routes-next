// Single-language refund cover note matching the customer's checkout language;
// the itemized bilingual refund receipt is the attached PDF (lib/refundPdf.js).
// Built on the shared design system (lib/emailLayout.js).
import { emailShell, p, defaultFooter, COLOR } from './emailLayout.js'

const COPY = {
  fr: {
    title: 'Remboursement — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Remboursement',
    greeting: firstName => `Bonjour, ${firstName}.`,
    body: (amountStr, itemLabel) => `Votre remboursement de <strong>${amountStr}</strong> pour ${itemLabel} a &eacute;t&eacute; trait&eacute;. Le montant devrait appara&icirc;tre sur votre relev&eacute; dans un d&eacute;lai de 5 &agrave; 10 jours ouvrables, selon votre institution financi&egrave;re. Vous trouverez votre re&ccedil;u de remboursement ci-joint.`,
    questions: 'Des questions &agrave; propos de ce remboursement&nbsp;? R&eacute;pondez directement &agrave; ce courriel ou &eacute;crivez-nous &agrave; <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a>.',
    signoff: 'Merci,',
    footer: '&copy; 2026 &Eacute;v&eacute;nements Canvas Routes Inc. &mdash; Montr&eacute;al, QC',
  },
  en: {
    title: 'Refund — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Refund',
    greeting: firstName => `Hi ${firstName},`,
    body: (amountStr, itemLabel) => `Your refund of <strong>${amountStr}</strong> for ${itemLabel} has been processed. It should appear on your statement within 5&ndash;10 business days, depending on your bank. Your refund receipt is attached.`,
    questions: 'Questions about this refund? Reply directly to this email or reach out at <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a>.',
    signoff: 'Thanks,',
    footer: '&copy; 2026 Canvas Routes Events Inc. &mdash; Montreal, QC',
  },
}

export function buildRefundEmailHtml({ lang, firstName, itemLabel, amountCents, currency = 'cad' }) {
  const t = COPY[lang === 'fr' ? 'fr' : 'en']
  const amountStr = `$${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`
  const body = `
    ${p(t.body(amountStr, itemLabel))}
    ${p(t.questions, { tone: 'muted', mb: '24px' })}
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
