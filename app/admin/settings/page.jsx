import SettingsClient from './SettingsClient'

export const metadata = { title: 'Settings' }

// Auth is already enforced by middleware.js for every /admin/:path* request — no need to re-check here.
export default function SettingsPage() {
  return <SettingsClient />
}
