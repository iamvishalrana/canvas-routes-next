import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { attendanceKey, attendanceKeyToEventName } from '../../../../lib/eventMeta'
import { claimSharedPhotosForMember } from '../../../../lib/claimSharedPhotos'
import MembersGalleryTabs from '../../../../components/MembersGalleryTabs'
import FadeUp from '../../../../components/FadeUp'
import { membersPhotosT } from '../../../../lib/i18n/membersPhotos'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Photos | Canvas Routes' } }

export default async function PhotosPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')

  const admin = createAdminClient()

  // If this member was sent photos as a non-member before joining, permanently
  // copy them into their own gallery now (idempotent — safe on every load).
  // Runs BEFORE the personal-photos read below so freshly-claimed photos are
  // included in this very render. This is both the backfill path for members
  // who joined before the feature existed and a safety net if the invite-time
  // claim (app/api/admin/members) ever failed. See lib/claimSharedPhotos.js.
  if (user.email) {
    try { await claimSharedPhotosForMember(admin, { memberId: user.id, email: user.email }) }
    catch { /* best-effort — failures are captured inside the helper */ }
  }

  const [{ data: member }, { data: eventPhotos }, { data: personalPhotos }, { data: tagRows }, { data: members }] = await Promise.all([
    admin.from('members').select('event_attendance, language').eq('id', user.id).maybeSingle(),
    admin.from('gallery_photos').select('id, album, album_date, caption, photo_url, original_url')
      .eq('category', 'event').order('created_at', { ascending: true }),
    admin.from('gallery_photos').select('id, caption, photo_url, original_url')
      .eq('category', 'personal').eq('member_id', user.id).order('created_at', { ascending: true }),
    admin.from('gallery_photo_tags').select('photo_id, member_id'),
    admin.from('members').select('id, name'),
  ])

  const lang = member?.language === 'fr' ? 'fr' : 'en'
  const tt = membersPhotosT[lang]

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
    name: tt.myCarAndPersonal,
    date: null,
    photos: (personalPhotos || []).map(p => ({ id: p.id, url: p.photo_url, originalUrl: p.original_url, caption: p.caption })),
  }

  // Independent of gallery_photos — a member may have attended an event
  // nothing's been posted for yet, and should still be able to reach this
  // page to submit photos of their own for it.
  const attendedEventNames = Object.entries(attendance)
    .filter(([, attended]) => attended === true)
    .map(([key]) => attendanceKeyToEventName(key))

  // Mirrors the nav link's visibility (see memberHasGalleryPhotos) — a direct
  // hit on this URL (bookmark, stale link) shouldn't land on an empty page
  // just because the nav correctly hid the link. Attended-but-photo-less
  // members still get in, so they can use the upload feature below.
  if (eventAlbums.length === 0 && personalAlbum.photos.length === 0 && attendedEventNames.length === 0) redirect('/members/dashboard')

  return (
    <div>
      <FadeUp delay={0}>
        <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.25rem', fontFamily: 'var(--font-inter), sans-serif' }}>
          {tt.eyebrow}
        </div>
      </FadeUp>
      <FadeUp delay={80}>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.6rem, 5.5vw, 3.6rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.05, margin: '0 0 1.5rem', letterSpacing: '-0.01em' }}>
          {tt.title}
        </h1>
      </FadeUp>
      <FadeUp delay={160}>
        <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.8, maxWidth: '520px', margin: '0 0 3rem', fontFamily: 'var(--font-inter), sans-serif' }}>
          {tt.subtitle}
        </p>
      </FadeUp>

      <FadeUp delay={200}>
        {/* Reassurance: grid/lightbox previews are downsized (next/image) so
            the page loads fast — the Download button always serves the full-
            resolution original. Hardcoded bilingually here rather than in the
            shared i18n file, which has unrelated uncommitted edits. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '11px', color: '#8A6535', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.25)', borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '1.5rem', fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1.55 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A6535" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>{lang === 'fr'
            ? 'Les aperçus sont compressés pour un chargement rapide — chaque téléchargement est l’original en pleine résolution.'
            : 'Previews are compressed so they load quickly — every download is the full-resolution original.'}</span>
        </div>
      </FadeUp>

      <FadeUp delay={220}>
        <MembersGalleryTabs eventAlbums={eventAlbums} personalAlbum={personalAlbum} attendedEventNames={attendedEventNames} lang={lang} />
      </FadeUp>
    </div>
  )
}
