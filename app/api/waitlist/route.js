import { captureException, captureMessage } from '../../../lib/sentry.js'
import { deviceType } from '../../../lib/deviceType'
import { checkRateLimit } from '../../../lib/rateLimit.js'
import { createAdminClient } from '../../../lib/supabase/admin'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function customerHtml(firstName) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application received &#8212; Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Application</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">We&apos;ve got your application, ${firstName}.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Thank you for applying to Canvas Routes. We review every application personally and will be in touch directly.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;margin-bottom:8px;">What&apos;s next</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#555;">Expect a personal email from our team. To make sure it reaches you, add <a href="mailto:info@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">info@canvasroutes.com</a> to your contacts now.</div>
          </td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border:0.5px solid rgba(0,0,0,0.18);">
            <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;text-decoration:none;">&#64;canvasroutes &rarr;</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#0F1E14;padding:16px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);">&copy; 2026 Canvas Routes. Montreal, QC.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function customerText(firstName) {
  return `We've got your application, ${firstName}.

Thank you for applying to Canvas Routes. We've received your application and will review it shortly — once we do, expect a personal email from our team.

To make sure our reply reaches your inbox, add jerry@canvasroutes.com to your contacts. In the meantime, follow us on Instagram to stay up to date on everything happening with Canvas Routes:
https://www.instagram.com/canvasroutes

If this email landed in your spam folder, please move it to your inbox and mark it as Not Spam — so you don't miss our reply.

© 2026 Canvas Routes. Montreal, QC.`
}

