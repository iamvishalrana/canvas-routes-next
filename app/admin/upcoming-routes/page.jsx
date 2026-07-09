import RoadtripsAdminClient from './RoadtripsAdminClient'

export const metadata = { title: 'Upcoming Routes — Admin' }

// Auth is enforced by middleware.js. Data is fetched client-side.
export default function RoadtripsAdminPage() {
  return <RoadtripsAdminClient />
}
