'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, sel, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../_components/shared'
import RouteEventConfigClient from '../_components/RouteEventConfigClient'
import WtetClient from '../wtet/WtetClient'
import WtetAwardsClient from '../wtet-awards/WtetAwardsClient'

// WTET is still on its own frozen, bespoke check-in/waiver/lunch/awards
// system (contacts.wtet_checkin/wtet_waiver/wtet_lunch + wtet_awards_votes) —
// every other route (including future ones) uses the generic per-event
// system via RouteEventConfigClient instead.
const WTET_SLUG = 'whips-to-eastern-townships'

const TRIP_TYPES = [
  { value: 'day',       label: 'Day trip'  },
  { value: 'overnight', label: 'Overnight' },
  { value: 'multi_day', label: 'Multi-day' },
]
const TRIP_TAG = { overnight: 'Overnight', multi_day: 'Multi-day' } // 'day' shows no tag

const EMPTY = { name: '', destination: '', month_label: '', duration_label: '', distance_label: '', target_count: '12', sort_order: '', trip_type: 'day', price_per_car: '', max_cars: '', itinerary: '', activity_options: '', dest_lat: '', dest_lng: '', description: '', is_past: false, cars_rolled_out: '', photo_url: '', recap_href: '', registration_url: '' }

const splitActs = v => (v || '').split(',').map(x => x.trim()).filter(Boolean)

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

