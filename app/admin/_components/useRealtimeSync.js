'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase/client'

export function useRealtimeSync(tables, onRefresh) {
  const cbRef = useRef(onRefresh)
  useEffect(() => { cbRef.current = onRefresh })

  useEffect(() => {
    let supabase = null
    const channels = []
    try {
      supabase = createClient()
      const tableList = Array.isArray(tables) ? tables : [tables]
      tableList.forEach(table => {
        const ch = supabase
          .channel(`admin-sync-${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
            cbRef.current()
          })
          .subscribe((status, err) => {
            // Swallow connection errors (e.g. Safari SecurityError) — page works without realtime
            if (err) { /* silent degradation */ }
          })
        channels.push(ch)
      })
    } catch {
      // Realtime unavailable (insecure context, storage blocked, WebSocket unavailable)
      // Degrade silently — admin still works, just without live auto-refresh
    }
    return () => {
      if (supabase) channels.forEach(ch => { try { supabase.removeChannel(ch) } catch {} })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
