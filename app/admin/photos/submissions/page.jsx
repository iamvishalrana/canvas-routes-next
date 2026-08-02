import SubmissionsClient from './SubmissionsClient'

export const metadata = { title: 'Photo Submissions — Admin' }

// Auth is already enforced by middleware.js — no need to re-check here.
export default function SubmissionsPage() {
  return <SubmissionsClient />
}
