import Link from 'next/link'
import { createAdminClient } from '../../../lib/supabase/admin'
import GalleryPasswordGate from '../../../components/GalleryPasswordGate'

export const dynamic = 'force-dynamic'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
        Members get their own private photo folder, priority spots on every drive, exclusive member discounts,
        and first access to all our meets and road trips. Come join us on the next one.
      </p>
      <Link href="/membership" target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-block', padding: '0.85rem 2rem', background: '#F5F1EC', color: '#0F1E14',
        fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none',
        fontFamily: 'var(--font-inter),sans-serif', fontWeight: '600',
      }}>
        Learn about membership →
      </Link>
    </div>
  )
}

function Shell({ children }) {
  return (
    <div className="gallery-shell" style={{ background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`.gallery-shell { min-height: 100vh; min-height: 100dvh; }`}</style>
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

// This page only ever confirms the token maps to a real person — never the
// photos themselves, and never their email. The actual galleries (photo
// URLs, grouped by event folder) only ever get fetched client-side, after
// the visitor proves they own the recipient's email via a one-time code:
// /api/gallery/[token]/request-code emails the code, /verify-code checks it
// and mints a session, /verify silently re-checks that session on return
// visits — see those three routes and components/GalleryPasswordGate.jsx.
// Folder-level expiry is checked there too (each event folder has its own
// 30-day clock), not here.
export default async function GallerySharePage({ params }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: person } = UUID_RE.test(token)
    ? await admin.from('photo_share_people').select('id, name').eq('token', token).maybeSingle()
    : { data: null }

  if (!person) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>Link not found</h1>
          <p style={{ fontSize: '13px', color: '#999' }}>This gallery link doesn't exist. Double-check the link you were sent.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.85rem' }}>
          Canvas Routes
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: '300', color: '#1a1a1a', margin: '0 0 0.75rem', lineHeight: 1.1 }}>
          {person.name ? `Hi ${person.name}` : 'Your Photos'}
        </h1>
        <div style={{ fontSize: '10.5px', color: '#bbb' }}>
          Each event below is automatically removed 30 days after it was added. To keep them, download the
          full-resolution originals now. To get a photo removed sooner, reach out to us at{' '}
          <a href="mailto:info@canvasroutes.com" style={{ color: '#bbb' }}>info@canvasroutes.com</a>.
        </div>
      </div>

      <GalleryPasswordGate token={token}>
        <MembershipCta />
      </GalleryPasswordGate>
    </Shell>
  )
}
