'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import {
  EVENT_TYPES, MEMBER_ATTENDANCE_KEYS, normalizeEventName,
  parseCarMakeModel,
  inp, L, SelectWrap, PrimaryBtn, GhostBtn, DangerBtn, Err, ToggleSwitch,
} from '../_components/shared'

// ── RSVP helpers (previously in EventApplicationsClient) ──────────────────────

function StatusChip({ rsvp }) {
  if (!rsvp) return <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.06em' }}>—</span>
  if (rsvp.declined_at) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B2032', border: '0.5px solid rgba(123,32,50,0.35)', padding: '2px 8px', background: 'rgba(123,32,50,0.05)', whiteSpace: 'nowrap' }}>Declined</span>
  )
  if (rsvp.confirmed_at) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.35)', padding: '2px 8px', background: 'rgba(59,107,47,0.07)', whiteSpace: 'nowrap' }}>✓ Confirmed</span>
  )
  const expired = new Date(rsvp.expires_at) <= new Date()
  if (expired) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', border: '0.5px solid rgba(0,0,0,0.12)', padding: '2px 8px', whiteSpace: 'nowrap' }}>Expired</span>
  )
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.4)', padding: '2px 8px', background: 'rgba(197,168,130,0.07)', whiteSpace: 'nowrap' }}>Awaiting RSVP</span>
  )
}

