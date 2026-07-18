import { after } from 'next/server'
import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { captureException, captureMessage } from '../../../../lib/sentry.js'
import { buildWtetHoldHtml, buildWtetConfirmHtml } from '../../../../lib/wtetEmail.js'
import { buildAdminNotifyHtml } from '../../../../lib/adminEmail.js'
import { buildEventConfirmHtml } from '../../../../lib/eventConfirmEmail.js'
import { MEMBERSHIP_TYPE_TIER } from '../../../../lib/prices.js'

// Stripe requires the raw body — Next.js must NOT parse it
export const runtime = 'nodejs'


export async function POST(request) {
  if (!stripe) {
    return new Response('Payments not configured.', { status: 503 })
  }

  const sig  = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return new Response('Missing signature.', { status: 400 })
  }

  // Read raw body — required for Stripe signature verification
  const rawBody = await request.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message)
    return new Response('Webhook signature verification failed.', { status: 400 })
  }

  try {
    switch (event.type) {

      case 'payment_intent.succeeded': {
        const pi       = event.data.object
        const { type, email, name, event_name: eventName, event_id, member_id } = pi.metadata
        const amountPaid = pi.amount_received  // cents
        const normalEmail = email?.toLowerCase().trim()

        if (!normalEmail) {
          captureMessage('Stripe payment succeeded but no email in metadata', { piId: pi.id })
          break
        }

        const supabase = createAdminClient()

        if (type === 'event_registration' && event_id && member_id) {
          const { data: memberExists } = await supabase.from('members').select('id').eq('id', member_id).maybeSingle()
          if (!memberExists) {
            captureMessage('Event registration webhook: member row not found', { piId: pi.id, member_id })
            break
          }
          // onConflict takes COLUMNS, not the constraint name — the old value
          // ('uq_event_reg_event_member') made webhook retries fail silently
          const { error: regUpErr } = await supabase.from('event_registrations').upsert({
            event_id,
            member_id,
            email: normalEmail,
            name: name || '',
            stripe_payment_intent_id: pi.id,
            stripe_payment_status: 'paid',
            amount_paid: amountPaid,
          }, { onConflict: 'event_id,member_id' })
          if (regUpErr) throw new Error(`event_registrations upsert failed: ${regUpErr.message}`) // outer catch → 500 → Stripe retries

          // Mirror into applications.registrations + contacts so the event shows
          // on the person's profile in Contacts/Applications (free-register
          // already does this; paid registrations must too)
          const { data: evRow } = await supabase.from('events').select('name, date, date_display, location').eq('id', event_id).maybeSingle()
          const evName = evRow?.name || eventName
          if (evName) {
            const { data: existingApp } = await supabase.from('applications')
              .select('id, registrations').eq('email', normalEmail).maybeSingle()
            const newReg = { event: evName, registered_at: new Date().toISOString(), attended: null, source: 'member_portal' }
            const prevRegs = (existingApp?.registrations || []).filter(r => r.event !== evName)
            const { data: appData, error: appSyncErr } = await supabase.from('applications').upsert({
              email: normalEmail,
              ...(name ? { name } : {}),
              registrations: [...prevRegs, newReg],
            }, { onConflict: 'email' }).select('id').maybeSingle()
            if (appSyncErr) {
              captureException(new Error(appSyncErr.message), { context: 'webhook-event-reg-app-sync', piId: pi.id })
            } else if (appData?.id) {
              const { error: contactSyncErr } = await supabase.from('contacts').upsert(
                { application_id: appData.id },
                { onConflict: 'application_id', ignoreDuplicates: true }
              )
              if (contactSyncErr) captureException(new Error(contactSyncErr.message), { context: 'webhook-event-reg-contact-sync', piId: pi.id })
            }
          }
          // Send the confirmation email if nobody has yet — 3DS redirects skip
          // the client's register call entirely, leaving the webhook as the only
          // path that can notify the member. Atomic claim prevents duplicates
          // when the register route also lands.
          if (process.env.RESEND_API_KEY && evRow?.name) {
            const { data: claimRows, error: claimErr } = await supabase
              .from('event_registrations')
              .update({ confirmation_email_sent_at: new Date().toISOString() })
              .eq('event_id', event_id)
              .eq('member_id', member_id)
              .is('confirmation_email_sent_at', null)
              .select('id')
            if (claimErr) {
              // Column missing (migration pending) — the register route still sends; skip here
              captureMessage('webhook event-reg email claim failed', { error: claimErr.message, piId: pi.id })
            } else if ((claimRows || []).length > 0) {
              const { data: memberRow } = await supabase.from('members').select('name, tier').eq('id', member_id).maybeSingle()
              const memberName = memberRow?.name?.trim() || name || normalEmail.split('@')[0]
              const firstName = memberName.split(' ')[0] || 'there'
              const dateDisplay = evRow.date_display || evRow.date || null
              after(() => Promise.allSettled([
                fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                  body: JSON.stringify({
                    from: 'Canvas Routes <jerry@canvasroutes.com>',
                    to: normalEmail,
                    reply_to: 'jerry@canvasroutes.com',
                    subject: `You're registered — ${evRow.name}`,
                    html: buildEventConfirmHtml({ firstName, eventName: evRow.name, dateDisplay, location: evRow.location || null, isFree: false, amountPaid, eventId: event_id, date: evRow.date || null }),
                    text: `Hey ${firstName},\n\nYou're registered for ${evRow.name}${dateDisplay ? ` on ${dateDisplay}` : ''}${evRow.location ? ` at ${evRow.location}` : ''}. Payment: $${(amountPaid / 100).toFixed(2)} CAD.\n\nSee you there,\nJerry\nCanvas Routes`,
                  }),
                }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — webhook-event-reg-member-email`, { status: r.status }) }).catch(err => captureException(err, { context: 'webhook-event-reg-member-email', piId: pi.id })),
                fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                  body: JSON.stringify({
                    from: 'Canvas Routes <info@canvasroutes.com>',
                    to: 'info@canvasroutes.com',
                    subject: `Event Registration — ${evRow.name} — ${memberName}`,
                    html: buildAdminNotifyHtml('New event registration (webhook)', [
                      ['Event',   `<strong>${evRow.name}</strong>`],
                      ['Name',    `<strong>${memberName}</strong>`],
                      ['Email',   `<a href="mailto:${normalEmail}" style="color:#1a1a1a;">${normalEmail}</a>`],
                      ['Tier',    memberRow?.tier || '—'],
                      ['Payment', `$${(amountPaid / 100).toFixed(2)} CAD`],
                    ]),
                  }),
                }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — webhook-event-reg-admin-email`, { status: r.status }) }).catch(err => captureException(err, { context: 'webhook-event-reg-admin-email', piId: pi.id })),
              ]))
            }
          }
          console.log(`Event registration confirmed: ${event_id} — ${normalEmail} — $${(amountPaid / 100).toFixed(2)} CAD`)
        } else if (type?.startsWith('membership_')) {
          // Membership payment captured — update application row
          await supabase.from('applications').upsert({
            email:                     normalEmail,
            name:                      name || '',
            stripe_payment_intent_id:  pi.id,
            stripe_payment_status:     'paid',
            stripe_amount_paid:        amountPaid,
            stripe_payment_type:       type,
            stripe_paid_at:            new Date().toISOString(),
          }, { onConflict: 'email' })
          // Also patch stripe_paid_at in case the capture-route DB write previously failed
          await supabase.from('applications')
            .update({ stripe_paid_at: new Date().toISOString() })
            .eq('stripe_payment_intent_id', pi.id)
            .is('stripe_paid_at', null)
          console.log(`Membership payment confirmed: ${type} — ${normalEmail} — $${(amountPaid / 100).toFixed(2)} CAD`)
        } else if (type?.startsWith('road_trip_')) {
          // Road trip payment confirmed — record in DB and send confirmation email
          const amountFormatted = `$${(amountPaid / 100).toFixed(2)} CAD`
          const firstName = (name || '').trim().split(' ')[0] || 'there'
          const eventLabel = eventName || 'Canvas Routes Road Trip'
          const isMember = pi.metadata?.is_member === 'yes'
          console.log(`Road trip payment confirmed: ${type} — ${normalEmail} — ${amountFormatted}`)

          // Check if the admin panel already captured (it sets stripe_paid_at synchronously).
          // If so, the capture route already sent the confirmation email — webhook should skip it
          // to avoid duplicates. Stripe dashboard captures leave stripe_paid_at null at this point.
          const { data: preUpdateApp } = await supabase.from('applications')
            .select('stripe_paid_at')
            .eq('stripe_payment_intent_id', pi.id)
            .maybeSingle()
          const adminPanelAlreadyCaptured = !!(preUpdateApp?.stripe_paid_at)

          // Write payment fields — update by PI ID so we don't clobber unrelated rows.
          // For member road trips, skip stripe_paid_at so wtet-member-confirm remains the
          // sole setter — alreadyConfirmed guard in that route depends on this.
          const paymentFields = {
            stripe_payment_status: 'paid',
            stripe_amount_paid:    amountPaid,
            stripe_payment_type:   type,
            ...(isMember ? {} : { stripe_paid_at: new Date().toISOString() }),
          }
          const { data: byPiRows, error: rtDbErr } = await supabase.from('applications')
            .update(paymentFields)
            .eq('stripe_payment_intent_id', pi.id)
            .select('id')
          if (rtDbErr) captureException(rtDbErr, { context: 'road-trip-payment-db', piId: pi.id })
          if (!rtDbErr && (!byPiRows || byPiRows.length === 0) && normalEmail) {
            // PI ID not found — fall back to email so the status is never silently lost
            const { error: fbErr } = await supabase.from('applications')
              .update({ ...paymentFields, stripe_payment_intent_id: pi.id })
              .eq('email', normalEmail)
            if (fbErr) captureException(fbErr, { context: 'road-trip-payment-db-email-fallback', piId: pi.id, email: normalEmail })
            else captureMessage('road-trip-payment-db: used email fallback — PI ID was not in DB', { piId: pi.id, email: normalEmail })
          }

          // Non-member confirmation email — only when capture came from Stripe dashboard.
          // Admin panel captures send this email themselves via the capture route.
          if (!isMember && !adminPanelAlreadyCaptured && process.env.RESEND_API_KEY && normalEmail) {
            // WTET has its own frozen check-in page; other routes don't have
            // an equivalent wired up yet, so omit the button rather than
            // link to WTET's page for a different event.
            const checkinUrl = type === 'road_trip_wtet' ? `https://canvasroutes.com/wtet/checkin?t=${pi.id}` : null
            await Promise.all([
              fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: 'Canvas Routes <info@canvasroutes.com>',
                  to: normalEmail,
                  reply_to: 'jerry@canvasroutes.com',
                  subject: `Payment confirmed — ${eventLabel}`,
                  html: buildWtetConfirmHtml(firstName, amountFormatted, checkinUrl, eventLabel),
                  text: `Hey ${firstName},\n\nYour payment of ${amountFormatted} for ${eventLabel} is confirmed.\n\nYou'll receive a full itinerary and all event details closer to the date. Follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
                }),
              }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — road-trip-payment-confirm-email`, { status: r.status }) }).catch(err => captureException(err, { context: 'road-trip-payment-confirm-email', email: normalEmail })),
            ])
          }
        }
        break
      }

      case 'payment_intent.requires_capture':
      case 'payment_intent.amount_capturable_updated': {
        // Hold authorized — fires for membership PIs and non-member WTET PIs (manual capture).
        // Member WTET PIs now use automatic capture and go straight to payment_intent.succeeded.
        const pi       = event.data.object
        // amount_capturable_updated can fire for reasons other than initial authorization
        // (e.g. promo code applied to an already-authorized PI). Only process when the PI
        // is actually awaiting capture — prevents overwriting a paid status with authorized.
        if (pi.status !== 'requires_capture') break
        const { type, email, name, event_name: piEventName } = pi.metadata
        if (!type?.startsWith('membership_') && !type?.startsWith('road_trip_')) break
        const amountHeld = pi.amount
        const normalEmail = email?.toLowerCase().trim()

        if (!normalEmail) break

        const supabase = createAdminClient()

        // Read once, before writing anything — this snapshot both (a) seeds the
        // registrations merge below and (b) proves whether the normal
        // /api/membership-waitlist flow already ran (checked further down,
        // BEFORE our own upsert writes the same registrations entry and makes
        // that check meaningless).
        const { data: preExisting } = await supabase.from('applications')
          .select('registrations').eq('email', normalEmail).maybeSingle()
        const priorRegs = preExisting?.registrations || []
        const waitlistAlreadyRan = priorRegs.some(r => r.event === 'Canvas Routes Membership')

        // Membership PIs must carry a 'Canvas Routes Membership' registrations
        // entry — it's the ONLY place tier is read from (admin Applications tab
        // and CSV export both do registrations?.find(r => r.event === '...')?.tier,
        // never stripe_payment_type). Without this, an applicant whose tab closes
        // before membership-waitlist fires shows up in admin with no tier at all.
        const membershipTier = MEMBERSHIP_TYPE_TIER[type] // undefined for road_trip_* types
        const existingMembershipReg = priorRegs.find(r => r.event === 'Canvas Routes Membership')
        const registrations = membershipTier
          ? [...priorRegs.filter(r => r.event !== 'Canvas Routes Membership'), {
              event: 'Canvas Routes Membership',
              tier: membershipTier,
              registered_at: existingMembershipReg?.registered_at || new Date().toISOString(),
              attended: existingMembershipReg?.attended ?? null,
            }]
          : undefined // road-trip PIs: rescue leaves registrations untouched here, unchanged behavior

        // Upsert with all form fields stored in PI metadata (written by create-payment-intent
        // for membership PIs) — ensures full application data is saved even if the client
        // closed the tab before /api/membership-waitlist fired.
        await supabase.from('applications').upsert({
          email:                    normalEmail,
          ...(name ? { name } : {}),
          ...(registrations ? { registrations } : {}),
          ...(pi.metadata?.phone    ? { phone:    pi.metadata.phone }    : {}),
          ...(pi.metadata?.dob ? (() => {
            const [y, m, d] = (pi.metadata.dob || '').split('-').map(Number)
            return {
              dob: pi.metadata.dob,
              ...(m ? { dob_month: m } : {}),
              ...(d ? { dob_day: d }   : {}),
              ...(y && y > 1900 ? { dob_year: y } : {}),
            }
          })() : {}),
          ...(pi.metadata?.car_year ? { car_year: pi.metadata.car_year } : {}),
          ...(pi.metadata?.car_make ? { car_make: pi.metadata.car_make } : {}),
          ...(pi.metadata?.car_model ? { car_model: pi.metadata.car_model } : {}),
          ...(pi.metadata?.source   ? { source:   pi.metadata.source }   : {}),
          ...(pi.metadata?.referred_by ? { referred_by: pi.metadata.referred_by } : {}),
          ...(pi.metadata?.car_paint   ? { car_paint:   pi.metadata.car_paint }   : {}),
          ...(pi.metadata?.more        ? { more:        pi.metadata.more }        : {}),
          stripe_payment_intent_id: pi.id,
          stripe_payment_status:    'authorized',
          stripe_amount_paid:       amountHeld,
          stripe_payment_type:      type,
        }, { onConflict: 'email', ignoreDuplicates: false })
          .then(({ error }) => {
            // This upsert IS the rescue path — if it fails, throw so the outer
            // catch returns 500 and Stripe retries for up to 72h
            if (error) throw new Error(`requires_capture rescue upsert failed: ${error.message}`)
          })

        console.log(`Payment authorized (held): ${type} — ${normalEmail} — $${(amountHeld / 100).toFixed(2)} CAD`)

        // Send registration received email + admin notification for road trip holds
        if (type?.startsWith('road_trip_') && process.env.RESEND_API_KEY) {
          // Atomic per-PI claim — amount_capturable_updated can be redelivered
          // (Stripe retries, amount changes while requires_capture); without
          // this the hold emails would send once per delivery.
          const { data: rtClaim, error: rtClaimErr } = await supabase
            .from('applications')
            .update({ waitlist_notified_pi: pi.id })
            .eq('email', normalEmail)
            .or(`waitlist_notified_pi.is.null,waitlist_notified_pi.neq.${pi.id}`)
            .select('id')
          if (!rtClaimErr && (rtClaim || []).length === 0) break
          const firstName   = (name || '').trim().split(' ')[0] || 'there'
          const eventLabel  = piEventName || 'Canvas Routes Road Trip'
          const amountFmt   = `$${(amountHeld / 100).toFixed(2)} CAD`
          after(() => Promise.allSettled([
            // Registrant hold email
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'Canvas Routes <jerry@canvasroutes.com>',
                to: normalEmail,
                reply_to: 'jerry@canvasroutes.com',
                subject: `Registration received — ${eventLabel}`,
                html: buildWtetHoldHtml(firstName, amountFmt, eventLabel),
                text: `Hey ${firstName},\n\nWe've received your registration for ${eventLabel}.\n\nYour ${amountFmt} hold is placed — your card has not been charged. We review every registration personally. If you're confirmed, the charge goes through and you'll receive full event details. If not, the hold is released with no charge.\n\nAdd jerry@canvasroutes.com to your contacts so our reply gets through.\n\nQuestions? Reply to this email.\n\nSee you on the road,\nJerry\nCanvas Routes`,
              }),
            }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — road-trip-hold-email`, { status: r.status }) }).catch(err => captureException(err, { context: 'road-trip-hold-email', email: normalEmail })),
            // Admin notification — new non-member registration awaiting review
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'Canvas Routes <info@canvasroutes.com>',
                to: 'jerry@canvasroutes.com',
                subject: `New Registration (pending review) — ${name || normalEmail}`,
                html: buildAdminNotifyHtml('New registration — awaiting review', [
                  ['Event',          eventLabel],
                  ['Name',           `<strong>${name || '—'}</strong>`],
                  ['Email',          `<a href="mailto:${normalEmail}" style="color:#1a1a1a;">${normalEmail}</a>`],
                  ['Phone',          pi.metadata?.phone || '—'],
                  ['DOB',            pi.metadata?.dob || '—'],
                  ['Instagram',      pi.metadata?.instagram ? `@${pi.metadata.instagram}` : '—'],
                  ['Hold',           amountFmt],
                  ['Car year',       pi.metadata?.car_year || '—'],
                  ['Car',            pi.metadata?.car_model || '—'],
                  ['Passengers',     pi.metadata?.passengers || '—'],
                  ['Children',       pi.metadata?.has_children || '—'],
                  ['Children ages',  pi.metadata?.children_ages || '—'],
                  ['Source',         pi.metadata?.source || '—'],
                  ['Message',        pi.metadata?.message || '—'],
                  ['PI',             pi.id],
                ]),
              }),
            }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — road-trip-hold-admin-email`, { status: r.status }) }).catch(err => captureException(err, { context: 'road-trip-hold-admin-email', email: normalEmail })),
          ]))
        }

        // Send membership hold emails only if membership-waitlist didn't already run.
        // membership-waitlist sets registrations with a 'Canvas Routes Membership' entry —
        // if that entry exists the normal flow completed and we must not duplicate the emails.
        if (type?.startsWith('membership_') && process.env.RESEND_API_KEY) {
          if (waitlistAlreadyRan) break
          // Atomic claim on the same dedup column membership-waitlist uses —
          // whichever path claims this PI first sends the emails; the other
          // matches zero rows and skips. Closes the race where this webhook
          // landed before the waitlist upsert committed and both sets sent.
          const { data: claimRows, error: claimErr } = await supabase
            .from('applications')
            .update({ waitlist_notified_pi: pi.id })
            .eq('email', normalEmail)
            .or(`waitlist_notified_pi.is.null,waitlist_notified_pi.neq.${pi.id}`)
            .select('id')
          if (!claimErr && (claimRows || []).length === 0) break
          const firstName  = (name || '').trim().split(' ')[0] || 'there'
          const tierLabel  = type === 'membership_inner_circle' ? 'Inner Circle' : 'Routes Member'
          const amountFmt  = `$${(amountHeld / 100).toFixed(2)} CAD`
          after(() => Promise.allSettled([
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'Canvas Routes <info@canvasroutes.com>',
                to: normalEmail,
                reply_to: 'info@canvasroutes.com',
                subject: `Your Canvas Routes application is in, ${firstName}`,
                html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F1EC;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;"><tr><td align="center" style="padding:32px 16px 48px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;"><tr><td style="background:#0F1E14;padding:32px 40px 28px;"><img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" /><p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; ${tierLabel}</p><h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">We've got you, ${firstName}.</h1></td></tr><tr><td style="background:#ffffff;padding:36px 40px 32px;"><p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your <strong style="color:#1a1a1a;font-weight:500;">${tierLabel}</strong> membership application has been received. Your card has been authorized for <strong style="color:#1a1a1a;font-weight:500;">${amountFmt}</strong> &mdash; it won&apos;t be charged until your application is reviewed and approved.</p><p style="margin:0 0 1.4em;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">Spots are limited. We&apos;ll reach out before we open to the public.</p><p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#555;">&mdash; Jerry</p></td></tr><tr><td style="background:#0F1E14;padding:16px 40px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);">&copy; 2026 Canvas Routes. Montreal, QC.</p></td></tr></table></td></tr></table></body></html>`,
                text: `We've got you, ${firstName}.\n\nYour ${tierLabel} membership application has been received. Your card has been authorized for ${amountFmt} — it won't be charged until your application is reviewed and approved.\n\nSpots are limited. We'll reach out before we open to the public.\n\n© 2026 Canvas Routes. Montreal, QC.`,
              }),
            }).catch(err => captureException(err, { context: 'membership-hold-email-rescue', email: normalEmail })),
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'Canvas Routes <info@canvasroutes.com>',
                to: 'info@canvasroutes.com',
                subject: `Membership Application (rescue) — ${tierLabel} — ${name || normalEmail}`,
                html: buildAdminNotifyHtml('Membership application — webhook rescue', [
                  ['Tier',      tierLabel],
                  ['Name',      `<strong>${name || '—'}</strong>`],
                  ['Email',     `<a href="mailto:${normalEmail}" style="color:#1a1a1a;">${normalEmail}</a>`],
                  ['Phone',     pi.metadata?.phone || '—'],
                  ['DOB',       pi.metadata?.dob || '—'],
                  ['Hold',      amountFmt],
                  ['Car year',    pi.metadata?.car_year || '—'],
                  ['Car',         pi.metadata?.car_model || '—'],
                  ['Paint',       pi.metadata?.car_paint || '—'],
                  ['Source',      pi.metadata?.source || '—'],
                  ['Referred by', pi.metadata?.referred_by || '—'],
                  ['Message',     pi.metadata?.more || '—'],
                  ['PI',          pi.id],
                ]),
              }),
            }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — membership-hold-admin-email-rescue`, { status: r.status }) }).catch(err => captureException(err, { context: 'membership-hold-admin-email-rescue', email: normalEmail })),
          ]))
        }
        break
      }

      case 'payment_intent.canceled': {
        const pi    = event.data.object
        const email = pi.metadata?.email?.toLowerCase().trim()
        const supabase = createAdminClient()
        if (pi.metadata?.type === 'event_registration' && pi.metadata?.event_id && pi.metadata?.member_id) {
          // Cancelled event PI — clear the pending row so the member can re-register
          const { error: cancelErr } = await supabase.from('event_registrations')
            .update({ stripe_payment_status: 'failed' })
            .eq('event_id', pi.metadata.event_id)
            .eq('member_id', pi.metadata.member_id)
            .eq('stripe_payment_status', 'pending')
          if (cancelErr) throw new Error(`canceled webhook event_registrations update failed: ${cancelErr.message}`)
        } else if (email) {
          // Membership/road trip hold released (admin reject). Only downgrade
          // live holds — never clobber a terminal status (paid/refunded/...)
          const { error: cancelErr } = await supabase.from('applications')
            .update({ stripe_payment_status: 'rejected' })
            .eq('stripe_payment_intent_id', pi.id)
            .in('stripe_payment_status', ['pending', 'authorized'])
          if (cancelErr) throw new Error(`canceled webhook applications update failed: ${cancelErr.message}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi       = event.data.object
        const email    = pi.metadata?.email?.toLowerCase().trim()
        const errMsg   = pi.last_payment_error?.message || 'unknown'
        console.error(`Payment failed: ${email} — ${errMsg}`)
        captureMessage(`Stripe payment failed — ${email}`, { error: errMsg, piId: pi.id })
        const supabase = createAdminClient()
        if (pi.metadata?.type === 'event_registration' && pi.metadata?.event_id && pi.metadata?.member_id) {
          const { error: failErr } = await supabase.from('event_registrations')
            .update({ stripe_payment_status: 'failed' })
            .eq('event_id', pi.metadata.event_id)
            .eq('member_id', pi.metadata.member_id)
            .not('stripe_payment_status', 'eq', 'paid') // never clobber a confirmed payment
          if (failErr) throw new Error(`payment_failed webhook event_registrations update failed: ${failErr.message}`)
        } else {
          const { error: failErr } = await supabase.from('applications')
            .update({ stripe_payment_status: 'failed' })
            .eq('stripe_payment_intent_id', pi.id)
            .not('stripe_payment_status', 'in', '(paid,refunded,partially_refunded)') // failed retry must not clobber a completed payment
          if (failErr) throw new Error(`payment_failed webhook applications update failed: ${failErr.message}`)
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute  = event.data.object
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
        captureMessage(`Stripe dispute created — charge ${chargeId}`, { disputeId: dispute.id, reason: dispute.reason })
        if (chargeId) {
          try {
            const charge = await stripe.charges.retrieve(chargeId)
            if (charge.payment_intent) {
              const pi = await stripe.paymentIntents.retrieve(charge.payment_intent)
              const supabase = createAdminClient()
              if (pi.metadata?.type === 'event_registration' && pi.metadata?.event_id && pi.metadata?.member_id) {
                const { error: dispErr } = await supabase.from('event_registrations')
                  .update({ stripe_payment_status: 'disputed' })
                  .eq('event_id', pi.metadata.event_id)
                  .eq('member_id', pi.metadata.member_id)
                if (dispErr) throw new Error(`dispute webhook event_registrations update failed: ${dispErr.message}`)
              } else {
                const { error: dispErr } = await supabase.from('applications')
                  .update({ stripe_payment_status: 'disputed' })
                  .eq('stripe_payment_intent_id', charge.payment_intent)
                if (dispErr) throw new Error(`dispute webhook applications update failed: ${dispErr.message}`)
              }
            }
          } catch (err) {
            captureException(err, { context: 'dispute-webhook', chargeId })
            throw err // propagate → 500 → Stripe retries
          }
        }
        break
      }

      case 'charge.dispute.closed': {
        // Fires when a dispute is won (funds reinstated) or lost (funds withdrawn)
        const dispute  = event.data.object
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
        const newStatus = dispute.status === 'won' ? 'disputed_won' : dispute.status === 'lost' ? 'disputed_lost' : 'disputed'
        captureMessage(`Stripe dispute ${dispute.status} — charge ${chargeId}`, { disputeId: dispute.id })
        if (chargeId) {
          try {
            const charge = await stripe.charges.retrieve(chargeId)
            if (charge.payment_intent) {
              const pi = await stripe.paymentIntents.retrieve(charge.payment_intent)
              const supabase = createAdminClient()
              if (pi.metadata?.type === 'event_registration' && pi.metadata?.event_id && pi.metadata?.member_id) {
                const { error: dispErr } = await supabase.from('event_registrations')
                  .update({ stripe_payment_status: newStatus })
                  .eq('event_id', pi.metadata.event_id)
                  .eq('member_id', pi.metadata.member_id)
                if (dispErr) throw new Error(`dispute-closed webhook event_registrations update failed: ${dispErr.message}`)
              } else {
                const { error: dispErr } = await supabase.from('applications')
                  .update({ stripe_payment_status: newStatus })
                  .eq('stripe_payment_intent_id', charge.payment_intent)
                if (dispErr) throw new Error(`dispute-closed webhook applications update failed: ${dispErr.message}`)
              }
            }
          } catch (err) {
            captureException(err, { context: 'dispute-closed-webhook', chargeId })
            throw err // propagate → 500 → Stripe retries
          }
        }
        break
      }

      case 'charge.refunded': {
        // Fires when a refund is issued from the Stripe dashboard or API
        const charge = event.data.object
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (!piId) break
        const status = charge.refunded ? 'refunded' : 'partially_refunded'
        const supabase = createAdminClient()
        const [appRes, regRes] = await Promise.all([
          supabase.from('applications')
            .update({ stripe_payment_status: status, stripe_amount_refunded: charge.amount_refunded })
            .eq('stripe_payment_intent_id', piId),
          supabase.from('event_registrations')
            .update({ stripe_payment_status: 'refunded' })
            .eq('stripe_payment_intent_id', piId),
        ])
        if (appRes.error) throw new Error(`refund webhook applications update failed: ${appRes.error.message}`)
        if (regRes.error) throw new Error(`refund webhook event_registrations update failed: ${regRes.error.message}`)
        console.log(`Refund recorded: ${piId} — status ${status}`)
        break
      }

      case 'payment_intent.created':
      case 'charge.succeeded':
      case 'charge.updated':
        // Acknowledged — no action needed
        break

      default:
        console.log(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    captureException(err, { context: 'stripe-webhook', eventType: event.type })
    // Return 500 so Stripe retries with exponential backoff (up to 72h).
    // All handlers use upsert, so duplicate delivery on retry is safe.
    return new Response('Handler error.', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
