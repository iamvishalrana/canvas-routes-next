const COPY = {
  fr: {
    title: 'Remboursement — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Remboursement',
    greeting: firstName => `Bonjour, ${firstName}.`,
    body: (amountStr, itemLabel) => `Votre remboursement de <strong>${amountStr}</strong> pour ${itemLabel} a &eacute;t&eacute; trait&eacute;. Le montant devrait appara&icirc;tre sur votre relev&eacute; dans un d&eacute;lai de 5 &agrave; 10 jours ouvrables, selon votre institution financi&egrave;re.`,
    questions: 'Des questions &agrave; propos de ce remboursement&nbsp;? R&eacute;pondez directement &agrave; ce courriel ou &eacute;crivez-nous &agrave; <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a>.',
    signoff: 'Merci,',
    footer: '&copy; 2026 &Eacute;v&eacute;nements Canvas Routes Inc. &mdash; Montr&eacute;al, QC.',
  },
  en: {
    title: 'Refund — Canvas Routes',
    eyebrow: 'Canvas Routes &middot; Refund',
    greeting: firstName => `Hi ${firstName},`,
    body: (amountStr, itemLabel) => `Your refund of <strong>${amountStr}</strong> for ${itemLabel} has been processed. It should appear on your statement within 5&ndash;10 business days, depending on your bank.`,
    questions: 'Questions about this refund? Reply directly to this email or reach out at <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a>.',
    signoff: 'Thanks,',
    footer: '&copy; 2026 Canvas Routes Events Inc. &mdash; Montreal, QC.',
  },
}

export function buildRefundEmailHtml({ lang, firstName, itemLabel, amountCents, currency = 'cad' }) {
  const t = COPY[lang === 'fr' ? 'fr' : 'en']
  const amountStr = `$${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>${t.title}</title></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">${t.eyebrow}</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">${t.greeting(firstName)}</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">${t.body(amountStr, itemLabel)}</p>
        <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">${t.questions}</p>
        <p style="margin:24px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#666;">${t.signoff}<br/><span style="color:#aaa;">Jerry</span></p>
      </td></tr>
      <tr><td style="background:#0F1E14;padding:16px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);">${t.footer} &nbsp;&middot;&nbsp; <a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}
