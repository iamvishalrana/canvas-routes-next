'use client'
import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'

const PAGES = ['/', '/privacy']

export default function PageTransitionWrapper({ children }) {
  const pathname = usePathname()
  const prevRef = useRef(pathname)
  const dirRef = useRef(0)

  if (prevRef.current !== pathname) {
    const prevIdx = PAGES.indexOf(prevRef.current)
    const currIdx = PAGES.indexOf(pathname)
    dirRef.current = currIdx > prevIdx ? 1 : -1
    prevRef.current = pathname
  }

  return (
    <div style={{ overflowX: 'hidden' }}>
      <AnimatePresence mode="wait" initial={false} custom={dirRef.current}>
        <motion.div
          key={pathname}
          custom={dirRef.current}
          variants={{
            initial: d => ({ x: `${d * 100}%` }),
            animate: { x: 0 },
            exit: d => ({ x: `${d * -100}%` }),
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
