import Link from 'next/link'
import { createAdminClient } from '../../../lib/supabase/admin'
import { buildTransformedUrl } from '../../../lib/supabaseImageUrl'
import MembersGallery from '../../../components/MembersGallery'

export const dynamic = 'force-dynamic'

const BUCKET = 'photo-shares'
const DISPLAY_WIDTH = 1600

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.25rem 1.75rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="Canvas Routes" style={{ height: '32px', width: 'auto', display: 'block' }} />
        </Link>
      </div>
      <main style={{ flex: 1, maxWidth: '1040px', width: '100%', margin: '0 auto', padding: 'clamp(2rem,5vw,3.5rem) clamp(1.25rem,4vw,2rem)' }}>
        {children}
      </main>
      <div style={{ textAlign: 'center', padding: '2rem 1rem', fontSize: '11px', color: '#bbb' }}>
        © {new Date().getFullYear()} Canvas Routes
      </div>
    </div>
  )
}

function MembershipCta() {
  return (
    <div style={{ marginTop: '4rem', background: '#0F1E14', borderRadius: '14px', padding: 'clamp(2rem,5vw,3rem)', textAlign: 'center' }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.85rem' }}>
        Canvas Routes
      </div>
      <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: '300', color: '#F5F1EC', margin: '0 0 0.85rem', lineHeight: 1.2 }}>
        Enjoyed these photos?
      </h2>
      <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.65)', lineHeight: 1.8, maxWidth: '480px', margin: '0 auto 1.75rem' }}>
        Members get their own private photo folder, priority spots on every road trip, and first access to meets
        and drives across Montreal. Come join us on the next one.
      </p>
      <Link href="/membership" style={{
        display: 'inline-block', padding: '0.85rem 2rem', background: '#F5F1EC', color: '#0F1E14',
        fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none',
        fontFamily: 'var(--font-inter),sans-serif', fontWeight: '600',
      }}>
        Learn about membership →
      </Link>
    </div>
  )
}

export default async function GallerySharePage({ params }) {
  const { token } = await params
  const admin = createAdminClient()

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const { data: share } = UUID_RE.test(token)
    ? await admin.from('photo_shares').select('id, title, expires_at').eq('token', token).maybeSingle()
    : { data: null }

  if (!share) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>Link not found</h1>
          <p style={{ fontSize: '13px', color: '#999' }}>This gallery link doesn't exist. Double-check the link you were sent.</p>
        </div>
      </Shell>
    )
  }

  const isExpired = new Date(share.expires_at) <= new Date()
  if (isExpired) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>This gallery has expired</h1>
          <p style={{ fontSize: '13px', color: '#999', maxWidth: '380px', margin: '0 auto' }}>
            Photos shared this way are automatically removed 30 days after the link was created. Reach out to us at{' '}
            <a href="mailto:info@canvasroutes.com" style={{ color: '#8a7a5c' }}>info@canvasroutes.com</a> if you need them again.
          </p>
        </div>
        <MembershipCta />
      </Shell>
    )
  }

  const { data: items } = await admin.from('photo_share_items')
    .select('id, storage_path, created_at').eq('share_id', share.id).order('created_at', { ascending: true })

  const photos = (items || []).map(i => {
    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(i.storage_path)
    return { id: i.id, url: buildTransformedUrl(publicUrl, { width: DISPLAY_WIDTH }), originalUrl: publicUrl, caption: null }
  })
  const album = { name: share.title, date: null, photos }

  return (
    <Shell>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.85rem' }}>
          Canvas Routes
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: '300', color: '#1a1a1a', margin: '0 0 0.75rem', lineHeight: 1.1 }}>
          {share.title}
        </h1>
        <div style={{ fontSize: '10.5px', color: '#bbb' }}>
          These photos will be automatically removed on {fmtDate(share.expires_at)}. To keep them, download the
          full-resolution originals now. To get a photo removed sooner, reach out to us at{' '}
          <a href="mailto:info@canvasroutes.com" style={{ color: '#bbb' }}>info@canvasroutes.com</a>.
        </div>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '13px', color: '#999' }}>No photos have been added to this gallery yet.</div>
        </div>
      ) : (
        <MembersGallery albums={[album]} />
      )}

      <MembershipCta />
    </Shell>
  )
}
