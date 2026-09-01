import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureException } from '../../../../lib/sentry'

// Domain verification / DNS record health, straight from Resend — separate
// from email_events (which only tells you what already happened to sends).
// This catches the "SPF record silently got removed and now everything
// bounces" case before it shows up as a bounce spike.
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Resend is not configured.' }, { status: 503 })

  try {
    const listRes = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    })
    if (!listRes.ok) {
      captureException(new Error(`Resend domains list failed: ${listRes.status}`), { context: 'resend-domains-list' })
      return Response.json({ error: 'Could not reach Resend.' }, { status: 502 })
    }
    const list = await listRes.json()

    // The list endpoint only returns each domain's overall status — per-record
    // SPF/DKIM/DMARC state needs the detail endpoint, one call per domain
    // (there's normally just one domain here, so this stays cheap).
    const domains = await Promise.all((list.data || []).map(async d => {
      try {
        const detailRes = await fetch(`https://api.resend.com/domains/${d.id}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        })
        const detail = detailRes.ok ? await detailRes.json() : null
        return {
          id: d.id,
          name: d.name,
          status: d.status,
          region: d.region,
          records: (detail?.records || []).map(r => ({ record: r.record, type: r.type, name: r.name, status: r.status })),
        }
      } catch {
        return { id: d.id, name: d.name, status: d.status, region: d.region, records: [] }
      }
    }))

    return Response.json({ domains })
  } catch (err) {
    captureException(err, { context: 'resend-domains-fetch' })
    return Response.json({ error: 'Network error.' }, { status: 500 })
  }
}
