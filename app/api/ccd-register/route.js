import { checkRateLimit, getClientIp } from '../../../lib/rateLimit.js'
import { deviceType } from '../../../lib/deviceType'
import { captureException } from '../../../lib/sentry.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { createClient } from '../../../lib/supabase/server'
import { emailShell, p, button, infoCard, accentCard, eyebrow, COLOR } from '../../../lib/emailLayout.js'
import { isValidEmail } from '../../../lib/emailValidation'

const EVENT_NAME = 'Cars, Coffee & Dad Jokes — June 20, 2026'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function confirmHtml(firstName, { year, carMake, carModel }) {
  const car = [year, carMake, carModel].filter(Boolean).join(' ')
  const body = `
    ${p(`Hi ${h(firstName)},`)}
    ${p(`We&rsquo;ve received your registration. Entry is invite-only, so we&rsquo;ll review your details and follow up with confirmation before the event.`)}
    ${infoCard([
      ['Time', '9:00 – 11:30 AM'],
      ['Venue', 'Cafe Napoleon, LaSalle'],
      ['Entry', 'Invite only &middot; Free'],
      car && ['Your car', h(car)],
    ])}
    ${p(`Add <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a> to your contacts so our follow-up doesn&rsquo;t land in spam.`)}
    ${p(`See you on June 20,<br/>Jerry<br/><span style="color:${COLOR.muted};">Canvas Routes</span>`, { mb: '26px' })}
    ${accentCard(`
      ${eyebrow('Founding Member Offer', { mb: '8px' })}
      ${p(`As a thank-you for coming out, use code <strong style="color:${COLOR.head};font-weight:600;letter-spacing:0.06em;">FOUNDING</strong> when you apply for a Canvas Routes membership for a special discount.`, { tone: 'muted' })}
      ${button('https://canvasroutes.com/membership', 'Apply for Membership &rarr;', { variant: 'green', mb: '0' })}`)}
  `
  return emailShell({
    title: 'Registration received — Canvas Routes',
    preheader: `We've received your Cars, Coffee & Dad Jokes registration — we'll follow up with confirmation before the event.`,
    eyebrow: 'Canvas Routes &middot; Father&rsquo;s Day Weekend',
    heading: 'Cars, Coffee &amp; Dad Jokes',
    body,
  })
}

function notifyHtml({ name, email, year, carMake, carModel, phone, instagram, more, source }) {
  const fullCar = [year, carMake, carModel].filter(Boolean).join(' ')
  return emailShell({
    title: 'New CCD Registration',
    eyebrow: 'Canvas Routes &middot; Internal',
    heading: 'New CCD Registration',
    body: infoCard([
      ['Event', `<strong>${h(EVENT_NAME)}</strong>`],
      ['Name', `<strong>${h(name)}</strong>`],
      ['Email', `<a href="mailto:${h(email)}" style="color:${COLOR.head};">${h(email)}</a>`],
      fullCar && ['Car', h(fullCar)],
      phone && ['Phone', h(phone)],
      instagram && ['Instagram', h(instagram)],
      more && ['About', h(more)],
      source && ['Source', h(source)],
    ], { mb: '0' }),
  })
}

export async function POST(request) {
  const ip = getClientIp(request)
  if (ip && await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { name, email, year, carMake, carModel, phone, instagram, more, source, isMember, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Full name is required.' }, { status: 400 })
  if (!email?.trim() || !isValidEmail(email))
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  if (!year?.trim())
    return Response.json({ error: 'Car year is required.' }, { status: 400 })
  if (!carMake?.trim())
    return Response.json({ error: 'Car make is required.' }, { status: 400 })
  if (!carModel?.trim())
    return Response.json({ error: 'Car model is required.' }, { status: 400 })

  const normalEmail = email.toLowerCase().trim()

  // Verify member status entirely server-side, from the request's own
  // session cookie — never from a client-supplied isMember flag. This route
  // has no auth requirement, so a spoofed isMember:true with any real
  // member's email used to skip the review-flow requirement and overwrite
  // that member's applications row with arbitrary data. Requiring the
  // AUTHENTICATED session's own email to match the submitted email closes
  // that — only someone actually logged in as that member gets treated as one.
  let verifiedMember = false
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email && user.email.toLowerCase().trim() === normalEmail) {
        const { data: member } = await createAdminClient().from('members').select('id').eq('id', user.id).maybeSingle()
        verifiedMember = !!member
      }
    } catch { /* fall through — treat as non-member */ }
  }

  const VALID_SOURCES = ['Instagram','Facebook','Friend / Word of mouth','Google','Other']
  if (!verifiedMember && (!source || !VALID_SOURCES.includes(source)))
    return Response.json({ error: 'Please tell us how you heard about us.' }, { status: 400 })

  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (carModel.length > 100) return Response.json({ error: 'Car model too long.' }, { status: 400 })

  const fullCarModel = [carMake, carModel].filter(Boolean).join(' ')
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
      // Snapshot of what was actually submitted for THIS event — see the same
      // key on hello-to-montebello-register/route.js for why this exists.
      details: {
        car_year: year.trim(), car_make: carMake?.trim() || null, car_model: fullCarModel,
        phone: phone || null, instagram: instagram ? instagram.trim().replace(/^@+/, '') : null,
        more: more || null, source: source || null,
      },
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
