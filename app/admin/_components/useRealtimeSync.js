'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase/client'

// Subscribes to Postgres changes on one or more tables and calls onRefresh on any event.
// Uses a ref so the latest onRefresh is always called without recreating the subscription.
export function useRealtimeSync(tables, onRefresh) {
  const cbRef = useRef(onRefresh)
  useEffect(() => { cbRef.current = onRefresh })

  useEffect(() => {
    const supabase = createClient()
    const tableList = Array.isArray(tables) ? tables : [tables]
    const channels = tableList.map(table =>
      supabase
        .channel(`admin-sync-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          cbRef.current()
        })
        .subscribe()
    )
    return () => { channels.forEach(ch => supabase.removeChannel(ch)) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
