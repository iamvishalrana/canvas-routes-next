import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

const SETTINGS_KEY = 'event_links'

async function getLinks(supabase) {
  const { data } = await supabase.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
  try { return data?.value ? JSON.parse(data.value) : [] } catch { return [] }
}

async function saveLinks(supabase, links) {
  const { error } = await supabase.from('settings').upsert({ key: SETTINGS_KEY, value: JSON.stringify(links) }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
}

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const supabase = createAdminClient()
  return Response.json(await getLinks(supabase))
}

export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const { name, url, password, eventDate, notes } = await request.json().catch(() => ({}))
  if (!name?.trim()) return Response.json({ error: 'Name is required.' }, { status: 400 })
  if (!url?.trim()) return Response.json({ error: 'URL is required.' }, { status: 400 })
  try {
    const supabase = createAdminClient()
    const links = await getLinks(supabase)
    const newLink = {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
      password: password?.trim() || '',
      eventDate: eventDate || null,
      notes: notes?.trim() || '',
      archived: false,
      createdAt: new Date().toISOString(),
    }
    links.push(newLink)
    await saveLinks(supabase, links)
    return Response.json(newLink)
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to save link.' }, { status: 500 })
  }
}

export async function PATCH(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const { id, ...updates } = await request.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'ID required.' }, { status: 400 })
  try {
    const supabase = createAdminClient()
    const links = await getLinks(supabase)
    const idx = links.findIndex(l => l.id === id)
    if (idx === -1) return Response.json({ error: 'Link not found.' }, { status: 404 })
    links[idx] = { ...links[idx], ...updates }
    await saveLinks(supabase, links)
    return Response.json(links[idx])
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to update link.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const { id } = await request.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'ID required.' }, { status: 400 })
  try {
    const supabase = createAdminClient()
    const links = (await getLinks(supabase)).filter(l => l.id !== id)
    await saveLinks(supabase, links)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to delete link.' }, { status: 500 })
  }
}
