import { captureException, captureMessage } from '../../../../../../lib/sentry.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { checkRateLimit } from '../../../../../../lib/rateLimit'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function inviteHtml({ firstName, tier, actionLink }) {
  const tierLabel = tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're in — Canvas Routes 2026</title>
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
            <td style="padding-bottom:16px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">
              Welcome, ${h(firstName)}.
            </td>
          </tr>

          <!-- Warm intro -->
          <tr>
            <td style="padding-bottom:12px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:rgba(245,241,236,0.8);">
              Your membership is confirmed &mdash; glad to have you with us for the 2026 season.
            </td>
          </tr>

          <!-- Second line -->
          <tr>
            <td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:rgba(245,241,236,0.65);">
              This is going to be a good one. Road trips through the Laurentians and beyond, morning meets with the right crowd, and a season built around actually driving. We&apos;ll be in touch with everything you need before we hit the road.
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
                      <!-- Membership row -->
                      <tr>
                        <td>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Your membership</div>
                          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${tierLabel}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding-bottom:16px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="background-color:#c5a882;">
                    <a href="${h(actionLink)}" style="display:block;padding:16px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#0F1E14;text-decoration:none;font-weight:600;">Set up your account &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sign off -->
          <tr>
            <td style="padding-top:28px;padding-bottom:8px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.7;color:rgba(245,241,236,0.55);">
              See you on the road.<br/>
              <span style="color:rgba(245,241,236,0.35);font-size:12px;">Jerry</span>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding-bottom:40px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:rgba(245,241,236,0.3);">
              The setup link above expires in 24 hours. Any questions? Reply here or reach us at <a href="mailto:info@canvasroutes.com" style="color:rgba(245,241,236,0.3);">info@canvasroutes.com</a>.
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

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
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
        from: 'Canvas Routes <membership@canvasroutes.com>',
        to: member.email,
        reply_to: 'info@canvasroutes.com',
        subject: "You're in — Canvas Routes 2026",
        html: inviteHtml({ firstName, tier: member.tier, actionLink }),
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
