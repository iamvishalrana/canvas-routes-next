'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CAR_MAKES, MONTHS, DOB_YEARS, CANONICAL_EVENTS,
  normalizeEventName, parseCarMakeModel,
  inp, sel, L, CopyBtn, AdminNotesPanel,
  GhostBtn, PrimaryBtn, DangerBtn, Err,
} from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'

// ─── App sources (shared with Applications tab) ───────────────────────────────

const APP_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']

// ─── Admin notes wired to the applications API ────────────────────────────────

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

// ─── VCard download button (hover-safe) ──────────────────────────────────────

function VCardBtn({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title="Save to Contacts (.vcf)"
      style={{ background: 'none', border: `0.5px solid ${hovered ? '#c5a882' : 'rgba(0,0,0,0.15)'}`, borderRadius: '3px', padding: '0.28rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', transition: 'border-color 0.15s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </button>
  )
}

// ─── Contacts Client ──────────────────────────────────────────────────────────

export default function ContactsClient() {
  const searchParams = useSearchParams()
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [sortContacts, setSortContacts] = useState('name_az')
  const [selected, setSelected] = useState(new Set())
  const [emailsCopied, setEmailsCopied] = useState(false)
  const [contactInviteStatus, setContactInviteStatus] = useState({}) // keyed by contact_id: 'sending'|'sent'|'error'
  const [contactTierPick, setContactTierPick] = useState(null) // contact_id being tier-picked
  const [contactInviteConfirm, setContactInviteConfirm] = useState(null) // { contact, tier }
  const [editingContact, setEditingContact] = useState(null) // contact_id
  const [editContactForm, setEditContactForm] = useState({})
  const [savingContact, setSavingContact] = useState(false)
  const [saveContactErr, setSaveContactErr] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', car_year: '', car_make: '', car_model: '' })
  const [newErr, setNewErr] = useState(null)
  const [savingNew, setSavingNew] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [removeContactConfirm, setRemoveContactConfirm] = useState(null)
  const [removeContactError, setRemoveContactError] = useState(null)
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false)
  const letterRefsMap = useRef({})
  const lastTouchedLetter = useRef(null)

  function getFirstLetter(name) {
    const ch = (name || '').trim()[0]?.toUpperCase()
    return (ch && /[A-Z]/.test(ch)) ? ch : '#'
  }

  function scrollToLetter(letter) {
    const el = letterRefsMap.current[letter]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleAlphaTouch(e) {
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const letter = el?.dataset?.alphaLetter
    if (letter && letter !== lastTouchedLetter.current) {
      lastTouchedLetter.current = letter
      scrollToLetter(letter)
    }
  }

  function downloadVCard(c) {
    const esc = v => (v || '').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
    const nameParts = (c.name || '').trim().split(' ')
    const first = nameParts[0] || ''
    const last = nameParts.slice(1).join(' ') || ''
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${esc(c.name)}`,
      `N:${esc(last)};${esc(first)};;;`,
      c.email ? `EMAIL;TYPE=INTERNET:${c.email}` : null,
      c.phone ? `TEL;TYPE=CELL,VOICE:${c.phone}` : null,
      c.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${c.instagram}` : null,
      `NOTE:Canvas Routes${c.car_year || c.car_model ? ` · ${[c.car_year, c.car_model].filter(Boolean).join(' ')}` : ''}`,
      (c.dob_year && c.dob_month && c.dob_day) ? `BDAY:${c.dob_year}-${String(c.dob_month).padStart(2,'0')}-${String(c.dob_day).padStart(2,'0')}` : null,
      'END:VCARD',
    ].filter(Boolean).join('\r\n')
    const blob = new Blob([lines], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(c.name || 'contact').replace(/\s+/g, '_')}.vcf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/contacts')
      const data = await res.json().catch(() => [])
      setContacts(Array.isArray(data) ? data : [])
    } catch {
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  async function removeContact(contactId) {
    setRemoveContactError(null)
    const res = await fetch(`/api/admin/contacts/${contactId}`, { method: 'DELETE' })
    if (res.ok) { setRemoveContactConfirm(null); setSelected(prev => { const n = new Set(prev); n.delete(contactId); return n }); loadContacts() }
    else setRemoveContactError('Failed to remove contact.')
  }

  async function inviteContact(c, tier = 'routes_member') {
    setContactInviteStatus(p => ({ ...p, [c.contact_id]: 'sending' }))
    const { make: cMake, model: cModel } = parseCarMakeModel(c.car_model)
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: c.name,
        email: c.email,
        membership_status: 'pending',
        tier,
        phone: c.phone || null,
        instagram: c.instagram || null,
        dob_month: c.dob_month || null,
        dob_day: c.dob_day || null,
        dob_year: c.dob_year || null,
        cars: (c.car_year || c.car_model)
          ? [{ year: c.car_year || '', make: cMake || '', model: cModel || '', license_plate: '', paint: c.car_paint || '' }]
          : undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setContactInviteStatus(p => ({ ...p, [c.contact_id]: 'sent' }))
      setContacts(prev => prev.map(x => x.contact_id === c.contact_id ? { ...x, is_invited: true } : x))
    } else {
      setContactInviteStatus(p => ({ ...p, [c.contact_id]: data.error || 'Error' }))
      setTimeout(() => setContactInviteStatus(p => { const n = {...p}; delete n[c.contact_id]; return n }), 4000)
    }
  }

  async function deleteSelected() {
    if (!selected.size) return
    await Promise.all([...selected].map(id => fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' })))
    setSelected(new Set())
    setDeleteSelectedConfirm(false)
    loadContacts()
  }

  function startEditContact(c) {
    setEditingContact(c.contact_id)
    setSaveContactErr(null)
    const { make: cMake, model: cModel } = parseCarMakeModel(c.car_model)
    setEditContactForm({
      name: c.name || '',
      car_year: c.car_year || '',
      car_make: cMake,
      car_model: cModel,
      car_paint: c.car_paint || '',
      phone: c.phone || '',
      instagram: c.instagram || '',
      dob_month: c.dob_month ? String(c.dob_month) : '',
      dob_day: c.dob_day ? String(c.dob_day) : '',
      dob_year: c.dob_year ? String(c.dob_year) : '',
      source: c.source || '',
      more: c.more || '',
    })
  }

  async function saveContact(c) {
    setSavingContact(true); setSaveContactErr(null)
    const payload = {
      ...editContactForm,
      car_model: [editContactForm.car_make, editContactForm.car_model].filter(Boolean).join(' '),
      dob_month: editContactForm.dob_month ? parseInt(editContactForm.dob_month) : null,
      dob_day: editContactForm.dob_day ? parseInt(editContactForm.dob_day) : null,
      dob_year: editContactForm.dob_year ? parseInt(editContactForm.dob_year) : null,
    }
    const res = await fetch(`/api/admin/applications/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    setSavingContact(false)
    if (!res.ok) { const d = await res.json(); setSaveContactErr(d.error || 'Failed to save.'); return }
    setContacts(prev => prev.map(x => x.contact_id === c.contact_id ? { ...x, ...payload } : x))
    setEditingContact(null)
  }

  async function toggleAttended(appId, eventName, value) {
    const contact = contacts.find(c => c.id === appId)
    if (!contact) return
    const existing = contact.registrations || []
    const idx = existing.findIndex(r => r.event === eventName)
    let newRegs
    if (idx !== -1) {
      newRegs = existing.map((r, i) => i === idx ? { ...r, attended: r.attended === value ? null : value } : r)
    } else {
      newRegs = [...existing, { event: eventName, registered_at: null, attended: value }]
    }
    const res = await fetch(`/api/admin/applications/${appId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrations: newRegs }),
    })
    if (res.ok) setContacts(prev => prev.map(c => c.id === appId ? { ...c, registrations: newRegs } : c))
  }

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  function exportCSV() {
    const source = selected.size > 0 ? contacts.filter(c => selected.has(c.contact_id)) : contacts
    const rows = source.map(c => ({
      Name: c.name || '',
      Email: c.email || '',
      Phone: c.phone || '',
      Instagram: c.instagram ? `@${c.instagram}` : '',
      Car: [c.car_year, c.car_model].filter(Boolean).join(' '),
      DOB: c.dob_month ? `${MONTHS_SHORT[c.dob_month - 1]} ${c.dob_day}${c.dob_year ? ` ${c.dob_year}` : ''}` : '',
      Source: c.source || '',
      Applied: c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA') : '',
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `canvas-routes-contacts-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function saveNote(contactId, value, email) {
    const trimmed = value.trim()
    await fetch(`/api/admin/contacts/${contactId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: trimmed || null, email: email || undefined }),
    })
    setContacts(prev => prev.map(x => x.contact_id === contactId ? { ...x, notes: trimmed || null } : x))
    setEditingNote(null)
  }

  async function addNewContact(e) {
    e.preventDefault()
    setNewErr(null)
    if (!newForm.name.trim() || !newForm.email.trim()) { setNewErr('Name and email are required.'); return }
    setSavingNew(true)
    const res = await fetch('/api/admin/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, car_model: [newForm.car_make, newForm.car_model].filter(Boolean).join(' ') }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingNew(false)
    if (!res.ok) { setNewErr(data.error || 'Failed to add contact.'); return }
    setAddingNew(false)
    setNewForm({ name: '', email: '', phone: '', car_year: '', car_make: '', car_model: '' })
    loadContacts()
  }

  const filtered = contacts
    .filter(c => !search || [c.name, c.email, c.car_year, c.car_model, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())) || (search.replace(/\D/g,'') && c.phone?.replace(/\D/g,'').includes(search.replace(/\D/g,''))))
    .sort((a, b) => {
      if (sortContacts === 'name_az') return (a.name || '').localeCompare(b.name || '')
      if (sortContacts === 'name_za') return (b.name || '').localeCompare(a.name || '')
      if (sortContacts === 'newest') return new Date(b.contact_created_at || b.created_at) - new Date(a.contact_created_at || a.created_at)
      if (sortContacts === 'oldest') return new Date(a.contact_created_at || a.created_at) - new Date(b.contact_created_at || b.created_at)
      return 0
    })

  function copyEmails() {
    const source = selected.size > 0 ? contacts.filter(c => selected.has(c.contact_id)) : filtered
    const emails = source.map(c => c.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setEmailsCopied(true)
      setTimeout(() => setEmailsCopied(false), 1500)
    }).catch(() => {})
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      {/* Invite confirm overlay */}
      {contactInviteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '0.5rem', fontWeight: '500' }}>Send invite?</div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '1.5rem' }}>
              This will send a membership invitation email to <strong>{contactInviteConfirm.contact.name || contactInviteConfirm.contact.email}</strong> as a <strong>{contactInviteConfirm.tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'}</strong>.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <PrimaryBtn onClick={() => { const { contact, tier } = contactInviteConfirm; setContactInviteConfirm(null); inviteContact(contact, tier) }}>Confirm &amp; Send</PrimaryBtn>
              <GhostBtn onClick={() => setContactInviteConfirm(null)}>Cancel</GhostBtn>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Contacts</h1>
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Contacts', value: contacts.length, color: '#1a1a1a' },
          { label: 'Invited to Membership', value: contacts.filter(c => c.is_invited).length, color: '#3B6B2F' },
          { label: 'Has Car Info', value: contacts.filter(c => c.car_year || c.car_model).length, color: '#8A6535' },
          { label: 'With Email', value: contacts.filter(c => c.email).length, color: '#1a1a1a' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
          <span style={{ fontSize: '11px', color: '#8A6535', letterSpacing: '0.06em' }}>{selected.size} selected</span>
          <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.35)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Export CSV</button>
          <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>{emailsCopied ? 'Copied!' : 'Copy Emails'}</button>
          {deleteSelectedConfirm ? (
            <>
              <span style={{ fontSize: '11px', color: '#7B2032' }}>Remove {selected.size} contact{selected.size > 1 ? 's' : ''}?</span>
              <GhostBtn small onClick={deleteSelected}>Confirm</GhostBtn>
              <GhostBtn small onClick={() => setDeleteSelectedConfirm(false)}>Cancel</GhostBtn>
            </>
          ) : (
            <button onClick={() => setDeleteSelectedConfirm(true)} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B2032', background: 'none', border: '0.5px solid rgba(123,32,50,0.3)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Remove</button>
          )}
          <button onClick={() => setSelected(new Set())} style={{ fontSize: '10px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginLeft: 'auto' }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </div>
          {contacts.length > 0 && selected.size === 0 && (
            <ExportButton
              filename="contacts"
              title="Contacts"
              headers={['Name', 'Email', 'Phone', 'Car', 'Source', 'Notes', 'Created']}
              rows={filtered.map(c => [
                c.name || '',
                c.email || '',
                c.phone || '',
                [c.car_year, c.car_model].filter(Boolean).join(' '),
                c.source || '',
                c.notes || '',
                c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA') : '',
              ])}
              style={{ padding: '4px 10px', fontSize: '10px' }}
            />
          )}
          {contacts.length > 0 && selected.size === 0 && (
            <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {emailsCopied ? 'Copied!' : 'Copy Emails'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined }}>
          <button onClick={() => { setAddingNew(v => !v); setNewErr(null) }}
            style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: addingNew ? '#7B2032' : '#3B6B2F', background: 'none', border: `0.5px solid ${addingNew ? 'rgba(123,32,50,0.35)' : 'rgba(59,107,47,0.35)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
            {addingNew ? 'Cancel' : '+ New Contact'}
          </button>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select value={sortContacts} onChange={e => setSortContacts(e.target.value)}
              style={{ ...sel, width: '160px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="name_az">Name A → Z</option>
              <option value="name_za">Name Z → A</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
            <input style={{ ...inp, width: '100%', paddingRight: search ? '2rem' : undefined }} placeholder="Search name, email, car…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
          </div>
        </div>
      </div>

      {addingNew && (
        <form onSubmit={addNewContact} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: '1rem' }}>New Contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div><L>Name *</L><input style={inp} value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" maxLength={100} /></div>
            <div><L>Email *</L><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" maxLength={254} /></div>
            <div><L>Phone</L><input style={inp} value={newForm.phone} onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))} placeholder="(514) 000-0000" maxLength={30} /></div>
            <div><L>Car Year</L><input style={inp} value={newForm.car_year} onChange={e => setNewForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
            <div><L>Make</L><div style={{ position: 'relative' }}><select style={sel} value={newForm.car_make} onChange={e => setNewForm(p => ({ ...p, car_make: e.target.value }))}><option value="">Select</option>{CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select><svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>
            <div style={{ gridColumn: isMobile ? undefined : 'span 2' }}><L>Model</L><input style={inp} value={newForm.car_model} onChange={e => setNewForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. M3 Competition" maxLength={80} /></div>
          </div>
          {newErr && <div style={{ fontSize: '11px', color: '#7B2032', marginBottom: '0.75rem' }}>{newErr}</div>}
          <button type="submit" disabled={savingNew}
            style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', background: '#1a1a1a', border: 'none', padding: '8px 20px', cursor: savingNew ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {savingNew ? 'Adding…' : 'Add Contact'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No contacts yet.</div>
      ) : (
        <>
        {/* A–Z index strip — mobile only, alphabetical sort only */}
        {isMobile && sortContacts === 'name_az' && (() => {
          const ALPHA = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
          const presentLetters = new Set(filtered.map(c => getFirstLetter(c.name)))
          return (
            <div
              style={{ position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0', background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: '10px 0 0 10px', border: '0.5px solid rgba(0,0,0,0.09)', borderRight: 'none', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              onTouchStart={e => { lastTouchedLetter.current = null; handleAlphaTouch(e) }}
              onTouchMove={handleAlphaTouch}
              onTouchEnd={() => { lastTouchedLetter.current = null }}
            >
              {ALPHA.map(letter => (
                <div key={letter} data-alpha-letter={letter}
                  onClick={() => scrollToLetter(letter)}
                  style={{ fontSize: '10px', fontWeight: '600', fontFamily: 'var(--font-inter),sans-serif', color: presentLetters.has(letter) ? '#1a1a1a' : 'rgba(0,0,0,0.18)', padding: '2px 8px', lineHeight: 1.5, cursor: presentLetters.has(letter) ? 'pointer' : 'default', minWidth: '24px', textAlign: 'center' }}>
                  {letter}
                </div>
              ))}
            </div>
          )
        })()}
        <div style={isMobile ? { paddingRight: isMobile && sortContacts === 'name_az' ? '28px' : 0 } : { overflowX: 'auto' }}>
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', ...(isMobile ? {} : { minWidth: '700px' }) }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 140px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9', alignItems: 'center' }}>
              <input type="checkbox"
                checked={filtered.length > 0 && filtered.every(c => selected.has(c.contact_id))}
                ref={el => { if (el) el.indeterminate = filtered.some(c => selected.has(c.contact_id)) && !filtered.every(c => selected.has(c.contact_id)) }}
                onChange={e => {
                  if (e.target.checked) setSelected(prev => new Set([...prev, ...filtered.map(c => c.contact_id)]))
                  else setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.delete(c.contact_id)); return n })
                }}
                style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
              />
              {['Name', 'Email', 'Car', 'DOB', 'Applied', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
              ))}
            </div>
          )}

          {filtered.flatMap((c, idx) => {
            const showLetterHeader = isMobile && sortContacts === 'name_az'
            const letter = getFirstLetter(c.name)
            const prevLetter = idx > 0 ? getFirstLetter(filtered[idx - 1].name) : null
            const header = showLetterHeader && letter !== prevLetter ? (
              <div key={`lh-${letter}`}
                ref={el => { if (el) letterRefsMap.current[letter] = el }}
                style={{ padding: '0.3rem 1rem 0.2rem', background: '#f5f4f2', borderBottom: '0.5px solid rgba(0,0,0,0.07)', fontSize: '11px', fontWeight: '600', color: '#888', letterSpacing: '0.1em', fontFamily: 'var(--font-inter),sans-serif' }}>
                {letter}
              </div>
            ) : null
            return [header, (  // header is null when no letter divider needed — filter(Boolean) below removes it
            <div key={c.contact_id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {/* Summary row */}
              {isMobile ? (
                <div style={{ padding: '0.85rem 1rem', cursor: 'pointer', background: selected.has(c.contact_id) ? 'rgba(123,32,50,0.03)' : undefined }}
                  onClick={() => { setExpanded(expanded === c.contact_id ? null : c.contact_id); if (editingContact === c.contact_id) setEditingContact(null); if (contactTierPick === c.contact_id) setContactTierPick(null) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={selected.has(c.contact_id)}
                        onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(c.contact_id) : n.delete(c.contact_id); return n })}
                        style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{c.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                          {c.is_invited && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.4)', padding: '1px 6px', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Member</span>}
                        </div>
                        {c.notes && <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '2px' }}>{c.notes}</div>}
                      </div>
                    </div>
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {c.is_invited || contactInviteStatus[c.contact_id] === 'sent' ? (
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', padding: '3px 8px', border: '0.5px solid rgba(59,107,47,0.3)', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Invited</span>
                      ) : contactTierPick === c.contact_id ? (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <button onClick={() => { setContactInviteConfirm({ contact: c, tier: 'routes_member' }); setContactTierPick(null) }}
                            style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                            Routes
                          </button>
                          <button onClick={() => { setContactInviteConfirm({ contact: c, tier: 'inner_circle' }); setContactTierPick(null) }}
                            style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                            Inner Circle
                          </button>
                          <button onClick={() => setContactTierPick(null)}
                            style={{ fontSize: '11px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setContactTierPick(c.contact_id)}
                          disabled={contactInviteStatus[c.contact_id] === 'sending'}
                          style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 8px', cursor: contactInviteStatus[c.contact_id] === 'sending' ? 'wait' : 'pointer', color: contactInviteStatus[c.contact_id] === 'error' || typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? '#7B2032' : '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}
                        >
                          {contactInviteStatus[c.contact_id] === 'sending' ? '…' : typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? 'Error' : 'Invite'}
                        </button>
                      )}
                      <button onClick={() => downloadVCard(c)} title="Save .vcf"
                        style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '3px', padding: '0.28rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{c.email}<CopyBtn value={c.email} /></div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{(() => { const {make,model} = parseCarMakeModel(c.car_model); return [c.car_year, make, model].filter(Boolean).join(' ') || '—' })()}</span>
                    {c.created_at && <span style={{ fontSize: '11px', color: '#bbb' }}>{new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </div>
              ) : (
              <div
                style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 140px', padding: '0.85rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: selected.has(c.contact_id) ? 'rgba(123,32,50,0.03)' : undefined }}
                onClick={() => { setExpanded(expanded === c.contact_id ? null : c.contact_id); if (editingContact === c.contact_id) setEditingContact(null); if (contactTierPick === c.contact_id) setContactTierPick(null) }}
              >
                <div onClick={e => e.stopPropagation()}>
                  <input type="checkbox"
                    checked={selected.has(c.contact_id)}
                    onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(c.contact_id) : n.delete(c.contact_id); return n })}
                    style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{c.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                    {c.is_invited && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.4)', padding: '1px 6px', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Member</span>}
                  </div>
                  {c.notes && <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '2px' }}>{c.notes}</div>}
                </div>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{c.email}<CopyBtn value={c.email} /></div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {[c.car_year, c.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {c.dob_month ? `${MONTHS_SHORT[c.dob_month - 1]} ${c.dob_day}${c.dob_year ? `, ${c.dob_year}` : ''}` : <span style={{ color: '#ddd' }}>—</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#bbb' }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {c.is_invited || contactInviteStatus[c.contact_id] === 'sent' ? (
                    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', padding: '3px 8px', border: '0.5px solid rgba(59,107,47,0.3)', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Invited</span>
                  ) : contactTierPick === c.contact_id ? (
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <button onClick={() => { setContactInviteConfirm({ contact: c, tier: 'routes_member' }); setContactTierPick(null) }}
                        style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                        Routes
                      </button>
                      <button onClick={() => { setContactInviteConfirm({ contact: c, tier: 'inner_circle' }); setContactTierPick(null) }}
                        style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                        Inner Circle
                      </button>
                      <button onClick={() => setContactTierPick(null)}
                        style={{ fontSize: '11px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setContactTierPick(c.contact_id)}
                      disabled={contactInviteStatus[c.contact_id] === 'sending'}
                      style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 8px', cursor: contactInviteStatus[c.contact_id] === 'sending' ? 'wait' : 'pointer', color: contactInviteStatus[c.contact_id] === 'error' || typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? '#7B2032' : '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}
                    >
                      {contactInviteStatus[c.contact_id] === 'sending' ? '…' : typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? 'Error' : 'Invite'}
                    </button>
                  )}
                  <VCardBtn onClick={() => downloadVCard(c)} />
                </div>
              </div>
              )}

              {/* Expanded panel */}
              {expanded === c.contact_id && (
                <div style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {editingContact === c.contact_id ? (
                    /* ── Edit mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.5fr 90px 1.5fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><L>Name</L><input style={inp} value={editContactForm.name} onChange={e => setEditContactForm(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><L>Car Year</L><input style={inp} value={editContactForm.car_year} onChange={e => setEditContactForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
                        <div><L>Make</L><div style={{ position: 'relative' }}><select style={sel} value={editContactForm.car_make || ''} onChange={e => setEditContactForm(p => ({ ...p, car_make: e.target.value }))}><option value="">Select</option>{CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select><svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>
                        <div><L>Model</L><input style={inp} value={editContactForm.car_model} onChange={e => setEditContactForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. M3 Competition" maxLength={80} /></div>
                        <div><L>Paint</L><input style={inp} value={editContactForm.car_paint || ''} onChange={e => setEditContactForm(p => ({ ...p, car_paint: e.target.value }))} placeholder="e.g. Nardo Grey" maxLength={60} /></div>
                        <div><L>Phone</L><input style={inp} type="tel" value={editContactForm.phone} onChange={e => setEditContactForm(p => ({ ...p, phone: e.target.value }))} maxLength={30} /></div>
                        <div><L>Instagram</L><input style={inp} value={editContactForm.instagram} onChange={e => setEditContactForm(p => ({ ...p, instagram: e.target.value }))} placeholder="handle" maxLength={50} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 2fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div>
                          <L>DOB Month</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.dob_month} onChange={e => setEditContactForm(p => ({ ...p, dob_month: e.target.value }))}>
                              <option value="">Month</option>
                              {MONTHS.map((mo, i) => <option key={i+1} value={String(i+1)}>{mo}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Day</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.dob_day} onChange={e => setEditContactForm(p => ({ ...p, dob_day: e.target.value }))}>
                              <option value="">Day</option>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Year</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.dob_year} onChange={e => setEditContactForm(p => ({ ...p, dob_year: e.target.value }))}>
                              <option value="">Year</option>
                              {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>How did they hear</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.source} onChange={e => setEditContactForm(p => ({ ...p, source: e.target.value }))}>
                              <option value="">Select…</option>
                              {APP_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <L>Tell us more</L>
                        <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editContactForm.more} onChange={e => setEditContactForm(p => ({ ...p, more: e.target.value }))} maxLength={500} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <PrimaryBtn onClick={() => saveContact(c)} disabled={savingContact}>{savingContact ? 'Saving…' : 'Save'}</PrimaryBtn>
                        <GhostBtn onClick={() => setEditingContact(null)}>Cancel</GhostBtn>
                      </div>
                      {saveContactErr && <Err msg={saveContactErr} />}
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Name</div>
                          <div style={{ fontSize: '13px', color: c.name ? '#444' : '#ddd' }}>{c.name || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Car Year</div>
                          <div style={{ fontSize: '13px', color: c.car_year ? '#444' : '#ddd' }}>{c.car_year || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Car Make & Model</div>
                          <div style={{ fontSize: '13px', color: c.car_model ? '#444' : '#ddd' }}>{c.car_model || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Phone</div>
                          <div style={{ fontSize: '13px', color: c.phone ? '#444' : '#ddd', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><span>{c.phone || '—'}</span><CopyBtn value={c.phone} /></div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Instagram</div>
                          <div style={{ fontSize: '13px', color: c.instagram ? '#444' : '#ddd', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {c.instagram ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                                </svg>
                                <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" style={{ color: '#444', textDecoration: 'none' }}>@{c.instagram}</a>
                              </>
                            ) : '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>DOB</div>
                          <div style={{ fontSize: '13px', color: c.dob_month ? '#444' : '#ddd' }}>
                            {c.dob_month ? `${MONTHS_SHORT[c.dob_month - 1]} ${c.dob_day}${c.dob_year ? `, ${c.dob_year}` : ''}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>How they heard</div>
                          <div style={{ fontSize: '13px', color: c.source ? '#444' : '#ddd' }}>{c.source || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Applied</div>
                          <div style={{ fontSize: '13px', color: '#444' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                        </div>
                      </div>
                      {c.more && (
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Tell us more</div>
                          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.65' }}>{c.more}</div>
                        </div>
                      )}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>Quick Note</div>
                        {editingNote === c.contact_id ? (
                          <div>
                            <input autoFocus value={noteValue} maxLength={200}
                              onChange={e => setNoteValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveNote(c.contact_id, noteValue, c.email); if (e.key === 'Escape') setEditingNote(null) }}
                              style={{ ...inp, fontSize: '13px', marginBottom: '0.5rem' }}
                              placeholder="e.g. Steve — Rangers business" />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <GhostBtn small onClick={() => saveNote(c.contact_id, noteValue, c.email)}>Save</GhostBtn>
                              <GhostBtn small onClick={() => setEditingNote(null)}>Cancel</GhostBtn>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => { setEditingNote(c.contact_id); setNoteValue(c.notes || '') }}
                            style={{ fontSize: '13px', color: c.notes ? '#444' : '#ccc', cursor: 'text', padding: '0.5rem 0.75rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', minHeight: '36px' }}>
                            {c.notes || 'Click to add a note…'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event registrations */}
                  {editingContact !== c.contact_id && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>Event Registrations</div>
                    {(() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const canonicalNames = new Set(CANONICAL_EVENTS.map(e => e.name))
                      const extraRegs = (c.registrations || []).filter(r => !canonicalNames.has(normalizeEventName(r.event)))
                      const allRows = [
                        ...CANONICAL_EVENTS.map(ev => {
                          const reg = (c.registrations || []).find(r => normalizeEventName(r.event) === ev.name)
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
                                <button onClick={() => toggleAttended(c.id, eventName, true)}
                                  style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: reg?.attended === true ? '0.5px solid #3B6B2F' : '0.5px solid rgba(0,0,0,0.14)', background: reg?.attended === true ? 'rgba(59,107,47,0.1)' : 'transparent', color: reg?.attended === true ? '#3B6B2F' : '#888' }}>
                                  ✓ Attended
                                </button>
                                <button onClick={() => toggleAttended(c.id, eventName, false)}
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
                  )}

                  {/* Admin Notes */}
                  {editingContact !== c.contact_id && (
                    <AppAdminNotes key={c.id} appId={c.id} initialNotes={c.admin_notes} onSaved={notes => setContacts(prev => prev.map(x => x.id === c.id ? { ...x, admin_notes: notes } : x))} />
                  )}

                  {/* Action row */}
                  {editingContact !== c.contact_id && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <GhostBtn onClick={() => startEditContact(c)} small>Edit</GhostBtn>
                        <DangerBtn small onClick={() => setRemoveContactConfirm(c.contact_id)}>Remove</DangerBtn>
                      </div>
                      {removeContactConfirm === c.contact_id && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#7B2032' }}>Remove this contact?</span>
                          <GhostBtn small onClick={() => removeContact(c.contact_id)}>Confirm</GhostBtn>
                          <GhostBtn small onClick={() => { setRemoveContactConfirm(null); setRemoveContactError(null) }}>Cancel</GhostBtn>
                          {removeContactError && <Err msg={removeContactError} />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            )].filter(Boolean)
          })}
        </div>
        </div>
        </>
      )}
    </div>
  )
}
