import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureException, captureMessage } from '../../../../lib/sentry'
import { getBirthdays, observedBirthdayDay } from '../../../../lib/adminBirthdays'
import { filterUnsubscribed, htmlToPlainText } from '../../../../lib/emailUnsubscribe.js'
import { buildBirthdayEmailHtml, birthdayEmailText, withUnsubUrl } from '../../../../lib/birthdayEmail.js'
import { nowInMontreal } from '../../../../lib/mtlTime.js'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

// Scheduled once daily at a fixed 05:00 UTC (see vercel.json) — every other
// cron in this project runs at most once a day, so an hourly schedule risks
// running into a plan-level frequency limit for no good reason. 05:00 UTC is
// deliberately chosen to always land AT OR AFTER Montreal local midnight
// year-round without ever landing before it: Montreal is UTC-5 in winter
// (EST) — 05:00 UTC is exactly 00:00 local — and UTC-4 in summer (EDT) —
// 05:00 UTC is 01:00 local, an hour late but never early, which matters far
// more than exact punctuality (sending a day early would be a real bug;
// arriving at 1am instead of 12am for part of the year is not).
async function sendBirthdayEmails() {
  if (!process.env.RESEND_API_KEY) return { skipped: 'RESEND_API_KEY missing' }
  const supabase = createAdminClient()

  const { year, month, day } = nowInMontreal()

  const birthdays = await getBirthdays(supabase)
  const todaysBirthdays = birthdays.filter(b => b.month === month && observedBirthdayDay(b, year) === day)
  if (!todaysBirthdays.length) return { sent: 0, matched: 0 }

  let recipients
  try {
    recipients = await filterUnsubscribed(supabase, todaysBirthdays)
  } catch (err) {
    captureMessage('Birthday email blocked — unsubscribe list unreadable', { error: err.message })
    return { error: `Could not check the unsubscribe list (${err.message}). Not sent.` }
  }

  let sent = 0, skipped = 0, failed = 0
  for (const person of recipients) {
    const emailLower = person.email.toLowerCase()

    // Already sent this year — e.g. the scheduled run already handled it
    // today and this is a manual POST retest, or (very unlikely) a
    // concurrent overlapping run. The UNIQUE(email, year) constraint on the
    // insert below is the real backstop; this check just skips the Resend
    // call in the common case instead of relying on the DB error alone.
    const { data: already } = await supabase.from('birthday_emails_log').select('id').eq('email', emailLower).eq('year', year).maybeSingle()
    if (already) { skipped++; continue }

    const firstName = (person.name || person.email).trim().split(/\s+/)[0]
    const unsubPageUrl = `${SITE}/unsubscribe?email=${encodeURIComponent(person.email)}`
    const unsubApiUrl = `${SITE}/api/unsubscribe?email=${encodeURIComponent(person.email)}`
    const html = withUnsubUrl(buildBirthdayEmailHtml({ firstName }), unsubPageUrl)

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Canvas Routes <jerry@canvasroutes.com>',
          to: person.email,
          reply_to: 'jerry@canvasroutes.com',
          subject: `Happy Birthday, ${firstName}! 🎂`,
          html,
          text: birthdayEmailText({ firstName, unsubUrl: unsubPageUrl }) || htmlToPlainText(html),
          headers: {
            // RFC 8058 one-click — List-Unsubscribe-Post requires the URL to
            // accept a POST with application/x-www-form-urlencoded;
            // /api/unsubscribe handles this. The visible button in the body
            // links to the human-facing page instead (unsubPageUrl above).
            'List-Unsubscribe': `<${unsubApiUrl}>, <mailto:info@canvasroutes.com?subject=unsubscribe&body=${encodeURIComponent(person.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'Precedence': 'bulk',
          },
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown')
        captureMessage(`Birthday email failed — ${person.email}`, { response: errText })
        failed++
        continue // no log row written — a manual POST retry from the admin panel would still catch this later today
      }
      const { error: logErr } = await supabase.from('birthday_emails_log').insert({ email: emailLower, year })
      // A unique-constraint conflict here just means another run already
      // logged it a moment ago — the email still only went out once from
      // Resend's perspective, so this isn't a real error, just noise.
      if (logErr && logErr.code !== '23505') captureException(new Error(logErr.message), { context: 'birthday-email-log', email: emailLower })
      sent++
    } catch (err) {
      captureException(err, { context: 'birthday-email-send', email: emailLower })
      failed++
    }
  }
  return { sent, skipped, failed, matched: todaysBirthdays.length }
}

// Called by Vercel cron (GET with Authorization: Bearer {CRON_SECRET})
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('Birthday email cron: CRON_SECRET is not set — endpoint is disabled for safety')
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await sendBirthdayEmails()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Birthday email cron failed:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Called manually from the admin panel (POST, admin-only) — for testing / an
// on-demand run, or as a same-day retry if the scheduled run failed for
// someone. Only emails people whose birthday is TODAY (Montreal-local) and
// still respects the per-year idempotency log, so running this twice in a
// row won't double-send.
export async function POST() {
  try {
    const user = await requireAdmin()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await sendBirthdayEmails()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Birthday email cron error:', err.message)
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
