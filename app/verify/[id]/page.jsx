import { createAdminClient } from '../../../lib/supabase/admin'
import Image from 'next/image'
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

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.75rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex' }}>
          <Image src="/white-outline.png" alt="Canvas Routes" width={140} height={93} style={{ width: '72px', height: 'auto', opacity: 0.85 }} />
        </Link>
        <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)' }}>
          Member Verification
        </div>
      </div>

      {/* Result */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Status indicator */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            {isValid ? (
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.25rem',
                background: 'rgba(59,107,47,0.12)', border: '1.5px solid rgba(59,107,47,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7EC87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            ) : (
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.25rem',
                background: 'rgba(123,32,50,0.12)', border: '1.5px solid rgba(123,32,50,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d06070" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
            )}

            <div style={{
              fontSize: '1.1rem', fontWeight: '500', letterSpacing: '0.02em',
              color: isValid ? '#7EC87A' : '#d06070',
              marginBottom: '0.4rem',
            }}>
              {isValid ? 'Valid Member'
                : !member ? 'Not Found'
                : member.membership_status === 'suspended' ? 'Membership Suspended'
                : member.membership_status === 'expired' ? 'Membership Expired'
                : member.membership_status === 'pending' ? 'Membership Pending'
                : 'Membership Not Active'}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', letterSpacing: '0.02em' }}>
              Canvas Routes · Season 2026
            </div>
          </div>

          {/* Member details — only show if found */}
          {member && (
            <div style={{
              background: 'rgba(245,241,236,0.04)', border: '0.5px solid rgba(197,168,130,0.15)',
              borderRadius: '8px', padding: '1.5rem',
            }}>
              <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', marginBottom: '0.35rem' }}>Member</div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1 }}>
                  {member.name || 'Canvas Routes Member'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.25rem' }}>Tier</div>
                  <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.75)' }}>{tierLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.25rem' }}>Status</div>
                  <div style={{ fontSize: '13px', color: isValid ? '#7EC87A' : '#d06070', textTransform: 'capitalize' }}>{member.membership_status}</div>
                </div>
                {memberNumber && (
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.25rem' }}>Member No.</div>
                    <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.75)' }}>#{memberNumber}</div>
                  </div>
                )}
                {joinYear && (
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.25rem' }}>Since</div>
                    <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.75)' }}>{joinYear}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!member && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: '1.7' }}>
              This QR code doesn&apos;t match any Canvas Routes membership. If you believe this is an error, contact us at jerry@canvasroutes.com.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '1rem 1.75rem', borderTop: '0.5px solid rgba(197,168,130,0.08)', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.2)', margin: 0 }}>
          © 2026 Canvas Routes. Questions? jerry@canvasroutes.com
        </p>
      </div>
    </div>
  )
}
