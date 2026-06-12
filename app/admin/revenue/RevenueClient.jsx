'use client'

import { ExportButton } from '../_components/ExportModal'

const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }
const PAGE_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }
const SECTION_LABEL = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }
const TH = { fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', padding: '0.65rem 1rem', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: '400', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }
const TD = { fontSize: '13px', color: '#1a1a1a', padding: '0.75rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-inter),sans-serif', verticalAlign: 'middle' }

function fmt(amount) {
  return '$' + (amount ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' CAD'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })
}

export default function RevenueClient({ totalRevenue = 0, totalPaid = 0, byType = [], byMonth = [], recentPayments = [], payments = [] }) {
  const routesRevenue = byType.find(t => t.key === 'membership_routes')?.revenue ?? 0
  const innerCircleRevenue = byType.find(t => t.key === 'membership_inner_circle')?.revenue ?? 0
  const roadTripRevenue = byType.filter(t => t.key?.startsWith('road_trip')).reduce((sum, t) => sum + (t.revenue ?? 0), 0)

  const stats = [
    { label: 'Total Revenue', value: fmt(totalRevenue), color: '#3B6B2F', big: true },
    { label: 'Total Transactions', value: totalPaid, color: '#1a1a1a', big: false },
    { label: 'Routes Member Revenue', value: fmt(routesRevenue), color: '#1a1a1a', big: false },
    { label: 'Inner Circle Revenue', value: fmt(innerCircleRevenue), color: '#1a1a1a', big: false },
    { label: 'Road Trip Revenue', value: fmt(roadTripRevenue), color: '#1a1a1a', big: false },
  ]

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Canvas Routes</div>
            <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Revenue</h1>
          </div>
          <ExportButton
            filename="revenue"
            title="Revenue"
            headers={['Name', 'Email', 'Type', 'Amount (CAD)', 'Date']}
            rows={payments.map(p => [
              p.name || '',
              p.email || '',
              p.type || '',
              (p.amount ?? 0).toFixed(2),
              p.date ? new Date(p.date).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }) : '',
            ])}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: s.big ? '1.7rem' : '1.5rem', fontWeight: '300', color: s.color, lineHeight: 1.1, fontFamily: 'var(--font-inter),sans-serif', wordBreak: 'break-word' }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.5rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Monthly breakdown */}
        <div style={{ ...CARD }}>
          <div style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
            <div style={SECTION_LABEL}>Monthly Breakdown</div>
          </div>
          {byMonth.length === 0 ? (
            <div style={{ padding: '1rem 1.5rem 1.5rem', fontSize: '12px', color: '#ccc' }}>No data yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Month</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Transactions</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.map(m => (
                    <tr key={m.ym}>
                      <td style={TD}>{m.label}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#555' }}>{m.count}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#3B6B2F', fontWeight: '400' }}>{fmt(m.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* By type */}
        <div style={{ ...CARD }}>
          <div style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
            <div style={SECTION_LABEL}>By Payment Type</div>
          </div>
          {byType.length === 0 ? (
            <div style={{ padding: '1rem 1.5rem 1.5rem', fontSize: '12px', color: '#ccc' }}>No data yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Type</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Count</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map(t => (
                    <tr key={t.key}>
                      <td style={TD}>{t.label}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#555' }}>{t.count}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#3B6B2F' }}>{fmt(t.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div style={{ ...CARD }}>
        <div style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
          <div style={SECTION_LABEL}>Recent Payments</div>
        </div>
        {recentPayments.length === 0 ? (
          <div style={{ padding: '1rem 1.5rem 1.5rem', fontSize: '12px', color: '#ccc' }}>No payments yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Name</th>
                  <th style={TH}>Email</th>
                  <th style={TH}>Type</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, i) => (
                  <tr key={`${p.email}-${p.date}-${i}`}>
                    <td style={{ ...TD, fontWeight: '400' }}>{p.name}</td>
                    <td style={{ ...TD, color: '#666', fontSize: '12px' }}>{p.email}</td>
                    <td style={{ ...TD, color: '#666', fontSize: '12px' }}>{p.type}</td>
                    <td style={{ ...TD, textAlign: 'right', color: '#3B6B2F' }}>{fmt(p.amount)}</td>
                    <td style={{ ...TD, textAlign: 'right', color: '#999', fontSize: '12px', whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
