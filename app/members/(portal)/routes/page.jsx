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
  const { data: member } = await admin.from('members')
    .select('name, phone, car_year, car_make, car_model, cars')
    .eq('id', user.id).maybeSingle()

  // Primary car: garage first entry, falling back to the legacy columns —
  // same resolution as the member card page.
  const primaryCar = member?.cars?.[0]
  const carLine = [
    (primaryCar?.year || member?.car_year)?.toString().trim(),
    (primaryCar?.make || member?.car_make)?.trim(),
    (primaryCar?.model || member?.car_model)?.trim(),
  ].filter(Boolean).join(' ')

  return (
    <UpcomingRoadtrips
      embedded
      isMember
      memberName={member?.name || ''}
      memberEmail={user.email || ''}
      memberPhone={member?.phone || ''}
      memberCar={carLine}
    />
  )
}
