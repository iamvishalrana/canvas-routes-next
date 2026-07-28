'use client'
import { useState, useEffect, useRef } from 'react'
import { inp } from './shared'

function carLabelOf(c) {
  return [c.car_year, c.car_make, c.car_model].filter(Boolean).join(' ')
}

// Debounced search against the existing global admin search endpoint —
// covers members, applications, and contacts by name/email/phone/car, since
// most non-members an admin wants to share photos with already have an
// applications/contacts row from a past registration, not typed in blind.
export default function ContactSearchSelect({ onSelect, placeholder }) {
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
        placeholder={placeholder || 'Search by name, email, car, or phone…'} style={inp} />
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
