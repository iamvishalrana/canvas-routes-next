'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import { inp, L, PrimaryBtn, DangerBtn, Err, Success } from '../_components/shared'

const SECTION = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.5rem' }
const TH = { padding: '0.65rem 1rem', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', fontWeight: '400', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }
const TD = { padding: '0.75rem 1rem', fontSize: '13px', color: '#1a1a1a', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-inter),sans-serif', verticalAlign: 'middle' }

function fmtDiscount(coupon) {
  if (!coupon) return '—'
  if (coupon.percent_off) return `${coupon.percent_off}% off`
  if (coupon.amount_off) return `$${(coupon.amount_off / 100).toFixed(2)} off`
  return '—'
}

function fmtDate(ts) {
  if (!ts) return 'Never'
  return new Date(ts * 1000).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtCreated(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusChip({ active }) {
  return active
    ? <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(59,107,47,0.3)', background: 'rgba(59,107,47,0.1)', color: '#3B6B2F', whiteSpace: 'nowrap' }}>Active</span>
    : <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.04)', color: '#999', whiteSpace: 'nowrap' }}>Inactive</span>
}

const EMPTY_FORM = { code: '', discountType: 'percent', discountValue: '', maxRedemptions: '', expiresAt: '' }

export default function PromoCodesClient() {
  const [codes, setCodes]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formErr, setFormErr]     = useState(null)
  const [formOk, setFormOk]       = useState(null)
  const [deactivating, setDeactivating] = useState(null)
  const [deactivateErr, setDeactivateErr] = useState(null)
  const [isMobile, setIsMobile]           = useState(false)
  const [editing, setEditing]           = useState(null)  // code id being edited
  const [editForm, setEditForm]         = useState({ maxRedemptions: '', expiresAt: '' })
  const [editSaving, setEditSaving]     = useState(false)
  const [editErr, setEditErr]           = useState(null)
  const [usageOpen, setUsageOpen]       = useState(null)   // code id whose usage is expanded
  const [usageData, setUsageData]       = useState({})     // { [codeId]: array of usage rows }
  const [usageLoading, setUsageLoading] = useState(null)   // code id being fetched

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(() => {
    fetch('/api/admin/promo-codes')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCodes(Array.isArray(data) ? data : []))
      .catch(() => setCodes([]))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  // no realtime table for promo codes

  const activeCodes    = codes.filter(c => c.active).length
  const totalRedeemed  = codes.reduce((s, c) => s + (c.times_redeemed || 0), 0)

  // Auto-dismiss success banner after 5 seconds
  useEffect(() => {
    if (!formOk) return
    const t = setTimeout(() => setFormOk(null), 5000)
    return () => clearTimeout(t)
  }, [formOk])

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setFormErr(null)
    setFormOk(null)

    const val = parseFloat(form.discountValue)
    if (!form.code.trim()) return setFormErr('Code is required.')
    if (!form.discountValue || isNaN(val) || val <= 0) return setFormErr('Enter a valid discount value.')
    if (form.discountType === 'percent' && val > 100) return setFormErr('Percent off cannot exceed 100.')

    setSubmitting(true)
    try {
      const body = {
        code: form.code,
        ...(form.discountType === 'percent' ? { percentOff: val } : { amountOff: val }),
        ...(form.maxRedemptions ? { maxRedemptions: parseInt(form.maxRedemptions, 10) } : {}),
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      }
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return setFormErr(data.error || 'Failed to create code.')
      setCodes(prev => [{ ...data, coupon: data.coupon }, ...prev])
      setForm(EMPTY_FORM)
      setShowForm(false)
      setFormOk(`Code "${data.code}" created.`)
    } catch {
      setFormErr('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(id, code) {
    if (!confirm(`Deactivate promo code "${code}"?`)) return
    setDeactivating(id)
    setDeactivateErr(null)
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deactivate' }) })
      if (res.ok) {
        setCodes(prev => prev.map(c => c.id === id ? { ...c, active: false } : c))
      } else {
        const data = await res.json().catch(() => ({}))
        setDeactivateErr(data.error || 'Failed to deactivate.')
      }
    } catch { setDeactivateErr('Network error.') }
    setDeactivating(null)
  }

  function startEdit(c) {
    setEditing(c.id)
    setEditForm({
      maxRedemptions: c.max_redemptions ? String(c.max_redemptions) : '',
      expiresAt: c.expires_at ? new Date(c.expires_at * 1000).toISOString().slice(0, 10) : '',
    })
    setEditErr(null)
  }

  async function handleSaveEdit(c) {
    setEditSaving(true)
    setEditErr(null)
    try {
      const res = await fetch(`/api/admin/promo-codes/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', maxRedemptions: editForm.maxRedemptions || undefined, expiresAt: editForm.expiresAt || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setEditErr(data.error || 'Failed to update.'); return }
      // Replace old code with new code in state
      setCodes(prev => prev.map(x => x.id === c.id ? { ...data.newCode, coupon: data.newCode.coupon } : x))
      setEditing(null)
    } catch { setEditErr('Network error.') }
    finally { setEditSaving(false) }
  }

  async function loadUsage(codeId) {
    // Toggle closed if already open
    if (usageOpen === codeId) { setUsageOpen(null); return }
    // Always re-fetch for fresh data
    setUsageLoading(codeId)
    try {
      const res = await fetch(`/api/admin/promo-codes/${codeId}/usage`)
      if (!res.ok) throw new Error()
      const data = await res.json().catch(() => [])
      setUsageData(p => ({ ...p, [codeId]: Array.isArray(data) ? data : [] }))
      setUsageOpen(codeId)
    } catch {
      setUsageData(p => ({ ...p, [codeId]: [] }))
      setUsageOpen(codeId)
    } finally {
      setUsageLoading(null)
    }
  }

  function fmtCents(cents) {
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <div style={SECTION}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>Admin</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>Promo Codes</h1>
          <button
            type="button"
            onClick={() => { setShowForm(f => !f); setFormErr(null); setFormOk(null) }}
            style={{ padding: '0.55rem 1.2rem', background: showForm ? 'rgba(0,0,0,0.05)' : '#0F1E14', color: showForm ? '#555' : '#F5F1EC', border: showForm ? '0.5px solid rgba(0,0,0,0.15)' : 'none', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
          >
            {showForm ? 'Cancel' : '+ New Code'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ ...CARD, marginBottom: '2rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>Create Promo Code</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <L>Code</L>
                <input
                  style={inp}
                  value={form.code}
                  onChange={e => setField('code', e.target.value.toUpperCase())}
                  placeholder="SUMMER25"
                  maxLength={30}
                />
              </div>
              <div>
                <L>Discount Type</L>
                <div style={{ position: 'relative' }}>
                  <select
                    style={{ ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none', paddingRight: '2rem' }}
                    value={form.discountType}
                    onChange={e => setField('discountType', e.target.value)}
                  >
                    <option value="percent">% Off</option>
                    <option value="amount">$ Off (CAD)</option>
                  </select>
                  <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div>
                <L>Discount Value</L>
                <input
                  style={inp}
                  type="number"
                  min={form.discountType === 'percent' ? '1' : '0.01'}
                  step={form.discountType === 'percent' ? '1' : '0.01'}
                  value={form.discountValue}
                  onChange={e => setField('discountValue', e.target.value)}
                  placeholder={form.discountType === 'percent' ? '25' : '20.00'}
                />
              </div>
              <div>
                <L>Max Redemptions (optional)</L>
                <input
                  style={inp}
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxRedemptions}
                  onChange={e => setField('maxRedemptions', e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <L>Expires At (optional)</L>
                <input
                  style={inp}
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setField('expiresAt', e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <PrimaryBtn type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Code'}
              </PrimaryBtn>
            </div>
            <Err msg={formErr} />
          </form>
        </div>
      )}

      {formOk && !showForm && (
        <div style={{ fontSize: '12px', color: '#3B6B2F', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>{formOk}</div>
      )}
      {deactivateErr && (
        <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>{deactivateErr}</div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Active Codes',      value: activeCodes,   color: '#3B6B2F' },
          { label: 'Total Redemptions', value: totalRedeemed, color: '#1a1a1a' },
          { label: 'Total Codes',       value: codes.length,  color: '#1a1a1a' },
        ].map(s => (
          <div key={s.label} style={CARD}>
            <div style={{ fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : codes.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No promo codes yet.</div>
      ) : isMobile ? (
        <div>
          {codes.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '14px', letterSpacing: '0.04em' }}>{c.code}</span>
                <StatusChip active={c.active} />
              </div>
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '0.25rem' }}>{fmtDiscount(c.coupon)}</div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.6rem' }}>
                {c.times_redeemed ?? 0}{c.max_redemptions ? ` / ${c.max_redemptions}` : ' / ∞'} redeemed · Expires {fmtDate(c.expires_at)}
              </div>
              {c.active && editing === c.id ? (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Max Uses</div>
                      <input style={{ ...inp, padding: '0.4rem 0.6rem', fontSize: '12px' }} type="number" min="1" placeholder="Unlimited" value={editForm.maxRedemptions} onChange={e => setEditForm(f => ({ ...f, maxRedemptions: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Expires</div>
                      <input style={{ ...inp, padding: '0.4rem 0.6rem', fontSize: '12px' }} type="date" value={editForm.expiresAt} onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))} />
                    </div>
                  </div>
                  {editErr && <div style={{ fontSize: '11px', color: '#7B2032' }}>{editErr}</div>}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button onClick={() => handleSaveEdit(c)} disabled={editSaving} style={{ padding: '0.35rem 0.8rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: editSaving ? 'wait' : 'pointer' }}>{editSaving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditing(null)} style={{ padding: '0.35rem 0.8rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : c.active ? (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => loadUsage(c.id)}
                    disabled={usageLoading === c.id}
                    style={{ padding: '0.35rem 0.8rem', background: 'transparent', color: usageOpen === c.id ? '#1a1a1a' : '#888', border: `0.5px solid ${usageOpen === c.id ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}`, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: usageLoading === c.id ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
                  >
                    {usageLoading === c.id ? '…' : 'Usage'}
                  </button>
                  <button onClick={() => startEdit(c)} style={{ padding: '0.35rem 0.8rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Edit</button>
                  <DangerBtn small onClick={() => handleDeactivate(c.id, c.code)} disabled={deactivating === c.id}>
                    {deactivating === c.id ? 'Deactivating…' : 'Deactivate'}
                  </DangerBtn>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => loadUsage(c.id)}
                    disabled={usageLoading === c.id}
                    style={{ padding: '0.35rem 0.8rem', background: 'transparent', color: usageOpen === c.id ? '#1a1a1a' : '#888', border: `0.5px solid ${usageOpen === c.id ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}`, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: usageLoading === c.id ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
                  >
                    {usageLoading === c.id ? '…' : 'Usage'}
                  </button>
                </div>
              )}
              {usageOpen === c.id && (
                <div style={{ marginTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: '0.75rem' }}>
                  {!usageData[c.id] || usageData[c.id].length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#ccc' }}>No redemptions recorded.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {usageData[c.id].map((u, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#555', display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingBottom: '0.5rem', borderBottom: i < usageData[c.id].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                          <div style={{ fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a' }}>{u.name}</div>
                          <div style={{ fontFamily: 'var(--font-inter),sans-serif' }}>{u.email}</div>
                          <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                            <span style={{ color: '#3B6B2F' }}>Paid {fmtCents(u.amount)}</span>
                            <span style={{ color: '#8A6535' }}>−{fmtCents(u.discount)}</span>
                          </div>
                          <div style={{ color: '#999', fontFamily: 'var(--font-inter),sans-serif' }}>{u.date ? new Date(u.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' }) : '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={TH}>Code</th>
                <th style={TH}>Discount</th>
                <th style={TH}>Redeemed</th>
                <th style={TH}>Expires</th>
                <th style={TH}>Created</th>
                <th style={TH}>Status</th>
                <th style={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c, i) => (
                <React.Fragment key={c.id}>
                <tr style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ ...TD, fontFamily: 'monospace', fontWeight: '600', fontSize: '13px' }}>{c.code}</td>
                  <td style={TD}>{fmtDiscount(c.coupon)}</td>
                  <td style={{ ...TD, color: '#555' }}>
                    {c.times_redeemed ?? 0}{c.max_redemptions ? ` / ${c.max_redemptions}` : ' / ∞'}
                  </td>
                  <td style={{ ...TD, color: '#888', fontSize: '12px' }}>{fmtDate(c.expires_at)}</td>
                  <td style={{ ...TD, color: '#888', fontSize: '12px' }}>{fmtCreated(c.created)}</td>
                  <td style={TD}><StatusChip active={c.active} /></td>
                  <td style={{ ...TD, minWidth: editing === c.id ? '280px' : undefined }}>
                    {c.active && editing === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input style={{ width: '90px', padding: '0.35rem 0.5rem', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', background: '#fff' }} type="number" min="1" placeholder="Max uses" value={editForm.maxRedemptions} onChange={e => setEditForm(f => ({ ...f, maxRedemptions: e.target.value }))} />
                          <input style={{ width: '120px', padding: '0.35rem 0.5rem', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.2)', background: '#fff' }} type="date" value={editForm.expiresAt} onChange={e => setEditForm(f => ({ ...f, expiresAt: e.target.value }))} />
                        </div>
                        {editErr && <div style={{ fontSize: '11px', color: '#7B2032' }}>{editErr}</div>}
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button onClick={() => handleSaveEdit(c)} disabled={editSaving} style={{ padding: '0.3rem 0.7rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: editSaving ? 'wait' : 'pointer' }}>{editSaving ? '…' : 'Save'}</button>
                          <button onClick={() => setEditing(null)} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : c.active ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => loadUsage(c.id)}
                          disabled={usageLoading === c.id}
                          style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: usageOpen === c.id ? '#1a1a1a' : '#888', border: `0.5px solid ${usageOpen === c.id ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}`, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: usageLoading === c.id ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
                        >
                          {usageLoading === c.id ? '…' : 'Usage'}
                        </button>
                        <button onClick={() => startEdit(c)} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Edit</button>
                        <DangerBtn small onClick={() => handleDeactivate(c.id, c.code)} disabled={deactivating === c.id}>
                          {deactivating === c.id ? '…' : 'Deactivate'}
                        </DangerBtn>
                      </div>
                    ) : (
                      <button
                        onClick={() => loadUsage(c.id)}
                        disabled={usageLoading === c.id}
                        style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: usageOpen === c.id ? '#1a1a1a' : '#888', border: `0.5px solid ${usageOpen === c.id ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}`, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: usageLoading === c.id ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
                      >
                        {usageLoading === c.id ? '…' : 'Usage'}
                      </button>
                    )}
                  </td>
                </tr>
                {usageOpen === c.id && (
                  <tr>
                    <td colSpan={7} style={{ padding: '0 1rem 1rem', background: '#fafaf8', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                      {!usageData[c.id] || usageData[c.id].length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#ccc', padding: '0.5rem 0' }}>No redemptions recorded.</div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                          <thead>
                            <tr>
                              {['Name', 'Email', 'Paid', 'Discount', 'Date'].map(h => (
                                <th key={h} style={{ padding: '0.4rem 0.75rem', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.06)', fontFamily: 'var(--font-inter),sans-serif' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {usageData[c.id].map((u, i) => (
                              <tr key={i}>
                                <td style={{ padding: '0.5rem 0.75rem', fontSize: '12px', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif' }}>{u.name}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontSize: '12px', color: '#555', fontFamily: 'var(--font-inter),sans-serif' }}>{u.email}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontSize: '12px', color: '#3B6B2F', fontFamily: 'var(--font-inter),sans-serif' }}>{fmtCents(u.amount)}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontSize: '12px', color: '#8A6535', fontFamily: 'var(--font-inter),sans-serif' }}>−{fmtCents(u.discount)}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontSize: '12px', color: '#999', fontFamily: 'var(--font-inter),sans-serif' }}>{u.date ? new Date(u.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' }) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
