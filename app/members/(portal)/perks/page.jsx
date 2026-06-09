import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PARTNERS } from '../../../../lib/partners'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Member Perks | Canvas Routes' } }

export default async function PerksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/members/login')

  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('tier, membership_status').eq('id', user.id).maybeSingle()

  const tier = member?.tier || 'routes_member'
  const isInnerCircle = tier === 'inner_circle'
  const tierLabel = isInnerCircle ? 'Inner Circle' : 'Routes Member'

  const eligiblePartners = PARTNERS.filter(p =>
    p.tiers.includes(isInnerCircle ? 'Inner Circle' : 'Routes Member')
  )

  return (
    <div>
      <style>{`
        .perks-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-top: 2.5rem;
        }
        @media (max-width: 640px) {
          .perks-grid { grid-template-columns: 1fr; gap: 1rem; }
          .perks-header { margin-bottom: 2rem !important; padding-bottom: 2rem !important; }
        }
        .partner-card {
          background: #fff;
          border: 0.5px solid rgba(0,0,0,0.08);
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .partner-card:hover {
          border-color: rgba(197,168,130,0.35);
        }
      `}</style>

      {/* Header */}
      <header className="perks-header" style={{ marginBottom: '3rem', paddingBottom: '2.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.25rem', fontFamily: 'var(--font-inter), sans-serif' }}>
          Canvas Routes &mdash; Member Perks
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.05, margin: '0 0 1.25rem', letterSpacing: '-0.01em' }}>
          Partner discounts,<br />
          <span style={{ fontStyle: 'italic' }}>just for members.</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.38rem 1rem', border: isInnerCircle ? '0.5px solid rgba(197,168,130,0.55)' : '0.5px solid rgba(197,168,130,0.28)', background: isInnerCircle ? 'rgba(197,168,130,0.09)' : 'transparent', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif' }}>
            {tierLabel}
          </span>
          <span style={{ fontSize: '12px', color: '#bbb', letterSpacing: '0.02em' }}>
            {eligiblePartners.length} partner{eligiblePartners.length !== 1 ? 's' : ''} available
          </span>
        </div>
      </header>

      {eligiblePartners.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.7 }}>
          No partner discounts available yet — check back soon.
        </p>
      ) : (
        <div className="perks-grid">
          {eligiblePartners.map((p, i) => (
            <div key={i} className="partner-card">

              {/* Category tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span style={{ fontSize: '8px', letterSpacing: '0.26em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif' }}>
                  {p.category}
                </span>
                <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', border: '0.5px solid rgba(0,0,0,0.1)', padding: '2px 8px', fontFamily: 'var(--font-inter), sans-serif' }}>
                  All Members
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.18)' }} />

              {/* Name */}
              <div>
                <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.7rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '0.35rem' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#7B5B2E', letterSpacing: '0.01em' }}>
                  {p.discount}
                </div>
              </div>

              {/* How to redeem */}
              <div style={{ background: 'rgba(197,168,130,0.06)', border: '0.5px solid rgba(197,168,130,0.18)', padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.4rem' }}>
                  How to redeem
                </div>
                <div style={{ fontSize: '12.5px', color: '#555', lineHeight: 1.7, letterSpacing: '0.01em' }}>
                  {p.how}
                </div>
              </div>

              {/* Instagram link */}
              {p.instagram && (
                <a
                  href={`https://instagram.com/${p.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '11px', color: '#c5a882', textDecoration: 'none', letterSpacing: '0.06em', marginTop: 'auto' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5"/>
                    <circle cx="12" cy="12" r="4"/>
                    <circle cx="17.5" cy="6.5" r="0.5" fill="#c5a882"/>
                  </svg>
                  @{p.instagram}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </a>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p style={{ marginTop: '3rem', fontSize: '11px', color: '#bbb', lineHeight: 1.7, letterSpacing: '0.01em', borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: '1.75rem' }}>
        Partner perks are exclusive to Canvas Routes members. New partners are added throughout the season.
      </p>
    </div>
  )
}
