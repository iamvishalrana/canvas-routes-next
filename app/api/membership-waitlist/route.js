import { captureException, captureMessage } from '../../../lib/sentry.js'
import { checkRateLimit } from '../../../lib/rateLimit.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { PRICES } from '../../../lib/prices.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function confirmHtml(firstName, tier) {
  const tierLabel = tier === 'Inner Circle' ? 'Inner Circle' : 'Routes Member'
  const step = (num, title, body) => `
    <tr>
      <td style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="28" style="width:28px;vertical-align:top;padding-top:2px;">
              <div style="width:20px;height:20px;background-color:rgba(197,168,130,0.15);border:0.5px solid rgba(197,168,130,0.3);font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#c5a882;text-align:center;line-height:20px;">${num}</div>
            </td>
            <td style="vertical-align:top;padding-left:12px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#F5F1EC;margin-bottom:4px;">${title}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:rgba(245,241,236,0.6);line-height:1.65;">${body}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application received — Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#0F1E14;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1E14;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:36px;">
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
              Canvas Routes &middot; ${tierLabel} &middot; 2026 Season
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">
              We&apos;ve got you, ${firstName}.
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding-bottom:10px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.8;color:rgba(245,241,236,0.8);">
              Your application for the 2026 Canvas Routes season is in. Your payment has been <strong style="color:#F5F1EC;font-weight:400;">authorised and held</strong> &mdash; your card has not been charged yet.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:36px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.8;color:rgba(245,241,236,0.8);">
              We go through every application personally. Here&apos;s exactly what happens from here.
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(197,168,130,0.06);border:0.5px solid rgba(197,168,130,0.18);">
                <tr>
                  <td style="padding:28px 24px 8px;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:20px;">What happens next</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${step('1', 'We review your application', 'Every application is looked at personally. We keep the community intentional — this typically takes a few days.')}
                      ${step('2', 'You hear from Jerry directly', 'Expect an email from <a href="mailto:jerry@canvasroutes.com" style="color:#c5a882;text-decoration:none;">jerry@canvasroutes.com</a>. Add that address to your contacts now so it doesn&apos;t get missed.')}
                      ${step('3', 'If approved — welcome to the community', 'Your payment is captured and you&apos;ll receive everything you need to get started. Your members kit will be ready to collect at your first event.')}
                      ${step('4', 'If not approved — nothing is charged', 'Your authorisation hold is released in full. No charge, no questions asked.')}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spam note -->
          <tr>
            <td style="padding-bottom:28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:rgba(245,241,236,0.5);">
              Our reply will come from <a href="mailto:jerry@canvasroutes.com" style="color:rgba(197,168,130,0.7);text-decoration:none;">jerry@canvasroutes.com</a>. If you don&apos;t hear from us within a few days, please check your <strong style="font-weight:500;color:rgba(245,241,236,0.6);">junk or spam folder</strong> &mdash; it can sometimes end up there.
            </td>
          </tr>

          <!-- Referral note (always shown — harmless if no referral) -->
          <tr>
            <td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.55);">
              If you were referred by an existing Canvas Routes member, that&apos;s noted and taken into account during review.
            </td>
          </tr>

          <!-- Instagram -->
          <tr>
            <td style="padding-bottom:36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border:1px solid rgba(197,168,130,0.35);">
                    <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;border-top:1px solid rgba(197,168,130,0.12);font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);line-height:1.8;">
              &copy; 2026 Canvas Routes. Montreal, QC.<br/>
              <a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function notifyHtml({ name, email, phone, dob_month, dob_day, dob_year, year, carModel, tier, source, more, referredBy, paymentIntentId }) {
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dobStr = dob_month ? `${MONTHS_SHORT[parseInt(dob_month) - 1]} ${dob_day}${dob_year ? `, ${dob_year}` : ''}` : null
  const TIER_PRICES = { 'Routes Member': '$99 CAD', 'Inner Circle': '$249 CAD' }
  const amountStr = TIER_PRICES[tier] || ''
  const paymentCell = paymentIntentId
    ? `Authorized — ${amountStr} &nbsp;<a href="https://dashboard.stripe.com/payments/${paymentIntentId}" style="color:#8A6535;font-size:11px;">View in Stripe ↗</a>`
    : (amountStr ? `Pending — ${amountStr}` : '')
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
                ${row('Payment', paymentCell)}
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

  // Check membership_open setting
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createAdminClient()
      const { data: setting } = await supabase.from('settings').select('value').eq('key', 'membership_open').maybeSingle()
      if (setting && setting.value === 'false') {
        const { data: msgSetting } = await supabase.from('settings').select('value').eq('key', 'membership_closed_message').maybeSingle()
        const msg = msgSetting?.value?.trim() || 'Membership applications are currently paused. Check back soon.'
        return Response.json({ error: msg }, { status: 503 })
      }
    } catch {}
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, email, phone, dob_month, dob_day, dob_year, year, carMake, carModel, carPaint, tier, source, more, referredBy, paymentIntentId, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Please enter your full name.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!year?.trim())
    return Response.json({ error: 'Please enter your car year.' }, { status: 400 })
  if (!carMake?.trim())
    return Response.json({ error: 'Please select your car make.' }, { status: 400 })
  if (!carModel?.trim())
    return Response.json({ error: 'Please enter your car model.' }, { status: 400 })
  if (!tier || !['Routes Member', 'Inner Circle'].includes(tier))
    return Response.json({ error: 'Please select a membership tier.' }, { status: 400 })
  if (!source || !['Instagram','Facebook','Friend / Word of mouth','Google','Other','Member referral'].includes(source))
    return Response.json({ error: 'Please select how you heard about us.' }, { status: 400 })
  if (phone && phone.replace(/\D/g, '').length < 6) return Response.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long.' }, { status: 400 })
  if (more && more.length > 500) return Response.json({ error: 'Message too long.' }, { status: 400 })

  const firstName = h(name.trim().split(' ')[0])
  const fullCar = [carMake, carModel].filter(Boolean).join(' ')
  const normalEmail = email.toLowerCase().trim()

  // Verify the PaymentIntent belongs to this user and matches the submitted tier
  if (paymentIntentId && stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      const TIER_TYPE_MAP = { 'Routes Member': 'membership_routes', 'Inner Circle': 'membership_inner_circle' }
      const expectedType = TIER_TYPE_MAP[tier]
      const piEmail = pi.metadata?.email?.toLowerCase().trim()
      if (
        pi.metadata?.type !== expectedType ||
        !['requires_capture', 'succeeded'].includes(pi.status) ||
        piEmail !== normalEmail
      ) {
        captureMessage('Membership waitlist PI verification failed', { piId: paymentIntentId, piEmail, normalEmail, piType: pi.metadata?.type, expectedType, piStatus: pi.status })
        return Response.json({ error: 'Payment verification failed. Please contact support.' }, { status: 400 })
      }
      // Reject if amount is suspiciously low (below 50% of tier price — covers legitimate promo codes)
      if (pi.amount < Math.floor((PRICES[expectedType] ?? 0) * 0.5)) {
        captureMessage('Membership waitlist PI amount too low', { piId: paymentIntentId, amount: pi.amount, expected: TIER_PRICE_MAP[tier] })
        return Response.json({ error: 'Payment amount invalid. Please contact support.' }, { status: 400 })
      }
    } catch (err) {
      // Don't block if Stripe is unavailable — log and proceed
      captureException(err, { context: 'membership-waitlist-pi-verify', paymentIntentId })
    }
  }

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
      car_make: carMake?.trim() || null,
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
      // Store PI ID immediately so admin can act even if the webhook is delayed
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' })
  } catch (e) {
    console.error('Failed to store membership application:', e.message)
    captureException(e, { context: 'membership-waitlist-db-save', email: normalEmail, name: name?.trim(), tier, paymentIntentId })
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
        subject: `Your Canvas Routes application is in, ${firstName}`,
        html: confirmHtml(firstName, tier),
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
        html: notifyHtml({ name, email, phone, dob_month, dob_day, dob_year, year, carModel: fullCar, tier, source, more, referredBy, paymentIntentId }),
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
