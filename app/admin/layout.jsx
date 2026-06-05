import { redirect } from 'next/navigation'
import { requireAdmin } from '../../lib/supabase/authCheck'

export const metadata = { title: 'Admin — Canvas Routes' }

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin()
  if (!admin) redirect('/members/login')
  return children
}
