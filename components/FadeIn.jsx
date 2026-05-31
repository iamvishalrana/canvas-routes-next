'use client'
import { motion } from 'framer-motion'

export default function FadeIn({ children, delay = 0, style = {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.01 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      style={style}
    >
      {children}
    </motion.div>
  )
}
