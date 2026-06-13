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
  const [{ data: member }, { data: application }] = await Promise.all([
    admin
      .from('members')
      .select('id, name, tier, membership_status, membership_number, created_at, car_year, car_make, car_model')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('applications')
      .select('car_paint')
      .eq('email', user.email)
      .maybeSingle(),
  ])

  if (!member) redirect('/members/dashboard')

  const tierLabel = member.tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'
  const status = member.membership_status || 'pending'
  const isActive = status === 'active'
  const memberNumber = member.membership_number ? String(member.membership_number).padStart(3, '0') : null
  const joinYear = member.created_at ? new Date(member.created_at).getFullYear() : 2026
  const verifyUrl = `${SITE_URL}/verify/${member.id}`

  const carYear = member.car_year?.trim() || null
  const carMake = member.car_make?.trim() || null
  const carModel = member.car_model?.trim() || null
  const carLine = [carYear, carMake, carModel].filter(Boolean).join(' ') || null
  const carPaint = application?.car_paint?.trim() || null

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0F1E14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(1.25rem, 5vw, 2rem) clamp(0.75rem, 4vw, 1rem)',
      fontFamily: 'var(--font-inter),sans-serif',
      boxSizing: 'border-box',
    }}>

      {/* Back link */}
      <div style={{ width: '100%', maxWidth: '380px', marginBottom: '1.25rem' }}>
        <Link href="/members/dashboard" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Dashboard
        </Link>
      </div>

      {/* The card */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: 'linear-gradient(160deg, #162618 0%, #0F1E14 60%)',
        border: '0.5px solid rgba(197,168,130,0.25)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(197,168,130,0.1) inset',
        position: 'relative',
      }}>
        {/* Gold glow behind member name area */}
        <div style={{ position: 'absolute', bottom: '35%', right: '-20px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(197,168,130,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo + season */}
        <div style={{ padding: 'clamp(1.25rem, 4vw, 1.5rem) clamp(1.25rem, 4vw, 1.75rem) 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={140} height={93} style={{ width: '72px', height: 'auto', opacity: 0.85 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', marginBottom: '0.15rem' }}>Season</div>
              <div style={{ fontSize: '18px', fontFamily: 'var(--font-cormorant),serif', fontWeight: '300', color: 'rgba(245,241,236,0.75)', letterSpacing: '0.04em' }}>2026</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.25), transparent)', margin: '0 clamp(1.25rem, 4vw, 1.75rem)' }} />

        {/* Member info */}
        <div style={{ padding: 'clamp(1rem, 3vw, 1.25rem) clamp(1.25rem, 4vw, 1.75rem)' }}>

          {/* Name + badges */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', marginBottom: '0.3rem' }}>Member</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.75rem, 6vw, 2rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '0.55rem' }}>
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
                whiteSpace: 'nowrap',
              }}>
                {tierLabel}
              </span>
              {isActive ? (
                <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7EC87A', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7EC87A', flexShrink: 0, display: 'inline-block' }} />
                  Active
                </span>
              ) : (
                <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d06070' }}>{status}</span>
              )}
            </div>
          </div>

          {/* No. + Member since */}
          <div style={{ display: 'flex', gap: '2rem', marginBottom: carLine ? '1.1rem' : 0 }}>
            {memberNumber && (
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.2rem' }}>No.</div>
                <div style={{ fontSize: '14px', color: 'rgba(245,241,236,0.65)', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>#{memberNumber}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.2rem' }}>Member since</div>
              <div style={{ fontSize: '14px', color: 'rgba(245,241,236,0.65)', letterSpacing: '0.04em' }}>{joinYear}</div>
            </div>
          </div>

          {/* Car */}
          {carLine && (
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '0.2rem' }}>Car</div>
              <div style={{ fontSize: '14px', color: 'rgba(245,241,236,0.65)', letterSpacing: '0.02em' }}>{carLine}</div>
              {carPaint && (
                <div style={{ fontSize: '12px', color: 'rgba(197,168,130,0.55)', letterSpacing: '0.02em', marginTop: '0.2rem' }}>{carPaint}</div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.25), transparent)', margin: '0 clamp(1.25rem, 4vw, 1.75rem)' }} />

        {/* QR section */}
        <div style={{ padding: 'clamp(1rem, 3vw, 1.25rem) clamp(1.25rem, 4vw, 1.75rem) clamp(1.25rem, 4vw, 1.5rem)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ flexShrink: 0, background: '#F5F1EC', borderRadius: '6px', padding: '7px', lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=0F1E14&bgcolor=F5F1EC&qzone=2&data=${encodeURIComponent(verifyUrl)}`}
              alt="Verification QR"
              width={96}
              height={96}
              style={{ display: 'block', imageRendering: 'pixelated' }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: 'rgba(245,241,236,0.55)', lineHeight: '1.65', marginBottom: '0.35rem' }}>
              Partners scan this code to verify your membership.
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(197,168,130,0.45)', letterSpacing: '0.04em' }}>
              canvasroutes.com
            </div>
          </div>
        </div>
      </div>

      {/* Home screen hint */}
      <p style={{ marginTop: '1.25rem', fontSize: '11px', color: 'rgba(245,241,236,0.22)', textAlign: 'center', maxWidth: '260px', lineHeight: '1.6', margin: '1.25rem auto 0' }}>
        Add this page to your home screen for quick access. On iPhone, tap Share → Add to Home Screen.
      </p>
    </div>
  )
}
