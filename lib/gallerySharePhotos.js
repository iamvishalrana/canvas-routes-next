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
  const { data: items } = folderIds.length
    ? await admin.from('photo_share_items').select('id, folder_id, storage_path, original_path').in('folder_id', folderIds)
    : { data: [] }

  const itemsByFolder = new Map()
  for (const i of (items || [])) {
    if (!itemsByFolder.has(i.folder_id)) itemsByFolder.set(i.folder_id, [])
    const { data: { publicUrl: url } } = admin.storage.from(BUCKET).getPublicUrl(i.storage_path)
    const { data: { publicUrl: originalUrl } } = admin.storage.from(BUCKET).getPublicUrl(i.original_path || i.storage_path)
    itemsByFolder.get(i.folder_id).push({ id: i.id, url, originalUrl, caption: null })
  }

  return (folders || []).map(f => ({
    id: f.id, title: f.title, expiresAt: f.expires_at, photos: itemsByFolder.get(f.id) || [],
  }))
}
