import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import UpcomingRoadtrips from '../../../../components/UpcomingRoadtrips'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Upcoming Routes | Canvas Routes' } }

export default async function MemberRoadtripsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/members/login')

  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('name').eq('id', user.id).maybeSingle()

  return <UpcomingRoadtrips embedded isMember memberName={member?.name || ''} memberEmail={user.email || ''} />
}
