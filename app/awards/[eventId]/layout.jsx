import { createAdminClient } from '../../../lib/supabase/admin'

function formatDate(dateStr) {
  if (!dateStr) return ''
  // events.date is a DATE column (no time) — parse as UTC so it doesn't shift
  // a day back/forward depending on the server's local timezone offset.
  const d = new Date(`${dateStr}T00:00:00Z`)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export async function generateMetadata({ params }) {
  const { eventId } = await params
  const admin = createAdminClient()
  const { data: ev } = await admin.from('events').select('name, date, photo_url').eq('id', eventId).maybeSingle()

  const title = ev ? `Route Awards — ${ev.name}` : 'Route Awards'
  const description = ev
    ? `Vote for the route's best from ${ev.name}. You can't vote for yourself.`
    : "Vote for the route's best. You can't vote for yourself."

  const ogParams = new URLSearchParams({ type: 'event', title: 'Route Awards' })
  if (ev?.name) ogParams.set('date', formatDate(ev.date) ? `${ev.name} · ${formatDate(ev.date)}` : ev.name)
  if (ev?.photo_url) ogParams.set('bg', ev.photo_url)
  const ogImage = `https://canvasroutes.com/api/og?${ogParams.toString()}`

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'Canvas Routes',
      url: `https://canvasroutes.com/awards/${eventId}`,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default function AwardsEventLayout({ children }) {
  return children
}
