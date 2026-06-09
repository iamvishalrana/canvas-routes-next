'use client'
import { useState, useEffect, useCallback } from 'react'
import { sel, L, PrimaryBtn, GhostBtn, Err } from '../_components/shared'

const AUDIENCE_LABELS = {
  all_members: 'All Members', active_members: 'Active Members Only',
  inner_circle: 'Inner Circle', all_contacts: 'All Contacts',
  everyone: 'Everyone', specific_emails: 'Specific Emails',
}

const AUDIENCE_OPTIONS = [
  { value: 'all_members',     label: 'All Members'         },
  { value: 'active_members',  label: 'Active Members Only' },
  { value: 'inner_circle',    label: 'Inner Circle'        },
  { value: 'all_contacts',    label: 'All Contacts'        },
  { value: 'everyone',        label: 'Everyone'            },
  { value: 'specific_emails', label: 'Specific Emails'     },
]

const SIG_HTML = `
<table cellpadding="0" cellspacing="0" style="margin-top:28px;">
  <tr>
    <td style="vertical-align:middle;padding-right:16px;">
      <img src="https://canvasroutes.com/canvas_routes_refined.png" width="70" style="display:block;" alt="Canvas Routes"/>
    </td>
    <td style="vertical-align:middle;padding-left:16px;border-left:1px solid #e8e8e8;">
      <div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:2px;">Jerry</div>
      <div style="font-size:11px;color:#888;margin-bottom:4px;">Founder, Canvas Routes</div>
      <div style="font-size:11px;color:#aaa;">
        <a href="https://canvasroutes.com" style="color:#8A6535;text-decoration:none;">canvasroutes.com</a>
        <span style="color:#ccc;margin:0 5px;">|</span>
        <a href="https://instagram.com/canvasroutes" style="color:#8A6535;text-decoration:none;">instagram.com/canvasroutes</a>
      </div>
    </td>
  </tr>
</table>`

