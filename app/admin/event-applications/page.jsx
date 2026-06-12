import { Suspense } from 'react'
import EventApplicationsClient from './EventApplicationsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Event Applications — Admin' }

export default function EventApplicationsPage() {
  return (
    <Suspense>
      <EventApplicationsClient />
    </Suspense>
  )
}
