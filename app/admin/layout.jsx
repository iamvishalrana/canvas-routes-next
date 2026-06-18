import { redirect } from 'next/navigation'
import { requireAdmin } from '../../lib/supabase/authCheck'
import AdminShell from './_components/AdminShell'

export const metadata = {
  title: { default: 'Admin — Canvas Routes', template: '%s — Admin' },
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CR Admin',
    statusBarStyle: 'black',
  },
}

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin()
  if (!admin) redirect('/members/login')
  return <AdminShell>{children}</AdminShell>
}
