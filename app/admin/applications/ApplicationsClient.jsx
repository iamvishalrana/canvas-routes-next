'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CAR_MAKES, CANONICAL_EVENTS, MONTHS, DOB_YEARS,
  normalizeEventName, parseCarMakeModel,
  inp, sel, L, CopyBtn, PrimaryBtn, GhostBtn, DangerBtn, Err, AdminNotesPanel,
} from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'

// ─── Shared Admin Notes component for Applications ────────────────────────────

function AppAdminNotes({ appId, initialNotes, onSaved }) {
  return (
    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
      <AdminNotesPanel
        initialNotes={initialNotes}
        onSave={async (json) => {
          await fetch(`/api/admin/applications/${appId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_notes: json }),
          })
          onSaved?.(json)
        }}
      />
    </div>
  )
}

// ─── Applications Client ──────────────────────────────────────────────────────

const APP_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']

export default function ApplicationsClient({ isMobile }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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
  const [sortApps, setSortApps] = useState('newest')
  const [emailsCopied, setEmailsCopied] = useState(false)
  const [appTierPick, setAppTierPick] = useState(null)
  const [deleteAppConfirm, setDeleteAppConfirm] = useState(null)
  const [deleteAppError, setDeleteAppError] = useState(null)
  const [showFilter, setShowFilter] = useState('all') // 'all' | 'unseen' | 'pending'
  const [emailComposerId, setEmailComposerId] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailGenerating, setEmailGenerating] = useState(false)
  const [emailResult, setEmailResult] = useState(null) // { id, success, error }

  const loadApps = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/applications')
      .then(r => r.json())
      .then(data => { setApps(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  useEffect(() => { loadApps() }, [loadApps])

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
    setDeleteAppError(null)
    const res = await fetch(`/api/admin/applications/${app.id}`, { method: 'DELETE' })
    if (res.ok) { setDeleteAppConfirm(null); setExpanded(null); setEditingApp(null); loadApps() }
    else setDeleteAppError('Failed to delete.')
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
    const res = await fetch(`/api/admin/applications/${appId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    setSavingApp(false)
    if (!res.ok) { const d = await res.json(); setSaveAppErr(d.error || 'Failed to save.'); return }
    setApps(prev => prev.map(a => a.id === appId ? { ...a, ...payload } : a))
    setEditingApp(null)
  }

  async function toggleAttended(appId, eventName, value) {
    const app = apps.find(a => a.id === appId)
    if (!app) return
    const existing = app.registrations || []
    const idx = existing.findIndex(r => r.event === eventName)
    let newRegs
    if (idx !== -1) {
      newRegs = existing.map((r, i) =>
        i === idx ? { ...r, attended: r.attended === value ? null : value } : r
      )
    } else {
      newRegs = [...existing, { event: eventName, registered_at: null, attended: value }]
    }
    const res = await fetch(`/api/admin/applications/${appId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrations: newRegs }),
    })
    if (res.ok) setApps(prev => prev.map(a => a.id === appId ? { ...a, registrations: newRegs } : a))
  }

  async function sendInvite(app, tier = 'routes_member') {
    setInviting(app.id)
    setAppTierPick(null)
    const payload = {
      name: app.name, email: app.email, membership_status: 'pending', tier,
      dob_month: app.dob_month || null, dob_day: app.dob_day || null, dob_year: app.dob_year || null,
      phone: app.phone || null, instagram: app.instagram || null,
      cars: (app.car_year || app.car_model)
        ? [{ year: app.car_year || '', make: '', model: app.car_model || '', license_plate: '' }]
        : undefined,
    }
    const res = await fetch('/api/admin/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await res.json()
    setInviting(null)
    if (res.ok) {
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, is_member: true } : a))
      setInviteStatus(p => ({ ...p, [app.id]: 'success' }))
    } else {
      setInviteStatus(p => ({ ...p, [app.id]: data.error || 'Failed.' }))
    }
  }

  async function addToContact(appId) {
    setAddingContact(prev => new Set([...prev, appId]))
    const res = await fetch('/api/admin/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: appId })
    })
    setAddingContact(prev => { const n = new Set(prev); n.delete(appId); return n })
    if (res.ok) loadApps()
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
    setEmailComposerId(a.id)
  }

  async function generateEmail(appId) {
    setEmailGenerating(true)
    setEmailResult(null)
    try {
      const res = await fetch(`/api/admin/applications/${appId}/generate-email`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.body) {
        setEmailSubject(d.subject || emailSubject)
        setEmailBody(d.body)
      } else {
        setEmailResult({ id: appId, error: d.error || 'Failed to generate email.' })
      }
    } catch {
      setEmailResult({ id: appId, error: 'Failed to generate email.' })
    }
    setEmailGenerating(false)
  }

  async function sendEmail(appId) {
    setEmailSending(true)
    setEmailResult(null)
    const res = await fetch(`/api/admin/applications/${appId}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: emailSubject, body: emailBody }),
    })
    const d = await res.json().catch(() => ({}))
    setEmailSending(false)
    if (res.ok && !d.error) {
      setEmailResult({ id: appId, success: true })
      setTimeout(() => { setEmailComposerId(null); setEmailResult(null) }, 2500)
    } else {
      setEmailResult({ id: appId, error: d.error || 'Failed to send.' })
    }
  }

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const filtered = apps
    .filter(a => {
      if (showFilter === 'unseen' && seenAppIds.has(a.id)) return false
      if (showFilter === 'pending' && a.is_member) return false
      return !search || [a.name, a.email, a.car_year, a.car_model, a.source, a.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())) || (search.replace(/\D/g,'') && a.phone?.replace(/\D/g,'').includes(search.replace(/\D/g,'')))
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
      Source: a.source || '',
      Applied: a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA') : '',
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
    const emails = filtered.map(a => a.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setEmailsCopied(true)
      setTimeout(() => setEmailsCopied(false), 1500)
    }).catch(() => {})
  }
  const unseenCount = apps.filter(a => !seenAppIds.has(a.id)).length

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

  return (
    <div>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {apps.length} application{apps.length !== 1 ? 's' : ''}
          </div>
          {apps.length > 0 && (
            <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              Export CSV
            </button>
          )}
          {apps.length > 0 && (
            <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {emailsCopied ? 'Copied!' : 'Copy Emails'}
            </button>
          )}
          {filtered.length > 0 && (
            <ExportButton
              filename="applications"
              title="Applications"
              headers={['Name', 'Email', 'Phone', 'Car Year', 'Car Model', 'Tier', 'Source', 'Payment Status', 'Amount Paid', 'Registered']}
              rows={filtered.map(a => [
                a.name || '',
                a.email || '',
                a.phone || '',
                a.car_year || '',
                a.car_model || '',
                a.registrations?.find(r => r.event === 'Canvas Routes Membership')?.tier || '',
                a.source || '',
                a.stripe_payment_status || '',
                a.stripe_amount_paid ? `$${(a.stripe_amount_paid / 100).toFixed(2)}` : '',
                a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA') : '',
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
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', ...(isMobile ? {} : { minWidth: '700px' }) }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
              {['Name', 'Email', 'Car', 'DOB', 'Date', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
              ))}
            </div>
          )}

          {filtered.map((a, idx) => (
            <div key={a.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {/* Summary row */}
              {(() => {
                const isGreyed = a.is_contact && !a.reregistered_at
                const handleRowClick = () => {
                  setExpanded(expanded === a.id ? null : a.id)
                  if (editingApp === a.id) setEditingApp(null)
                  if (appTierPick === a.id) setAppTierPick(null)
                  if (a.reregistered_at) {
                    setApps(prev => prev.map(x => x.id === a.id ? { ...x, reregistered_at: null } : x))
                    fetch(`/api/admin/applications/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reregistered_at: null }) })
                  }
                }
                const inviteCell = (
                  <div onClick={e => e.stopPropagation()}>
                    {a.is_member || inviteStatus[a.id] === 'success' ? (
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>Invited</span>
                    ) : appTierPick === a.id ? (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <button onClick={() => sendInvite(a, 'routes_member')}
                          style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                          Routes
                        </button>
                        <button onClick={() => sendInvite(a, 'inner_circle')}
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
                    )}
                  </div>
                )
                if (isMobile) {
                  return (
                    <div style={{ padding: '0.85rem 1rem', cursor: 'pointer', background: isGreyed ? 'rgba(0,0,0,0.025)' : undefined }} onClick={handleRowClick}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', minWidth: 0 }}>
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
                        <span style={{ fontSize: '11px', color: '#bbb' }}>{new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  )
                }
                return (
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.85rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: isGreyed ? 'rgba(0,0,0,0.025)' : undefined }}
                  onClick={handleRowClick}
                >
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
                    {(() => { const {make,model} = parseCarMakeModel(a.car_model); return [a.car_year, make, model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span> })()}
                  </div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>
                    {a.dob_month ? `${MONTHS_SHORT[a.dob_month - 1]} ${a.dob_day}${a.dob_year ? `, ${a.dob_year}` : ''}` : <span style={{ color: '#ddd' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>
                    {new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {inviteCell}
                </div>
                )
              })()}

              {/* Expanded panel */}
              {expanded === a.id && (
                <div style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {editingApp === a.id ? (
                    /* ── Edit mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.5fr 90px 1.5fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><L>Name</L><input style={inp} value={editAppForm.name} onChange={e => setEditAppForm(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><L>Car Year</L><input style={inp} value={editAppForm.car_year} onChange={e => setEditAppForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
                        <div><L>Make</L><div style={{ position: 'relative' }}><select style={sel} value={editAppForm.car_make || ''} onChange={e => setEditAppForm(p => ({ ...p, car_make: e.target.value }))}><option value="">Select</option>{CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select><svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>
                        <div><L>Model</L><input style={inp} value={editAppForm.car_model} onChange={e => setEditAppForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. M3 Competition" maxLength={80} /></div>
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
                        <InfoCell label="Phone" value={a.phone} copyable />
                        <InfoCell label="Instagram" value={a.instagram ? `@${a.instagram}` : null} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <InfoCell label="DOB" value={a.dob_month ? `${MONTHS_SHORT[a.dob_month - 1]} ${a.dob_day}${a.dob_year ? `, ${a.dob_year}` : ''}` : null} />
                        <InfoCell label="How they heard" value={a.source} />
                        <InfoCell label="Applied" value={new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} />
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
                        const isNA = isPast && (!reg || (reg.registered_at === null && reg.attended === null))
                        return (
                          <div key={eventName} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: '#444', minWidth: isMobile ? '0' : '260px' }}>{eventName}</span>
                            {reg?.registered_at && (
                              <span style={{ fontSize: '11px', color: '#bbb' }}>
                                {new Date(reg.registered_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {isNA ? (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>N/A</span>
                            ) : isPast ? (
                              <>
                                <button onClick={() => toggleAttended(a.id, eventName, true)}
                                  style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: reg?.attended === true ? '0.5px solid #3B6B2F' : '0.5px solid rgba(0,0,0,0.14)', background: reg?.attended === true ? 'rgba(59,107,47,0.1)' : 'transparent', color: reg?.attended === true ? '#3B6B2F' : '#888' }}>
                                  ✓ Attended
                                </button>
                                <button onClick={() => toggleAttended(a.id, eventName, false)}
                                  style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: reg?.attended === false ? '0.5px solid #7B2032' : '0.5px solid rgba(0,0,0,0.14)', background: reg?.attended === false ? 'rgba(123,32,50,0.08)' : 'transparent', color: reg?.attended === false ? '#7B2032' : '#888' }}>
                                  ✗ No-show
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>Upcoming</span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {/* Admin Notes */}
                  {editingApp !== a.id && (
                    <AppAdminNotes key={a.id} appId={a.id} initialNotes={a.admin_notes} onSaved={notes => setApps(prev => prev.map(x => x.id === a.id ? { ...x, admin_notes: notes } : x))} />
                  )}

                  {/* Action row */}
                  {editingApp !== a.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {!a.is_contact ? (
                          <GhostBtn onClick={() => addToContact(a.id)} small disabled={addingContact.has(a.id)}>
                            {addingContact.has(a.id) ? '…' : 'Add to Contacts'}
                          </GhostBtn>
                        ) : (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>✓ In Contacts</span>
                        )}
                        <GhostBtn small onClick={() => emailComposerId === a.id ? setEmailComposerId(null) : openEmailComposer(a)}>
                          {emailComposerId === a.id ? 'Cancel Email' : '✉ Send Email'}
                        </GhostBtn>
                        {!seenAppIds.has(a.id) && (
                          <GhostBtn small onClick={() => { markSeen(a.id); setExpanded(null) }}>Mark as Seen</GhostBtn>
                        )}
                        {seenAppIds.has(a.id) && !a.is_contact && !a.is_member && (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Reviewed</span>
                        )}
                        <GhostBtn onClick={() => startEditApp(a)} small>Edit</GhostBtn>
                        <DangerBtn small onClick={() => setDeleteAppConfirm(a.id)}>Delete</DangerBtn>
                      </div>
                      {deleteAppConfirm === a.id && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete application from {a.name || a.email}?</span>
                          <GhostBtn small onClick={() => deleteApp(a)}>Confirm</GhostBtn>
                          <GhostBtn small onClick={() => { setDeleteAppConfirm(null); setDeleteAppError(null) }}>Cancel</GhostBtn>
                          {deleteAppError && <Err msg={deleteAppError} />}
                        </div>
                      )}

                      {/* Email composer */}
                      {emailComposerId === a.id && (
                        <div style={{ marginTop: '1rem', padding: '1.25rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                          <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.75rem' }}>
                            From: Jerry — Canvas Routes &lt;jerry@canvasroutes.com&gt; &nbsp;·&nbsp; To: {a.email}
                          </div>
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
                                style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '3px 10px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: emailGenerating ? 'default' : 'pointer', color: emailGenerating ? '#bbb' : '#555', display: 'flex', alignItems: 'center', gap: '5px', transition: 'border-color 0.15s' }}
                              >
                                {emailGenerating ? '…writing' : '✦ Write with AI'}
                              </button>
                            </div>
                            <textarea
                              style={{ ...inp, height: '220px', resize: 'vertical', lineHeight: '1.65' }}
                              value={emailBody}
                              onChange={e => setEmailBody(e.target.value)}
                              placeholder="Email body…"
                            />
                            <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.3rem' }}>
                              Double line breaks become paragraphs. Review and edit before sending.
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <PrimaryBtn
                              onClick={() => sendEmail(a.id)}
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
    </div>
  )
}
