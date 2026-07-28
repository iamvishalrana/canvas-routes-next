import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { ensureJerryRegistered } from '../../../../lib/jerryRegistrant.js'

// One-off backfill — registers Jerry as a permanent registrant on every
// EXISTING event, since ensureJerryRegistered() is otherwise only called
// going forward, at event-creation time. Deliberately skips Whips to Eastern
// Townships (WTET): it's a closed, past event with no live traffic per
// standing instruction not to proactively touch it. Not linked from any
// admin UI — meant to be triggered once, then deleted from the codebase.
export async function POST() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const admin = createAdminClient()

  const { data: events, error } = await admin.from('events').select('id, name')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const registered = []
  const skipped = []
  for (const event of (events || [])) {
    if (/whips to eastern townships/i.test(event.name || '')) { skipped.push(event.name); continue }
    await ensureJerryRegistered(admin, event.name)
    registered.push(event.name)
  }

  return Response.json({ success: true, registered, skipped })
}
