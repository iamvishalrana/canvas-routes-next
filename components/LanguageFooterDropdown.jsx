'use client'
import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
]

const THEMES = {
  dark: {
    btnColor: 'rgba(245,241,236,0.55)', btnColorHover: 'rgba(245,241,236,0.9)',
    btnBorder: 'rgba(245,241,236,0.2)', btnBorderHover: 'rgba(197,168,130,0.4)',
    menuBg: '#16261A', menuBorder: 'rgba(197,168,130,0.25)', menuShadow: 'rgba(0,0,0,0.35)',
    optionColor: 'rgba(245,241,236,0.7)', optionHoverBg: 'rgba(245,241,236,0.06)',
  },
  light: {
    btnColor: '#aaa', btnColorHover: '#555',
    btnBorder: 'rgba(0,0,0,0.15)', btnBorderHover: 'rgba(197,168,130,0.5)',
    menuBg: '#fff', menuBorder: 'rgba(197,168,130,0.35)', menuShadow: 'rgba(0,0,0,0.12)',
    optionColor: 'rgba(0,0,0,0.65)', optionHoverBg: 'rgba(0,0,0,0.04)',
  },
}

// Footer language switcher — a real dropdown (button + popup list, not a
// native <select>) so it can match the footer's small letter-spaced type
// without triggering iOS's forced-zoom-on-focus behavior for <16px inputs.
// `theme` picks light/dark text+surface colors for use on light vs dark
// footer backgrounds (SiteFooter is dark; FAQ has its own light footer).
export default function LanguageFooterDropdown({ theme = 'dark' }) {
  const c = THEMES[theme] || THEMES.dark
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
          background: 'none', border: `0.5px solid ${c.btnBorder}`,
          padding: '0.35rem 0.65rem', cursor: 'pointer',
          fontSize: '10px', color: c.btnColor,
          letterSpacing: '0.06em', fontFamily: 'var(--font-inter),sans-serif',
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = c.btnColorHover; e.currentTarget.style.borderColor = c.btnBorderHover }}
        onMouseLeave={e => { e.currentTarget.style.color = c.btnColor; e.currentTarget.style.borderColor = c.btnBorder }}
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
          background: c.menuBg, border: `0.5px solid ${c.menuBorder}`,
          minWidth: '130px', zIndex: 20, boxShadow: `0 8px 24px ${c.menuShadow}`,
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
                  fontSize: '11px', color: active ? '#c5a882' : c.optionColor,
                  fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.02em',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = c.optionHoverBg }}
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
