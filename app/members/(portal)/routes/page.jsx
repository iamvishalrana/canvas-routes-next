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
    .select('name, phone, dob_month, dob_day, car_year, car_make, car_model, cars')
    .eq('id', user.id).maybeSingle()

  // Primary car: garage first entry, falling back to the legacy columns —
  // same resolution as the member card page.
  const primaryCar = member?.cars?.[0]
  const carLine = [
    (primaryCar?.year || member?.car_year)?.toString().trim(),
    (primaryCar?.make || member?.car_make)?.trim(),
    (primaryCar?.model || member?.car_model)?.trim(),
  ].filter(Boolean).join(' ')

  // Registrations need a complete profile — the required fields are starred
  // on /members/profile. Email always exists (it's the auth identity).
  const profileMissing = []
  if (!member?.name?.trim()) profileMissing.push('Full name')
  if (!member?.phone?.trim()) profileMissing.push('Phone')
  if (!member?.dob_month || !member?.dob_day) profileMissing.push('Date of birth')
  if (!carLine) profileMissing.push('Car (year, make, model)')

  return (
    <UpcomingRoadtrips
      embedded
      isMember
      memberName={member?.name || ''}
      memberEmail={user.email || ''}
      memberPhone={member?.phone || ''}
      memberCar={carLine}
      profileMissing={profileMissing}
    />
  )
}
