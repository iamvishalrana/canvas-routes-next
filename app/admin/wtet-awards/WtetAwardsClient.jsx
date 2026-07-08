'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
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
  const [showNotVoted, setShowNotVoted] = useState(false)
  const [notVotedCopied, setNotVotedCopied] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState(null)

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

  async function resetVotes() {
    setResetting(true)
    setResetError(null)
    try {
      const res = await fetch('/api/admin/wtet-awards/reset', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setResetError(d.error || 'Failed to reset.'); setResetting(false); return }
      setConfirmingReset(false)
      setResetting(false)
      load()
    } catch {
      setResetError('Network error.')
      setResetting(false)
    }
  }

  function copyNotVotedEmails() {
    const emails = (data.notVoted || []).map(p => p.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setNotVotedCopied(true)
      setTimeout(() => setNotVotedCopied(false), 1500)
    }).catch(() => {})
  }

  if (loading) return <div style={{ padding: '1.5rem', fontSize: '13px', color: '#ccc' }}>Loading…</div>
  if (!data) return <div style={{ padding: '1.5rem', fontSize: '13px', color: '#7B2032' }}>Failed to load.</div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '760px' }}>
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
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.3rem 0', borderBottom: i < results.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <div style={{ width: '18px', fontSize: '11px', fontWeight: '600', color: i < 3 ? RANK_COLORS[i] : '#ccc', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    {r.photo ? (
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', position: 'relative', overflow: 'hidden', flexShrink: 0, background: '#EDE8E1' }}>
                        <Image src={r.photo} alt="" fill sizes="32px" quality={60} style={{ objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#EDE8E1', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                      {r.car && <div style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.car}</div>}
                    </div>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <button
            onClick={() => setShowNotVoted(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" style={{ transform: showNotVoted ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Hasn't voted ({(data.notVoted || []).length})</span>
          </button>
          {(data.notVoted || []).length > 0 && (
            <button onClick={copyNotVotedEmails} style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: notVotedCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${notVotedCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
              {notVotedCopied ? 'Copied!' : 'Copy Emails'}
            </button>
          )}
        </div>
        {showNotVoted && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(data.notVoted || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#3B6B2F' }}>Everyone eligible has voted.</div>
            ) : data.notVoted.map(p => (
              <div key={p.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '0.5px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>
                {p.photo ? (
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', position: 'relative', overflow: 'hidden', flexShrink: 0, background: '#EDE8E1' }}>
                    <Image src={p.photo} alt="" fill sizes="28px" quality={60} style={{ objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#EDE8E1', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>
                    {p.name}{p.car && <span style={{ color: '#999', fontWeight: '400' }}> — {p.car}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>{p.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={CARD}>
        <button
          onClick={() => setShowVoters(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" style={{ transform: showVoters ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Who's voted ({data.voters.length})</span>
        </button>
        {showVoters && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.voters.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#ccc' }}>No one yet.</div>
            ) : data.voters.map(v => (
              <div key={v.email} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: '500', color: '#1a1a1a' }}>{v.name} <span style={{ color: '#bbb', fontWeight: '400' }}>· {v.email}</span></span>
                  <span style={{ color: '#bbb', flexShrink: 0 }}>{new Date(v.votedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {v.picks.map(p => (
                    <div key={p.categoryId} style={{ fontSize: '11px', color: '#888', display: 'flex', gap: '0.4rem' }}>
                      <span style={{ minWidth: '150px', flexShrink: 0, color: '#aaa' }}>{p.categoryLabel}</span>
                      <span style={{ color: p.name ? '#1a1a1a' : '#ccc' }}>
                        {p.name || '—'}{p.car ? ` — ${p.car}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...CARD, border: '0.5px solid rgba(123,32,50,0.25)' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Danger Zone</div>
        <div style={{ fontSize: '12px', color: '#888', margin: '0.2rem 0 1rem' }}>
          Permanently deletes every ballot cast so far ({data.totalVotes}). Use this to clear test votes before real voting starts — cannot be undone.
        </div>
        {!confirmingReset ? (
          <button
            onClick={() => setConfirmingReset(true)}
            style={{ background: 'none', border: '0.5px solid #7B2032', color: '#7B2032', borderRadius: '6px', padding: '0.6rem 1.1rem', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
          >
            Reset All Votes
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#7B2032', fontWeight: '500' }}>
              Delete all {data.totalVotes} ballot{data.totalVotes !== 1 ? 's' : ''}? This can't be undone.
            </span>
            <button
              onClick={resetVotes}
              disabled={resetting}
              style={{ background: '#7B2032', border: 'none', color: '#fff', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '12px', fontWeight: '600', cursor: resetting ? 'wait' : 'pointer', opacity: resetting ? 0.6 : 1 }}
            >
              {resetting ? 'Resetting…' : 'Yes, delete everything'}
            </button>
            <button
              onClick={() => setConfirmingReset(false)}
              disabled={resetting}
              style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', color: '#555', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        )}
        {resetError && <Err msg={resetError} />}
      </div>
    </div>
  )
}
