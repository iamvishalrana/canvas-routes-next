'use client'
import { useState, useEffect } from 'react'

// Device palette — brand-adjacent, consistent across all three chart types
const COLORS = {
  iOS:     '#c5a882',
  iPadOS:  '#d9c4a4',
  Android: '#45643c',
  macOS:   '#0F1E14',
  Windows: '#7a8a99',
  Linux:   '#8A6535',
  Other:   '#cccccc',
}
const MODES = ['bars', 'donut', 'split']
const MODE_LABELS = { bars: 'Bars', donut: 'Donut', split: 'Split' }

export default function DeviceChart({ counts }) {
  const [mode, setMode] = useState('bars')
  useEffect(() => {
    try { const m = localStorage.getItem('cr_device_chart'); if (MODES.includes(m)) setMode(m) } catch {}
  }, [])
  function pick(m) { setMode(m); try { localStorage.setItem('cr_device_chart', m) } catch {} }

  const data = (counts || []).filter(c => c.count > 0).sort((a, b) => b.count - a.count)
  const total = data.reduce((s, c) => s + c.count, 0)

  if (!total) {
    return <div style={{ fontSize: '12px', color: '#bbb', padding: '1.5rem 0', textAlign: 'center' }}>No device data yet — it's recorded on every new application from now on.</div>
  }

  const pct = c => Math.round((c.count / total) * 100)

  return (
    <div>
      {/* Chart-type toggle */}
      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.1rem' }}>
        {MODES.map(m => (
          <button key={m} onClick={() => pick(m)}
            style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '5px 12px', minHeight: '28px', border: '0.5px solid', borderRadius: '99px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', background: mode === m ? '#0F1E14' : 'none', color: mode === m ? '#F5F1EC' : '#999', borderColor: mode === m ? '#0F1E14' : 'rgba(0,0,0,0.15)', WebkitTapHighlightColor: 'transparent' }}>
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {mode === 'bars' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {data.map(c => (
            <div key={c.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#555', fontFamily: 'var(--font-inter),sans-serif' }}>{c.label}</span>
                <span style={{ fontSize: '11px', color: '#999', fontVariantNumeric: 'tabular-nums' }}>{c.count} · {pct(c)}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct(c)}%`, background: COLORS[c.label] || '#ccc', borderRadius: '99px', transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'donut' && (() => {
        const R = 15.915 // circumference = 100 for easy dasharray math
        let offset = 25 // start at 12 o'clock
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <svg width="150" height="150" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
              <circle cx="21" cy="21" r={R} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="5" />
              {data.map(c => {
                const p = (c.count / total) * 100
                const el = (
                  <circle key={c.label} cx="21" cy="21" r={R} fill="none"
                    stroke={COLORS[c.label] || '#ccc'} strokeWidth="5"
                    strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={offset} />
                )
                offset -= p
                return el
              })}
              <text x="21" y="20" textAnchor="middle" style={{ fontSize: '7px', fill: '#1a1a1a', fontFamily: 'Georgia,serif' }}>{total}</text>
              <text x="21" y="26" textAnchor="middle" style={{ fontSize: '3px', fill: '#999', letterSpacing: '0.5px', textTransform: 'uppercase' }}>APPLICANTS</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0 }}>
              {data.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: COLORS[c.label] || '#ccc', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#555' }}>{c.label}</span>
                  <span style={{ fontSize: '11px', color: '#999', fontVariantNumeric: 'tabular-nums' }}>{c.count} · {pct(c)}%</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {mode === 'split' && (
        <div>
          <div style={{ display: 'flex', height: '14px', borderRadius: '99px', overflow: 'hidden', marginBottom: '0.9rem' }}>
            {data.map(c => (
              <div key={c.label} title={`${c.label} — ${pct(c)}%`}
                style={{ width: `${(c.count / total) * 100}%`, background: COLORS[c.label] || '#ccc', minWidth: '3px' }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.1rem' }}>
            {data.map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: COLORS[c.label] || '#ccc' }} />
                <span style={{ fontSize: '11px', color: '#555' }}>{c.label} <span style={{ color: '#999' }}>{pct(c)}%</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: '10px', color: '#bbb', marginTop: '1rem', lineHeight: 1.6 }}>
        From the device used on each contact's most recent application or registration.
      </div>
    </div>
  )
}
