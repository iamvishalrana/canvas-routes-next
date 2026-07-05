'use client'
import { useState, useEffect, useCallback } from 'react'
import { Err, ToggleSwitch } from '../_components/shared'
import { CATEGORY_DISCOUNT_PCT } from '../../../lib/wtetAwardsContent'

const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }
const RANK_COLORS = ['#c5a882', '#999', '#a97142'] // gold, silver, bronze

export default function WtetAwardsClient() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [votingOpen, setVotingOpen] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState(null)
  const [showVoters, setShowVoters] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/wtet-awards').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/admin/settings').then(r => r.ok ? r.json() : {}),
    ])
      .then(([tallyData, settings]) => {
        setData(tallyData)
        setVotingOpen(settings.wtet_awards_open === 'true')
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleVoting(next) {
    setToggling(true)
    setToggleError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'wtet_awards_open', value: next ? 'true' : 'false' }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToggleError(d.error || 'Failed to save.'); return }
      setVotingOpen(next)
    } catch {
      setToggleError('Network error.')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontSize: '13px', color: '#ccc' }}>Loading…</div>
  if (!data) return <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontSize: '13px', color: '#7B2032' }}>Failed to load.</div>

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '760px' }}>
      <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.8rem', fontWeight: '400', color: '#1a1a1a', margin: '0 0 0.4rem' }}>Route Awards</h1>
      <p style={{ fontSize: '12px', color: '#888', margin: '0 0 1.5rem' }}>
        Public ballot: <a href="/wtet-awards" target="_blank" rel="noreferrer" style={{ color: '#8A6535' }}>canvasroutes.com/wtet-awards</a>
      </p>

      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Voting Open</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '0.2rem' }}>
              {votingOpen ? 'Participants can submit and change their ballot.' : 'The public page shows "voting isn’t open yet."'}
            </div>
          </div>
          <ToggleSwitch checked={votingOpen} onChange={toggleVoting} disabled={toggling} label="Voting open" />
        </div>
        {toggleError && <Err msg={toggleError} />}
      </div>

      <div style={{ ...CARD, display: 'flex', gap: '2rem' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '300', color: '#1a1a1a' }}>{data.totalVotes}</div>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', marginTop: '2px' }}>Ballots cast</div>
        </div>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '300', color: '#1a1a1a' }}>{data.totalEligible}</div>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', marginTop: '2px' }}>Eligible participants</div>
        </div>
      </div>

      {data.categories.map(cat => {
        const results = data.tallies[cat.id] || []
        return (
          <div key={cat.id} style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>{cat.label}</h2>
              <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid #c5a882', borderRadius: '99px', padding: '2px 8px', flexShrink: 0 }}>
                Winner gets {CATEGORY_DISCOUNT_PCT[cat.id]}% off
              </span>
            </div>
            {results.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#ccc' }}>No votes yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {results.map((r, i) => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '20px', fontSize: '11px', fontWeight: '600', color: i < 3 ? RANK_COLORS[i] : '#ccc', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, fontSize: '13px', color: '#1a1a1a' }}>{r.name}</div>
                    {i === 0 && (
                      <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: RANK_COLORS[0], border: `0.5px solid ${RANK_COLORS[0]}`, borderRadius: '99px', padding: '2px 8px', flexShrink: 0 }}>
                        {CATEGORY_DISCOUNT_PCT[cat.id]}% off
                      </span>
                    )}
                    <div style={{ fontSize: '12px', color: '#888', flexShrink: 0, minWidth: '48px', textAlign: 'right' }}>{r.count} vote{r.count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div style={CARD}>
        <button
          onClick={() => setShowVoters(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" style={{ transform: showVoters ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Who's voted ({data.voters.length})</span>
        </button>
        {showVoters && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {data.voters.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#ccc' }}>No one yet.</div>
            ) : data.voters.map(v => (
              <div key={v.email} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', borderBottom: '0.5px solid rgba(0,0,0,0.05)', paddingBottom: '0.4rem' }}>
                <span>{v.name} <span style={{ color: '#bbb' }}>· {v.email}</span></span>
                <span style={{ color: '#bbb', flexShrink: 0 }}>{new Date(v.votedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
