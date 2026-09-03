import { after } from 'next/server'
import { deviceType } from '../../../lib/deviceType'
import { captureException, captureMessage } from '../../../lib/sentry.js'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { PRICES, MEMBERSHIP_TIER_TYPE } from '../../../lib/prices.js'
import { computeTax } from '../../../lib/tax.js'
import { buildMembershipConfirmHtml, buildMembershipConfirmText } from '../../../lib/membershipEmail.js'
import { sendMetaCapiEvent } from '../../../lib/metaConversionsApi.js'
import { isValidEmail } from '../../../lib/emailValidation'
import { emailShell, infoCard, COLOR } from '../../../lib/emailLayout.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function notifyHtml({ name, email, phone, dob_month, dob_day, dob_year, year, carModel, tier, source, more, referredBy, paymentIntentId }) {
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dobStr = dob_month ? `${MONTHS_SHORT[parseInt(dob_month) - 1]} ${dob_day}${dob_year ? `, ${dob_year}` : ''}` : null
  const TIER_PRICES = { 'Routes Member': '$99 CAD', 'Inner Circle': '$249 CAD' }
  const amountStr = TIER_PRICES[tier] || ''
  const paymentCell = paymentIntentId
    ? `Authorized — ${amountStr} &nbsp;<a href="https://dashboard.stripe.com/payments/${paymentIntentId}" style="color:${COLOR.gold};font-size:11px;">View in Stripe ↗</a>`
    : (amountStr ? `Pending — ${amountStr}` : '')
  return emailShell({
    title: 'Membership Registration',
    eyebrow: 'Canvas Routes &middot; Internal',
    heading: 'Membership Registration',
    body: infoCard([
      ['Full name', `<strong>${h(name)}</strong>`],
      ['Email', `<a href="mailto:${h(email)}" style="color:${COLOR.head};">${h(email)}</a>`],
      ['Phone', h(phone || '—')],
      dobStr && ['Date of birth', h(dobStr)],
      year && ['Year', h(year)],
      carModel && ['Car', h(carModel)],
      tier && ['Tier', h(tier)],
      paymentCell && ['Payment', paymentCell],
      source && ['How they heard', h(source)],
      referredBy && ['Referred by', h(referredBy)],
      more && ['Message', h(more)],
    ], { mb: '0' }),
  })
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
  if (!email?.trim() || !isValidEmail(email))
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
  // Kept for the Meta CAPI Purchase event fired further down — needs pi.amount
  // (the true tax-inclusive, discount-net charge) and pi.metadata (phone/fbc/fbp/ip/ua).
  let verifiedPi = null

  // Verify the PaymentIntent belongs to this user and matches the submitted tier
  if (paymentIntentId && stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      verifiedPi = pi
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
          html: buildMembershipConfirmHtml(firstName, tier),
          text: buildMembershipConfirmText(firstName),
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

  // Meta CAPI Purchase — same dedup gate as the emails above (alreadyNotified).
  // eventId = paymentIntentId, matching what the client's fbq('track','Purchase',
  // { eventID }) sends for the same PI (see components/MembershipContent.jsx),
  // so Meta dedupes the two instead of double-counting.
  if (paymentIntentId && verifiedPi && !alreadyNotified) {
    after(() => sendMetaCapiEvent({
      eventName: 'Purchase',
      eventId: paymentIntentId,
      eventSourceUrl: 'https://canvasroutes.com/membership',
      email: normalEmail,
      phone: verifiedPi.metadata?.phone || null,
      clientIp: verifiedPi.metadata?.client_ip || null,
      clientUserAgent: verifiedPi.metadata?.client_ua || null,
      fbc: verifiedPi.metadata?.fbc || null,
      fbp: verifiedPi.metadata?.fbp || null,
      value: verifiedPi.amount / 100,
      currency: 'CAD',
      contentName: tier === 'Inner Circle' ? 'Inner Circle Membership' : 'Routes Membership',
    }).catch(err => captureException(err, { context: 'membership-waitlist-meta-capi', paymentIntentId })))
  }

  return Response.json({ success: true })
}
