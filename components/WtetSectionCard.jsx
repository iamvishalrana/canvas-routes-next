'use client'

export function WtetStatusPill({ done, doneLabel, pendingLabel }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: '99px',
      color: done ? '#3B6B2F' : '#8A6535',
      border: `0.5px solid ${done ? 'rgba(59,107,47,0.3)' : 'rgba(197,168,130,0.5)'}`,
      background: done ? 'rgba(59,107,47,0.06)' : 'rgba(197,168,130,0.08)',
    }}>
      {done ? (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
      )}
      {done ? doneLabel : pendingLabel}
    </span>
  )
}

export default function WtetSectionCard({ title, done, doneLabel, pendingLabel, children }) {
  return (
    <div style={{ border: `0.5px solid ${done ? 'rgba(59,107,47,0.25)' : 'rgba(197,168,130,0.35)'}`, background: '#fff', marginBottom: '1.5rem' }}>
      <div style={{ padding: '1.1rem 1.4rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter), sans-serif' }}>{title}</div>
        <WtetStatusPill done={done} doneLabel={doneLabel} pendingLabel={pendingLabel} />
      </div>
      <div style={{ padding: '1.4rem' }}>{children}</div>
    </div>
  )
}