function buildHtml(body) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;">
<p style="font-size:15px;line-height:1.75;white-space:pre-wrap;margin:0 0 24px;">${body.replace(/\n/g, '<br/>')}</p>
<hr style="border:none;border-top:1px solid #eeeeee;margin:28px 0;"/>
${SIG_HTML}
</body></html>`
}

function parseEmails(raw) {
  return [...new Set(
    raw.split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@') && e.includes('.'))
  )]
}

function Signature() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginTop: '24px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/canvas_routes_refined.png" width="70" style={{ display: 'block', marginRight: '16px' }} alt="Canvas Routes" />
      <div style={{ paddingLeft: '16px', borderLeft: '1px solid #e8e8e8' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '2px' }}>Jerry</div>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Founder, Canvas Routes</div>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          <a href="https://canvasroutes.com" style={{ color: '#8A6535', textDecoration: 'none' }}>canvasroutes.com</a>
          <span style={{ color: '#ccc', margin: '0 5px' }}>|</span>
          <a href="https://instagram.com/canvasroutes" style={{ color: '#8A6535', textDecoration: 'none' }}>instagram.com/canvasroutes</a>
        </div>
      </div>
    </div>
  )
}

const inp = {
  width: '100%', boxSizing: 'border-box',
  padding: '0.6rem 0.75rem',
  border: '0.5px solid rgba(0,0,0,0.15)',
  fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
  outline: 'none', background: '#fff', color: '#1a1a1a',
  borderRadius: 0,
}

export default function BroadcastsClient() {
  const [tab, setTab]                   = useState('compose')
  const [audience, setAudience]         = useState('all_members')
  const [specificEmails, setSpecificEmails] = useState('')
  const [subject, setSubject]           = useState('')
  const [body, setBody]                 = useState('')
  const [confirm, setConfirm]           = useState(false)
  const [sending, setSending]           = useState(false)
  const [error, setError]               = useState(null)
  const [result, setResult]             = useState(null)
  const [history, setHistory]           = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/admin/broadcasts')
      if (res.ok) setHistory(await res.json())
    } catch {}
    setHistoryLoading(false)
  }, [])

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab, loadHistory])

  const parsedEmails = audience === 'specific_emails' ? parseEmails(specificEmails) : []
  const audienceLabel = audience === 'specific_emails'
    ? `${parsedEmails.length} specific email${parsedEmails.length !== 1 ? 's' : ''}`
    : AUDIENCE_OPTIONS.find(o => o.value === audience)?.label || audience

  function handleSendClick() {
    setError(null)
    if (!subject.trim()) { setError('Subject is required.'); return }
    if (!body.trim()) { setError('Message body is required.'); return }
    if (audience === 'specific_emails' && parsedEmails.length === 0) {
      setError('Enter at least one valid email address.'); return
    }
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
        body: JSON.stringify({
          subject: subject.trim(),
          html: buildHtml(body),
          audience,
          ...(audience === 'specific_emails' ? { specificEmails: parsedEmails } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send broadcast.'); return }
      setResult(data)
      setSubject('')
      setBody('')
      setSpecificEmails('')
      loadHistory()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Broadcasts</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        {[{ id: 'compose', label: 'Compose' }, { id: 'history', label: 'History' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '0.6rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase',
            color: tab === t.id ? '#1a1a1a' : '#aaa',
            borderBottom: tab === t.id ? '1.5px solid #1a1a1a' : '1.5px solid transparent',
            marginBottom: '-0.5px', transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── History tab ── */}
      {tab === 'history' && (
        <div style={{ maxWidth: '720px' }}>
          {historyLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No broadcasts sent yet.</div>
          ) : (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
              {history.map((h, idx) => (
                <div key={h.id} style={{ padding: '1rem 1.5rem', borderBottom: idx < history.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem' }}>{h.subject}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        {h.audience === 'specific_emails'
                          ? `${h.specific_emails?.length ?? 0} specific emails`
                          : AUDIENCE_LABELS[h.audience] || h.audience}
                      </div>
                      {h.audience === 'specific_emails' && h.specific_emails?.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.specific_emails.slice(0, 3).join(', ')}{h.specific_emails.length > 3 ? ` +${h.specific_emails.length - 3} more` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '0.2rem' }}>
                        {new Date(h.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {new Date(h.sent_at).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                      <div style={{ fontSize: '11px' }}>
                        <span style={{ color: '#3B6B2F' }}>{h.sent_count} sent</span>
                        {h.failed_count > 0 && <span style={{ color: '#7B2032', marginLeft: '0.5rem' }}>{h.failed_count} failed</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Compose tab ── */}
      {tab === 'compose' && (
        <>
          {/* Warning */}
          <div style={{ maxWidth: '720px', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.35)', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A6535" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontSize: '12px', color: '#8A6535', lineHeight: '1.6' }}>Broadcast emails cannot be unsent. Review carefully before sending.</span>
          </div>

          {/* Success */}
          {result && (
            <div style={{ maxWidth: '720px', background: 'rgba(59,107,47,0.07)', border: '0.5px solid rgba(59,107,47,0.3)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '13px', color: '#3B6B2F', fontWeight: '500', marginBottom: result.failed > 0 ? '0.35rem' : 0 }}>
                Broadcast sent — {result.sent} email{result.sent !== 1 ? 's' : ''} delivered.
              </div>
              {result.failed > 0 && <div style={{ fontSize: '12px', color: '#7B2032' }}>{result.failed} failed to send.</div>}
              <button onClick={() => setResult(null)} style={{ marginTop: '0.65rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '11px', color: '#999', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Send another
              </button>
            </div>
          )}

          {!result && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', alignItems: 'start' }}>

              {/* Left — form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Audience */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '1rem' }}>Audience</div>
                  <div style={{ position: 'relative' }}>
                    <select style={{ ...sel, width: '100%' }} value={audience} onChange={e => { setAudience(e.target.value); setError(null) }}>
                      {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  {audience === 'specific_emails' && (
                    <div style={{ marginTop: '0.85rem' }}>
                      <textarea
                        style={{ ...inp, height: '90px', resize: 'vertical', marginTop: '0.35rem' }}
                        value={specificEmails}
                        onChange={e => setSpecificEmails(e.target.value)}
                        placeholder="Paste emails — one per line or comma-separated"
                      />
                      {parsedEmails.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#3B6B2F', marginTop: '0.3rem' }}>
                          {parsedEmails.length} valid email{parsedEmails.length !== 1 ? 's' : ''} detected
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subject + Body */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Message</div>
                  <div>
                    <L>Subject</L>
                    <input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line…" maxLength={200} />
                  </div>
                  <div>
                    <L>Body</L>
                    <textarea
                      style={{ ...inp, height: '260px', resize: 'vertical' }}
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      placeholder="Write your message here…"
                    />
                  </div>
                </div>

                <Err msg={error} />

                {/* Actions */}
                {confirm ? (
                  <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#1a1a1a' }}>Send to <strong>{audienceLabel}</strong>? This cannot be undone.</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <PrimaryBtn onClick={confirmSend} disabled={sending}>{sending ? 'Sending…' : 'Confirm Send'}</PrimaryBtn>
                      <GhostBtn onClick={() => setConfirm(false)} disabled={sending}>Cancel</GhostBtn>
                    </div>
                  </div>
                ) : (
                  <PrimaryBtn onClick={handleSendClick} disabled={sending}>{sending ? 'Sending…' : 'Send Broadcast'}</PrimaryBtn>
                )}
              </div>

              {/* Right — live preview */}
              <div style={{ position: 'sticky', top: '1.5rem' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.75rem' }}>
                  Live Preview
                  {subject && <span style={{ marginLeft: '0.75rem', color: '#bbb', textTransform: 'none', letterSpacing: 0, fontSize: '11px', fontWeight: '400' }}>· {subject}</span>}
                </div>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', maxHeight: 'calc(100vh - 14rem)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '0.5rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fafaf8', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eee' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eee' }} />
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eee' }} />
                  </div>
                  <div style={{ padding: '2rem 1.5rem', fontFamily: 'Arial, sans-serif', color: '#1a1a1a', minHeight: '320px', overflowY: 'auto', flex: 1 }}>
                    {body ? (
                      <p style={{ fontSize: '15px', lineHeight: '1.75', whiteSpace: 'pre-wrap', margin: '0 0 24px' }}>{body}</p>
                    ) : (
                      <p style={{ fontSize: '14px', color: '#ccc', fontStyle: 'italic', margin: '0 0 24px' }}>Your message will appear here…</p>
                    )}
                    <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '24px 0' }} />
                    <Signature />
                  </div>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
