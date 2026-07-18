import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import MembersGallery from '../../../../components/MembersGallery'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Photos | Canvas Routes' } }

export default async function PhotosPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')

  const admin = createAdminClient()
  const { data: photos } = await admin.from('gallery_photos')
    .select('id, album, album_date, caption, photo_url')
    .order('created_at', { ascending: true })

  // Group into albums, newest event first (undated albums last)
  const map = new Map()
  for (const p of (photos || [])) {
    if (!map.has(p.album)) map.set(p.album, { name: p.album, date: p.album_date, photos: [] })
    const a = map.get(p.album)
    a.photos.push({ id: p.id, url: p.photo_url, caption: p.caption })
    if (p.album_date && !a.date) a.date = p.album_date
  }
  const albums = [...map.values()].sort((x, y) => (y.date || '0000').localeCompare(x.date || '0000'))

  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.25rem', fontFamily: 'var(--font-inter), sans-serif' }}>
        Canvas Routes
      </div>
      <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.6rem, 5.5vw, 3.6rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.05, margin: '0 0 1.5rem', letterSpacing: '-0.01em' }}>
        Photos
      </h1>
      <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.8, maxWidth: '520px', margin: '0 0 3rem', fontFamily: 'var(--font-inter), sans-serif' }}>
        Photos of our members and their cars from meets and drives throughout the season.
      </p>

      {albums.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', fontFamily: 'var(--font-inter), sans-serif' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>
            Nothing here yet
          </div>
          <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.8, maxWidth: '380px', margin: '0 auto' }}>
            Photos from our meets and drives will appear here after each event. Check back soon.
          </div>
        </div>
      ) : (
        <MembersGallery albums={albums} />
      )}
    </div>
  )
}
