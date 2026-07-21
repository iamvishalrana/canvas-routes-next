import { isSameEvent } from './eventCheckinShared.js'

// Durable, per-event proof of payment. `applications.stripe_payment_status`
// is ONE column shared across every paid flow a member ever touches
// (membership, WTET, every road trip — see CLAUDE.md rule 22), so any
// register route's "already registered" check that reads it directly gives
// a false negative the moment the member starts a second flow (that flow's
// own 'pending' write clobbers the column). registrations[] is already
// per-event; this stamps `paid: true` onto the matching entry so duplicate
// checks can read that instead, immune to unrelated flows overwriting it.
export async function markRegistrationPaid(supabase, email, eventName) {
  const normalEmail = (email || '').toLowerCase().trim()
  if (!normalEmail || !eventName) return
  const { data: app } = await supabase.from('applications').select('registrations').eq('email', normalEmail).maybeSingle()
  if (!app?.registrations?.length) return
  let changed = false
  const updated = app.registrations.map(r => {
    if (!r.paid && isSameEvent(r.event, eventName)) { changed = true; return { ...r, paid: true } }
    return r
  })
  if (changed) await supabase.from('applications').update({ registrations: updated }).eq('email', normalEmail)
}
