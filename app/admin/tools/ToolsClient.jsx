'use client'
import { useState, useEffect, useRef } from 'react'
import { GhostBtn } from '../_components/shared'

export default function ToolsClient() {
  const [hcStatus, setHcStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [hcRuns, setHcRuns]     = useState([])   // last 4 workflow run objects
  const hcTimer = useRef(null)
  const refreshTimer = useRef(null)
  const [importRunning, setImportRunning] = useState(false)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    fetchRuns()
    return () => { clearTimeout(hcTimer.current); clearTimeout(refreshTimer.current) }
  }, [])

  function fetchRuns() {
    fetch('/api/admin/health-check')
      .then(r => r.ok ? r.json() : { runs: [] })
      .then(d => setHcRuns(d.runs || []))
      .catch(() => {})
  }

  async function runHealthCheck() {
    if (hcStatus === 'loading') return
    setHcStatus('loading')
    try {
      const res = await fetch('/api/admin/health-check', { method: 'POST' })
      setHcStatus(res.ok ? 'ok' : 'error')
      // GitHub takes ~8s to register a new run — refresh after that
      refreshTimer.current = setTimeout(fetchRuns, 8000)
    } catch {
      setHcStatus('error')
    }
    hcTimer.current = setTimeout(() => setHcStatus(null), 4000)
  }

  async function runImport() {
    setImportRunning(true)
    setImportResult(null)
    const res = await fetch('/api/admin/import-cc', { method: 'POST' })
    const d = await res.json().catch(() => ({ error: 'Invalid response' }))
    setImportResult(d)
    setImportRunning(false)
  }

  function dotColor(run) {
    if (!run) return 'rgba(0,0,0,0.1)'
    if (run.status === 'in_progress' || run.status === 'queued') return '#c5a882'
    if (run.conclusion === 'success') return '#3B6B2F'
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') return '#7B2032'
    return 'rgba(0,0,0,0.15)'
  }

  function dotLabel(run) {
    if (!run) return 'No data'
    const diff = Date.now() - new Date(run.created_at).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor(diff / 60000)
    const age = h >= 24 ? `${Math.floor(h / 24)}d ago` : h >= 1 ? `${h}h ago` : `${m}m ago`
    const result = run.status !== 'completed' ? run.status : (run.conclusion || 'unknown')
    return `${age} · ${result}`
  }

  // Always show 4 dots — unfilled gray for slots with no data yet
  const dots = Array.from({ length: 4 }, (_, i) => hcRuns[i] || null)

  const tool = { heading: '#1a1a1a', sub: '#888', border: 'rgba(0,0,0,0.08)', bg: '#fff' }

  return (
    <div style={{ padding: 'clamp(1.25rem,4vw,2.5rem)', maxWidth: '680px' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbb', marginBottom: '2rem' }}>Tools</div>

      {/* Legacy Import */}
      <div style={{ marginTop: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem' }}>Legacy Import</div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '1rem', lineHeight: '1.6' }}>
          Import legacy Canvas Routes attendees into the applications table. This endpoint is gated by the <code>IMPORT_CC_ENABLED</code> environment variable.
        </div>
        <GhostBtn small onClick={runImport} disabled={importRunning}>{importRunning ? 'Importing…' : 'Run Import'}</GhostBtn>
        {importResult && <div style={{ marginTop: '0.75rem', fontSize: '12px', color: importResult.error ? '#7B2032' : '#3B6B2F' }}>{importResult.error || importResult.message || JSON.stringify(importResult)}</div>}
      </div>

      {/* Site Health Check */}
      <div style={{ border: `0.5px solid ${tool.border}`, background: tool.bg, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            {/* Title + 4 status dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: tool.heading }}>Site Health Check</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {dots.map((run, i) => (
                  <div
                    key={i}
                    title={dotLabel(run)}
                    style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: dotColor(run),
                      flexShrink: 0,
                      transition: 'background 0.4s',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: tool.sub, lineHeight: '1.6', maxWidth: '380px' }}>
              Runs Playwright tests against all registration pages and APIs — route form, membership form, and member login. Scheduled automatically 4× daily. Results visible on GitHub Actions.
            </div>
            <a href="https://github.com/iamvishalrana/canvas-routes-next/actions/workflows/health-check.yml"
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '11px', color: '#c5a882', textDecoration: 'none', letterSpacing: '0.04em' }}>
              View results on GitHub →
            </a>
          </div>
          <button onClick={runHealthCheck} disabled={hcStatus === 'loading'}
            style={{
              flexShrink: 0, padding: '0.6rem 1.25rem',
              background: hcStatus === 'ok' ? 'rgba(59,107,47,0.08)' : hcStatus === 'error' ? 'rgba(123,32,50,0.06)' : 'transparent',
              border: `0.5px solid ${hcStatus === 'ok' ? 'rgba(59,107,47,0.4)' : hcStatus === 'error' ? 'rgba(123,32,50,0.4)' : 'rgba(0,0,0,0.2)'}`,
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: hcStatus === 'ok' ? '#3B6B2F' : hcStatus === 'error' ? '#7B2032' : '#1a1a1a',
              cursor: hcStatus === 'loading' ? 'wait' : 'pointer',
              fontFamily: 'var(--font-inter),sans-serif', transition: 'all 0.2s',
            }}>
            {hcStatus === 'loading' ? 'Triggering…' : hcStatus === 'ok' ? 'Triggered ✓' : hcStatus === 'error' ? 'Failed ✗' : 'Run Now'}
          </button>
        </div>
      </div>

    </div>
  )
}
