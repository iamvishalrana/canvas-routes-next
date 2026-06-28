import { captureException, captureMessage } from '../../../lib/sentry.js'
import { checkRateLimit } from '../../../lib/rateLimit.js'
import { createAdminClient } from '../../../lib/supabase/admin.js'

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
  <title>Registration received &#8212; Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Route</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">You&apos;re registered, ${firstName}.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">We&apos;ve received your registration for Into the Laurentians &mdash; First Route.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Event</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;margin-bottom:14px;">Into the Laurentians &mdash; June 7, 2026</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;border-top:1px solid rgba(0,0,0,0.06);padding-top:14px;">Payment</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555;">We&apos;ll be in touch shortly with payment details. $200 per car.</div>
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
  return `You're registered, ${firstName}.

We've received your registration for Into the Laurentians — First Route.

Payment — $200 per car
We'll be in touch with payment details shortly.

Once payment is received, we'll confirm your spot and send event details closer to the date.

Follow us on Instagram: https://www.instagram.com/canvasroutes

© 2026 Canvas Routes. Montreal, QC.`
}

function formatDob(dob) {
  if (!dob) return ''
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const [yr, mo, dy] = dob.split('-')
  const month = MONTHS[parseInt(mo, 10) - 1] || ''
  const day = parseInt(dy, 10)
  return yr === '0000' ? `${month} ${day}` : `${month} ${day}, ${yr}`
}

