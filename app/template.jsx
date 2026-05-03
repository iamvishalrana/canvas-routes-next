'use client'
import { useRef } from 'react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

const PAGES = ['/', '/privacy']

export default function Template({ children }) {
  const pathname = usePathname()
  const prevPathRef = useRef(null)
  const dirRef = useRef(0)

  if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
    const pi = PAGES.indexOf(prevPathRef.current)
    const ci = PAGES.indexOf(pathname)
    dirRef.current = ci > pi ? 1 : -1
  }
  prevPathRef.current = pathname

  return (
    <motion.div
      initial={{ x: `${dirRef.current * 100}%` }}
      animate={{ x: 0 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}
