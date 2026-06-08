import { redirect } from 'next/navigation'
import { requireAdmin } from '../../lib/supabase/authCheck'
import AdminSidebar from './_components/AdminSidebar'

export const metadata = { title: 'Admin — Canvas Routes' }

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin()
  if (!admin) redirect('/members/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3' }}>
      <AdminSidebar />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
