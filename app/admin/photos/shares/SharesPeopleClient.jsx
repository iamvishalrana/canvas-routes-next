'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { inp, sel, L, PrimaryBtn, GhostBtn, Err, CopyBtn } from '../../_components/shared'
import { useConfirm } from '../../_components/ConfirmProvider'
import ContactSearchSelect from '../../_components/ContactSearchSelect'
import { isValidEmail } from '../../../../lib/emailValidation'

const EMPTY_FORM = { name: '', email: '' }

function fmtViewed(d) {
  if (!d) return 'Never opened'
  const diffMs = Date.now() - new Date(d).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days <= 0) return 'Opened today'
  if (days === 1) return 'Opened 1 day ago'
  if (days < 30) return `Opened ${days}d ago`
  return `Opened ${new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function SharesPeopleClient() {
  const router = useRouter()
  const confirm = useConfirm()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [listErr, setListErr] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('name') // name | newest | folders | photos | viewed
  const [emptyOnly, setEmptyOnly] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reclaiming, setReclaiming] = useState(false)
  const [reclaimMsg, setReclaimMsg] = useState(null)

  const loadPeople = useCallback(() => {
    fetch('/api/admin/photo-share-people')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPeople(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setListErr('Failed to load people.'); setLoading(false) })
  }, [])

  useEffect(() => { loadPeople() }, [loadPeople])

  // Move shared photos into the accounts of any recipients who've since become
  // members (and off the non-member link). Runs automatically at invite time
  // and on a member's photos-page view — this is the on-demand trigger for
  // members who joined before that existed.
  async function handleReclaim() {
    if (!(await confirm({
      title: 'Move members’ shared photos into their accounts?',
      message: 'For every share recipient who is now a member, this copies their photos into their permanent member gallery and removes them from the non-member link. Photos are only removed after the copy is confirmed, and it’s safe to run again.',
      confirmLabel: 'Yes, move them',
    }))) return
    setReclaiming(true); setReclaimMsg(null)
    try {
      const res = await fetch('/api/admin/photos/reclaim-shares', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setReclaimMsg({ ok: false, text: data.error || 'Failed to move photos.' }); return }
      setReclaimMsg({ ok: true, text: data.totalMoved > 0
        ? `Moved ${data.totalMoved} photo${data.totalMoved === 1 ? '' : 's'} into ${data.processed} member account${data.processed === 1 ? '' : 's'}.`
        : 'Nothing to move — all members’ photos are already in their accounts.' })
      loadPeople()
    } catch {
      setReclaimMsg({ ok: false, text: 'Network error — please try again.' })
    } finally {
      setReclaiming(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = !q ? people : people.filter(p =>
      (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
    if (emptyOnly) list = list.filter(p => p.folderCount === 0)
    const sorted = [...list]
    if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    else if (sortBy === 'folders') sorted.sort((a, b) => b.folderCount - a.folderCount)
    else if (sortBy === 'photos') sorted.sort((a, b) => b.photoCount - a.photoCount)
    else if (sortBy === 'viewed') sorted.sort((a, b) => new Date(b.last_viewed_at || 0) - new Date(a.last_viewed_at || 0))
    else sorted.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
    return sorted
  }, [people, search, sortBy, emptyOnly])

  async function handleCreate(e) {
    e.preventDefault()
    if (!isValidEmail(form.email)) {
      setFormErr('A valid email is required — this is where their access code is sent.')
      return
    }
    setSubmitting(true); setFormErr('')
    try {
      const res = await fetch('/api/admin/photo-share-people', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Failed to create.'); return }
      router.push(`/admin/photos/shares/${data.id}`)
    } catch { setFormErr('Network error.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="shp-wrap" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        .shp-row:hover { border-color: rgba(197,168,130,0.4) !important; background: rgba(197,168,130,0.03) !important; }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/photos" style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>← Photo Gallery</Link>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', margin: '0.75rem 0 0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Non-Member Shares</h1>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem', maxWidth: '620px', lineHeight: 1.7 }}>
          Share photos with someone who isn't a member. Each person gets one link, gated by a one-time code sent to
          their email — add a folder under them for every event they attend, so they never need a second link.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {reclaimMsg && (
          <span style={{ fontSize: '11.5px', color: reclaimMsg.ok ? '#3B6B2F' : '#93333E', marginRight: 'auto' }}>{reclaimMsg.text}</span>
        )}
        <GhostBtn onClick={handleReclaim} disabled={reclaiming}>
          {reclaiming ? 'Moving…' : 'Move members’ photos to accounts'}
        </GhostBtn>
        <PrimaryBtn onClick={() => { setCreating(v => !v); setFormErr('') }}>{creating ? 'Cancel' : '+ New Person'}</PrimaryBtn>
      </div>

      {creating && (
        <form onSubmit={handleCreate} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div>
            <L>Find them (searches applications &amp; contacts)</L>
            <ContactSearchSelect onSelect={r => setForm(p => ({ name: r.name || p.name, email: r.email || p.email }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <L>Name (optional, for your reference)</L>
              <input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={120} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <L>Email (required — their access code is sent here)</L>
              <input style={inp} type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} maxLength={200} />
            </div>
          </div>
          <div>
            <PrimaryBtn type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create & Add First Folder'}</PrimaryBtn>
          </div>
          {formErr && <Err msg={formErr} />}
        </form>
      )}

      {!creating && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <input style={{ ...inp, flex: '1 1 200px', maxWidth: '280px' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by name or email…" />
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <select style={{ ...sel, width: 'auto', paddingRight: '1.75rem' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Sort: Name (A–Z)</option>
              <option value="newest">Sort: Newest added</option>
              <option value="folders">Sort: Most folders</option>
              <option value="photos">Sort: Most photos</option>
              <option value="viewed">Sort: Last opened</option>
            </select>
            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <button type="button" onClick={() => setEmptyOnly(v => !v)}
            style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: '99px', border: `0.5px solid ${emptyOnly ? 'rgba(197,168,130,0.7)' : 'rgba(0,0,0,0.15)'}`, background: emptyOnly ? 'rgba(197,168,130,0.12)' : 'transparent', color: emptyOnly ? '#8A6535' : '#666', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
            No folders yet
          </button>
          <span style={{ fontSize: '11px', color: '#aaa' }}>{filtered.length} of {people.length}</span>
        </div>
      )}

      {listErr && <Err msg={listErr} />}

      {loading ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          {people.length === 0 ? 'No one yet — click "+ New Person" to share photos with someone.' : 'No matches.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(person => (
            <div key={person.id} role="link" tabIndex={0} onClick={() => router.push(`/admin/photos/shares/${person.id}`)}
              onKeyDown={e => { if (e.key === 'Enter') router.push(`/admin/photos/shares/${person.id}`) }}
              className="shp-row"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name || '(no name)'}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.1rem', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.email}</span>
                  <CopyBtn value={person.email} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', whiteSpace: 'nowrap' }}>
                  {person.folderCount} folder{person.folderCount !== 1 ? 's' : ''} · {person.photoCount} photo{person.photoCount !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '10px', color: person.last_viewed_at ? '#aaa' : '#ccc', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  {fmtViewed(person.last_viewed_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
