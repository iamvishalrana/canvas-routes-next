import { checkRateLimit } from '../../../lib/rateLimit.js'
import { captureException } from '../../../lib/sentry.js'
import { createAdminClient } from '../../../lib/supabase/admin'

const EVENT_NAME = 'Cars, Coffee & Dad Jokes — June 20, 2026'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function confirmHtml(firstName) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration received — Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="padding:48px 40px 20px;">

        <p style="margin:0 0 1.4em 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">
          Hi ${h(firstName)},
        </p>
        <p style="margin:0 0 1.4em 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">
          We've received your registration for <strong style="color:#1a1a1a;">Cars, Coffee &amp; Dad Jokes</strong> — our Father's Day Weekend Special on June 20 at Cafe Napoleon in LaSalle.
        </p>
        <p style="margin:0 0 1.4em 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">
          Entry is invite-only, so we'll review your registration and follow up with confirmation details. Expect a personal email from us before the event.
        </p>
        <p style="margin:0 0 1.4em 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">
          In the meantime, add <a href="mailto:info@canvasroutes.com" style="color:#8A6535;text-decoration:none;">info@canvasroutes.com</a> to your contacts so our follow-up doesn't end up in spam.
        </p>
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">
          See you on June 20,<br/>Jerry<br/>Canvas Routes
        </p>

      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px 40px;border-top:0.5px solid rgba(0,0,0,0.08);">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#bbb;line-height:1.6;">
          Canvas Routes &nbsp;&middot;&nbsp; Montreal, QC &nbsp;&middot;&nbsp;
          <a href="mailto:info@canvasroutes.com" style="color:#bbb;">info@canvasroutes.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function notifyHtml({ name, email, year, carModel, phone, instagram, source }) {
  const row = (label, value) => value
    ? `<tr><td width="140" style="width:140px;padding:8px 12px 8px 0;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:32px 16px;background:#fff;font-family:Arial,sans-serif;">
  <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 20px;">New CCD Registration</p>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">
    ${row('Event', `<strong>${h(EVENT_NAME)}</strong>`)}
    ${row('Name', `<strong>${h(name)}</strong>`)}
    ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
    ${row('Car', h(`${year} ${carModel}`.trim()))}
    ${row('Phone', phone ? h(phone) : '')}
    ${row('Instagram', instagram ? h(instagram) : '')}
    ${row('Source', source ? h(source) : '')}
  </table>
</body></html>`
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { name, email, year, carMake, carModel, phone, instagram, source, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Full name is required.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  if (!year?.trim())
    return Response.json({ error: 'Car year is required.' }, { status: 400 })
  if (!carModel?.trim())
    return Response.json({ error: 'Car make and model are required.' }, { status: 400 })
  if (!source?.trim())
    return Response.json({ error: 'Please tell us how you heard about us.' }, { status: 400 })

  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (carModel.length > 100) return Response.json({ error: 'Car model too long.' }, { status: 400 })

  const fullCarModel = [carMake, carModel].filter(Boolean).join(' ')
  const normalEmail = email.toLowerCase().trim()
  const firstName = name.trim().split(' ')[0]

  // Save to DB — upsert so duplicate emails update rather than error
  try {
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('applications')
      .select('registrations')
      .eq('email', normalEmail)
      .maybeSingle()

    const newReg = { event: EVENT_NAME, registered_at: new Date().toISOString(), attended: null }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== EVENT_NAME)
    const registrations = [...prevRegs, newReg]

    await supabase.from('applications').upsert({
      email: normalEmail,
      name: name.trim(),
      car_year: year.trim(),
      car_model: fullCarModel,
      phone: phone || null,
      instagram: instagram ? instagram.trim().replace(/^@+/, '') : null,
      source: source || null,
      registrations,
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' })
  } catch (e) {
    captureException(e, { context: 'ccd-register-db', email: normalEmail })
    // Don't block the user — emails may still go out
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ success: true })
  }

  // Confirmation email to registrant
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        reply_to: 'info@canvasroutes.com',
        subject: "You're registered — Cars, Coffee & Dad Jokes · June 20",
        html: confirmHtml(firstName),
      }),
    })
  } catch (e) {
    captureException(e, { context: 'ccd-confirm-email', email })
  }

  // Internal notification
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `CCD Registration — ${year?.trim()} ${fullCarModel} — ${name.trim()}`,
        html: notifyHtml({ name, email, year, carModel: fullCarModel, phone, instagram, source }),
      }),
    })
  } catch (e) {
    captureException(e, { context: 'ccd-notify-email', email })
  }

  return Response.json({ success: true })
}