function PopupToggle({ label, description, value, onChange, saving }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>{description}</div>
      </div>
      <button
        type="button" role="switch" aria-checked={value}
        onClick={() => !saving && onChange(!value)}
        style={{
          position: 'relative', flexShrink: 0, width: '40px', height: '22px',
          background: value ? '#0F1E14' : 'rgba(0,0,0,0.15)',
          border: 'none', borderRadius: '11px',
          cursor: saving ? 'wait' : 'pointer', transition: 'background 0.18s',
          opacity: saving ? 0.6 : 1, marginTop: '2px',
        }}
      >
        <span style={{
          position: 'absolute', top: '3px', left: value ? '20px' : '3px',
          width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
          transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', display: 'block',
        }} />
      </button>
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
  const [showEventPanel, setShowEventPanel] = useState({}) // route id -> bool, registrants/check-in/awards
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [launchFor, setLaunchFor] = useState(null) // route id
  const [launchMsg, setLaunchMsg] = useState('')
  const [launching, setLaunching] = useState(false)
  const [emailFor, setEmailFor]   = useState(null) // route id
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMsg, setEmailMsg]   = useState('')
  const [emailing, setEmailing]   = useState(false)
  const [busyId, setBusyId]       = useState(null)
  const [person, setPerson]       = useState(null)  // { route, p } — detail popup
  const [personConfirm, setPersonConfirm] = useState(false)
  const [personDeleting, setPersonDeleting] = useState(false)

  // Homepage routes popup settings
  const [popupSettings, setPopupSettings] = useState({})
  const [popupSlugDraft, setPopupSlugDraft] = useState('')
  const [popupSaving, setPopupSaving] = useState({})
  const [popupErrors, setPopupErrors] = useState({})
  const [popupSaved, setPopupSaved] = useState({})

  const load = useCallback(() => {
    fetch('/api/admin/upcoming-routes')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRoutes(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : {})
      .then(data => { setPopupSettings(data); setPopupSlugDraft(data.routes_popup_route_slug || '') })
      .catch(() => {})
  }, [])

  function popupBoolVal(key, fallback = true) {
    if (!(key in popupSettings)) return fallback
    return popupSettings[key] !== 'false'
  }
  function popupStrVal(key, fallback = '') {
    return (key in popupSettings) ? popupSettings[key] : fallback
  }

  async function savePopupSetting(key, value) {
    setPopupSaving(p => ({ ...p, [key]: true }))
    setPopupErrors(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPopupErrors(p => ({ ...p, [key]: data.error || 'Failed to save.' })); return }
      setPopupSettings(p => ({ ...p, [key]: value }))
      setPopupSaved(p => ({ ...p, [key]: true }))
      setTimeout(() => setPopupSaved(p => ({ ...p, [key]: false })), 2000)
    } catch {
      setPopupErrors(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setPopupSaving(p => ({ ...p, [key]: false }))
    }
  }

  async function addRoute(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.destination.trim() || !form.month_label.trim()) {
      setFormErr('Name, destination and month are required.'); return
    }
    setAdding(true); setFormErr(null)
    try {
      const res = await fetch('/api/admin/upcoming-routes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, activity_options: splitActs(form.activity_options), target_count: parseInt(form.target_count, 10) || 12, sort_order: parseInt(form.sort_order, 10) || routes.length + 1, cars_rolled_out: form.cars_rolled_out === '' ? null : parseInt(form.cars_rolled_out, 10) }),
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
      trip_type: r.trip_type || 'day',
      price_per_car: r.price_per_car != null ? String(r.price_per_car) : '',
      price_range: r.price_range || '',
      max_cars: r.max_cars != null ? String(r.max_cars) : '',
      itinerary: r.itinerary || '',
      activity_options: (r.activity_options || []).join(', '),
      dest_lat: r.dest_lat != null ? String(r.dest_lat) : '',
      dest_lng: r.dest_lng != null ? String(r.dest_lng) : '',
      description: r.description || '',
      is_past: !!r.is_past,
      cars_rolled_out: r.cars_rolled_out != null ? String(r.cars_rolled_out) : '',
      photo_url: r.photo_url || '',
      recap_href: r.recap_href || '',
      registration_url: r.registration_url || '',
    })
  }

  async function saveEdit(id) {
    setSavingEdit(true); setEditErr(null)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, activity_options: splitActs(editForm.activity_options), target_count: parseInt(editForm.target_count, 10), sort_order: parseInt(editForm.sort_order, 10), cars_rolled_out: editForm.cars_rolled_out === '' ? null : parseInt(editForm.cars_rolled_out, 10) }),
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

  // Gates hello-to-montebello-register / hello-to-montebello-member-register
  // (and the equivalent per-route registration pages as they're added) —
  // separate from is_active, which only controls whether the route's tile
  // shows up in listings at all.
  async function toggleRegistrationOpen(r) {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_open: !(r.registration_open !== false) }),
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

  async function sendBroadcast(id) {
    if (!emailMsg.trim()) return
    setEmailing(true)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}/broadcast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMsg }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { setEmailFor(null); setEmailSubject(''); setEmailMsg(''); alert(`Sent to ${data.emailed || 0} interested driver(s).`) }
      else alert(data.error || 'Failed to send.')
    } catch { alert('Network error.') }
    finally { setEmailing(false) }
  }

  async function deleteInterest(routeId, pr) {
    setPersonDeleting(true)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${routeId}/interest`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest_id: pr.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data.error || 'Failed to remove.'); return }
      setRoutes(prev => prev.map(r => r.id === routeId
        ? { ...r, interest: (r.interest || []).filter(x => x.id !== pr.id), interested_count: Math.max(0, (r.interested_count || 1) - 1) }
        : r))
      setPerson(null); setPersonConfirm(false)
    } catch { alert('Network error.') }
    finally { setPersonDeleting(false) }
  }

  function downloadCSV(rows, filename) {
    const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = filename
    a.click(); URL.revokeObjectURL(a.href)
  }

  function interestRows(routesToExport) {
    const rows = [['Route', 'Name', 'Email', 'Phone', 'Car', 'Budget', 'Preferred dates', 'Hotel', 'Activities', 'Notes', 'Status', 'Registered']]
    for (const r of routesToExport) for (const p of (r.interest || [])) {
      const pr = p.preferences || {}
      rows.push([
        r.name, p.name || '', p.email, p.phone || '', p.car || '',
        pr.budget || '', pr.dates || '', pr.hotel || '', (pr.activities || []).join('; '), pr.notes || '',
        p.is_member ? 'Member' : (p.membership_optin ? 'Membership lead' : 'Public'),
        p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
      ])
    }
    return rows
  }

  function exportRouteCSV(route) {
    const slug = route.slug || route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadCSV(interestRows([route]), `${slug}-interest-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const totalInterest = routes.reduce((s, r) => s + (r.interested_count || 0), 0)

  return (
    <div className="rta-wrap" style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
      <style>{`
        .rta-wrap input, .rta-wrap select, .rta-wrap textarea { font-size: 16px !important; }
        .rta-wrap button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .rta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .rta-grid > div { min-width: 0; }
        @media (min-width: 640px) { .rta-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }
      `}</style>

      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: 300, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Routes</h1>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>Shown on <a href="/routes" target="_blank" rel="noreferrer" style={{ color: '#c5a882' }}>canvasroutes.com/routes</a>. {routes.length} route{routes.length !== 1 ? 's' : ''} · {totalInterest} total interested.</p>
      </div>

      {/* Homepage popup */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Homepage Popup</div>

        <PopupToggle
          label="Show Routes Popup"
          description="The homepage popup nudging visitors toward the Routes page. Shown once per session, a couple seconds after the page loads."
          value={popupBoolVal('routes_popup_enabled', true)}
          saving={popupSaving.routes_popup_enabled}
          onChange={v => savePopupSetting('routes_popup_enabled', v ? 'true' : 'false')}
        />
        {popupErrors.routes_popup_enabled && <Err msg={popupErrors.routes_popup_enabled} />}
        {popupSaved.routes_popup_enabled && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}

        <div style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            General promotes the whole season's routes. Specific route features one route by name — pick it below.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { val: 'general',  label: 'General — all routes' },
              { val: 'specific', label: 'Specific route' },
            ].map(({ val, label }) => {
              const active = popupStrVal('routes_popup_mode', 'general') === val
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => savePopupSetting('routes_popup_mode', val)}
                  disabled={popupSaving.routes_popup_mode}
                  style={{
                    padding: '0.55rem 1rem', borderRadius: '8px',
                    border: `1px solid ${active ? '#0F1E14' : 'rgba(0,0,0,0.14)'}`,
                    background: active ? '#0F1E14' : '#fff',
                    color: active ? '#F5F1EC' : '#555',
                    fontSize: '12px', cursor: popupSaving.routes_popup_mode ? 'wait' : 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {popupErrors.routes_popup_mode && <Err msg={popupErrors.routes_popup_mode} />}
          {popupSaved.routes_popup_mode && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}

          {popupStrVal('routes_popup_mode', 'general') === 'specific' && (
            <div style={{ marginTop: '0.5rem' }}>
              <L>Featured Route</L>
              <select
                style={{ ...sel, marginBottom: '0.5rem' }}
                value={popupSlugDraft}
                onChange={e => setPopupSlugDraft(e.target.value)}
              >
                <option value="">Select a route…</option>
                {routes.map(r => (
                  <option key={r.slug} value={r.slug}>{r.name} — {r.destination}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => savePopupSetting('routes_popup_route_slug', popupSlugDraft)}
                disabled={popupSaving.routes_popup_route_slug}
                style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: popupSaving.routes_popup_route_slug ? 'wait' : 'pointer', opacity: popupSaving.routes_popup_route_slug ? 0.6 : 1 }}
              >
                {popupSaving.routes_popup_route_slug ? 'Saving…' : 'Save'}
              </button>
              {routes.length === 0 && (
                <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.5rem' }}>No routes yet — add one below first.</div>
              )}
              {popupErrors.routes_popup_route_slug && <Err msg={popupErrors.routes_popup_route_slug} />}
              {popupSaved.routes_popup_route_slug && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}
            </div>
          )}
        </div>
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
        <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
          <Field label="Avg. price range"><input style={inp} value={form.price_range} onChange={e => setForm(p => ({ ...p, price_range: e.target.value }))} placeholder="e.g. $800–$1,200 per car" maxLength={60} /></Field>
          <Field label="Price per car ($)"><input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={form.price_per_car} onChange={e => setForm(p => ({ ...p, price_per_car: e.target.value }))} placeholder="exact — set at launch" /></Field>
          <Field label="Max cars"><input style={inp} type="number" inputMode="numeric" min="1" value={form.max_cars} onChange={e => setForm(p => ({ ...p, max_cars: e.target.value }))} placeholder="optional" /></Field>
        </div>
        <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
          <Field label="Destination latitude"><input style={inp} type="number" inputMode="decimal" step="any" value={form.dest_lat} onChange={e => setForm(p => ({ ...p, dest_lat: e.target.value }))} placeholder="e.g. 47.4412 — plots the map" /></Field>
          <Field label="Destination longitude"><input style={inp} type="number" inputMode="decimal" step="any" value={form.dest_lng} onChange={e => setForm(p => ({ ...p, dest_lng: e.target.value }))} placeholder="e.g. -70.5052" /></Field>
        </div>
        <div style={{ marginBottom: '0.6rem' }}>
          <L>Itinerary (optional — shown on the card, expandable)</L>
          <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={form.itinerary} onChange={e => setForm(p => ({ ...p, itinerary: e.target.value }))} maxLength={2000} placeholder="Stops, timing, route notes…" />
        </div>
        <div style={{ marginBottom: '0.6rem' }}>
          <L>Activity options (comma-separated — asked on the interest form)</L>
          <input style={inp} value={form.activity_options} onChange={e => setForm(p => ({ ...p, activity_options: e.target.value }))} placeholder="Scenic drives, Whale watching, Local food…" maxLength={500} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <L>Description</L>
          <textarea style={{ ...inp, height: '72px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={600} placeholder="Short evocative description shown on the card." />
        </div>
        <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
          <Field label="Photo URL (hero image — shown on the route's tile and in the homepage popup)"><input style={inp} value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))} placeholder="/montebello-hero.jpg" /></Field>
          <Field label="Registration link (once launched — points the tile to the public registration page)"><input style={inp} value={form.registration_url} onChange={e => setForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="/hello-to-montebello" /></Field>
        </div>
        <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: '#555', marginBottom: '0.6rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_past} onChange={e => setForm(p => ({ ...p, is_past: e.target.checked }))} />
            This route already ran — show it in Past Routes instead of the active list
          </label>
          {form.is_past && (
            <div className="rta-grid rta-grid-3">
              <Field label="Cars rolled out"><input style={inp} type="number" inputMode="numeric" min="0" value={form.cars_rolled_out} onChange={e => setForm(p => ({ ...p, cars_rolled_out: e.target.value }))} placeholder="e.g. 22" /></Field>
              <Field label="Recap link"><input style={inp} value={form.recap_href} onChange={e => setForm(p => ({ ...p, recap_href: e.target.value }))} placeholder="/wtet" /></Field>
            </div>
          )}
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
                      {r.is_past && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.35)', padding: '2px 7px', borderRadius: '99px' }}>Past</span>}
                      {r.launched && !r.is_past && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.35)', padding: '2px 7px', borderRadius: '99px' }}>Launched</span>}
                      {!r.is_active && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', border: '0.5px solid rgba(0,0,0,0.15)', padding: '2px 7px', borderRadius: '99px' }}>Hidden</span>}
                      {r.launched && r.registration_open === false && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93333E', border: '0.5px solid rgba(147,51,62,0.35)', padding: '2px 7px', borderRadius: '99px' }}>Registration Closed</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{r.destination} · {r.month_label} · {r.duration_label || '—'} · {r.distance_label || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r.is_past ? (
                      <>
                        <div style={{ fontSize: '15px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{r.cars_rolled_out ?? '—'} / {r.target_count}</div>
                        <div style={{ fontSize: '10px', color: '#bbb' }}>cars rolled out</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '15px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{r.interested_count} / {r.target_count}</div>
                        <div style={{ fontSize: '10px', color: '#bbb' }}>{pct}% to launch</div>
                      </>
                    )}
                  </div>
                </div>

                {/* progress */}
                {!r.is_past && (
                  <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden', margin: '0.75rem 0' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#3B6B2F' : 'linear-gradient(90deg,#c5a882,#e8c99a)' }} />
                  </div>
                )}

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
                  {r.launched && (
                    <GhostBtn small onClick={() => toggleRegistrationOpen(r)} disabled={busyId === r.id}>
                      {r.registration_open === false ? 'Reopen registration' : 'Close registration'}
                    </GhostBtn>
                  )}
                  <GhostBtn small onClick={() => { setEmailFor(emailFor === r.id ? null : r.id); setEmailSubject(''); setEmailMsg('') }} disabled={r.interested_count === 0}>Email</GhostBtn>
                  <GhostBtn small onClick={() => exportRouteCSV(r)} disabled={r.interested_count === 0}>Export CSV</GhostBtn>
                  {(r.slug === WTET_SLUG || r.event_id) && (
                    <GhostBtn small onClick={() => setShowEventPanel(p => ({ ...p, [r.id]: !p[r.id] }))}>
                      {showEventPanel[r.id] ? 'Hide Registrants, Waiver, Lunch & Awards' : 'Registrants, Waiver, Lunch & Awards'}
                    </GhostBtn>
                  )}
                  {!r.launched && !r.is_past && <PrimaryBtn small onClick={() => { setLaunchFor(r.id); setLaunchMsg('') }}>Launch</PrimaryBtn>}
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

                {/* Email-everyone composer */}
                {emailFor === r.id && (
                  <div style={{ marginTop: '0.85rem', padding: '0.85rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: '8px' }}>
                    <L>Email all {r.interested_count} interested driver{r.interested_count !== 1 ? 's' : ''}</L>
                    <input style={{ ...inp, marginBottom: '0.5rem' }} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={`Subject (default: Update — ${r.name})`} maxLength={140} />
                    <textarea style={{ ...inp, height: '96px', resize: 'vertical' }} value={emailMsg} onChange={e => setEmailMsg(e.target.value)} placeholder="Your message to everyone interested in this route…" maxLength={3000} />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <PrimaryBtn small disabled={emailing || !emailMsg.trim()} onClick={() => sendBroadcast(r.id)}>{emailing ? 'Sending…' : `Send to ${r.interested_count}`}</PrimaryBtn>
                      <GhostBtn small onClick={() => setEmailFor(null)}>Cancel</GhostBtn>
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
                    <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Avg. price range"><input style={inp} value={editForm.price_range} onChange={e => setEditForm(p => ({ ...p, price_range: e.target.value }))} placeholder="e.g. $800–$1,200 per car" maxLength={60} /></Field>
                      <Field label="Price per car ($)"><input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={editForm.price_per_car} onChange={e => setEditForm(p => ({ ...p, price_per_car: e.target.value }))} placeholder="optional" /></Field>
                      <Field label="Max cars"><input style={inp} type="number" inputMode="numeric" min="1" value={editForm.max_cars} onChange={e => setEditForm(p => ({ ...p, max_cars: e.target.value }))} placeholder="optional" /></Field>
                    </div>
                    <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Destination latitude"><input style={inp} type="number" inputMode="decimal" step="any" value={editForm.dest_lat} onChange={e => setEditForm(p => ({ ...p, dest_lat: e.target.value }))} placeholder="e.g. 47.4412" /></Field>
                      <Field label="Destination longitude"><input style={inp} type="number" inputMode="decimal" step="any" value={editForm.dest_lng} onChange={e => setEditForm(p => ({ ...p, dest_lng: e.target.value }))} placeholder="e.g. -70.5052" /></Field>
                    </div>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <L>Itinerary</L>
                      <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editForm.itinerary} onChange={e => setEditForm(p => ({ ...p, itinerary: e.target.value }))} maxLength={2000} placeholder="Stops, timing, route notes…" />
                    </div>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <L>Activity options (comma-separated)</L>
                      <input style={inp} value={editForm.activity_options} onChange={e => setEditForm(p => ({ ...p, activity_options: e.target.value }))} placeholder="Scenic drives, Whale watching, Local food…" maxLength={500} />
                    </div>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <L>Description</L>
                      <textarea style={{ ...inp, height: '72px', resize: 'vertical' }} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} maxLength={600} />
                    </div>
                    <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Photo URL (hero image — shown on the route's tile and in the homepage popup)"><input style={inp} value={editForm.photo_url} onChange={e => setEditForm(p => ({ ...p, photo_url: e.target.value }))} placeholder="/montebello-hero.jpg" /></Field>
                      <Field label="Registration link (once launched — points the tile to the public registration page)"><input style={inp} value={editForm.registration_url} onChange={e => setEditForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="/hello-to-montebello" /></Field>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', marginBottom: '0.6rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: '#555', marginBottom: '0.6rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editForm.is_past} onChange={e => setEditForm(p => ({ ...p, is_past: e.target.checked }))} />
                        This route already ran — show it in Past Routes instead of the active list
                      </label>
                      {editForm.is_past && (
                        <div className="rta-grid rta-grid-3">
                          <Field label="Cars rolled out"><input style={inp} type="number" inputMode="numeric" min="0" value={editForm.cars_rolled_out} onChange={e => setEditForm(p => ({ ...p, cars_rolled_out: e.target.value }))} placeholder="e.g. 22" /></Field>
                          <Field label="Recap link"><input style={inp} value={editForm.recap_href} onChange={e => setEditForm(p => ({ ...p, recap_href: e.target.value }))} placeholder="/wtet" /></Field>
                        </div>
                      )}
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
                          <button key={p.id || i} type="button"
                            onClick={() => { setPerson({ route: r, p }); setPersonConfirm(false) }}
                            style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', width: '100%', minHeight: '44px', padding: '0.5rem 0.6rem', margin: '0 -0.6rem', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: '13px', color: '#333' }}>{p.name || '—'}</span>
                              <span style={{ fontSize: '12px', color: '#888', marginLeft: '0.5rem' }}>{p.email}</span>
                              {(p.car || p.preferences?.budget) && (
                                <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {[p.car, p.preferences?.budget].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                              <span style={{ fontSize: '10px', color: '#bbb' }}>{p.is_member ? 'Member' : (p.membership_optin ? 'Membership lead' : 'Public')}</span>
                              <span style={{ color: '#c5a882', fontSize: '12px' }}>›</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Registrants / Check-in (trip details, waiver, lunch) / Route Awards —
                    inline here instead of requiring a trip to Admin > Events. WTET stays
                    on its own frozen bespoke system; every other route (current and
                    future) uses the generic per-event system via RouteEventConfigClient. */}
                {showEventPanel[r.id] && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', marginLeft: '-1.25rem', marginRight: '-1.25rem' }}>
                    {r.slug === WTET_SLUG ? (
                      <>
                        <WtetClient />
                        <WtetAwardsClient />
                      </>
                    ) : r.event_id ? (
                      <RouteEventConfigClient eventId={r.event_id} />
                    ) : (
                      <div style={{ padding: '1.5rem', fontSize: '12px', color: '#bbb' }}>
                        This route isn't linked to an events row yet — re-save it or contact support to link one.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Interested-person detail popup ── */}
      {person && (() => {
        const { route: pr, p } = person
        const prefs = p.preferences || {}
        const rows = [
          ['Route', pr.name],
          ['Name', p.name || '—'],
          ['Email', <a key="e" href={`mailto:${p.email}`} style={{ color: '#8A6535', textDecoration: 'none' }}>{p.email}</a>],
          ['Phone', p.phone ? <a key="t" href={`tel:${p.phone}`} style={{ color: '#8A6535', textDecoration: 'none' }}>{p.phone}</a> : '—'],
          ['Car', p.car || '—'],
          ['Status', p.is_member ? 'Member' : (p.membership_optin ? 'Public · interested in membership' : 'Public')],
          ['Budget', prefs.budget || '—'],
          ['Preferred dates', prefs.dates || '—'],
          ['Hotel', prefs.hotel || '—'],
          ['Activities', prefs.activities?.length ? prefs.activities.join(', ') : '—'],
          ['Notes', prefs.notes || '—'],
          ['Registered', p.created_at ? new Date(p.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'],
        ]
        return (
          <div onClick={() => setPerson(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,30,20,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', width: '100%', maxWidth: '440px', maxHeight: '86vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '1.4rem 1.5rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '6px' }}>Route Interest</div>
                  <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '22px', fontWeight: 300, color: '#1a1a1a', lineHeight: 1.15 }}>{p.name || p.email}</div>
                </div>
                <button onClick={() => setPerson(null)} aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '19px', lineHeight: 1, padding: '10px', margin: '-8px -10px 0 0', minWidth: '44px', minHeight: '44px' }}>✕</button>
              </div>
              <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
                {rows.map(([k, v], i) => (
                  <div key={k} style={{ display: 'flex', gap: '0.85rem', padding: '0.6rem 0.85rem', borderBottom: i < rows.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', background: i % 2 ? '#fdfdfc' : '#fff' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', width: '92px', flexShrink: 0, paddingTop: '2px' }}>{k}</div>
                    <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.55, minWidth: 0, overflowWrap: 'anywhere' }}>{v}</div>
                  </div>
                ))}
              </div>
              {personConfirm ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#93333E' }}>Remove {p.name?.split(' ')[0] || 'them'} from {pr.name}?</span>
                  <DangerBtn small disabled={personDeleting} onClick={() => deleteInterest(pr.id, p)}>{personDeleting ? 'Removing…' : 'Yes, remove'}</DangerBtn>
                  <GhostBtn small onClick={() => setPersonConfirm(false)}>Cancel</GhostBtn>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <GhostBtn small onClick={() => setPerson(null)}>Close</GhostBtn>
                  <DangerBtn small onClick={() => setPersonConfirm(true)}>Remove from route</DangerBtn>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