function notifyHtml({ name, email, phone, dob, year, carModel, passengers, hasChildren, childrenAges, source, more }) {
  const row = (label, value) => value
    ? `<tr><td width="160" style="width:160px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  const childrenDisplay = hasChildren === 'yes'
    ? `Yes — ages: ${h(childrenAges || 'not provided')}`
    : 'No'
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Road Trip Registration</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">
              Into the Laurentians Registration
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${row('Full name', `<strong>${h(name)}</strong>`)}
                ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
                ${row('Phone', h(phone))}
                ${row('Date of birth', h(formatDob(dob)))}
                ${row('Year', h(year))}
                ${row('Make & Model', h(carModel))}
                ${row('Passengers', h(passengers))}
                ${row('Children', childrenDisplay)}
                ${row('How they heard', h(source))}
                ${row('Tell us more', more ? h(more) : '')}
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

  const ROUTES_CLOSED = new Date('2026-06-07T03:00:00Z').getTime()
  if (Date.now() >= ROUTES_CLOSED) {
    return Response.json({ error: 'Registration is now closed.' }, { status: 410 })
  }

  const { name, email, phone, dob, year, carModel, passengers, hasChildren, childrenAges, source, more, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2 || !email?.trim() || !year?.trim() || !carModel?.trim() || !dob?.trim()) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || (dob.slice(0, 4) !== '0000' && isNaN(Date.parse(dob)))) {
    return Response.json({ error: 'Invalid date of birth.' }, { status: 400 })
  }
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address.' }, { status: 400 })
  }
  if (!passengers || !['1','2','3','4+'].includes(passengers)) {
    return Response.json({ error: 'Please select number of passengers.' }, { status: 400 })
  }
  if (!hasChildren || !['yes','no'].includes(hasChildren)) {
    return Response.json({ error: 'Please answer the children question.' }, { status: 400 })
  }
  if (hasChildren === 'yes' && !childrenAges?.trim()) {
    return Response.json({ error: 'Please enter the ages of children attending.' }, { status: 400 })
  }
  if (!source || !['Instagram','Facebook','Friend / Word of mouth','Google','Other'].includes(source)) {
    return Response.json({ error: 'Please select how you heard about us.' }, { status: 400 })
  }
  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (carModel.length > 150) return Response.json({ error: 'Car model too long.' }, { status: 400 })
  if (more && more.length > 500) return Response.json({ error: 'Message too long.' }, { status: 400 })

  const firstName = h(name.trim().split(' ')[0])
  const rawFirstName = name.trim().split(' ')[0]
  const normalEmail = email.toLowerCase().trim()

  // Save to DB first so data is never lost if email sending fails
  try {
    const supabase = createAdminClient()
    const ITL_EVENT = 'Into the Laurentians — June 7, 2026'
    const CANONICAL_EVENTS_LIST = [
      'Cars & Coffee — May 9, 2026',
      'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
      ITL_EVENT,
    ]
    const newReg = { event: ITL_EVENT, registered_at: new Date().toISOString(), attended: null }
    const { data: existing } = await supabase
      .from('applications')
      .select('registrations')
      .eq('email', normalEmail)
      .maybeSingle()
    const isReRegistration = !!existing
    const NAME_ALIASES = {
      'Grand Prix Weekend Cars & Coffee — May 23, 2026': 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
      'Into the Laurentians — May 31, 2026': ITL_EVENT,
    }
    const prevRegs = (existing?.registrations || [])
      .map(r => NAME_ALIASES[r.event] ? { ...r, event: NAME_ALIASES[r.event] } : r)
      .filter(r => r.event !== ITL_EVENT)
    const existingEventNames = new Set(prevRegs.map(r => r.event))
    const missingCanonical = CANONICAL_EVENTS_LIST
      .filter(ev => !existingEventNames.has(ev) && ev !== ITL_EVENT)
      .map(ev => ({ event: ev, registered_at: null, attended: null }))
    const registrations = [...prevRegs, ...missingCanonical, newReg]
    await supabase.from('applications').upsert({
      email: normalEmail,
      name: name.trim(),
      dob: dob || null,
      car_year: year.trim(),
      car_model: carModel.trim(),
      phone: phone || null,
      source: source || null,
      more: more || null,
      passengers: passengers || null,
      has_children: hasChildren || null,
      children_ages: hasChildren === 'yes' ? (childrenAges || null) : null,
      registrations,
      ...(isReRegistration ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' })
  } catch (e) {
    console.error('Failed to store route registration:', e.message)
    captureException(e, { context: 'routes-db-save', email: normalEmail })
  }

  // EMAIL 1 — Customer confirmation
  let customerEmail
  try {
    customerEmail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        reply_to: 'info@canvasroutes.com',
        subject: 'Registration received — Into the Laurentians',
        html: customerHtml(firstName),
        text: customerText(rawFirstName),
      }),
    })
  } catch (err) {
    console.error(`ALERT: Routes confirm email network error — registration from: ${normalEmail} — ${err}`)
    captureException(err, { context: 'routes-confirm-email-network', email: normalEmail })
  }

  if (customerEmail && !customerEmail.ok) {
    const errText = await customerEmail.text().catch(() => 'unknown')
    console.error(`ALERT: Routes confirm email failed — registration from: ${normalEmail} — ${errText}`)
    captureMessage(`Routes confirm email failed — ${normalEmail}`, { response: errText })
  }

  // EMAIL 2 — Internal notification
  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <info@canvasroutes.com>',
    to: 'info@canvasroutes.com',
    subject: `Laurentians Registration — ${year} ${carModel} — ${name.trim()}`,
    html: notifyHtml({ name, email, phone, dob, year, carModel, passengers, hasChildren, childrenAges, source, more }),
    text: `Laurentians Registration\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nDate of birth: ${formatDob(dob)}\nYear: ${year}\nMake & Model: ${carModel}\nPassengers: ${passengers}\nChildren: ${hasChildren === 'yes' ? `Yes — ${childrenAges}` : 'No'}\nHow they heard: ${source}${more ? `\nTell us more: ${more}` : ''}`,
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
    console.error(`ALERT: Notify email failed after retry — registration from: ${email}`)
    captureMessage(`Routes notify email failed — ${email}`, { name, email, year, carModel })
  }

  return Response.json({ success: true })
}
