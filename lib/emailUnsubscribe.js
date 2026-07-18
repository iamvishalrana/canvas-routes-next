// Shared by every bulk/broadcast-style send (main Broadcasts tool, and the
// per-route "interest" launch/update emails) — RFC 8058 one-click unsubscribe,
// a plain-text part, and personalization. Kept in one place because Gmail/
// Yahoo's bulk-sender rules require these headers, and having two divergent
// copies is how one send path quietly loses compliance (already happened once
// — the route-broadcast/launch routes were built without any of this).

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

export function buildUnsubscribeFooter(email, pageUrl) {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
  <tr><td style="padding-top:16px;border-top:1px solid rgba(0,0,0,0.08);text-align:center;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaa;margin:0;">
      Canvas Routes &nbsp;&middot;&nbsp; Montreal, QC<br/>
      <a href="${pageUrl}" style="color:#bbb;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>
</table>`
}

export function htmlToPlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
    .replace(/&lsquo;/g, '‘').replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Builds one Resend email payload for a single recipient of a bulk send:
// unsubscribe footer injected into the HTML (at the `<!-- UNSUBSCRIBE_FOOTER -->`
// marker if the template has one, otherwise appended), a plain-text part, and
// the List-Unsubscribe / List-Unsubscribe-Post / Precedence headers.
export function buildBulkEmail({ from, replyTo, recipient, subject, html, attachments }) {
  const unsubPageUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(recipient.email)}`
  const unsubApiUrl  = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`
  const unsubFooter = buildUnsubscribeFooter(recipient.email, unsubPageUrl)
  const resolvedHtml = html.includes('<!-- UNSUBSCRIBE_FOOTER -->')
    ? html.replace('<!-- UNSUBSCRIBE_FOOTER -->', unsubFooter)
    : html + unsubFooter
  const fullName = recipient.name || 'there'
  const firstName = (recipient.name || '').trim().split(/\s+/)[0] || 'there'
  const personalise = s => s
    .replace(/\{\{first_?name\}\}/gi, firstName)
    .replace(/\{\{name\}\}/gi, fullName)
  const finalHtml = personalise(resolvedHtml)
  return {
    from,
    to: recipient.email,
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: personalise(subject),
    html: finalHtml,
    text: htmlToPlainText(finalHtml) + `\n\nUnsubscribe: ${unsubPageUrl}`,
    ...(attachments?.length ? { attachments } : {}),
    headers: {
      // RFC 8058: List-Unsubscribe-Post requires the URL to accept a POST with
      // application/x-www-form-urlencoded — /api/unsubscribe handles this.
      // The page URL is used only for the human-visible body link.
      'List-Unsubscribe': `<${unsubApiUrl}>, <mailto:info@canvasroutes.com?subject=unsubscribe&body=${encodeURIComponent(recipient.email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence': 'bulk',
    },
  }
}

// Fail closed: if the unsubscribe list can't be read, throw rather than risk
// emailing someone who opted out. Callers should abort the send on rejection.
export async function filterUnsubscribed(supabase, recipients) {
  const { data: unsubs, error } = await supabase.from('unsubscribed_emails').select('email')
  if (error) throw new Error(error.message)
  if (!unsubs?.length) return recipients
  const unsubSet = new Set(unsubs.map(u => u.email.toLowerCase()))
  return recipients.filter(r => !unsubSet.has(r.email.toLowerCase()))
}
