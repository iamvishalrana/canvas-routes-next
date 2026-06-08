'use client'
import { useState, useEffect } from 'react'
import { inp, GhostBtn } from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'

const SECTION = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.5rem' }

function fmt(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusChip({ status }) {
  const colors = {
    paid:      { bg: 'rgba(59,107,47,0.1)',    text: '#3B6B2F', border: 'rgba(59,107,47,0.3)' },
    pending:   { bg: 'rgba(197,168,130,0.15)', text: '#8A6535', border: 'rgba(197,168,130,0.45)' },
    failed:    { bg: 'rgba(123,32,50,0.1)',    text: '#7B2032', border: 'rgba(123,32,50,0.3)' },
  }
  const c = colors[status] || colors.pending
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${c.border}`, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
      {status || 'unknown'}
    </span>
  )
}

export default function PaymentsClient() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('')
  const [sort, setSort]         = useState('date_desc')
  const [search, setSearch]     = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/admin/applications')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const withStripe = (Array.isArray(data) ? data : []).filter(a => a.stripe_payment_status || a.stripe_payment_intent_id)
        setRecords(withStripe)
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [])

  const totalCollected = records.filter(r => r.stripe_payment_status === 'paid').reduce((s, r) => s + (r.stripe_amount_paid || 0), 0)
  const paidCount      = records.filter(r => r.stripe_payment_status === 'paid').length
  const otherCount     = records.filter(r => r.stripe_payment_status && r.stripe_payment_status !== 'paid').length

  let filtered = records
  if (filter)  filtered = filtered.filter(r => r.stripe_payment_status === filter)
  if (search)  filtered = filtered.filter(r => (r.name || '').toLowerCase().includes(search.toLowerCase()) || (r.email || '').toLowerCase().includes(search.toLowerCase()))

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'date_desc')   return new Date(b.stripe_paid_at || 0) - new Date(a.stripe_paid_at || 0)
    if (sort === 'date_asc')    return new Date(a.stripe_paid_at || 0) - new Date(b.stripe_paid_at || 0)
    if (sort === 'amount_desc') return (b.stripe_amount_paid || 0) - (a.stripe_amount_paid || 0)
    if (sort === 'amount_asc')  return (a.stripe_amount_paid || 0) - (b.stripe_amount_paid || 0)
    if (sort === 'name_az')     return (a.name || '').localeCompare(b.name || '')
    return 0
  })

  const TH = { padding: '0.65rem 1rem', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', fontWeight: '400', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }
  const TD = { padding: '0.75rem 1rem', fontSize: '13px', color: '#1a1a1a', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-inter),sans-serif', verticalAlign: 'middle' }

  return (
    <div style={SECTION}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>Payments</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Collected', value: fmt(totalCollected), color: '#3B6B2F' },
          { label: 'Paid',           value: paidCount,            color: '#1a1a1a' },
          { label: 'Other Statuses', value: otherCount,           color: '#8A6535' },
          { label: 'Total Records',  value: records.length,       color: '#1a1a1a' },
        ].map(s => (
          <div key={s.label} style={CARD}>
            <div style={{ fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
          style={{ ...inp, width: '220px', padding: '0.55rem 0.9rem', fontSize: '13px' }} />
        <div style={{ position: 'relative' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', width: '150px', padding: '0.55rem 2rem 0.55rem 0.9rem', fontSize: '13px' }}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div style={{ position: 'relative' }}>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', width: '170px', padding: '0.55rem 2rem 0.55rem 0.9rem', fontSize: '13px' }}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
            <option value="name_az">Name A–Z</option>
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <ExportButton
          filename="payments"
          title="Payments"
          headers={['Name', 'Email', 'Amount (CAD)', 'Status', 'Type', 'Payment Intent', 'Date']}
          rows={filtered.map(r => [
            r.name || '',
            r.email || '',
            r.stripe_amount_paid ? `$${(r.stripe_amount_paid / 100).toFixed(2)}` : '',
            r.stripe_payment_status || '',
            r.stripe_payment_type || '',
            r.stripe_payment_intent_id || '',
            r.stripe_paid_at ? new Date(r.stripe_paid_at).toLocaleDateString('en-CA') : '',
          ])}
        />
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No payment records found.</div>
      ) : isMobile ? (
        <div>
          {filtered.map(r => (
            <div key={r.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a' }}>{r.name || '—'}</div>
                <div style={{ fontWeight: '500', color: r.stripe_payment_status === 'paid' ? '#3B6B2F' : '#1a1a1a' }}>
                  {r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.6rem' }}>{r.email}</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusChip status={r.stripe_payment_status} />
                {r.stripe_payment_type && <span style={{ fontSize: '11px', color: '#888' }}>{r.stripe_payment_type}</span>}
                <span style={{ fontSize: '11px', color: '#bbb', marginLeft: 'auto' }}>{fmtDate(r.stripe_paid_at)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Name</th>
                <th style={TH}>Email</th>
                <th style={TH}>Amount</th>
                <th style={TH}>Status</th>
                <th style={TH}>Type</th>
                <th style={TH}>Date</th>
                <th style={TH}>Payment Intent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={TD}>{r.name || <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ ...TD, fontSize: '12px', color: '#555' }}>{r.email}</td>
                  <td style={{ ...TD, fontWeight: '500', color: r.stripe_payment_status === 'paid' ? '#3B6B2F' : '#1a1a1a' }}>
                    {r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}
                  </td>
                  <td style={TD}><StatusChip status={r.stripe_payment_status} /></td>
                  <td style={{ ...TD, fontSize: '12px', color: '#888' }}>{r.stripe_payment_type || '—'}</td>
                  <td style={{ ...TD, fontSize: '12px', color: '#888' }}>{fmtDate(r.stripe_paid_at)}</td>
                  <td style={{ ...TD, fontSize: '11px', color: '#bbb', fontFamily: 'monospace' }}>
                    {r.stripe_payment_intent_id ? r.stripe_payment_intent_id.slice(0, 20) + '…' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
