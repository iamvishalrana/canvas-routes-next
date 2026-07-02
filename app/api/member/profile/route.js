import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureMessage } from '../../../../lib/sentry.js'

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const allowed = ['name', 'phone', 'instagram', 'car_year', 'car_make', 'car_model', 'dob_day', 'dob_month', 'dob_year', 'cars']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  if (Object.keys(update).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  if ('name' in update && !update.name?.trim()) return Response.json({ error: 'Name cannot be empty.' }, { status: 400 })

  const admin = createAdminClient()
  const { error, count } = await admin.from('members').update({ ...update }, { count: 'exact' }).eq('id', user.id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  if (count === 0) return Response.json({ error: 'Member not found' }, { status: 404 })

  // Sync shared fields to the applications row (joined by email) — otherwise
  // the admin Applications/Contacts screens keep showing stale data after a
  // member edits their own profile. Same legs as the admin members PATCH.
  const memberEmail = user.email?.toLowerCase().trim()
  if (memberEmail) {
    const appSync = {}
    if ('name' in update) appSync.name = update.name?.trim() || null
    if ('phone' in update) appSync.phone = update.phone || null
    if ('instagram' in update) appSync.instagram = update.instagram || null
    if ('dob_month' in update) appSync.dob_month = update.dob_month ?? null
    if ('dob_day' in update) appSync.dob_day = update.dob_day ?? null
    if ('dob_year' in update) appSync.dob_year = update.dob_year ?? null
    if ('cars' in update || 'car_year' in update || 'car_make' in update || 'car_model' in update) {
      const primary = (update.cars || [])[0] || {}
      if (primary.year || update.car_year) appSync.car_year = primary.year || update.car_year || null
      const combined = [primary.make || update.car_make, primary.model || update.car_model].filter(Boolean).join(' ')
      if (combined) appSync.car_model = combined
      appSync.car_make = primary.make || update.car_make || null
      if ('paint' in primary) appSync.car_paint = primary.paint || null
    }
    if (Object.keys(appSync).length > 0) {
      const { error: syncErr } = await admin.from('applications').update(appSync).eq('email', memberEmail)
      if (syncErr) captureMessage('Member self-profile→application sync failed', { error: syncErr.message, email: memberEmail })
    }
  }

  return Response.json({ success: true })
}
