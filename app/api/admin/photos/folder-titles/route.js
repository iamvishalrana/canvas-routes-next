import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

// Distinct folder/album names used anywhere in the photo gallery section —
// non-member share folders (photo_share_folders.title) AND member albums
// (gallery_photos.album, both the 'event' and 'personal' categories) — most-
// recently-used first. One shared pool so the same event name (e.g. "Hello
// to Montebello — August 2026") can be reused exactly everywhere it's typed
// instead of drifting into near-duplicates across the three separate forms
// that create a folder/album (non-member folders, member event albums,
// member personal folders). See PersonClient.jsx and PhotosClient.jsx.
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: shareFolders, error: shareErr }, { data: galleryPhotos, error: galleryErr }] = await Promise.all([
    supabase.from('photo_share_folders').select('title, created_at'),
    supabase.from('gallery_photos').select('album, created_at').not('album', 'is', null),
  ])
  if (shareErr) return Response.json({ error: shareErr.message }, { status: 500 })
  if (galleryErr) return Response.json({ error: galleryErr.message }, { status: 500 })

  const rows = [
    ...(shareFolders || []).map(r => ({ title: r.title, created_at: r.created_at })),
    ...(galleryPhotos || []).map(r => ({ title: r.album, created_at: r.created_at })),
  ].filter(r => r.title && r.title.trim())

  // Keep each title's most recent created_at, then sort newest-used first.
  const latestByTitle = new Map()
  for (const r of rows) {
    const prev = latestByTitle.get(r.title)
    if (!prev || new Date(r.created_at) > new Date(prev)) latestByTitle.set(r.title, r.created_at)
  }
  const titles = [...latestByTitle.entries()]
    .sort((a, b) => new Date(b[1]) - new Date(a[1]))
    .map(([title]) => title)

  return Response.json({ titles })
}
