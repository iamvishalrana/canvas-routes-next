import { captureException, captureMessage } from '../../../lib/sentry.js'
import { checkRateLimit } from '../../../lib/rateLimit.js'
import { createAdminClient } from '../../../lib/supabase/admin'

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
  <title>Membership interest received — Canvas Routes</title>
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
              Canvas Routes &middot; 2026 Season
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">
              We&apos;ve got you, ${firstName}.
            </td>
          </tr>

          <!-- Subtext -->
          <tr>
            <td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.72);">
              Your membership interest has been received. We review every application personally &mdash; you&apos;ll hear from us before memberships open to the public.
            </td>
          </tr>

          <!-- Dark card -->
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(197,168,130,0.08);border:0.5px solid rgba(197,168,130,0.2);">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <!-- Season row -->
                      <tr>
                        <td style="padding-bottom:16px;">
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Season</div>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">June &mdash; November 2026</div>
                        </td>
                      </tr>
                      <!-- Spots row -->
                      <tr>
                        <td>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Spots</div>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">Limited. Every application reviewed personally.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Instagram button -->
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border:1px solid rgba(197,168,130,0.4);">
                    <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;">&#64;canvasroutes &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Refund note -->
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.72);">
              Should your application not be accepted following our review, your payment will be refunded in full. No questions asked.
            </td>
          </tr>

          <!-- Referral note -->
          <tr>
            <td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.72);">
              If you were referred by an existing Canvas Routes member, this will be taken into account and prioritized during our review.
            </td>
          </tr>

          <!-- Contact note -->
          <tr>
            <td style="padding-bottom:40px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:rgba(245,241,236,0.4);">
              To make sure our reply reaches you, add <a href="mailto:info@canvasroutes.com" style="color:rgba(245,241,236,0.4);">info@canvasroutes.com</a> to your contacts.
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

function notifyHtml({ name, email, phone, dob_month, dob_day, dob_year, year, carModel, tier, source, more, referredBy }) {
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dobStr = dob_month ? `${MONTHS_SHORT[parseInt(dob_month) - 1]} ${dob_day}${dob_year ? `, ${dob_year}` : ''}` : null
  const row = (label, value) => value
    ? `<tr><td width="160" style="width:160px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Membership Registration</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr><td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">Membership Registration</td></tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${row('Full name', `<strong>${h(name)}</strong>`)}
                ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
                ${row('Phone', phone ? h(phone) : '—')}
                ${row('Date of birth', dobStr ? h(dobStr) : '')}
                ${row('Year', h(year))}
                ${row('Car', h(carModel))}
                ${row('Tier', h(tier))}
                ${row('How they heard', h(source))}
                ${row('Referred by', referredBy ? h(referredBy) : '')}
                ${row('Message', more ? h(more) : '')}
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

  const { name, email, phone, dob_month, dob_day, dob_year, year, carMake, carModel, carPaint, tier, source, more, referredBy, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Please enter your full name.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!year?.trim())
    return Response.json({ error: 'Please enter your car year.' }, { status: 400 })
  if (!carMake?.trim())
    return Response.json({ error: 'Please select your car make.' }, { status: 400 })
  if (!tier || !['Routes Member', 'Inner Circle'].includes(tier))
    return Response.json({ error: 'Please select a membership tier.' }, { status: 400 })
  if (!source || !['Instagram','Facebook','Friend / Word of mouth','Google','Other','Member referral'].includes(source))
    return Response.json({ error: 'Please select how you heard about us.' }, { status: 400 })
  if (!carModel?.trim()) return Response.json({ error: 'Please enter your car model.' }, { status: 400 })
  if (!dob_month || !dob_day) return Response.json({ error: 'Date of birth is required.' }, { status: 400 })
  if (phone && phone.replace(/\D/g, '').length < 6) return Response.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long.' }, { status: 400 })
  if (more && more.length > 500) return Response.json({ error: 'Message too long.' }, { status: 400 })

  const firstName = h(name.trim().split(' ')[0])
  const fullCar = [carMake, carModel].filter(Boolean).join(' ')
  const normalEmail = email.toLowerCase().trim()

  // Save to DB first so data is never lost if email sending fails
  try {
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('applications')
      .select('registrations')
      .eq('email', normalEmail)
      .maybeSingle()

    const membershipReg = { event: 'Canvas Routes Membership', tier, registered_at: new Date().toISOString(), attended: null }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== 'Canvas Routes Membership')
    const registrations = [...prevRegs, membershipReg]

    await supabase.from('applications').upsert({
      email: normalEmail,
      name: name.trim(),
      car_year: year.trim(),
      car_model: fullCar || carMake,
      car_paint: carPaint?.trim() || null,
      phone: phone || null,
      dob_month: dob_month ? parseInt(dob_month) : null,
      dob_day: dob_day ? parseInt(dob_day) : null,
      dob_year: dob_year ? parseInt(dob_year) : null,
      source: source || null,
      more: more || null,
      referred_by: referredBy?.trim() || null,
      registrations,
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' })
  } catch (e) {
    console.error('Failed to store membership application:', e.message)
    captureException(e, { context: 'membership-waitlist-db-save', email: normalEmail })
  }

  // Confirmation email to applicant
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        reply_to: 'info@canvasroutes.com',
        subject: 'Membership interest received — Canvas Routes',
        html: confirmHtml(firstName),
        text: `We've got you, ${name.trim().split(' ')[0]}.\n\nYour membership interest has been received. We'll be in touch once memberships open for the 2026 season.\n\nSpots are limited — we'll reach out before we open to the public.\n\n© 2026 Canvas Routes. Montreal, QC.`,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      console.error(`ALERT: Membership confirm email failed — application from: ${normalEmail} — ${errText}`)
      captureMessage(`Membership confirm email failed — ${normalEmail}`, { response: errText })
    }
  } catch (err) {
    console.error(`ALERT: Membership confirm email network error — application from: ${normalEmail} — ${err}`)
    captureException(err, { context: 'membership-confirm-email-network', email: normalEmail })
  }

  // Notification email to admin
  try {
    const notifyRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `Membership Registration — ${tier} — ${name.trim()}`,
        html: notifyHtml({ name, email, phone, dob_month, dob_day, dob_year, year, carModel: fullCar, tier, source, more, referredBy }),
        text: `Membership Registration\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}\nDOB: ${dob_month ? `${dob_month}/${dob_day}${dob_year ? `/${dob_year}` : ''}` : '—'}\nYear: ${year}\nCar: ${fullCar}\nTier: ${tier}\nHow they heard: ${source}${more ? `\nMessage: ${more}` : ''}`,
      }),
    })
    if (!notifyRes.ok) {
      const errText = await notifyRes.text().catch(() => 'unknown')
      console.error('Membership notify email failed:', errText)
      captureMessage(`Membership notify email failed — ${normalEmail}`, { name, email, tier })
    }
  } catch (err) {
    console.error('Membership notify email error:', err)
    captureException(err, { context: 'membership-notify-email-network', email: normalEmail })
  }

  return Response.json({ success: true })
}
