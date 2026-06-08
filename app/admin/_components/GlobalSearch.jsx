'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

function ResultGroup({ label, items, onSelect }) {
  if (!items.length) return null
  return (
    <div>
      <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>{label}</div>
      {items.map((item, i) => (
        <button key={i} onClick={() => onSelect(item.href)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: item.color || '#e8e6e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'var(--font-inter),sans-serif', fontWeight: '500' }}>
              {(item.name || item.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name || '—'}</div>
            <div style={{ fontSize: '11px', color: '#999', fontFamily: 'var(--font-inter),sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.email}{item.sub ? ` · ${item.sub}` : ''}</div>
          </div>
          {item.badge && (
            <span style={{ marginLeft: 'auto', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', border: '0.5px solid rgba(0,0,0,0.15)', color: '#888', flexShrink: 0, fontFamily: 'var(--font-inter),sans-serif' }}>{item.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function GlobalSearch() {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef(null)
  const router                = useRouter()

  // Cmd+K to open
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults(null) }
  }, [open])

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search])

  function navigate(href) {
    router.push(href)
    setOpen(false)
  }

  const hasResults = results && (results.members?.length || results.applications?.length || results.contacts?.length)

  const memberItems  = (results?.members || []).map(m => ({ name: m.name, email: m.email, badge: m.membership_status, sub: [m.car_make, m.car_model].filter(Boolean).join(' '), color: '#3B6B2F', href: `/admin/members` }))
  const appItems     = (results?.applications || []).map(a => ({ name: a.name, email: a.email, badge: a.stripe_payment_status, sub: a.car_model, color: '#8A6535', href: `/admin/applications` }))
  const contactItems = (results?.contacts || []).map(c => ({ name: c.applications?.name, email: c.applications?.email, sub: c.applications?.car_model, color: '#555', href: `/admin/contacts` }))

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.55rem 0.9rem', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(197,168,130,0.15)', cursor: 'pointer', color: 'rgba(245,241,236,0.4)', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', transition: 'all 0.15s' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
      <kbd style={{ fontSize: '9px', letterSpacing: '0.05em', background: 'rgba(197,168,130,0.12)', border: '0.5px solid rgba(197,168,130,0.2)', padding: '1px 5px', color: 'rgba(197,168,130,0.5)', fontFamily: 'var(--font-inter),sans-serif' }}>⌘K</kbd>
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '520px', margin: '0 1rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 16px 60px rgba(0,0,0,0.2)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search members, applications, contacts…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', background: 'transparent' }} />
          {loading && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#0F1E14', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
          <kbd onClick={() => setOpen(false)} style={{ fontSize: '9px', letterSpacing: '0.04em', background: 'rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.12)', padding: '2px 6px', color: '#999', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto' }}>
          {query.length < 2 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>Type at least 2 characters to search</div>
          ) : !hasResults && !loading ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>No results for &ldquo;{query}&rdquo;</div>
          ) : (
            <div style={{ paddingBottom: '0.5rem' }}>
              <ResultGroup label="Members" items={memberItems} onSelect={navigate} />
              <ResultGroup label="Applications" items={appItems} onSelect={navigate} />
              <ResultGroup label="Contacts" items={contactItems} onSelect={navigate} />
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
