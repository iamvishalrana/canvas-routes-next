// Instant skeleton shown the moment the Payments tab is tapped, while the
// server component runs its account-wide Stripe scan. Next.js swaps in the
// real page automatically once the data resolves.
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }
const BAR = { background: 'linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.09) 37%, rgba(0,0,0,0.05) 63%)', backgroundSize: '400% 100%', animation: 'pay-shimmer 1.4s ease infinite', borderRadius: '6px' }

function Line({ w = '100%', h = 12, style }) {
  return <div style={{ ...BAR, width: w, height: h, ...style }} />
}

export default function PaymentsLoading() {
  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Line w="90px" h={9} style={{ marginBottom: '0.7rem' }} />
        <Line w="200px" h={28} />
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 4 }).map((_, i) => <Line key={i} w="90px" h={30} style={{ borderRadius: '8px' }} />)}
      </div>

      {/* Rows */}
      <div style={{ ...CARD, padding: '0.5rem 1.5rem 1.25rem' }}>
        {Array.from({ length: 10 }).map((_, r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderTop: r > 0 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
            <Line w="22%" h={13} />
            <Line w="28%" h={12} />
            <Line w="16%" h={12} />
            <div style={{ flex: 1 }} />
            <Line w="70px" h={13} />
          </div>
        ))}
      </div>

      <style>{`@keyframes pay-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`}</style>
    </div>
  )
}
