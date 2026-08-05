'use client'
import { useState, useEffect } from 'react'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', { timeZone: MONTREAL_TZ, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return iso }
}

function CopyBtn({ value }) {
  const [done, setDone] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }).catch(() => {})
  }
  return (
    <button onClick={copy} style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${done ? 'rgba(59,107,47,0.4)' : 'rgba(0,0,0,0.15)'}`, borderRadius: '6px', background: 'none', color: done ? '#3B6B2F' : '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', WebkitTapHighlightColor: 'transparent', whiteSpace: 'nowrap' }}>
      {done ? '✓' : 'Copy'}
    </button>
  )
}

export default function PartnersClient() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all') // all | used | unused

  useEffect(() => {
    fetch('/api/admin/partners')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setPartners(d.partners || []); setLoading(false) })
      .catch(() => { setErr('Failed to load partner codes.'); setLoading(false) })
  }, [])

  return (
    <div style={{ padding: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.9rem', fontWeight: 300, margin: '0 0 0.3rem' }}>Partner Codes</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
          One-time discount codes for partners with a limited pool (e.g. Skyline Luge Tremblant). Partners with a single shared code (e.g. Café Napoléon, Koko Bakehouse) aren't tracked here — there's nothing per-member to claim.
        </p>
      </div>

      {loading ? (
        <div style={{ fontSize: '13px', color: '#bbb' }}>Loading…</div>
      ) : err ? (
        <div style={{ fontSize: '13px', color: '#93333E' }}>{err}</div>
      ) : partners.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#bbb' }}>No code-pool partners configured yet.</div>
      ) : (
        partners.map(p => {
          const pct = p.total > 0 ? Math.round((p.used / p.total) * 100) : 0
          return (
            <div key={p.slug} style={{ marginBottom: '2rem', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', background: '#faf9f7', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.3rem', fontWeight: 400 }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                    {p.used} used / {p.total} total — {p.remaining} remaining ({pct}%)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {['all', 'used', 'unused'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: '99px', border: `0.5px solid ${filter === f ? '#0F1E14' : 'rgba(0,0,0,0.15)'}`, background: filter === f ? '#0F1E14' : 'transparent', color: filter === f ? '#F5F1EC' : '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: '#fff' }}>
                      <th style={{ textAlign: 'left', padding: '0.6rem 1.5rem', color: '#aaa', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Code</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 1rem', color: '#aaa', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 1rem', color: '#aaa', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Member</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 1.5rem', color: '#aaa', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500 }}>Claimed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.codes
                      .filter(c => filter === 'all' ? true : filter === 'used' ? !!c.member : !c.member)
                      .map(c => (
                        <tr key={c.code} style={{ borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '0.6rem 1.5rem', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>{c.code}<CopyBtn value={c.code} /></span>
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '99px', border: `0.5px solid ${c.member ? 'rgba(147,51,62,0.3)' : 'rgba(59,107,47,0.3)'}`, background: c.member ? 'rgba(147,51,62,0.08)' : 'rgba(59,107,47,0.08)', color: c.member ? '#93333E' : '#3B6B2F' }}>
                              {c.member ? 'Used' : 'Available'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 1rem', color: c.member ? '#333' : '#ccc' }}>
                            {c.member ? (c.member.name || c.member.email || '—') : '—'}
                          </td>
                          <td style={{ padding: '0.6rem 1.5rem', color: '#999' }}>{fmtDate(c.assigned_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
