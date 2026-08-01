import { after } from 'next/server'
import { captureException, captureMessage } from '../../../../lib/sentry.js'
import { attendanceKey } from '../../../../lib/eventMeta.js'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'
import { padForStorage } from '../../../../lib/memberNumber.js'
import { buildMemberInviteEmailHtml, memberInviteEmailText } from '../../../../lib/memberInviteEmail.js'

// Next sequential membership number, computed fresh on every invite. NULLs
// sort first in Postgres on a DESC order by default, so they must be
// excluded explicitly — otherwise this would always read back null instead
// of the actual highest number and hand out "000001" to every new member.
async function nextMembershipNumber(supabase) {
  const { data } = await supabase.from('members')
    .select('membership_number')
    .not('membership_number', 'is', null)
    .order('membership_number', { ascending: false })
    .limit(1)
  const highest = data?.[0]?.membership_number
  const n = highest && /^\d+$/.test(highest) ? parseInt(highest, 10) + 1 : 1
  return padForStorage(n)
}

export async function GET(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('members').select('*').order('join_date', { ascending: false })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const { name, email, membership_status = 'pending', tier, dob_month, dob_day, dob_year, phone, instagram, cars } = await request.json()
  if (!email?.trim()) return Response.json({ error: 'Email required.' }, { status: 400 })

  const supabase = createAdminClient()

  // Generate invite link without sending Supabase's default email
  const { data: invited, error: inviteErr } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/members/reset-password`,
      expiresIn: 604800, // 7 days
    },
  })
  if (inviteErr) return Response.json({ error: inviteErr.message }, { status: 400 })

  // Auto-assign the next sequential membership number — previously every
  // invite left this null, so an admin had to remember to go edit the new
  // member afterward just to give them a number (and until they did, the
  // member showed no #badge and sorted to the top/bottom of the "Member #"
  // view instead of in season order). Still fully editable afterward via
  // the normal Edit panel if it needs correcting.
  const membershipNumber = await nextMembershipNumber(supabase)

  const memberData = {
    id: invited.user.id,
    name: name || null,
    email: email.toLowerCase().trim(),
    membership_status,
    membership_number: membershipNumber,
    ...(tier && { tier }),
    ...(dob_month != null && { dob_month }),
    ...(dob_day != null && { dob_day }),
    ...(dob_year != null && { dob_year }),
    ...(phone && { phone }),
    ...(instagram && { instagram }),
    ...(cars?.length && { cars }),
  }

  const { error: insertErr } = await supabase.from('members').insert(memberData)
  if (insertErr) {
    await supabase.auth.admin.deleteUser(invited.user.id).catch(() => {})
    return Response.json({ error: insertErr.message }, { status: 500 })
  }

  // Carry the person's event history from their application into the new
  // member row — otherwise attendance shown on Applications/Contacts never
  // appears on the Members screen for freshly invited members.
  try {
    const { data: app } = await supabase.from('applications')
      .select('registrations').eq('email', memberData.email).maybeSingle()
    if (app?.registrations?.length) {
      const event_attendance = {}
      for (const reg of app.registrations) {
        if (reg?.event) event_attendance[attendanceKey(reg.event)] = reg.attended ?? null
      }
      if (Object.keys(event_attendance).length > 0) {
        const { error: attErr } = await supabase.from('members').update({ event_attendance }).eq('id', invited.user.id)
        if (attErr) captureMessage('Member create: attendance backfill failed', { error: attErr.message, email: memberData.email })
      }
    }
  } catch (err) {
    captureException(err, { context: 'member-create-attendance-backfill', email: memberData.email })
  }

  // Invite email in after() — rule #8: bare fire-and-forget gets killed when
  // Vercel tears the function down after the response; after() keeps it alive.
  if (process.env.RESEND_API_KEY) {
    const firstName = (name || email).trim().split(' ')[0]
    const actionLink = invited.properties?.action_link ?? ''
    after(() => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: email,
        reply_to: 'jerry@canvasroutes.com',
        subject: "You're in — Canvas Routes 2026",
        html: buildMemberInviteEmailHtml({ firstName, tier, actionLink }),
        text: memberInviteEmailText({ firstName, actionLink }),
      }),
    }).then(res => {
      if (!res.ok) res.text().then(t => captureMessage(`Member invite email failed — ${email}`, { response: t })).catch(() => {})
    }).catch(err => captureException(err, { context: 'member-invite-email-network', email })))
  }

  await logAdminAction(supabase, adminUser?.email, {
    action: 'member.invite', entityType: 'member', entityId: invited.user.id,
    entityName: name || email.toLowerCase().trim(),
    metadata: { tier: tier || 'routes_member', status: membership_status, membership_number: membershipNumber },
  })
  return Response.json({ success: true, membershipNumber })
}
