'use client'
import { useState } from 'react'
import { inp, sel, L, PrimaryBtn, GhostBtn, Err } from '../_components/shared'

const AUDIENCE_OPTIONS = [
  { value: 'all_members',    label: 'All Members'         },
  { value: 'active_members', label: 'Active Members Only' },
  { value: 'inner_circle',   label: 'Inner Circle'        },
  { value: 'all_contacts',   label: 'All Contacts'        },
  { value: 'everyone',       label: 'Everyone'            },
]

function buildHtml(body) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;">
<img src="https://canvasroutes.com/canvas_routes_refined.png" width="160" style="margin-bottom:24px;display:block;" alt="Canvas Routes"/>
<p style="font-size:15px;line-height:1.7;">${body.replace(/\n/g, '<br/>')}</p>
<hr style="border:none;border-top:1px solid #eee;margin:32px 0;"/>
<p style="font-size:11px;color:#999;">Canvas Routes · Montreal, QC</p>
</body></html>`
}

export default function BroadcastsClient() {
  const [audience, setAudience]     = useState('all_members')
  const [subject, setSubject]       = useState('')
  const [body, setBody]             = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [confirm, setConfirm]       = useState(false)
  const [sending, setSending]       = useState(false)
  const [error, setError]           = useState(null)
  const [result, setResult]         = useState(null) // { sent, failed }

  const audienceLabel = AUDIENCE_OPTIONS.find(o => o.value === audience)?.label || audience

  function handleSendClick() {
    setError(null)
    if (!subject.trim()) { setError('Subject is required.'); return }
    if (!body.trim()) { setError('Message body is required.'); return }
    setConfirm(true)
  }

  async function confirmSend() {
    setConfirm(false)
    setSending(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), html: buildHtml(body), audience }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send broadcast.'); return }
      setResult(data)
      setSubject('')
      setBody('')
      setShowPreview(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '720px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem' }}>
          Communication
        </div>
        <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-cormorant),serif', color: '#1a1a1a', letterSpacing: '0.02em' }}>
          Broadcasts
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ background: 'rgba(197,168,130,0.1)', border: '0.5px solid rgba(197,168,130,0.4)', padding: '0.85rem 1.1rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A6535" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style={{ fontSize: '12px', color: '#8A6535', lineHeight: '1.6' }}>
          Broadcast emails cannot be unsent. Review carefully before sending.
        </span>
      </div>

      {/* Success result */}
      {result && (
        <div style={{ background: 'rgba(59,107,47,0.07)', border: '0.5px solid rgba(59,107,47,0.3)', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '13px', color: '#3B6B2F', fontWeight: '500', marginBottom: result.failed > 0 ? '0.35rem' : 0 }}>
            Broadcast sent — {result.sent} email{result.sent !== 1 ? 's' : ''} delivered.
          </div>
          {result.failed > 0 && (
            <div style={{ fontSize: '12px', color: '#7B2032' }}>{result.failed} failed to send.</div>
          )}
          <button
            onClick={() => setResult(null)}
            style={{ marginTop: '0.65rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '11px', color: '#999', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Send another
          </button>
        </div>
      )}

      {/* Compose form */}
      {!result && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.75rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem' }}>
            Compose
          </div>

          {/* Audience */}
          <div style={{ marginBottom: '1rem' }}>
            <L>Audience</L>
            <div style={{ position: 'relative', maxWidth: '280px' }}>
              <select style={sel} value={audience} onChange={e => setAudience(e.target.value)}>
                {AUDIENCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: '1rem' }}>
            <L>Subject</L>
            <input
              style={inp}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line…"
              maxLength={200}
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: '1.25rem' }}>
            <L>Message</L>
            <textarea
              style={{ ...inp, height: '220px', resize: 'vertical' }}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your message here…"
            />
          </div>

          {/* Preview toggle */}
          <div style={{ marginBottom: '1.5rem' }}>
            <GhostBtn small onClick={() => setShowPreview(p => !p)}>
              {showPreview ? 'Hide Preview' : 'Preview Email'}
            </GhostBtn>
          </div>

          {showPreview && body && (
            <div style={{ marginBottom: '1.5rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fafaf8' }}>
              <div style={{ padding: '0.6rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa' }}>
                Preview
              </div>
              <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', color: '#1a1a1a' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/canvas_routes_refined.png" width="160" style={{ marginBottom: '24px', display: 'block' }} alt="Canvas Routes" />
                <p style={{ fontSize: '15px', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>{body}</p>
                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '32px 0' }} />
                <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Canvas Routes · Montreal, QC</p>
              </div>
            </div>
          )}

          {showPreview && !body && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fafaf8', border: '0.5px solid rgba(0,0,0,0.08)', fontSize: '12px', color: '#bbb' }}>
              Enter a message to preview the email.
            </div>
          )}

          <Err msg={error} />

          {/* Confirm step */}
          {confirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1rem', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize: '12px', color: '#1a1a1a' }}>
                Send to <strong>{audienceLabel}</strong>? This cannot be undone.
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <PrimaryBtn onClick={confirmSend} disabled={sending}>
                  {sending ? 'Sending…' : 'Confirm Send'}
                </PrimaryBtn>
                <GhostBtn onClick={() => setConfirm(false)} disabled={sending}>
                  Cancel
                </GhostBtn>
              </div>
            </div>
          ) : (
            <PrimaryBtn onClick={handleSendClick} disabled={sending}>
              {sending ? 'Sending…' : 'Send Broadcast'}
            </PrimaryBtn>
          )}
        </div>
      )}
    </div>
  )
}
