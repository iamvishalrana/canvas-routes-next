import PersonClient from './PersonClient'

export const metadata = { title: 'Non-Member Shares — Admin' }

// Auth is already enforced by middleware.js — no need to re-check here.
export default function SharesPersonPage() {
  return <PersonClient />
}
