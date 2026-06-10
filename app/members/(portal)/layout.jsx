import { createClient } from '../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import MembersNav from '../../../components/MembersNav'
import MembersCar from '../../../components/MembersCar'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Members Portal | Canvas Routes' } }

export default async function PortalLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/members/login')
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  const isAdmin = user && adminEmails.includes(user.email)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif' }}>
      <MembersNav email={user?.email} isAdmin={isAdmin} />
      <MembersCar />
      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '3rem 2rem 6rem' }} className="portal-main">
        {children}
      </main>
      <style>{`
        @media (max-width: 640px) {
          .portal-main { padding: 1.75rem 1rem 3rem !important; }
        }
      `}</style>
    </div>
  )
}
