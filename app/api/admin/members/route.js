import { captureException, captureMessage } from '../../../../lib/sentry.js'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

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
              <span style="color:rgba(245,241,236,0.35);font-size:12px;">The Canvas Routes team</span>
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

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('members').select('*').order('join_date', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
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
    },
  })
  if (inviteErr) return Response.json({ error: inviteErr.message }, { status: 400 })

  const memberData = {
    id: invited.user.id,
    name: name || null,
    email: email.toLowerCase().trim(),
    membership_status,
    ...(tier && { tier }),
    ...(dob_month != null && { dob_month }),
    ...(dob_day != null && { dob_day }),
    ...(dob_year != null && { dob_year }),
    ...(phone && { phone }),
    ...(instagram && { instagram }),
    ...(cars?.length && { cars }),
  }

  const { error: insertErr } = await supabase.from('members').insert(memberData)
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 })

  // Send custom invite email via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const firstName = (name || email).trim().split(' ')[0]
      const actionLink = invited.properties?.action_link ?? ''

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Canvas Routes <membership@canvasroutes.com>',
          to: email,
          reply_to: 'info@canvasroutes.com',
          subject: "You're in — Canvas Routes 2026",
          html: inviteHtml({ firstName, tier, actionLink }),
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown')
        console.error('Invite email send error:', errText)
        captureMessage(`Member invite email failed — ${email}`, { response: errText })
      }
    } catch (err) {
      console.error('Invite email network error:', err)
      captureException(err, { context: 'member-invite-email-network', email })
    }
  } else {
    console.warn('RESEND_API_KEY not set — invite email not sent.')
  }

  return Response.json({ success: true })
}
