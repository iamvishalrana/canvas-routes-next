'use client'
import { useState, useEffect, useRef } from 'react'
import { GhostBtn } from '../_components/shared'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

export default function ToolsClient() {
  const [hcStatus, setHcStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [hcRuns, setHcRuns]     = useState([])   // last 4 workflow run objects
  const hcTimer = useRef(null)
  const refreshTimer = useRef(null)
  const [igRefreshing, setIgRefreshing] = useState(false)
  const [igResult, setIgResult] = useState(null)
  const [igChecking, setIgChecking] = useState(false)
  const [igCheckResult, setIgCheckResult] = useState(null)
  const [newToken, setNewToken] = useState('')
  const [settingToken, setSettingToken] = useState(false)
  const [setTokenResult, setSetTokenResult] = useState(null)

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

  async function setInstagramToken() {
    if (!newToken.trim()) return
    setSettingToken(true); setSetTokenResult(null)
    try {
      const res = await fetch('/api/instagram/set-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken.trim() }),
      })
      const d = await res.json().catch(() => ({ error: 'Invalid response' }))
      setSetTokenResult(d)
      if (!d.error) setNewToken('')
    } catch {
      setSetTokenResult({ error: 'Request failed' })
    }
    setSettingToken(false)
  }

  async function checkInstagramToken() {
    setIgChecking(true); setIgCheckResult(null)
    try {
      const res = await fetch('/api/instagram/check-token', { method: 'POST' })
      const d = await res.json().catch(() => ({ error: 'Invalid response' }))
      setIgCheckResult(d)
    } catch {
      setIgCheckResult({ error: 'Request failed' })
    }
    setIgChecking(false)
  }

  async function refreshInstagramToken() {
    setIgRefreshing(true)
    setIgResult(null)
    try {
      const res = await fetch('/api/instagram/refresh', { method: 'POST' })
      const d = await res.json().catch(() => ({ error: 'Invalid response' }))
      setIgResult(d)
    } catch {
      setIgResult({ error: 'Request failed' })
    }
    setIgRefreshing(false)
  }

  function dotColor(run) {
    if (!run) return 'rgba(0,0,0,0.1)'
    if (run.status === 'in_progress' || run.status === 'queued') return '#c5a882'
    if (run.conclusion === 'success') return '#3B6B2F'
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') return '#93333E'
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
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Tools</h1>
      </div>

      {/* Instagram Token */}
      <div style={{ padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: '1rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem' }}>Instagram Token</div>

        {/* Set new token (use when current token is dead/expired) */}
        <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: '12px', color: '#555', marginBottom: '0.6rem', lineHeight: 1.6 }}>
            <strong>Token expired or gallery missing?</strong> Get a fresh short-lived token from{' '}
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" style={{ color: '#c5a882' }}>Facebook Graph Explorer</a>
            {' '}→ select the Canvas Routes app → Generate Token (check <code>instagram_basic</code> + <code>pages_read_engagement</code>), then paste it below. This will exchange it for a 60-day token and store it automatically.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newToken}
              onChange={e => setNewToken(e.target.value)}
              placeholder="Paste short-lived token here…"
              style={{ flex: 1, minWidth: '240px', padding: '0.55rem 0.75rem', fontSize: '12px', border: '0.5px solid rgba(0,0,0,0.18)', fontFamily: 'var(--font-inter), sans-serif', outline: 'none', background: '#fafaf9' }}
            />
            <GhostBtn small onClick={setInstagramToken} disabled={settingToken || !newToken.trim()}>
              {settingToken ? 'Saving…' : 'Save New Token'}
            </GhostBtn>
          </div>
          {setTokenResult && (
            <div style={{ marginTop: '0.6rem', fontSize: '12px', color: setTokenResult.error ? '#93333E' : '#3B6B2F', lineHeight: 1.6 }}>
              {setTokenResult.error
                ? `Error: ${setTokenResult.error}`
                : setTokenResult.tokenType === 'page'
                  ? `✓ Page token saved for "${setTokenResult.pageName}" — never expires and won't break if you log out of Facebook. Gallery should reappear within a minute.`
                  : setTokenResult.tokenType === 'system_user'
                  ? `✓ System User token saved — never expires. Gallery should reappear within a minute.`
                  : setTokenResult.warning
                  ? `⚠ Gallery restored — but: ${setTokenResult.warning}`
                  : `Token saved — valid for ${setTokenResult.daysLeft} days until ${new Date(setTokenResult.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })}. Gallery should reappear within a minute.`
              }
            </div>
          )}
        </div>

        {/* Extend existing token */}
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.75rem', lineHeight: '1.6' }}>
          <strong>Token still valid?</strong> Extend it for another 60 days without leaving the page.
        </div>
        <GhostBtn small onClick={refreshInstagramToken} disabled={igRefreshing}>
          {igRefreshing ? 'Refreshing…' : 'Extend Current Token'}
        </GhostBtn>
        {igResult && (
          <div style={{ marginTop: '0.75rem', fontSize: '12px', color: igResult.error ? '#93333E' : '#3B6B2F', lineHeight: 1.6 }}>
            {igResult.error
              ? `Error: ${igResult.error}`
              : `Token refreshed — valid for ${igResult.daysLeft} days (until ${new Date(igResult.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })}). Stored in Supabase automatically.`
            }
          </div>
        )}

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.6rem', lineHeight: 1.6 }}>
            Verify the token is working right now. A daily automated check already runs at 8 AM and emails you if anything is wrong.
          </div>
          <GhostBtn small onClick={checkInstagramToken} disabled={igChecking}>
            {igChecking ? 'Checking…' : 'Check Token Now'}
          </GhostBtn>
          {igCheckResult && (
            <div style={{ marginTop: '0.6rem', fontSize: '12px', lineHeight: 1.6, color: igCheckResult.status === 'ok' ? '#3B6B2F' : igCheckResult.status === 'expiring_soon' ? '#8A6535' : '#93333E' }}>
              {igCheckResult.status === 'ok' && `✓ Token is valid${igCheckResult.daysLeft ? ` — ${igCheckResult.daysLeft} days remaining` : ''}`}
              {igCheckResult.status === 'expiring_soon' && `⚠ Token expires in ${igCheckResult.daysLeft} days — click "Extend Current Token" now`}
              {igCheckResult.status === 'dead' && `✕ Token is dead: ${igCheckResult.error} — paste a new token above`}
              {igCheckResult.status === 'missing' && `✕ No token configured — paste one above`}
              {igCheckResult.error && !igCheckResult.status && `Error: ${igCheckResult.error}`}
            </div>
          )}
        </div>
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
              background: hcStatus === 'ok' ? 'rgba(59,107,47,0.08)' : hcStatus === 'error' ? 'rgba(147,51,62,0.06)' : 'transparent',
              border: `0.5px solid ${hcStatus === 'ok' ? 'rgba(59,107,47,0.4)' : hcStatus === 'error' ? 'rgba(147,51,62,0.4)' : 'rgba(0,0,0,0.2)'}`,
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: hcStatus === 'ok' ? '#3B6B2F' : hcStatus === 'error' ? '#93333E' : '#1a1a1a',
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
