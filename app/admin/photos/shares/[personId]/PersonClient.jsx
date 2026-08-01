'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { inp, sel, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../../../_components/shared'

const LIFETIME_OPTIONS = [7, 14, 30, 60, 90]

function siteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function daysLeft(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(ms / 86400000)
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PersonClient() {
  const { personId } = useParams()
  const router = useRouter()
  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [sendLinkResult, setSendLinkResult] = useState(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderTitle, setFolderTitle] = useState('')
  const [folderLifetime, setFolderLifetime] = useState(30)
  const [folderErr, setFolderErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState(null)
  const [editingPerson, setEditingPerson] = useState(false)
  const [personDraft, setPersonDraft] = useState({ name: '', email: '' })
  const [savingPerson, setSavingPerson] = useState(false)
  const [deletePersonConfirm, setDeletePersonConfirm] = useState(false)
  const [deletingPerson, setDeletingPerson] = useState(false)

  function load() {
    fetch(`/api/admin/photo-share-people/${personId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setPerson(data); setLoading(false) })
      .catch(() => { setErr('Failed to load — this person may not exist.'); setLoading(false) })
  }
  useEffect(load, [personId])

  const link = person ? `${siteUrl()}/gallery/${person.token}` : ''

  function copyLink() {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  async function sendLink() {
    setSendingLink(true); setSendLinkResult(null)
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/send-link`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      setSendLinkResult(res.ok ? { ok: true } : { ok: false, error: data.error || 'Failed to send.' })
    } catch {
      setSendLinkResult({ ok: false, error: 'Network error.' })
    }
    setSendingLink(false)
    setTimeout(() => setSendLinkResult(null), 4000)
  }

  async function handleCreateFolder(e) {
    e.preventDefault()
    if (!folderTitle.trim()) { setFolderErr('Folder title is required.'); return }
    setSubmitting(true); setFolderErr('')
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: folderTitle.trim(), lifetimeDays: folderLifetime }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFolderErr(data.error || 'Failed to create folder.'); return }
      router.push(`/admin/photos/shares/${personId}/${data.id}`)
    } catch { setFolderErr('Network error.') }
    finally { setSubmitting(false) }
  }

  async function handleDeleteFolder(folderId) {
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed to delete folder.'); return }
      setPerson(p => ({ ...p, folders: p.folders.filter(f => f.id !== folderId) }))
      setDeleteFolderConfirm(null)
    } catch { setErr('Network error.') }
  }

  function startEditPerson() {
    setPersonDraft({ name: person.name || '', email: person.email || '' })
    setEditingPerson(true)
  }

  async function saveEditPerson() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personDraft.email.trim())) { setErr('A valid email is required.'); return }
    setSavingPerson(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: personDraft.name, email: personDraft.email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error || 'Failed to save.'); return }
      setPerson(p => ({ ...p, ...data }))
      setEditingPerson(false)
    } catch { setErr('Network error.') }
    finally { setSavingPerson(false) }
  }

  async function handleDeletePerson() {
    setDeletingPerson(true)
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed to delete.'); setDeletingPerson(false); return }
      router.push('/admin/photos/shares')
    } catch { setErr('Network error.'); setDeletingPerson(false) }
  }

  if (loading) {
    return <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontSize: '13px', color: '#ccc', textAlign: 'center' }}>Loading…</div>
  }
  if (!person) {
    return (
      <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
        <Link href="/admin/photos/shares" style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>← All People</Link>
        <Err msg={err || 'Not found.'} />
      </div>
    )
  }

  return (
    <div className="shp-wrap" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        .shp-folder-row:hover { border-color: rgba(197,168,130,0.4) !important; background: rgba(197,168,130,0.03) !important; }
      `}</style>

      <Link href="/admin/photos/shares" style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>← All People</Link>

      <div style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
        {!editingPerson ? (
          <>
            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: '300', color: '#1a1a1a', margin: '0 0 0.35rem', letterSpacing: '-0.01em' }}>
              {person.name || '(no name)'}
            </h1>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Password: <span style={{ color: '#8a7a5c' }}>{person.email}</span>
              {' · '}<button type="button" onClick={startEditPerson} style={{ background: 'none', border: 'none', color: '#8a7a5c', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>Edit</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', maxWidth: '480px' }}>
            <div style={{ flex: '1 1 160px' }}>
              <L>Name</L>
              <input style={inp} value={personDraft.name} onChange={e => setPersonDraft(p => ({ ...p, name: e.target.value }))} maxLength={120} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <L>Email (code sent here)</L>
              <input style={inp} type="email" value={personDraft.email} onChange={e => setPersonDraft(p => ({ ...p, email: e.target.value }))} maxLength={200} />
            </div>
            <PrimaryBtn onClick={saveEditPerson} disabled={savingPerson}>{savingPerson ? 'Saving…' : 'Save'}</PrimaryBtn>
            <GhostBtn onClick={() => setEditingPerson(false)}>Cancel</GhostBtn>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <input readOnly value={link} onFocus={e => e.target.select()} style={{ ...inp, flex: '1 1 260px', fontSize: '12px', color: '#666' }} />
        <button type="button" onClick={copyLink} title={copied ? 'Copied!' : 'Copy link'} aria-label="Copy link"
          style={{ width: '38px', height: '38px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: `0.5px solid ${copied ? '#3B6B2F' : 'rgba(0,0,0,0.2)'}`, borderRadius: '8px', cursor: 'pointer', color: copied ? '#3B6B2F' : '#555' }}>
          {copied ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </button>
        <GhostBtn small onClick={sendLink} disabled={sendingLink}>
          {sendingLink ? 'Sending…' : sendLinkResult?.ok ? 'Sent ✓' : 'Email link to them'}
        </GhostBtn>
        {sendLinkResult?.error && <span style={{ fontSize: '11px', color: '#93333E' }}>{sendLinkResult.error}</span>}
        {!deletePersonConfirm ? (
          <button type="button" onClick={() => setDeletePersonConfirm(true)}
            style={{ background: 'none', border: 'none', color: '#c99', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            Delete this person
          </button>
        ) : (
          <>
            <span style={{ fontSize: '11px', color: '#93333E' }}>Delete {person.name || person.email} and everything under them?</span>
            <DangerBtn small onClick={handleDeletePerson} disabled={deletingPerson}>{deletingPerson ? '…' : 'Delete'}</DangerBtn>
            <GhostBtn small onClick={() => setDeletePersonConfirm(false)}>Cancel</GhostBtn>
          </>
        )}
      </div>

      {err && <Err msg={err} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999' }}>Event Folders</div>
        <PrimaryBtn onClick={() => { setCreatingFolder(v => !v); setFolderErr('') }}>{creatingFolder ? 'Cancel' : '+ New Folder'}</PrimaryBtn>
      </div>

      {creatingFolder && (
        <form onSubmit={handleCreateFolder} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <L>Folder title (e.g. the event name)</L>
            <input style={inp} value={folderTitle} placeholder="e.g. Whips to Eastern Townships — July 2026"
              onChange={e => setFolderTitle(e.target.value)} maxLength={120} autoFocus />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <L>Removes after</L>
            <div style={{ position: 'relative' }}>
              <select style={{ ...sel, width: 'auto', paddingRight: '1.75rem' }} value={folderLifetime} onChange={e => setFolderLifetime(Number(e.target.value))}>
                {LIFETIME_OPTIONS.map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
              <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <PrimaryBtn type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Folder'}</PrimaryBtn>
          {folderErr && <div style={{ width: '100%' }}><Err msg={folderErr} /></div>}
        </form>
      )}

      {person.folders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          No folders yet — click "+ New Folder" for their first event.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {person.folders.map(folder => {
            const left = daysLeft(folder.expires_at)
            const isPendingDelete = deleteFolderConfirm === folder.id
            return (
              <div key={folder.id} className="shp-folder-row" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'border-color 0.15s, background 0.15s' }}>
                <Link href={`/admin/photos/shares/${personId}/${folder.id}`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.1rem', textDecoration: 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.title}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{folder.photoCount} photo{folder.photoCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: left <= 5 ? '#93333E' : '#bbb', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {left <= 0 ? 'Expired' : `${left} day${left !== 1 ? 's' : ''} left`} · {fmtDate(folder.expires_at)}
                  </div>
                </Link>
                {!isPendingDelete ? (
                  <button type="button" onClick={() => setDeleteFolderConfirm(folder.id)} aria-label="Delete folder"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c99', fontSize: '18px', padding: '0 1.1rem', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', flexShrink: 0 }}>×</button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', paddingRight: '1.1rem', flexShrink: 0 }}>
                    <DangerBtn small onClick={() => handleDeleteFolder(folder.id)}>Delete</DangerBtn>
                    <GhostBtn small onClick={() => setDeleteFolderConfirm(null)}>Cancel</GhostBtn>
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
