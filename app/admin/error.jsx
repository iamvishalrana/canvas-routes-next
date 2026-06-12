'use client'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function AdminError({ error, reset }) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1E14',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-inter),sans-serif', gap: '1.25rem', padding: '2rem',
    }}>
      <div style={{ width: '28px', height: '1px', background: '#c5a882' }} />
      <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', margin: 0 }}>
        Something went wrong
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 2rem', border: '1px solid rgba(197,168,130,0.35)',
          background: 'transparent', color: '#c5a882',
          fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif',
        }}
      >
        Try again
      </button>
    </div>
  )
}
