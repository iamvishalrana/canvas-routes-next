import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../lib/adminAudit.js'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { claimSharedPhotosForMember } from '../../../../../lib/claimSharedPhotos.js'

// One-tap backfill: for every non-member photo-share recipient who has since
// become a member, MOVE their still-live shared photos into their permanent
// member gallery and off the non-member link. This is what runs automatically
// at invite time and on a member's photos-page view — this route just lets an
// admin trigger it on demand for members who joined before that existed (it
// uses the service-role client, so it needs no member session). Idempotent.
export async function POST() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data: people, error } = await supabase.from('photo_share_people').select('id, email')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const results = []
  let totalMoved = 0
  for (const p of (people || [])) {
    const email = normalizeEmail(p.email)
    if (!email) continue
    const { data: member } = await supabase.from('members').select('id').eq('email', email).maybeSingle()
    if (!member) continue // still a non-member — leave their share alone
    try {
      const r = await claimSharedPhotosForMember(supabase, { memberId: member.id, email })
      totalMoved += r.movedOut || 0
      if ((r.claimed || 0) > 0 || (r.movedOut || 0) > 0) results.push({ email, ...r })
    } catch {
      // claimSharedPhotosForMember already reports to Sentry; keep going
    }
  }

  await logAdminAction(supabase, adminUser?.email, {
    action: 'photo_shares.reclaim', entityType: 'photo_share', entityName: `${results.length} member(s), ${totalMoved} photo(s) moved`,
  })
  return Response.json({ processed: results.length, totalMoved, results })
}
