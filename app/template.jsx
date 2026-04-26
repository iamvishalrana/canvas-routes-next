'use client'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

const PAGES = ['/', '/privacy']
let _prevPath = null
let _dir = 0

export default function Template({ children }) {
  const pathname = usePathname()

  if (_prevPath !== null && _prevPath !== pathname) {
    const pi = PAGES.indexOf(_prevPath)
    const ci = PAGES.indexOf(pathname)
    _dir = ci > pi ? 1 : -1
  }
  _prevPath = pathname

  return (
    <motion.div
      initial={{ x: `${_dir * 100}%` }}
      animate={{ x: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}
