import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { applicationId, eventName } = await request.json().catch(() => ({}))
  if (!applicationId || !eventName) return Response.json({ error: 'applicationId and eventName required.' }, { status: 400 })
  const supabase = createAdminClient()

  const { data: existing } = await supabase.from('rsvp_tokens')
    .select('id').eq('application_id', applicationId).eq('event_name', eventName).maybeSingle()

  let error
  if (existing) {
    ;({ error } = await supabase.from('rsvp_tokens')
      .update({ declined_at: new Date().toISOString() })
      .eq('application_id', applicationId).eq('event_name', eventName))
  } else {
    ;({ error } = await supabase.from('rsvp_tokens').insert({
      application_id: applicationId,
      event_name: eventName,
      declined_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

export async function DELETE(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { applicationId, eventName } = await request.json().catch(() => ({}))
  if (!applicationId || !eventName) return Response.json({ error: 'applicationId and eventName required.' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('rsvp_tokens')
    .update({ declined_at: null })
    .eq('application_id', applicationId).eq('event_name', eventName)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
