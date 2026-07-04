'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, sel, L, PrimaryBtn, GhostBtn, DangerBtn, Err, ToggleSwitch, ConfirmDialog } from '../_components/shared'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

function buildAnnouncementEmail(title, content) {
  // Escape HTML entities to prevent injection
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
  const escapedTitle = esc(title)

  // Convert newlines to <br> tags — pre-wrap is ignored by Outlook
  const htmlContent = esc(content)
    .replace(/\n\n+/g, '</p><p style="margin:1em 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#444;line-height:1.85;">')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <title>${escapedTitle}</title>
</head>
<body style="margin:0;padding:0;background:#EDE8E1;">
  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#EDE8E1;"><tr><td align="center"><![endif]-->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EDE8E1;">
    <tr>
      <td align="center" style="padding:40px 16px;background:#EDE8E1;">

        <!-- Constrained inner table: width attr for Outlook, max-width for standards clients -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px;max-width:560px;">

          <!-- ── Header ── -->
          <tr>
            <td style="background:#0F1E14;padding:26px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;text-transform:uppercase;color:#c5a882;">Canvas Routes</p></td>
                  <td align="right"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;text-transform:uppercase;color:#8a7055;">Season 2026</p></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold accent line — background-color fallback for Outlook; gradient for modern clients -->
          <tr>
            <td height="2" style="height:2px;max-height:2px;font-size:0;line-height:2px;mso-line-height-rule:exactly;background-color:#c5a882;background:linear-gradient(90deg,#0F1E14 0%,#c5a882 50%,#0F1E14 100%);"> </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="background:#F5F1EC;padding:36px 36px 28px;">
              <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;text-transform:uppercase;color:#c5a882;">Member Update</p>
              <!-- Using <p> not <h1> — Outlook adds its own margins/weight to heading elements -->
              <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',Times,serif;font-size:26px;font-weight:400;color:#1a1a1a;line-height:1.25;mso-line-height-rule:exactly;">${escapedTitle}</p>
              <!-- Divider: hex color instead of rgba() for Outlook 2007-2016 compat -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
                <tr><td height="1" style="height:1px;max-height:1px;font-size:0;line-height:1px;mso-line-height-rule:exactly;background-color:#d4c4aa;"> </td></tr>
              </table>
              <!-- Content: \n converted to <br> above — pre-wrap is ignored in Outlook -->
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#444;line-height:1.85;mso-line-height-rule:exactly;">${htmlContent}</p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#F5F1EC;padding:0 36px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <!-- Divider: hex for Outlook compat -->
                <tr><td height="1" style="height:1px;max-height:1px;font-size:0;line-height:1px;mso-line-height-rule:exactly;background-color:#ebebeb;"> </td></tr>
                <tr>
                  <td style="padding-top:20px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#767676;line-height:1.6;">
                      You&rsquo;re receiving this as a Canvas Routes member.<br>
                      <a href="https://canvasroutes.com/members/dashboard" style="color:#c5a882;text-decoration:none;">Visit the members portal</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Unsubscribe injected here by server (inside </html>) -->
          <!-- UNSUBSCRIBE_FOOTER -->

        </table>
      </td>
    </tr>
  </table>
  <!--[if mso | IE]></td></tr></table><![endif]-->
</body>
</html>`
}

const AUDIENCE_OPTIONS = [
  { value: 'all_active_members', label: 'All active members' },
  { value: 'inner_circle',       label: 'Inner Circle only' },
  { value: 'canvas_routes_member', label: 'Routes Members only' },
]

export default function AnnouncementsClient() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', content: '', published: false, audience: 'all' })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [publishing, setPublishing] = useState(null)
  const [publishError, setPublishError] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [announcementSearch, setAnnouncementSearch] = useState('')
  const [announcementFilter, setAnnouncementFilter] = useState('all')

  // Email send state
  const [emailingId, setEmailingId] = useState(null)      // announcement being emailed
  const [emailAudience, setEmailAudience] = useState('all_active_members')
  const [emailConfirm, setEmailConfirm] = useState(null)  // announcement awaiting yes/no before mass send
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState({})      // { [id]: { sent, failed } | 'error' }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements')
      const data = await res.json().catch(() => [])
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useRealtimeSync('announcements', load)

  async function post(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { setPostError('Title and content required.'); return }
    setPosting(true); setPostError(null)
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPostError(data.error || 'Failed.'); return }
      setForm({ title: '', content: '', published: false, audience: 'all' })
      if (data.id) setItems(prev => [data, ...prev]); else load()
    } catch { setPostError('Network error.') }
    finally { setPosting(false) }
  }

  async function togglePublish(item) {
    if (publishing === item.id) return
    setPublishing(item.id)
    setPublishError(p => ({ ...p, [item.id]: null }))
    const newPublished = !item.published
    setItems(prev => prev.map(a => a.id === item.id ? { ...a, published: newPublished } : a))
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: newPublished }),
      })
      if (!res.ok) {
        setItems(prev => prev.map(a => a.id === item.id ? { ...a, published: item.published } : a))
        const d = await res.json().catch(() => ({}))
        setPublishError(p => ({ ...p, [item.id]: d.error || 'Could not update.' }))
      }
    } catch {
      setItems(prev => prev.map(a => a.id === item.id ? { ...a, published: item.published } : a))
      setPublishError(p => ({ ...p, [item.id]: 'Network error.' }))
    }
    finally { setPublishing(null) }
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    try {
      const res = await fetch(`/api/admin/announcements/${editing}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveError(d.error || 'Failed to save.'); return }
      setItems(prev => prev.map(a => a.id === editing ? { ...a, ...editForm } : a))
      setEditing(null)
    } catch { setSaveError('Network error.') }
    finally { setSaving(false) }
  }

  async function del(id) {
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) { setDeleteError('Failed to delete announcement.'); return }
      setDeleteConfirm(null)
      setItems(prev => prev.filter(a => a.id !== id))
    } catch { setDeleteError('Network error.') }
  }

  async function sendEmail(item) {
    setEmailSending(true)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: item.title,
          html: buildAnnouncementEmail(item.title, item.content),
          audience: emailAudience,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEmailResult(prev => ({ ...prev, [item.id]: { error: data.error || 'Failed to send.' } }))
      } else {
        setEmailResult(prev => ({ ...prev, [item.id]: { sent: data.sent, failed: data.failed } }))
      }
    } catch {
      setEmailResult(prev => ({ ...prev, [item.id]: { error: 'Network error.' } }))
    } finally {
      setEmailSending(false)
      setEmailingId(null)
    }
  }

  const filteredAnnouncements = items.filter(a => {
    const matchesSearch = !announcementSearch || (a.title || '').toLowerCase().includes(announcementSearch.toLowerCase()) || (a.content || '').toLowerCase().includes(announcementSearch.toLowerCase())
    const matchesFilter = announcementFilter === 'all' || (announcementFilter === 'published' ? a.published : !a.published)
    return matchesSearch && matchesFilter
  })

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Announcements</h1>
      </div>
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>New Announcement</div>
        <form onSubmit={post}>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Title</L>
            <input style={inp} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title" maxLength={200} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Content</L>
            <textarea style={{ ...inp, height: '100px', resize: 'vertical' }} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your announcement here…" />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Audience</L>
            <div style={{ position: 'relative', width: '200px' }}>
              <select style={sel} value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}>
                <option value="all">Everyone</option>
                <option value="members">Members only</option>
                <option value="contacts">Contacts only</option>
              </select>
              <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '12px', color: '#555' }}>
              <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} />
              Publish immediately
            </label>
            <PrimaryBtn type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post'}</PrimaryBtn>
          </div>
          <Err msg={postError} />
        </form>
      </div>

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input style={{ ...inp, maxWidth: '260px' }} placeholder="Search announcements…" value={announcementSearch} onChange={e => setAnnouncementSearch(e.target.value)} />
          <div style={{ position: 'relative' }}>
            <select style={{ ...sel, width: 'auto', paddingRight: '2rem' }} value={announcementFilter} onChange={e => setAnnouncementFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No announcements yet.</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No announcements match your search.</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          {filteredAnnouncements.map((item, idx) => (
            <div key={item.id} style={{ padding: '1.5rem', borderBottom: idx < filteredAnnouncements.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
              {editing === item.id ? (
                <div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <L>Title</L>
                    <input style={inp} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <L>Content</L>
                    <textarea style={{ ...inp, height: '90px', resize: 'vertical' }} value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <L>Audience</L>
                    <div style={{ position: 'relative', width: '200px' }}>
                      <select style={sel} value={editForm.audience || 'all'} onChange={e => setEditForm(p => ({ ...p, audience: e.target.value }))}>
                        <option value="all">Everyone</option>
                        <option value="members">Members only</option>
                        <option value="contacts">Contacts only</option>
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
                    <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                  </div>
                  <Err msg={saveError} />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1a1a1a' }}>{item.title}</div>
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: item.published ? '0.5px solid rgba(59,107,47,0.3)' : '0.5px solid rgba(0,0,0,0.12)', background: item.published ? 'rgba(59,107,47,0.08)' : 'transparent', color: item.published ? '#3B6B2F' : '#bbb' }}>
                          {item.published ? 'Published' : 'Draft'}
                        </span>
                        {item.audience && item.audience !== 'all' && (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(197,168,130,0.45)', background: 'rgba(197,168,130,0.1)', color: '#8A6535' }}>
                            {item.audience === 'members' ? 'Members only' : 'Contacts only'}
                          </span>
                        )}
                        {/* Show prior send result */}
                        {emailResult[item.id] && !emailResult[item.id].error && (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(59,107,47,0.35)', background: 'rgba(59,107,47,0.07)', color: '#3B6B2F' }}>
                            ✓ Sent to {emailResult[item.id].sent}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{item.content}</div>
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '0.5rem' }}>
                        {new Date(item.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {/* Email button */}
                      <button
                        onClick={() => { setEmailingId(emailingId === item.id ? null : item.id); setEmailResult(p => ({ ...p, [item.id]: undefined })) }}
                        style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: '0.5px solid rgba(197,168,130,0.5)', background: emailingId === item.id ? 'rgba(197,168,130,0.1)' : 'transparent', color: '#8A6535', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
                      >
                        Email
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ToggleSwitch checked={!!item.published} onChange={() => togglePublish(item)} disabled={publishing === item.id} label="Published" />
                        <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: item.published ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter)' }}>
                          {publishing === item.id ? '…' : item.published ? 'Live' : 'Draft'}
                        </span>
                        {publishError[item.id] && <Err msg={publishError[item.id]} />}
                      </div>
                      <GhostBtn onClick={() => { setEditing(item.id); setEditForm({ title: item.title, content: item.content, audience: item.audience || 'all' }); setSaveError(null) }} small>Edit</GhostBtn>
                      <DangerBtn small onClick={() => setDeleteConfirm(item.id)}>Delete</DangerBtn>
                    </div>
                  </div>

                  {/* Email send panel */}
                  {emailingId === item.id && (
                    <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(197,168,130,0.05)', border: '0.5px solid rgba(197,168,130,0.2)', borderLeft: '2px solid #c5a882' }}>
                      <div style={{ fontSize: '11px', fontWeight: '500', color: '#555', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                        Send <strong>"{item.title}"</strong> as email
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                          <select
                            style={{ ...sel, width: 'auto', paddingRight: '2rem', fontSize: '12px' }}
                            value={emailAudience}
                            onChange={e => setEmailAudience(e.target.value)}
                          >
                            {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        <PrimaryBtn onClick={() => setEmailConfirm(item)} disabled={emailSending}>
                          {emailSending ? 'Sending…' : 'Send'}
                        </PrimaryBtn>
                        <GhostBtn small onClick={() => setEmailingId(null)}>Cancel</GhostBtn>
                      </div>
                      {emailResult[item.id]?.error && (
                        <div style={{ fontSize: '11px', color: '#7B2032', marginTop: '0.5rem' }}>{emailResult[item.id].error}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {deleteConfirm === item.id && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete this announcement?</span>
                  <DangerBtn small onClick={() => del(item.id)}>Confirm Delete</DangerBtn>
                  <GhostBtn small onClick={() => setDeleteConfirm(null)}>Cancel</GhostBtn>
                </div>
              )}
              {deleteConfirm === item.id && deleteError && <Err msg={deleteError} />}
            </div>
          ))}
        </div>
      )}

      {emailConfirm && (
        <ConfirmDialog
          title="Send this announcement as email?"
          message="Everyone in the selected audience receives it immediately. It cannot be unsent."
          details={<>Subject: <strong>{emailConfirm.title}</strong><br />Audience: <strong>{AUDIENCE_OPTIONS.find(o => o.value === emailAudience)?.label || emailAudience}</strong></>}
          confirmLabel="Yes, send email"
          busy={emailSending}
          onConfirm={async () => { const item = emailConfirm; await sendEmail(item); setEmailConfirm(null) }}
          onCancel={() => setEmailConfirm(null)}
        />
      )}
    </div>
  )
}
