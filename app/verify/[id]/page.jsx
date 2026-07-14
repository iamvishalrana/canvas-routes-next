import { createAdminClient } from '../../../lib/supabase/admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Membership Verification | Canvas Routes' }

export default async function VerifyPage({ params }) {
  const { id } = await params

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const supabase = createAdminClient()
  const { data: member } = UUID_RE.test(id)
    ? await supabase.from('members').select('id, name, tier, membership_status, membership_number, created_at').eq('id', id).maybeSingle()
    : { data: null }

  const isValid = member && member.membership_status === 'active'
  const tierLabel = member?.tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'
  const memberNumber = member?.membership_number ? String(member.membership_number).padStart(3, '0') : null
  const joinYear = member?.created_at ? new Date(member.created_at).getFullYear() : null

  const statusLabel = isValid ? 'Active Member'
    : !member                                    ? 'Not Found'
    : member.membership_status === 'suspended'   ? 'Suspended'
    : member.membership_status === 'expired'     ? 'Expired'
    : member.membership_status === 'pending'     ? 'Pending'
    : 'Not Active'

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0C1810',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-inter),sans-serif',
      backgroundImage: 'repeating-linear-gradient(-55deg, transparent 0, transparent 36px, rgba(197,168,130,0.018) 36px, rgba(197,168,130,0.018) 37px)',
    }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536} style={{ width: '68px', height: 'auto', opacity: 0.8 }} />
        </Link>
        <div style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)' }}>
          Verification
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.25rem' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Status card */}
          <div style={{
            background: isValid
              ? 'linear-gradient(145deg, rgba(59,107,47,0.14) 0%, rgba(59,107,47,0.06) 100%)'
              : 'linear-gradient(145deg, rgba(147,51,62,0.14) 0%, rgba(147,51,62,0.06) 100%)',
            border: `0.5px solid ${isValid ? 'rgba(126,200,122,0.22)' : 'rgba(208,96,112,0.22)'}`,
            borderRadius: '14px',
            padding: '2rem 1.75rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            {/* Icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.25rem',
              background: isValid ? 'rgba(126,200,122,0.12)' : 'rgba(208,96,112,0.12)',
              border: `1px solid ${isValid ? 'rgba(126,200,122,0.3)' : 'rgba(208,96,112,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isValid ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7EC87A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d06070" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )}
            </div>

            <div style={{
              fontFamily: 'var(--font-cormorant),serif',
              fontSize: '1.9rem',
              fontWeight: '300',
              color: isValid ? '#7EC87A' : '#d06070',
              lineHeight: 1.1,
              marginBottom: '0.4rem',
              letterSpacing: '0.01em',
            }}>
              {statusLabel}
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)' }}>
              Canvas Routes &mdash; Season 2026
            </div>
          </div>

          {/* Member detail card */}
          {member && (
            <div style={{
              background: 'rgba(245,241,236,0.04)',
              border: '0.5px solid rgba(197,168,130,0.12)',
              borderRadius: '14px',
              overflow: 'hidden',
            }}>
              {/* Name row */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid rgba(197,168,130,0.08)' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.3rem' }}>Member</div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.55rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1 }}>
                  {member.name || 'Canvas Routes Member'}
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div style={{ padding: '1rem 1.5rem', borderRight: '0.5px solid rgba(197,168,130,0.08)', borderBottom: memberNumber || joinYear ? '0.5px solid rgba(197,168,130,0.08)' : 'none' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)', marginBottom: '0.3rem' }}>Tier</div>
                  <div style={{ fontSize: '13px', color: member.tier === 'inner_circle' ? '#c5a882' : 'rgba(245,241,236,0.7)' }}>{tierLabel}</div>
                </div>
                <div style={{ padding: '1rem 1.5rem', borderBottom: memberNumber || joinYear ? '0.5px solid rgba(197,168,130,0.08)' : 'none' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)', marginBottom: '0.3rem' }}>Status</div>
                  <div style={{ fontSize: '13px', color: isValid ? '#7EC87A' : '#d06070', textTransform: 'capitalize' }}>{member.membership_status}</div>
                </div>
                {memberNumber && (
                  <div style={{ padding: '1rem 1.5rem', borderRight: '0.5px solid rgba(197,168,130,0.08)' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)', marginBottom: '0.3rem' }}>No.</div>
                    <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.7)', fontVariantNumeric: 'tabular-nums' }}>#{memberNumber}</div>
                  </div>
                )}
                {joinYear && (
                  <div style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)', marginBottom: '0.3rem' }}>Since</div>
                    <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.7)' }}>{joinYear}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Not found message */}
          {!member && (
            <div style={{
              background: 'rgba(245,241,236,0.03)',
              border: '0.5px solid rgba(197,168,130,0.1)',
              borderRadius: '14px',
              padding: '1.5rem',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.45)', lineHeight: '1.7', margin: 0 }}>
                This QR code doesn&apos;t match any Canvas Routes membership. If you believe this is an error, contact us at{' '}
                <a href="mailto:info@canvasroutes.com" style={{ color: 'rgba(197,168,130,0.6)', textDecoration: 'none' }}>info@canvasroutes.com</a>.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '1.25rem 1.75rem', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: 'rgba(245,241,236,0.18)', margin: 0, letterSpacing: '0.04em' }}>
          Questions?{' '}
          <a href="mailto:info@canvasroutes.com" style={{ color: 'rgba(197,168,130,0.35)', textDecoration: 'none' }}>
            info@canvasroutes.com
          </a>
        </p>
      </div>
    </div>
  )
}
