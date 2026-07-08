'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, DangerBtn, ConfirmDialog } from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

export default function NotifySignupsClient() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [emailsCopied, setEmailsCopied] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeErr, setRemoveErr] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notify-signups')
      const data = await res.json().catch(() => [])
      setRows(res.ok && Array.isArray(data) ? data : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function removeRow(id) {
    setRemoveBusy(true); setRemoveErr(null)
    try {
      const res = await fetch('/api/admin/notify-signups', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      })
      if (!res.ok) { setRemoveErr('Failed to remove.'); setRemoveBusy(false); return }
      setRows(prev => prev.filter(r => r.id !== id))
      setRemoveConfirm(null)
    } catch {
      setRemoveErr('Network error — please try again.')
    } finally {
      setRemoveBusy(false)
    }
  }

  function copyEmails() {
    const emails = filtered.map(r => r.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setEmailsCopied(true)
      setTimeout(() => setEmailsCopied(false), 1500)
    }).catch(() => {})
  }

  const filtered = rows.filter(r => !search || [r.name, r.email].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      {removeConfirm && (
        <ConfirmDialog
          title="Remove signup?"
          message={`Remove ${removeConfirm.name || removeConfirm.email} from the event-notify list?`}
          confirmLabel="Remove"
          danger
          busy={removeBusy}
          onConfirm={() => removeRow(removeConfirm.id)}
          onCancel={() => setRemoveConfirm(null)}
        />
      )}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Event Notify Signups</h1>
        <p style={{ fontSize: '12px', color: '#999', margin: '0.5rem 0 0', maxWidth: '520px', lineHeight: 1.6 }}>
          People who signed up for future-event notifications without becoming members. Use the &ldquo;Event Notify Signups&rdquo; audience in Broadcasts to email this list.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem', maxWidth: isMobile ? undefined : '480px' }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem 1.4rem' }}>
          <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{rows.length}</div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>Total Signups</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem 1.4rem' }}>
          <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: '#3B6B2F', lineHeight: 1 }}>
            {rows.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length}
          </div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>Last 7 Days</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {rows.length} signup{rows.length !== 1 ? 's' : ''}
          </div>
          {rows.length > 0 && (
            <ExportButton
              filename="event-notify-signups"
              title="Event Notify Signups"
              headers={['Name', 'Email', 'Signed Up']}
              rows={filtered.map(r => [
                r.name || '',
                r.email || '',
                r.created_at ? new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: MONTREAL_TZ }) : '',
              ])}
              style={{ padding: '4px 10px', fontSize: '10px' }}
            />
          )}
          {rows.length > 0 && (
            <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {emailsCopied ? 'Copied!' : 'Copy Emails'}
            </button>
          )}
        </div>
        <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
          <input style={{ ...inp, width: '100%', paddingRight: search ? '2rem' : undefined }} placeholder="Search name, email…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
        </div>
      </div>

      {removeErr && <div style={{ fontSize: '11px', color: '#7B2032', marginBottom: '0.75rem' }}>{removeErr}</div>}

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No signups yet.</div>
      ) : (
        <div style={isMobile ? {} : { overflowX: 'auto' }}>
          <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', ...(isMobile ? {} : { minWidth: '600px' }) }}>
            {!isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 140px 90px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
                {['Name', 'Email', 'Signed Up', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
                ))}
              </div>
            )}
            {filtered.map((r, idx) => (
              <div key={r.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                {isMobile ? (
                  <div style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{r.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{r.email}</div>
                      <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ }) : '—'}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}><DangerBtn small onClick={() => setRemoveConfirm(r)}>Remove</DangerBtn></div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 140px 90px', padding: '0.85rem 1.25rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{r.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{r.email}</div>
                    <div style={{ fontSize: '11px', color: '#bbb' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ }) : '—'}
                    </div>
                    <div>
                      <DangerBtn small onClick={() => setRemoveConfirm(r)}>Remove</DangerBtn>
                    </div>
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
