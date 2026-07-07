// Writes directly to admin_activity_log via the already-open admin client —
// avoids an extra internal HTTP round-trip to /api/admin/activity-log.
// Never throws: an audit-log failure should never block the actual admin
// action from completing, just get reported to Sentry.
export async function logAdminAction(admin, adminEmail, { action, entityType = null, entityId = null, entityName = null, metadata = {} }) {
  try {
    const { error } = await admin.from('admin_activity_log').insert({
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      entity_name: entityName,
      admin_email: adminEmail || null,
      metadata,
    })
    if (error) {
      const { captureException } = await import('./sentry.js')
      captureException(new Error(`admin_activity_log insert failed: ${error.message}`), { context: 'admin-audit-log', action })
    }
  } catch (err) {
    try {
      const { captureException } = await import('./sentry.js')
      captureException(err, { context: 'admin-audit-log-unexpected', action })
    } catch {}
  }
}
