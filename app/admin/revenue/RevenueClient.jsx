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

// Categorical palette — validated colorblind-safe against the light surface
// (green is the brand green, red the brand red). Each donut also carries a
// legend + direct values, so identity is never colour-alone.
const CHART = {
  member:    '#3B6B2F',
  nonmember: '#C0871F',
  unknown:   '#B7AE9F',
  card:      '#2C6FA8',
  etransfer: '#C0871F',
  subtotal:  '#3B6B2F',
  gst:       '#C0871F',
  qst:       '#2C6FA8',
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

// Self-contained SVG donut — no chart library. `data` is [{ label, value, color }].
// Slices are separated by a 4px surface gap; hovering a slice (or its legend row)
// surfaces that slice's value + share in the centre.
function Donut({ data, size = 168, centerTop, centerBottom }) {
  const [hover, setHover] = useState(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = size / 2
  const stroke = Math.round(size * 0.2)
  const radius = r - stroke / 2 - 2
  const circ = 2 * Math.PI * radius
  const liveSlices = data.filter(d => d.value > 0).length
  const gap = total > 0 && liveSlices > 1 ? 4 : 0
  let offset = 0
  const shown = hover != null && data[hover] ? data[hover] : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {total <= 0 ? (
            <circle cx={r} cy={r} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
          ) : data.map((d, i) => {
            if (d.value <= 0) return null
            const frac = d.value / total
            const dash = Math.max(0, frac * circ - gap)
            const el = (
              <circle key={i} cx={r} cy={r} r={radius} fill="none"
                stroke={d.color} strokeWidth={hover === i ? stroke + 5 : stroke}
                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ transition: 'stroke-width 0.15s' }} />
            )
            offset += frac * circ
            return el
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center', padding: '0 0.5rem' }}>
          {shown ? (
            <>
              <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{shown.label}</div>
              <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.35rem', color: shown.color, lineHeight: 1.15 }}>{fmt(shown.value)}</div>
              <div style={{ fontSize: '11px', color: '#aaa' }}>{pct(shown.value, total)}%</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.6rem', color: '#1a1a1a', lineHeight: 1.1 }}>{centerTop}</div>
              {centerBottom && <div style={{ fontSize: '9px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '3px' }}>{centerBottom}</div>}
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
        {data.map((d, i) => (
          <div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', opacity: hover == null || hover === i ? 1 : 0.45, transition: 'opacity 0.15s' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color, flexShrink: 0 }} />
            <span style={{ color: '#555', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
            <span style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(d.value)}</span>
            <span style={{ color: '#aaa', width: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct(d.value, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatTile({ label, value, color = '#1a1a1a', sub }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '10px', padding: '0.9rem 1rem', boxShadow: '0 1px 5px rgba(15,30,20,0.05)' }}>
      <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.4rem', letterSpacing: '0.03em', color, lineHeight: 1.1, wordBreak: 'break-word' }}>{value}</div>
      <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.35rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: '#bbb', marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, note, children }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '1.25rem 1.25rem 1.4rem', boxShadow: '0 2px 12px rgba(15,30,20,0.06)' }}>
      <div style={{ ...SECTION_LABEL, marginBottom: note ? '0.35rem' : '1.1rem' }}>{title}</div>
      {note && <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '1.1rem' }}>{note}</div>}
      {children}
    </div>
  )
}

function MemberBadge({ isMember }) {
  const map = isMember === true
    ? { t: 'Member', c: '#3B6B2F', b: 'rgba(59,107,47,0.09)', br: 'rgba(59,107,47,0.28)' }
    : isMember === false
      ? { t: 'Non-member', c: '#8A6535', b: 'rgba(197,168,130,0.12)', br: 'rgba(197,168,130,0.35)' }
      : { t: 'Unknown', c: '#999', b: 'rgba(0,0,0,0.04)', br: 'rgba(0,0,0,0.12)' }
  return (
    <span style={{ fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: map.c, background: map.b, border: `0.5px solid ${map.br}`, padding: '2px 7px', borderRadius: '5px', whiteSpace: 'nowrap' }}>{map.t}</span>
  )
}

// Full drill-down for a single payment type / route. Given the payments already
// filtered to this type, it derives member-vs-non-member, payment-method and
// tax composition, all on NET amounts (refunds already subtracted upstream), so
// no chart or total ever counts a refunded dollar as earned.
function TypeDetailModal({ typeRow, payments, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const agg = useMemo(() => {
    const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0)
    const withTax = payments.filter(r => r.taxSubtotal != null)
    const members = payments.filter(r => r.isMember === true)
    const nonMembers = payments.filter(r => r.isMember === false)
    const unknown = payments.filter(r => r.isMember == null)
    const card = payments.filter(r => !r.manual)
    const etransfer = payments.filter(r => r.manual)
    const coupons = payments.filter(r => r.hasCoupon)
    const codeMap = new Map()
    for (const r of coupons) {
      const key = r.promoCode || '(unnamed code)'
      if (!codeMap.has(key)) codeMap.set(key, { code: key, count: 0, discount: 0 })
      const e = codeMap.get(key); e.count += 1; e.discount += (r.taxDiscount || 0)
    }
    return {
      gross: sum(payments, r => r.gross),
      refunded: sum(payments, r => r.refunded),
      net: sum(payments, r => r.amount),
      withTax,
      subtotal: sum(withTax, r => r.taxSubtotal),
      gst: sum(withTax, r => r.taxGst),
      qst: sum(withTax, r => r.taxQst),
      discount: sum(payments, r => r.taxDiscount),
      members, nonMembers, unknown, card, etransfer, coupons,
      codes: Array.from(codeMap.values()).sort((a, b) => b.count - a.count),
    }
  }, [payments])

  const netOf = arr => arr.reduce((s, r) => s + r.amount, 0)

  const memberData = [
    { label: 'Members', value: netOf(agg.members), color: CHART.member },
    { label: 'Non-members', value: netOf(agg.nonMembers), color: CHART.nonmember },
    ...(agg.unknown.length ? [{ label: 'Unknown', value: netOf(agg.unknown), color: CHART.unknown }] : []),
  ]
  const showMemberChart = agg.members.length > 0 || agg.nonMembers.length > 0
  const methodData = [
    { label: 'Card', value: netOf(agg.card), color: CHART.card },
    { label: 'E-transfer', value: netOf(agg.etransfer), color: CHART.etransfer },
  ]
  const showMethodChart = agg.card.length > 0 && agg.etransfer.length > 0
  const taxData = [
    { label: 'Subtotal (ex-tax)', value: agg.subtotal, color: CHART.subtotal },
    { label: 'GST', value: agg.gst, color: CHART.gst },
    { label: 'QST', value: agg.qst, color: CHART.qst },
  ]
  const showTaxChart = agg.withTax.length > 0 && (agg.subtotal + agg.gst + agg.qst) > 0
  const totalTax = agg.gst + agg.qst
  const sortedPayments = useMemo(() => [...payments].sort((a, b) => new Date(b.date) - new Date(a.date)), [payments])

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,30,20,0.45)', WebkitBackdropFilter: 'blur(2px)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(env(safe-area-inset-top),1.5rem) 1rem calc(env(safe-area-inset-bottom) + 1rem)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'var(--font-inter),sans-serif', animation: 'rev-overlay-in 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#F7F5F1', borderRadius: '16px', width: '100%', maxWidth: '860px', boxShadow: '0 24px 70px rgba(15,30,20,0.32), 0 4px 14px rgba(0,0,0,0.12)', overflow: 'hidden', marginBottom: '2rem', animation: 'rev-modal-in 0.28s cubic-bezier(0.2,0.7,0.2,1) both' }}>
        {/* Header */}
        <div style={{ background: '#0F1E14', padding: '1.5rem 1.5rem 1.6rem', position: 'relative' }}>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ position: 'absolute', top: '1rem', right: '1rem', width: '32px', height: '32px', borderRadius: '50%', border: '0.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', color: '#F5F1EC', cursor: 'pointer', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.75)', marginBottom: '0.5rem' }}>Revenue Detail</div>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '26px', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.15, paddingRight: '2.5rem' }}>{typeRow.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '2.2rem', color: '#8FBF7F', letterSpacing: '0.03em', lineHeight: 1 }}>{fmt(agg.net)}</span>
            <span style={{ fontSize: '11px', color: 'rgba(245,241,236,0.6)' }}>net · {payments.length} payment{payments.length === 1 ? '' : 's'}{agg.refunded > 0 ? ` · after ${fmt(agg.refunded)} refunded` : ''}</span>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Stat tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <StatTile label="Net Revenue" value={fmt(agg.net)} color="#3B6B2F" sub="after refunds" />
            <StatTile label="Gross Collected" value={fmt(agg.gross)} />
            <StatTile label="Refunded" value={agg.refunded > 0 ? '−' + fmt(agg.refunded) : fmt(0)} color={agg.refunded > 0 ? '#93333E' : '#1a1a1a'} />
            <StatTile label="Transactions" value={payments.length} />
            <StatTile label="Members" value={agg.members.length} sub={agg.members.length ? fmt(netOf(agg.members)) : undefined} />
            <StatTile label="Non-members" value={agg.nonMembers.length} sub={agg.nonMembers.length ? fmt(netOf(agg.nonMembers)) : undefined} />
            {agg.withTax.length > 0 && <StatTile label="Subtotal (ex-tax)" value={fmt(agg.subtotal)} sub={`${agg.withTax.length} of ${payments.length} w/ receipt`} />}
            {agg.withTax.length > 0 && <StatTile label="Tax Collected" value={fmt(totalTax)} sub={`GST ${fmt(agg.gst)} · QST ${fmt(agg.qst)}`} />}
            <StatTile label="Coupons Used" value={agg.coupons.length} sub={agg.discount > 0 ? fmt(agg.discount) + ' off' : undefined} color={agg.coupons.length ? '#8A5CA8' : '#1a1a1a'} />
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: agg.coupons.length ? '1.5rem' : 0 }}>
            {showMemberChart && (
              <ChartCard title="Members vs Non-members">
                <Donut data={memberData} centerTop={fmt(agg.net)} centerBottom="net" />
              </ChartCard>
            )}
            {showMethodChart && (
              <ChartCard title="Payment Method">
                <Donut data={methodData} centerTop={fmt(agg.net)} centerBottom="net" />
              </ChartCard>
            )}
            {showTaxChart && (
              <ChartCard title="Revenue Composition" note={agg.withTax.length < payments.length ? `Tax breakdown for ${agg.withTax.length} of ${payments.length} payments with a receipt` : 'Subtotal + taxes = amount charged'}>
                <Donut data={taxData} centerTop={fmt(agg.subtotal + agg.gst + agg.qst)} centerBottom="w/ tax" />
              </ChartCard>
            )}
          </div>

          {/* Coupons breakdown */}
          {agg.coupons.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '12px', padding: '1.25rem 1.25rem 0.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(15,30,20,0.06)' }}>
              <div style={{ ...SECTION_LABEL, marginBottom: '0.75rem' }}>Coupons Applied</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>Code</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Times Used</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total Discount</th>
                </tr></thead>
                <tbody>
                  {agg.codes.map(c => (
                    <tr key={c.code}>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: '12px' }}>{c.code}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#555' }}>{c.count}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#8A5CA8' }}>{c.discount > 0 ? '−' + fmt(c.discount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-payment list */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(15,30,20,0.06)' }}>
            <div style={{ ...SECTION_LABEL, padding: '1.25rem 1.25rem 0' }}>All Payments ({payments.length})</div>
            <div style={{ maxHeight: '340px', overflowY: 'auto', marginTop: '0.5rem' }}>
              {sortedPayments.map((p, i) => (
                <div key={`${p.email}-${p.date}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1.25rem', borderTop: i > 0 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <MemberBadge isMember={p.isMember} />
                      {p.manual && <span style={{ fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A6535', background: 'rgba(197,168,130,0.1)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '2px 6px', borderRadius: '5px' }}>E-transfer</span>}
                      {p.hasCoupon && <span style={{ fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A5CA8', background: 'rgba(138,92,168,0.09)', border: '0.5px solid rgba(138,92,168,0.28)', padding: '2px 6px', borderRadius: '5px' }}>{p.promoCode || 'Coupon'}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email} · {fmtDate(p.date)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', color: '#3B6B2F', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.amount)}</div>
                    {p.refunded > 0 && <div style={{ fontSize: '10px', color: '#93333E', fontVariantNumeric: 'tabular-nums' }}>−{fmt(p.refunded)} refunded</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RevenueClient({ payments = [], stripeError = false }) {
  const [isMobile, setIsMobile] = useState(false)
  const [expanded, setExpanded] = useState(null) // index of the recent payment row currently open
  const [selectedType, setSelectedType] = useState(null) // typeKey whose drill-down modal is open
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

        {/* By type — each row opens a full drill-down for that route/type */}
        <div style={{ ...CARD }}>
          <div style={{ padding: '1.25rem 1.5rem 0.75rem' }}>
            <div style={SECTION_LABEL}>By Payment Type</div>
            <div style={{ fontSize: '10px', color: '#bbb', marginTop: '-0.6rem', marginBottom: '0.2rem' }}>Tap a route for a full breakdown</div>
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
                    <th style={{ ...TH, width: '20px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map(t => (
                    <tr key={t.key} onClick={() => setSelectedType(t.key)} className="rev-type-row" style={{ cursor: 'pointer' }}>
                      <td style={{ ...TD, fontWeight: '400' }}>{t.label}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#555' }}>{t.count}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#3B6B2F' }}>{fmt(t.revenue)}</td>
                      <td style={{ ...TD, textAlign: 'right', color: '#ccc', paddingLeft: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>
                      </td>
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

      {selectedType && (
        <TypeDetailModal
          typeRow={byType.find(t => t.key === selectedType) || { key: selectedType, label: '—' }}
          payments={filteredPayments.filter(p => (p.typeKey || 'unknown') === selectedType)}
          onClose={() => setSelectedType(null)}
        />
      )}

      <style>{`
        .rev-type-row { transition: background 0.15s ease; }
        @media (hover: hover) { .rev-type-row:hover { background: rgba(197,168,130,0.06); } }
        .rev-type-row:active { background: rgba(197,168,130,0.1); }
        @keyframes rev-modal-in {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rev-overlay-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}
