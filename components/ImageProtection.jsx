'use client'
import { useEffect } from 'react'

export default function ImageProtection() {
  useEffect(() => {
    function block(e) {
      if (e.target.closest('img, [data-protect]')) {
        e.preventDefault()
        return false
      }
    }
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [])
  return null
}
