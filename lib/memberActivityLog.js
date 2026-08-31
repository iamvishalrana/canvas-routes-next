import { createAdminClient } from './supabase/admin'

// Writes to member_activity_log — the member-initiated counterpart to
// lib/adminAudit.js's logAdminAction (admin-initiated actions). Unlike that
// one, this creates its OWN admin client internally rather than requiring
// the caller to pass one: member-facing routes normally run on the
// user-scoped client (RLS-bound to the signed-in member), not an admin
// client, so there's rarely one already on hand to reuse — and a member
// must never be able to write their own log rows directly (the table blocks
// all direct client access), so the insert always goes through the service
// role regardless of what the caller's own client is.
// Never throws: a logging failure should never block the actual member
// action from completing, just get reported to Sentry.
export async function logMemberAction(memberEmail, { action, entityType = null, entityId = null, entityName = null, metadata = {} }) {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('member_activity_log').insert({
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      entity_name: entityName,
      member_email: memberEmail || null,
      metadata,
    })
    if (error) {
      const { captureException } = await import('./sentry.js')
      captureException(new Error(`member_activity_log insert failed: ${error.message}`), { context: 'member-activity-log', action })
    }
  } catch (err) {
    try {
      const { captureException } = await import('./sentry.js')
      captureException(err, { context: 'member-activity-log-unexpected', action })
    } catch {}
  }
}
