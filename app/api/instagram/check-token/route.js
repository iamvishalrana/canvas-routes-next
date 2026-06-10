import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureMessage } from '../../../../lib/sentry'

async function sendAlert(subject, body) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: 'info@canvasroutes.com',
      subject,
      text: body,
    }),
  }).catch(() => {})
}

async function checkToken() {
  const supabase = createAdminClient()

  let token = process.env.INSTAGRAM_ACCESS_TOKEN
  const { data: row } = await supabase.from('settings').select('value').eq('key', 'instagram_access_token').maybeSingle()
  if (row?.value) token = row.value
  if (!token) {
    await sendAlert('⚠️ Canvas Routes — Instagram token missing', 'No Instagram access token is configured. The gallery will not show. Go to Admin → Tools → Instagram Token to set one.')
    return { status: 'missing' }
  }

  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  const res = await fetch(`https://graph.facebook.com/${accountId}/media?fields=id&limit=1&access_token=${token}`)
  const data = await res.json()

  if (data.error) {
    captureMessage('Instagram token check failed', {
      error: data.error.message,
      code: data.error.code,
      type: data.error.type,
      accountId,
    })
    await sendAlert(
      '🚨 Canvas Routes — Instagram gallery is broken',
      `The Instagram access token is no longer valid.\n\nError: ${data.error.message}\n\nTo fix it:\n1. Go to https://developers.facebook.com/tools/explorer/\n2. Select the Canvas Routes app\n3. Generate a new token (instagram_basic + pages_read_engagement)\n4. Go to canvasroutes.com/admin → Tools → Instagram Token → paste the token and click Save New Token\n\nThe gallery will reappear within a minute.`
    )
    return { status: 'dead', error: data.error.message }
  }

  // Check days remaining
  const { data: expiryRow } = await supabase.from('settings').select('value').eq('key', 'instagram_token_expires_at').maybeSingle()
  if (expiryRow?.value && expiryRow.value !== 'never') {
    const daysLeft = Math.round((new Date(expiryRow.value) - Date.now()) / 86400000)
    if (daysLeft < 14) {
      await sendAlert(
        `⚠️ Canvas Routes — Instagram token expires in ${daysLeft} days`,
        `Your Instagram token expires on ${new Date(expiryRow.value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.\n\nGo to canvasroutes.com/admin → Tools → Instagram Token → click "Extend Current Token" to renew it for another 60 days.`
      )
      return { status: 'expiring_soon', daysLeft }
    }
    return { status: 'ok', daysLeft }
  }

  // System User token — never expires
  if (expiryRow?.value === 'never') return { status: 'ok', daysLeft: null, tokenType: 'system_user' }
  return { status: 'ok' }
}

// Daily cron — GET with Authorization: Bearer {CRON_SECRET}
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await checkToken()
  return Response.json(result)
}

// Manual check from admin
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const result = await checkToken()
  return Response.json(result)
}
