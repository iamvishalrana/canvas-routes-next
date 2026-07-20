'use client'
import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
]

// Footer language switcher — a real dropdown (button + popup list, not a
// native <select>) so it can match the footer's small letter-spaced type
// without triggering iOS's forced-zoom-on-focus behavior for <16px inputs.
export default function LanguageFooterDropdown() {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = LANGS.find(l => l.code === lang) || LANGS[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: 'none', border: '0.5px solid rgba(245,241,236,0.2)',
          padding: '0.35rem 0.65rem', cursor: 'pointer',
          fontSize: '10px', color: 'rgba(245,241,236,0.55)',
          letterSpacing: '0.06em', fontFamily: 'var(--font-inter),sans-serif',
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(245,241,236,0.9)'; e.currentTarget.style.borderColor = 'rgba(197,168,130,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,241,236,0.55)'; e.currentTarget.style.borderColor = 'rgba(245,241,236,0.2)' }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        {current.label}
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div role="listbox" style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
          background: '#16261A', border: '0.5px solid rgba(197,168,130,0.25)',
          minWidth: '130px', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          {LANGS.map(l => {
            const active = l.code === lang
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setLang(l.code); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: active ? 'rgba(197,168,130,0.12)' : 'none',
                  border: 'none', padding: '0.6rem 0.85rem', cursor: 'pointer',
                  fontSize: '11px', color: active ? '#c5a882' : 'rgba(245,241,236,0.7)',
                  fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.02em',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(245,241,236,0.06)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
