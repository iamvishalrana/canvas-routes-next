'use client'
import { useState, useEffect } from 'react'
import { inp, sel, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../_components/shared'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

const LINK_TYPES = ['Itinerary', 'Registration', 'Member Portal', 'Event Page', 'External', 'Other']

const TYPE_COLORS = {
  'Itinerary':     '#45643C',
  'Registration':  '#3D6B99',
  'Member Portal': '#6B4E8E',
  'Event Page':    '#8A6535',
  'External':      '#777',
  'Other':         '#777',
}

// Date-only string compare in Montreal time — `new Date('2026-07-17')` parses
// as UTC midnight, which flips "today's event" to past for part of the day
const mtlToday = () => new Date().toLocaleDateString('en-CA', { timeZone: MONTREAL_TZ })

function CopyBtn({ value, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 2000) }).catch(() => {})
  }
  return (
    <button onClick={copy} className="lk-tap"
      style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', border: `0.5px solid ${done ? 'rgba(59,107,47,0.4)' : 'rgba(0,0,0,0.15)'}`, borderRadius: '6px', background: 'none', color: done ? '#3B6B2F' : '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap' }}>
      {done ? '✓ Copied' : label}
    </button>
  )
}

function ShowHide({ value }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#333', letterSpacing: show ? '0.02em' : '0.12em' }}>{show ? value : '••••••'}</span>
      <button onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#c5a882', padding: '2px 4px', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{show ? 'hide' : 'show'}</button>
    </span>
  )
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS['Other']
  return (
    <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${c}55`, color: c, background: `${c}11`, whiteSpace: 'nowrap' }}>
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
  const [listErr, setListErr] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState('date_desc')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', url: '', password: '', eventDate: '', notes: '', type: 'Itinerary' })

  useEffect(() => {
    fetch('/api/admin/links')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setLinks(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setListErr('Failed to load links.'); setLoading(false) })
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    // Basic URL sanity before it's saved and shared
    if (!/^https?:\/\/.+\..+/.test(form.url.trim())) { setError('Enter a full URL starting with https://'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, url: form.url.trim() }),
      })
      const data = await res.json().catch(() => ({}))
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
    setListErr('')
    try {
      const res = await fetch('/api/admin/links', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, archived: !link.archived }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to update link.'); return }
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, archived: !l.archived } : l))
    } catch { setListErr('Network error — link not updated.') }
  }

  async function handleDelete(id) {
    setListErr('')
    try {
      const res = await fetch('/api/admin/links', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to delete link.'); return }
      setLinks(prev => prev.filter(l => l.id !== id))
      setDeleteConfirm(null)
    } catch { setListErr('Network error — link not deleted.') }
  }

  const today = mtlToday()
  const q = search.toLowerCase()
  const matches = l => !q || [l.name, l.url, l.notes, l.type].some(v => v?.toLowerCase().includes(q))
  const sortLinks = arr => [...arr].sort((a, b) => {
    if (sort === 'date_asc') return (a.eventDate || '9999').localeCompare(b.eventDate || '9999')
    if (sort === 'name_az') return (a.name || '').localeCompare(b.name || '')
    return (b.eventDate || '').localeCompare(a.eventDate || '') // date_desc — undated last
  })

  const active = links.filter(l => !l.archived && matches(l) && (typeFilter === 'all' || (l.type || 'Other') === typeFilter))
  const archived = links.filter(l => l.archived && matches(l))
  const passedCount = links.filter(l => !l.archived && l.eventDate && l.eventDate < today).length

  const grouped = LINK_TYPES.map(type => ({
    type,
    items: sortLinks(active.filter(l => (l.type || 'Other') === type)),
  })).filter(g => g.items.length > 0)

  function LinkCard({ link, isArchived }) {
    const formattedDate = link.eventDate
      ? new Date(link.eventDate + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      : null
    const isPast = link.eventDate && link.eventDate < today
    return (
      <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', borderLeft: isArchived ? '3px solid rgba(0,0,0,0.1)' : isPast ? '3px solid #b0885a' : '3px solid #45643C' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{link.name}</span>
              <TypeBadge type={link.type} />
              {isPast && !isArchived && (
                <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(176,136,90,0.5)', background: 'rgba(176,136,90,0.1)', color: '#8A6535' }}>Event passed</span>
              )}
              {isArchived && (
                <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(0,0,0,0.12)', color: '#aaa' }}>Archived</span>
              )}
            </div>
            {formattedDate && <div style={{ fontSize: '11px', color: '#999' }}>{formattedDate}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
            <GhostBtn small onClick={() => toggleArchive(link)}>{isArchived ? 'Restore' : 'Archive'}</GhostBtn>
            <DangerBtn small onClick={() => setDeleteConfirm(link.id)}>Delete</DangerBtn>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', width: '62px', flexShrink: 0 }}>URL</span>
            <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#3D6B99', textDecoration: 'none', wordBreak: 'break-all', flex: 1, minWidth: '140px' }}>{link.url}</a>
            <CopyBtn value={link.url} label="Copy URL" />
            {link.password && <CopyBtn value={`${link.url}\nPassword: ${link.password}`} label="Copy both" />}
          </div>
          {link.password && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', width: '62px', flexShrink: 0 }}>Password</span>
              <ShowHide value={link.password} />
              <CopyBtn value={link.password} label="Copy" />
            </div>
          )}
          {link.notes && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', width: '62px', flexShrink: 0, paddingTop: '1px' }}>Notes</span>
              <span style={{ fontSize: '12px', color: '#555', lineHeight: 1.6 }}>{link.notes}</span>
            </div>
          )}
        </div>

        {deleteConfirm === link.id && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.6rem 0.85rem', background: 'rgba(147,51,62,0.05)', border: '0.5px solid rgba(147,51,62,0.2)', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#93333E' }}>Delete this link permanently?</span>
            <DangerBtn small onClick={() => handleDelete(link.id)}>Confirm Delete</DangerBtn>
            <GhostBtn small onClick={() => setDeleteConfirm(null)}>Cancel</GhostBtn>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        @keyframes lkFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .lk-body { animation: lkFadeUp 0.25s ease both; }
        .lk-tap { min-height: 30px; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Link Library</h1>
        </div>
        <PrimaryBtn onClick={() => { setAdding(v => !v); setError('') }}>{adding ? 'Cancel' : '+ Add Link'}</PrimaryBtn>
      </div>

      {/* Stats */}
      {links.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Active links', value: links.filter(l => !l.archived).length, color: '#1a1a1a' },
            { label: 'Events passed', value: passedCount, color: passedCount > 0 ? '#8A6535' : '#3B6B2F' },
            { label: 'Archived', value: links.filter(l => l.archived).length, color: '#999' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '1.55rem', fontWeight: '300', color: s.color, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.35rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="lk-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>New Link</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <L>Event Name *</L>
              <input style={inp} placeholder="Hello to Montebello — August 1, 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={120} />
            </div>
            <div>
              <L>Type</L>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div>
              <L>Event Date</L>
              <input type="date" style={{ ...inp, minWidth: 0 }} value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <L>URL *</L>
              <input style={inp} type="url" placeholder="https://canvasroutes.com/…" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
            </div>
            <div>
              <L>Password</L>
              <input style={inp} placeholder="optional" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} maxLength={60} />
            </div>
            <div>
              <L>Notes</L>
              <input style={inp} placeholder="Private itinerary for participants" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} maxLength={200} />
            </div>
          </div>
          {error && <Err msg={error} />}
          <PrimaryBtn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Link'}</PrimaryBtn>
        </form>
      )}

      {/* Search / filter / sort */}
      {links.length > 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input style={{ ...inp, flex: '1 1 160px', maxWidth: '280px' }} placeholder="Search name, URL, notes…" value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select style={{ ...sel, width: '140px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select style={{ ...sel, width: '150px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }} value={sort} onChange={e => setSort(e.target.value)}>
              <option value="date_desc">Date (newest)</option>
              <option value="date_asc">Date (oldest)</option>
              <option value="name_az">Name A → Z</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      )}

      {listErr && <Err msg={listErr} />}

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <>
          {active.length === 0 && !adding && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
              {search || typeFilter !== 'all' ? 'No links match your filters.' : 'No active links yet. Add your first one above.'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: archived.length ? '2rem' : 0 }}>
            {grouped.map(({ type, items }) => (
              <TypeGroup key={type} type={type} items={items} LinkCard={LinkCard} />
            ))}
          </div>

          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowArchived(v => !v)} className="lk-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#999', padding: '0.5rem 0', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', WebkitTapHighlightColor: 'transparent' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showArchived ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s ease' }}><polyline points="9 18 15 12 9 6"/></svg>
                Archived ({archived.length})
              </button>
              {showArchived && (
                <div className="lk-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: 0.7 }}>
                  {sortLinks(archived).map(link => (
                    <div key={link.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
                      <LinkCard link={link} isArchived />
                    </div>
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

function TypeGroup({ type, items, LinkCard }) {
  const [open, setOpen] = useState(true)
  const c = TYPE_COLORS[type] || TYPE_COLORS['Other']
  return (
    <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <button onClick={() => setOpen(v => !v)} className="lk-tap"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', minHeight: '44px', background: '#fafaf9', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{type}</span>
          <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{items.length} {items.length === 1 ? 'link' : 'links'}</span>
        </div>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="lk-body" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          {items.map((link, i) => (
            <div key={link.id} style={{ borderTop: i > 0 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
              <LinkCard link={link} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
