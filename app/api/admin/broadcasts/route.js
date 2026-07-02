import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { captureMessage } from '../../../../lib/sentry'

const MAX_RECIPIENTS = 2000
const RESEND_BATCH_SIZE = 100 // Resend /emails/batch max per call
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

function buildUnsubscribeFooter(email, pageUrl) {
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

function htmlToPlainText(html) {
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

function buildEmail({ from, recipient, subject, html, unsubPageUrl, unsubApiUrl }) {
  const unsubFooter = buildUnsubscribeFooter(recipient.email, unsubPageUrl)
  const resolvedHtml = html.includes('<!-- UNSUBSCRIBE_FOOTER -->')
    ? html.replace('<!-- UNSUBSCRIBE_FOOTER -->', unsubFooter)
    : html + unsubFooter
  const finalHtml = resolvedHtml.replace(/\{\{name\}\}/gi, recipient.name || 'there')
  return {
    from,
    to: recipient.email,
    subject: subject.replace(/\{\{name\}\}/gi, recipient.name || 'there'),
    html: finalHtml,
    text: htmlToPlainText(finalHtml) + `\n\nUnsubscribe: ${unsubPageUrl}`,
    headers: {
      // RFC 8058: List-Unsubscribe-Post requires the URL to accept a POST with
      // application/x-www-form-urlencoded — the API endpoint handles this.
      // The page URL is used only for the human-visible body link.
      'List-Unsubscribe': `<${unsubApiUrl}>, <mailto:info@canvasroutes.com?subject=unsubscribe&body=${encodeURIComponent(recipient.email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence': 'bulk',
    },
  }
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('broadcasts')
    .select('id, subject, body_html, audience, specific_emails, sent_count, failed_count, failed_recipients, sent_at')
    .order('sent_at', { ascending: false })
    .limit(100)
  if (error) {
    captureMessage('Broadcast history read failed', { error: error.message })
    return Response.json({ error: `Could not load history: ${error.message}` }, { status: 500 })
  }
  return Response.json(data || [])
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })

  const { subject, html, body_html, audience, specificEmails, excludeEmails, fromEmail } = await request.json()
  const ALLOWED_FROM = ['info@canvasroutes.com', 'jerry@canvasroutes.com']
  const resolvedFrom = ALLOWED_FROM.includes(fromEmail) ? fromEmail : 'info@canvasroutes.com'
  const fromHeader = resolvedFrom === 'jerry@canvasroutes.com'
    ? 'Canvas Routes <jerry@canvasroutes.com>'
    : 'Canvas Routes <info@canvasroutes.com>'

  if (!subject?.trim()) return Response.json({ error: 'Subject is required.' }, { status: 400 })
  if (!html?.trim()) return Response.json({ error: 'Email body is required.' }, { status: 400 })
  if (!audience) return Response.json({ error: 'Audience is required.' }, { status: 400 })

  const supabase = createAdminClient()
  let recipients = []
  let normalizedSpecificEmails = null // hoisted so history save can use the sanitized version

  async function fetchMembers(filters = {}) {
    let q = supabase.from('members').select('email, name, membership_status, tier')
    if (filters.membership_status) q = q.eq('membership_status', filters.membership_status)
    if (filters.tier) q = q.eq('tier', filters.tier)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data || []).filter(m => m.email)
  }

  async function fetchContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('application_id, applications(email, name)')
    if (error) throw new Error(error.message)
    return (data || [])
      .map(c => ({ email: c.applications?.email, name: c.applications?.name }))
      .filter(c => c.email)
  }

  try {
    if (audience === 'canvas_routes_member') {
      recipients = await fetchMembers({ membership_status: 'active', tier: 'routes_member' })
    } else if (audience === 'inner_circle') {
      recipients = await fetchMembers({ membership_status: 'active', tier: 'inner_circle' })
    } else if (audience === 'all_active_members') {
      recipients = await fetchMembers({ membership_status: 'active' })
    } else if (audience === 'pending_members') {
      recipients = await fetchMembers({ membership_status: 'pending' })
    } else if (audience === 'all_contacts') {
      recipients = await fetchContacts()
    } else if (audience === 'contacts_non_members') {
      const [allContacts, allMembers] = await Promise.all([
        fetchContacts(),
        fetchMembers(),
      ])
      const memberEmails = new Set(allMembers.map(m => m.email.toLowerCase()))
      recipients = allContacts.filter(c => !memberEmails.has(c.email.toLowerCase()))
    } else if (audience === 'everyone') {
      const [members, contacts] = await Promise.all([
        fetchMembers({ membership_status: 'active' }),
        fetchContacts(),
      ])
      const seen = new Set()
      for (const r of [...members, ...contacts]) {
        const key = r.email.toLowerCase()
        if (!seen.has(key)) { seen.add(key); recipients.push(r) }
      }
    } else if (audience === 'specific_emails') {
      const rawEmails = Array.isArray(specificEmails) ? specificEmails : []
      normalizedSpecificEmails = [...new Set(
        rawEmails.map(e => e.toLowerCase().trim()).filter(e => e.includes('@') && e.includes('.'))
      )]
      if (normalizedSpecificEmails.length === 0) return Response.json({ error: 'No valid email addresses provided.' }, { status: 400 })
      const [membersData, appsData] = await Promise.all([
        supabase.from('members').select('email, name').in('email', normalizedSpecificEmails),
        supabase.from('applications').select('email, name').in('email', normalizedSpecificEmails),
      ])
      const nameMap = {}
      for (const m of (membersData.data || [])) nameMap[m.email.toLowerCase()] = m.name
      for (const a of (appsData.data || [])) if (!nameMap[a.email.toLowerCase()]) nameMap[a.email.toLowerCase()] = a.name
      recipients = normalizedSpecificEmails.map(email => ({ email, name: nameMap[email] || '' }))
    } else {
      return Response.json({ error: 'Invalid audience.' }, { status: 400 })
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }

  // Filter out manually excluded emails
  if (Array.isArray(excludeEmails) && excludeEmails.length > 0) {
    const excludeSet = new Set(excludeEmails.map(e => e.toLowerCase().trim()))
    recipients = recipients.filter(r => !excludeSet.has(r.email.toLowerCase()))
  }

  // Filter out anyone who has unsubscribed. Fail closed: if the list can't be
  // read we must not risk emailing people who opted out — abort before sending.
  const { data: unsubs, error: unsubErr } = await supabase
    .from('unsubscribed_emails')
    .select('email')
  if (unsubErr) {
    captureMessage('Broadcast blocked — unsubscribe list unreadable', { error: unsubErr.message })
    return Response.json({ error: `Could not check the unsubscribe list (${unsubErr.message}). Broadcast not sent.` }, { status: 500 })
  }
  if (unsubs?.length) {
    const unsubSet = new Set(unsubs.map(u => u.email.toLowerCase()))
    recipients = recipients.filter(r => !unsubSet.has(r.email.toLowerCase()))
  }

  const totalRecipients = recipients.length
  const truncated = totalRecipients > MAX_RECIPIENTS
  recipients = recipients.slice(0, MAX_RECIPIENTS)
  if (recipients.length === 0) return Response.json({ sent: 0, failed: 0, truncated: false, totalRecipients: 0 })

  let sent = 0
  let failed = 0
  const failedRecipients = []

  // Use Resend's batch endpoint — one API call per 100 emails, no per-request rate limits
  for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + RESEND_BATCH_SIZE)
    const payload = batch.map(recipient => {
      const unsubPageUrl = `${SITE_URL}/unsubscribe?email=${encodeURIComponent(recipient.email)}`
      const unsubApiUrl  = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`
      return buildEmail({ from: fromHeader, recipient, subject: subject.trim(), html, unsubPageUrl, unsubApiUrl })
    })
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        sent += batch.length
      } else {
        let reason = `HTTP ${res.status}`
        try { const d = await res.json(); reason = d.message || d.name || reason } catch {}
        failed += batch.length
        for (const r of batch) failedRecipients.push({ email: r.email, name: r.name || '', reason })
      }
    } catch (err) {
      const reason = err.message || 'Network error'
      failed += batch.length
      for (const r of batch) failedRecipients.push({ email: r.email, name: r.name || '', reason })
    }
  }

  // Save to broadcast history using normalized emails, not the raw client input.
  // supabase-js returns errors instead of throwing — check `error` explicitly,
  // otherwise a failed insert (missing grants, missing column) is invisible.
  const { error: historyError } = await supabase.from('broadcasts').insert({
    subject: subject.trim(),
    body_html: body_html || null,
    audience,
    specific_emails: audience === 'specific_emails' ? normalizedSpecificEmails : null,
    sent_count: sent,
    failed_count: failed,
    failed_recipients: failedRecipients.length > 0 ? failedRecipients : null,
  })
  if (historyError) {
    captureMessage('Broadcast history insert failed', { error: historyError.message, audience, sent, failed })
  }

  // Emails already went out — report the history failure but don't fail the response
  return Response.json({
    sent, failed, truncated, totalRecipients,
    historySaved: !historyError,
    ...(historyError ? { historyError: historyError.message } : {}),
  })
}
