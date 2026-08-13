'use client'
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { ConfirmDialog } from './shared'

// Imperative confirmation popup for the whole admin panel. Mounted once in
// AdminShell so every tab shares one modal. Any handler that notifies a
// customer (sends an email, invite, link, reminder, receipt, broadcast, or
// captures/refunds a payment that emails as a side effect) must gate itself:
//
//   const confirm = useConfirm()
//   if (!(await confirm({ title: 'Send the receipt to jane@x.com?' }))) return
//
// This guarantees the ask is ALWAYS a real popup (ConfirmDialog is a fixed
// overlay modal), never an inline prompt, and never fires without a Yes/No.
const ConfirmContext = createContext(null)

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return confirm
}

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null)
  // Holds the pending promise's resolver between opening the dialog and the
  // user answering. A ref (not state) so resolving doesn't depend on a render.
  const resolverRef = useRef(null)

  const confirm = useCallback((options = {}) => {
    // If a previous confirm is somehow still open, resolve it false first so
    // its awaiter never hangs.
    if (resolverRef.current) { resolverRef.current(false); resolverRef.current = null }
    return new Promise(resolve => {
      resolverRef.current = resolve
      setOpts(options)
    })
  }, [])

  const settle = useCallback(result => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setOpts(null)
    if (resolve) resolve(result)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <ConfirmDialog
          {...opts}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  )
}
