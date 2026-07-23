import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'

const VALID_SECTIONS = ['trip_details', 'waiver', 'lunch', 'car_photo']

// Every check-in section is immutable once submitted by design (waiver is a
// legal document; trip details/lunch lock in who's riding and eating) — so a
// typo or a correction request has no self-serve fix. Generalizes WTET's
// admin-only waiver-reset escape hatch to all sections, since trip
// details and lunch need the same correction path just as often.
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  const section = body?.section
  if (!email) return Response.json({ error: 'Missing email.' }, { status: 400 })
  if (!VALID_SECTIONS.includes(section)) return Response.json({ error: 'Invalid section.' }, { status: 400 })

  const admin = createAdminClient()

  // car_photo is the only section backed by a storage object — clean it up so
  // a reset doesn't leave an orphaned file behind (a re-submitted photo also
  // won't get a fresh public URL confused with the deleted one).
  if (section === 'car_photo') {
    const { data: existing } = await admin.from('event_checkins').select('car_photo').eq('event_id', eventId).eq('email', email).maybeSingle()
    const url = existing?.car_photo?.url
    const path = url ? url.split('/route-car-photos/')[1]?.split('?')[0] : null
    if (path) await admin.storage.from('route-car-photos').remove([path]).catch(() => {})
  }

  const { error } = await admin.from('event_checkins').update({ [section]: null }).eq('event_id', eventId).eq('email', email)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
