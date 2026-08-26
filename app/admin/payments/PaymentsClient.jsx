'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import { inp, GhostBtn, DangerBtn, CopyBtn, DateRangeMenu } from '../_components/shared'
import { useConfirm } from '../_components/ConfirmProvider'
import { ExportButton } from '../_components/ExportModal'
import { MONTREAL_TZ } from '../../../lib/mtlTime'
import { formatPaymentType } from '../../../lib/paymentTypeLabels'

const SECTION = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem 1.5rem' }

function fmt(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`
}

// Turn a raw Stripe snake_case value (e.g. 'not_assessed') into plain,
// capitalized text ('Not assessed') for display.
function humanize(s) {
  if (!s) return ''
  const words = String(s).replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: MONTREAL_TZ })
}

// Compared against the Montreal calendar date, not raw UTC — a payment at
// 11pm Montreal time on the last day of a range must still count as that
// day, not the next UTC day.
function montrealDateKey(iso) {
  if (!iso) return null
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: MONTREAL_TZ }).formatToParts(new Date(iso))
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`
}

const WALLET_LABELS = { apple_pay: 'Apple Pay', google_pay: 'Google Pay', link: 'Link' }
const CARD_BRANDS   = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover', interac: 'Interac' }

// Expandable per-payment detail panel — every field the record and its PI
// metadata carry, in a grid that collapses to one column on phones.
function PaymentDetails({ r }) {
  const m = r.metadata || {}
  const net = (r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)
  const cardLabel = r.card_brand
    ? `${CARD_BRANDS[r.card_brand] || humanize(r.card_brand)} •••• ${r.card_last4}${r.wallet ? ` · ${WALLET_LABELS[r.wallet] || humanize(r.wallet)}` : ''}`
    : (r.manual ? 'Manual / e-transfer' : null)
  const rows = [
    ['Name',       r.name],
    ['Email',      r.email],
    ['Phone',      m.phone],
    ['Type',       r.stripe_payment_type ? formatPaymentType(r.stripe_payment_type) : null],
    ['Event',      m.event_name],
    ['Amount',     r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : null],
    ['Subtotal',   r.tax_subtotal != null ? fmt(r.tax_subtotal) : null],
    ['Discount',   r.tax_discount > 0 ? `−${fmt(r.tax_discount)}` : null],
    ['Coupon',     m.promo_code || null],
    ['GST',        r.tax_gst != null ? fmt(r.tax_gst) : null],
    ['QST',        r.tax_qst != null ? fmt(r.tax_qst) : null],
    ['Refunded',   r.stripe_amount_refunded > 0 ? `−${fmt(r.stripe_amount_refunded)}` : null],
    ['Net',        r.stripe_amount_refunded > 0 ? fmt(net) : null],
    ['Paid with',  cardLabel],
    ['Radar risk', r.risk_level ? `${humanize(r.risk_level)}${r.risk_score != null ? ` · ${r.risk_score}/99` : ''}` : null],
    ['Date',       fmtDateTime(r.stripe_paid_at)],
    ['DOB',        m.dob],
    ['Car',        [m.car_year, m.car_model || m.car_make].filter(Boolean).join(' ')],
    ['Passengers', m.passengers],
    ['Children',   m.has_children === 'yes' ? (m.children_ages ? `Yes — ages ${m.children_ages}` : 'Yes') : null],
    ['Instagram',  m.instagram ? `@${m.instagram}` : null],
    ['Heard via',  m.source],
    ['Message',    m.message || m.more],
  ].filter(([, v]) => v)
  return (
    <div onClick={e => e.stopPropagation()} style={{ padding: '0.9rem 1rem 1rem', background: 'rgba(197,168,130,0.05)', borderTop: '0.5px solid rgba(197,168,130,0.25)', cursor: 'default' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '0.55rem 1.25rem' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ minWidth: 0 }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b5a184', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '13px', color: '#1a1a1a', wordBreak: 'break-word' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
        {r.stripe_payment_intent_id && !r.manual && (
          <a href={PI_BASE + r.stripe_payment_intent_id} target="_blank" rel="noreferrer"
            style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A6535', textDecoration: 'none', borderBottom: '0.5px solid rgba(138,101,53,0.4)', paddingBottom: '1px' }}>
            View in Stripe ↗
          </a>
        )}
        {r.receipt_url && (
          <a href={r.receipt_url} target="_blank" rel="noreferrer"
            style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A6535', textDecoration: 'none', borderBottom: '0.5px solid rgba(138,101,53,0.4)', paddingBottom: '1px' }}>
            Stripe receipt ↗
          </a>
        )}
        {r.email && (
          <a href={`/admin/applications?q=${encodeURIComponent(r.email)}`}
            style={{ fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A6535', textDecoration: 'none', borderBottom: '0.5px solid rgba(138,101,53,0.4)', paddingBottom: '1px' }}>
            Application / Member →
          </a>
        )}
      </div>
    </div>
  )
}

const STATUS_COLORS = {
  paid:                { bg: 'rgba(59,107,47,0.1)',    text: '#3B6B2F', border: 'rgba(59,107,47,0.3)' },
  authorized:          { bg: 'rgba(59,107,47,0.06)',   text: '#5a8a4a', border: 'rgba(59,107,47,0.2)' },
  refunded:            { bg: 'rgba(80,80,180,0.08)',   text: '#4040aa', border: 'rgba(80,80,180,0.3)' },
  partially_refunded:  { bg: 'rgba(197,168,130,0.12)', text: '#8A6535', border: 'rgba(197,168,130,0.4)' },
  disputed:            { bg: 'rgba(180,60,0,0.1)',     text: '#b33c00', border: 'rgba(180,60,0,0.3)' },
  disputed_won:        { bg: 'rgba(59,107,47,0.1)',    text: '#3B6B2F', border: 'rgba(59,107,47,0.3)' },
  disputed_lost:       { bg: 'rgba(147,51,62,0.1)',    text: '#93333E', border: 'rgba(147,51,62,0.3)' },
  failed:              { bg: 'rgba(147,51,62,0.1)',    text: '#93333E', border: 'rgba(147,51,62,0.3)' },
  pending:             { bg: 'rgba(197,168,130,0.15)', text: '#8A6535', border: 'rgba(197,168,130,0.45)' },
}

function StatusChip({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${c.border}`, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
      {(status || 'unknown').replace(/_/g, ' ')}
    </span>
  )
}

// Stripe Radar risk level on the charge outcome. Only the two actionable
// tiers get a chip — 'normal' and 'not_assessed' (wallets are pre-authenticated,
// so they never carry a score) render nothing to keep the list uncluttered.
const RISK_STYLES = {
  elevated: { bg: 'rgba(180,120,0,0.1)',  text: '#9a6a00', border: 'rgba(180,120,0,0.35)', label: 'Elevated risk' },
  highest:  { bg: 'rgba(147,51,62,0.12)', text: '#93333E', border: 'rgba(147,51,62,0.4)',  label: 'High risk' },
}
function RiskChip({ level, score }) {
  const s = RISK_STYLES[level]
  if (!s) return null
  return (
    <span title="Stripe Radar risk assessment" style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${s.border}`, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      ⚠ {s.label}{score != null ? ` · ${score}` : ''}
    </span>
  )
}

const PI_BASE = 'https://dashboard.stripe.com/payments/'

function Actions({ r, ctx }) {
  const {
    authorizedAction, authorizedErr, authorizedBusy,
    refunding, refundReason, refundErr, refundBusy,
    receiptBusy, receiptDone, receiptErr,
    doCapture, doCancel, doRefund, resendReceipt,
    setAuthorizedAction, setRefunding, setRefundReason, setRefundErr,
  } = ctx
  const isPaid = ['paid', 'partially_refunded'].includes(r.stripe_payment_status)
  const isAuthorized = r.stripe_payment_status === 'authorized'
  const canReceipt = !r.manual && r.stripe_payment_intent_id
  if (!canReceipt && !isAuthorized) return null

  if (isAuthorized) {
    if (authorizedAction === r.stripe_payment_intent_id) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '230px' }}>
          <div style={{ fontSize: '11px', color: '#1a1a1a' }}>Capture ${((r.stripe_amount_paid || 0) / 100).toFixed(2)} or cancel hold?</div>
          {(r.risk_level === 'elevated' || r.risk_level === 'highest') && (
            <div style={{ fontSize: '11px', color: '#93333E', fontWeight: '500' }}>⚠ Radar: {r.risk_level === 'highest' ? 'high' : 'elevated'} risk{r.risk_score != null ? ` (${r.risk_score}/99)` : ''} — review in Stripe first.</div>
          )}
          {authorizedErr[r.stripe_payment_intent_id] && <div style={{ fontSize: '11px', color: '#93333E' }}>{authorizedErr[r.stripe_payment_intent_id]}</div>}
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
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
    // Reason picker only — the actual Yes/No gate is the popup that doRefund opens.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '160px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>Refund reason</div>
        {refundErr[r.stripe_payment_intent_id] && <div style={{ fontSize: '11px', color: '#93333E' }}>{refundErr[r.stripe_payment_intent_id]}</div>}
        <select value={refundReason} onChange={e => setRefundReason(e.target.value)}
          style={{ fontSize: '11px', padding: '0.3rem 0.5rem', border: '0.5px solid rgba(0,0,0,0.2)', background: '#fff', fontFamily: 'var(--font-inter),sans-serif', color: '#555', cursor: 'pointer' }}>
          <option value="requested_by_customer">Requested by customer</option>
          <option value="duplicate">Duplicate</option>
          <option value="fraudulent">Fraudulent</option>
        </select>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <DangerBtn small onClick={() => doRefund(r)} disabled={refundBusy === r.stripe_payment_intent_id}>
            {refundBusy === r.stripe_payment_intent_id ? '…' : `Refund ${fmt((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0))}`}
          </DangerBtn>
          <GhostBtn small onClick={() => { setRefunding(null); setRefundReason('requested_by_customer') }}>Cancel</GhostBtn>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      <GhostBtn small onClick={() => resendReceipt(r)} disabled={receiptBusy === r.stripe_payment_intent_id}>
        {receiptBusy === r.stripe_payment_intent_id ? '…' : receiptDone[r.stripe_payment_intent_id] ? 'Sent!' : 'Receipt'}
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
      {receiptErr[r.stripe_payment_intent_id] && <div style={{ fontSize: '10px', color: '#93333E', width: '100%' }}>{receiptErr[r.stripe_payment_intent_id]}</div>}
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
  const confirm = useConfirm()
  const searchParams = useSearchParams()
  const [records, setRecords]         = useState(initialRecords)
  const [loading, setLoading]         = useState(false)
  const [loadError, setLoadError]     = useState(false)

  // A failed refresh (dropped connection, tab backgrounded mid-request, etc.)
  // used to fail completely silently — the page just kept showing whatever
  // it last had, with no sign a refresh didn't go through. Surface it so a
  // stale view is visible and retryable instead of invisible.
  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/stripe-payments')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (Array.isArray(data)) { setRecords(data); setLoadError(false) } })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  useRealtimeSync('applications', load)
  const [filter, setFilter]           = useState('')
  const [sort, setSort]               = useState('date_desc')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  // ?search= lets other admin pages (e.g. the Routes tab's "Payments" quick
  // link) land here pre-filtered to one route's payment type — same pattern
  // as ?email= on Broadcasts (see EmailLink in _components/shared.jsx).
  const [search, setSearch]           = useState(() => searchParams.get('search') || '')
  const [isMobile, setIsMobile]       = useState(false)
  const [showFailed, setShowFailed]   = useState(false)
  const [refunding, setRefunding]     = useState(null)
  const [refundBusy, setRefundBusy]   = useState(null)
  const [refundErr, setRefundErr]     = useState({})
  const [authorizedAction, setAuthorizedAction] = useState(null) // piId showing capture/cancel UI
  const [authorizedBusy, setAuthorizedBusy]     = useState(null)
  const [authorizedErr, setAuthorizedErr]       = useState({})
  const [refundReason, setRefundReason] = useState('requested_by_customer')
  const [receiptBusy, setReceiptBusy] = useState(null)
  const [receiptDone, setReceiptDone] = useState({})     // { [id]: true }
  const [receiptErr, setReceiptErr]   = useState({})
  const [expandedKey, setExpandedKey] = useState(null)   // rowKey of the open detail panel

  const rowKey = (r, i) => r.stripe_payment_intent_id || `${r.email || 'row'}-${i}`
  const toggleExpanded = k => setExpandedKey(p => (p === k ? null : k))

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])


  async function doCapture(r) {
    const risky = r.risk_level === 'elevated' || r.risk_level === 'highest'
    if (!(await confirm({
      title: risky ? 'Capture a flagged payment?' : 'Capture this payment?',
      message: `This charges the card hold for ${fmt(r.stripe_amount_paid || 0)} and emails ${r.email || 'the customer'} a confirmation. It can only be reversed by refunding.`,
      details: risky
        ? `⚠ Stripe Radar flagged this hold as ${r.risk_level === 'highest' ? 'HIGH' : 'elevated'} risk${r.risk_score != null ? ` (score ${r.risk_score}/99)` : ''}. Review it in Stripe before charging — capturing a fraudulent hold invites a chargeback.`
        : undefined,
      confirmLabel: 'Yes, capture',
      danger: risky,
    }))) return
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
    const amount = (r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)
    if (!(await confirm({
      title: 'Refund this payment?',
      message: `This refunds ${fmt(amount)} to ${r.email || 'the customer'} and emails them a refund notification. It cannot be undone.`,
      details: <>Reason: <strong>{refundReason.replace(/_/g, ' ')}</strong></>,
      confirmLabel: 'Yes, refund',
      danger: true,
    }))) return
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
      // Full-remaining refund → reflect the full amount as refunded so the Net
      // line updates immediately, not just the status chip.
      setRecords(prev => prev.map(x => x.stripe_payment_intent_id === r.stripe_payment_intent_id ? { ...x, stripe_payment_status: 'refunded', stripe_amount_refunded: x.stripe_amount_paid } : x))
      setRefunding(null)
      setRefundReason('requested_by_customer')
    } catch { setRefundErr(p => ({ ...p, [r.stripe_payment_intent_id]: 'Network error.' })); setRefunding(null); setRefundReason('requested_by_customer') }
    finally { setRefundBusy(null) }
  }

  async function resendReceipt(r) {
    if (!(await confirm({
      title: 'Resend the receipt?',
      message: `This emails a payment receipt to ${r.email || 'the customer'}.`,
      confirmLabel: 'Yes, send receipt',
    }))) return
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

  // Quick date-range presets. Uses the browser's local calendar date, which for
  // Montreal admins matches the Montreal day the YYYY-MM-DD inputs compare
  // against (montrealDateKey).
  function setDatePreset(preset) {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    if (preset === 'all') { setDateFrom(''); setDateTo(''); return }
    const today = ymd(now)
    if (preset === 'month') { setDateFrom(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`); setDateTo(today) }
    else if (preset === 'year') { setDateFrom(`${now.getFullYear()}-01-01`); setDateTo(today) }
    else if (preset === '30d') { setDateFrom(ymd(new Date(now.getTime() - 29 * 86400000))); setDateTo(today) }
  }

  // Date range scopes every stat/table below — applied once here rather than
  // separately in each derived list, so the cards and the table always agree.
  const recordsInRange = (dateFrom || dateTo)
    ? records.filter(r => {
        const key = montrealDateKey(r.stripe_paid_at)
        if (!key) return false
        if (dateFrom && key < dateFrom) return false
        if (dateTo && key > dateTo) return false
        return true
      })
    : records

  // A dispute only actually loses money on 'disputed_lost' — 'disputed'
  // (pending/warning_closed) and 'disputed_won' don't withdraw funds, so
  // they still count as collected (their stripe_amount_refunded is already
  // set to the full amount for a lost dispute upstream, so including it
  // here would net to zero anyway — excluding it instead keeps it out of
  // "Paid" entirely, matching how Stripe's own dashboard treats it).
  const COLLECTED_STATUSES = ['paid', 'partially_refunded', 'disputed', 'disputed_won']
  const totalCollected = recordsInRange
    .filter(r => COLLECTED_STATUSES.includes(r.stripe_payment_status))
    .reduce((s, r) => s + (r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0), 0)
  const paidCount      = recordsInRange.filter(r => COLLECTED_STATUSES.includes(r.stripe_payment_status)).length
  const otherCount     = recordsInRange.filter(r => r.stripe_payment_status && !COLLECTED_STATUSES.includes(r.stripe_payment_status) && !['failed','rejected'].includes(r.stripe_payment_status)).length
  const totalRefunded  = recordsInRange.reduce((s, r) => s + (r.stripe_amount_refunded || 0), 0)

  const FAILED_STATUSES = ['failed', 'rejected']
  let filtered = recordsInRange.filter(r => !FAILED_STATUSES.includes(r.stripe_payment_status))
  let failedRecords = recordsInRange.filter(r => FAILED_STATUSES.includes(r.stripe_payment_status))
  if (filter) filtered = filtered.filter(r => r.stripe_payment_status === filter)
  if (search) {
    const q = search.toLowerCase()
    // Match name/email plus the payment-intent id and type, so an admin can
    // paste a pi_… from Stripe or filter by "membership"/"road_trip_…".
    const match = r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.stripe_payment_intent_id || '').toLowerCase().includes(q) ||
      (r.stripe_payment_type || '').toLowerCase().includes(q) ||
      formatPaymentType(r.stripe_payment_type).toLowerCase().includes(q)
    filtered = filtered.filter(match)
    failedRecords = failedRecords.filter(match)
  }
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'date_desc')   return new Date(b.stripe_paid_at || 0) - new Date(a.stripe_paid_at || 0)
    if (sort === 'date_asc')    return new Date(a.stripe_paid_at || 0) - new Date(b.stripe_paid_at || 0)
    if (sort === 'amount_desc') return (b.stripe_amount_paid || 0) - (a.stripe_amount_paid || 0)
    if (sort === 'amount_asc')  return (a.stripe_amount_paid || 0) - (b.stripe_amount_paid || 0)
    if (sort === 'name_az')     return (a.name || '').localeCompare(b.name || '')
    return 0
  })
  // Net total of exactly what's shown (post search/status/date filter)
  const filteredNet = filtered.reduce((s, r) => s + ((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)), 0)

  const TH = { padding: '0.65rem 1rem', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', fontWeight: '400', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }
  const TD = { padding: '0.75rem 1rem', fontSize: '13px', color: '#1a1a1a', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-inter),sans-serif', verticalAlign: 'middle' }

  const actionsCtx = {
    authorizedAction, authorizedErr, authorizedBusy,
    refunding, refundReason, refundErr, refundBusy,
    receiptBusy, receiptDone, receiptErr,
    doCapture, doCancel, doRefund, resendReceipt,
    setAuthorizedAction, setRefunding, setRefundReason, setRefundErr,
  }

  return (
    <div className="pay-wrap" style={SECTION}>
      <style>{`
        /* iOS zooms in when a focused input's font-size is under 16px. The
           filter/search/date inputs here are 12–13px, so bump them to 16px on
           touch devices only — keeps desktop density, kills the home-screen
           app's zoom-on-focus. */
        @media (pointer: coarse) {
          .pay-wrap input, .pay-wrap select { font-size: 16px !important; }
        }
      `}</style>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Payments</h1>
      </div>

      {loadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0.75rem 1rem', background: 'rgba(147,51,62,0.06)', border: '0.5px solid rgba(147,51,62,0.25)', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '12px', color: '#93333E' }}>
          Couldn&apos;t refresh live data from Stripe — showing the last loaded results.
          <button type="button" onClick={load} disabled={loading}
            style={{ background: 'none', border: 'none', color: '#93333E', textDecoration: 'underline', textUnderlineOffset: '2px', cursor: loading ? 'wait' : 'pointer', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>
            {loading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Collected', value: fmt(totalCollected), color: '#3B6B2F' },
          { label: 'Refunded',       value: fmt(totalRefunded),   color: '#4040aa' },
          { label: 'Paid',           value: paidCount,            color: '#1a1a1a' },
          { label: 'Other Statuses', value: otherCount,           color: '#8A6535' },
          { label: 'Total Records',  value: recordsInRange.length, color: '#1a1a1a' },
        ].map(s => (
          <div key={s.label} style={CARD}>
            <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '2rem', fontWeight: '400', color: s.color, lineHeight: 1, letterSpacing: '0.03em' }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters — on mobile the search takes its own full row and the two
          selects split the next row, instead of fixed desktop widths wrapping
          into a ragged stack on a 390px screen */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
          style={{ ...inp, width: isMobile ? '100%' : '220px', padding: '0.55rem 0.9rem', fontSize: '13px' }} />
        <div style={{ position: 'relative', ...(isMobile ? { flex: '1 1 0', minWidth: 0 } : {}) }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', width: isMobile ? '100%' : '155px', padding: '0.55rem 2rem 0.55rem 0.9rem', fontSize: '13px' }}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="refunded">Refunded</option>
            <option value="disputed">Disputed</option>
            <option value="authorized">Authorized</option>
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div style={{ position: 'relative', ...(isMobile ? { flex: '1 1 0', minWidth: 0 } : {}) }}>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', width: isMobile ? '100%' : '170px', padding: '0.55rem 2rem 0.55rem 0.9rem', fontSize: '13px' }}>
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
          headers={['Name', 'Email', 'Method', 'Amount (CAD)', 'Discount (CAD)', 'GST (CAD)', 'QST (CAD)', 'Refunded (CAD)', 'Net (CAD)', 'Coupon', 'Status', 'Type', 'Payment Intent', 'Date']}
          rows={filtered.map(r => {
            const money = c => (c != null ? (c / 100).toFixed(2) : '')
            const method = r.manual ? 'E-transfer'
              : r.card_brand ? `${r.card_brand} ****${r.card_last4 || ''}${r.wallet ? ` (${WALLET_LABELS[r.wallet] || r.wallet})` : ''}`
              : ''
            return [
              r.name || '',
              r.email || '',
              method,
              money(r.stripe_amount_paid),
              r.tax_discount > 0 ? money(r.tax_discount) : '',
              money(r.tax_gst),
              money(r.tax_qst),
              r.stripe_amount_refunded ? money(r.stripe_amount_refunded) : '',
              (((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)) / 100).toFixed(2),
              r.metadata?.promo_code || '',
              r.stripe_payment_status || '',
              r.stripe_payment_type ? formatPaymentType(r.stripe_payment_type) : '',
              r.stripe_payment_intent_id || '',
              r.stripe_paid_at ? new Date(r.stripe_paid_at).toLocaleDateString('en-CA', { timeZone: MONTREAL_TZ }) : '',
            ]
          })}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <DateRangeMenu label="Date Range" from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        {/* Quick presets — matches the Montreal-local day the date inputs compare against */}
        {[['month', 'This month'], ['30d', 'Last 30d'], ['year', 'This year'], ['all', 'All time']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setDatePreset(key)}
            style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', color: '#666', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.35rem 0.7rem', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Live summary of exactly what the table is showing right now — reflects
          the search + status + date filters together, which the range-only stat
          cards above don't. */}
      {!loading && filtered.length > 0 && (
        <div style={{ fontSize: '12px', color: '#777', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
          Showing <strong style={{ color: '#1a1a1a', fontWeight: 500 }}>{filtered.length}</strong> payment{filtered.length !== 1 ? 's' : ''}
          {' · '}<span style={{ color: '#3B6B2F' }}>{fmt(filteredNet)} net</span>
          {(search || filter || dateFrom || dateTo) && <span style={{ color: '#bbb' }}> (filtered)</span>}
        </div>
      )}

      {/* Table / Cards */}
      {loading ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No payment records found.</div>
      ) : isMobile ? (
        <div>
          {filtered.map((r, i) => {
            const k = rowKey(r, i)
            const open = expandedKey === k
            return (
            <div key={k} onClick={() => toggleExpanded(k)}
              style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: '0.5rem', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', overflow: 'hidden' }}>
              <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                {r.email ? (
                  <a href={`/admin/applications?q=${encodeURIComponent(r.email)}`} onClick={e => e.stopPropagation()}
                    style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a', textDecoration: 'none', borderBottom: '0.5px dotted rgba(0,0,0,0.35)', paddingBottom: '1px' }}>
                    {r.name || r.email}
                  </a>
                ) : (
                  <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a' }}>{r.name || '—'}</div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '500', color: ['paid','partially_refunded'].includes(r.stripe_payment_status) ? '#3B6B2F' : '#1a1a1a' }}>
                    {r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}
                  </div>
                  {r.stripe_amount_refunded > 0 && (
                    <div style={{ fontSize: '11px', color: '#4040aa' }}>−{fmt(r.stripe_amount_refunded)} refunded</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>{r.email}<CopyBtn value={r.email} /></div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <StatusChip status={r.stripe_payment_status} />
                <RiskChip level={r.risk_level} score={r.risk_score} />
                {r.stripe_payment_type && <span style={{ fontSize: '11px', color: '#888' }}>{formatPaymentType(r.stripe_payment_type)}</span>}
                <span style={{ fontSize: '11px', color: '#bbb', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  {fmtDate(r.stripe_paid_at)}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>
              <div onClick={e => e.stopPropagation()} style={{ cursor: 'default' }}>
                <Actions r={r} ctx={actionsCtx} />
              </div>
              </div>
              {open && <PaymentDetails r={r} />}
            </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
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
              {filtered.map((r, i) => {
                const k = rowKey(r, i)
                const open = expandedKey === k
                return (
                <React.Fragment key={k}>
                <tr onClick={() => toggleExpanded(k)} style={{ background: open ? 'rgba(197,168,130,0.05)' : i % 2 === 0 ? '#fff' : '#fafaf8', cursor: 'pointer' }}>
                  <td style={TD}>
                    {r.email ? (
                      <a href={`/admin/applications?q=${encodeURIComponent(r.email)}`} onClick={e => e.stopPropagation()}
                        title="Open this person's application / membership"
                        style={{ color: '#1a1a1a', textDecoration: 'none', borderBottom: '0.5px dotted rgba(0,0,0,0.35)', paddingBottom: '1px' }}>
                        {r.name || r.email}
                      </a>
                    ) : (r.name || <span style={{ color: '#ccc' }}>—</span>)}
                  </td>
                  <td style={{ ...TD, fontSize: '12px', color: '#555' }}>{r.email ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>{r.email}<CopyBtn value={r.email} /></span> : <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ ...TD, fontWeight: '500', color: ['paid','partially_refunded'].includes(r.stripe_payment_status) ? '#3B6B2F' : '#1a1a1a' }}>
                    {r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}
                    {r.stripe_amount_refunded > 0 && (
                      <div style={{ fontSize: '10px', color: '#4040aa', fontWeight: '400' }}>−{fmt(r.stripe_amount_refunded)}</div>
                    )}
                  </td>
                  <td style={TD}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                      <StatusChip status={r.stripe_payment_status} />
                      <RiskChip level={r.risk_level} score={r.risk_score} />
                    </div>
                  </td>
                  <td style={{ ...TD, fontSize: '12px', color: '#888' }}>{r.stripe_payment_type ? formatPaymentType(r.stripe_payment_type) : '—'}</td>
                  <td style={{ ...TD, fontSize: '12px', color: '#888' }}>{fmtDate(r.stripe_paid_at)}</td>
                  <td style={TD} onClick={e => e.stopPropagation()}><PiLink id={r.stripe_payment_intent_id} manual={r.manual} /></td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <Actions r={r} ctx={actionsCtx} />
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      <PaymentDetails r={r} />
                    </td>
                  </tr>
                )}
                </React.Fragment>
                )
              })}
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
          {showFailed && (isMobile ? (
            /* Cards on mobile — same as the main list, instead of a side-scrolling table */
            <div style={{ marginTop: '0.5rem' }}>
              {failedRecords.map((r, i) => (
                <div key={r.stripe_payment_intent_id || i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
                    <div style={{ fontSize: '13px', color: '#888', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#bbb', flexShrink: 0 }}>{r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb', margin: '2px 0 8px', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>{r.email}<CopyBtn value={r.email} /></div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusChip status={r.stripe_payment_status} />
                    <PiLink id={r.stripe_payment_intent_id} manual={r.manual} />
                    <span style={{ fontSize: '11px', color: '#ccc', marginLeft: 'auto' }}>{fmtDate(r.stripe_paid_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', marginTop: '0.5rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {failedRecords.map((r, i) => (
                    <tr key={r.stripe_payment_intent_id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ ...TD, color: '#aaa' }}>{r.name || '—'}</td>
                      <td style={{ ...TD, fontSize: '12px', color: '#bbb' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>{r.email}<CopyBtn value={r.email} /></span></td>
                      <td style={{ ...TD, fontSize: '12px', color: '#bbb' }}>{r.stripe_amount_paid ? fmt(r.stripe_amount_paid) : '—'}</td>
                      <td style={TD}><StatusChip status={r.stripe_payment_status} /></td>
                      <td style={{ ...TD, fontSize: '12px', color: '#bbb' }}>{fmtDate(r.stripe_paid_at)}</td>
                      <td style={TD}><PiLink id={r.stripe_payment_intent_id} manual={r.manual} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
