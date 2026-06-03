'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F5F1EC',
      fontFamily: 'var(--font-inter),sans-serif',
      gap: '1.5rem',
      padding: '2rem',
    }}>
      <div style={{ width: '30px', height: '1px', background: '#c5a882' }} />
      <p style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888' }}>
        Something went wrong
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 2rem',
          border: '1px solid #1a1a1a',
          background: 'transparent',
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter),sans-serif',
        }}
      >
        Try again
      </button>
    </div>
  )
}
