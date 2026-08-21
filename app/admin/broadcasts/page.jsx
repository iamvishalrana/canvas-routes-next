import BroadcastsClient from './BroadcastsClient'

// force-dynamic — BroadcastsClient reads ?email= via useSearchParams() (the
// EmailLink shortcut from Members/Applications/Contacts), which requires a
// Suspense boundary on a statically-generated page. Opting the whole route
// out of static generation sidesteps that instead of adding a boundary.
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Broadcasts' }

export default function BroadcastsPage() {
  return <BroadcastsClient />
}
