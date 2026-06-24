'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { sel, L, PrimaryBtn, GhostBtn, Err } from '../_components/shared'

const MAX_RECIPIENTS = 2000
const DRAFT_KEY = 'bc_draft'

const AUDIENCE_LABELS = {
  canvas_routes_member: 'Canvas Routes Member',
  inner_circle:         'Inner Circle',
  all_active_members:   'All Active Members',
  pending_members:      'Pending Applications',
  all_contacts:         'All Contacts',
  contacts_non_members: 'Contacts (Non-Members)',
  everyone:             'Everyone',
  specific_emails:      'Specific Emails',
}

const AUDIENCE_OPTIONS = [
  { value: 'canvas_routes_member', label: 'Canvas Routes Member'   },
  { value: 'inner_circle',         label: 'Inner Circle'           },
  { value: 'all_active_members',   label: 'All Active Members'     },
  { value: 'pending_members',      label: 'Pending Applications'   },
  { value: 'all_contacts',         label: 'All Contacts'           },
  { value: 'contacts_non_members', label: 'Contacts (Non-Members)' },
  { value: 'everyone',             label: 'Everyone'               },
  { value: 'specific_emails',      label: 'Specific Emails'        },
]

const FONTS = [
  { label: 'Arial',           value: 'Arial, sans-serif'          },
  { label: 'Georgia',         value: 'Georgia, serif'             },
  { label: 'Helvetica',       value: 'Helvetica Neue, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif'     },
  { label: 'Courier',         value: 'Courier New, monospace'     },
]

const SIZES = ['12px','13px','14px','15px','16px','18px','20px','24px','28px']

// ── Signature HTML (inside actual emails) ───────────────────────────────────
const SIG_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
  <tr>
    <td style="vertical-align:middle;padding-right:14px;">
      <img src="https://canvasroutes.com/canvas_routes_refined.png" width="60" height="40" border="0" style="display:block;" alt="Canvas Routes"/>
    </td>
    <td style="vertical-align:middle;padding-left:14px;border-left:1px solid #e8e8e8;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:2px;">Jerry</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888;margin-bottom:4px;">Founder, Canvas Routes</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaa;">
        <a href="https://canvasroutes.com" style="color:#8A6535;text-decoration:none;">canvasroutes.com</a>
        <span style="color:#ddd;margin:0 5px;">|</span>
        <a href="https://instagram.com/canvasroutes" style="color:#8A6535;text-decoration:none;">@canvasroutes</a>
      </div>
    </td>
  </tr>
</table>`

function processBodyHtml(html) {
  return html
    .replace(/<ul(\s[^>]*)?>/gi, (_, a = '') => `<ul${a} style="margin:0 0 1em;padding-left:1.5em;list-style-type:disc;">`)
    .replace(/<ol(\s[^>]*)?>/gi, (_, a = '') => `<ol${a} style="margin:0 0 1em;padding-left:1.5em;list-style-type:decimal;">`)
    .replace(/<li(\s[^>]*)?>/gi, (_, a = '') => `<li${a} style="margin:0 0 0.35em;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#444;">`)
    .replace(/<blockquote(\s[^>]*)?>/gi, (_, a = '') => `<blockquote${a} style="margin:0 0 1em;padding:0.5em 1em;border-left:3px solid #c5a882;color:#666;">`)
    .replace(/<h1(\s[^>]*)?>/gi, (_, a = '') => `<p${a} style="margin:0 0 0.75em;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:400;color:#1a1a1a;line-height:1.3;">`)
    .replace(/<\/h1>/gi, '</p>')
    .replace(/<h2(\s[^>]*)?>/gi, (_, a = '') => `<p${a} style="margin:0 0 0.65em;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:400;color:#1a1a1a;line-height:1.3;">`)
    .replace(/<\/h2>/gi, '</p>')
    .replace(/<h3(\s[^>]*)?>/gi, (_, a = '') => `<p${a} style="margin:0 0 0.5em;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#1a1a1a;">`)
    .replace(/<\/h3>/gi, '</p>')
}

function buildHtml(bodyHtml) {
  const processed = processBodyHtml(bodyHtml)
  return `<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

    <!-- Body -->
    <tr>
      <td style="padding:40px 40px 24px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#444;">${processed}</div>
      </td>
    </tr>

    <!-- Signature -->
    <tr>
      <td style="padding:0 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td height="1" style="height:1px;max-height:1px;font-size:0;line-height:1px;mso-line-height-rule:exactly;background-color:#ebebeb;"> </td></tr>
        </table>
        ${SIG_HTML}
      </td>
    </tr>

    <!-- Unsubscribe — replaced per-recipient by broadcasts route.js -->
    <tr>
      <td style="padding:0 40px 28px;">
        <!-- UNSUBSCRIBE_FOOTER -->
      </td>
    </tr>

  </table>
