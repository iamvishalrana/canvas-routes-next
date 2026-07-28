import SharesPeopleClient from './SharesPeopleClient'

export const metadata = { title: 'Non-Member Shares — Admin' }

// Auth is already enforced by middleware.js — no need to re-check here.
export default function SharesPeoplePage() {
  return <SharesPeopleClient />
}
