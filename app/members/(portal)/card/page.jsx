import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Member Card | Canvas Routes' } }

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com').replace(/\/$/, '')

export default async function CardPage() {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) redirect('/members/login')
  const user = data.user

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('members')
    .select('id, name, tier, membership_status, membership_number, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!member) redirect('/members/dashboard')

  const tierLabel = member.tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'
  const status = member.membership_status || 'pending'
  const isActive = status === 'active'
  const firstName = (member.name || '').split(' ')[0]
  const memberNumber = member.membership_number ? String(member.membership_number).padStart(3, '0') : null
  const joinYear = member.created_at ? new Date(member.created_at).getFullYear() : 2026
  const verifyUrl = `${SITE_URL}/verify/${member.id}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=F5F1EC&bgcolor=0F1E14&qzone=2&data=${encodeURIComponent(verifyUrl)}`

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Back link */}
      <div style={{ width: '100%', maxWidth: '360px', marginBottom: '1.25rem' }}>
        <Link href="/members/dashboard" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Dashboard
        </Link>
      </div>

      {/* The card */}
      <div style={{
        width: '100%', maxWidth: '360px',
        background: 'linear-gradient(145deg, #0F1E14 0%, #162618 50%, #0F1E14 100%)',
        border: '0.5px solid rgba(197,168,130,0.25)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(197,168,130,0.1) inset',
        position: 'relative',
      }}>
        {/* Subtle gold glow top right */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(197,168,130,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Card top */}
        <div style={{ padding: '1.75rem 1.75rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={140} height={93} style={{ width: '80px', height: 'auto', opacity: 0.9 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '0.2rem' }}>Season</div>
              <div style={{ fontSize: '12px', color: 'rgba(245,241,236,0.7)', letterSpacing: '0.04em' }}>2026</div>
            </div>
          </div>
        </div>

        {/* Member info */}
        <div style={{ padding: '1.5rem 1.75rem 1.25rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', marginBottom: '0.35rem' }}>Member</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.75rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '0.5rem' }}>
              {member.name || 'Canvas Routes Member'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '3px 10px',
                background: member.tier === 'inner_circle' ? 'rgba(197,168,130,0.12)' : 'rgba(245,241,236,0.06)',
                border: `0.5px solid ${member.tier === 'inner_circle' ? 'rgba(197,168,130,0.4)' : 'rgba(245,241,236,0.15)'}`,
                color: member.tier === 'inner_circle' ? '#c5a882' : 'rgba(245,241,236,0.6)',
                borderRadius: '2px',
              }}>
                {tierLabel}
              </span>
              {isActive ? (
                <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7EC87A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7EC87A', display: 'inline-block' }} />
                  Active
                </span>
              ) : (
                <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d06070' }}>{status}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {memberNumber && (
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.2rem' }}>No.</div>
                <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.6)', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>#{memberNumber}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.2rem' }}>Member since</div>
              <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.6)', letterSpacing: '0.04em' }}>{joinYear}</div>
            </div>
          </div>
        </div>

        {/* Gold divider */}
        <div style={{ height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.3), transparent)', margin: '0 1.75rem' }} />

        {/* QR section */}
        <div style={{ padding: '1.25rem 1.75rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ flexShrink: 0, background: '#0F1E14', border: '0.5px solid rgba(197,168,130,0.15)', borderRadius: '6px', padding: '6px', lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Verification QR" width={88} height={88} style={{ display: 'block', imageRendering: 'pixelated' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(245,241,236,0.55)', lineHeight: '1.6', marginBottom: '0.35rem' }}>
              Partners scan this code to verify your membership.
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(197,168,130,0.45)', letterSpacing: '0.04em' }}>
              canvasroutes.com
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p style={{ marginTop: '1.25rem', fontSize: '11px', color: 'rgba(245,241,236,0.25)', textAlign: 'center', maxWidth: '280px', lineHeight: '1.6' }}>
        Add this page to your home screen for quick access. On iPhone, tap Share → Add to Home Screen.
      </p>
    </div>
  )
}