</body>
</html>`
}

function getWordCount(html) {
  if (!html || html === '<p></p>') return 0
  const text = html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').length : 0
}

// ── 1. Email chip input ──────────────────────────────────────────────────────
function ChipInput({ chips, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  function flush(raw) {
    const emails = raw.split(/[\n,;\s]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@') && e.includes('.'))
    emails.forEach(onAdd)
    setInput('')
  }

  function handleKeyDown(e) {
    if (['Enter', ',', ';', 'Tab'].includes(e.key)) {
      e.preventDefault()
      if (input.trim()) flush(input)
    } else if (e.key === 'Backspace' && !input && chips.length > 0) {
      onRemove(chips[chips.length - 1])
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    flush(e.clipboardData.getData('text'))
  }

  return (
    <div
      style={{ border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', padding: '0.4rem 0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', cursor: 'text', minHeight: '72px', alignContent: 'flex-start' }}
      onClick={() => inputRef.current?.focus()}
    >
      {chips.map(email => (
        <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.1)', padding: '2px 4px 2px 8px', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', color: '#444' }}>
          {email}
          <button
            onClick={e => { e.stopPropagation(); onRemove(email) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#aaa', fontSize: '15px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => { if (input.trim()) flush(input) }}
        placeholder={chips.length === 0 ? 'Paste or type emails — press Enter or comma to add' : ''}
        style={{ border: 'none', outline: 'none', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', background: 'transparent', flex: 1, minWidth: '200px', padding: '2px 4px' }}
      />
    </div>
  )
}

// ── React preview signature ──────────────────────────────────────────────────
function Signature() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/canvas_routes_refined.png" width="60" style={{ display: 'block', marginRight: '14px', flexShrink: 0 }} alt="Canvas Routes" />
      <div style={{ paddingLeft: '14px', borderLeft: '1px solid #e8e8e8' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '2px' }}>Jerry</div>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Founder, Canvas Routes</div>
        <div style={{ fontSize: '11px', color: '#aaa' }}>
          <a href="https://canvasroutes.com" style={{ color: '#8A6535', textDecoration: 'none' }}>canvasroutes.com</a>
          <span style={{ color: '#ddd', margin: '0 5px' }}>|</span>
          <a href="https://instagram.com/canvasroutes" style={{ color: '#8A6535', textDecoration: 'none' }}>@canvasroutes</a>
        </div>
      </div>
    </div>
  )
}

// ── 5. Preview panel with from/subject header ────────────────────────────────
function PreviewPanel({ bodyHtml, bodyEmpty, maxHeight, subject, fromEmail }) {
  return (
    <div style={{ border: '0.5px solid rgba(0,0,0,0.12)', background: '#fff', overflow: 'hidden' }}>
      {/* Browser chrome */}
      <div style={{ padding: '0.55rem 0.85rem', background: '#f5f5f5', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {['#ee6b5f','#f5bf4f','#61c554'].map(c => <div key={c} style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />)}
      </div>
      {/* From / Subject header */}
      <div style={{ padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fafaf9' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '10px', color: '#ccc', fontFamily: 'Arial,sans-serif', width: '44px', flexShrink: 0 }}>From</span>
          <span style={{ fontSize: '12px', color: '#555', fontFamily: 'Arial,sans-serif' }}>Canvas Routes &lt;{fromEmail || 'info@canvasroutes.com'}&gt;</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
          <span style={{ fontSize: '10px', color: '#ccc', fontFamily: 'Arial,sans-serif', width: '44px', flexShrink: 0 }}>Subject</span>
          <span style={{ fontSize: '12px', fontFamily: 'Arial,sans-serif', color: subject ? '#1a1a1a' : '#ccc', fontStyle: subject ? 'normal' : 'italic', fontWeight: subject ? '500' : '400' }}>
            {subject || 'No subject yet'}
          </span>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '2rem 2.5rem 1.5rem', maxHeight, overflowY: maxHeight === 'none' ? 'visible' : 'auto' }}>
        {bodyEmpty ? (
          <p style={{ fontSize: '14px', color: '#ccc', fontStyle: 'italic', margin: '0 0 20px', fontFamily: 'Arial,sans-serif' }}>
            Your message will appear here…
          </p>
        ) : (
          <div
            style={{ fontSize: '15px', lineHeight: '1.75', color: '#444', fontFamily: 'Arial,sans-serif', marginBottom: '20px' }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
        <Signature />
        <div style={{ marginTop: '16px', fontSize: '11px', color: '#bbb', fontFamily: 'Arial,sans-serif' }}>
          <a href="#" onClick={e => e.preventDefault()} style={{ color: '#bbb', textDecoration: 'underline' }}>Unsubscribe</a>
        </div>
      </div>
    </div>
  )
}

const TBTN = (active) => ({
  background: active ? 'rgba(0,0,0,0.08)' : 'none',
  border: '0.5px solid ' + (active ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'),
  cursor: 'pointer', padding: '3px 7px', fontSize: '12px',
  fontFamily: 'var(--font-inter),sans-serif', color: active ? '#1a1a1a' : '#555',
  lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '26px', height: '24px',
})

const TSEL = {
  background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)',
  fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif',
  padding: '2px 4px', cursor: 'pointer', color: '#555',
  outline: 'none', height: '24px', appearance: 'none', WebkitAppearance: 'none',
}

const INP = {
  width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem',
  border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '13px',
  fontFamily: 'var(--font-inter),sans-serif', outline: 'none',
  background: '#fff', color: '#1a1a1a', borderRadius: 0,
}

// ── 7. Toolbar with {{name}} insert button ───────────────────────────────────
function Toolbar({ editor }) {
  if (!editor) return null
  const currentFont = editor.getAttributes('textStyle').fontFamily || FONTS[0].value
  const currentSize = editor.getAttributes('textStyle').fontSize || '15px'

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', padding: '0.5rem 0.75rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', alignItems: 'center' }}>
      <select style={{ ...TSEL, width: '100px' }} value={currentFont}
        onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}>
        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <select style={{ ...TSEL, width: '54px' }} value={currentSize}
        onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}>
        {SIZES.map(s => <option key={s} value={s}>{s.replace('px', '')}</option>)}
      </select>
      <div style={{ width: '0.5px', height: '18px', background: 'rgba(0,0,0,0.1)', margin: '0 2px' }} />
      <button style={TBTN(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><strong>B</strong></button>
      <button style={TBTN(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><em>I</em></button>
      <button style={{ ...TBTN(editor.isActive('underline')), textDecoration: 'underline' }} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">U</button>
      <div style={{ width: '0.5px', height: '18px', background: 'rgba(0,0,0,0.1)', margin: '0 2px' }} />
      <button style={TBTN(editor.isActive({ textAlign: 'left' }))} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </button>
      <button style={TBTN(editor.isActive({ textAlign: 'center' }))} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align center">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </button>
      <button style={TBTN(editor.isActive({ textAlign: 'right' }))} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div style={{ width: '0.5px', height: '18px', background: 'rgba(0,0,0,0.1)', margin: '0 2px' }} />
      <button style={TBTN(editor.isActive('link'))} title="Insert link"
        onClick={() => {
          if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return }
          const url = window.prompt('URL')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <div style={{ width: '0.5px', height: '18px', background: 'rgba(0,0,0,0.1)', margin: '0 2px' }} />
      <button style={TBTN(false)} title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
      </button>
      <button style={TBTN(false)} title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>
      </button>
      <div style={{ width: '0.5px', height: '18px', background: 'rgba(0,0,0,0.1)', margin: '0 2px' }} />
      {/* 7. Insert {{name}} at cursor */}
      <button
        style={{ ...TBTN(false), fontSize: '10px', minWidth: 'auto', padding: '3px 7px', letterSpacing: '0.03em', fontFamily: 'var(--font-inter),sans-serif' }}
        title="Insert personalisation variable"
        onClick={() => editor.chain().focus().insertContent('{{name}}').run()}
      >
        {'{{name}}'}
      </button>
    </div>
  )
}

export default function BroadcastsClient() {
  const [tab, setTab]                           = useState('compose')
  const [audience, setAudience]                 = useState('specific_emails')
  const [fromEmail, setFromEmail]               = useState('info@canvasroutes.com')
  const [chipEmails, setChipEmails]             = useState([])          // 1. chip emails
  const [excludeChipEmails, setExcludeChipEmails] = useState([])        // exclude list
  const [subject, setSubject]                   = useState('')
  const [bodyHtml, setBodyHtml]                 = useState('')          // explicit state for draft save
  const [showConfirm, setShowConfirm]           = useState(false)
  const [sending, setSending]                   = useState(false)
  const [error, setError]                       = useState(null)
  const [result, setResult]                     = useState(null)
  const [history, setHistory]                   = useState([])
  const [historyLoading, setHistoryLoading]     = useState(false)
  const [historyError, setHistoryError]         = useState(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState(null)     // 3. history expand
  const [recipientCount, setRecipientCount]     = useState(null)
  const [countLoading, setCountLoading]         = useState(false)
  const [testEmail, setTestEmail]               = useState('')
  const [testSending, setTestSending]           = useState(false)
  const [testResult, setTestResult]             = useState(null)
  const [previewExpanded, setPreviewExpanded]   = useState(false)
  const sendingRef      = useRef(false)
  const tabRef          = useRef(tab)
  const draftRestoredRef = useRef(false)
  useEffect(() => { tabRef.current = tab }, [tab])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { style: 'color:#8A6535;text-decoration:underline;' } }),
    ],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height:200px;padding:0.75rem;outline:none;font-family:Arial,sans-serif;font-size:15px;line-height:1.75;color:#1a1a1a;',
      },
    },
    onUpdate: ({ editor }) => setBodyHtml(editor.getHTML()),
  })

  const bodyEmpty = !bodyHtml || bodyHtml === '<p></p>'

  // 4. Restore draft from localStorage once editor is ready
  useEffect(() => {
    if (!editor || draftRestoredRef.current) return
    draftRestoredRef.current = true
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (!saved) return
      if (saved.subject) setSubject(saved.subject)
      if (saved.audience) setAudience(saved.audience)
      if (saved.fromEmail) setFromEmail(saved.fromEmail)
      if (Array.isArray(saved.chipEmails) && saved.chipEmails.length) setChipEmails(saved.chipEmails)
      if (Array.isArray(saved.excludeChipEmails) && saved.excludeChipEmails.length) setExcludeChipEmails(saved.excludeChipEmails)
      if (saved.bodyHtml && saved.bodyHtml !== '<p></p>') {
        editor.commands.setContent(saved.bodyHtml)
        setBodyHtml(saved.bodyHtml)
      }
    } catch {}
  }, [editor])

  // 4. Auto-save draft to localStorage on any change
  useEffect(() => {
    if (!draftRestoredRef.current) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, bodyHtml, audience, chipEmails, excludeChipEmails, fromEmail })) } catch {}
  }, [subject, bodyHtml, audience, chipEmails, excludeChipEmails, fromEmail])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch('/api/admin/broadcasts')
      if (res.ok) setHistory(await res.json())
      else setHistoryError('Failed to load broadcast history.')
    } catch {
      setHistoryError('Network error.')
    }
    setHistoryLoading(false)
  }, [])

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab, loadHistory])

  const onBroadcastChange = useCallback(() => {
    if (tabRef.current === 'history') loadHistory()
  }, [loadHistory])
  useRealtimeSync('broadcasts', onBroadcastChange)

  useEffect(() => {
    if (audience === 'specific_emails') { setRecipientCount(null); return }
    setCountLoading(true)
    setRecipientCount(null)
    const ctrl = new AbortController()
    fetch(`/api/admin/broadcasts/count?audience=${audience}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRecipientCount(d.count) })
      .catch(e => { if (e.name !== 'AbortError') console.error(e) })
      .finally(() => { if (!ctrl.signal.aborted) setCountLoading(false) })
    return () => ctrl.abort()
  }, [audience])

  async function sendTest() {
    const email = testEmail.trim()
    if (!email.includes('@') || !email.includes('.')) return
    if (!subject.trim() && bodyEmpty) return
    setTestSending(true); setTestResult(null)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim() || '(Test)', html: buildHtml(bodyHtml), body_html: bodyHtml, audience: 'specific_emails', specificEmails: [email], fromEmail }),
      })
      const data = await res.json().catch(() => ({}))
      setTestResult(res.ok ? 'sent' : (data.error || 'Failed.'))
    } catch { setTestResult('Network error.') }
    finally { setTestSending(false) }
  }

  // 1. chip emails are already parsed — no textarea to parse
  const parsedEmails = chipEmails
  const audienceLabel = audience === 'specific_emails'
    ? `${parsedEmails.length} specific email${parsedEmails.length !== 1 ? 's' : ''}`
    : AUDIENCE_OPTIONS.find(o => o.value === audience)?.label || audience

  function handleSendClick() {
    setError(null)
    if (!subject.trim()) { setError('Subject is required.'); return }
    if (bodyEmpty) { setError('Message body is required.'); return }
    if (audience === 'specific_emails' && parsedEmails.length === 0) { setError('Enter at least one valid email.'); return }
    setShowConfirm(true)
  }

  async function confirmSend() {
    if (sendingRef.current) return
    sendingRef.current = true
    setShowConfirm(false); setSending(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          html: buildHtml(bodyHtml),
          body_html: bodyHtml,
          audience,
          fromEmail,
          ...(audience === 'specific_emails' ? { specificEmails: parsedEmails } : {}),
          ...(excludeChipEmails.length > 0 ? { excludeEmails: excludeChipEmails } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send.'); return }
      setResult(data)
      setSubject('')
      editor?.chain().clearContent().unsetAllMarks().run()
      setBodyHtml('')
      setChipEmails([])
      setExcludeChipEmails([])
      setFromEmail('info@canvasroutes.com')
      setAudience('specific_emails')
      try { localStorage.removeItem(DRAFT_KEY) } catch {}  // 4. clear draft on send
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  // 2. Re-use a past broadcast in the compose form
  function reuseHistory(h) {
    setSubject(h.subject || '')
    if (h.body_html && editor) {
      editor.commands.setContent(h.body_html)
      setBodyHtml(h.body_html)
    } else if (editor) {
      editor.commands.clearContent()
      setBodyHtml('')
    }
    if (h.audience) setAudience(h.audience)
    if (h.audience === 'specific_emails' && Array.isArray(h.specific_emails)) {
      setChipEmails(h.specific_emails)
    } else {
      setChipEmails([])
    }
    setResult(null)
    setError(null)
    setTab('compose')
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <style>{`
        .tiptap-editor { border: 0.5px solid rgba(0,0,0,0.15); background: #fff; }
        .tiptap-editor p { margin: 0 0 0.5em; }
        .tiptap-editor:focus-within { border-color: rgba(0,0,0,0.3); }
        .bc-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) minmax(0,1fr);
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .bc-grid { grid-template-columns: 1fr; }
          .bc-preview-sticky { position: static !important; }
        }
        .bc-preview-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
        }
        .bc-preview-modal {
          background: #fff; width: 100%; max-width: 760px;
          max-height: 90vh; display: flex; flex-direction: column;
          border: 0.5px solid rgba(0,0,0,0.15);
        }
        .bc-history-row:hover { background: rgba(0,0,0,0.018) !important; }
        .bc-reuse-btn { opacity: 0; transition: opacity 0.1s; }
        .bc-history-row:hover .bc-reuse-btn { opacity: 1; }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
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
            marginBottom: '-0.5px', transition: 'color 0.15s',
            fontFamily: 'var(--font-inter),sans-serif',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── History ── */}
      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
          ) : historyError ? (
            <div style={{ padding: '1rem', fontSize: '13px', color: '#7B2032', background: 'rgba(123,32,50,0.06)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{historyError}</div>
          ) : history.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No broadcasts sent yet.</div>
          ) : (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
              {history.map((h, idx) => (
                <div key={h.id}>
                  {/* 2 & 3: history row with re-use + expand */}
                  <div
                    className="bc-history-row"
                    style={{ padding: '1.1rem 1.5rem', borderBottom: (expandedHistoryId === h.id || idx < history.length - 1) ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', cursor: 'default' }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem' }}>{h.subject}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1px 7px', border: '0.5px solid rgba(197,168,130,0.4)', background: 'rgba(197,168,130,0.07)', color: '#8A6535' }}>
                          {h.audience === 'specific_emails'
                            ? `${h.specific_emails?.length ?? 0} emails`
                            : AUDIENCE_LABELS[h.audience] || h.audience}
                        </span>
                        {h.audience === 'specific_emails' && h.specific_emails?.length > 0 && (
                          <span style={{ fontSize: '11px', color: '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
                            {h.specific_emails.slice(0, 2).join(', ')}{h.specific_emails.length > 2 ? ` +${h.specific_emails.length - 2} more` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '0.2rem' }}>
                          {new Date(h.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>
                          <span style={{ color: '#3B6B2F' }}>{h.sent_count} sent</span>
                          {h.failed_count > 0 && <span style={{ color: '#7B2032', marginLeft: '0.5rem' }}>{h.failed_count} failed</span>}
                        </div>
                      </div>
                      {/* 3. expand body toggle */}
                      {(h.body_html || h.failed_recipients?.length > 0) && (
                        <button
                          onClick={() => setExpandedHistoryId(expandedHistoryId === h.id ? null : h.id)}
                          style={{ background: h.failed_count > 0 ? 'rgba(123,32,50,0.05)' : 'none', border: h.failed_count > 0 ? '0.5px solid rgba(123,32,50,0.25)' : '0.5px solid rgba(0,0,0,0.12)', padding: '3px 8px', cursor: 'pointer', color: h.failed_count > 0 ? '#7B2032' : '#888', fontSize: '10px', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                        >
                          {expandedHistoryId === h.id ? 'Hide' : h.failed_count > 0 ? 'Details' : 'Preview'}
                        </button>
                      )}
                      {/* 2. re-use button */}
                      <button
                        className="bc-reuse-btn"
                        onClick={() => reuseHistory(h)}
                        style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.12)', padding: '3px 8px', cursor: 'pointer', color: '#555', fontSize: '10px', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                      >
                        Re-use
                      </button>
                    </div>
                  </div>
                  {/* 3. expanded details: failed recipients + body preview */}
                  {expandedHistoryId === h.id && (
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: idx < history.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', background: '#fafaf9' }}>
                      {h.failed_recipients?.length > 0 && (
                        <div style={{ marginBottom: h.body_html ? '1rem' : 0, padding: '0.85rem 1rem', background: 'rgba(123,32,50,0.04)', border: '0.5px solid rgba(123,32,50,0.18)' }}>
                          <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7B2032', marginBottom: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                            {h.failed_recipients.length} failed recipient{h.failed_recipients.length !== 1 ? 's' : ''}
                          </div>
                          {h.failed_recipients.map((f, fi) => (
                            <div key={fi} style={{ fontSize: '12px', color: '#444', marginBottom: fi < h.failed_recipients.length - 1 ? '0.4rem' : 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                              <span style={{ fontWeight: '500', color: '#1a1a1a' }}>{f.name || f.email}</span>
                              {f.name && <span style={{ color: '#999' }}> · {f.email}</span>}
                              {f.reason && <span style={{ color: '#7B2032' }}> — {f.reason}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {h.body_html && (
                        <div
                          style={{ fontSize: '14px', lineHeight: '1.75', color: '#444', fontFamily: 'Arial,sans-serif' }}
                          dangerouslySetInnerHTML={{ __html: h.body_html }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Compose ── */}
      {tab === 'compose' && (
        <>
          {/* Warning */}
          <div style={{ background: 'rgba(197,168,130,0.07)', border: '0.5px solid rgba(197,168,130,0.3)', borderLeft: '2px solid #c5a882', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A6535" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontSize: '12px', color: '#8A6535', lineHeight: '1.6' }}>Broadcast emails cannot be unsent. Send a test first and review carefully.</span>
          </div>

          {/* Success banner */}
          {result && (
            <div style={{ background: 'rgba(59,107,47,0.07)', border: '0.5px solid rgba(59,107,47,0.3)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#3B6B2F', marginBottom: (result.failed > 0 || result.truncated) ? '0.35rem' : 0 }}>
                ✓ Broadcast sent — {result.sent} email{result.sent !== 1 ? 's' : ''} delivered.
              </div>
              {result.failed > 0 && <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.25rem' }}>{result.failed} failed to deliver.</div>}
              {result.truncated && <div style={{ fontSize: '12px', color: '#8A6535', marginTop: '0.25rem' }}>⚠ List capped at {MAX_RECIPIENTS} — {result.totalRecipients - MAX_RECIPIENTS} recipients not reached.</div>}
              <button onClick={() => setResult(null)} style={{ marginTop: '0.75rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '10px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Compose another
              </button>
            </div>
          )}

          {!result && (
            <div className="bc-grid">

              {/* ── Left column ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* From */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>From</div>
                  </div>
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ position: 'relative' }}>
                      <select style={{ ...sel, width: '100%' }} value={fromEmail} onChange={e => setFromEmail(e.target.value)}>
                        <option value="info@canvasroutes.com">Canvas Routes — info@canvasroutes.com</option>
                        <option value="jerry@canvasroutes.com">Jerry — jerry@canvasroutes.com</option>
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>

                {/* Audience */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Audience</div>
                  </div>
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <select style={{ ...sel, width: '100%' }} value={audience} onChange={e => { setAudience(e.target.value); setError(null) }}>
                        {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    {audience !== 'specific_emails' && (
                      <div style={{ fontSize: '11px', color: countLoading ? '#ccc' : '#3B6B2F', minHeight: '16px' }}>
                        {countLoading ? 'Counting…' : recipientCount !== null ? `${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}${recipientCount > MAX_RECIPIENTS ? ` (capped at ${MAX_RECIPIENTS})` : ''}` : ''}
                      </div>
                    )}
                    {/* Exclude emails — visible for all non-specific audiences */}
                    {audience !== 'specific_emails' && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.4rem' }}>Exclude emails</div>
                        <ChipInput
                          chips={excludeChipEmails}
                          onAdd={email => setExcludeChipEmails(prev => prev.includes(email) ? prev : [...prev, email])}
                          onRemove={email => setExcludeChipEmails(prev => prev.filter(e => e !== email))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                          <span style={{ fontSize: '11px', color: excludeChipEmails.length > 0 ? '#8A6535' : '#ccc' }}>
                            {excludeChipEmails.length > 0 ? `${excludeChipEmails.length} excluded` : 'None'}
                          </span>
                          {excludeChipEmails.length > 0 && (
                            <button onClick={() => setExcludeChipEmails([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {/* 1. Chip email input */}
                    {audience === 'specific_emails' && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <ChipInput
                          chips={chipEmails}
                          onAdd={email => setChipEmails(prev => prev.includes(email) ? prev : [...prev, email])}
                          onRemove={email => setChipEmails(prev => prev.filter(e => e !== email))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                          <span style={{ fontSize: '11px', color: chipEmails.length > 0 ? '#3B6B2F' : '#ccc' }}>
                            {chipEmails.length > 0 ? `${chipEmails.length} recipient${chipEmails.length !== 1 ? 's' : ''}` : 'No emails added yet'}
                          </span>
                          {chipEmails.length > 0 && (
                            <button onClick={() => setChipEmails([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject + Body */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Message</div>
                  </div>
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                        <L style={{ margin: 0 }}>Subject</L>
                        <span style={{ fontSize: '10px', color: subject.length > 60 ? '#8A6535' : '#ccc' }}>
                          {subject.length}/200{subject.length > 60 && subject.length <= 200 ? ' · may truncate' : ''}
                        </span>
                      </div>
                      <input style={INP} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line…" maxLength={200} />
                    </div>
                    <div>
                      <L>Body</L>
                      <div className="tiptap-editor">
                        <Toolbar editor={editor} />
                        <EditorContent editor={editor} />
                      </div>
                      {/* 6. Word count + personalisation hint */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '10px', color: '#bbb' }}>
                        <span>
                          Use <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 4px' }}>{'{{name}}'}</code> to personalise — or click the button in the toolbar
                        </span>
                        {!bodyEmpty && (
                          <span style={{ flexShrink: 0, marginLeft: '0.75rem' }}>{getWordCount(bodyHtml)} words</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test send */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Send a test</div>
                  </div>
                  <div style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input style={{ ...INP, flex: 1 }} value={testEmail} onChange={e => { setTestEmail(e.target.value); setTestResult(null) }}
                        placeholder="your@email.com" type="email" />
                      <GhostBtn onClick={sendTest} disabled={testSending || !testEmail.includes('@') || !testEmail.includes('.')} small>
                        {testSending ? 'Sending…' : 'Send test'}
                      </GhostBtn>
                    </div>
                    {testResult && (
                      <div style={{ marginTop: '0.4rem', fontSize: '11px', color: testResult === 'sent' ? '#3B6B2F' : '#7B2032' }}>
                        {testResult === 'sent' ? '✓ Test email sent.' : testResult}
                      </div>
                    )}
                  </div>
                </div>

                <Err msg={error} />

                {/* Send / Confirm */}
                {showConfirm ? (
                  <div style={{ padding: '1.1rem 1.25rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderLeft: '2px solid #7B2032' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '0.85rem', lineHeight: '1.5' }}>
                      Send to <strong>{audienceLabel}</strong>?<br />
                      <span style={{ fontSize: '11px', color: '#888' }}>This cannot be undone.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <PrimaryBtn onClick={confirmSend} disabled={sending}>{sending ? 'Sending…' : 'Confirm Send'}</PrimaryBtn>
                      <GhostBtn onClick={() => setShowConfirm(false)} disabled={sending}>Cancel</GhostBtn>
                    </div>
                  </div>
                ) : (
                  <PrimaryBtn onClick={handleSendClick} disabled={sending}>
                    {sending ? 'Sending…' : 'Send Broadcast'}
                  </PrimaryBtn>
                )}
              </div>

              {/* ── Right column — live preview ── */}
              <div className="bc-preview-sticky" style={{ position: 'sticky', top: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Preview</div>
                  <button
                    onClick={() => setPreviewExpanded(true)}
                    style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '3px 10px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}
                  >
                    Expand
                  </button>
                </div>
                {/* 5. Inline preview with from/subject header */}
                <PreviewPanel bodyHtml={bodyHtml} bodyEmpty={bodyEmpty} maxHeight="calc(100vh - 18rem)" subject={subject} fromEmail={fromEmail} />
              </div>

              {/* Expanded preview modal */}
              {previewExpanded && (
                <div className="bc-preview-overlay" onClick={() => setPreviewExpanded(false)}>
                  <div className="bc-preview-modal" onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
                      <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>Preview</div>
                      <button onClick={() => setPreviewExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#aaa', lineHeight: 1, padding: '0 4px' }}>×</button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      <PreviewPanel bodyHtml={bodyHtml} bodyEmpty={bodyEmpty} maxHeight="none" subject={subject} />
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </>
      )}
    </div>
  )
}
