// Shared by every app/api/gallery/[token]/* route that needs to hand back a
// verified visitor's photos — kept in one place so the three call sites
// (request-code has no need, but verify-code and verify/session-check both
// do) can't drift out of sync on what "verified" actually returns.
const BUCKET = 'photo-shares'

export async function loadPersonFolders(admin, person) {
  const { data: folders } = await admin.from('photo_share_folders')
    .select('id, title, expires_at').eq('person_id', person.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const folderIds = (folders || []).map(f => f.id)
  // A photo may be linked into several folders (a shared group shot) — each
  // link is still its own row here, same shape visitors saw before.
  const { data: links } = folderIds.length
    ? await admin.from('photo_share_folder_items').select('id, folder_id, caption, photo:photo_share_photos(storage_path, original_path)').in('folder_id', folderIds)
    : { data: [] }

  const itemsByFolder = new Map()
  for (const i of (links || [])) {
    if (!i.photo) continue
    if (!itemsByFolder.has(i.folder_id)) itemsByFolder.set(i.folder_id, [])
    const { data: { publicUrl: url } } = admin.storage.from(BUCKET).getPublicUrl(i.photo.storage_path)
    const { data: { publicUrl: originalUrl } } = admin.storage.from(BUCKET).getPublicUrl(i.photo.original_path || i.photo.storage_path)
    itemsByFolder.get(i.folder_id).push({ id: i.id, url, originalUrl, caption: i.caption || null })
  }

  return (folders || []).map(f => ({
    id: f.id, title: f.title, expiresAt: f.expires_at, photos: itemsByFolder.get(f.id) || [],
  }))
}
