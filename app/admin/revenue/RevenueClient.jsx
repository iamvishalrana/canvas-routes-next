'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { ExportButton } from '../_components/ExportModal'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

const monthKeyFormatter = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: MONTREAL_TZ })

// Date range is compared against the Montreal calendar date of each payment
// (not raw UTC), matching how the monthly breakdown already groups — a
// payment at 11pm Montreal time on the last day of a range must still count
// as being on that day, not the next UTC day.
function montrealDateKey(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: MONTREAL_TZ }).formatToParts(new Date(iso))
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`
}

const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }
const DATE_INPUT = { padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', borderRadius: '8px' }
const PAGE_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }
const SECTION_LABEL = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }
const TH = { fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', padding: '0.65rem 1rem', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', fontWeight: '400', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }
const TD = { fontSize: '13px', color: '#1a1a1a', padding: '0.75rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-inter),sans-serif', verticalAlign: 'middle' }

function fmt(amount) {
  return '$' + (amount ?? 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' CAD'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: MONTREAL_TZ })
}

const PI_BASE = 'https://dashboard.stripe.com/payments/'

function PaymentDetailPanel({ p }) {
  return (
    <div style={{ padding: '1rem 1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem 1.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Paid</div>
        <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{fmtDateTime(p.date)}</div>
      </div>
      <div>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Phone</div>
        <div style={{ fontSize: '13px', color: p.phone ? '#1a1a1a' : '#ccc' }}>{p.phone || '—'}</div>
      </div>
      <div>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Gross</div>
        <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{fmt(p.gross)}</div>
      </div>
      {p.taxSubtotal != null && (
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Subtotal</div>
          <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{fmt(p.taxSubtotal)}</div>
        </div>
      )}
      {p.taxDiscount > 0 && (
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Discount</div>
          <div style={{ fontSize: '13px', color: '#4040aa' }}>−{fmt(p.taxDiscount)}</div>
        </div>
      )}
      {p.taxGst != null && (
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>GST</div>
          <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{fmt(p.taxGst)}</div>
        </div>
      )}
      {p.taxQst != null && (
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>QST</div>
          <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{fmt(p.taxQst)}</div>
        </div>
      )}
      {p.refunded > 0 && (
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Refunded</div>
          <div style={{ fontSize: '13px', color: '#4040aa' }}>−{fmt(p.refunded)}</div>
        </div>
      )}
      <div>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Net</div>
        <div style={{ fontSize: '13px', color: '#3B6B2F', fontWeight: '500' }}>{fmt(p.amount)}</div>
      </div>
      <div>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '3px' }}>Payment</div>
        {p.manual ? (
          <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A6535', background: 'rgba(197,168,130,0.1)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '2px 7px' }}>E-transfer</span>
        ) : p.id ? (
          <a href={PI_BASE + p.id} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', textDecoration: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.2)' }}>
            {p.id.slice(0, 20)}… ↗
          </a>
        ) : <span style={{ color: '#ccc' }}>—</span>}
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <a href={`/admin/applications?q=${encodeURIComponent(p.email)}`} style={{ fontSize: '11px', color: '#8A6535', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          View full application →
        </a>
      </div>
    </div>
  )
}

export default function RevenueClient({ payments = [], stripeError = false }) {
  const [isMobile, setIsMobile] = useState(false)
  const [expanded, setExpanded] = useState(null) // index of the recent payment row currently open
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const filteredPayments = useMemo(() => {
    if (!dateFrom && !dateTo) return payments
    return payments.filter(p => {
      if (!p.date) return false
      const key = montrealDateKey(p.date)
      if (dateFrom && key < dateFrom) return false
      if (dateTo && key > dateTo) return false
      return true
    })
  }, [payments, dateFrom, dateTo])

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalPaid = filteredPayments.length

  const byType = useMemo(() => {
    const map = new Map()
    for (const p of filteredPayments) {
      const key = p.typeKey || 'unknown'
      if (!map.has(key)) map.set(key, { key, label: p.type, count: 0, revenue: 0 })
      const entry = map.get(key)
      entry.count += 1
      entry.revenue += p.amount
    }
    return Array.from(map.values())
  }, [filteredPayments])

  const byMonth = useMemo(() => {
    const map = new Map()
    for (const p of filteredPayments) {
      if (!p.date) continue
      const parts = monthKeyFormatter.formatToParts(new Date(p.date))
      const ym = `${parts.find(x => x.type === 'year').value}-${parts.find(x => x.type === 'month').value}`
      if (!map.has(ym)) map.set(ym, { count: 0, revenue: 0 })
      const entry = map.get(ym)
      entry.count += 1
      entry.revenue += p.amount
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, val]) => {
        const [year, month] = ym.split('-')
        const label = new Date(Date.UTC(Number(year), Number(month) - 1, 1, 12)).toLocaleDateString('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        return { ym, label, count: val.count, revenue: val.revenue }
      })
  }, [filteredPayments])

  // Sorted newest-first — capped only when unfiltered (all-time) to keep the
  // page light; once a date range narrows things down, show everything in it.
  const recentPayments = useMemo(() => {
    const sorted = [...filteredPayments].sort((a, b) => new Date(b.date) - new Date(a.date))
    return (dateFrom || dateTo) ? sorted : sorted.slice(0, 10)
  }, [filteredPayments, dateFrom, dateTo])

  const routesRevenue = byType.find(t => t.key === 'membership_routes')?.revenue ?? 0
  const innerCircleRevenue = byType.find(t => t.key === 'membership_inner_circle')?.revenue ?? 0
  const roadTripRevenue = byType.filter(t => t.key?.startsWith('road_trip')).reduce((sum, t) => sum + (t.revenue ?? 0), 0)
  const eventRevenue = byType.find(t => t.key === 'event_registration')?.revenue ?? 0

  const stats = [
    { label: 'Total Revenue', value: fmt(totalRevenue), color: '#3B6B2F', big: true },
    { label: 'Total Transactions', value: totalPaid, color: '#1a1a1a', big: false },
    { label: 'Routes Member Revenue', value: fmt(routesRevenue), color: '#1a1a1a', big: false },
    { label: 'Inner Circle Revenue', value: fmt(innerCircleRevenue), color: '#1a1a1a', big: false },
    { label: 'Route Revenue', value: fmt(roadTripRevenue), color: '#1a1a1a', big: false },
    { label: 'Event Revenue', value: fmt(eventRevenue), color: '#1a1a1a', big: false },
  ]

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Canvas Routes</div>
            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Revenue</h1>
          </div>
          <ExportButton
            filename="revenue"
            title="Revenue"
            headers={['Name', 'Email', 'Type', 'Amount (CAD)', 'Date']}
            rows={filteredPayments.map(p => [
              p.name || '',
              p.email || '',
              p.type || '',
              (p.amount ?? 0).toFixed(2),
              p.date ? new Date(p.date).toLocaleDateString('en-CA', { timeZone: MONTREAL_TZ }) : '',
            ])}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.1rem' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>Date Range</span>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} style={DATE_INPUT} />
          <span style={{ fontSize: '11px', color: '#bbb' }}>to</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} style={DATE_INPUT} />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }}
              style={{ background: 'none', border: 'none', color: '#8A6535', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {stripeError && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(147,51,62,0.06)', border: '0.5px solid rgba(147,51,62,0.25)', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '12px', color: '#93333E' }}>
          Couldn&apos;t load live data from Stripe — the numbers below only include manual payments and may be incomplete. Reload the page to try again.
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: s.big ? '1.7rem' : '1.5rem', fontWeight: '400', color: s.color, lineHeight: 1.1, fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", letterSpacing: '0.03em', wordBreak: 'break-word' }}>{s.value}</div>
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
          <div style={SECTION_LABEL}>{(dateFrom || dateTo) ? `Payments In Range (${recentPayments.length})` : 'Recent Payments'}</div>
        </div>
        {recentPayments.length === 0 ? (
          <div style={{ padding: '1rem 1.5rem 1.5rem', fontSize: '12px', color: '#ccc' }}>No payments yet.</div>
        ) : isMobile ? (
          /* Cards on mobile — a five-column table only side-scrolls at 390px */
          <div style={{ padding: '0 1rem 1rem' }}>
            {recentPayments.map((p, i) => (
              <div key={`${p.email}-${p.date}-${i}`}>
                <div onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{ padding: '0.75rem 0.25rem', borderTop: i > 0 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '13px', color: '#3B6B2F', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(p.amount)}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', wordBreak: 'break-all' }}>{p.email}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#8A6535' }}>{p.type}</span>
                    <span style={{ fontSize: '11px', color: '#bbb', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      {fmtDate(p.date)}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" style={{ transition: 'transform 0.2s', transform: expanded === i ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                </div>
                {expanded === i && <PaymentDetailPanel p={p} />}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}></th>
                  <th style={TH}>Name</th>
                  <th style={TH}>Email</th>
                  <th style={TH}>Type</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p, i) => (
                  <Fragment key={`${p.email}-${p.date}-${i}`}>
                    <tr onClick={() => setExpanded(expanded === i ? null : i)}
                      style={{ cursor: 'pointer', background: expanded === i ? 'rgba(197,168,130,0.05)' : undefined }}>
                      <td style={{ ...TD, width: '20px', color: '#ccc' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" style={{ transition: 'transform 0.2s', transform: expanded === i ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
                      </td>
                      <td style={{ ...TD, fontWeight: '400' }}>{p.name}</td>
                      <td style={{ ...TD, color: '#666', fontSize: '12px' }}>{p.email}</td>
                      <td style={{ ...TD, color: '#666', fontSize: '12px' }}>{p.type}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#3B6B2F' }}>{fmt(p.amount)}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#999', fontSize: '12px', whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                    </tr>
                    {expanded === i && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                          <PaymentDetailPanel p={p} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
