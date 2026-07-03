import { createClient } from '../../../lib/supabase/server'
import { redirect } from 'next/navigation'
import MembersNav from '../../../components/MembersNav'
import MembersCar from '../../../components/MembersCar'
import PortalTransition from '../../../components/PortalTransition'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Members Portal | Canvas Routes' } }

export default async function PortalLayout({ children }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  const isAdmin = user && adminEmails.includes(user.email)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif' }}>
      <MembersNav email={user?.email} isAdmin={isAdmin} />
      <MembersCar />
      {/* viewport-fit=cover extends the page under the iOS home indicator /
          collapsed toolbar — without the safe-area inset the last content on
          every portal screen sits in that covered zone and rubber-bands back
          when pulled up. env() is 0 on devices without an inset. */}
      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '3rem 2rem calc(6rem + env(safe-area-inset-bottom))' }} className="portal-main">
        <PortalTransition>{children}</PortalTransition>
      </main>
      <style>{`
        @media (max-width: 640px) {
          .portal-main { padding: 1.75rem 1rem calc(4.5rem + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
    </div>
  )
}
