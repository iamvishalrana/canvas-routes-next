import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: members }, { data: applications }] = await Promise.all([
    supabase.from('members').select('name, email, dob_month, dob_day').not('dob_month', 'is', null).not('dob_day', 'is', null).not('email', 'is', null),
    supabase.from('applications').select('name, email, dob_month, dob_day').not('dob_month', 'is', null).not('dob_day', 'is', null).not('email', 'is', null),
  ])

  // Deduplicate by email — member record wins
  const seen = new Set()
  const all = []
  for (const m of (members || [])) { seen.add(m.email?.toLowerCase()); all.push({ ...m, type: 'member' }) }
  for (const a of (applications || [])) { if (!seen.has(a.email?.toLowerCase())) all.push({ ...a, type: 'application' }) }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const birthdays = []

  for (const m of all) {
    if (!m.dob_month || !m.dob_day || m.dob_day < 1 || m.dob_day > 31 || m.dob_month < 1 || m.dob_month > 12) continue
    let bday = new Date(today.getFullYear(), m.dob_month - 1, m.dob_day)
    if (bday < today) bday = new Date(today.getFullYear() + 1, m.dob_month - 1, m.dob_day)
    const daysUntil = Math.round((bday - today) / (1000 * 60 * 60 * 24))
    birthdays.push({
      name: m.name || m.email,
      email: m.email,
      type: m.type,
      month: m.dob_month,
      day: m.dob_day,
      daysUntil,
    })
  }

  // Sort by month/day so any month view is already ordered
  birthdays.sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day)
  return Response.json(birthdays)
}
