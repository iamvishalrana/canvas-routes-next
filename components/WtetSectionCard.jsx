'use client'

export function WtetStatusPill({ done, doneLabel, pendingLabel }) {
  return (
    <span className={done ? 'wtetci-pill-pop' : undefined} style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: '99px',
      color: done ? '#3B6B2F' : '#8A6535',
      border: `0.5px solid ${done ? 'rgba(59,107,47,0.3)' : 'rgba(197,168,130,0.5)'}`,
      background: done ? 'rgba(59,107,47,0.06)' : 'rgba(197,168,130,0.08)',
      boxShadow: done ? '0 1px 4px rgba(59,107,47,0.15)' : 'none',
      transition: 'background 0.3s ease, box-shadow 0.3s ease, color 0.3s ease, border-color 0.3s ease',
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

// Renders each check-in section as part of the page itself — a labeled
// section with a hairline divider below it — rather than a boxed card, so
// the whole check-in flow reads as one continuous page instead of stacked
// containers.
export default function WtetSectionCard({ title, done, doneLabel, pendingLabel, delay = 0, children }) {
  return (
    <section className="wtetci-fade-up" style={{ padding: '2.5rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.1)', animationDelay: `${delay}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', margin: 0, fontFamily: 'var(--font-inter), sans-serif' }}>{title}</h2>
        <WtetStatusPill done={done} doneLabel={doneLabel} pendingLabel={pendingLabel} />
      </div>
      {children}
    </section>
  )
}
