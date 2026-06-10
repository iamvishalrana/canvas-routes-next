import Link from 'next/link'
import SiteFooter from '../../components/SiteFooter'
import { createAdminClient } from '../../lib/supabase/admin'

export const metadata = { title: { absolute: 'Gallery | Canvas Routes' } }
export const revalidate = 3600

async function getPosts() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  if (!accountId) return []

  try {
    const supabase = createAdminClient()
    const { data: row } = await supabase.from('settings').select('value').eq('key', 'instagram_access_token').maybeSingle()
    const token = row?.value || process.env.INSTAGRAM_ACCESS_TOKEN
    if (!token) return []

    const res = await fetch(
      `https://graph.facebook.com/${accountId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,timestamp&limit=24&access_token=${token}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.data || []).map(p => ({
      id: p.id,
      type: p.media_type,
      image: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
      permalink: p.permalink,
      timestamp: p.timestamp,
    }))
  } catch {
    return []
  }
}

export default async function GalleryPage() {
  const posts = await getPosts()

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '68px', borderBottom: '0.5px solid rgba(197,168,130,0.12)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,30,20,0.95)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        </Link>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* Header */}
      <div style={{ padding: '4rem 2rem 2.5rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.75rem', fontFamily: 'var(--font-inter),sans-serif' }}>Canvas Routes</div>
          <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,6vw,4.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1, margin: 0, letterSpacing: '-0.01em' }}>Gallery</h1>
        </div>
        <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>
          </svg>
          @canvasroutes
        </a>
      </div>

      {/* Gold divider */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.2)' }} />
      </div>

      {/* Grid */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {posts.length === 0 ? (
          <p style={{ color: 'rgba(245,241,236,0.35)', fontSize: '13px', marginTop: '2rem' }}>No photos yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {posts.map(post => (
              <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
                style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', display: 'block' }}
                className="gallery-cell">
                {post.image && (
                  <img src={post.image} alt="" loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85, transition: 'opacity 0.3s, transform 0.4s' }}
                    className="gallery-img" />
                )}
                {post.type === 'VIDEO' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" style={{ opacity: 0.7 }}>
                      <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.4)"/>
                      <polygon points="10,8 18,12 10,16" fill="rgba(245,241,236,0.9)"/>
                    </svg>
                  </div>
                )}
                {post.type === 'CAROUSEL_ALBUM' && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', pointerEvents: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,241,236,0.8)" strokeWidth="2" style={{ opacity: 0.8 }}>
                      <rect x="2" y="7" width="15" height="15" rx="2"/><path d="M22 2H8a2 2 0 0 0-2 2v2"/>
                    </svg>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .gallery-cell:hover .gallery-img { opacity: 1; transform: scale(1.03); }
        @media (max-width: 640px) {
          .gallery-cell { aspect-ratio: 1; }
          [style*="repeat(3, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Footer */}
      <div style={{ marginTop: '4rem' }}>
        <SiteFooter background="#0F1E14" borderColor="rgba(197,168,130,0.12)" textColor="rgba(245,241,236,0.3)" linkColor="rgba(245,241,236,0.25)" iconColor="rgba(245,241,236,0.35)" />
      </div>

    </div>
  )
}
