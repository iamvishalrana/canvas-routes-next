import { notFound } from 'next/navigation'
import { createAdminClient } from '../../../lib/supabase/admin'
import { listEventRegistrants } from '../../../lib/eventCheckinShared.js'
import MeetRegisterForm from './MeetRegisterForm'

async function getEvent(id) {
  const admin = createAdminClient()
  const { data } = await admin.from('events')
    .select('id, name, date, date_display, location, description, public_registration_enabled, registration_opens_at, registration_closes_at, photo_url, capacity')
    .eq('id', id).maybeSingle()
  return data
}

// Server-computed so the client never needs its own registrants fetch just
// to show a count — same registrant list (and same declined-doesn't-count
// exclusion) the register route itself enforces capacity against, so the
// number displayed can never drift from what actually gates a submission.
async function getSpotsLeft(ev) {
  if (!ev.capacity) return null
  try {
    const admin = createAdminClient()
    const registrants = await listEventRegistrants(admin, ev.id, ev.name)
    return Math.max(0, ev.capacity - registrants.length)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const ev = await getEvent(id)
  if (!ev) return { title: 'Event — Canvas Routes' }
  const title = `${ev.name} — Canvas Routes`
  const description = ev.description?.trim()
    || `Register for ${ev.name}${ev.date_display ? ` on ${ev.date_display}` : ''}${ev.location ? ` at ${ev.location}` : ''}. Free to attend.`
  return {
    title,
    description,
    openGraph: { title, description, images: ev.photo_url ? [{ url: ev.photo_url }] : undefined },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function MeetPage({ params }) {
  const { id } = await params
  const ev = await getEvent(id)
  if (!ev) notFound()
  const spotsLeft = await getSpotsLeft(ev)
  return <MeetRegisterForm event={ev} spotsLeft={spotsLeft} />
}
