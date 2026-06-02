import * as Sentry from '@sentry/nextjs'
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
<body style="margin:0;padding:0;background-color:#0F1E14;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1E14;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="200" style="display:block;width:200px;height:auto;border:0;outline:0;" />
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr></table>
            </td>
          </tr>

          <!-- Eyebrow -->
          <tr>
            <td style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">
              Canvas Routes &middot; Application
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">
              We&apos;ve got your application, ${firstName}.
            </td>
          </tr>

          <!-- Subtext -->
          <tr>
            <td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.72);">
              Thank you for applying to Canvas Routes. We review every application personally and will be in touch directly.
            </td>
          </tr>

          <!-- Dark card -->
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(197,168,130,0.08);border:0.5px solid rgba(197,168,130,0.2);">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:10px;">What&apos;s next</div>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#F5F1EC;">Expect a personal email from our team. To make sure it reaches you, add info@canvasroutes.com to your contacts now.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Instagram button -->
          <tr>
            <td style="padding-bottom:40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border:1px solid rgba(197,168,130,0.4);">
                    <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;">&#64;canvasroutes &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;border-top:1px solid rgba(197,168,130,0.15);font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.35);">
              &copy; 2026 Canvas Routes. Montreal, QC.
            </td>
          </tr>

        </table>
      </td>
    </tr>
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
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long' }, { status: 400 })
  if (instagram && instagram.length > 50) return Response.json({ error: 'Instagram handle too long' }, { status: 400 })
  if (more && more.length > 500) return Response.json({ error: 'Message too long' }, { status: 400 })

  const VALID_REGISTER_FOR = ['Canvas Routes Membership', 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026']
  const VALID_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']
  if (!registerFor || !VALID_REGISTER_FOR.includes(registerFor)) {
    return Response.json({ error: 'Invalid registration type' }, { status: 400 })
  }
  if (!source || !VALID_SOURCES.includes(source)) {
    return Response.json({ error: 'Invalid source' }, { status: 400 })
  }
  const GPCC = 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026'
  if (registerFor === GPCC && (!downtown_cruise || !['yes', 'no'].includes(downtown_cruise))) {
    return Response.json({ error: 'Please answer the downtown cruise question.' }, { status: 400 })
  }

  const firstName = h(name.trim().split(' ')[0])
  const rawFirstName = name.trim().split(' ')[0]
  // EMAIL 1 — Customer confirmation
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
    return Response.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }

  if (!customerEmail.ok) {
    const err = await customerEmail.text().catch(() => 'unknown')
    console.error('Customer email error:', err)
    return Response.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }

  // EMAIL 2 — Internal notification (with one retry)
  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <info@canvasroutes.com>',
    to: 'info@canvasroutes.com',
    subject: `New Application — ${year.trim()} ${carModel.trim()} — ${name.trim()}`,
    html: notifyHtml({ registerFor, name, email, year, carModel, dob_month, dob_day, dob_year, phone, instagram, more, source, downtown_cruise, ref }),
    text: `New application\n\nRegistering for: ${registerFor}\nName: ${name}\nEmail: ${email}\nYear: ${year}\nMake & Model: ${carModel}${dob_month ? `\nDate of Birth: ${dob_month}/${dob_day}${dob_year ? `/${dob_year}` : ''}` : ''}${phone ? `\nPhone: ${phone}` : ''}${instagram ? `\nInstagram: ${instagram}` : ''}${more ? `\nMore: ${more}` : ''}\nSource: ${source}${downtown_cruise ? `\nDowntown cruise: ${downtown_cruise === 'yes' ? 'Yes' : 'No'}` : ''}${ref ? `\nReferred by: ${ref}` : ''}`,
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
    Sentry.captureMessage(`Waitlist notify email failed — ${email}`, { level: 'error', extra: { name, email, year, carModel } })
  }

  // Store application data so admin can auto-populate member records
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
    Sentry.captureException(e, { extra: { context: 'waitlist-db-save', email: email.toLowerCase().trim() } })
  }

  return Response.json({ success: true })
}
