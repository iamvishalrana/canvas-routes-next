'use client'
import { useState, useEffect } from 'react'
import { inp, GhostBtn, DangerBtn } from '../_components/shared'
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

const STATUS_COLORS = {
  paid:                { bg: 'rgba(59,107,47,0.1)',    text: '#3B6B2F', border: 'rgba(59,107,47,0.3)' },
  authorized:          { bg: 'rgba(59,107,47,0.06)',   text: '#5a8a4a', border: 'rgba(59,107,47,0.2)' },
  refunded:            { bg: 'rgba(80,80,180,0.08)',   text: '#4040aa', border: 'rgba(80,80,180,0.3)' },
  partially_refunded:  { bg: 'rgba(197,168,130,0.12)', text: '#8A6535', border: 'rgba(197,168,130,0.4)' },
  disputed:            { bg: 'rgba(180,60,0,0.1)',     text: '#b33c00', border: 'rgba(180,60,0,0.3)' },
  failed:              { bg: 'rgba(123,32,50,0.1)',    text: '#7B2032', border: 'rgba(123,32,50,0.3)' },
  pending:             { bg: 'rgba(197,168,130,0.15)', text: '#8A6535', border: 'rgba(197,168,130,0.45)' },
}

function StatusChip({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${c.border}`, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
      {status || 'unknown'}
    </span>
  )
}

const PI_BASE = 'https://dashboard.stripe.com/payments/'

function Actions({ r, ctx }) {
  const {
    authorizedAction, authorizedErr, authorizedBusy,
    refunding, refundReason, refundErr, refundBusy,
    receiptConfirm, receiptBusy, receiptDone, receiptErr,
    doCapture, doCancel, doRefund, resendReceipt,
    setAuthorizedAction, setRefunding, setRefundReason, setReceiptConfirm, setRefundErr,
  } = ctx
  const isPaid = ['paid', 'partially_refunded'].includes(r.stripe_payment_status)
  const isAuthorized = r.stripe_payment_status === 'authorized'
  const canReceipt = !r.manual && r.stripe_payment_intent_id
  if (!canReceipt && !isAuthorized) return null

  if (isAuthorized) {
    if (authorizedAction === r.stripe_payment_intent_id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '180px' }}>
          <div style={{ fontSize: '11px', color: '#1a1a1a' }}>Capture ${((r.stripe_amount_paid || 0) / 100).toFixed(2)} or cancel hold?</div>
          {authorizedErr[r.stripe_payment_intent_id] && <div style={{ fontSize: '11px', color: '#7B2032' }}>{authorizedErr[r.stripe_payment_intent_id]}</div>}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <GhostBtn small onClick={() => doCapture(r)} disabled={authorizedBusy === r.stripe_payment_intent_id}>
              {authorizedBusy === r.stripe_payment_intent_id ? '…' : 'Capture'}
            </GhostBtn>
            <DangerBtn small onClick={() => doCancel(r)} disabled={authorizedBusy === r.stripe_payment_intent_id}>Cancel hold</DangerBtn>
            <GhostBtn small onClick={() => setAuthorizedAction(null)} disabled={!!authorizedBusy}>Back</GhostBtn>
          </div>
        </div>
      )
    }
    return <GhostBtn small onClick={() => setAuthorizedAction(r.stripe_payment_intent_id)}>Review hold</GhostBtn>
  }

  if (refunding === r.stripe_payment_intent_id) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '160px' }}>
        <div style={{ fontSize: '11px', color: '#7B2032' }}>Refund {fmt(r.stripe_amount_paid)}?</div>
        {refundErr[r.stripe_payment_intent_id] && <div style={{ fontSize: '11px', color: '#7B2032' }}>{refundErr[r.stripe_payment_intent_id]}</div>}
        <select value={refundReason} onChange={e => setRefundReason(e.target.value)}
          style={{ fontSize: '11px', padding: '0.3rem 0.5rem', border: '0.5px solid rgba(0,0,0,0.2)', background: '#fff', fontFamily: 'var(--font-inter),sans-serif', color: '#555', cursor: 'pointer' }}>
          <option value="requested_by_customer">Requested by customer</option>
          <option value="duplicate">Duplicate</option>
          <option value="fraudulent">Fraudulent</option>
        </select>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <DangerBtn small onClick={() => doRefund(r)} disabled={refundBusy === r.stripe_payment_intent_id}>
            {refundBusy === r.stripe_payment_intent_id ? '…' : 'Confirm'}
          </DangerBtn>
          <GhostBtn small onClick={() => { setRefunding(null); setRefundReason('requested_by_customer') }}>Cancel</GhostBtn>
        </div>
      </div>
    )
  }

  if (receiptConfirm === r.stripe_payment_intent_id) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '180px' }}>
      <div style={{ fontSize: '11px', color: '#8A6535' }}>Resend receipt to {r.email}?</div>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        <GhostBtn small onClick={() => { setReceiptConfirm(null); resendReceipt(r) }} disabled={!!receiptBusy}>
          {receiptBusy === r.stripe_payment_intent_id ? '…' : 'Confirm'}
        </GhostBtn>
        <GhostBtn small onClick={() => setReceiptConfirm(null)}>Cancel</GhostBtn>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      <GhostBtn small onClick={() => setReceiptConfirm(r.stripe_payment_intent_id)}>
        {receiptDone[r.stripe_payment_intent_id] ? 'Sent!' : 'Receipt'}
      </GhostBtn>
      {isPaid && (
        <DangerBtn small onClick={() => { setRefunding(r.stripe_payment_intent_id); setRefundErr(p => ({ ...p, [r.stripe_payment_intent_id]: null })) }}>
          Refund
        </DangerBtn>
      )}
      {r.stripe_payment_status === 'disputed' && (
        <a href={`${PI_BASE}${r.stripe_payment_intent_id}`} target="_blank" rel="noreferrer"
          style={{ padding: '0.3rem 0.7rem', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif', color: '#b33c00', border: '0.5px solid rgba(180,60,0,0.3)', textDecoration: 'none', display: 'inline-block' }}>
          View Dispute ↗
        </a>
      )}
      {receiptErr[r.stripe_payment_intent_id] && <div style={{ fontSize: '10px', color: '#7B2032', width: '100%' }}>{receiptErr[r.stripe_payment_intent_id]}</div>}
    </div>
  )
}

function PiLink({ id, manual }) {
  if (manual) return <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A6535', background: 'rgba(197,168,130,0.1)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '2px 7px' }}>E-transfer</span>
  if (!id) return <span style={{ color: '#ccc' }}>—</span>
  return (
    <a href={PI_BASE + id} target="_blank" rel="noreferrer"
      style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888', textDecoration: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.2)' }}>
      {id.slice(0, 20)}…
    </a>
  )
}

export default function PaymentsClient({ initialRecords = [] }) {
  const [records, setRecords]         = useState(initialRecords)
  const [loading, setLoading]         = useState(false)
  const [filter, setFilter]           = useState('')
  const [sort, setSort]               = useState('date_desc')
  const [search, setSearch]           = useState('')
  const [isMobile, setIsMobile]       = useState(false)
  const [showFailed, setShowFailed]   = useState(false)
  const [refunding, setRefunding]     = useState(null)
  const [refundBusy, setRefundBusy]   = useState(null)
  const [refundErr, setRefundErr]     = useState({})
  const [authorizedAction, setAuthorizedAction] = useState(null) // piId showing capture/cancel UI
  const [authorizedBusy, setAuthorizedBusy]     = useState(null)
  const [authorizedErr, setAuthorizedErr]       = useState({})
  const [refundReason, setRefundReason] = useState('requested_by_customer')
  const [receiptConfirm, setReceiptConfirm] = useState(null)
  const [receiptBusy, setReceiptBusy] = useState(null)
  const [receiptDone, setReceiptDone] = useState({})     // { [id]: true }
  const [receiptErr, setReceiptErr]   = useState({})

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])


  async function doCapture(r) {
    setAuthorizedBusy(r.stripe_payment_intent_id)
    setAuthorizedErr(p => ({ ...p, [r.stripe_payment_intent_id]: null }))
    try {
      const res = await fetch(`/api/admin/stripe-payments/${r.stripe_payment_intent_id}/capture`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setAuthorizedErr(p => ({ ...p, [r.stripe_payment_intent_id]: data.error || 'Capture failed.' })); return }
      setRecords(prev => prev.map(x => x.stripe_payment_intent_id === r.stripe_payment_intent_id ? { ...x, stripe_payment_status: 'paid' } : x))
      setAuthorizedAction(null)
    } catch { setAuthorizedErr(p => ({ ...p, [r.stripe_payment_intent_id]: 'Network error.' })) }
    finally { setAuthorizedBusy(null) }
  }

  async function doCancel(r) {
    setAuthorizedBusy(r.stripe_payment_intent_id)
    setAuthorizedErr(p => ({ ...p, [r.stripe_payment_intent_id]: null }))
    try {
      const res = await fetch(`/api/admin/stripe-payments/${r.stripe_payment_intent_id}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setAuthorizedErr(p => ({ ...p, [r.stripe_payment_intent_id]: data.error || 'Cancel failed.' })); return }
      setRecords(prev => prev.map(x => x.stripe_payment_intent_id === r.stripe_payment_intent_id ? { ...x, stripe_payment_status: 'rejected' } : x))
      setAuthorizedAction(null)
    } catch { setAuthorizedErr(p => ({ ...p, [r.stripe_payment_intent_id]: 'Network error.' })) }
    finally { setAuthorizedBusy(null) }
  }

  async function doRefund(r) {
    setRefundBusy(r.stripe_payment_intent_id)
    setRefundErr(p => ({ ...p, [r.stripe_payment_intent_id]: null }))
    try {
      const res = await fetch(`/api/admin/stripe-payments/${r.stripe_payment_intent_id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      })
      const data = await res.json()
      if (!res.ok) { setRefundErr(p => ({ ...p, [r.stripe_payment_intent_id]: data.error || 'Refund failed.' })); setRefunding(null); setRefundReason('requested_by_customer'); return }
      setRecords(prev => prev.map(x => x.stripe_payment_intent_id === r.stripe_payment_intent_id ? { ...x, stripe_payment_status: 'refunded' } : x))
      setRefunding(null)
      setRefundReason('requested_by_customer')
    } catch { setRefundErr(p => ({ ...p, [r.stripe_payment_intent_id]: 'Network error.' })); setRefunding(null); setRefundReason('requested_by_customer') }
    finally { setRefundBusy(null) }
  }

  async function resendReceipt(r) {
    setReceiptBusy(r.stripe_payment_intent_id)
    setReceiptErr(p => ({ ...p, [r.stripe_payment_intent_id]: null }))
    try {
      const res = await fetch(`/api/admin/stripe-payments/${r.stripe_payment_intent_id}/resend-receipt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: r.email }) })
      const data = await res.json()
      if (!res.ok) { setReceiptErr(p => ({ ...p, [r.stripe_payment_intent_id]: data.error || 'Failed.' })); return }
      setReceiptDone(p => ({ ...p, [r.stripe_payment_intent_id]: true }))
      setTimeout(() => setReceiptDone(p => { const { [r.stripe_payment_intent_id]: _, ...rest } = p; return rest }), 3000)
    } catch { setReceiptErr(p => ({ ...p, [r.stripe_payment_intent_id]: 'Network error.' })) }
    finally { setReceiptBusy(null) }
  }

  const totalCollected = records
    .filter(r => ['paid', 'partially_refunded'].includes(r.stripe_payment_status))
    .reduce((s, r) => s + (r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0), 0)
  const paidCount      = records.filter(r => ['paid','partially_refunded'].includes(r.stripe_payment_status)).length
  const otherCount     = records.filter(r => r.stripe_payment_status && !['paid','partially_refunded','failed','rejected'].includes(r.stripe_payment_status)).length

  const FAILED_STATUSES = ['failed', 'rejected']
  let filtered = records.filter(r => !FAILED_STATUSES.includes(r.stripe_payment_status))
  let failedRecords = records.filter(r => FAILED_STATUSES.includes(r.stripe_payment_status))
  if (filter) filtered = filtered.filter(r => r.stripe_payment_status === filter)
  if (search) {
    filtered = filtered.filter(r =>
      (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(search.toLowerCase())
    )
    failedRecords = failedRecords.filter(r =>
      (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(search.toLowerCase())
    )
  }
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

  const actionsCtx = {
    authorizedAction, authorizedErr, authorizedBusy,
    refunding, refundReason, refundErr, refundBusy,
    receiptConfirm, receiptBusy, receiptDone, receiptErr,
    doCapture, doCancel, doRefund, resendReceipt,
    setAuthorizedAction, setRefunding, setRefundReason, setReceiptConfirm, setRefundErr,
  }

  return (
    <div style={SECTION}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Payments</h1>
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
            <div style={{ fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
          style={{ ...inp, width: '220px', padding: '0.55rem 0.9rem', fontSize: '13px' }} />
        <div style={{ position: 'relative' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', width: '155px', padding: '0.55rem 2rem 0.55rem 0.9rem', fontSize: '13px' }}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="refunded">Refunded</option>
            <option value="disputed">Disputed</option>
            <option value="authorized">Authorized</option>
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
          headers={['Name', 'Email', 'Amount (CAD)', 'Refunded (CAD)', 'Net (CAD)', 'Status', 'Type', 'Payment Intent', 'Date']}
          rows={filtered.map(r => [
            r.name || '',
            r.email || '',
            r.stripe_amount_paid ? `$${(r.stripe_amount_paid / 100).toFixed(2)}` : '',
            r.stripe_amount_refunded ? `$${(r.stripe_amount_refunded / 100).toFixed(2)}` : '',
            `$${(((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)) / 100).toFixed(2)}`,
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
          {filtered.map((r, i) => (
            <div key={r.stripe_payment_intent_id || r.email || i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a' }}>{r.name || '—'}</div>
                <div>
                  <div style={{ fontWeight: '500', color: ['paid','partially_refunded'].includes(r.stripe_payment_status) ? '#3B6B2F' : '#1a1a1a' }}>
                    {r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}
                  </div>
                  {r.stripe_amount_refunded > 0 && (
                    <div style={{ fontSize: '11px', color: '#4040aa' }}>−{fmt(r.stripe_amount_refunded)} refunded</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.4rem' }}>{r.email}</div>
              <div style={{ marginBottom: '0.5rem' }}><PiLink id={r.stripe_payment_intent_id} manual={r.manual} /></div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <StatusChip status={r.stripe_payment_status} />
                {r.stripe_payment_type && <span style={{ fontSize: '11px', color: '#888' }}>{r.stripe_payment_type}</span>}
                <span style={{ fontSize: '11px', color: '#bbb', marginLeft: 'auto' }}>{fmtDate(r.stripe_paid_at)}</span>
              </div>
              <Actions r={r} ctx={actionsCtx} />
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
                <th style={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.stripe_payment_intent_id || r.email || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={TD}>{r.name || <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ ...TD, fontSize: '12px', color: '#555' }}>{r.email || <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ ...TD, fontWeight: '500', color: ['paid','partially_refunded'].includes(r.stripe_payment_status) ? '#3B6B2F' : '#1a1a1a' }}>
                    {r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}
                    {r.stripe_amount_refunded > 0 && (
                      <div style={{ fontSize: '10px', color: '#4040aa', fontWeight: '400' }}>−{fmt(r.stripe_amount_refunded)}</div>
                    )}
                  </td>
                  <td style={TD}><StatusChip status={r.stripe_payment_status} /></td>
                  <td style={{ ...TD, fontSize: '12px', color: '#888' }}>{r.stripe_payment_type || '—'}</td>
                  <td style={{ ...TD, fontSize: '12px', color: '#888' }}>{fmtDate(r.stripe_paid_at)}</td>
                  <td style={TD}><PiLink id={r.stripe_payment_intent_id} manual={r.manual} /></td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    <Actions r={r} ctx={actionsCtx} />
                    {r.id && <a href={`/admin/applications`} style={{ marginLeft: '0.5rem', fontSize: '11px', color: '#8A6535', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Application →</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Failed / Rejected — collapsed at bottom */}
      {failedRecords.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={() => setShowFailed(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0', fontFamily: 'var(--font-inter),sans-serif' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" style={{ transition: 'transform 0.2s', transform: showFailed ? 'rotate(0deg)' : 'rotate(-90deg)' }}><polyline points="6 9 12 15 18 9"/></svg>
            <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb' }}>
              Failed &amp; Rejected ({failedRecords.length})
            </span>
          </button>
          {showFailed && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', marginTop: '0.5rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {failedRecords.map((r, i) => (
                    <tr key={r.stripe_payment_intent_id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ ...TD, color: '#aaa' }}>{r.name || '—'}</td>
                      <td style={{ ...TD, fontSize: '12px', color: '#bbb' }}>{r.email}</td>
                      <td style={{ ...TD, fontSize: '12px', color: '#bbb' }}>{r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}</td>
                      <td style={TD}><StatusChip status={r.stripe_payment_status} /></td>
                      <td style={{ ...TD, fontSize: '12px', color: '#bbb' }}>{fmtDate(r.stripe_paid_at)}</td>
                      <td style={TD}><PiLink id={r.stripe_payment_intent_id} manual={r.manual} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
