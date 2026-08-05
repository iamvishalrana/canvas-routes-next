import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'
import { PARTNERS } from '../../../../lib/partners'

// Usage view for partners backed by a one-time code pool (partner_codes) —
// lets Jerry see at a glance how many codes are left and who has which one,
// which was previously untracked entirely.
export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const codePartners = PARTNERS.filter(p => p.hasCode)
  if (!codePartners.length) return Response.json({ partners: [] })

  const supabase = createAdminClient()
  const slugs = codePartners.map(p => p.slug)

  const { data: codes, error } = await supabase
    .from('partner_codes')
    .select('partner_slug, code, assigned_to, assigned_at')
    .in('partner_slug', slugs)
  if (error) {
    captureException(new Error(error.message), { context: 'admin-partners-codes' })
    return Response.json({ error: 'Could not load partner codes.' }, { status: 500 })
  }

  const memberIds = [...new Set((codes || []).filter(c => c.assigned_to).map(c => c.assigned_to))]
  let membersById = {}
  if (memberIds.length) {
    const { data: members } = await supabase.from('members').select('id, name, email').in('id', memberIds)
    membersById = Object.fromEntries((members || []).map(m => [m.id, m]))
  }

  const partners = codePartners.map(p => {
    const rows = (codes || []).filter(c => c.partner_slug === p.slug)
    const assignedRows = rows.filter(c => c.assigned_to)
    const sorted = [...rows].sort((a, b) => {
      if (!!a.assigned_at !== !!b.assigned_at) return a.assigned_at ? -1 : 1
      if (a.assigned_at && b.assigned_at) return new Date(b.assigned_at) - new Date(a.assigned_at)
      return a.code.localeCompare(b.code)
    })
    return {
      slug: p.slug,
      name: p.name,
      total: rows.length,
      used: assignedRows.length,
      remaining: rows.length - assignedRows.length,
      codes: sorted.map(c => ({
        code: c.code,
        assigned_at: c.assigned_at,
        member: c.assigned_to ? (membersById[c.assigned_to] || { id: c.assigned_to, name: null, email: null }) : null,
      })),
    }
  })

  return Response.json({ partners })
}
