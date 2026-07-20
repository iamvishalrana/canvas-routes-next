'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'

// Compact EN/FR segmented toggle — matches the nav's small uppercase
// letter-spaced button language. Only rendered on pages that actually have
// translations wired up (SiteNav's showLangToggle prop).
export default function LanguageToggle({ style }) {
  const { lang, setLang } = useLanguage()
  const seg = (code, label) => {
    const active = lang === code
    return (
      <button
        type="button"
        onClick={() => setLang(code)}
        aria-pressed={active}
        style={{
          fontFamily: 'var(--font-inter),sans-serif',
          fontSize: '10px',
          letterSpacing: '0.1em',
          padding: '0.3rem 0.55rem',
          border: 'none',
          background: active ? '#0F1E14' : 'transparent',
          color: active ? '#F5F1EC' : '#999',
          cursor: active ? 'default' : 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <div style={{ display: 'inline-flex', border: '0.5px solid rgba(0,0,0,0.18)', ...style }}>
      {seg('en', 'EN')}
      {seg('fr', 'FR')}
    </div>
  )
}
