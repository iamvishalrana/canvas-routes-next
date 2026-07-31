// Instant skeleton shown the moment the Revenue tab is tapped, while the
// server component runs its account-wide Stripe scan. Next.js swaps in the
// real page automatically once the data resolves — this just removes the
// blank-hang the admin used to stare at on every open.
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }
const BAR = { background: 'linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.09) 37%, rgba(0,0,0,0.05) 63%)', backgroundSize: '400% 100%', animation: 'rev-shimmer 1.4s ease infinite', borderRadius: '6px' }

function Line({ w = '100%', h = 12, style }) {
  return <div style={{ ...BAR, width: w, height: h, ...style }} />
}

export default function RevenueLoading() {
  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Line w="90px" h={9} style={{ marginBottom: '0.7rem' }} />
        <Line w="180px" h={28} />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
            <Line w="70%" h={22} style={{ marginBottom: '0.7rem' }} />
            <Line w="45%" h={9} />
          </div>
        ))}
      </div>

      {/* Two panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {Array.from({ length: 2 }).map((_, p) => (
          <div key={p} style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
            <Line w="140px" h={10} style={{ marginBottom: '1.25rem' }} />
            {Array.from({ length: 5 }).map((_, r) => (
              <div key={r} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.55rem 0' }}>
                <Line w="40%" h={12} />
                <Line w="20%" h={12} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
        <Line w="140px" h={10} style={{ marginBottom: '1.25rem' }} />
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.6rem 0' }}>
            <Line w="55%" h={12} />
            <Line w="15%" h={12} />
          </div>
        ))}
      </div>

      <style>{`@keyframes rev-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`}</style>
    </div>
  )
}
