'use client'
import { createContext, useContext, useCallback, useRef, useState } from 'react'

// Global error-toast system for the whole admin panel. Mounted once in
// AdminShell, mirroring ConfirmProvider's pattern. The shared `Err`
// component (shared.jsx) calls pushError() directly, so every existing
// `<Err msg={...} />` call site across every admin page becomes a popup
// automatically — no changes needed at any of those call sites, since they
// all already pass just a `msg` string.
const ErrorToastContext = createContext(null)

export function useErrorToast() {
  const ctx = useContext(ErrorToastContext)
  if (!ctx) throw new Error('useErrorToast must be used inside <ErrorToastProvider>')
  return ctx
}

const AUTO_DISMISS_MS = 7000

export function ErrorToastProvider({ children }) {
  const [toasts, setToasts] = useState([]) // [{ id, msg }]
  const idRef = useRef(0)

  const pushError = useCallback((msg) => {
    if (!msg) return
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), AUTO_DISMISS_MS)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ErrorToastContext.Provider value={{ pushError }}>
      {children}
      {/* Fixed above everything, never blocks interaction with the page
          behind it (only the toast cards themselves are clickable) — a
          non-blocking notification, not a modal you have to dismiss before
          doing anything else. */}
      <div style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
        width: 'min(92vw, 440px)', pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} role="alert"
            style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
              background: '#2a1013', border: '0.5px solid rgba(147,51,62,0.5)',
              color: '#F5F1EC', borderRadius: '10px', padding: '0.75rem 0.85rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              fontSize: '13px', lineHeight: 1.5, fontFamily: 'var(--font-inter),sans-serif',
              animation: 'err-toast-in 0.25s cubic-bezier(0.2,0.7,0.2,1) both',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e37f8a" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{t.msg}</div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss"
              style={{ background: 'none', border: 'none', color: 'rgba(245,241,236,0.5)', cursor: 'pointer', fontSize: '17px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes err-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </ErrorToastContext.Provider>
  )
}
