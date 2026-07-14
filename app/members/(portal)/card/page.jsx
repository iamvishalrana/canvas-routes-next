import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CardInteractive from './CardInteractive'

export const dynamic = 'force-dynamic'
export const metadata = { title: { absolute: 'Member Card | Canvas Routes' } }

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com').replace(/\/+$/, '')

export default async function CardPage() {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) redirect('/members/login')
  const user = data.user

  const admin = createAdminClient()
  const [{ data: member }, { data: application }] = await Promise.all([
    admin
      .from('members')
      .select('id, name, tier, membership_status, membership_number, created_at, car_year, car_make, car_model, cars')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('applications')
      .select('car_paint')
      .eq('email', user.email?.toLowerCase())
      .maybeSingle(),
  ])

  if (!member) redirect('/members/dashboard')

  const tierLabel = member.tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'
  const status = member.membership_status || 'pending'
  const isActive = status === 'active'
  const memberNumber = member.membership_number != null ? String(member.membership_number).padStart(3, '0') : null
  const rawYear = member.created_at ? new Date(member.created_at).getFullYear() : NaN
  const joinYear = Number.isFinite(rawYear) ? rawYear : 2026
  const verifyUrl = `${SITE_URL}/verify/${member.id}`

  const primaryCar = member.cars?.[0]
  const carYear = (primaryCar?.year || member.car_year)?.toString().trim() || null
  const carMake = (primaryCar?.make || member.car_make)?.trim() || null
  const carModel = (primaryCar?.model || member.car_model)?.trim() || null
  const carLine = [carYear, carMake, carModel].filter(Boolean).join(' ') || null
  const carPaint = application?.car_paint?.trim() || null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 clamp(0.75rem, 4vw, 1rem) 2rem',
      fontFamily: 'var(--font-inter),sans-serif',
    }}>

      {/* Back link */}
      <div style={{ width: '100%', maxWidth: '396px', padding: '0 8px', marginBottom: '1.25rem' }}>
        <Link href="/members/dashboard" style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(139,109,71,0.65)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Dashboard
        </Link>
      </div>

      {/* The card — padding gives the scale/tilt animation room without clipping */}
      <div style={{ width: '100%', maxWidth: '396px', padding: '0 8px', overflow: 'visible' }}>
      <CardInteractive>
      <div style={{
        width: '100%',
        background: 'linear-gradient(160deg, #162618 0%, #0F1E14 60%)',
        border: '0.5px solid rgba(197,168,130,0.25)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(197,168,130,0.1) inset',
        position: 'relative',
      }}>
        {/* Diagonal gold lines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'repeating-linear-gradient(-55deg, transparent 0, transparent 26px, rgba(197,168,130,0.028) 26px, rgba(197,168,130,0.028) 27px)',
        }} />
        {/* Gold glow */}
        <div style={{ position: 'absolute', bottom: '35%', right: '-20px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(197,168,130,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Logo row — season is absolute so logo owns full width */}
        <div style={{ padding: 'clamp(1rem, 3.5vw, 1.25rem) clamp(1.25rem, 4vw, 1.75rem) 0.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'absolute', top: 'clamp(1rem, 3.5vw, 1.25rem)', right: 'clamp(1.25rem, 4vw, 1.75rem)', textAlign: 'right' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', marginBottom: '0.15rem' }}>Season</div>
            <div style={{ fontSize: '18px', fontFamily: 'var(--font-cormorant),serif', fontWeight: '300', color: 'rgba(245,241,236,0.75)', letterSpacing: '0.04em' }}>2026</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536} style={{ width: '162px', height: 'auto', opacity: 0.92, display: 'block' }} />
        </div>

        {/* Member info — tight gap below logo, no divider between them */}
        <div style={{ padding: '0.6rem clamp(1.25rem, 4vw, 1.75rem) 1rem', position: 'relative', zIndex: 1 }}>

          {/* Name + badges */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', marginBottom: '0.3rem' }}>Member</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.75rem, 6vw, 2rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '0.55rem' }}>
              {member.name?.trim() || 'Canvas Routes Member'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="tier-shimmer" style={{
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
        <div style={{ height: '0.5px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.25), transparent)', margin: '0 clamp(1.25rem, 4vw, 1.75rem)', position: 'relative', zIndex: 1 }} />

        {/* QR section */}
        <div style={{ padding: 'clamp(1rem, 3vw, 1.25rem) clamp(1.25rem, 4vw, 1.75rem) clamp(1.25rem, 4vw, 1.5rem)', display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
          <div style={{ flexShrink: 0, background: '#F5F1EC', borderRadius: '6px', padding: '7px', lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=0F1E14&bgcolor=F5F1EC&qzone=2&data=${encodeURIComponent(verifyUrl)}`}
              alt="Verification QR"
              width={96}
              height={96}
              loading="eager"
              style={{ display: 'block' }}
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
      </CardInteractive>
      </div>

      {/* Home screen hint */}
      <p style={{ margin: '1.25rem 0 0', fontSize: '11px', color: 'rgba(0,0,0,0.3)', textAlign: 'center', maxWidth: '260px', lineHeight: '1.6' }}>
        Add this page to your home screen for quick access. On iPhone, tap Share → Add to Home Screen.
      </p>
    </div>
  )
}
