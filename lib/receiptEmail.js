// Single-language cover note matching the customer's checkout language
// (pi.metadata.lang) — the itemized bilingual receipt itself is the attached
// PDF (lib/receiptPdf.js). Built on the shared design system (lib/emailLayout.js).
import { emailShell, p, defaultFooter, COLOR } from './emailLayout.js'

const COPY = {
  fr: {
    title: 'Reçu — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Re&ccedil;u',
    greeting: firstName => `Merci, ${firstName}.`,
    body: itemLabel => `Veuillez trouver ci-joint votre re&ccedil;u pour ${itemLabel}.`,
    questions: 'Des questions &agrave; propos de ce paiement&nbsp;? R&eacute;pondez directement &agrave; ce courriel ou &eacute;crivez-nous &agrave; <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a>.',
    signoff: 'Merci encore,',
    footer: '&copy; 2026 &Eacute;v&eacute;nements Canvas Routes Inc. &mdash; Montr&eacute;al, QC',
  },
  en: {
    title: 'Receipt — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Receipt',
    greeting: firstName => `Thanks, ${firstName}.`,
    body: itemLabel => `Please find your receipt attached for ${itemLabel}.`,
    questions: 'Questions about this charge? Reply directly to this email or reach out at <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a>.',
    signoff: 'Thanks again,',
    footer: '&copy; 2026 Canvas Routes Events Inc. &mdash; Montreal, QC',
  },
}

export function buildReceiptEmailHtml({ lang, firstName, itemLabel }) {
  const t = COPY[lang === 'fr' ? 'fr' : 'en']
  const body = `
    ${p(t.body(itemLabel))}
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
