import { requireAdmin } from '../../../lib/supabase/authCheck'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const admin = await requireAdmin()
  if (!admin) redirect('/members/login')
  return <SettingsClient />
}
