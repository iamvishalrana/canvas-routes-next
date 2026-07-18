import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { attendanceKey } from '../../../../lib/eventMeta'
import MembersGalleryTabs from '../../../../components/MembersGalleryTabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Photos | Canvas Routes' } }

export default async function PhotosPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')

  // Not launched to members yet — admin-only preview until albums are ready.
  // To go live: delete this block and restore the Photos links in MembersNav.
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email)) redirect('/members/dashboard')

  const admin = createAdminClient()
  const [{ data: member }, { data: eventPhotos }, { data: personalPhotos }, { data: tagRows }, { data: members }] = await Promise.all([
    admin.from('members').select('event_attendance').eq('id', user.id).maybeSingle(),
    admin.from('gallery_photos').select('id, album, album_date, caption, photo_url, original_url')
      .eq('category', 'event').order('created_at', { ascending: true }),
    admin.from('gallery_photos').select('id, caption, photo_url, original_url')
      .eq('category', 'personal').eq('member_id', user.id).order('created_at', { ascending: true }),
    admin.from('gallery_photo_tags').select('photo_id, member_id'),
    admin.from('members').select('id, name'),
  ])

  // Event albums are only shown to members confirmed as attendees — the same
  // members.event_attendance flag the admin panel already maintains post-event.
  // Tags below are for display only ("Featuring: ...") — they never gate access.
  const attendance = member?.event_attendance || {}
  const nameById = new Map((members || []).map(m => [m.id, m.name]))
  const tagsByPhoto = new Map()
  for (const t of (tagRows || [])) {
    if (!tagsByPhoto.has(t.photo_id)) tagsByPhoto.set(t.photo_id, [])
    const name = nameById.get(t.member_id)
    if (name) tagsByPhoto.get(t.photo_id).push(name)
  }

  const map = new Map()
  for (const p of (eventPhotos || [])) {
    if (attendance[attendanceKey(p.album)] !== true) continue
    if (!map.has(p.album)) map.set(p.album, { name: p.album, date: p.album_date, photos: [] })
    const a = map.get(p.album)
    a.photos.push({ id: p.id, url: p.photo_url, originalUrl: p.original_url, caption: p.caption, tags: tagsByPhoto.get(p.id) || [] })
    if (p.album_date && !a.date) a.date = p.album_date
  }
  const eventAlbums = [...map.values()].sort((x, y) => (y.date || '0000').localeCompare(x.date || '0000'))

  const personalAlbum = {
    name: 'My Car & Personal',
    date: null,
    photos: (personalPhotos || []).map(p => ({ id: p.id, url: p.photo_url, originalUrl: p.original_url, caption: p.caption })),
  }

  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.25rem', fontFamily: 'var(--font-inter), sans-serif' }}>
        Canvas Routes
      </div>
      <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.6rem, 5.5vw, 3.6rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.05, margin: '0 0 1.5rem', letterSpacing: '-0.01em' }}>
        Photos
      </h1>
      <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.8, maxWidth: '520px', margin: '0 0 3rem', fontFamily: 'var(--font-inter), sans-serif' }}>
        Event Photos from meets and drives you attended, plus your own private Car &amp; Personal folder.
      </p>

      <MembersGalleryTabs eventAlbums={eventAlbums} personalAlbum={personalAlbum} />
    </div>
  )
}
