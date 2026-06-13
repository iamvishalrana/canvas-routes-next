import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PARTNERS } from '../../../../lib/partners'
import FadeUp from '../../../../components/FadeUp'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Member Perks | Canvas Routes' } }

export default async function PerksPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/members/login')

  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('tier, membership_status').eq('id', user.id).maybeSingle()

  const tier = member?.tier || 'routes_member'
  const isInnerCircle = tier === 'inner_circle'
  const tierLabel = isInnerCircle ? 'Inner Circle' : 'Routes Member'

  const eligiblePartners = PARTNERS.filter(p =>
    isInnerCircle ? p.tiers.length > 0 : p.tiers.includes('Routes Member')
  )

  return (
    <div>
      <style>{`
        .perks-card {
          display: grid;
          grid-template-columns: 2fr 3fr;
          overflow: hidden;
          margin-bottom: 1.25rem;
        }
        .perks-card-left {
          background: #0F1E14;
          position: relative;
          overflow: hidden;
          padding: 2.5rem 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 240px;
        }
        .perks-card-left::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            -55deg,
            transparent 0, transparent 26px,
            rgba(197,168,130,0.028) 26px, rgba(197,168,130,0.028) 27px
          );
          pointer-events: none;
          z-index: 1;
        }
        @keyframes perks-shimmer {
          from { left: -75%; opacity: 0.8; }
          to   { left: 140%; opacity: 0; }
        }
        .perks-card-left::before {
          content: '';
          position: absolute;
          top: -10%; left: -75%;
          width: 48%; height: 120%;
          background: linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.06) 50%, transparent 90%);
          transform: skewX(-10deg);
          pointer-events: none;
          z-index: 2;
          opacity: 0;
        }
        .perks-card:hover .perks-card-left::before {
          animation: perks-shimmer 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .perks-card-left {
          transition: filter 0.3s ease;
        }
        .perks-card:hover .perks-card-left {
          filter: brightness(1.06);
        }
        .perks-card-right {
          background: #fff;
          border: 0.5px solid rgba(0,0,0,0.07);
          border-left: none;
          padding: 2.5rem 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 2rem;
        }
        .perks-ig-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0F1E14;
          text-decoration: none;
          font-family: var(--font-inter), sans-serif;
          border-bottom: 0.5px solid rgba(15,30,20,0.22);
          padding-bottom: 1px;
          align-self: flex-start;
          transition: color 0.15s, border-color 0.15s;
        }
        .perks-ig-link:hover { color: #c5a882; border-color: rgba(197,168,130,0.5); }
        @media (max-width: 640px) {
          .perks-card { grid-template-columns: 1fr; }
          .perks-card-left { min-height: 180px; padding: 1.75rem 1.5rem; }
          .perks-card-right { border-left: 0.5px solid rgba(0,0,0,0.07); border-top: 0.5px solid rgba(197,168,130,0.2); padding: 1.75rem 1.5rem; }
          .perks-header { margin-bottom: 2.25rem !important; padding-bottom: 2rem !important; }
        }
      `}</style>

      {/* Header */}
      <header className="perks-header" style={{ marginBottom: '3.5rem', paddingBottom: '2.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.25rem', fontFamily: 'var(--font-inter), sans-serif' }}>
          Canvas Routes &mdash; Season 2026
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.6rem, 5.5vw, 3.6rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.05, margin: '0 0 1.5rem', letterSpacing: '-0.01em' }}>
          Member perks,<br />
          <span style={{ fontStyle: 'italic' }}>exclusively yours.</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase',
            padding: '0.38rem 1rem',
            border: isInnerCircle ? '0.5px solid rgba(197,168,130,0.55)' : '0.5px solid rgba(197,168,130,0.28)',
            background: isInnerCircle ? 'rgba(197,168,130,0.09)' : 'transparent',
            color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif',
          }}>
            {tierLabel}
          </span>
          <span style={{ fontSize: '8.5px', letterSpacing: '0.14em', color: '#ccc', fontFamily: 'var(--font-inter), sans-serif' }}>
            {eligiblePartners.length} {eligiblePartners.length === 1 ? 'partner' : 'partners'}
          </span>
        </div>
      </header>

      {eligiblePartners.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#aaa', lineHeight: 1.7 }}>
          No partner perks available yet — check back soon.
        </p>
      ) : (
        <div>
          {eligiblePartners.map((p, i) => (
            <FadeUp key={i} delay={i * 80}><div className="perks-card">

              {/* Left — dark identity panel */}
              <div className="perks-card-left">
                <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(197,168,130,0.13) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 1 }} />

                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: '7.5px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '1.1rem' }}>
                    {p.category}
                  </div>
                  <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.8rem, 2.8vw, 2.2rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, letterSpacing: '0.01em' }}>
                    {p.name}
                  </div>
                </div>

                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.22)', marginBottom: '1rem' }} />
                  <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.6rem', fontWeight: '300', color: '#c5a882', lineHeight: 1, letterSpacing: '0.01em' }}>
                    {p.discount}
                  </div>
                  <div style={{ fontSize: '7px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.36)', fontFamily: 'var(--font-inter), sans-serif', marginTop: '0.45rem' }}>
                    {p.tiers.includes('Routes Member') ? 'All Members' : 'Inner Circle'}
                  </div>
                </div>
              </div>

              {/* Right — details panel */}
              <div className="perks-card-right">

                {/* Logo */}
                {p.logo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem 0' }}>
                    <img
                      src={p.logo}
                      alt={p.name}
                      style={{ width: '140px', height: '140px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.8rem' }}>
                    How to redeem
                  </div>
                  <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.2)', marginBottom: '1.25rem' }} />
                  <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.85, letterSpacing: '0.01em', margin: 0 }}>
                    {p.how}
                  </p>
                </div>

                {p.instagram && (
                  <a
                    href={`https://instagram.com/${p.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="perks-ig-link"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5"/>
                      <circle cx="12" cy="12" r="4"/>
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                    </svg>
                    @{p.instagram}
                  </a>
                )}
              </div>

            </div></FadeUp>
          ))}
        </div>
      )}

      {/* Inner Circle teaser for Routes Members */}
      {!isInnerCircle && (
        <div style={{ marginTop: '1.5px' }}>
          <div style={{ background: 'rgba(197,168,130,0.04)', border: '0.5px solid rgba(197,168,130,0.18)', borderLeft: '2px solid rgba(197,168,130,0.4)', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '8px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.5rem' }}>
                Inner Circle
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.25rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.2 }}>
                Additional perks available at this tier.
              </div>
              <div style={{ fontSize: '12px', color: '#aaa', marginTop: '0.4rem', fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1.6 }}>
                Inner Circle members have access to exclusive partner discounts not available on this tier.
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      <p style={{ marginTop: '2.5rem', fontSize: '11px', color: '#c0b9b0', lineHeight: 1.7, letterSpacing: '0.01em', borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: '1.75rem', fontFamily: 'var(--font-inter), sans-serif' }}>
        Partner perks are exclusive to Canvas Routes members. New partners are added throughout the season.
      </p>
    </div>
  )
}
