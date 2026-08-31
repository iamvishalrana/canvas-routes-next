'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { inp, PrimaryBtn, GhostBtn, CopyBtn, Err, Success, ToggleSwitch } from '../_components/shared'
import { useConfirm } from '../_components/ConfirmProvider'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

const SECTION = { padding: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '820px' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem 1.5rem' }
const LABEL = { fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem', display: 'block' }

function fmtMoney(cents, currency) {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}${currency && currency !== 'CAD' ? ` ${currency}` : ''}`
}
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
}

export default function PaymentLinksClient() {
  const confirm = useConfirm()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(null)

  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [adjustable, setAdjustable] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState(null)
  const [createdMsg, setCreatedMsg] = useState(null)

  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoadErr(null)
    try {
      const res = await fetch('/api/admin/payment-links')
      const data = await res.json()
      if (!res.ok) { setLoadErr(data.error || 'Failed to load.'); return }
      setLinks(Array.isArray(data) ? data : [])
    } catch { setLoadErr('Network error while loading links.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function create(e) {
    e.preventDefault()
    setCreateErr(null); setCreatedMsg(null)
    const amt = Number(amount)
    if (!label.trim()) { setCreateErr('Enter a name for this link.'); return }
    if (!Number.isFinite(amt) || amt < 0.5) { setCreateErr('Enter an amount of at least $0.50.'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), amountDollars: amt, adjustableQuantity: adjustable }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateErr(data.error || 'Failed to create link.'); return }
      setLinks(prev => [data, ...prev])
      setLabel(''); setAmount(''); setAdjustable(false)
      setCreatedMsg('Link created — copy it below to share.')
    } catch { setCreateErr('Network error while creating the link.') }
    finally { setCreating(false) }
  }

  async function toggle(link) {
    const turningOff = link.active
    if (turningOff && !(await confirm({
      title: 'Deactivate this link?',
      message: `“${link.label}” will stop accepting new payments. You can reactivate it any time. Existing completed payments are unaffected.`,
      confirmLabel: 'Yes, deactivate',
      danger: true,
    }))) return
    setBusyId(link.id)
    try {
      const res = await fetch('/api/admin/payment-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, active: !link.active }),
      })
      const data = await res.json()
      if (res.ok) setLinks(prev => prev.map(l => l.id === link.id ? data : l))
    } catch { /* leave as-is; a reload will reconcile */ }
    finally { setBusyId(null) }
  }

  return (
    <div style={SECTION}>
      <Link href="/admin/payments" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A6535', textDecoration: 'none', marginBottom: '0.85rem' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        Payments
      </Link>
      <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontWeight: 400, fontSize: 'clamp(1.6rem,4vw,2.1rem)', color: '#1a1a1a', marginBottom: '0.35rem' }}>Payment Links</h1>
      <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Create a shareable Stripe checkout for a one-off — merch, a last-minute add-on, a sponsor — without building a page.
        The amount is charged as entered (no tax added), and completed payments show up in Payments.
      </p>

      {/* Create form */}
      <form onSubmit={create} style={{ ...CARD, marginBottom: '1.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.9rem' }}>
          <div>
            <label style={LABEL}>What's it for</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Canvas Routes cap, Sponsor — Track Day"
              style={inp} maxLength={200} />
          </div>
          <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <label style={LABEL}>Amount (CAD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#999' }}>$</span>
                <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00"
                  style={{ ...inp, paddingLeft: '1.5rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 200px', paddingBottom: '0.5rem' }}>
              <ToggleSwitch checked={adjustable} onChange={setAdjustable} label="Let buyer choose quantity" />
              <span style={{ fontSize: '12px', color: '#555' }} onClick={() => setAdjustable(v => !v)}>Let buyer choose quantity</span>
            </div>
          </div>
        </div>
        {createErr && <div style={{ marginTop: '0.75rem' }}><Err msg={createErr} /></div>}
        {createdMsg && <div style={{ marginTop: '0.75rem' }}><Success msg={createdMsg} /></div>}
        <div style={{ marginTop: '1rem' }}>
          <PrimaryBtn type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create link'}</PrimaryBtn>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div style={{ fontSize: '13px', color: '#999', padding: '1rem 0' }}>Loading links…</div>
      ) : loadErr ? (
        <Err msg={loadErr} />
      ) : links.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#999', padding: '1rem 0' }}>No payment links yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {links.map(link => (
            <div key={link.id} style={{ ...CARD, padding: '1rem 1.1rem', opacity: link.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', wordBreak: 'break-word' }}>{link.label}</span>
                    {!link.active && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', border: '0.5px solid rgba(0,0,0,0.18)', color: '#999', borderRadius: '99px' }}>Inactive</span>}
                    {link.adjustable_quantity && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', border: '0.5px solid rgba(197,168,130,0.4)', background: 'rgba(197,168,130,0.12)', color: '#8A6535', borderRadius: '99px' }}>Qty adjustable</span>}
                  </div>
                  <div style={{ fontSize: '13px', color: '#555', marginTop: '3px' }}>
                    {fmtMoney(link.amount_cents, link.currency)}{link.created ? <span style={{ color: '#aaa' }}> · {fmtDate(link.created)}</span> : null}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem', marginTop: '0.4rem', maxWidth: '100%' }}>
                    <a href={link.url} target="_blank" rel="noreferrer"
                      style={{ fontSize: '12px', color: '#8A6535', textDecoration: 'none', borderBottom: '0.5px solid rgba(138,101,53,0.4)', wordBreak: 'break-all' }}>{link.url}</a>
                    <CopyBtn value={link.url} />
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {link.active
                    ? <GhostBtn small disabled={busyId === link.id} onClick={() => toggle(link)}>{busyId === link.id ? '…' : 'Deactivate'}</GhostBtn>
                    : <GhostBtn small disabled={busyId === link.id} onClick={() => toggle(link)}>{busyId === link.id ? '…' : 'Reactivate'}</GhostBtn>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
