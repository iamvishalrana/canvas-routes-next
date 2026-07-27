'use client'
import { useState, useEffect, useRef } from 'react'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../_components/shared'
import { uploadToSupabaseStorage } from '../../../lib/uploadToSupabaseStorage'
import { onImgError } from '../../../lib/imgFallback'
import { compressImageClient } from '../../../lib/compressImageClient'

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const EMPTY_FORM = { title: '', recipientName: '', recipientEmail: '' }

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

function carLabelOf(c) {
  return [c.car_year, c.car_make, c.car_model].filter(Boolean).join(' ')
}

// Debounced search against the existing global admin search endpoint —
// covers members, applications, and contacts by name/email/phone/car, since
// most non-members the admin wants to share photos with are already sitting
// in applications/contacts from a past registration, not typed in blind.
function ContactSearchSelect({ onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const term = q.trim()
    if (term.length < 2) { setResults([]); setOpen(false); return }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(term)}`)
        .then(r => r.ok ? r.json() : { members: [], applications: [], contacts: [] })
        .then(data => {
          const merged = [
            ...(data.members || []).map(m => ({ key: `m-${m.id}`, name: m.name, email: m.email, car: carLabelOf(m), tag: 'Member' })),
            ...(data.applications || []).map(a => ({ key: `a-${a.id}`, name: a.name, email: a.email, car: carLabelOf(a), tag: 'Application' })),
            ...(data.contacts || []).map(c => ({ key: `c-${c.id}`, name: c.applications?.name, email: c.applications?.email, car: carLabelOf(c.applications || {}), tag: 'Contact' })),
          ].filter(r => r.email)
          // Same email can surface from more than one table — keep one
          const seen = new Set()
          setResults(merged.filter(r => (seen.has(r.email) ? false : (seen.add(r.email), true))).slice(0, 8))
          setOpen(true)
        })
        .catch(() => {})
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [q])

  return (
    <div style={{ position: 'relative' }}>
      <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)}
        placeholder="Search by name, email, car, or phone…" style={inp} />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', maxHeight: '260px', overflowY: 'auto' }}>
          {results.map(r => (
            <button key={r.key} type="button"
              onClick={() => { onSelect(r); setQ(''); setResults([]); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', background: 'none', border: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.05)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '12px', color: '#1a1a1a' }}>{r.name || '(no name)'}</span>
                <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb' }}>{r.tag}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#999' }}>{r.email}{r.car ? ` · ${r.car}` : ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// One expanded share: lists its photos, lets the admin upload more, copy the
// link, renew the 30-day expiry, or delete the whole share early.
function ShareDetail({ share, onDeleted, onRenewed }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [upload, setUpload] = useState(null) // { done, total, errors: [] }
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    fetch(`/api/admin/photo-shares/${share.id}/photos`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPhotos(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [share.id])

  const link = `${siteUrl()}/gallery/${share.token}`

  function copyLink() {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  async function handleFiles(e) {
    const all = Array.from(e.target.files || [])
    if (fileRef.current) fileRef.current.value = ''
    const files = all.filter(f => ALLOWED[f.type])
    const skipped = all.filter(f => !ALLOWED[f.type]).map(f => `${f.name} — unsupported format (use JPEG, PNG, or WebP)`)
    if (!all.length) return
    setUpload({ done: 0, total: files.length, errors: skipped })
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        if (file.size > 40 * 1024 * 1024) throw new Error('over the 40 MB per-file limit')
        const display = await compressImageClient(file)
        const urlRes = await fetch(`/api/admin/photo-shares/${share.id}/upload-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType: file.type, dispFileType: display.type || 'image/jpeg' }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || `HTTP ${urlRes.status}`)
        await Promise.all([
          uploadToSupabaseStorage({ bucket: 'photo-shares', path: urls.originalPath, token: urls.originalToken, file }),
          uploadToSupabaseStorage({ bucket: 'photo-shares', path: urls.displayPath, token: urls.displayToken, file: display }),
        ])
        const res = await fetch(`/api/admin/photo-shares/${share.id}/photos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalPath: urls.originalPath, displayPath: urls.displayPath }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        setPhotos(prev => [...prev, data])
      } catch (err) {
        setUpload(u => u ? { ...u, errors: [...u.errors, `${file.name} — ${err.message}`] } : u)
      }
      setUpload(u => u ? { ...u, done: i + 1 } : u)
    }
    setUpload(u => u && u.errors.length ? u : null)
  }

  async function handleDeletePhoto(photoId) {
    try {
      const res = await fetch(`/api/admin/photo-shares/${share.id}/photos/${photoId}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed to delete photo.'); return }
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch { setErr('Network error — photo not deleted.') }
  }

  async function handleRenew() {
    try {
      const res = await fetch(`/api/admin/photo-shares/${share.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ renew: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error || 'Failed to renew.'); return }
      onRenewed(data)
    } catch { setErr('Network error.') }
  }

  async function handleDeleteShare() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/photo-shares/${share.id}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed to delete share.'); setDeleting(false); return }
      onDeleted(share.id)
    } catch { setErr('Network error.'); setDeleting(false) }
  }

  return (
    <div style={{ padding: '1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(197,168,130,0.03)' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input readOnly value={link} onFocus={e => e.target.select()}
          style={{ ...inp, flex: '1 1 260px', fontSize: '12px', color: '#666' }} />
        <GhostBtn small onClick={copyLink}>{copied ? 'Copied ✓' : 'Copy link'}</GhostBtn>
        <GhostBtn small onClick={handleRenew}>Renew 30 days</GhostBtn>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <PrimaryBtn onClick={() => fileRef.current?.click()} disabled={!!upload}>+ Add Photos</PrimaryBtn>
        {!deleteConfirm ? (
          <button type="button" onClick={() => setDeleteConfirm(true)}
            style={{ background: 'none', border: 'none', color: '#c99', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            Delete share
          </button>
        ) : (
          <>
            <span style={{ fontSize: '11px', color: '#93333E' }}>Delete this share and all its photos?</span>
            <DangerBtn small onClick={handleDeleteShare} disabled={deleting}>{deleting ? '…' : 'Delete'}</DangerBtn>
            <GhostBtn small onClick={() => setDeleteConfirm(false)}>Cancel</GhostBtn>
          </>
        )}
      </div>

      {upload && (
        <div style={{ marginBottom: '1rem', fontSize: '12px', color: '#555' }}>
          {upload.done < upload.total ? <>Uploading {upload.done} / {upload.total}…</> : <>Uploaded {Math.max(0, upload.total - upload.errors.length)} / {upload.total}</>}
          {upload.errors.map((e, i) => <div key={i} style={{ color: '#93333E', marginTop: '0.25rem' }}>{e}</div>)}
        </div>
      )}
      {err && <Err msg={err} />}

      {loading ? (
        <div style={{ fontSize: '12px', color: '#bbb' }}>Loading…</div>
      ) : photos.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#bbb' }}>No photos yet — click "+ Add Photos" to upload.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
          {photos.map(photo => (
            <div key={photo.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.04)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" onError={onImgError(photo.originalUrl)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => handleDeletePhoto(photo.id)} aria-label="Delete photo"
                style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '99px', border: 'none', cursor: 'pointer', background: 'rgba(15,30,20,0.65)', color: '#fff', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PhotoSharesTab() {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [listErr, setListErr] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    fetch('/api/admin/photo-shares')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setShares(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setListErr('Failed to load shares.'); setLoading(false) })
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) { setFormErr('Title is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail.trim())) {
      setFormErr('A valid recipient email is required — it doubles as the access password.')
      return
    }
    setSubmitting(true); setFormErr('')
    try {
      const res = await fetch('/api/admin/photo-shares', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), recipientName: form.recipientName, recipientEmail: form.recipientEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Failed to create share.'); return }
      setShares(prev => [data, ...prev])
      setOpenId(data.id)
      setForm(EMPTY_FORM)
      setCreating(false)
    } catch { setFormErr('Network error.') }
    finally { setSubmitting(false) }
  }

  return (
    <div>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '1.25rem', lineHeight: 1.7 }}>
        Create a link to share photos with someone who isn't a member — for one person, or a whole event's
        worth to hand out broadly (give the group the same email to use). The recipient must enter that
        email to view the gallery. Each link auto-expires and its photos are deleted 30 days after creation
        (renewable). The page also includes a membership pitch.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <PrimaryBtn onClick={() => { setCreating(v => !v); setFormErr('') }}>{creating ? 'Cancel' : '+ New Share'}</PrimaryBtn>
      </div>

      {creating && (
        <form onSubmit={handleCreate} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div>
            <L>Find a non-member (searches applications &amp; contacts)</L>
            <ContactSearchSelect onSelect={r => setForm(p => ({
              ...p,
              recipientName: r.name || p.recipientName,
              recipientEmail: r.email || p.recipientEmail,
              title: p.title || (r.name ? `${r.name} — Photos` : p.title),
            }))} />
          </div>
          <div>
            <L>Title (shown on the shared page)</L>
            <input style={inp} value={form.title} placeholder="e.g. John Smith — July Meet, or Sunday Meet Photos"
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={120} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <L>Recipient name (optional, for your reference)</L>
              <input style={inp} value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} maxLength={120} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <L>Recipient email (required — this is the access password)</L>
              <input style={inp} type="email" required value={form.recipientEmail} onChange={e => setForm(p => ({ ...p, recipientEmail: e.target.value }))} maxLength={200} />
            </div>
          </div>
          <div>
            <PrimaryBtn type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Share'}</PrimaryBtn>
          </div>
          {formErr && <Err msg={formErr} />}
        </form>
      )}

      {listErr && <Err msg={listErr} />}

      {loading ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : shares.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          No shares yet — click "+ New Share" to create a link for someone.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {shares.map(share => {
            const isOpen = openId === share.id
            const left = daysLeft(share.expires_at)
            return (
              <div key={share.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <button type="button" onClick={() => setOpenId(isOpen ? null : share.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{share.title}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      {share.recipient_name && <>{share.recipient_name} · </>}
                      {share.recipient_email && <>Password: <span style={{ color: '#8a7a5c' }}>{share.recipient_email}</span> · </>}
                      {share.photoCount} photo{share.photoCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: left <= 5 ? '#93333E' : '#bbb', whiteSpace: 'nowrap' }}>
                    {left <= 0 ? 'Expired' : `${left} day${left !== 1 ? 's' : ''} left`} · {fmtDate(share.expires_at)}
                  </div>
                </button>
                {isOpen && (
                  <ShareDetail
                    share={share}
                    onDeleted={id => { setShares(prev => prev.filter(s => s.id !== id)); setOpenId(null) }}
                    onRenewed={updated => setShares(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
