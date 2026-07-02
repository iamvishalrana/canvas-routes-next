'use client'
import { useState, useEffect } from 'react'

const LINK_TYPES = ['Itinerary', 'Registration', 'Member Portal', 'Event Page', 'External', 'Other']

const TYPE_COLORS = {
  'Itinerary':     { bg: '#ecfdf5', text: '#065f46' },
  'Registration':  { bg: '#eff6ff', text: '#1e40af' },
  'Member Portal': { bg: '#faf5ff', text: '#6b21a8' },
  'Event Page':    { bg: '#fff7ed', text: '#9a3412' },
  'External':      { bg: '#f9fafb', text: '#374151' },
  'Other':         { bg: '#f9fafb', text: '#374151' },
}

const INPUT = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }
const BTN = (color = '#0F1E14') => ({ padding: '0.5rem 1rem', background: color, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', letterSpacing: '0.02em' })
const CARD = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }
const LABEL = { fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }

function CopyBtn({ value, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 2000) }).catch(() => {})
  }
  return (
    <button onClick={copy} style={{ ...BTN(done ? '#3B6B2F' : '#6b7280'), padding: '0.35rem 0.7rem', fontSize: '11px' }}>
      {done ? '✓ Copied' : label}
    </button>
  )
}

function ShowHide({ value }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#374151' }}>{show ? value : '••••••••'}</span>
      <button onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#6b7280', padding: '0 2px' }}>{show ? 'hide' : 'show'}</button>
    </span>
  )
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS['Other']
  return (
    <span style={{ fontSize: '10px', background: c.bg, color: c.text, padding: '2px 8px', borderRadius: '99px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {type || 'Other'}
    </span>
  )
}

export default function LinksClient() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', url: '', password: '', eventDate: '', notes: '', type: 'Itinerary' })

  useEffect(() => {
    fetch('/api/admin/links')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setLinks(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setError('Failed to load links.'); setLoading(false) })
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save.'); setSaving(false); return }
      setLinks(prev => [...prev, data])
      setForm({ name: '', url: '', password: '', eventDate: '', notes: '', type: 'Itinerary' })
      setAdding(false)
    } catch {
      setError('Network error — please try again.')
    }
    setSaving(false)
  }

  async function toggleArchive(link) {
    const res = await fetch('/api/admin/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: link.id, archived: !link.archived }),
    })
    if (res.ok) setLinks(prev => prev.map(l => l.id === link.id ? { ...l, archived: !l.archived } : l))
  }

  async function handleDelete(id) {
    if (!confirm('Delete this link permanently?')) return
    const res = await fetch('/api/admin/links', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setLinks(prev => prev.filter(l => l.id !== id))
  }

  const active = links.filter(l => !l.archived)
  const archived = links.filter(l => l.archived)

  // Group active links by type, in LINK_TYPES order
  const grouped = LINK_TYPES.map(type => ({
    type,
    items: active.filter(l => (l.type || 'Other') === type).sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || '')),
  })).filter(g => g.items.length > 0)

  return (
    <div style={{ padding: '2rem', maxWidth: '860px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111', margin: '0 0 4px' }}>Link Library</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Private event links, itinerary pages, and their passwords. Archive when an event passes.</p>
        </div>
        <button onClick={() => { setAdding(v => !v); setError('') }} style={BTN(adding ? '#6b7280' : '#0F1E14')}>
          {adding ? 'Cancel' : '+ Add Link'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} style={{ ...CARD, marginBottom: '2rem', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#111', margin: 0 }}>New Link</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
              <label style={LABEL}>Event Name *</label>
              <input style={INPUT} placeholder="Whips to Eastern Townships — July 5, 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={LABEL}>Type</label>
              <select
                style={{ ...INPUT, background: '#fff', cursor: 'pointer' }}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={LABEL}>Event Date</label>
              <input type="date" style={INPUT} value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
              <label style={LABEL}>URL *</label>
              <input style={INPUT} placeholder="https://canvasroutes.com/whips-to-eastern-townships" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={LABEL}>Password</label>
              <input style={INPUT} placeholder="eastern" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={LABEL}>Notes</label>
              <input style={INPUT} placeholder="Private itinerary for participants" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

          </div>
          {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{error}</p>}
          <div>
            <button type="submit" disabled={saving} style={{ ...BTN('#0F1E14'), opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Link'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '13px' }}>Loading…</p>
      ) : (
        <>
          {active.length === 0 && !adding && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af', fontSize: '13px' }}>
              No active links yet. Add your first one above.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: archived.length ? '2rem' : 0 }}>
            {grouped.map(({ type, items }) => (
              <TypeGroup key={type} type={type} items={items} onArchive={toggleArchive} onDelete={handleDelete} />
            ))}
          </div>

          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowArchived(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#6b7280', padding: '0.5rem 0', fontFamily: 'sans-serif', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <span>{showArchived ? '▼' : '▶'}</span>
                <span>Archived ({archived.length})</span>
              </button>
              {showArchived && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.65 }}>
                  {archived.map(link => (
                    <LinkCard key={link.id} link={link} onArchive={() => toggleArchive(link)} onDelete={() => handleDelete(link.id)} isArchived />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TypeGroup({ type, items, onArchive, onDelete }) {
  const [open, setOpen] = useState(true)
  const c = TYPE_COLORS[type] || TYPE_COLORS['Other']
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', background: '#fff' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.text, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>{type}</span>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>{items.length} {items.length === 1 ? 'link' : 'links'}</span>
        </div>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', borderTop: '1px solid #f3f4f6' }}>
          {items.map((link, i) => (
            <div key={link.id} style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
              <LinkCard link={link} onArchive={() => onArchive(link)} onDelete={() => onDelete(link.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LinkCard({ link, onArchive, onDelete, isArchived }) {
  const formattedDate = link.eventDate
    ? new Date(link.eventDate + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const isPast = link.eventDate && new Date(link.eventDate) < new Date()

  return (
    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: isArchived ? '3px solid #e5e7eb' : isPast ? '3px solid #f59e0b' : '3px solid #3B6B2F' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{link.name}</span>
            <TypeBadge type={link.type} />
            {isPast && !isArchived && (
              <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '99px', fontWeight: '600', letterSpacing: '0.04em' }}>EVENT PASSED</span>
            )}
            {isArchived && (
              <span style={{ fontSize: '10px', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '99px', fontWeight: '600', letterSpacing: '0.04em' }}>ARCHIVED</span>
            )}
          </div>
          {formattedDate && <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 0.4rem' }}>{formattedDate}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button onClick={onArchive} style={{ ...BTN(isArchived ? '#3B6B2F' : '#6b7280'), padding: '0.35rem 0.7rem', fontSize: '11px' }}>
            {isArchived ? 'Restore' : 'Archive'}
          </button>
          <button onClick={onDelete} style={{ ...BTN('#dc2626'), padding: '0.35rem 0.7rem', fontSize: '11px' }}>Delete</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ ...LABEL, width: '64px', flexShrink: 0 }}>URL</span>
          <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all', flex: 1 }}>{link.url}</a>
          <CopyBtn value={link.url} label="Copy URL" />
        </div>
        {link.password && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ ...LABEL, width: '64px', flexShrink: 0 }}>Password</span>
            <ShowHide value={link.password} />
            <CopyBtn value={link.password} label="Copy" />
          </div>
        )}
        {link.notes && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span style={{ ...LABEL, width: '64px', flexShrink: 0, paddingTop: '1px' }}>Notes</span>
            <span style={{ fontSize: '12px', color: '#374151' }}>{link.notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}
