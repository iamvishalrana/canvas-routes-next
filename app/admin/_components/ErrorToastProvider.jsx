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
const EXIT_MS = 220 // must match the err-toast-out animation duration below

export function ErrorToastProvider({ children }) {
  const [toasts, setToasts] = useState([]) // [{ id, msg, leaving }]
  const idRef = useRef(0)
  const enterTimersRef = useRef(new Map()) // id -> auto-dismiss timeout, cleared on manual close

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Starts the exit animation rather than removing immediately — actual
  // removal happens in onAnimationEnd below (the clean path) or the fallback
  // timeout here (in case the animation never fires, e.g.
  // prefers-reduced-motion, so a toast can never get stuck on-screen).
  const beginDismiss = useCallback((id) => {
    const enterTimer = enterTimersRef.current.get(id)
    if (enterTimer) { clearTimeout(enterTimer); enterTimersRef.current.delete(id) }
    setToasts(prev => prev.map(t => (t.id === id && !t.leaving) ? { ...t, leaving: true } : t))
    setTimeout(() => remove(id), EXIT_MS + 60)
  }, [remove])

  const pushError = useCallback((msg) => {
    if (!msg) return
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, msg, leaving: false }])
    enterTimersRef.current.set(id, setTimeout(() => beginDismiss(id), AUTO_DISMISS_MS))
  }, [beginDismiss])

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
            onAnimationEnd={() => { if (t.leaving) remove(t.id) }}
            style={{
              pointerEvents: t.leaving ? 'none' : 'auto',
              display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
              background: '#2a1013', border: '0.5px solid rgba(147,51,62,0.5)',
              color: '#F5F1EC', borderRadius: '10px', padding: '0.75rem 0.85rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              fontSize: '13px', lineHeight: 1.5, fontFamily: 'var(--font-inter),sans-serif',
              animation: t.leaving
                ? `err-toast-out ${EXIT_MS}ms cubic-bezier(0.4,0,1,1) both`
                : 'err-toast-in 0.25s cubic-bezier(0.2,0.7,0.2,1) both',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e37f8a" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{t.msg}</div>
            <button type="button" onClick={() => beginDismiss(t.id)} aria-label="Dismiss"
              style={{ background: 'none', border: 'none', color: 'rgba(245,241,236,0.5)', cursor: 'pointer', fontSize: '17px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes err-toast-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes err-toast-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(6px) scale(0.96); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="alert"] { animation: none !important; }
        }
      `}</style>
    </ErrorToastContext.Provider>
  )
}
