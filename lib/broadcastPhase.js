// A broadcast's lifecycle phase, derived from two nullable columns rather
// than stored as its own status enum — see the migration note in
// app/api/admin/broadcasts/route.js. Shared by the merged Email Activity
// feed (client) and both API routes that gate scheduled-only actions
// (DELETE guard, cancel route) so the three checks can't drift apart.
export function broadcastPhase(b) {
  if (b.canceled_at) return 'canceled'
  if (b.sent_at && new Date(b.sent_at) > new Date()) return 'scheduled'
  return 'sent'
}
