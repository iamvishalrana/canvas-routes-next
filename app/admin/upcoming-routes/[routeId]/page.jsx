import RouteCheckinClient from './RouteCheckinClient'

export const metadata = { title: 'Registrants & Check-in — Admin' }

// Auth is already enforced by middleware.js — no need to re-check here.
export default function RouteCheckinPage() {
  return <RouteCheckinClient />
}
