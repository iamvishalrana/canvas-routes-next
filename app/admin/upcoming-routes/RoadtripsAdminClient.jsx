'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, sel, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../_components/shared'

const TRIP_TYPES = [
  { value: 'day',       label: 'Day trip'  },
  { value: 'overnight', label: 'Overnight' },
  { value: 'multi_day', label: 'Multi-day' },
]
const TRIP_TAG = { overnight: 'Overnight', multi_day: 'Multi-day' } // 'day' shows no tag

const EMPTY = { name: '', destination: '', month_label: '', duration_label: '', distance_label: '', target_count: '12', sort_order: '', trip_type: 'day', description: '' }

function Field({ label, children }) {
  return <div style={{ minWidth: 0 }}><L>{label}</L>{children}</div>
}

function TripSelect({ value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <select style={sel} value={value || 'day'} onChange={onChange}>
        {TRIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
  )
}

export default function RoadtripsAdminClient() {
  const [routes, setRoutes]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY)
  const [adding, setAdding]       = useState(false)
  const [formErr, setFormErr]     = useState(null)
  const [editId, setEditId]       = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr]     = useState(null)
  const [expanded, setExpanded]   = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [launchFor, setLaunchFor] = useState(null) // route id
  const [launchMsg, setLaunchMsg] = useState('')
  const [launching, setLaunching] = useState(false)
  const [busyId, setBusyId]       = useState(null)

  const load = useCallback(() => {
    fetch('/api/admin/upcoming-routes')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRoutes(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  async function addRoute(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.destination.trim() || !form.month_label.trim()) {
      setFormErr('Name, destination and month are required.'); return
    }
    setAdding(true); setFormErr(null)
    try {
      const res = await fetch('/api/admin/upcoming-routes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, target_count: parseInt(form.target_count, 10) || 12, sort_order: parseInt(form.sort_order, 10) || routes.length + 1 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Failed to add.'); return }
      setRoutes(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      setForm(EMPTY)
    } catch { setFormErr('Network error.') }
    finally { setAdding(false) }
  }

  function startEdit(r) {
    setEditId(r.id); setEditErr(null)
    setEditForm({
      name: r.name, destination: r.destination, month_label: r.month_label,
      duration_label: r.duration_label || '', distance_label: r.distance_label || '',
      target_count: String(r.target_count), sort_order: String(r.sort_order),
      trip_type: r.trip_type || 'day', description: r.description || '',
    })
  }

  async function saveEdit(id) {
    setSavingEdit(true); setEditErr(null)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, target_count: parseInt(editForm.target_count, 10), sort_order: parseInt(editForm.sort_order, 10) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setEditErr(data.error || 'Failed to save.'); return }
      setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r).sort((a, b) => a.sort_order - b.sort_order))
      setEditId(null)
    } catch { setEditErr('Network error.') }
    finally { setSavingEdit(false) }
  }

  // Move a route up/down and persist the new order (normalised to 1..n).
  async function move(id, dir) {
    const ordered = [...routes].sort((a, b) => a.sort_order - b.sort_order)
    const idx = ordered.findIndex(r => r.id === id)
    const t = dir === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || t < 0 || t >= ordered.length) return
    const arr = [...ordered]
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]
    const withOrder = arr.map((r, i) => ({ ...r, sort_order: i + 1 }))
    const changed = withOrder.filter(r => (ordered.find(o => o.id === r.id)?.sort_order) !== r.sort_order)
    setRoutes(withOrder) // optimistic
    try {
      await Promise.all(changed.map(r => fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: r.sort_order }),
      })))
    } catch { load() } // reload on failure to resync
  }

  async function toggleActive(r) {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !r.is_active }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, ...data } : x))
    } catch {} finally { setBusyId(null) }
  }

  async function del(id) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}`, { method: 'DELETE' })
      if (res.ok) { setRoutes(prev => prev.filter(r => r.id !== id)); setDeleteConfirm(null) }
    } catch {} finally { setBusyId(null) }
  }

  async function launch(id) {
    setLaunching(true)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}/launch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: launchMsg }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setRoutes(prev => prev.map(r => r.id === id ? { ...r, launched: true, launched_at: data.launched_at } : r))
        setLaunchFor(null); setLaunchMsg('')
        alert(`Launched — ${data.emailed || 0} interested driver(s) emailed.`)
      } else { alert(data.error || 'Launch failed.') }
    } catch { alert('Network error.') }
    finally { setLaunching(false) }
  }

  const totalInterest = routes.reduce((s, r) => s + (r.interested_count || 0), 0)

  return (
    <div className="rta-wrap" style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)', maxWidth: '860px' }}>
      <style>{`
        .rta-wrap input, .rta-wrap select, .rta-wrap textarea { font-size: 16px !important; }
        .rta-wrap button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .rta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .rta-grid > div { min-width: 0; }
        @media (min-width: 640px) { .rta-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>

      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: 300, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Upcoming Routes</h1>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>Shown on <a href="/routes" target="_blank" rel="noreferrer" style={{ color: '#c5a882' }}>canvasroutes.com/routes</a>. {routes.length} route{routes.length !== 1 ? 's' : ''} · {totalInterest} total interested.</p>
      </div>

      {/* Add form */}
      <form onSubmit={addRoute} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Add Route</div>
        <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
          <Field label="Route name"><input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Memoirs to Charlevoix" maxLength={120} /></Field>
          <Field label="Destination"><input style={inp} value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} placeholder="Charlevoix, QC" maxLength={120} /></Field>
        </div>
        <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
          <Field label="Month label"><input style={inp} value={form.month_label} onChange={e => setForm(p => ({ ...p, month_label: e.target.value }))} placeholder="July 2026" maxLength={40} /></Field>
          <Field label="Duration"><input style={inp} value={form.duration_label} onChange={e => setForm(p => ({ ...p, duration_label: e.target.value }))} placeholder="1 day" maxLength={40} /></Field>
          <Field label="Distance"><input style={inp} value={form.distance_label} onChange={e => setForm(p => ({ ...p, distance_label: e.target.value }))} placeholder="780 km (roundtrip)" maxLength={60} /></Field>
        </div>
        <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
          <Field label="Target (threshold)"><input style={inp} type="number" inputMode="numeric" min="1" value={form.target_count} onChange={e => setForm(p => ({ ...p, target_count: e.target.value }))} /></Field>
          <Field label="Sort order"><input style={inp} type="number" inputMode="numeric" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} placeholder={String(routes.length + 1)} /></Field>
          <Field label="Trip type"><TripSelect value={form.trip_type} onChange={e => setForm(p => ({ ...p, trip_type: e.target.value }))} /></Field>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <L>Description</L>
          <textarea style={{ ...inp, height: '72px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={600} placeholder="Short evocative description shown on the card." />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <PrimaryBtn disabled={adding} onClick={addRoute}>{adding ? 'Adding…' : 'Add Route'}</PrimaryBtn>
          {formErr && <Err msg={formErr} />}
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : routes.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No routes yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {routes.map((r, i) => {
            const pct = Math.min(100, Math.round((r.interested_count / r.target_count) * 100))
            const isEditing = editId === r.id
            const isOpen = !!expanded[r.id]
            const arrowBtn = (dir, disabled) => (
              <button onClick={() => move(r.id, dir)} disabled={disabled} aria-label={`Move ${dir}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', color: disabled ? '#ddd' : '#888', fontSize: '14px', lineHeight: 1 }}>
                {dir === 'up' ? '↑' : '↓'}
              </button>
            )
            return (
              <div key={r.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.1rem 1.25rem', opacity: r.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '19px', color: '#1a1a1a' }}>{r.name}</span>
                      {TRIP_TAG[r.trip_type] && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a6535', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 7px', borderRadius: '99px' }}>{TRIP_TAG[r.trip_type]}</span>}
                      {r.launched && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.35)', padding: '2px 7px', borderRadius: '99px' }}>Launched</span>}
                      {!r.is_active && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', border: '0.5px solid rgba(0,0,0,0.15)', padding: '2px 7px', borderRadius: '99px' }}>Hidden</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{r.destination} · {r.month_label} · {r.duration_label || '—'} · {r.distance_label || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{r.interested_count} / {r.target_count}</div>
                    <div style={{ fontSize: '10px', color: '#bbb' }}>{pct}% to launch</div>
                  </div>
                </div>

                {/* progress */}
                <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden', margin: '0.75rem 0' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#3B6B2F' : 'linear-gradient(90deg,#c5a882,#e8c99a)' }} />
                </div>

                {/* actions */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: '6px', overflow: 'hidden' }} title="Reorder">
                    {arrowBtn('up', i === 0)}
                    <div style={{ width: '0.5px', background: 'rgba(0,0,0,0.1)' }} />
                    {arrowBtn('down', i === routes.length - 1)}
                  </div>
                  <GhostBtn small onClick={() => setExpanded(p => ({ ...p, [r.id]: !p[r.id] }))}>{isOpen ? 'Collapse' : `Interested (${r.interested_count})`}</GhostBtn>
                  <GhostBtn small onClick={() => (isEditing ? setEditId(null) : startEdit(r))}>{isEditing ? 'Close' : 'Edit'}</GhostBtn>
                  <GhostBtn small onClick={() => toggleActive(r)} disabled={busyId === r.id}>{r.is_active ? 'Hide from site' : 'Show on site'}</GhostBtn>
                  {!r.launched && <PrimaryBtn small onClick={() => { setLaunchFor(r.id); setLaunchMsg('') }}>Launch</PrimaryBtn>}
                  <div style={{ marginLeft: 'auto' }}>
                    {deleteConfirm === r.id ? (
                      <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#93333E' }}>Delete?</span>
                        <DangerBtn small onClick={() => del(r.id)} disabled={busyId === r.id}>Yes</DangerBtn>
                        <GhostBtn small onClick={() => setDeleteConfirm(null)}>No</GhostBtn>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '18px', lineHeight: 1, padding: '2px 6px' }} aria-label="Delete route">×</button>
                    )}
                  </div>
                </div>

                {/* Launch composer */}
                {launchFor === r.id && (
                  <div style={{ marginTop: '0.85rem', padding: '0.85rem', background: 'rgba(197,168,130,0.06)', border: '0.5px solid rgba(197,168,130,0.3)', borderRadius: '8px' }}>
                    <L>Launch message (optional — included in the email to all {r.interested_count} interested)</L>
                    <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={launchMsg} onChange={e => setLaunchMsg(e.target.value)} placeholder="Meeting point, timing, per-car fee, convoy rules…" maxLength={1500} />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <PrimaryBtn small disabled={launching} onClick={() => launch(r.id)}>{launching ? 'Launching…' : `Launch & email ${r.interested_count}`}</PrimaryBtn>
                      <GhostBtn small onClick={() => setLaunchFor(null)}>Cancel</GhostBtn>
                    </div>
                  </div>
                )}

                {/* Edit panel */}
                {isEditing && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                    <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Route name"><input style={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></Field>
                      <Field label="Destination"><input style={inp} value={editForm.destination} onChange={e => setEditForm(p => ({ ...p, destination: e.target.value }))} /></Field>
                    </div>
                    <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Month label"><input style={inp} value={editForm.month_label} onChange={e => setEditForm(p => ({ ...p, month_label: e.target.value }))} /></Field>
                      <Field label="Duration"><input style={inp} value={editForm.duration_label} onChange={e => setEditForm(p => ({ ...p, duration_label: e.target.value }))} /></Field>
                      <Field label="Distance"><input style={inp} value={editForm.distance_label} onChange={e => setEditForm(p => ({ ...p, distance_label: e.target.value }))} /></Field>
                    </div>
                    <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Target"><input style={inp} type="number" inputMode="numeric" min="1" value={editForm.target_count} onChange={e => setEditForm(p => ({ ...p, target_count: e.target.value }))} /></Field>
                      <Field label="Sort order"><input style={inp} type="number" inputMode="numeric" value={editForm.sort_order} onChange={e => setEditForm(p => ({ ...p, sort_order: e.target.value }))} /></Field>
                      <Field label="Trip type"><TripSelect value={editForm.trip_type} onChange={e => setEditForm(p => ({ ...p, trip_type: e.target.value }))} /></Field>
                    </div>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <L>Description</L>
                      <textarea style={{ ...inp, height: '72px', resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} maxLength={600} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <PrimaryBtn small disabled={savingEdit} onClick={() => saveEdit(r.id)}>{savingEdit ? 'Saving…' : 'Save'}</PrimaryBtn>
                      <GhostBtn small onClick={() => setEditId(null)}>Cancel</GhostBtn>
                      {editErr && <Err msg={editErr} />}
                    </div>
                  </div>
                )}

                {/* Interest list */}
                {isOpen && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                    {(r.interest || []).length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#bbb' }}>No one has registered interest yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {r.interest.map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: '13px', color: '#333' }}>{p.name || '—'}</span>
                              <a href={`mailto:${p.email}`} style={{ fontSize: '12px', color: '#888', marginLeft: '0.5rem', textDecoration: 'none' }}>{p.email}</a>
                            </div>
                            <div style={{ fontSize: '10px', color: '#bbb', flexShrink: 0 }}>
                              {p.is_member ? 'Member' : (p.membership_optin ? 'Waitlist opt-in' : 'Public')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
