'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { GhostBtn, DangerBtn, Err } from '../../_components/shared'
import { onImgError } from '../../../../lib/imgFallback'

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function SubmissionsClient() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [listErr, setListErr] = useState('')
  const [busy, setBusy] = useState(() => new Set()) // submission ids currently publishing/rejecting

  useEffect(() => {
    fetch('/api/admin/gallery-submissions')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setSubs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setListErr('Failed to load submissions.'); setLoading(false) })
  }, [])

  const groups = useMemo(() => {
    const map = new Map()
    for (const s of subs) {
      const target = s.source === 'member' ? s.album : (s.folder_title || 'General')
      const key = `${s.contributor_name}|||${target}|||${s.source}`
      if (!map.has(key)) map.set(key, { contributor: s.contributor_name, target, source: s.source, date: s.album_date, items: [] })
      map.get(key).items.push(s)
    }
    return [...map.values()].sort((a, b) => (b.items[0]?.created_at || '').localeCompare(a.items[0]?.created_at || ''))
  }, [subs])

  function setBusyIds(ids, add) {
    setBusy(prev => {
      const n = new Set(prev)
      ids.forEach(id => add ? n.add(id) : n.delete(id))
      return n
    })
  }

  async function publish(id) {
    setBusyIds([id], true)
    try {
      const res = await fetch(`/api/admin/gallery-submissions/${id}/publish`, { method: 'POST' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to publish.'); return }
      setSubs(prev => prev.filter(s => s.id !== id))
    } catch { setListErr('Network error — not published.') }
    finally { setBusyIds([id], false) }
  }

  async function reject(id) {
    setBusyIds([id], true)
    try {
      const res = await fetch(`/api/admin/gallery-submissions/${id}/reject`, { method: 'POST' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to reject.'); return }
      setSubs(prev => prev.filter(s => s.id !== id))
    } catch { setListErr('Network error — not rejected.') }
    finally { setBusyIds([id], false) }
  }

  async function bulk(ids, action) {
    setBusyIds(ids, true)
    const fn = action === 'publish' ? publish : reject
    for (const id of ids) await fn(id)
  }

  return (
    <div className="ph-wrap" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        .ph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
        @media (max-width: 480px) { .ph-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Photo Submissions</h1>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>
          Photos members and non-members uploaded themselves — invisible to anyone until you publish them.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <Link href="/admin/photos" style={{ padding: '0.5rem 1.1rem', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', borderBottom: '2px solid transparent', color: '#999', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>
          Photo Gallery
        </Link>
        <Link href="/admin/photos/shares" style={{ padding: '0.5rem 1.1rem', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', borderBottom: '2px solid transparent', color: '#999', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>
          Non-Member Shares
        </Link>
        <span style={{ padding: '0.5rem 1.1rem', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', borderBottom: '2px solid #45643C', color: '#1a1a1a', fontWeight: '600' }}>
          Submissions{subs.length > 0 ? ` (${subs.length})` : ''}
        </span>
      </div>

      {listErr && <Err msg={listErr} />}

      {loading ? (
        <div style={{ fontSize: '13px', color: '#999' }}>Loading…</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          <div style={{ fontSize: '13px', color: '#999' }}>Nothing to review right now.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {groups.map(g => {
            const ids = g.items.map(i => i.id)
            const anyBusy = ids.some(id => busy.has(id))
            return (
              <div key={`${g.contributor}|||${g.target}|||${g.source}`} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>{g.contributor}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      {g.source === 'member' ? 'Member' : 'Non-member'} · {g.target}{formatDate(g.date) ? ` · ${formatDate(g.date)}` : ''} · {g.items.length} photo{g.items.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <GhostBtn small disabled={anyBusy} onClick={() => bulk(ids, 'publish')}>Publish all</GhostBtn>
                    <DangerBtn small disabled={anyBusy} onClick={() => bulk(ids, 'reject')}>Reject all</DangerBtn>
                  </div>
                </div>
                <div className="ph-grid">
                  {g.items.map(item => (
                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.04)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.photo_url} alt="" onError={onImgError(item.original_url)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: busy.has(item.id) ? 0.4 : 1 }} />
                      </div>
                      {item.caption && (
                        <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.caption}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <GhostBtn small disabled={busy.has(item.id)} onClick={() => publish(item.id)}>Publish</GhostBtn>
                        <DangerBtn small disabled={busy.has(item.id)} onClick={() => reject(item.id)}>Reject</DangerBtn>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
