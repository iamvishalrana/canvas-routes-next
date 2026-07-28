import FolderClient from './FolderClient'

export const metadata = { title: 'Non-Member Shares — Admin' }

// Auth is already enforced by middleware.js — no need to re-check here.
export default function SharesFolderPage() {
  return <FolderClient />
}
