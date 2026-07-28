'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { inp, L, PrimaryBtn, Err } from '../../_components/shared'
import ContactSearchSelect from '../../_components/ContactSearchSelect'

const EMPTY_FORM = { name: '', email: '' }

export default function SharesPeopleClient() {
  const router = useRouter()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [listErr, setListErr] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/photo-share-people')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPeople(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setListErr('Failed to load people.'); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = !q ? people : people.filter(p =>
      (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
    return [...list].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
  }, [people, search])

  async function handleCreate(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormErr('A valid email is required — it doubles as the access password.')
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
        /* iOS Safari zooms in on focus for any input under 16px */
        .shp-wrap input, .shp-wrap select, .shp-wrap textarea { font-size: 16px !important; }
        .shp-row:hover { border-color: rgba(197,168,130,0.4) !important; background: rgba(197,168,130,0.03) !important; }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/photos" style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>← Photo Gallery</Link>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', margin: '0.75rem 0 0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Non-Member Shares</h1>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem', maxWidth: '620px', lineHeight: 1.7 }}>
          Share photos with someone who isn't a member. Each person gets one link and one password (their email) —
          add a folder under them for every event they attend, so they never need a second link.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
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
              <L>Email (required — this is the access password)</L>
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
        <div style={{ marginBottom: '1rem' }}>
          <input style={inp} value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by name or email…" />
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
            <Link key={person.id} href={`/admin/photos/shares/${person.id}`} className="shp-row"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name || '(no name)'}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.email}</div>
              </div>
              <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {person.folderCount} folder{person.folderCount !== 1 ? 's' : ''} · {person.photoCount} photo{person.photoCount !== 1 ? 's' : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
