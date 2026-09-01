'use client'
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err, KebabMenu, ToggleSwitch, CopyBtn } from '../_components/shared'
import { useConfirm } from '../_components/ConfirmProvider'
import RouteEventConfigClient from '../_components/RouteEventConfigClient'
import WtetClient from '../wtet/WtetClient'
import { MONTREAL_TZ } from '../../../lib/mtlTime'
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

const smallInput = { ...inp, fontSize: '12px', padding: '0.4rem 0.6rem' }
const smallTextarea = { ...smallInput, resize: 'vertical' }
const smallSelect = { ...smallInput, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }

const EMPTY = { name: '', destination: '', month_label: '', duration_label: '', distance_label: '', target_count: '12', sort_order: '', trip_type: 'day', price_range: '', price_per_car: '', max_cars: '', itinerary: '', activity_options: '', dest_lat: '', dest_lng: '', description: '', is_past: false, cars_rolled_out: '', photo_url: '', recap_href: '', registration_url: '' }

const splitActs = v => (v || '').split(',').map(x => x.trim()).filter(Boolean)

function Field({ label, children }) {
  return <div style={{ minWidth: 0 }}><L>{label}</L>{children}</div>
}

function TripSelect({ value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <select style={smallSelect} value={value || 'day'} onChange={onChange}>
        {TRIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
  )
}

// Mode selector + route/event picker for one popup card slot. `prefix` is
// the settings-key prefix ('routes_popup' for card 1, 'routes_popup2' for
// card 2) — same component renders both, so there's one implementation to
// get right instead of two hand-duplicated copies.
function PopupModeEditor({ prefix, routes, events, popupStrVal, savePopupSetting, popupSaving, popupErrors, popupSaved, slugDraft, setSlugDraft, eventDraft, setEventDraft }) {
  const modeKey = `${prefix}_mode`
  const slugKey = `${prefix}_route_slug`
  const eventKey = `${prefix}_event_id`
  const mode = popupStrVal(modeKey, 'general')
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {[
          { val: 'general',  label: 'General — all routes' },
          { val: 'specific', label: 'Specific route' },
          { val: 'event',    label: 'Specific event (Cars & Coffee, etc.)' },
        ].map(({ val, label }) => {
          const active = mode === val
          return (
            <button
              key={val}
              type="button"
              onClick={() => savePopupSetting(modeKey, val)}
              disabled={popupSaving[modeKey]}
              style={{
                padding: '0.7rem 1rem', minHeight: '44px', borderRadius: '8px',
                border: `1px solid ${active ? '#0F1E14' : 'rgba(0,0,0,0.14)'}`,
                background: active ? '#0F1E14' : '#fff',
                color: active ? '#F5F1EC' : '#555',
                fontSize: '12px', cursor: popupSaving[modeKey] ? 'wait' : 'pointer',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
      {popupErrors[modeKey] && <Err msg={popupErrors[modeKey]} />}
      {popupSaved[modeKey] && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}

      {mode === 'specific' && (
        <div style={{ marginTop: '0.5rem' }}>
          <L>Featured Route</L>
          <select
            style={{ ...smallSelect, marginBottom: '0.5rem' }}
            value={slugDraft}
            onChange={e => setSlugDraft(e.target.value)}
          >
            <option value="">Select a route…</option>
            {routes.map(r => (
              <option key={r.slug} value={r.slug}>{r.name} — {r.destination}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => savePopupSetting(slugKey, slugDraft)}
            disabled={popupSaving[slugKey]}
            style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: popupSaving[slugKey] ? 'wait' : 'pointer', opacity: popupSaving[slugKey] ? 0.6 : 1 }}
          >
            {popupSaving[slugKey] ? 'Saving…' : 'Save'}
          </button>
          {routes.length === 0 && (
            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.5rem' }}>No routes yet — add one below first.</div>
          )}
          {popupErrors[slugKey] && <Err msg={popupErrors[slugKey]} />}
          {popupSaved[slugKey] && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}
        </div>
      )}

      {mode === 'event' && (
        <div style={{ marginTop: '0.5rem' }}>
          <L>Featured Event</L>
          <select
            style={{ ...smallSelect, marginBottom: '0.5rem' }}
            value={eventDraft}
            onChange={e => setEventDraft(e.target.value)}
          >
            <option value="">Select an event…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name} — {ev.date_display || ev.date}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => savePopupSetting(eventKey, eventDraft)}
            disabled={popupSaving[eventKey]}
            style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: popupSaving[eventKey] ? 'wait' : 'pointer', opacity: popupSaving[eventKey] ? 0.6 : 1 }}
          >
            {popupSaving[eventKey] ? 'Saving…' : 'Save'}
          </button>
          {events.length === 0 && (
            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.5rem' }}>No events yet.</div>
          )}
          {popupErrors[eventKey] && <Err msg={popupErrors[eventKey]} />}
          {popupSaved[eventKey] && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}
        </div>
      )}
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
  const confirm = useConfirm()
  // FLIP-style animation for reorder (move up/down): rowRefs tracks each row's
  // DOM node, reorderPrevTops snapshots their positions right before a reorder
  // so the layout effect below can animate from old position to new.
  const rowRefs = useRef({})
  const reorderPrevTops = useRef(null)
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
  const [showPopupCard, setShowPopupCard] = useState(false) // collapsed by default
  const [showAddForm, setShowAddForm] = useState(false) // collapsed by default
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

  // Homepage routes popup settings — card 1 (original) + optional card 2,
  // which runs alongside card 1 inside the same popup rather than as a
  // second separate one.
  const [events, setEvents] = useState([]) // for the "Specific event" picker
  const [popupSettings, setPopupSettings] = useState({})
  const [popupSlugDraft, setPopupSlugDraft] = useState('')
  const [popupEventDraft, setPopupEventDraft] = useState('')
  const [popup2SlugDraft, setPopup2SlugDraft] = useState('')
  const [popup2EventDraft, setPopup2EventDraft] = useState('')
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

  // Detail popup: lock the background from scrolling and close on Escape — on
  // the iOS home-screen app an unlocked body scrolls behind the modal.
  useEffect(() => {
    if (!person) return
    const onKey = e => { if (e.key === 'Escape') { setPerson(null); setPersonConfirm(false) } }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [person])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setPopupSettings(data)
        setPopupSlugDraft(data.routes_popup_route_slug || '')
        setPopupEventDraft(data.routes_popup_event_id || '')
        setPopup2SlugDraft(data.routes_popup2_route_slug || '')
        setPopup2EventDraft(data.routes_popup2_event_id || '')
      })
      .catch(() => {})
    fetch('/api/admin/events')
      .then(r => r.ok ? r.json() : [])
      .then(d => setEvents(Array.isArray(d) ? d : []))
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
        body: JSON.stringify({ ...form, activity_options: splitActs(form.activity_options), target_count: parseInt(form.target_count, 10) || 12, sort_order: form.sort_order === '' ? routes.length + 1 : parseInt(form.sort_order, 10), cars_rolled_out: form.cars_rolled_out === '' ? null : parseInt(form.cars_rolled_out, 10) }),
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

    // Snapshot current row positions so the layout effect can FLIP-animate
    // from here to wherever each row lands after the reorder.
    const tops = {}
    for (const rid in rowRefs.current) {
      const el = rowRefs.current[rid]
      if (el) tops[rid] = el.getBoundingClientRect().top
    }
    reorderPrevTops.current = tops

    setRoutes(withOrder) // optimistic
    try {
      await Promise.all(changed.map(r => fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: r.sort_order }),
      })))
    } catch { load() } // reload on failure to resync
  }

  // Plays the FLIP animation captured by move() above — runs after the
  // reordered list has painted in its new positions, translates each row back
  // to where it used to be with no transition, then animates to 0.
  useLayoutEffect(() => {
    const prev = reorderPrevTops.current
    if (!prev) return
    reorderPrevTops.current = null
    for (const rid in rowRefs.current) {
      const el = rowRefs.current[rid]
      if (!el || !(rid in prev)) continue
      const delta = prev[rid] - el.getBoundingClientRect().top
      if (!delta) continue
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.25s cubic-bezier(0.4,0,0.2,1)'
        el.style.transform = ''
      })
    }
  }, [routes])

  async function toggleActive(r) {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !r.is_active }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, ...data } : x))
      else alert(data.error || 'Failed to update.')
    } catch { alert('Network error.') } finally { setBusyId(null) }
  }

  // Gates the public hello-to-montebello-register form (and the equivalent
  // per-route registration pages as they're added) — separate from
  // is_active, which only controls whether the route's tile shows up in
  // listings at all, and independent from member registration below.
  async function toggleRegistrationOpen(r) {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_open: !(r.registration_open !== false) }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, ...data } : x))
      else alert(data.error || 'Failed to update.')
    } catch { alert('Network error.') } finally { setBusyId(null) }
  }

  // Gates the member-only hello-to-montebello-member-register form —
  // independent of toggleRegistrationOpen above, so the club can close
  // registration to the public while keeping it open to members (or vice
  // versa) once a route is close to full.
  async function toggleMemberRegistrationOpen(r) {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_registration_open: !(r.member_registration_open !== false) }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, ...data } : x))
      else alert(data.error || 'Failed to update.')
    } catch { alert('Network error.') } finally { setBusyId(null) }
  }

  // Visibility toggles — independent of is_active (the existing "Hide From
  // Site" master switch, which still wins over both) and independent of the
  // registration toggles above: a route can be listed but not registerable
  // yet ("coming soon"), or registerable via a direct link while unlisted.
  async function toggleVisibleToMembers(r) {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_members: !(r.visible_to_members !== false) }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, ...data } : x))
      else alert(data.error || 'Failed to update.')
    } catch { alert('Network error.') } finally { setBusyId(null) }
  }

  async function toggleVisibleToPublic(r) {
    setBusyId(r.id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_to_public: !(r.visible_to_public !== false) }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, ...data } : x))
      else alert(data.error || 'Failed to update.')
    } catch { alert('Network error.') } finally { setBusyId(null) }
  }

  async function del(id) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}`, { method: 'DELETE' })
      if (res.ok) { setRoutes(prev => prev.filter(r => r.id !== id)); setDeleteConfirm(null) }
      else { const data = await res.json().catch(() => ({})); alert(data.error || 'Failed to delete.') }
    } catch { alert('Network error.') } finally { setBusyId(null) }
  }

  async function launch(id) {
    const route = routes.find(r => r.id === id)
    if (!(await confirm({
      title: 'Launch this route?',
      message: 'This opens registration and emails every interested driver that the route is live. It can only be done once.',
      details: route ? <><strong>{route.name}</strong>{route.interested_count ? <> · {route.interested_count} interested driver{route.interested_count !== 1 ? 's' : ''}</> : null}</> : null,
      confirmLabel: 'Yes, launch',
    }))) return
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
        // Sending now happens after the response (see launch/route.js) so
        // this is a recipient count, not a confirmed-sent count — the emails
        // go out momentarily, any batch failures are reported to Sentry.
        alert(data.interestListError
          ? "Launched — couldn't load the interested-driver list, so no launch emails were sent. Check Sentry."
          : `Launched — emailing ${data.recipientCount || 0} interested driver(s).`)
      } else { alert(data.error || 'Launch failed.') }
    } catch { alert('Network error.') }
    finally { setLaunching(false) }
  }

  // Recovery path for when the interest-list fetch failed during the
  // original launch (interestListError above), or an admin just wants to
  // nudge stragglers who missed the first launch email.
  async function resendLaunchEmail(id) {
    const route = routes.find(r => r.id === id)
    if (!(await confirm({
      title: 'Resend the launch email?',
      message: 'This re-emails everyone on the interest list the same launch message.',
      details: route ? <><strong>{route.name}</strong>{route.interested_count ? <> · {route.interested_count} interested driver{route.interested_count !== 1 ? 's' : ''}</> : null}</> : null,
      confirmLabel: 'Yes, resend',
    }))) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}/launch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resend: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) alert(`Resending to ${data.recipientCount || 0} interested driver(s).`)
      else alert(data.error || 'Resend failed.')
    } catch { alert('Network error.') }
    finally { setBusyId(null) }
  }

  async function sendBroadcast(id) {
    if (!emailMsg.trim()) return
    const route = routes.find(r => r.id === id)
    if (!(await confirm({
      title: 'Send this update?',
      message: 'This emails every interested driver for this route. It cannot be undone.',
      details: <>{route ? <><strong>{route.name}</strong>{route.interested_count ? <> · {route.interested_count} recipient{route.interested_count !== 1 ? 's' : ''}</> : null}<br /></> : null}Subject: {emailSubject || '—'}</>,
      confirmLabel: 'Yes, send',
      danger: true,
    }))) return
    setEmailing(true)
    try {
      const res = await fetch(`/api/admin/upcoming-routes/${id}/broadcast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, message: emailMsg }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { setEmailFor(null); setEmailSubject(''); setEmailMsg(''); alert(`Sending to ${data.recipientCount || 0} interested driver(s).`) }
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
        .rta-wrap button, .rta-wrap a { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .rta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .rta-grid > div { min-width: 0; }
        @media (min-width: 640px) { .rta-grid-3 { grid-template-columns: 1fr 1fr 1fr; } }

        /* Interest-list rows used JS mouseenter/leave for the hover tint,
           which can get stuck "on" after a tap on touch devices — CSS-only
           hover guarded to real pointer devices avoids that. */
        .rta-interest-row:active { background: rgba(0,0,0,0.05); }
        @media (hover: hover) {
          .rta-interest-row:hover { background: rgba(0,0,0,0.03); }
        }

        /* iOS zooms the page in when a focused input's font-size is under 16px.
           These admin inputs are a dense 12px on desktop, so bump them to 16px
           on touch devices only — keeps the desktop density, kills the jarring
           zoom-and-reflow on the home-screen app. */
        @media (pointer: coarse) {
          .rta-wrap input, .rta-wrap select, .rta-wrap textarea { font-size: 16px; }
        }
      `}</style>

      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: 300, color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Routes</h1>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>Shown on <a href="/routes" target="_blank" rel="noreferrer" style={{ color: '#c5a882' }}>canvasroutes.com/routes</a>. {routes.length} route{routes.length !== 1 ? 's' : ''} · {totalInterest} total interested.</p>
      </div>

      {/* Homepage popup — collapsed by default, click the header to expand */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <button type="button" onClick={() => setShowPopupCard(p => !p)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '44px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0, marginBottom: showPopupCard ? '1rem' : 0 }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999' }}>Homepage Popup</span>
          <span style={{ fontSize: '10px', color: '#c5a882', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {showPopupCard ? 'Hide' : 'Show'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showPopupCard ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </button>

        {showPopupCard && (
        <>
        <PopupToggle
          label="Show Homepage Popup"
          description="The homepage popup nudging visitors toward the Routes page. Shown once per session, a couple seconds after the page loads."
          value={popupBoolVal('routes_popup_enabled', true)}
          saving={popupSaving.routes_popup_enabled}
          onChange={v => savePopupSetting('routes_popup_enabled', v ? 'true' : 'false')}
        />
        {popupErrors.routes_popup_enabled && <Err msg={popupErrors.routes_popup_enabled} />}
        {popupSaved.routes_popup_enabled && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}

        <div style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>Card 1</div>
          <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5, marginBottom: '0.75rem' }}>
            General promotes the whole season's routes. Specific route or specific event features one item by name — pick it below.
          </div>
          <PopupModeEditor
            prefix="routes_popup"
            routes={routes}
            events={events}
            popupStrVal={popupStrVal}
            savePopupSetting={savePopupSetting}
            popupSaving={popupSaving}
            popupErrors={popupErrors}
            popupSaved={popupSaved}
            slugDraft={popupSlugDraft}
            setSlugDraft={setPopupSlugDraft}
            eventDraft={popupEventDraft}
            setEventDraft={setPopupEventDraft}
          />
        </div>

        {/* Optional second card — runs alongside card 1 inside the SAME
            popup dialog, not a separate overlapping one. Off by default so
            a site that's never touched this renders exactly as before. */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <PopupToggle
            label="Add a Second Card"
            description="Shows a second route or event alongside Card 1, in the same popup — e.g. one route and one Cars & Coffee together. Off by default."
            value={popupBoolVal('routes_popup2_enabled', false)}
            saving={popupSaving.routes_popup2_enabled}
            onChange={v => savePopupSetting('routes_popup2_enabled', v ? 'true' : 'false')}
          />
          {popupErrors.routes_popup2_enabled && <Err msg={popupErrors.routes_popup2_enabled} />}
          {popupSaved.routes_popup2_enabled && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}

          {popupBoolVal('routes_popup2_enabled', false) && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>Card 2</div>
              <PopupModeEditor
                prefix="routes_popup2"
                routes={routes}
                events={events}
                popupStrVal={popupStrVal}
                savePopupSetting={savePopupSetting}
                popupSaving={popupSaving}
                popupErrors={popupErrors}
                popupSaved={popupSaved}
                slugDraft={popup2SlugDraft}
                setSlugDraft={setPopup2SlugDraft}
                eventDraft={popup2EventDraft}
                setEventDraft={setPopup2EventDraft}
              />
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Add form — collapsed by default, click the header to expand */}
      <form onSubmit={addRoute} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '2rem' }}>
        <button type="button" onClick={() => setShowAddForm(p => !p)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '44px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0, marginBottom: showAddForm ? '1rem' : 0 }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999' }}>+ Add Route</span>
          <span style={{ fontSize: '10px', color: '#c5a882', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            {showAddForm ? 'Hide' : 'Show'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAddForm ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </button>

        {showAddForm && (
        <>
        <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
          <Field label="Route name"><input style={smallInput} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Memoirs to Charlevoix" maxLength={120} /></Field>
          <Field label="Destination"><input style={smallInput} value={form.destination} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} placeholder="Charlevoix, QC" maxLength={120} /></Field>
        </div>
        <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
          <Field label="Month label"><input style={smallInput} value={form.month_label} onChange={e => setForm(p => ({ ...p, month_label: e.target.value }))} placeholder="July 2026" maxLength={40} /></Field>
          <Field label="Duration"><input style={smallInput} value={form.duration_label} onChange={e => setForm(p => ({ ...p, duration_label: e.target.value }))} placeholder="1 day" maxLength={40} /></Field>
          <Field label="Distance"><input style={smallInput} value={form.distance_label} onChange={e => setForm(p => ({ ...p, distance_label: e.target.value }))} placeholder="780 km (roundtrip)" maxLength={60} /></Field>
        </div>
        <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
          <Field label="Target (threshold)"><input style={smallInput} type="number" inputMode="numeric" min="1" value={form.target_count} onChange={e => setForm(p => ({ ...p, target_count: e.target.value }))} /></Field>
          <Field label="Sort order"><input style={smallInput} type="number" inputMode="numeric" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} placeholder={String(routes.length + 1)} /></Field>
          <Field label="Trip type"><TripSelect value={form.trip_type} onChange={e => setForm(p => ({ ...p, trip_type: e.target.value }))} /></Field>
        </div>
        <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
          <Field label="Avg. price range"><input style={smallInput} value={form.price_range} onChange={e => setForm(p => ({ ...p, price_range: e.target.value }))} placeholder="e.g. $800–$1,200 per car" maxLength={60} /></Field>
          <Field label="Price per car ($)"><input style={smallInput} type="number" inputMode="decimal" min="0" step="0.01" value={form.price_per_car} onChange={e => setForm(p => ({ ...p, price_per_car: e.target.value }))} placeholder="exact — set at launch" /></Field>
          <Field label="Max cars"><input style={smallInput} type="number" inputMode="numeric" min="1" value={form.max_cars} onChange={e => setForm(p => ({ ...p, max_cars: e.target.value }))} placeholder="optional" /></Field>
        </div>
        <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
          <Field label="Destination latitude"><input style={smallInput} type="number" inputMode="decimal" step="any" value={form.dest_lat} onChange={e => setForm(p => ({ ...p, dest_lat: e.target.value }))} placeholder="e.g. 47.4412 — plots the map" /></Field>
          <Field label="Destination longitude"><input style={smallInput} type="number" inputMode="decimal" step="any" value={form.dest_lng} onChange={e => setForm(p => ({ ...p, dest_lng: e.target.value }))} placeholder="e.g. -70.5052" /></Field>
        </div>
        <div style={{ marginBottom: '0.6rem' }}>
          <L>Itinerary (optional — shown on the card, expandable)</L>
          <textarea style={{ ...smallTextarea, height: '65px' }} value={form.itinerary} onChange={e => setForm(p => ({ ...p, itinerary: e.target.value }))} maxLength={2000} placeholder="Stops, timing, route notes…" />
        </div>
        <div style={{ marginBottom: '0.6rem' }}>
          <L>Activity options (comma-separated — asked on the interest form)</L>
          <input style={smallInput} value={form.activity_options} onChange={e => setForm(p => ({ ...p, activity_options: e.target.value }))} placeholder="Scenic drives, Whale watching, Local food…" maxLength={500} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <L>Description</L>
          <textarea style={{ ...smallTextarea, height: '55px' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={600} placeholder="Short evocative description shown on the card." />
        </div>
        <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
          <Field label="Photo URL (hero image — shown on the route's tile and in the homepage popup)"><input style={smallInput} value={form.photo_url} onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))} placeholder="/montebello-hero.jpg" /></Field>
          <Field label="Registration link (once launched — points the tile to the public registration page)"><input style={smallInput} value={form.registration_url} onChange={e => setForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="/hello-to-montebello" /></Field>
        </div>
        <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', marginBottom: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: '#555', marginBottom: '0.6rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_past} onChange={e => setForm(p => ({ ...p, is_past: e.target.checked }))} />
            This route already ran — show it in Past Routes instead of the active list
          </label>
          {form.is_past && (
            <div className="rta-grid rta-grid-3">
              <Field label="Cars rolled out"><input style={smallInput} type="number" inputMode="numeric" min="0" value={form.cars_rolled_out} onChange={e => setForm(p => ({ ...p, cars_rolled_out: e.target.value }))} placeholder="e.g. 22" /></Field>
              <Field label="Recap link"><input style={smallInput} value={form.recap_href} onChange={e => setForm(p => ({ ...p, recap_href: e.target.value }))} placeholder="/wtet" /></Field>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <PrimaryBtn disabled={adding} onClick={addRoute}>{adding ? 'Adding…' : 'Add Route'}</PrimaryBtn>
          {formErr && <Err msg={formErr} />}
        </div>
        </>
        )}
      </form>

      {/* List */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : routes.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No routes yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {routes.map((r, i) => {
            const pct = r.target_count > 0 ? Math.min(100, Math.round((r.interested_count / r.target_count) * 100)) : 0
            const isEditing = editId === r.id
            const isOpen = !!expanded[r.id]
            return (
              <div key={r.id} ref={el => { rowRefs.current[r.id] = el }} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.1rem 1.25rem', opacity: r.is_active ? 1 : 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '19px', color: '#1a1a1a' }}>{r.name}</span>
                      {TRIP_TAG[r.trip_type] && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a6535', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 7px', borderRadius: '99px' }}>{TRIP_TAG[r.trip_type]}</span>}
                      {r.is_past && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.35)', padding: '2px 7px', borderRadius: '99px' }}>Past</span>}
                      {r.launched && !r.is_past && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.35)', padding: '2px 7px', borderRadius: '99px' }}>Launched</span>}
                      {!r.is_active && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', border: '0.5px solid rgba(0,0,0,0.15)', padding: '2px 7px', borderRadius: '99px' }}>Hidden</span>}
                      {/* The "registration closed" states aren't chips here — the
                          Members/Public toggle row below shows and controls them,
                          so duplicating them as red chips just crowded the header. */}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{r.destination} · {r.month_label} · {r.duration_label || '—'} · {r.distance_label || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r.is_past ? (
                      <>
                        <div style={{ fontSize: '15px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{r.cars_rolled_out ?? '—'} / {r.target_count}</div>
                        <div style={{ fontSize: '10px', color: '#bbb' }}>cars rolled out</div>
                      </>
                    ) : r.launched ? (
                      // Confirmed (paid) registrations against the car cap, if one
                      // is set — the pre-launch interest/target count stops
                      // meaning anything once real registrations start.
                      (() => {
                        const atCapacity = !!r.max_cars && r.registered_count >= r.max_cars
                        return (
                          <>
                            <div style={{ fontSize: '15px', color: atCapacity ? '#93333E' : '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
                              {r.registered_count}{r.max_cars ? ` / ${r.max_cars}` : ''}
                            </div>
                            <div style={{ fontSize: '10px', color: atCapacity ? '#93333E' : '#bbb' }}>{atCapacity ? 'FULL' : 'registered & paid'}</div>
                          </>
                        )
                      })()
                    ) : (
                      <>
                        <div style={{ fontSize: '15px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{r.interested_count} / {r.target_count}</div>
                        <div style={{ fontSize: '10px', color: '#bbb' }}>{pct}% to launch</div>
                      </>
                    )}
                  </div>
                </div>

                {/* progress — only meaningful pre-launch */}
                {!r.is_past && !r.launched && (
                  <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden', margin: '0.75rem 0' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#3B6B2F' : 'linear-gradient(90deg,#c5a882,#e8c99a)' }} />
                  </div>
                )}

                {/* actions — only what's used most (Edit, Check-in, Launch) stays
                    visible; everything else (reorder, interested list, visibility,
                    email, export, delete) lives in the "•••" menu */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <GhostBtn small onClick={() => (isEditing ? setEditId(null) : startEdit(r))}>{isEditing ? 'Close' : 'Edit'}</GhostBtn>
                  {(r.slug === WTET_SLUG || r.event_id) && (
                    <GhostBtn small onClick={() => setShowEventPanel(p => ({ ...p, [r.id]: !p[r.id] }))}>
                      {showEventPanel[r.id] ? 'Hide Check-in & Awards' : 'Check-in & Awards'}
                    </GhostBtn>
                  )}
                  {!r.launched && !r.is_past && <PrimaryBtn small onClick={() => { setLaunchFor(r.id); setLaunchMsg('') }}>Launch</PrimaryBtn>}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {deleteConfirm === r.id && (
                      <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#93333E' }}>Delete this route?</span>
                        <DangerBtn small onClick={() => del(r.id)} disabled={busyId === r.id}>Yes</DangerBtn>
                        <GhostBtn small onClick={() => setDeleteConfirm(null)}>No</GhostBtn>
                      </span>
                    )}
                    <KebabMenu items={[
                      { label: 'Move Up',   onClick: () => move(r.id, 'up'),   disabled: i === 0 },
                      { label: 'Move Down', onClick: () => move(r.id, 'down'), disabled: i === routes.length - 1 },
                      { label: isOpen ? 'Hide Interested List' : `Interested (${r.interested_count})`, onClick: () => setExpanded(p => ({ ...p, [r.id]: !p[r.id] })) },
                      { label: r.is_active ? 'Hide From Site' : 'Show On Site', onClick: () => toggleActive(r), disabled: busyId === r.id },
                      { label: 'Email Interested', onClick: () => { setEmailFor(emailFor === r.id ? null : r.id); setEmailSubject(''); setEmailMsg('') }, disabled: r.interested_count === 0 },
                      { label: 'Export CSV', onClick: () => exportRouteCSV(r), disabled: r.interested_count === 0 },
                      r.launched ? { label: 'Resend Launch Email', onClick: () => resendLaunchEmail(r.id), disabled: r.interested_count === 0 || busyId === r.id } : null,
                      { label: 'Delete Route', onClick: () => setDeleteConfirm(r.id), danger: true },
                    ]} />
                  </div>
                </div>

                {/* Visibility toggles — independent of is_active (the "Hide
                    From Site" kebab action, which still wins over both) and
                    of the registration toggles below: a route can be listed
                    but not yet registerable, or registerable via a direct
                    link while unlisted from the main grids. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>Visible</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ToggleSwitch
                      checked={r.visible_to_members !== false}
                      onChange={() => toggleVisibleToMembers(r)}
                      disabled={busyId === r.id}
                      label="Visible to members"
                    />
                    <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: r.visible_to_members !== false ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>
                      Members
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ToggleSwitch
                      checked={r.visible_to_public !== false}
                      onChange={() => toggleVisibleToPublic(r)}
                      disabled={busyId === r.id}
                      label="Visible to public"
                    />
                    <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: r.visible_to_public !== false ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>
                      Public
                    </span>
                  </div>
                </div>

                {/* Registration toggles — same pattern as Admin > Events.
                    Gated on registration_url (a real registration page
                    exists to control), not `launched` — a route can have its
                    page built and want registration opened/closed pre-launch
                    (e.g. for testing, or a soft/unannounced open) before the
                    formal Launch action ever fires. */}
                {r.registration_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>Registration</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ToggleSwitch
                        checked={r.member_registration_open !== false}
                        onChange={() => toggleMemberRegistrationOpen(r)}
                        disabled={busyId === r.id}
                        label="Member registration"
                      />
                      <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: r.member_registration_open !== false ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>
                        Members
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ToggleSwitch
                        checked={r.registration_open !== false}
                        onChange={() => toggleRegistrationOpen(r)}
                        disabled={busyId === r.id}
                        label="Public registration"
                      />
                      <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: r.registration_open !== false ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>
                        Public
                      </span>
                    </div>
                  </div>
                )}

                {/* Launch composer */}
                {launchFor === r.id && (
                  <div style={{ marginTop: '0.85rem', padding: '0.85rem', background: 'rgba(197,168,130,0.06)', border: '0.5px solid rgba(197,168,130,0.3)', borderRadius: '8px' }}>
                    <L>Launch message (optional — included in the email to all {r.interested_count} interested)</L>
                    <textarea style={{ ...smallTextarea, height: '65px' }} value={launchMsg} onChange={e => setLaunchMsg(e.target.value)} placeholder="Meeting point, timing, per-car fee, convoy rules…" maxLength={1500} />
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
                    <input style={{ ...smallInput, marginBottom: '0.5rem' }} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder={`Subject (default: Update — ${r.name})`} maxLength={140} />
                    <textarea style={{ ...smallTextarea, height: '75px' }} value={emailMsg} onChange={e => setEmailMsg(e.target.value)} placeholder="Your message to everyone interested in this route…" maxLength={3000} />
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
                      <Field label="Route name"><input style={smallInput} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></Field>
                      <Field label="Destination"><input style={smallInput} value={editForm.destination} onChange={e => setEditForm(p => ({ ...p, destination: e.target.value }))} /></Field>
                    </div>
                    <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Month label"><input style={smallInput} value={editForm.month_label} onChange={e => setEditForm(p => ({ ...p, month_label: e.target.value }))} /></Field>
                      <Field label="Duration"><input style={smallInput} value={editForm.duration_label} onChange={e => setEditForm(p => ({ ...p, duration_label: e.target.value }))} /></Field>
                      <Field label="Distance"><input style={smallInput} value={editForm.distance_label} onChange={e => setEditForm(p => ({ ...p, distance_label: e.target.value }))} /></Field>
                    </div>
                    <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Target"><input style={smallInput} type="number" inputMode="numeric" min="1" value={editForm.target_count} onChange={e => setEditForm(p => ({ ...p, target_count: e.target.value }))} /></Field>
                      <Field label="Sort order"><input style={smallInput} type="number" inputMode="numeric" value={editForm.sort_order} onChange={e => setEditForm(p => ({ ...p, sort_order: e.target.value }))} /></Field>
                      <Field label="Trip type"><TripSelect value={editForm.trip_type} onChange={e => setEditForm(p => ({ ...p, trip_type: e.target.value }))} /></Field>
                    </div>
                    <div className="rta-grid rta-grid-3" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Avg. price range"><input style={smallInput} value={editForm.price_range} onChange={e => setEditForm(p => ({ ...p, price_range: e.target.value }))} placeholder="e.g. $800–$1,200 per car" maxLength={60} /></Field>
                      <Field label="Price per car ($)"><input style={smallInput} type="number" inputMode="decimal" min="0" step="0.01" value={editForm.price_per_car} onChange={e => setEditForm(p => ({ ...p, price_per_car: e.target.value }))} placeholder="optional" /></Field>
                      <Field label="Max cars"><input style={smallInput} type="number" inputMode="numeric" min="1" value={editForm.max_cars} onChange={e => setEditForm(p => ({ ...p, max_cars: e.target.value }))} placeholder="optional" /></Field>
                    </div>
                    <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Destination latitude"><input style={smallInput} type="number" inputMode="decimal" step="any" value={editForm.dest_lat} onChange={e => setEditForm(p => ({ ...p, dest_lat: e.target.value }))} placeholder="e.g. 47.4412" /></Field>
                      <Field label="Destination longitude"><input style={smallInput} type="number" inputMode="decimal" step="any" value={editForm.dest_lng} onChange={e => setEditForm(p => ({ ...p, dest_lng: e.target.value }))} placeholder="e.g. -70.5052" /></Field>
                    </div>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <L>Itinerary</L>
                      <textarea style={{ ...smallTextarea, height: '65px' }} value={editForm.itinerary} onChange={e => setEditForm(p => ({ ...p, itinerary: e.target.value }))} maxLength={2000} placeholder="Stops, timing, route notes…" />
                    </div>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <L>Activity options (comma-separated)</L>
                      <input style={smallInput} value={editForm.activity_options} onChange={e => setEditForm(p => ({ ...p, activity_options: e.target.value }))} placeholder="Scenic drives, Whale watching, Local food…" maxLength={500} />
                    </div>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <L>Description</L>
                      <textarea style={{ ...smallTextarea, height: '55px' }} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} maxLength={600} />
                    </div>
                    <div className="rta-grid" style={{ marginBottom: '0.6rem' }}>
                      <Field label="Photo URL (hero image — shown on the route's tile and in the homepage popup)"><input style={smallInput} value={editForm.photo_url} onChange={e => setEditForm(p => ({ ...p, photo_url: e.target.value }))} placeholder="/montebello-hero.jpg" /></Field>
                      <Field label="Registration link (once launched — points the tile to the public registration page)"><input style={smallInput} value={editForm.registration_url} onChange={e => setEditForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="/hello-to-montebello" /></Field>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', marginBottom: '0.6rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: '#555', marginBottom: '0.6rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editForm.is_past} onChange={e => setEditForm(p => ({ ...p, is_past: e.target.checked }))} />
                        This route already ran — show it in Past Routes instead of the active list
                      </label>
                      {editForm.is_past && (
                        <div className="rta-grid rta-grid-3">
                          <Field label="Cars rolled out"><input style={smallInput} type="number" inputMode="numeric" min="0" value={editForm.cars_rolled_out} onChange={e => setEditForm(p => ({ ...p, cars_rolled_out: e.target.value }))} placeholder="e.g. 22" /></Field>
                          <Field label="Recap link"><input style={smallInput} value={editForm.recap_href} onChange={e => setEditForm(p => ({ ...p, recap_href: e.target.value }))} placeholder="/wtet" /></Field>
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
                          <div key={p.id || i} role="button" tabIndex={0} className="rta-interest-row"
                            onClick={() => { setPerson({ route: r, p }); setPersonConfirm(false) }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPerson({ route: r, p }); setPersonConfirm(false) } }}
                            style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', width: '100%', minHeight: '44px', padding: '0.5rem 0.6rem', margin: '0 -0.6rem', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: '13px', color: '#333' }}>{p.name || '—'}</span>
                              <span style={{ fontSize: '12px', color: '#888', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>{p.email}<CopyBtn value={p.email} /></span>
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
                          </div>
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
          ['Email', <span key="e" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}><a href={`mailto:${p.email}`} style={{ color: '#8A6535', textDecoration: 'none' }}>{p.email}</a><CopyBtn value={p.email} /></span>],
          ['Phone', p.phone ? <span key="t" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}><a href={`tel:${p.phone}`} style={{ color: '#8A6535', textDecoration: 'none' }}>{p.phone}</a><CopyBtn value={p.phone} /></span> : '—'],
          ['Car', p.car || '—'],
          ['Status', p.is_member ? 'Member' : (p.membership_optin ? 'Public · interested in membership' : 'Public')],
          ['Budget', prefs.budget || '—'],
          ['Preferred dates', prefs.dates || '—'],
          ['Hotel', prefs.hotel || '—'],
          ['Activities', prefs.activities?.length ? prefs.activities.join(', ') : '—'],
          ['Notes', prefs.notes || '—'],
          ['Registered', p.created_at ? new Date(p.created_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: MONTREAL_TZ }) : '—'],
        ]
        return (
          <div onClick={() => setPerson(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,30,20,0.55)', WebkitBackdropFilter: 'blur(3px)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(env(safe-area-inset-top),16px) 16px max(env(safe-area-inset-bottom),16px)' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', width: '100%', maxWidth: '440px', maxHeight: '86dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '1.4rem 1.5rem 1.25rem' }}>
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
