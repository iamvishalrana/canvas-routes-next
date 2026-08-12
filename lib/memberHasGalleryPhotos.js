import { attendanceKey } from './eventMeta'
import { normalizeEmail } from './normalizeEmail'

// Whether this member has anything to see on /members/photos — a personal
// photo, at least one photo in an event album they're marked as having
// attended, or a still-live non-member photo share sent to their email
// before they had a portal account. Mirrors the exact gating logic in
// app/members/(portal)/photos/page.jsx so the nav link and the page itself
// never disagree about whether there's content — used to hide the section
// entirely for members with nothing uploaded yet instead of showing them an
// empty page.
export async function memberHasGalleryPhotos(admin, userId, email) {
  const [{ data: member }, { data: personal }, { data: eventPhotos }] = await Promise.all([
    admin.from('members').select('event_attendance').eq('id', userId).maybeSingle(),
    admin.from('gallery_photos').select('id').eq('category', 'personal').eq('member_id', userId).limit(1),
    admin.from('gallery_photos').select('album').eq('category', 'event'),
  ])
  if (personal?.length) return true

  const attendance = member?.event_attendance || {}
  const albums = new Set((eventPhotos || []).map(p => p.album))
  for (const album of albums) {
    if (attendance[attendanceKey(album)] === true) return true
  }

  if (email) {
    const { data: person } = await admin.from('photo_share_people').select('id').eq('email', normalizeEmail(email)).maybeSingle()
    if (person) {
      const { data: liveFolders } = await admin.from('photo_share_folders').select('id')
        .eq('person_id', person.id).gt('expires_at', new Date().toISOString())
      if (liveFolders?.length) {
        const { data: item } = await admin.from('photo_share_items').select('id')
          .in('folder_id', liveFolders.map(f => f.id)).limit(1).maybeSingle()
        if (item) return true
      }
    }
  }
  return false
}
