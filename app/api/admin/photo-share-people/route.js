import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { normalizeEmail } from '../../../../lib/normalizeEmail'

// Lists every non-member with a photo share, newest first, with folder and
// photo counts — the "people" list is the entry point into the whole
// feature (search/click a person → see their event folders → open one).
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: people, error }, { data: folders }, { data: items }] = await Promise.all([
    supabase.from('photo_share_people').select('*').order('created_at', { ascending: false }),
    supabase.from('photo_share_folders').select('id, person_id'),
    supabase.from('photo_share_items').select('folder_id'),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const folderCountByPerson = new Map()
  const folderToPerson = new Map()
  for (const f of (folders || [])) {
    folderCountByPerson.set(f.person_id, (folderCountByPerson.get(f.person_id) || 0) + 1)
    folderToPerson.set(f.id, f.person_id)
  }
  const photoCountByPerson = new Map()
  for (const i of (items || [])) {
    const personId = folderToPerson.get(i.folder_id)
    if (!personId) continue
    photoCountByPerson.set(personId, (photoCountByPerson.get(personId) || 0) + 1)
  }

  return Response.json((people || []).map(p => ({
    ...p,
    folderCount: folderCountByPerson.get(p.id) || 0,
    photoCount: photoCountByPerson.get(p.id) || 0,
  })))
}

// Creates a new person — or, if the email already exists, just returns the
// existing one. The email is the single password for this person's one
// link (covers every folder/event underneath them), so there must only
// ever be one row per email.
export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body.email).slice(0, 200)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'A valid email is required — it doubles as the access password.' }, { status: 400 })
  }
  const name = (body.name || '').toString().trim().slice(0, 120) || null

  const supabase = createAdminClient()
  // Exact match, not .ilike() — email is already lowercased by
  // normalizeEmail() above and always stored lowercase, so this is a
  // correct case-insensitive match. .ilike() would treat "_" (a perfectly
  // normal character in an email local-part) as a single-character SQL
  // wildcard, matching unrelated emails that merely happen to be the same
  // length.
  const { data: existing } = await supabase.from('photo_share_people').select('*').eq('email', email).maybeSingle()
  if (existing) return Response.json({ ...existing, existed: true })

  const { data: person, error } = await supabase.from('photo_share_people')
    .insert({ name, email }).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAdminAction(supabase, adminUser?.email, {
    action: 'photo_share_person.create', entityType: 'photo_share_person', entityId: person.id, entityName: name || email,
  })
  return Response.json(person)
}