function RsvpAnswers({ answers }) {
  if (!answers) return null
  const ARRIVAL = { opening: 'Arrives at opening', first_hour: 'Arrives within first hour', later: 'Arrives later' }
  const chips = [
    answers.dietary && answers.dietary,
    answers.whatsapp != null && `WhatsApp: ${answers.whatsapp ? 'Yes' : 'No'}`,
    answers.passengers != null && (answers.passengers <= 1 ? 'Solo' : `${answers.passengers} people`),
    answers.bringing_guest != null && (answers.bringing_guest ? 'Bringing a guest' : 'No guest'),
    answers.car_paint && answers.car_paint,
    answers.car_mods  && `Mods: ${answers.car_mods}`,
    answers.arrival   && (ARRIVAL[answers.arrival] || answers.arrival),
  ].filter(Boolean)
  if (!chips.length) return null
  return (
    <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {chips.map((c, i) => (
        <span key={i} style={{ fontSize: '10px', color: '#666', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', border: '0.5px solid rgba(0,0,0,0.1)' }}>{c}</span>
      ))}
    </div>
  )
}

function InviteActions({ app, ev, keyStr, inviting, inviteErr, inviteDone, sendInvite, declining, declineErr, onDecline, onUndecline }) {
  if (app.rsvp?.confirmed_at) {
    return <span style={{ fontSize: '10px', color: '#3B6B2F', letterSpacing: '0.06em' }}>✓ Confirmed</span>
  }
  const busy = inviting[keyStr] || declining?.[keyStr]
  const isDeclined = !!app.rsvp?.declined_at
  const isInvited = !!app.rsvp && !isDeclined
  if (isDeclined) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <GhostBtn small onClick={() => onUndecline(app.id, ev.name)} disabled={busy}>{busy ? '…' : 'Undo Decline'}</GhostBtn>
      {declineErr?.[keyStr] && <div style={{ fontSize: '10px', color: '#7B2032' }}>{declineErr[keyStr]}</div>}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <GhostBtn small onClick={() => sendInvite(app, ev)} disabled={busy}>
          {busy ? '…' : isInvited ? 'Re-invite' : 'Approve'}
        </GhostBtn>
        <DangerBtn small onClick={() => onDecline(app.id, ev.name)} disabled={busy}>Decline</DangerBtn>
      </div>
      {inviteErr[keyStr] && <div style={{ fontSize: '10px', color: '#7B2032' }}>{inviteErr[keyStr]}</div>}
      {inviteDone[keyStr] && !inviteErr[keyStr] && <div style={{ fontSize: '10px', color: '#3B6B2F' }}>Approved — invite sent.</div>}
      {declineErr?.[keyStr] && <div style={{ fontSize: '10px', color: '#7B2032' }}>{declineErr[keyStr]}</div>}
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: active === t.id ? '#1a1a1a' : '#aaa',
            fontFamily: 'var(--font-inter),sans-serif',
            borderBottom: active === t.id ? '2px solid #1a1a1a' : '2px solid transparent',
            marginBottom: '-0.5px', transition: 'color 0.15s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EventsClient() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Create form
  const EMPTY_FORM = { name: '', date: '', date_display: '', location: '', description: '', type: 'Road Trip', registration_url: '', registration_opens_at: '', registration_closes_at: '', capacity: '', member_price: '', priority_window_end: '' }
  const [form, setForm] = useState(EMPTY_FORM)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)

  // Edit form
  const [editing, setEditing] = useState(null)   // event id currently being edited
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [activeTab, setActiveTab] = useState({})  // { [eventId]: 'settings' | 'applications' }

  // Photo
  const [uploadingPhoto, setUploadingPhoto] = useState(null)
  const [photoError, setPhotoError] = useState(null)

  // Registration toggle
  const [regToggleError, setRegToggleError] = useState({})
  const [regToggling, setRegToggling] = useState({})

  // Reorder
  const [moving, setMoving] = useState(false)

  // Delete
  const [deleteEventConfirm, setDeleteEventConfirm] = useState(null)
  const [deleteEventError, setDeleteEventError] = useState({})

  // Registrants (members who paid)
  const [showRegistrants, setShowRegistrants] = useState(null)
  const [registrantsData, setRegistrantsData] = useState({})
  const [loadingRegistrants, setLoadingRegistrants] = useState(false)

  // Bulk email registrants compose
  const [regEmailOpen, setRegEmailOpen] = useState({})
  const [regEmailSubject, setRegEmailSubject] = useState({})
  const [regEmailBody, setRegEmailBody] = useState({})
  const [sendingRegEmail, setSendingRegEmail] = useState({})
  const [regEmailResult, setRegEmailResult] = useState({})

  // Individual registrant email compose (key = `${eventId}::${email}`)
  const [indivEmailOpen, setIndivEmailOpen] = useState(null)
  const [indivEmailSubject, setIndivEmailSubject] = useState('')
  const [indivEmailBody, setIndivEmailBody] = useState('')
  const [sendingIndivEmail, setSendingIndivEmail] = useState(false)
  const [indivEmailResult, setIndivEmailResult] = useState(null)

  // Manual add registrant
  const [addRegOpen, setAddRegOpen] = useState({})
  const [addRegName, setAddRegName] = useState({})
  const [addRegEmail, setAddRegEmail] = useState({})
  const [addingReg, setAddingReg] = useState({})
  const [addRegErr, setAddRegErr] = useState({})
  const [addRegSearch, setAddRegSearch] = useState({})
  const [addRegShowDrop, setAddRegShowDrop] = useState({})
  const [allContacts, setAllContacts] = useState([])
  const [contactsLoaded, setContactsLoaded] = useState(false)

  // Invite actions
  const [inviting, setInviting] = useState({})
  const [inviteErr, setInviteErr] = useState({})
  const [inviteDone, setInviteDone] = useState({})

  // Decline actions
  const [declining, setDeclining] = useState({})
  const [declineErr, setDeclineErr] = useState({})

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load both APIs in parallel and merge by event ID
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evRes, appRes] = await Promise.all([
        fetch('/api/admin/events'),
        fetch('/api/admin/event-applications'),
      ])
      const evData  = evRes.ok  ? await evRes.json().catch(() => [])  : []
      const appData = appRes.ok ? await appRes.json().catch(() => []) : []

      const appMap = new Map((Array.isArray(appData) ? appData : []).map(ev => [ev.id, ev]))
      const merged = (Array.isArray(evData) ? evData : []).map(ev => {
        const a = appMap.get(ev.id) || {}
        return {
          confirmed_count:    a.confirmed_count    || 0,
          invited_count:      a.invited_count      || 0,
          total_applications: a.total_applications || 0,
          applications:       a.applications       || [],
          ...ev,
        }
      })
      setItems(merged)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useRealtimeSync(['events', 'rsvp_tokens', 'applications'], load)

  // ── Actions ────────────────────────────────────────────────────────────────

  async function post(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.date.trim()) { setPostError('Name and date required.'); return }
    setPosting(true); setPostError(null)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPostError(data.error || 'Failed.'); return }
      setForm(EMPTY_FORM)
      load()
    } catch { setPostError('Network error. Please try again.') }
    finally { setPosting(false) }
  }

  function openEdit(item) {
    setEditing(item.id)
    setEditForm({
      name: item.name, date: item.date, date_display: item.date_display || '',
      location: item.location || '', description: item.description || '',
      type: item.type, registration_url: item.registration_url || '',
      registration_opens_at: item.registration_opens_at || '',
      registration_closes_at: item.registration_closes_at || '',
      capacity: item.capacity || '', member_price: item.member_price || null,
      priority_window_end: item.priority_window_end || '',
      registration_enabled: item.registration_enabled,
    })
    setSaveError(null)
    setActiveTab(p => ({ ...p, [item.id]: p[item.id] || 'settings' }))
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    try {
      const res = await fetch(`/api/admin/events/${editing}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveError(d.error || 'Failed to save.'); return }
      setRegistrantsData(prev => { const next = { ...prev }; delete next[editing]; return next })
      setEditing(null)
      load()
    } catch { setSaveError('Network error. Please try again.') }
    finally { setSaving(false) }
  }

  async function moveEvent(id, direction) {
    if (moving) return
    const idx = items.findIndex(ev => ev.id === id)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= items.length) return
    const newItems = [...items]
    const a = { ...newItems[idx] }
    const b = { ...newItems[targetIdx] }
    const aOrder = a.sort_order ?? (idx + 1) * 10
    const bOrder = b.sort_order ?? (targetIdx + 1) * 10
    a.sort_order = bOrder; b.sort_order = aOrder
    newItems[idx] = b; newItems[targetIdx] = a
    setItems(newItems)
    setMoving(true)
    try {
      await Promise.all([
        fetch(`/api/admin/events/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: a.sort_order }) }),
        fetch(`/api/admin/events/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: b.sort_order }) }),
      ])
    } catch {
      setItems(prev => {
        const reverted = [...prev]
        const ri = reverted.findIndex(ev => ev.id === a.id)
        const rj = reverted.findIndex(ev => ev.id === b.id)
        if (ri >= 0) reverted[ri] = { ...a, sort_order: aOrder }
        if (rj >= 0) reverted[rj] = { ...b, sort_order: bOrder }
        return reverted
      })
    } finally {
      setMoving(false)
    }
  }

  async function uploadPhoto(eventId, file) {
    setUploadingPhoto(eventId); setPhotoError(null)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const res = await fetch(`/api/admin/events/${eventId}/photo`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPhotoError(data.error || 'Upload failed.'); return }
      setItems(prev => prev.map(ev => ev.id === eventId ? { ...ev, photo_url: data.url } : ev))
    } catch { setPhotoError('Network error — upload failed.') }
    finally { setUploadingPhoto(null) }
  }

  async function removePhoto(eventId) {
    setUploadingPhoto(eventId)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/photo`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.map(ev => ev.id === eventId ? { ...ev, photo_url: null } : ev))
      else setPhotoError('Could not remove photo.')
    } catch { setPhotoError('Network error — could not remove photo.') }
    finally { setUploadingPhoto(null) }
  }

  async function setRegEnabled(id, value) {
    setRegToggleError(p => ({ ...p, [id]: null }))
    setRegToggling(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_enabled: value }),
      })
      if (res.ok) {
        setItems(prev => prev.map(ev => ev.id === id ? { ...ev, registration_enabled: value } : ev))
      } else {
        const d = await res.json().catch(() => ({}))
        setRegToggleError(p => ({ ...p, [id]: d.error || 'Could not update registration.' }))
      }
    } catch { setRegToggleError(p => ({ ...p, [id]: 'Network error.' })) }
    finally { setRegToggling(p => ({ ...p, [id]: false })) }
  }

  async function del(id) {
    setDeleteEventError(p => ({ ...p, [id]: null }))
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    if (!res.ok) { setDeleteEventError(p => ({ ...p, [id]: 'Failed to delete event.' })); return }
    setDeleteEventConfirm(null)
    load()
  }

  async function ensureContactsLoaded() {
    if (contactsLoaded) return
    try {
      const res = await fetch('/api/admin/contacts')
      if (res.ok) {
        const data = await res.json()
        setAllContacts((Array.isArray(data) ? data : []).map(c => ({ name: c.name || '', email: c.email || '' })).filter(c => c.email))
        setContactsLoaded(true)
      }
    } catch {}
  }

  async function addRegistrant(eventId) {
    const name = (addRegName[eventId] || '').trim()
    const email = (addRegEmail[eventId] || '').trim()
    if (!name || !email) return
    setAddingReg(p => ({ ...p, [eventId]: true }))
    setAddRegErr(p => ({ ...p, [eventId]: null }))
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setAddRegErr(p => ({ ...p, [eventId]: d.error || 'Failed.' })); return }
      setAddRegName(p => ({ ...p, [eventId]: '' }))
      setAddRegEmail(p => ({ ...p, [eventId]: '' }))
      setAddRegOpen(p => ({ ...p, [eventId]: false }))
      // Bust cache and reload registrants
      setRegistrantsData(prev => { const n = { ...prev }; delete n[eventId]; return n })
      const item = items.find(i => i.id === eventId)
      if (item) toggleRegistrants(eventId, item.name)
    } catch {
      setAddRegErr(p => ({ ...p, [eventId]: 'Network error.' }))
    } finally {
      setAddingReg(p => ({ ...p, [eventId]: false }))
    }
  }

  function openIndivEmail(eventId, r) {
    const key = `${eventId}::${r.email}`
    setIndivEmailOpen(prev => prev === key ? null : key)
    setIndivEmailResult(null)
    setIndivEmailSubject('')
    setIndivEmailBody('')
  }

  async function sendEmailToRegistrant(r) {
    if (!r.email || r.email === '—') return
    const subject = indivEmailSubject.trim()
    const body = indivEmailBody.trim()
    if (!subject || !body) return
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;max-width:600px;">' +
      body.split('\n').map(l => l.trim()
        ? `<p style="margin:0 0 14px;">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
        : ''
      ).join('') +
      '<!-- UNSUBSCRIBE_FOOTER --></div>'
    setSendingIndivEmail(true)
    setIndivEmailResult(null)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html, body_html: body, audience: 'specific_emails', specificEmails: [r.email] }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setIndivEmailResult({ error: d.error || 'Send failed.' }); return }
      setIndivEmailResult({ sent: true, name: r.name || r.email })
      setIndivEmailOpen(null)
    } catch {
      setIndivEmailResult({ error: 'Network error.' })
    } finally {
      setSendingIndivEmail(false)
    }
  }

  async function sendEmailToRegistrants(eventId) {
    const registrants = registrantsData[eventId] || []
    const emails = [...new Set(registrants.map(r => r.email).filter(e => e && e !== '—'))]
    if (!emails.length) return
    const subject = (regEmailSubject[eventId] || '').trim()
    const body = (regEmailBody[eventId] || '').trim()
    if (!subject || !body) return
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;max-width:600px;">' +
      body.split('\n').map(l => l.trim()
        ? `<p style="margin:0 0 14px;">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
        : ''
      ).join('') +
      '<!-- UNSUBSCRIBE_FOOTER --></div>'
    setSendingRegEmail(p => ({ ...p, [eventId]: true }))
    setRegEmailResult(p => ({ ...p, [eventId]: null }))
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html, body_html: body, audience: 'specific_emails', specificEmails: emails }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setRegEmailResult(p => ({ ...p, [eventId]: { error: d.error || 'Send failed.' } })); return }
      setRegEmailResult(p => ({ ...p, [eventId]: { sent: d.sent, failed: d.failed } }))
      setRegEmailSubject(p => ({ ...p, [eventId]: '' }))
      setRegEmailBody(p => ({ ...p, [eventId]: '' }))
      setRegEmailOpen(p => ({ ...p, [eventId]: false }))
    } catch {
      setRegEmailResult(p => ({ ...p, [eventId]: { error: 'Network error.' } }))
    } finally {
      setSendingRegEmail(p => ({ ...p, [eventId]: false }))
    }
  }

  async function declineApplication(appId, eventName) {
    const key = `${appId}-${eventName}`
    setDeclining(p => ({ ...p, [key]: true }))
    setDeclineErr(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/event-applications/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, eventName }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setDeclineErr(p => ({ ...p, [key]: d.error || 'Failed.' })); return }
      load()
    } catch {
      setDeclineErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setDeclining(p => ({ ...p, [key]: false }))
    }
  }

  async function undeclineApplication(appId, eventName) {
    const key = `${appId}-${eventName}`
    setDeclining(p => ({ ...p, [key]: true }))
    setDeclineErr(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/event-applications/decline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, eventName }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setDeclineErr(p => ({ ...p, [key]: d.error || 'Failed.' })); return }
      load()
    } catch {
      setDeclineErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setDeclining(p => ({ ...p, [key]: false }))
    }
  }

  async function toggleRegistrants(eventId, eventName) {
    if (showRegistrants === eventId) { setShowRegistrants(null); return }
    setShowRegistrants(eventId)
    if (registrantsData[eventId]) return
    setLoadingRegistrants(true)
    try {
      const [regRes, cRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/registrants`),
        fetch('/api/admin/contacts'),
      ])
      const regData  = regRes.ok ? await regRes.json() : []
      const contacts = cRes.ok  ? await cRes.json()   : []
      const newRegs = (Array.isArray(regData) ? regData : []).map(r => ({
        name: r.members?.name || r.name || '—', email: r.members?.email || r.email || '—',
        type: 'Member', status: r.stripe_payment_status, amount: r.amount_paid,
      }))
      const contactRegs = (Array.isArray(contacts) ? contacts : [])
        .filter(c => (c.registrations || []).some(r => {
          const norm = normalizeEventName(r.event)
          if (norm === eventName) return true
          // Strip trailing date (everything after " — " or " – ") so stored names like
          // "Cars, Coffee & Dad Jokes — June 20, 2026" match event table name "Cars, Coffee & Dad Jokes"
          const base = s => s.split(/\s[—–]\s/)[0].trim()
          return base(norm) === base(eventName)
        }))
        .map(c => {
          // Find the specific registration entry for this event to surface its registered_at
          const base = s => normalizeEventName(s).split(/\s[—–]\s/)[0].trim()
          const reg = (c.registrations || []).find(r => base(r.event) === base(eventName))
          return { name: c.name || '—', email: c.email || '—', type: 'Public', status: 'registered', registeredAt: reg?.registered_at || null }
        })
      const seen = new Set()
      const combined = [...newRegs, ...contactRegs].filter(r => {
        const k = (r.email || r.name || '').toLowerCase()
        if (seen.has(k)) return false
        seen.add(k); return true
      })
      setRegistrantsData(prev => ({ ...prev, [eventId]: combined }))
    } catch {
      setRegistrantsData(prev => ({ ...prev, [eventId]: [] }))
    } finally {
      setLoadingRegistrants(false)
    }
  }

  async function sendInvite(app, ev) {
    const key = `${app.id}-${ev.name}`
    setInviting(p => ({ ...p, [key]: true }))
    setInviteErr(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/event-applications/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, eventName: ev.name, eventDate: ev.date, eventLocation: ev.location, isResend: !!app.rsvp }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setInviteErr(p => ({ ...p, [key]: d.error || 'Failed to send.' })); return }
      setInviteDone(p => ({ ...p, [key]: true }))
      load()
    } catch {
      setInviteErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setInviting(p => ({ ...p, [key]: false }))
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Events</h1>
      </div>

      {/* ── New event form ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>New Event</div>
        <form onSubmit={post}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div><L>Event Name *</L><input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Into the Laurentians" maxLength={200} /></div>
            <div><L>Date * (YYYY-MM-DD)</L><input style={inp} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><L>Type *</L><SelectWrap value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} /></div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}><L>Date Display (optional — overrides date shown to members)</L><input style={inp} value={form.date_display} onChange={e => setForm(p => ({ ...p, date_display: e.target.value }))} placeholder="June 2026" /></div>
          <div style={{ marginBottom: '0.75rem' }}><L>Location</L><input style={inp} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Montreal → Mont-Tremblant" /></div>
          <div style={{ marginBottom: '0.75rem' }}><L>Description</L><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div style={{ marginBottom: '1rem' }}><L>External Registration URL (optional)</L><input style={inp} value={form.registration_url} onChange={e => setForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="https://canvasroutes.com/routes" /></div>
          <div style={{ marginBottom: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem' }}>Member Registration</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div><L>Registration Opens</L><input style={inp} type="datetime-local" value={form.registration_opens_at} onChange={e => setForm(p => ({ ...p, registration_opens_at: e.target.value }))} /></div>
              <div><L>Registration Closes (optional)</L><input style={inp} type="datetime-local" value={form.registration_closes_at} onChange={e => setForm(p => ({ ...p, registration_closes_at: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div><L>Member Price (CAD)</L><input style={inp} type="number" min="0" step="0.01" value={form.member_price ? (form.member_price / 100).toFixed(2) : ''} onChange={e => { const cents = Math.round(parseFloat(e.target.value) * 100); setForm(p => ({ ...p, member_price: e.target.value && !isNaN(cents) ? cents : '' })) }} placeholder="0.00" /></div>
              <div><L>Capacity (optional)</L><input style={inp} type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="Unlimited" /></div>
              <div><L>IC Priority Window Ends</L><input style={inp} type="datetime-local" value={form.priority_window_end} onChange={e => setForm(p => ({ ...p, priority_window_end: e.target.value }))} /></div>
            </div>
          </div>
          <PrimaryBtn type="submit" disabled={posting}>{posting ? 'Adding…' : 'Add Event'}</PrimaryBtn>
          <Err msg={postError} />
        </form>
      </div>

      {/* ── Event list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No events yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item, idx) => {
            const isEditing = editing === item.id
            const tab = activeTab[item.id] || 'settings'
            const spotsLeft = item.capacity ? item.capacity - (item.confirmed_count || 0) : null

            return (
              <div key={item.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>

                {/* ── Event header (always visible) ───────────────────────── */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1a1a1a' }}>{item.name}</span>
                      <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.45)', padding: '2px 7px' }}>{item.type}</span>
                      {item.registration_opens_at && (() => {
                        const now = new Date()
                        const opens = new Date(item.registration_opens_at)
                        const closes = item.registration_closes_at ? new Date(item.registration_closes_at) : null
                        const isOpen = now >= opens && (!closes || now <= closes)
                        const label = isOpen ? 'Reg Open' : now < opens ? `Opens ${opens.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : 'Reg Closed'
                        return <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isOpen ? '#3B6B2F' : '#888', border: `0.5px solid ${isOpen ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '2px 7px', background: isOpen ? 'rgba(59,107,47,0.04)' : 'transparent' }}>{label}{item.member_price ? ` · $${(item.member_price / 100).toFixed(2)}` : ''}{item.capacity ? ` · ${item.capacity} spots` : ''}</span>
                      })()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#c5a882', fontWeight: '500', marginBottom: '0.2rem' }}>{item.date_display || item.date}</div>
                    {item.location && <div style={{ fontSize: '12px', color: '#888' }}>{item.location}</div>}

                    {/* Application stats */}
                    {(item.total_applications > 0 || item.confirmed_count > 0) && (
                      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.6rem' }}>
                        {[
                          { label: 'Applied',    value: item.total_applications, color: '#1a1a1a' },
                          { label: 'Invited',    value: item.invited_count,       color: '#8A6535' },
                          { label: 'Confirmed',  value: item.confirmed_count,     color: '#3B6B2F' },
                          spotsLeft !== null && { label: 'Spots left', value: Math.max(0, spotsLeft), color: spotsLeft <= 3 ? '#7B2032' : '#888' },
                        ].filter(Boolean).map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', marginTop: '2px' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button onClick={() => moveEvent(item.id, 'up')} disabled={idx === 0 || moving} title="Move up" style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', cursor: idx === 0 || moving ? 'not-allowed' : 'pointer', opacity: idx === 0 || moving ? 0.3 : 1, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button onClick={() => moveEvent(item.id, 'down')} disabled={idx === items.length - 1 || moving} title="Move down" style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', cursor: idx === items.length - 1 || moving ? 'not-allowed' : 'pointer', opacity: idx === items.length - 1 || moving ? 0.3 : 1, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ToggleSwitch
                        checked={!!item.registration_enabled}
                        onChange={v => setRegEnabled(item.id, v)}
                        disabled={regToggling[item.id]}
                        label="Registration enabled"
                      />
                      <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: item.registration_enabled ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter)' }}>
                        Reg
                      </span>
                    </div>
                    {regToggleError[item.id] && <Err msg={regToggleError[item.id]} />}
                    <GhostBtn small onClick={() => toggleRegistrants(item.id, item.name)}>
                      {showRegistrants === item.id ? 'Hide Registrants' : `Registrants${registrantsData[item.id] ? ` (${registrantsData[item.id].length})` : ''}`}
                    </GhostBtn>
                    <GhostBtn small onClick={() => isEditing ? setEditing(null) : openEdit(item)}>
                      {isEditing ? 'Close' : 'Edit'}
                    </GhostBtn>
                    <DangerBtn small onClick={() => setDeleteEventConfirm(item.id)}>Delete</DangerBtn>
                  </div>
                </div>

                {/* Delete confirm */}
                {deleteEventConfirm === item.id && (
                  <div style={{ padding: '0.75rem 1.5rem', borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(123,32,50,0.03)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete this event?</span>
                    <GhostBtn small onClick={() => del(item.id)}>Confirm</GhostBtn>
                    <GhostBtn small onClick={() => { setDeleteEventConfirm(null); setDeleteEventError(p => ({ ...p, [item.id]: null })) }}>Cancel</GhostBtn>
                    {deleteEventError[item.id] && <Err msg={deleteEventError[item.id]} />}
                  </div>
                )}

                {/* ── Standalone registrants panel ────────────────────────── */}
                {showRegistrants === item.id && (
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '1.25rem 1.5rem' }}>
                    {loadingRegistrants && !registrantsData[item.id] ? (
                      <div style={{ fontSize: '13px', color: '#ccc' }}>Loading…</div>
                    ) : !registrantsData[item.id] || registrantsData[item.id].length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#ccc' }}>No registrants on record.</div>
                    ) : (
                      <>
                        {/* Header row: count + action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {registrantsData[item.id].length} registrant{registrantsData[item.id].length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {regEmailResult[item.id]?.sent != null && !regEmailOpen[item.id] && (
                              <span style={{ fontSize: '11px', color: '#3B6B2F' }}>Sent to {regEmailResult[item.id].sent}{regEmailResult[item.id].failed > 0 ? `, ${regEmailResult[item.id].failed} failed` : ''}.</span>
                            )}
                            <GhostBtn small onClick={() => { setAddRegOpen(p => ({ ...p, [item.id]: !p[item.id] })); setAddRegErr(p => ({ ...p, [item.id]: null })); setAddRegSearch(p => ({ ...p, [item.id]: '' })); ensureContactsLoaded() }}>
                              {addRegOpen[item.id] ? 'Cancel' : '+ Add'}
                            </GhostBtn>
                            <GhostBtn small onClick={() => { setRegEmailOpen(p => ({ ...p, [item.id]: !p[item.id] })); setRegEmailResult(p => ({ ...p, [item.id]: null })) }}>
                              {regEmailOpen[item.id] ? 'Cancel' : 'Email All'}
                            </GhostBtn>
                          </div>
                        </div>

                        {/* Manual add registrant form */}
                        {addRegOpen[item.id] && (
                          <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', marginBottom: '0.65rem', fontFamily: 'var(--font-inter)' }}>
                              Add registrant — no email will be sent
                            </div>

                            {/* Contact search */}
                            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                              <input
                                placeholder="Search existing contacts by name or email…"
                                value={addRegSearch[item.id] || ''}
                                onChange={e => { setAddRegSearch(p => ({ ...p, [item.id]: e.target.value })); setAddRegShowDrop(p => ({ ...p, [item.id]: true })) }}
                                onFocus={() => setAddRegShowDrop(p => ({ ...p, [item.id]: true }))}
                                onBlur={() => setTimeout(() => setAddRegShowDrop(p => ({ ...p, [item.id]: false })), 150)}
                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                              {addRegShowDrop[item.id] && (addRegSearch[item.id] || '').trim().length >= 1 && (() => {
                                const q = (addRegSearch[item.id] || '').toLowerCase()
                                const matches = allContacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 8)
                                return (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.14)', borderTop: 'none', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                    {matches.length === 0 ? (
                                      <div style={{ padding: '0.6rem 0.8rem', fontSize: '12px', color: '#bbb', fontFamily: 'var(--font-inter)' }}>No matching contacts — fill in manually below.</div>
                                    ) : matches.map((c, ci) => (
                                      <div
                                        key={ci}
                                        onMouseDown={() => {
                                          setAddRegName(p => ({ ...p, [item.id]: c.name }))
                                          setAddRegEmail(p => ({ ...p, [item.id]: c.email }))
                                          setAddRegSearch(p => ({ ...p, [item.id]: '' }))
                                          setAddRegShowDrop(p => ({ ...p, [item.id]: false }))
                                        }}
                                        style={{ padding: '0.55rem 0.8rem', cursor: 'pointer', borderBottom: ci < matches.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <div style={{ fontSize: '13px', color: '#1a1a1a', fontFamily: 'var(--font-inter)' }}>{c.name || '—'}</div>
                                        <div style={{ fontSize: '11px', color: '#888', fontFamily: 'var(--font-inter)' }}>{c.email}</div>
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Name + email fields (pre-filled from search or typed manually) */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                              <input
                                placeholder="Name"
                                value={addRegName[item.id] || ''}
                                onChange={e => setAddRegName(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ flex: '1 1 140px', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                              <input
                                placeholder="Email"
                                type="email"
                                value={addRegEmail[item.id] || ''}
                                onChange={e => setAddRegEmail(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ flex: '1 1 180px', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                              <PrimaryBtn
                                disabled={addingReg[item.id] || !addRegName[item.id]?.trim() || !addRegEmail[item.id]?.trim()}
                                onClick={() => addRegistrant(item.id)}
                              >
                                {addingReg[item.id] ? 'Adding…' : 'Add'}
                              </PrimaryBtn>
                            </div>
                            {addRegErr[item.id] && <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.4rem' }}>{addRegErr[item.id]}</div>}
                          </div>
                        )}

                        {/* Email compose form */}
                        {regEmailOpen[item.id] && (
                          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <input
                                placeholder="Subject"
                                value={regEmailSubject[item.id] || ''}
                                onChange={e => setRegEmailSubject(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ marginBottom: '0.75rem' }}>
                              <textarea
                                placeholder={'Message\n\nUse {{name}} for personalization.'}
                                value={regEmailBody[item.id] || ''}
                                onChange={e => setRegEmailBody(p => ({ ...p, [item.id]: e.target.value }))}
                                rows={5}
                                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <PrimaryBtn
                                disabled={sendingRegEmail[item.id] || !regEmailSubject[item.id]?.trim() || !regEmailBody[item.id]?.trim()}
                                onClick={() => sendEmailToRegistrants(item.id)}
                              >
                                {sendingRegEmail[item.id]
                                  ? 'Sending…'
                                  : `Send to ${[...new Set((registrantsData[item.id] || []).map(r => r.email).filter(e => e && e !== '—'))].length}`}
                              </PrimaryBtn>
                              {regEmailResult[item.id]?.error && <span style={{ fontSize: '12px', color: '#7B2032' }}>{regEmailResult[item.id].error}</span>}
                            </div>
                          </div>
                        )}

                        {/* Last-sent confirmation toast */}
                        {indivEmailResult?.sent && (
                          <div style={{ marginBottom: '0.75rem', fontSize: '12px', color: '#3B6B2F' }}>
                            Email sent to {indivEmailResult.name}.
                          </div>
                        )}

                        {/* Registrants table */}
                        <div style={{ overflowX: 'auto' }}>
                          <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', minWidth: isMobile ? 'unset' : '580px' }}>
                            {!isMobile && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.8fr 70px 70px 80px', padding: '0.5rem 0.85rem', background: '#fafaf9', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                                {['Name', 'Email', 'Type', 'Status', 'Paid', ''].map(h => (
                                  <div key={h} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                                ))}
                              </div>
                            )}
                            {registrantsData[item.id].map((r, ri) => {
                              const indivKey = `${item.id}::${r.email}`
                              const isOpen = indivEmailOpen === indivKey
                              return (
                                <div key={ri}>
                                  <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.8fr 70px 70px 80px', padding: '0.55rem 0.85rem', borderBottom: (!isOpen && ri < registrantsData[item.id].length - 1) ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center', background: isOpen ? 'rgba(197,168,130,0.04)' : 'transparent' }}>
                                    {isMobile ? (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <div>
                                            <div style={{ fontSize: '12px', color: '#333', fontWeight: '500' }}>{r.name || '—'}</div>
                                            <div style={{ fontSize: '11px', color: '#888' }}>{r.email || '—'}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: r.type === 'Member' ? '#3B6B2F' : r.type === 'Public' ? '#2563a0' : '#8A6535' }}>{r.type}</span>
                                              {r.status && <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888' }}>{r.status}</span>}
                                            </div>
                                          </div>
                                          {r.email && r.email !== '—' && (
                                            <GhostBtn small onClick={() => openIndivEmail(item.id, r)}>{isOpen ? 'Cancel' : 'Email'}</GhostBtn>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div style={{ fontSize: '12px', color: '#333' }}>{r.name || '—'}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{r.email || '—'}</div>
                                        <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: r.type === 'Member' ? '#3B6B2F' : r.type === 'Public' ? '#2563a0' : '#8A6535' }}>{r.type}</div>
                                        <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: (r.status === 'paid' || r.status === 'free' || r.status === 'registered') ? '#3B6B2F' : r.status === 'pending' ? '#8A6535' : '#888' }}>{r.status || '—'}</div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>{r.amount > 0 ? `$${(r.amount / 100).toFixed(2)}` : r.status === 'free' ? 'Free' : r.registeredAt ? new Date(r.registeredAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—'}</div>
                                        <div>
                                          {r.email && r.email !== '—' && (
                                            <GhostBtn small onClick={() => openIndivEmail(item.id, r)}>{isOpen ? 'Cancel' : 'Email'}</GhostBtn>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {/* Inline compose for this registrant */}
                                  {isOpen && (
                                    <div style={{ padding: '0.85rem', background: '#fafaf9', borderBottom: ri < registrantsData[item.id].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', borderTop: '0.5px solid rgba(197,168,130,0.2)' }}>
                                      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6535', marginBottom: '0.6rem', fontFamily: 'var(--font-inter)' }}>
                                        Email to {r.name || r.email}
                                      </div>
                                      <div style={{ marginBottom: '0.45rem' }}>
                                        <input
                                          placeholder="Subject"
                                          value={indivEmailSubject}
                                          onChange={e => setIndivEmailSubject(e.target.value)}
                                          style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                      </div>
                                      <div style={{ marginBottom: '0.6rem' }}>
                                        <textarea
                                          placeholder="Message"
                                          value={indivEmailBody}
                                          onChange={e => setIndivEmailBody(e.target.value)}
                                          rows={4}
                                          style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                                        />
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                                        <PrimaryBtn disabled={sendingIndivEmail || !indivEmailSubject.trim() || !indivEmailBody.trim()} onClick={() => sendEmailToRegistrant(r)}>
                                          {sendingIndivEmail ? 'Sending…' : 'Send'}
                                        </PrimaryBtn>
                                        {indivEmailResult?.error && <span style={{ fontSize: '12px', color: '#7B2032' }}>{indivEmailResult.error}</span>}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Expanded edit panel ──────────────────────────────────── */}
                {isEditing && (
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                    <TabBar
                      tabs={[
                        { id: 'settings',     label: `Settings` },
                        { id: 'applications', label: `Applications${item.total_applications > 0 ? ` (${item.total_applications})` : ''}` },
                      ]}
                      active={tab}
                      onChange={id => setActiveTab(p => ({ ...p, [item.id]: id }))}
                    />

                    {/* ── Settings tab ──────────────────────────────────── */}
                    {tab === 'settings' && (
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div><L>Name</L><input style={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                          <div><L>Date (YYYY-MM-DD)</L><input style={inp} type="date" value={editForm.date || ''} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} /></div>
                          <div><L>Type</L><SelectWrap value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} /></div>
                        </div>
                        <div style={{ marginBottom: '0.6rem' }}><L>Date Display (optional)</L><input style={inp} value={editForm.date_display || ''} onChange={e => setEditForm(p => ({ ...p, date_display: e.target.value }))} placeholder="June 2026" /></div>
                        <div style={{ marginBottom: '0.6rem' }}><L>Location</L><input style={inp} value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
                        <div style={{ marginBottom: '0.6rem' }}><L>Description</L><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
                        <div style={{ marginBottom: '0.75rem' }}><L>Registration URL (external, optional)</L><input style={inp} value={editForm.registration_url || ''} onChange={e => setEditForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="https://canvasroutes.com/routes" /></div>
                        <div style={{ paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.6rem' }}>Member Registration</div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                            <div><L>Registration Opens</L><input style={inp} type="datetime-local" value={editForm.registration_opens_at ? editForm.registration_opens_at.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, registration_opens_at: e.target.value || null }))} /></div>
                            <div><L>Registration Closes (optional)</L><input style={inp} type="datetime-local" value={editForm.registration_closes_at ? editForm.registration_closes_at.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, registration_closes_at: e.target.value || null }))} /></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.6rem' }}>
                            <div><L>Member Price (CAD)</L><input style={inp} type="number" min="0" step="0.01" value={editForm.member_price ? (editForm.member_price / 100).toFixed(2) : ''} onChange={e => { const cents = Math.round(parseFloat(e.target.value) * 100); setEditForm(p => ({ ...p, member_price: e.target.value && !isNaN(cents) ? cents : null })) }} placeholder="0.00" /></div>
                            <div><L>Capacity</L><input style={inp} type="number" min="1" value={editForm.capacity || ''} onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Unlimited" /></div>
                            <div><L>IC Priority Window Ends</L><input style={inp} type="datetime-local" value={editForm.priority_window_end ? editForm.priority_window_end.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, priority_window_end: e.target.value || null }))} /></div>
                          </div>
                        </div>
                        <div style={{ paddingTop: '0.5rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '1rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.6rem' }}>Event Photo</div>
                          {item.photo_url && (
                            <div style={{ marginBottom: '0.6rem', position: 'relative', display: 'inline-block' }}>
                              <img src={item.photo_url} alt="" style={{ width: '160px', height: '90px', objectFit: 'cover', display: 'block', border: '0.5px solid rgba(0,0,0,0.1)' }} />
                              <button onClick={() => removePhoto(item.id)} disabled={uploadingPhoto === item.id} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(123,32,50,0.85)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '11px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            </div>
                          )}
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: '#555', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.45rem 0.9rem', background: '#fafaf9' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                            {uploadingPhoto === item.id ? 'Uploading…' : item.photo_url ? 'Replace Photo' : 'Upload Photo'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingPhoto === item.id} onChange={e => { if (e.target.files[0]) uploadPhoto(item.id, e.target.files[0]) }} />
                          </label>
                          {photoError && <Err msg={photoError} />}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</PrimaryBtn>
                          <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                        </div>
                        <Err msg={saveError} />
                      </div>
                    )}

                    {/* ── Applications tab ──────────────────────────────── */}
                    {tab === 'applications' && (
                      <div>
                        {(item.applications ?? []).length === 0 ? (
                          <div style={{ padding: '2.5rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>
                            No applications for this event yet.
                          </div>
                        ) : (
                          <>
                            {!isMobile && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 150px', padding: '0.6rem 1.5rem', background: '#fafaf9', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                                {['Name', 'Car', 'Member', 'RSVP', ''].map((h, i) => (
                                  <div key={i} style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                                ))}
                              </div>
                            )}
                            {(item.applications ?? []).map((app, appIdx) => {
                              const key = `${app.id}-${item.name}`
                              const { make, model } = parseCarMakeModel(app.car_model)
                              const car = [app.car_year, make, model].filter(Boolean).join(' ')
                              return (
                                <div key={app.id} style={{ borderBottom: appIdx < item.applications.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                                  {isMobile ? (
                                    <div style={{ padding: '0.85rem 1.5rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                        <div>
                                          <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500', marginBottom: '0.1rem' }}>{app.name || '—'}</div>
                                          <div style={{ fontSize: '11px', color: '#888' }}>{car || '—'}</div>
                                        </div>
                                        <StatusChip rsvp={app.rsvp} />
                                      </div>
                                      {app.rsvp?.answers && <RsvpAnswers answers={app.rsvp.answers} />}
                                      <div style={{ marginTop: '0.65rem' }}>
                                        <InviteActions app={app} ev={item} keyStr={key} inviting={inviting} inviteErr={inviteErr} inviteDone={inviteDone} sendInvite={sendInvite} declining={declining} declineErr={declineErr} onDecline={declineApplication} onUndecline={undeclineApplication} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 150px', padding: '0.85rem 1.5rem', alignItems: 'start', gap: '0.5rem' }}>
                                      <div>
                                        <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '0.1rem' }}>{app.name || '—'}</div>
                                        <div style={{ fontSize: '11px', color: '#aaa' }}>{app.email}</div>
                                        {app.rsvp?.answers && <RsvpAnswers answers={app.rsvp.answers} />}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#666' }}>{car || '—'}</div>
                                      <div>
                                        {app.is_member
                                          ? <span style={{ fontSize: '10px', color: '#3B6B2F', letterSpacing: '0.06em' }}>✓ Member</span>
                                          : <span style={{ fontSize: '10px', color: '#bbb' }}>—</span>}
                                      </div>
                                      <StatusChip rsvp={app.rsvp} />
                                      <InviteActions app={app} ev={item} keyStr={key} inviting={inviting} inviteErr={inviteErr} inviteDone={inviteDone} sendInvite={sendInvite} declining={declining} declineErr={declineErr} onDecline={declineApplication} onUndecline={undeclineApplication} />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </>
                        )}
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
