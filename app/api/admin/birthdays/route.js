import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: members }, { data: applications }] = await Promise.all([
    supabase.from('members').select('name, email, dob_month, dob_day').not('dob_month', 'is', null).not('dob_day', 'is', null),
    supabase.from('applications').select('name, email, dob_month, dob_day').not('dob_month', 'is', null).not('dob_day', 'is', null),
  ])

  // Deduplicate by email — member record wins
  const seen = new Set()
  const all = []
  for (const m of (members || [])) { seen.add(m.email?.toLowerCase()); all.push(m) }
  for (const a of (applications || [])) { if (!seen.has(a.email?.toLowerCase())) all.push(a) }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcoming = []

  for (const m of all) {
    if (!m.dob_month || !m.dob_day) continue
    let bday = new Date(today.getFullYear(), m.dob_month - 1, m.dob_day)
    if (bday < today) bday = new Date(today.getFullYear() + 1, m.dob_month - 1, m.dob_day)
    const daysUntil = Math.round((bday - today) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 30) {
      upcoming.push({
        name: m.name || m.email,
        month: m.dob_month,
        day: m.dob_day,
        daysUntil,
      })
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil)
  return Response.json(upcoming)
}
