import { notFound } from 'next/navigation'
import { createAdminClient } from '../../../lib/supabase/admin'
import MeetRegisterForm from './MeetRegisterForm'

async function getEvent(id) {
  const admin = createAdminClient()
  const { data } = await admin.from('events')
    .select('id, name, date, date_display, location, description, public_registration_enabled, registration_opens_at, registration_closes_at, photo_url')
    .eq('id', id).maybeSingle()
  return data
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
  return <MeetRegisterForm event={ev} />
}