function notifyHtml({ registerFor, name, email, year, carModel, dob_month, dob_day, dob_year, phone, instagram, more, source, downtown_cruise, ref }) {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dobStr = dob_month ? `${MONTHS[Number(dob_month)-1]} ${dob_day}${dob_year ? `, ${dob_year}` : ''}` : ''
  const row = (label, value) => value
    ? `<tr><td width="140" style="width:140px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>New application</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">
              New application received
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${row('Registering for', registerFor ? `<strong>${h(registerFor)}</strong>` : '')}
                ${row('Full name', `<strong>${h(name)}</strong>`)}
                ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
                ${row('Year', h(year))}
                ${row('Make & Model', h(carModel))}
                ${row('Date of Birth', dobStr ? h(dobStr) : '')}
                ${row('Phone', phone ? h(phone) : '')}
                ${row('Instagram', instagram ? h(instagram) : '')}
                ${row('Downtown cruise', downtown_cruise === 'yes' ? 'Yes' : downtown_cruise === 'no' ? 'No' : '')}
                ${row('Tell us more', more ? h(more) : '')}
                ${row('How they heard', source ? h(source) : '')}
                ${row('Referred by', ref ? `<strong>${h(ref)}</strong>` : '')}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { registerFor, name, email, year, carModel, dob_month, dob_day, dob_year, more, phone, instagram, source, downtown_cruise, ref, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2 || !email?.trim() || !year?.trim() || !carModel?.trim()) {
    return Response.json({ error: 'Name, email, year, and car model are required' }, { status: 400 })
  }
  if (!dob_month || !dob_day) {
    return Response.json({ error: 'Date of birth month and day are required' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (name.length > 100) return Response.json({ error: 'Name too long' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long' }, { status: 400 })
  if (year && year.length > 10) return Response.json({ error: 'Year too long' }, { status: 400 })
  if (carModel && carModel.length > 100) return Response.json({ error: 'Car model too long' }, { status: 400 })
  if (phone && (phone.length > 30 || phone.replace(/\D/g, '').length < (phone.trim().startsWith('+1') ? 10 : 7))) return Response.json({ error: 'Invalid phone number' }, { status: 400 })
  if (instagram && instagram.length > 50) return Response.json({ error: 'Instagram handle too long' }, { status: 400 })
  if (more && more.length > 500) return Response.json({ error: 'Message too long' }, { status: 400 })

  const VALID_REGISTER_FOR = ['Canvas Routes Membership']
  const VALID_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']
  if (!registerFor || !VALID_REGISTER_FOR.includes(registerFor)) {
    return Response.json({ error: 'Invalid registration type' }, { status: 400 })
  }
  if (!source || !VALID_SOURCES.includes(source)) {
    return Response.json({ error: 'Invalid source' }, { status: 400 })
  }

  const firstName = h(name.trim().split(' ')[0])
  const rawFirstName = name.trim().split(' ')[0]

  // STEP 1 — Write to DB first so data is never lost even if email fails
  try {
    const supabase = createAdminClient()
    const normalEmail = email.toLowerCase().trim()
    const isEventReg = registerFor !== 'Canvas Routes Membership'
    const newReg = isEventReg ? { event: registerFor, registered_at: new Date().toISOString(), attended: null } : null

    const { data: existing } = await supabase
      .from('applications')
      .select('registrations')
      .eq('email', normalEmail)
      .maybeSingle()

    const isReRegistration = !!existing

    const CANONICAL_EVENTS = [
      'Cars & Coffee — May 9, 2026',
      'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
      'Into the Laurentians — June 7, 2026',
    ]
    const NAME_ALIASES = {
      'Grand Prix Weekend Cars & Coffee — May 23, 2026': 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
      'Into the Laurentians — May 31, 2026': 'Into the Laurentians — June 7, 2026',
    }
    const prevRegs = (existing?.registrations || [])
      .map(r => NAME_ALIASES[r.event] ? { ...r, event: NAME_ALIASES[r.event] } : r)
      .filter(r => r.event !== 'Canvas Routes Membership' && r.event !== registerFor)
    const existingEventNames = new Set(prevRegs.map(r => r.event))
    const missingCanonical = CANONICAL_EVENTS
      .filter(ev => !existingEventNames.has(ev) && ev !== registerFor)
      .map(ev => ({ event: ev, registered_at: null, attended: null }))
    const registrations = [...prevRegs, ...missingCanonical, ...(newReg ? [newReg] : [])]

    await supabase.from('applications').upsert({
      device_type: deviceType(request),
      email: normalEmail,
      name: name.trim(),
      car_year: year.trim(),
      car_model: carModel.trim(),
      dob_month: dob_month ? parseInt(dob_month) : null,
      dob_day: dob_day ? parseInt(dob_day) : null,
      dob_year: dob_year ? parseInt(dob_year) : null,
      phone: phone || null,
      instagram: instagram || null,
      more: more || null,
      source: source || null,
      referred_by: ref || null,
      registrations,
      ...(isReRegistration ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' })
  } catch (e) {
    console.error('Failed to store application:', e.message)
    captureException(e, { context: 'waitlist-db-save', email: email.toLowerCase().trim() })
  }

  // STEP 2 — Customer confirmation email
  let customerEmail
  try {
    customerEmail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        reply_to: 'info@canvasroutes.com',
        subject: 'Application received — Canvas Routes',
        html: customerHtml(firstName),
        text: customerText(rawFirstName),
      }),
    })
  } catch (err) {
    console.error('Customer email network error:', err)
    captureException(err, { context: 'waitlist-confirm-email-network', email })
    // DB save succeeded — return success so the user isn't prompted to resubmit
    return Response.json({ success: true })
  }

  if (!customerEmail.ok) {
    const err = await customerEmail.text().catch(() => 'unknown')
    console.error('Customer email error:', err)
    captureMessage(`Waitlist confirm email failed — ${email}`, { response: err })
    return Response.json({ success: true })
  }

  // STEP 3 — Internal notification (with one retry)
  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <info@canvasroutes.com>',
    to: 'info@canvasroutes.com',
    subject: `New Application — ${year.trim()} ${carModel.trim()} — ${name.trim()}`,
    html: notifyHtml({ registerFor, name, email, year, carModel, dob_month, dob_day, dob_year, phone, instagram, more, source, downtown_cruise, ref }),
    text: `New application\n\nRegistering for: ${registerFor}\nName: ${name}\nEmail: ${email}\nYear: ${year}\nMake & Model: ${carModel}${dob_month ? `\nDate of Birth: ${['January','February','March','April','May','June','July','August','September','October','November','December'][Number(dob_month)-1]} ${dob_day}${dob_year ? `, ${dob_year}` : ''}` : ''}${phone ? `\nPhone: ${phone}` : ''}${instagram ? `\nInstagram: ${instagram}` : ''}${more ? `\nMore: ${more}` : ''}\nSource: ${source}${downtown_cruise ? `\nDowntown cruise: ${downtown_cruise === 'yes' ? 'Yes' : 'No'}` : ''}${ref ? `\nReferred by: ${ref}` : ''}`,
  })

  let notifyOk = false
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const notifyEmail = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: notifyBody,
      })
      if (notifyEmail.ok) { notifyOk = true; break }
      const err = await notifyEmail.text().catch(() => 'unknown')
      console.error(`Notify email attempt ${attempt + 1} failed:`, err)
    } catch (err) {
      console.error(`Notify email attempt ${attempt + 1} network error:`, err)
    }
  }
  if (!notifyOk) {
    console.error(`ALERT: Notify email failed after retry — application from: ${email}`)
    captureMessage(`Waitlist notify email failed — ${email}`, { name, email, year, carModel })
  }

  return Response.json({ success: true })
}
