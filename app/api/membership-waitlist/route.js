import { after } from 'next/server'
import { deviceType } from '../../../lib/deviceType'
import { captureException, captureMessage } from '../../../lib/sentry.js'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { PRICES, MEMBERSHIP_TIER_TYPE } from '../../../lib/prices.js'
import { computeTax } from '../../../lib/tax.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function confirmHtml(rawFirstName, tier) {
  const firstName = h(rawFirstName)
  const tierLabel = tier === 'Inner Circle' ? 'Inner Circle' : 'Routes Member'
  const step = (num, title, body) => `
    <tr><td style="padding-bottom:18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="26" style="width:26px;vertical-align:top;padding-top:1px;">
            <div style="width:20px;height:20px;background:#0F1E14;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#c5a882;text-align:center;line-height:20px;">${num}</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:3px;">${title}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#666;line-height:1.65;">${body}</div>
          </td>
        </tr>
      </table>
    </td></tr>`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application received — Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

      <!-- Header -->
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; ${tierLabel} &middot; 2026 Season</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">We&apos;ve got you, ${firstName}.</h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your application for the 2026 Canvas Routes season is in. Your payment has been <strong style="color:#1a1a1a;font-weight:500;">authorised and held</strong> &mdash; your card has not been charged yet.</p>
        <p style="margin:0 0 1.5em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">We go through every application personally. Here&apos;s exactly what happens from here.</p>

        <!-- Steps card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:24px;">
          <tr><td style="padding:20px 22px 4px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;margin-bottom:18px;">What happens next</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${step('1', 'We review your application', 'Every application is looked at personally. We keep the community intentional — this typically takes a few days.')}
              ${step('2', 'You hear from Jerry directly', 'Expect an email from <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>. Add that address to your contacts now so it doesn\'t get missed.')}
              ${step('3', 'If approved — welcome to the community', 'Your payment is captured and you\'ll receive everything you need to get started. Your members kit will be ready to collect at your first event.')}
              ${step('4', 'If not approved — nothing is charged', 'Your authorisation hold is released in full. No charge, no questions asked.')}
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 1em;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#999;">Our reply will come from <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>. If you don&apos;t hear from us within a few days, please check your <strong style="font-weight:500;color:#666;">junk or spam folder</strong>.</p>
        <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#aaa;">If you were referred by an existing member, that&apos;s noted and taken into account during review.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border:0.5px solid rgba(0,0,0,0.18);">
            <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#0F1E14;padding:16px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);line-height:1.6;">
          &copy; 2026 Canvas Routes. Montreal, QC. &nbsp;&middot;&nbsp;
          <a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
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

  const ip = getClientIp(request)
    || 'unknown'
  if (await checkRateLimit(ip)) {
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

  const firstName = name.trim().split(' ')[0]  // raw — escape only inside HTML
  const fullCar = [carMake, carModel].filter(Boolean).join(' ')
  const normalEmail = email.toLowerCase().trim()

  // Stripe's PI status is the source of truth for stripe_payment_status — never
  // hardcode 'pending' below. If the webhook's requires_capture rescue already
  // ran (it can race ahead of this route on nothing more than normal network
  // latency, not just a closed tab), this route firing afterward must not
  // downgrade an already-'authorized' row back to 'pending' and hide the admin
  // Capture button. Falls back to 'pending' only if verification is skipped/fails.
  let stripePaymentStatus = 'pending'

  // Verify the PaymentIntent belongs to this user and matches the submitted tier
  if (paymentIntentId && stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      const expectedType = MEMBERSHIP_TIER_TYPE[tier]
      const piEmail = pi.metadata?.email?.toLowerCase().trim()
      if (
        pi.metadata?.type !== expectedType ||
        !['requires_capture', 'succeeded'].includes(pi.status) ||
        piEmail !== normalEmail
      ) {
        captureMessage('Membership waitlist PI verification failed', { piId: paymentIntentId, piEmail, normalEmail, piType: pi.metadata?.type, expectedType, piStatus: pi.status })
        return Response.json({ error: 'Payment verification failed. Please contact support.' }, { status: 400 })
      }
      stripePaymentStatus = pi.status === 'succeeded' ? 'paid' : 'authorized'
      // Reject if the amount doesn't reconcile with the tier price. pi.amount
      // is tax-inclusive (subtotal + GST + QST), so the expected total must be
      // derived the same way apply-promo derives it: discount off the pre-tax
      // subtotal, then recompute tax — comparing pi.amount directly against
      // the pre-tax PRICES[type] (as before tax existed) would always pass
      // trivially and stop catching genuinely wrong amounts.
      const discount = parseInt(pi.metadata?.discount_amount || '0', 10) || 0
      const expectedSubtotal = Math.max(0, (PRICES[expectedType] ?? 0) - discount)
      const { total: expectedTotal } = computeTax(expectedSubtotal)
      if (pi.amount < expectedTotal) {
        captureMessage('Membership waitlist PI amount too low', { piId: paymentIntentId, amount: pi.amount, discount, expected: expectedTotal })
        return Response.json({ error: 'Payment amount invalid. Please contact support.' }, { status: 400 })
      }
    } catch (err) {
      // Don't block if Stripe is unavailable — log and proceed
      captureException(err, { context: 'membership-waitlist-pi-verify', paymentIntentId })
    }
  }

  // Save to DB first so data is never lost if email sending fails.
  // supabase-js returns errors instead of throwing — every result is checked.
  let alreadyNotified = false
  try {
    const supabase = createAdminClient()
    const { data: existing, error: existingErr } = await supabase
      .from('applications')
      .select('registrations, stripe_payment_intent_id')
      .eq('email', normalEmail)
      .maybeSingle()
    if (existingErr) captureMessage('membership-waitlist: existing-row read failed', { error: existingErr.message, email: normalEmail })

    // Cancel the previous PI if the user is re-applying — prevents ghost holds.
    // The applications row shares ONE stripe_payment_intent_id across membership
    // and every road trip, so verify the stored PI is a membership PI before
    // cancelling — a blind cancel here could release someone's live road-trip hold.
    if (existing?.stripe_payment_intent_id && existing.stripe_payment_intent_id !== paymentIntentId && stripe) {
      stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id).then(prev => {
        if (prev.metadata?.type?.startsWith('membership_') && prev.status !== 'succeeded') {
          return stripe.paymentIntents.cancel(existing.stripe_payment_intent_id)
        }
      }).catch(() => {})
    }

    // Preserve the existing entry's registered_at/attended if the webhook rescue
    // (or a prior call to this same route) already created it — don't let a
    // late-arriving duplicate call reset the original registration timestamp.
    const existingMembershipReg = (existing?.registrations || []).find(r => r.event === 'Canvas Routes Membership')
    const membershipReg = {
      event: 'Canvas Routes Membership',
      tier,
      registered_at: existingMembershipReg?.registered_at || new Date().toISOString(),
      attended: existingMembershipReg?.attended ?? null,
      // Snapshot of what was actually submitted for the membership application —
      // the flat columns below get overwritten by whichever event this email
      // registers for next, so without this the original application details
      // are silently lost the moment they register for a road trip/event.
      details: {
        car_year: year.trim(), car_make: carMake?.trim() || null, car_model: fullCar || carMake,
        car_paint: carPaint?.trim() || null, phone: phone || null,
        dob_month: dob_month ? parseInt(dob_month) : null, dob_day: dob_day ? parseInt(dob_day) : null, dob_year: dob_year ? parseInt(dob_year) : null,
        source: source || null, more: more || null, referred_by: referredBy?.trim() || null,
      },
    }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== 'Canvas Routes Membership')
    const registrations = [...prevRegs, membershipReg]

    const upsertPayload = {
      email: normalEmail,
      device_type: deviceType(request),
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
      stripe_payment_status: stripePaymentStatus,
      // Clear any stale capture timestamp from a previous flow — safe here since
      // this route only ever runs pre-capture (authorized/pending), never after
      stripe_paid_at: null,
      stripe_payment_type: MEMBERSHIP_TIER_TYPE[tier] || null,
      // Store PI ID immediately so admin can act even if the webhook is delayed
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }
    let { error: upsertErr } = await supabase.from('applications').upsert(upsertPayload, { onConflict: 'email' })
    if (upsertErr) {
      // Retry once — transient PostgREST/network blips are the common cause
      // (seen July 10: direct upsert failed, webhook rescue succeeded seconds later)
      await new Promise(r => setTimeout(r, 400))
      const retry = await supabase.from('applications').upsert(upsertPayload, { onConflict: 'email' })
      upsertErr = retry.error || null
    }
    if (upsertErr) {
      // Data survives in PI metadata; the webhook requires_capture rescue will
      // recreate the row. Report loudly (DB error in the title so the alert is
      // diagnosable) but don't fail — the hold is already placed.
      captureMessage(`membership-waitlist: application upsert failed — ${upsertErr.message}`, {
        error: upsertErr.message, code: upsertErr.code, details: upsertErr.details, hint: upsertErr.hint,
        email: normalEmail, tier, paymentIntentId,
      })
      // Skip the emails too: with the row unwritten we can't claim the dedup
      // gate, and the webhook rescue (which Stripe retries for up to 72h) will
      // send its own applicant + admin emails — sending here as well would
      // double-email the applicant in exactly this failure mode.
      if (paymentIntentId) alreadyNotified = true
    }

    // Atomic dedup gate — exactly one caller per PI claims the notification.
    // Handles 3DS-redirect + normal flow both firing, including concurrently:
    // the conditional UPDATE is serialized by the row lock, so the second
    // caller matches zero rows and skips the emails.
    if (paymentIntentId && !upsertErr) {
      const { data: claimed, error: gateErr } = await supabase
        .from('applications')
        .update({ waitlist_notified_pi: paymentIntentId })
        .eq('email', normalEmail)
        .or(`waitlist_notified_pi.is.null,waitlist_notified_pi.neq.${paymentIntentId}`)
        .select('id')
      if (gateErr) {
        // Column missing or query failed — fall back to the non-atomic check
        captureMessage('membership-waitlist: dedup gate failed, using fallback', { error: gateErr.message, email: normalEmail })
        alreadyNotified = existing?.stripe_payment_intent_id === paymentIntentId
          && (existing?.registrations || []).some(r => r.event === 'Canvas Routes Membership')
      } else {
        alreadyNotified = (claimed || []).length === 0
      }
    }
  } catch (e) {
    console.error('Failed to store membership application:', e.message)
    captureException(e, { context: 'membership-waitlist-db-save', email: normalEmail, name: name?.trim(), tier, paymentIntentId })
  }

  // Fire emails after response — after() keeps the function alive until both fetches settle.
  // Skip if this PI's waitlist already ran (dedup gate set above).
  if (process.env.RESEND_API_KEY && !alreadyNotified) {
    after(() => Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: normalEmail,
          reply_to: 'info@canvasroutes.com',
          subject: `Your Canvas Routes application is in, ${firstName}`,
          html: confirmHtml(firstName, tier),
          // Kept in sync with confirmHtml() above — this stale copy used to say
          // "membership interest has been received... we'll be in touch once
          // memberships open," which contradicted the HTML (payment already
          // authorized and held) and read like membership hadn't launched yet.
          text: `We've got you, ${firstName}.\n\nYour application for the 2026 Canvas Routes season is in. Your payment has been authorised and held — your card has not been charged yet.\n\nWhat happens next:\n1. We review your application — every application is looked at personally, typically within a few days.\n2. You'll hear from Jerry directly at jerry@canvasroutes.com — add that address to your contacts now.\n3. If approved, your payment is captured and you're in — your members kit will be ready to collect at your first event.\n4. If not approved, your authorisation hold is released in full — no charge, no questions asked.\n\nIf you don't hear from us within a few days, please check your junk or spam folder.\n\nFollow @canvasroutes on Instagram: https://www.instagram.com/canvasroutes\n\n© 2026 Canvas Routes. Montreal, QC.`,
        }),
      }).then(r => { if (!r.ok) captureMessage(`Membership confirm email failed — ${normalEmail}`, { status: r.status }) })
        .catch(err => captureException(err, { context: 'membership-confirm-email', email: normalEmail })),

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'info@canvasroutes.com',
          subject: `Membership Registration — ${tier} — ${name.trim()}`,
          html: notifyHtml({ name, email, phone, dob_month, dob_day, dob_year, year, carModel: fullCar, tier, source, more, referredBy, paymentIntentId }),
          text: `Membership Registration\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}\nDOB: ${dob_month ? `${dob_month}/${dob_day}${dob_year ? `/${dob_year}` : ''}` : '—'}\nYear: ${year}\nCar: ${fullCar}\nTier: ${tier}\nHow they heard: ${source}${more ? `\nMessage: ${more}` : ''}`,
        }),
      }).then(r => { if (!r.ok) captureMessage(`Membership notify email failed — ${normalEmail}`, { status: r.status }) })
        .catch(err => captureException(err, { context: 'membership-notify-email', email: normalEmail })),
    ]))
  }

  return Response.json({ success: true })
}
