'use client'
import { MONTREAL_TZ } from '../lib/mtlTime'
import { formatCarLabel } from '../lib/carLabel'
import { formatForDisplay } from '../lib/memberNumber.js'

// Presentational replica of the members-portal profile hero + garage + stats,
// rendered from a raw members row. Used by the admin Members tab to preview
// exactly what a member's profile card looks like.
export default function MemberProfilePreview({ member }) {
  const m = member || {}
  const displayName = m.name || (m.email ? m.email.split('@')[0] : 'Member')
  const initials = displayName.trim().split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const isInnerCircle = m.tier === 'inner_circle'
  const igHandle = (m.instagram || '').replace(/^@/, '').trim()

  const carsList = (m.cars?.length ? m.cars : (m.car_year || m.car_make || m.car_model)
    ? [{ year: m.car_year, make: m.car_make, model: m.car_model }] : [])
    .filter(c => c.year || c.make || c.model)
  const primaryCar = carsList[0] || null
  const extraCars = carsList.slice(1)

  const completeness = [
    !!m.name, !!m.phone, !!m.instagram,
    !!(m.dob_month && m.dob_day), carsList.length > 0, !!m.car_photo_url, !!m.profile_photo_url,
  ]
  const completeCount = completeness.filter(Boolean).length
  const completePct = Math.round((completeCount / completeness.length) * 100)

  const attended = Object.values(m.event_attendance || {}).filter(v => v === true).length
  const memberSinceStr = (m.created_at || m.join_date)
    ? new Date(m.created_at || m.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: MONTREAL_TZ })
    : null

  const cardBase = { background: '#0F1E14', borderRadius: '20px', border: '0.5px solid rgba(197,168,130,0.18)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Hero */}
      <div style={{ ...cardBase, padding: '1.75rem 1.5rem', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.5), transparent)' }} />
        <div style={{
          width: '84px', height: '84px', borderRadius: '50%', margin: '0 auto 1rem',
          background: m.profile_photo_url ? 'transparent' : (isInnerCircle ? 'linear-gradient(135deg, #c5a882, #8A6535)' : 'linear-gradient(135deg, #2c4133, #16261b)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          boxShadow: '0 0 0 3px rgba(15,30,20,1), 0 0 0 4.5px rgba(197,168,130,0.9), 0 0 24px rgba(197,168,130,0.35)',
        }}>
          {m.profile_photo_url
            ? <img src={m.profile_photo_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.8rem', color: '#F5F1EC', letterSpacing: '0.04em' }}>{initials}</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.8rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, marginBottom: '0.7rem' }}>{displayName}</div>
        {igHandle && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245,241,236,0.08)', borderRadius: '99px', padding: '0.4rem 1rem', fontSize: '11px', color: 'rgba(245,241,236,0.85)', marginBottom: '1rem' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            @{igHandle}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z"/></svg>
          <span style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', fontWeight: '500' }}>
            {isInnerCircle ? 'Inner Circle' : 'Routes Member'}
          </span>
          {m.membership_number && (
            <>
              <span style={{ color: 'rgba(245,241,236,0.25)' }}>·</span>
              <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.5)' }}>No. {formatForDisplay(m.membership_number)}</span>
            </>
          )}
        </div>
        <div style={{ maxWidth: '300px', margin: '0 auto' }}>
          <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(245,241,236,0.1)', overflow: 'hidden' }}>
            <div style={{ width: `${completePct}%`, height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #8A6535, #c5a882)', boxShadow: '0 0 12px rgba(197,168,130,0.5)' }} />
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.12em', color: completePct === 100 ? '#c5a882' : 'rgba(245,241,236,0.45)', marginTop: '0.5rem', textTransform: 'uppercase' }}>
            {completePct === 100 ? 'Profile complete' : `Profile ${completeCount} / ${completeness.length} complete`}
          </div>
        </div>
      </div>

      {/* Garage */}
      <div style={{ ...cardBase, padding: '1.25rem' }}>
        <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.2rem', fontWeight: '400', color: '#F5F1EC', marginBottom: '0.85rem' }}>My Garage</div>
        {m.car_photo_url ? (
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', lineHeight: 0 }}>
            <img src={m.car_photo_url} alt="Car" style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,18,12,0.82) 0%, rgba(10,18,12,0.15) 45%, transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '0.7rem', left: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(10,18,12,0.55)', borderRadius: '99px', padding: '0.3rem 0.75rem' }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#c5a882" stroke="#c5a882" strokeWidth="1"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z"/></svg>
              <span style={{ fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.9)' }}>Featured</span>
            </div>
            {primaryCar && (
              <div style={{ position: 'absolute', bottom: '0.8rem', left: '0.9rem', right: '0.9rem', lineHeight: 1.2 }}>
                <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.35rem', color: '#F5F1EC', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>{primaryCar.model || primaryCar.make}</div>
                <div style={{ fontSize: '10px', color: 'rgba(245,241,236,0.65)', marginTop: '0.15rem' }}>{formatCarLabel(primaryCar.year, primaryCar.make, primaryCar.model)}</div>
              </div>
            )}
          </div>
        ) : primaryCar ? (
          <div style={{ borderRadius: '12px', border: '0.5px dashed rgba(197,168,130,0.3)', padding: '1rem', fontSize: '12px', color: 'rgba(245,241,236,0.6)' }}>
            {formatCarLabel(primaryCar.year, primaryCar.make, primaryCar.model)} — no photo yet
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'rgba(245,241,236,0.35)' }}>No car on file.</div>
        )}
        {extraCars.length > 0 && extraCars.map((car, i) => (
          <div key={i} style={{ marginTop: '0.5rem', padding: '0.6rem 0.85rem', borderRadius: '10px', background: 'rgba(245,241,236,0.045)', border: '0.5px solid rgba(197,168,130,0.12)', fontSize: '11px', color: 'rgba(245,241,236,0.8)' }}>
            {formatCarLabel(car.year, car.make, car.model)}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ ...cardBase, padding: '1.25rem' }}>
        <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.2rem', fontWeight: '400', color: '#F5F1EC', marginBottom: '0.85rem' }}>Season Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <div style={{ background: 'rgba(245,241,236,0.045)', border: '0.5px solid rgba(197,168,130,0.12)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
            <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1 }}>{attended}</div>
            <div style={{ fontSize: '8.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', marginTop: '0.35rem' }}>Events attended</div>
          </div>
          <div style={{ background: 'rgba(245,241,236,0.045)', border: '0.5px solid rgba(197,168,130,0.12)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
            <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1 }}>{memberSinceStr || '—'}</div>
            <div style={{ fontSize: '8.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', marginTop: '0.35rem' }}>Member since</div>
          </div>
        </div>
      </div>
    </div>
  )
}
