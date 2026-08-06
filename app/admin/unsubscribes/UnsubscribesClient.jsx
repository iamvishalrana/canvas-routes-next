'use client'
import { useState, useEffect, useMemo } from 'react'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', { timeZone: MONTREAL_TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return iso }
}

export default function UnsubscribesClient() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState(null)
  const [removeErr, setRemoveErr] = useState('')

  useEffect(() => {
    fetch('/api/admin/unsubscribes')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setErr('Failed to load unsubscribes.'); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.email.toLowerCase().includes(q))
  }, [rows, search])

  async function resubscribe(email) {
    setRemoving(email); setRemoveErr('')
    try {
      const res = await fetch('/api/admin/unsubscribes', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setRemoveErr(data.error || 'Failed.'); return }
      setRows(prev => prev.filter(r => r.email !== email))
    } catch {
      setRemoveErr('Network error.')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.9rem', fontWeight: 300, margin: '0 0 0.3rem' }}>Unsubscribes</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          Everyone who has opted out of emails — every Broadcasts / Announcements / route-interest / route-launch send checks this list automatically, so nobody here gets emailed again unless you resubscribe them.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search email…"
          style={{ flex: '1 1 220px', padding: '0.55rem 0.85rem', fontSize: '13px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', fontFamily: 'var(--font-inter),sans-serif', outline: 'none' }}
        />
        <div style={{ fontSize: '12px', color: '#999' }}>{rows.length} total{search.trim() ? ` · ${filtered.length} shown` : ''}</div>
      </div>

      {removeErr && <div style={{ fontSize: '12px', color: '#93333E', marginBottom: '0.75rem' }}>{removeErr}</div>}

      {loading ? (
        <div style={{ fontSize: '13px', color: '#bbb' }}>Loading…</div>
      ) : err ? (
        <div style={{ fontSize: '13px', color: '#93333E' }}>{err}</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#bbb' }}>{rows.length === 0 ? 'Nobody has unsubscribed.' : 'No matches.'}</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#faf9f7' }}>
                <th style={{ textAlign: 'left', padding: '0.65rem 1.25rem', color: '#aaa', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Email</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 1.25rem', color: '#aaa', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Unsubscribed</th>
                <th style={{ padding: '0.65rem 1.25rem' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.email} style={{ borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '0.65rem 1.25rem', color: '#333' }}>{r.email}</td>
                  <td style={{ padding: '0.65rem 1.25rem', color: '#999' }}>{fmtDate(r.unsubscribed_at)}</td>
                  <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right' }}>
                    <button
                      onClick={() => resubscribe(r.email)}
                      disabled={removing === r.email}
                      style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', minHeight: '32px', borderRadius: '99px', border: '0.5px solid rgba(59,107,47,0.35)', background: 'none', color: '#3B6B2F', cursor: removing === r.email ? 'default' : 'pointer', opacity: removing === r.email ? 0.5 : 1, fontFamily: 'var(--font-inter),sans-serif' }}
                    >
                      {removing === r.email ? '…' : 'Resubscribe'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
