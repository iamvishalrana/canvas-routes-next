import { checkRateLimit } from '../../../lib/rateLimit.js'
import { deviceType } from '../../../lib/deviceType'
import { captureException } from '../../../lib/sentry.js'
import { createAdminClient } from '../../../lib/supabase/admin'

const EVENT_NAME = 'Cars, Coffee & Dad Jokes — June 20, 2026'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function confirmHtml(firstName, { year, carMake, carModel }) {
  const car = [year, carMake, carModel].filter(Boolean).join(' ')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration received — Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

        <!-- ── Header ─────────────────────────────────────────── -->
        <tr>
          <td style="background:#0F1E14;padding:36px 40px 32px;">
            <img src="https://canvasroutes.com/logo-white.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:28px;opacity:0.92;" />
            <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#c5a882;">Father&rsquo;s Day Weekend &middot; June 20</p>
            <h1 style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#F5F1EC;line-height:1.15;">Cars, Coffee<br/>&amp; Dad Jokes</h1>
            <!-- Event detail chips -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:24px;vertical-align:top;">
                  <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(197,168,130,0.55);">Time</p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(245,241,236,0.8);">9:00 – 11:30 AM</p>
                </td>
                <td style="padding-right:24px;padding-left:24px;border-left:1px solid rgba(197,168,130,0.18);vertical-align:top;">
                  <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(197,168,130,0.55);">Venue</p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(245,241,236,0.8);">Cafe Napoleon, LaSalle</p>
                </td>
                <td style="padding-left:24px;border-left:1px solid rgba(197,168,130,0.18);vertical-align:top;">
                  <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:rgba(197,168,130,0.55);">Entry</p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(245,241,236,0.8);">Invite only &middot; Free</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Body ──────────────────────────────────────────── -->
        <tr>
          <td style="background:#ffffff;padding:40px 40px 36px;">
            <p style="margin:0 0 1.3em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">Hi ${h(firstName)},</p>
            <p style="margin:0 0 1.3em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">We&rsquo;ve received your registration. Entry is invite-only, so we&rsquo;ll review your details and follow up with confirmation before the event.</p>

            ${car ? `<!-- Car card -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 1.5em;background:#F5F1EC;border-left:3px solid #c5a882;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Your car</p>
                  <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:400;color:#1a1a1a;">${h(car)}</p>
                </td>
              </tr>
            </table>` : ''}

            <p style="margin:0 0 1.3em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">Add <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:underline;text-underline-offset:3px;">jerry@canvasroutes.com</a> to your contacts so our follow-up doesn&rsquo;t land in spam.</p>
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">See you on June 20,<br/>Jerry<br/>Canvas Routes</p>
          </td>
        </tr>

        <!-- ── Founding offer ─────────────────────────────────── -->
        <tr>
          <td style="background:#0F1E14;padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Founding Member Offer</p>
            <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.75;color:rgba(245,241,236,0.7);">As a thank-you for coming out, use code <strong style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#F5F1EC;font-weight:600;">FOUNDING</strong> when you apply for a Canvas Routes membership for a special discount.</p>
            <a href="https://canvasroutes.com/membership" style="display:inline-block;background:#c5a882;color:#0F1E14;padding:11px 26px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:700;">Apply for Membership &rarr;</a>
          </td>
        </tr>

        <!-- ── Footer ─────────────────────────────────────────── -->
        <tr>
          <td style="background:#EDE8E1;padding:18px 40px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaa;line-height:1.6;">
              Canvas Routes &nbsp;&middot;&nbsp; Montreal, QC &nbsp;&middot;&nbsp;
              <a href="mailto:info@canvasroutes.com" style="color:#aaa;text-decoration:none;">info@canvasroutes.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function notifyHtml({ name, email, year, carMake, carModel, phone, instagram, more, source }) {
  const row = (label, value) => value
    ? `<tr><td width="140" style="width:140px;padding:8px 12px 8px 0;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  const fullCar = [year, carMake, carModel].filter(Boolean).join(' ')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:32px 16px;background:#fff;font-family:Arial,sans-serif;">
  <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 20px;">New CCD Registration</p>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">
    ${row('Event', `<strong>${h(EVENT_NAME)}</strong>`)}
    ${row('Name', `<strong>${h(name)}</strong>`)}
    ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
    ${row('Car', h(fullCar))}
    ${row('Phone', phone ? h(phone) : '')}
    ${row('Instagram', instagram ? h(instagram) : '')}
    ${row('About', more ? h(more) : '')}
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

  const { name, email, year, carMake, carModel, phone, instagram, more, source, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Full name is required.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  if (!year?.trim())
    return Response.json({ error: 'Car year is required.' }, { status: 400 })
  if (!carMake?.trim())
    return Response.json({ error: 'Car make is required.' }, { status: 400 })
  if (!carModel?.trim())
    return Response.json({ error: 'Car model is required.' }, { status: 400 })
  const VALID_SOURCES = ['Instagram','Facebook','Friend / Word of mouth','Google','Other']
  if (!source || !VALID_SOURCES.includes(source))
    return Response.json({ error: 'Please tell us how you heard about us.' }, { status: 400 })

  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (carModel.length > 100) return Response.json({ error: 'Car model too long.' }, { status: 400 })

  const fullCarModel = [carMake, carModel].filter(Boolean).join(' ')
  const normalEmail = email.toLowerCase().trim()
  const firstName = name.trim().split(' ')[0]

  // Save to DB — skip silently if Supabase env vars are absent (local dev without .env.local)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) try {
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('applications')
      .select('id, registrations')
      .eq('email', normalEmail)
      .maybeSingle()

    // Preserve admin-set attended flag if re-registering
    const existingReg = (existing?.registrations || []).find(r => r.event === EVENT_NAME)
    const newReg = {
      event: EVENT_NAME,
      registered_at: existingReg?.registered_at || new Date().toISOString(),
      attended: existingReg?.attended ?? null,
    }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== EVENT_NAME)
    const registrations = [...prevRegs, newReg]

    const { data: appData, error: upsertErr } = await supabase.from('applications').upsert({
      device_type: deviceType(request),
      email: normalEmail,
      name: name.trim(),
      car_year: year.trim(),
      car_make: carMake?.trim() || null,
      car_model: fullCarModel,
      phone: phone || null,
      instagram: instagram ? instagram.trim().replace(/^@+/, '') : null,
      more: more || null,
      source: source || null,
      registrations,
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (upsertErr) {
      captureException(upsertErr, { context: 'ccd-register-db-upsert', email: normalEmail })
    } else if (appData?.id) {
      // Ensure a contacts record exists so this registrant appears in the admin event registrants panel
      const { error: contactErr } = await supabase.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      )
      if (contactErr) captureException(contactErr, { context: 'ccd-register-contacts', email: normalEmail })
    }
  } catch (e) {
    captureException(e, { context: 'ccd-register-db', email: normalEmail })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ success: true })
  }

  const receiptData = { year: year?.trim(), carMake: carMake?.trim(), carModel: carModel?.trim() }

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
        html: confirmHtml(firstName, receiptData),
        text: `Hi ${firstName},\n\nWe've received your registration for Cars, Coffee & Dad Jokes — our Father's Day Weekend Special on June 20 at Cafe Napoleon in LaSalle.\n\nEntry is invite-only, so we'll review your registration and follow up with confirmation details. Expect a personal email from us before the event.\n\nAdd jerry@canvasroutes.com to your contacts so our follow-up doesn't end up in spam.\n\nSee you on June 20,\nJerry\nCanvas Routes`,
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
        html: notifyHtml({ name, email, year, carMake, carModel, phone, instagram, more, source }),
      }),
    })
  } catch (e) {
    captureException(e, { context: 'ccd-notify-email', email })
  }

  return Response.json({ success: true })
}
