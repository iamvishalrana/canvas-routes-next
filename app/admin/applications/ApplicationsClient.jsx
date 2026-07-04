'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import {
  CAR_MAKES, CANONICAL_EVENTS, MONTHS, DOB_YEARS,
  normalizeEventName, parseCarMakeModel,
  inp, sel, L, CopyBtn, PrimaryBtn, GhostBtn, DangerBtn, Err, AdminNotesPanel, AttendanceToggle, ConfirmDialog, KebabMenu,
} from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

// ─── InfoCell — defined at module level to avoid remount on every render ────────

function InfoCell({ label, value, copyable }) {
  return (
    <div>
      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '13px', color: value ? '#444' : '#ddd', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
        <span>{value || '—'}</span>
        {copyable && <CopyBtn value={value} />}
      </div>
    </div>
  )
}

// ─── Shared Admin Notes component for Applications ────────────────────────────

function AppAdminNotes({ appId, initialNotes, onSaved }) {
  return (
    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
      <AdminNotesPanel
        initialNotes={initialNotes}
        onSave={async (json) => {
          const res = await fetch(`/api/admin/applications/${appId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_notes: json }),
          })
          if (!res.ok) throw new Error('Failed to save notes')
          onSaved?.(json)
        }}
      />
    </div>
  )
}

// ─── Applications Client ──────────────────────────────────────────────────────

const APP_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']

export default function ApplicationsClient() {
  const searchParams = useSearchParams()
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [inviting, setInviting] = useState(null)
  const [inviteStatus, setInviteStatus] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [editingApp, setEditingApp] = useState(null)
  const [editAppForm, setEditAppForm] = useState({})
  const [savingApp, setSavingApp] = useState(false)
  const [saveAppErr, setSaveAppErr] = useState(null)
  const [seenAppIds, setSeenAppIds] = useState(new Set())
  const seenInitRef = useRef(false)
  const [addingContact, setAddingContact] = useState(new Set())
  const [addContactError, setAddContactError] = useState({})
  const [sortApps, setSortApps] = useState('newest')
  const [emailsCopied, setEmailsCopied] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [appTierPick, setAppTierPick] = useState(null)
  const [deleteAppConfirm, setDeleteAppConfirm] = useState(null)
  const [deleteAppError, setDeleteAppError] = useState({})
  const [showFilter, setShowFilter] = useState('all') // 'all' | 'unseen' | 'pending'
  const [rejectConfirm, setRejectConfirm] = useState(null)
  const [rejecting, setRejecting]   = useState(null)
  const [rejectErr, setRejectErr]   = useState({})
  const [capturing, setCapturing]   = useState(null)
  const [captureErr, setCaptureErr] = useState({})
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [emailComposerId, setEmailComposerId] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailGenerating, setEmailGenerating] = useState(false)
  const [emailResult, setEmailResult] = useState(null) // { id, success, error }
  const [emailPreviewExpanded, setEmailPreviewExpanded] = useState(false)
  const [captureConfirm, setCaptureConfirm] = useState(null)       // app awaiting capture yes/no
  const [inviteTierConfirm, setInviteTierConfirm] = useState(null) // { app, tier } awaiting yes/no
  const [sendEmailConfirm, setSendEmailConfirm] = useState(null)   // app awaiting composer-send yes/no
  const [noteSaveError, setNoteSaveError] = useState(null)
  const generateAbortRef = useRef(null)

  const loadApps = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/applications')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setApps(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setApps([]); setLoading(false) })
  }, [])

  useEffect(() => { loadApps() }, [loadApps])
  useRealtimeSync(['applications', 'members'], loadApps)

  useEffect(() => {
    if (loading || seenInitRef.current) return
    seenInitRef.current = true
    try {
      const stored = localStorage.getItem('admin_seen_app_ids')
      if (stored === null) {
        const allIds = apps.map(a => a.id)
        localStorage.setItem('admin_seen_app_ids', JSON.stringify(allIds))
        setSeenAppIds(new Set(allIds))
      } else {
        setSeenAppIds(new Set(JSON.parse(stored)))
      }
    } catch {}
  }, [loading, apps])

  function markSeen(appId) {
    setSeenAppIds(prev => {
      if (prev.has(appId)) return prev
      const next = new Set([...prev, appId])
      try { localStorage.setItem('admin_seen_app_ids', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  async function deleteApp(app) {
    setDeleteAppError(p => ({ ...p, [app.id]: null }))
    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, { method: 'DELETE' })
      if (res.ok) { setDeleteAppConfirm(null); setExpanded(null); setEditingApp(null); setSelected(prev => { const n = new Set(prev); n.delete(app.id); return n }); loadApps() }
      else setDeleteAppError(p => ({ ...p, [app.id]: 'Failed to delete.' }))
    } catch {
      setDeleteAppError(p => ({ ...p, [app.id]: 'Network error.' }))
    }
  }

  function startEditApp(a) {
    setEditingApp(a.id)
    setSaveAppErr(null)
    const { make: aMake, model: aModel } = parseCarMakeModel(a.car_model)
    setEditAppForm({
      name: a.name || '',
      car_year: a.car_year || '',
      car_make: aMake,
      car_model: aModel,
      car_paint: a.car_paint || '',
      phone: a.phone || '',
      instagram: a.instagram || '',
      dob_month: a.dob_month ? String(a.dob_month) : '',
      dob_day: a.dob_day ? String(a.dob_day) : '',
      dob_year: a.dob_year ? String(a.dob_year) : '',
      source: a.source || '',
      more: a.more || '',
    })
  }

  async function saveApp(appId) {
    setSavingApp(true); setSaveAppErr(null)
    const payload = {
      ...editAppForm,
      car_model: [editAppForm.car_make, editAppForm.car_model].filter(Boolean).join(' '),
      dob_month: editAppForm.dob_month ? parseInt(editAppForm.dob_month) : null,
      dob_day: editAppForm.dob_day ? parseInt(editAppForm.dob_day) : null,
      dob_year: editAppForm.dob_year ? parseInt(editAppForm.dob_year) : null,
    }
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveAppErr(d.error || 'Failed to save.'); return }
      setApps(prev => prev.map(a => a.id === appId ? { ...a, ...payload } : a))
      setEditingApp(null)
    } catch {
      setSaveAppErr('Network error — please try again.')
    } finally {
      setSavingApp(false)
    }
  }

  async function toggleAttended(appId, eventName, value) {
    const app = apps.find(a => a.id === appId)
    if (!app) return
    const existing = app.registrations || []
    const idx = existing.findIndex(r => normalizeEventName(r.event) === eventName)
    let newRegs
    if (idx !== -1) {
      newRegs = existing.map((r, i) =>
        i === idx ? { ...r, attended: r.attended === value ? null : value } : r
      )
    } else {
      newRegs = [...existing, { event: eventName, registered_at: null, attended: value }]
    }
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrations: newRegs }),
      })
      if (res.ok) setApps(prev => prev.map(a => a.id === appId ? { ...a, registrations: newRegs } : a))
    } catch {}
  }

  async function sendInvite(app, tier = 'routes_member') {
    setInviting(app.id)
    setAppTierPick(null)
    setInviteStatus(p => ({ ...p, [app.id]: null }))  // clear previous error before new attempt
    const { make: invMake, model: invModel } = parseCarMakeModel(app.car_model)
    const payload = {
      name: app.name, email: app.email, membership_status: 'pending', tier,
      dob_month: app.dob_month || null, dob_day: app.dob_day || null, dob_year: app.dob_year || null,
      phone: app.phone || null, instagram: app.instagram || null,
      cars: (app.car_year || app.car_model)
        ? [{ year: app.car_year || '', make: invMake || '', model: invModel || '', license_plate: '', paint: app.car_paint || '' }]
        : undefined,
    }
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setApps(prev => prev.map(a => a.id === app.id ? { ...a, is_member: true } : a))
        setInviteStatus(p => ({ ...p, [app.id]: 'success' }))
      } else {
        setInviteStatus(p => ({ ...p, [app.id]: data.error || 'Failed.' }))
      }
    } catch {
      setInviteStatus(p => ({ ...p, [app.id]: 'Network error.' }))
    } finally {
      setInviting(null)
    }
  }

  async function handleCapture(a) {
    setCapturing(a.id)
    setCaptureErr(p => ({ ...p, [a.id]: null }))
    try {
      const res = await fetch(`/api/admin/applications/${a.id}/capture`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setCaptureErr(p => ({ ...p, [a.id]: data.error || 'Capture failed.' })); return }
      setApps(prev => prev.map(x => x.id === a.id ? { ...x, stripe_payment_status: 'paid' } : x))
    } catch { setCaptureErr(p => ({ ...p, [a.id]: 'Network error.' })) }
    finally { setCapturing(null) }
  }

  async function handleReject(a) {
    setRejecting(a.id)
    setRejectConfirm(null)
    setRejectErr(p => ({ ...p, [a.id]: null }))
    try {
      const res = await fetch(`/api/admin/applications/${a.id}/reject`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setRejectErr(p => ({ ...p, [a.id]: data.error || 'Rejection failed.' })); return }
      setApps(prev => prev.map(x => x.id === a.id ? { ...x, stripe_payment_status: 'rejected' } : x))
    } catch { setRejectErr(p => ({ ...p, [a.id]: 'Network error.' })) }
    finally { setRejecting(null) }
  }

  async function addToContact(appId) {
    setAddingContact(prev => new Set([...prev, appId]))
    setAddContactError(p => ({ ...p, [appId]: null }))
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: appId })
      })
      if (res.ok) loadApps()
      else { const d = await res.json().catch(() => ({})); setAddContactError(p => ({ ...p, [appId]: d.error || 'Failed to add.' })) }
    } catch {
      setAddContactError(p => ({ ...p, [appId]: 'Network error.' }))
    } finally {
      setAddingContact(prev => { const n = new Set(prev); n.delete(appId); return n })
    }
  }

  function previewEmailHtml(subject, body) {
    const escaped = body
      .split(/\n\n+/)
      .map(p => `<p style="margin:0 0 1.2em 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('')
    return `<div style="padding:48px 40px 20px;">${escaped}</div><div style="padding:20px 40px 40px;border-top:0.5px solid rgba(0,0,0,0.08);font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#bbb;line-height:1.6;">Canvas Routes · Montreal, QC · info@canvasroutes.com</div>`
  }

  function openEmailComposer(a) {
    const firstName = (a.name || '').trim().split(' ')[0] || 'there'
    const { make, model } = parseCarMakeModel(a.car_model)
    const car = [a.car_year, make, model].filter(Boolean).join(' ')
    const events = (a.registrations || []).map(r => r.event).filter(Boolean)

    let subject = 'Canvas Routes — You\'re In'
    if (events.length > 0) subject = `Canvas Routes — ${events[0].split('—')[0].trim()}`

    let body = `Hi ${firstName},\n\n`
    body += `Your registration has been reviewed and we'd love to have you join us.\n\n`
    if (car) body += `Looking forward to seeing the ${car} on the road.\n\n`
    if (a.more?.trim()) {
      body += `You mentioned: "${a.more.trim()}"\n\n`
      body += `[Your response here]\n\n`
    }
    body += `We'll follow up shortly with payment details and everything you need for the day.\n\n`
    body += `See you on the road,\nJerry\nCanvas Routes`

    setEmailSubject(subject)
    setEmailBody(body)
    setEmailResult(null)
    setEmailPreviewExpanded(false)
    setEmailComposerId(a.id)
  }

  async function generateEmail(appId) {
    if (generateAbortRef.current) generateAbortRef.current.abort()
    const controller = new AbortController()
    generateAbortRef.current = controller
    setEmailGenerating(true)
    setEmailResult(null)
    try {
      const res = await fetch(`/api/admin/applications/${appId}/generate-email`, { method: 'POST', signal: controller.signal })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.body) {
        setEmailSubject(d.subject || emailSubject)
        setEmailBody(d.body)
      } else {
        setEmailResult({ id: appId, error: d.error || 'Failed to generate email.' })
      }
    } catch (err) {
      if (err.name !== 'AbortError') setEmailResult({ id: appId, error: 'Failed to generate email.' })
    } finally {
      setEmailGenerating(false)
    }
  }

  async function sendEmail(appId) {
    setEmailSending(true)
    setEmailResult(null)
    try {
      const app = apps.find(a => a.id === appId)
      const firstName = (app?.name || '').trim().split(' ')[0] || 'there'
      const resolvedBody = emailBody.replace(/\{\{name\}\}/gi, firstName)
      const res = await fetch(`/api/admin/applications/${appId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: resolvedBody }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && !d.error) {
        setEmailResult({ id: appId, success: true })
        setTimeout(() => { setEmailComposerId(null); setEmailResult(null) }, 2500)
      } else {
        setEmailResult({ id: appId, error: d.error || 'Failed to send.' })
      }
    } catch {
      setEmailResult({ id: appId, error: 'Network error — please try again.' })
    } finally {
      setEmailSending(false)
    }
  }

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  async function saveNote(appId, value) {
    const trimmed = value.trim()
    setNoteSaveError(null)
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: trimmed || null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setNoteSaveError(d.error || 'Failed to save note.')
        return
      }
      setApps(prev => prev.map(x => x.id === appId ? { ...x, notes: trimmed || null } : x))
      setEditingNote(null)
    } catch {
      setNoteSaveError('Network error — note not saved.')
    }
  }

  const filtered = apps
    .filter(a => {
      if (showFilter === 'unseen' && seenAppIds.has(a.id)) return false
      if (showFilter === 'pending' && a.is_member) return false
      return !search || [a.name, a.email, a.car_year, a.car_model, a.car_paint, a.instagram, a.source, a.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())) || (search.replace(/\D/g,'') && a.phone?.replace(/\D/g,'').includes(search.replace(/\D/g,'')))
    })
    .sort((a, b) => {
      if (sortApps === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortApps === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortApps === 'name_az') return (a.name || '').localeCompare(b.name || '')
      if (sortApps === 'name_za') return (b.name || '').localeCompare(a.name || '')
      return 0
    })
  const totalInvited = apps.filter(a => a.is_member).length

  function exportCSV() {
    const rows = filtered.map(a => ({
      Name: a.name || '',
      Email: a.email || '',
      Phone: a.phone || '',
      'Car Year': a.car_year || '',
      'Car Model': a.car_model || '',
      'Car Paint': a.car_paint || '',
      Source: a.source || '',
      Applied: a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: MONTREAL_TZ }) : '',
      Status: a.is_member ? 'Invited / Member' : 'Pending',
      Registrations: (a.registrations || []).map(r => r.event || '').filter(Boolean).join('; '),
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    el.download = `canvas-routes-applications-${new Date().toISOString().slice(0,10)}.csv`
    el.click()
    URL.revokeObjectURL(el.href)
  }

  function copyEmails() {
    const source = selected.size > 0 ? filtered.filter(a => selected.has(a.id)) : filtered
    const emails = source.map(a => a.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setEmailsCopied(true)
      setTimeout(() => setEmailsCopied(false), 1500)
    }).catch(() => {})
  }
  const unseenCount = apps.filter(a => !seenAppIds.has(a.id)).length



  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Applications</h1>
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Applications', value: apps.length, color: '#1a1a1a' },
          { label: 'Invited', value: totalInvited, color: '#3B6B2F' },
          { label: 'Pending Review', value: apps.length - totalInvited, color: '#8A6535' },
          { label: 'New', value: unseenCount, color: unseenCount > 0 ? '#7B2032' : '#999', filter: 'unseen' },
        ].map(s => (
          <div key={s.label}
            onClick={() => s.filter ? setShowFilter(f => f === s.filter ? 'all' : s.filter) : undefined}
            style={{ background: '#fff', border: `0.5px solid ${s.filter && showFilter === s.filter ? 'rgba(123,32,50,0.3)' : 'rgba(0,0,0,0.1)'}`, padding: '1.25rem 1.4rem', cursor: s.filter ? 'pointer' : undefined, transition: 'border-color 0.15s' }}>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
          <span style={{ fontSize: '11px', color: '#8A6535', letterSpacing: '0.06em' }}>{selected.size} selected</span>
          <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>{emailsCopied ? 'Copied!' : 'Copy Emails'}</button>
          <ExportButton
            filename="applications"
            title="Applications (selected)"
            headers={['Name', 'Email', 'Phone', 'Car Year', 'Car Model', 'Car Paint', 'Source', 'Payment Status', 'Registered']}
            rows={filtered.filter(a => selected.has(a.id)).map(a => [
              a.name || '', a.email || '', a.phone || '',
              a.car_year || '', a.car_model || '', a.car_paint || '',
              a.source || '', a.stripe_payment_status || '',
              a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: MONTREAL_TZ }) : '',
            ])}
            style={{ padding: '4px 10px', fontSize: '10px' }}
          />
          <button onClick={() => setSelected(new Set())} style={{ fontSize: '10px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginLeft: 'auto' }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {apps.length} application{apps.length !== 1 ? 's' : ''}
          </div>
          {filtered.length > 0 && selected.size === 0 && (
            <ExportButton
              filename="applications"
              title="Applications"
              headers={['Name', 'Email', 'Phone', 'Car Year', 'Car Model', 'Car Paint', 'Tier', 'Source', 'Payment Status', 'Amount Paid', 'Registered']}
              rows={filtered.map(a => [
                a.name || '',
                a.email || '',
                a.phone || '',
                a.car_year || '',
                a.car_model || '',
                a.car_paint || '',
                a.registrations?.find(r => r.event === 'Canvas Routes Membership')?.tier || '',
                a.source || '',
                a.stripe_payment_status || '',
                a.stripe_amount_paid ? `$${(a.stripe_amount_paid / 100).toFixed(2)}` : '',
                a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA', { timeZone: MONTREAL_TZ }) : '',
              ])}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'unseen', label: `Unseen${unseenCount > 0 ? ` (${unseenCount})` : ''}` },
            { key: 'pending', label: 'Not Invited' },
          ].map(f => (
            <button key={f.key} onClick={() => setShowFilter(f.key)}
              style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: '0.5px solid', transition: 'all 0.15s',
                background: showFilter === f.key ? (f.key === 'unseen' ? 'rgba(123,32,50,0.07)' : 'rgba(0,0,0,0.06)') : 'none',
                color: showFilter === f.key ? (f.key === 'unseen' ? '#7B2032' : '#1a1a1a') : '#888',
                borderColor: showFilter === f.key ? (f.key === 'unseen' ? 'rgba(123,32,50,0.3)' : 'rgba(0,0,0,0.25)') : 'rgba(0,0,0,0.15)',
              }}>
              {f.label}
            </button>
          ))}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select value={sortApps} onChange={e => setSortApps(e.target.value)}
              style={{ ...sel, width: '160px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_az">Name A → Z</option>
              <option value="name_za">Name Z → A</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
            <input style={{ ...inp, width: '100%', paddingRight: search ? '2rem' : undefined }} placeholder="Search name, email, car, source…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No applications yet.</div>
      ) : (
        <div style={isMobile ? {} : { overflowX: 'auto' }}>
        <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', ...(isMobile ? {} : { minWidth: '700px' }) }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9', alignItems: 'center' }}>
              <input type="checkbox"
                checked={filtered.length > 0 && filtered.every(a => selected.has(a.id))}
                ref={el => { if (el) el.indeterminate = filtered.some(a => selected.has(a.id)) && !filtered.every(a => selected.has(a.id)) }}
                onChange={e => {
                  if (e.target.checked) setSelected(prev => new Set([...prev, ...filtered.map(a => a.id)]))
                  else setSelected(prev => { const n = new Set(prev); filtered.forEach(a => n.delete(a.id)); return n })
                }}
                style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
              />
              {['Name', 'Email', 'Car', 'DOB', 'Date', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
              ))}
            </div>
          )}

          {filtered.map((a, idx) => (
            <div key={a.id} className="admin-row-enter" style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {/* Summary row */}
              {(() => {
                const isGreyed = a.is_contact && !a.reregistered_at
                const handleRowClick = () => {
                  const isCollapsing = expanded === a.id
                  setExpanded(isCollapsing ? null : a.id)
                  if (isCollapsing && editingApp === a.id) setEditingApp(null)
                  setAppTierPick(null)
                  if (isCollapsing) {
                    if (deleteAppConfirm === a.id) setDeleteAppConfirm(null)
                    if (rejectConfirm === a.id) setRejectConfirm(null)
                    if (editingNote === a.id) setEditingNote(null)
                  }
                  if (a.reregistered_at) {
                    setApps(prev => prev.map(x => x.id === a.id ? { ...x, reregistered_at: null } : x))
                    fetch(`/api/admin/applications/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reregistered_at: null }) })
                      .then(r => { if (!r.ok) setApps(prev => prev.map(x => x.id === a.id ? { ...x, reregistered_at: a.reregistered_at } : x)) })
                      .catch(() => setApps(prev => prev.map(x => x.id === a.id ? { ...x, reregistered_at: a.reregistered_at } : x)))
                  }
                }
                const inviteCell = (
                  <div onClick={e => e.stopPropagation()}>
                    {rejecting === a.id && (
                      <span style={{ fontSize: '10px', color: '#bbb' }}>…</span>
                    )}
                    {rejectConfirm === a.id && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ fontSize: '10px', color: '#7B2032' }}>Reject &amp; cancel hold?</div>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => handleReject(a)} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(123,32,50,0.1)', border: '0.5px solid rgba(123,32,50,0.4)', padding: '3px 7px', cursor: 'pointer', color: '#7B2032', fontFamily: 'var(--font-inter),sans-serif' }}>Confirm</button>
                          <button onClick={() => setRejectConfirm(null)} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '3px 7px', cursor: 'pointer', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                    {a.stripe_payment_status === 'rejected' && (
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B2032', border: '0.5px solid rgba(123,32,50,0.3)', padding: '3px 9px', background: 'rgba(123,32,50,0.06)' }}>Rejected</span>
                    )}
                    {/* Capture / Reject for authorized holds */}
                    {a.stripe_payment_status === 'authorized' && rejectConfirm !== a.id && rejecting !== a.id && (
                      capturing === a.id ? (
                        <span style={{ fontSize: '10px', color: '#bbb' }}>Capturing…</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button onClick={() => setCaptureConfirm(a)} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(59,107,47,0.1)', border: '0.5px solid rgba(59,107,47,0.4)', padding: '3px 7px', cursor: 'pointer', color: '#3B6B2F', fontFamily: 'var(--font-inter),sans-serif' }}>Capture</button>
                            <button onClick={() => setRejectConfirm(a.id)} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(123,32,50,0.06)', border: '0.5px solid rgba(123,32,50,0.3)', padding: '3px 7px', cursor: 'pointer', color: '#7B2032', fontFamily: 'var(--font-inter),sans-serif' }}>Reject</button>
                          </div>
                          {captureErr[a.id] && <span style={{ fontSize: '10px', color: '#7B2032' }}>{captureErr[a.id]}</span>}
                        </div>
                      )
                    )}
                    {/* Normal invite flow — only after payment is captured */}
                    {a.stripe_payment_status !== 'rejected' && a.stripe_payment_status !== 'authorized' && (
                    a.is_member || inviteStatus[a.id] === 'success' ? (
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>Invited</span>
                    ) : appTierPick === a.id ? (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <button onClick={() => setInviteTierConfirm({ app: a, tier: 'routes_member' })}
                          style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                          Routes
                        </button>
                        <button onClick={() => setInviteTierConfirm({ app: a, tier: 'inner_circle' })}
                          style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                          Inner Circle
                        </button>
                        <button onClick={() => setAppTierPick(null)}
                          style={{ fontSize: '11px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                      </div>
                    ) : (
                      <div>
                        <PrimaryBtn onClick={() => setAppTierPick(a.id)} disabled={inviting === a.id}>
                          {inviting === a.id ? '…' : 'Invite'}
                        </PrimaryBtn>
                        {inviteStatus[a.id] && inviteStatus[a.id] !== 'success' && (
                          <div style={{ fontSize: '10px', color: '#7B2032', marginTop: '0.3rem' }}>{inviteStatus[a.id]}</div>
                        )}
                      </div>
                    )
                    )}
                  </div>
                )
                if (isMobile) {
                  return (
                    <div style={{ padding: '0.85rem 1rem', cursor: 'pointer', background: selected.has(a.id) ? 'rgba(197,168,130,0.06)' : isGreyed ? 'rgba(0,0,0,0.025)' : undefined }} onClick={handleRowClick}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', minWidth: 0 }}>
                          <div onClick={e => e.stopPropagation()}>
                            <input type="checkbox"
                              checked={selected.has(a.id)}
                              onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(a.id) : n.delete(a.id); return n })}
                              style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
                            />
                          </div>
                          {!seenAppIds.has(a.id) && (
                          <button
                            onClick={e => { e.stopPropagation(); markSeen(a.id) }}
                            title="Mark as seen"
                            style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7B2032', flexShrink: 0, display: 'inline-block', border: 'none', padding: 0, cursor: 'pointer' }}
                          />
                        )}
                          {a.reregistered_at && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 6px', background: 'rgba(197,168,130,0.08)', whiteSpace: 'nowrap', flexShrink: 0 }}>↩ Re-reg</span>}
                          <span style={{ fontSize: '13px', color: isGreyed ? '#bbb' : '#1a1a1a' }}>{a.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                        </div>
                        {inviteCell}
                      </div>
                      <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#666', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{a.email}<CopyBtn value={a.email} /></div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>{(() => { const {make,model} = parseCarMakeModel(a.car_model); return [a.car_year, make, model].filter(Boolean).join(' ') || '—' })()}</span>
                        {a.car_paint && <span style={{ fontSize: '11px', color: isGreyed ? '#ccc' : '#c5a882' }}>{a.car_paint}</span>}
                        <span style={{ fontSize: '11px', color: '#bbb' }}>{a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: MONTREAL_TZ }) : '—'}</span>
                      </div>
                    </div>
                  )
                }
                return (
                <div
                  style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.85rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: selected.has(a.id) ? 'rgba(197,168,130,0.06)' : isGreyed ? 'rgba(0,0,0,0.025)' : undefined }}
                  onClick={handleRowClick}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(a.id) : n.delete(a.id); return n })}
                      style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
                    />
                  </div>
                  <div style={{ fontSize: '13px', color: isGreyed ? '#bbb' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {!seenAppIds.has(a.id) && (
                      <button
                        onClick={e => { e.stopPropagation(); markSeen(a.id) }}
                        title="Mark as seen"
                        style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7B2032', flexShrink: 0, display: 'inline-block', border: 'none', padding: 0, cursor: 'pointer' }}
                      />
                    )}
                    {a.reregistered_at && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 6px', background: 'rgba(197,168,130,0.08)', whiteSpace: 'nowrap', flexShrink: 0 }}>↩ Re-registered</span>}
                    {a.name || <span style={{ color: '#ccc' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{a.email}<CopyBtn value={a.email} /></div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>
                    <div>{(() => { const {make,model} = parseCarMakeModel(a.car_model); return [a.car_year, make, model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span> })()}</div>
                    {a.car_paint && <div style={{ fontSize: '11px', color: isGreyed ? '#ccc' : '#c5a882', marginTop: '1px' }}>{a.car_paint}</div>}
                  </div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>
                    {a.dob_month ? `${MONTHS_SHORT[a.dob_month - 1]} ${a.dob_day}${a.dob_year ? `, ${a.dob_year}` : ''}` : <span style={{ color: '#ddd' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ }) : '—'}
                  </div>
                  {inviteCell}
                </div>
                )
              })()}

              {/* Expanded panel */}
              {expanded === a.id && (
                <div className="admin-panel-enter" style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {editingApp === a.id ? (
                    /* ── Edit mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.5fr 90px 1.5fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><L>Name</L><input style={inp} value={editAppForm.name} onChange={e => setEditAppForm(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><L>Car Year</L><input style={inp} value={editAppForm.car_year} onChange={e => setEditAppForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
                        <div><L>Make</L><div style={{ position: 'relative' }}><select style={sel} value={editAppForm.car_make || ''} onChange={e => setEditAppForm(p => ({ ...p, car_make: e.target.value }))}><option value="">Select</option>{CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select><svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>
                        <div><L>Model</L><input style={inp} value={editAppForm.car_model} onChange={e => setEditAppForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. M3 Competition" maxLength={80} /></div>
                        <div><L>Paint</L><input style={inp} value={editAppForm.car_paint || ''} onChange={e => setEditAppForm(p => ({ ...p, car_paint: e.target.value }))} placeholder="e.g. Nardo Grey" maxLength={60} /></div>
                        <div><L>Phone</L><input style={inp} type="tel" value={editAppForm.phone} onChange={e => setEditAppForm(p => ({ ...p, phone: e.target.value }))} maxLength={30} /></div>
                        <div><L>Instagram</L><input style={inp} value={editAppForm.instagram} onChange={e => setEditAppForm(p => ({ ...p, instagram: e.target.value }))} placeholder="handle" maxLength={50} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 2fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div>
                          <L>DOB Month</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.dob_month} onChange={e => setEditAppForm(p => ({ ...p, dob_month: e.target.value }))}>
                              <option value="">Month</option>
                              {MONTHS.map((mo, i) => <option key={i+1} value={String(i+1)}>{mo}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Day</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.dob_day} onChange={e => setEditAppForm(p => ({ ...p, dob_day: e.target.value }))}>
                              <option value="">Day</option>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Year</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.dob_year} onChange={e => setEditAppForm(p => ({ ...p, dob_year: e.target.value }))}>
                              <option value="">Year</option>
                              {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>How did they hear</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.source} onChange={e => setEditAppForm(p => ({ ...p, source: e.target.value }))}>
                              <option value="">Select…</option>
                              {APP_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <L>Tell us more</L>
                        <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editAppForm.more} onChange={e => setEditAppForm(p => ({ ...p, more: e.target.value }))} maxLength={500} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <PrimaryBtn onClick={() => saveApp(a.id)} disabled={savingApp}>{savingApp ? 'Saving…' : 'Save'}</PrimaryBtn>
                        <GhostBtn onClick={() => setEditingApp(null)}>Cancel</GhostBtn>
                      </div>
                      {saveAppErr && <Err msg={saveAppErr} />}
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <InfoCell label="Name" value={a.name} />
                        <InfoCell label="Car Year" value={a.car_year} />
                        <InfoCell label="Make" value={parseCarMakeModel(a.car_model).make} />
                        <InfoCell label="Model" value={parseCarMakeModel(a.car_model).model} />
                        <InfoCell label="Paint" value={a.car_paint} />
                        <InfoCell label="Phone" value={a.phone} copyable />
                        <InfoCell label="Instagram" value={a.instagram ? `@${a.instagram}` : null} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <InfoCell label="DOB" value={a.dob_month ? `${MONTHS_SHORT[a.dob_month - 1]} ${a.dob_day}${a.dob_year ? `, ${a.dob_year}` : ''}` : null} />
                        <InfoCell label="How they heard" value={a.source} />
                        <InfoCell label="Applied" value={a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ }) : '—'} />
                        <InfoCell label="Payment" value={a.stripe_payment_status || null} />
                        <InfoCell label="Amount Paid" value={a.stripe_amount_paid ? `$${(a.stripe_amount_paid / 100).toFixed(2)} CAD` : null} />
                        {a.promo_code_used && <InfoCell label="Promo Code" value={a.promo_code_used} />}
                      </div>
                      {a.more && (
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Tell us more</div>
                          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.65' }}>{a.more}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event registrations */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>Event Registrations</div>
                    {(() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const canonicalNames = new Set(CANONICAL_EVENTS.map(e => e.name))
                      const extraRegs = (a.registrations || []).filter(r => !canonicalNames.has(normalizeEventName(r.event)) && r.event !== 'Canvas Routes Membership')
                      const allRows = [
                        ...CANONICAL_EVENTS.map(ev => {
                          const reg = (a.registrations || []).find(r => normalizeEventName(r.event) === ev.name)
                          return { eventName: ev.name, eventDate: ev.date, reg: reg || null }
                        }),
                        ...extraRegs.map(r => ({ eventName: r.event, eventDate: null, reg: r })),
                      ]
                      return allRows.map(({ eventName, eventDate, reg }) => {
                        const isPast = eventDate ? new Date(eventDate) <= today : true
                        const isNA = isPast && reg !== null && reg.registered_at === null && reg.attended === null
                        return (
                          <div key={eventName} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: '#444', minWidth: isMobile ? '0' : '260px' }}>{eventName}</span>
                            {reg?.registered_at && (
                              <span style={{ fontSize: '11px', color: '#bbb' }}>
                                {new Date(reg.registered_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })}
                              </span>
                            )}
                            {isNA ? (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>N/A</span>
                            ) : isPast ? (
                              <>
                                <AttendanceToggle value={reg?.attended ?? null} onChange={v => toggleAttended(a.id, eventName, v)} />
                              </>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>Upcoming</span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {/* Quick Note */}
                  {editingApp !== a.id && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>Quick Note</div>
                      {editingNote === a.id ? (
                        <div>
                          <input autoFocus value={noteValue} maxLength={200}
                            onChange={e => setNoteValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveNote(a.id, noteValue); if (e.key === 'Escape') setEditingNote(null) }}
                            style={{ ...inp, fontSize: '13px', marginBottom: '0.5rem' }}
                            placeholder="e.g. Referred by Jerry" />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <GhostBtn small onClick={() => saveNote(a.id, noteValue)}>Save</GhostBtn>
                            <GhostBtn small onClick={() => { setEditingNote(null); setNoteSaveError(null) }}>Cancel</GhostBtn>
                          </div>
                          <Err msg={noteSaveError} />
                        </div>
                      ) : (
                        <div onClick={() => { setEditingNote(a.id); setNoteValue(a.notes || '') }}
                          style={{ fontSize: '13px', color: a.notes ? '#444' : '#ccc', cursor: 'text', padding: '0.5rem 0.75rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', minHeight: '36px' }}>
                          {a.notes || 'Click to add a note…'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Notes */}
                  {editingApp !== a.id && (
                    <AppAdminNotes key={a.id} appId={a.id} initialNotes={a.admin_notes} onSaved={notes => setApps(prev => prev.map(x => x.id === a.id ? { ...x, admin_notes: notes } : x))} />
                  )}

                  {/* Action row */}
                  {editingApp !== a.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {!a.is_contact ? (
                          !isMobile && (
                          <div>
                            <GhostBtn onClick={() => addToContact(a.id)} small disabled={addingContact.has(a.id)}>
                              {addingContact.has(a.id) ? '…' : 'Add to Contacts'}
                            </GhostBtn>
                            {addContactError[a.id] && <div style={{ fontSize: '10px', color: '#7B2032', marginTop: '0.25rem' }}>{addContactError[a.id]}</div>}
                          </div>
                          )
                        ) : (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>✓ In Contacts</span>
                        )}
                        {seenAppIds.has(a.id) && !a.is_contact && !a.is_member && (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Reviewed</span>
                        )}
                        {isMobile ? (
                          <KebabMenu items={[
                            !a.is_contact && { label: addingContact.has(a.id) ? '…' : 'Add to Contacts', onClick: () => addToContact(a.id), disabled: addingContact.has(a.id) },
                            { label: emailComposerId === a.id ? 'Cancel Email' : 'Send Email', onClick: () => emailComposerId === a.id ? setEmailComposerId(null) : openEmailComposer(a) },
                            !seenAppIds.has(a.id) && { label: 'Mark as Seen', onClick: () => { markSeen(a.id); setExpanded(null) } },
                            { label: 'Edit', onClick: () => startEditApp(a) },
                            { label: 'Delete', danger: true, onClick: () => setDeleteAppConfirm(a.id) },
                          ]} />
                        ) : (
                          <>
                            <GhostBtn small onClick={() => emailComposerId === a.id ? setEmailComposerId(null) : openEmailComposer(a)}>
                              {emailComposerId === a.id ? 'Cancel Email' : '✉ Send Email'}
                            </GhostBtn>
                            {!seenAppIds.has(a.id) && (
                              <GhostBtn small onClick={() => { markSeen(a.id); setExpanded(null) }}>Mark as Seen</GhostBtn>
                            )}
                            <GhostBtn onClick={() => startEditApp(a)} small>Edit</GhostBtn>
                            <DangerBtn small onClick={() => setDeleteAppConfirm(a.id)}>Delete</DangerBtn>
                          </>
                        )}
                        {isMobile && addContactError[a.id] && <div style={{ fontSize: '10px', color: '#7B2032' }}>{addContactError[a.id]}</div>}
                      </div>
                      {deleteAppConfirm === a.id && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete application from {a.name || a.email}?</span>
                          <DangerBtn small onClick={() => deleteApp(a)}>Confirm Delete</DangerBtn>
                          <GhostBtn small onClick={() => { setDeleteAppConfirm(null); setDeleteAppError(p => ({ ...p, [a.id]: null })) }}>Cancel</GhostBtn>
                          {deleteAppError[a.id] && <Err msg={deleteAppError[a.id]} />}
                        </div>
                      )}

                      {/* Email composer */}
                      {emailComposerId === a.id && (
                        <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb' }}>
                              From: Jerry — Canvas Routes &lt;jerry@canvasroutes.com&gt; &nbsp;·&nbsp; To: {a.email}
                            </div>
                            <button
                              onClick={() => setEmailPreviewExpanded(v => !v)}
                              style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '3px 10px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}
                            >
                              {emailPreviewExpanded ? 'Collapse Preview' : 'Expand Preview'}
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: emailPreviewExpanded ? '1fr 1fr' : '1fr', gap: 0 }}>
                            <div style={{ padding: '1.25rem', borderRight: emailPreviewExpanded ? '0.5px solid rgba(0,0,0,0.08)' : 'none' }}>
                              <div style={{ marginBottom: '0.6rem' }}>
                                <L>Subject</L>
                                <input
                                  style={inp}
                                  value={emailSubject}
                                  onChange={e => setEmailSubject(e.target.value)}
                                  placeholder="Subject line"
                                />
                              </div>
                              <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                  <L style={{ marginBottom: 0 }}>Body</L>
                                  <button
                                    onClick={() => generateEmail(a.id)}
                                    disabled={emailGenerating || emailSending}
                                    style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '3px 10px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: emailGenerating ? 'default' : 'pointer', color: emailGenerating ? '#bbb' : '#555', display: 'flex', alignItems: 'center', gap: '5px', transition: 'border-color 0.15s', fontFamily: 'var(--font-inter),sans-serif' }}
                                  >
                                    {emailGenerating ? '…writing' : '✦ Write with AI'}
                                  </button>
                                </div>
                                <textarea
                                  style={{ ...inp, height: emailPreviewExpanded ? '360px' : '220px', resize: 'vertical', lineHeight: '1.65' }}
                                  value={emailBody}
                                  onChange={e => setEmailBody(e.target.value)}
                                  placeholder="Email body…"
                                />
                                <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.3rem' }}>
                                  Double line breaks become paragraphs.
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <PrimaryBtn
                                  onClick={() => setSendEmailConfirm(a)}
                                  disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                                >
                                  {emailSending ? 'Sending…' : 'Send'}
                                </PrimaryBtn>
                                <GhostBtn small onClick={() => setEmailComposerId(null)}>Cancel</GhostBtn>
                              </div>
                              {emailResult?.id === a.id && emailResult.success && (
                                <div style={{ marginTop: '0.6rem', fontSize: '12px', color: '#3B6B2F' }}>✓ Email sent to {a.email}</div>
                              )}
                              {emailResult?.id === a.id && emailResult.error && (
                                <Err msg={emailResult.error} />
                              )}
                            </div>
                            {emailPreviewExpanded && (
                              <div style={{ padding: '0', background: '#fff', overflow: 'auto' }}>
                                <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', padding: '0.6rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>Preview</div>
                                <div dangerouslySetInnerHTML={{ __html: previewEmailHtml(emailSubject, emailBody || ' ') }} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Yes/no gates for money + email actions */}
      {captureConfirm && (
        <ConfirmDialog
          title="Capture this payment?"
          message={`This charges the card hold for ${captureConfirm.name || captureConfirm.email} and emails them a confirmation. It cannot be undone — only refunded.`}
          details={<><strong>{captureConfirm.name || '—'}</strong> · {captureConfirm.email}</>}
          confirmLabel="Yes, capture"
          busy={capturing === captureConfirm.id}
          onConfirm={async () => { const a = captureConfirm; await handleCapture(a); setCaptureConfirm(null) }}
          onCancel={() => setCaptureConfirm(null)}
        />
      )}
      {inviteTierConfirm && (
        <ConfirmDialog
          title="Send membership invite?"
          message={`This creates a member account and immediately emails an invite to set up their portal.`}
          details={<><strong>{inviteTierConfirm.app.name || '—'}</strong> · {inviteTierConfirm.app.email}<br />Tier: <strong>{inviteTierConfirm.tier === 'inner_circle' ? 'Inner Circle' : 'Canvas Routes Member'}</strong></>}
          confirmLabel="Yes, send invite"
          busy={inviting === inviteTierConfirm.app.id}
          onConfirm={async () => { const { app, tier } = inviteTierConfirm; await sendInvite(app, tier); setInviteTierConfirm(null) }}
          onCancel={() => setInviteTierConfirm(null)}
        />
      )}
      {sendEmailConfirm && (
        <ConfirmDialog
          title="Send this email?"
          message="The email goes out immediately and cannot be unsent."
          details={<>To: <strong>{sendEmailConfirm.email}</strong><br />Subject: {emailSubject || '—'}</>}
          confirmLabel="Yes, send"
          busy={emailSending}
          onConfirm={async () => { const a = sendEmailConfirm; await sendEmail(a.id); setSendEmailConfirm(null) }}
          onCancel={() => setSendEmailConfirm(null)}
        />
      )}
    </div>
  )
}
