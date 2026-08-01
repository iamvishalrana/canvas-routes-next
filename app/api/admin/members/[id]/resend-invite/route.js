import { captureException, captureMessage } from '../../../../../../lib/sentry.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { buildMemberInviteEmailHtml, memberInviteEmailText } from '../../../../../../lib/memberInviteEmail.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()

  // Look up member to get email and tier
  const { data: member, error: memberErr } = await supabase.from('members').select('email, name, tier, password_set_at').eq('id', id).single()
  if (memberErr || !member) return Response.json({ error: 'Member not found' }, { status: 404 })

  if (member.password_set_at) {
    return Response.json({ error: 'This member has already set up their account.' }, { status: 409 })
  }

  // Generate a new invite link
  const { data: invited, error: inviteErr } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: member.email,
    options: {
      data: { name: member.name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/members/reset-password`,
      expiresIn: 604800, // 7 days
    },
  })
  if (inviteErr) return Response.json({ error: inviteErr.message }, { status: 400 })

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ success: true, warning: 'Invite email was not sent: RESEND_API_KEY is not configured' })
  }

  try {
    const firstName = (member.name || member.email).trim().split(' ')[0]
    const actionLink = invited.properties?.action_link ?? ''

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: member.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: "You're in — Canvas Routes 2026",
        html: buildMemberInviteEmailHtml({ firstName, tier: member.tier, actionLink }),
        text: memberInviteEmailText({ firstName, actionLink }),
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      console.error('Resend invite email error:', errText)
      captureMessage(`Member resend-invite email failed — ${member.email}`, { response: errText })
      return Response.json({ error: 'Invite link was generated but the email failed to send. Check Sentry and resend manually.' }, { status: 500 })
    }
  } catch (err) {
    console.error('Resend invite email network error:', err)
    captureException(err, { context: 'member-resend-invite-email-network', email: member.email })
    return Response.json({ error: 'Invite link was generated but the email failed to send. Check Sentry and resend manually.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
