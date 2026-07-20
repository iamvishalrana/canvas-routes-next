import { GST_NUMBER, QST_NUMBER } from './companyInfo.js'

const fmt = cents => `$${(cents / 100).toFixed(2)}`

function lineRow(label, sub, amount, opts = {}) {
  const { bold, accent, divider } = opts
  const pad = bold ? '16px 0 4px' : '7px 0'
  const border = divider ? 'border-top:1px solid rgba(0,0,0,0.12);padding-top:18px;' : ''
  const labelColor = accent ? '#1a1a1a' : '#666'
  const amountColor = accent ? '#3B6B2F' : '#1a1a1a'
  return `<tr>
    <td style="padding:${pad};font-family:Arial,Helvetica,sans-serif;font-size:${bold ? '15px' : '13px'};font-weight:${bold ? '600' : '400'};color:${labelColor};${border}" valign="top">
      ${label}${sub ? `<div style="font-size:10px;color:#aaa;margin-top:3px;font-weight:400;letter-spacing:0.02em;">${sub}</div>` : ''}
    </td>
    <td align="right" style="padding:${pad};font-family:Arial,Helvetica,sans-serif;font-size:${bold ? '18px' : '13px'};font-weight:${bold ? '700' : '400'};color:${amountColor};white-space:nowrap;${border}" valign="top">
      ${amount}
    </td>
  </tr>`
}

// Branded itemized receipt — same header/footer shell as the site's other
// transactional emails, with a proper receipt-style card: right-aligned
// amounts, one clear total, tax registration numbers as small subtext
// instead of crowding the line itself. subtotal/discount/gst/qst/total are
// all cents.
export function buildReceiptHtml({ firstName, itemLabel, subtotal, discount = 0, gst, qst, total, paidAt, receiptId }) {
  const paidDate = paidAt ? new Date(paidAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Receipt</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">Thanks, ${firstName}.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Here&apos;s your receipt — keep it for your records.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid rgba(0,0,0,0.1);border-radius:6px;margin-bottom:28px;">
          <tr><td style="padding:16px 24px;border-bottom:1px solid rgba(0,0,0,0.08);">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.5px;color:#c5a882;"><span style="text-transform:uppercase;">Receipt</span>${receiptId ? ` <span style="color:#bbb;text-transform:none;letter-spacing:0;">&middot; #${receiptId}</span>` : ''}</td>
              <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999;">${paidDate}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:20px 24px 4px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#1a1a1a;">${itemLabel}</div>
          </td></tr>
          <tr><td style="padding:0 24px 22px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${lineRow('Subtotal', null, fmt(subtotal))}
              ${discount > 0 ? lineRow('Discount', null, `&minus;${fmt(discount)}`) : ''}
              ${lineRow('GST (5%)', GST_NUMBER, fmt(gst))}
              ${lineRow('QST (9.975%)', QST_NUMBER, fmt(qst))}
              ${lineRow('Total Paid', null, `${fmt(total)} CAD`, { bold: true, accent: true, divider: true })}
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">Questions about this charge? Reply directly to this email or reach out at <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border:0.5px solid rgba(0,0,0,0.18);">
            <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#0F1E14;padding:16px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);">&copy; 2026 Canvas Routes. Montreal, QC. &nbsp;&middot;&nbsp; <a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}
