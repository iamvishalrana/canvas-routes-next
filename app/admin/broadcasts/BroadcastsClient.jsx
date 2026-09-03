'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { sel, L, PrimaryBtn, GhostBtn, Err, ConfirmDialog, CopyBtn } from '../_components/shared'
import { useConfirm } from '../_components/ConfirmProvider'
import { EMAIL_SIGNATURE_HTML } from '../../../lib/emailSignature.js'
import { mtlDatetimeLocalToISO } from '../../../lib/mtlTime.js'
import EmailActivityClient from '../email-activity/EmailActivityClient'

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

// Per-recipient delivery status — same keys/colors as EVENT_META in
// app/admin/email-activity/EmailActivityClient.jsx, plus 'pending' and
// 'send_failed' which that page has no use for.
const DELIVERY_STATUS_META = {
  'email.sent':        { label: 'Sent',       color: '#888' },
  'email.delivered':   { label: 'Delivered',  color: '#3B6B2F' },
  'email.opened':      { label: 'Opened',     color: '#4FA3A5' },
  'email.clicked':     { label: 'Clicked',    color: '#4FA3A5' },
  'email.bounced':     { label: 'Bounced',    color: '#93333E' },
  'email.complained':  { label: 'Complaint',  color: '#93333E' },
  // 'email.scheduled' isn't listed here — the stats route collapses a
  // recipient whose only event is that one into 'pending' below it, since
  // scheduling isn't a delivery milestone.
  'email.failed':      { label: 'Failed',     color: '#93333E' },
  pending:             { label: 'Pending',    color: '#bbb' },
  send_failed:         { label: 'Failed',     color: '#93333E' },
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
  { label: 'Courier',         value: 'Courier New, monospace'     },
]

const SIZES = ['12px','13px','14px','15px','16px','18px','20px','24px','28px']

const PRESET_TEMPLATES = [
  {
    id: 'preset_event_reminder',
    name: 'Event Reminder',
    subject: 'Reminder — [Event Name] this [Day]',
    bodyHtml: '<p>Hey {{name}},</p><p>Just a quick reminder — <strong>[Event Name]</strong> is this <strong>[Day, Date]</strong>.</p><p>Meet at <strong>[Location]</strong> at <strong>[Time]</strong>. Reply to this email if anything comes up.</p><p>See you there.</p>',
  },
  {
    id: 'preset_post_event',
    name: 'Post-Event Thank You',
    subject: 'Thanks for coming out',
    bodyHtml: '<p>Hey {{name}},</p><p>Thanks for joining us — it was a great day.</p><p>Photos are going up on Instagram <a href="https://instagram.com/canvasroutes">@canvasroutes</a>. More events coming soon.</p><p>See you on the road.</p>',
  },
  {
    id: 'preset_inner_circle',
    name: 'Inner Circle — Early Access',
    subject: 'Inner Circle — First look at [Event Name]',
    bodyHtml: '<p>Hey {{name}},</p><p>As an Inner Circle member you get first access before we open to the rest of the community.</p><p><strong>[Event details — date, route, pricing, what\'s included.]</strong></p><p>Spots are limited. Reply to this email or register at the link below.</p>',
  },
  {
    id: 'preset_confirmed',
    name: 'Registration Confirmed',
    subject: 'You\'re confirmed — [Event Name]',
    bodyHtml: '<p>Hey {{name}},</p><p>You\'re confirmed for <strong>[Event Name]</strong>. Your payment has been captured.</p><p>Full details and the private itinerary will come closer to the date. Any questions, reply here.</p><p>See you on the road.</p>',
  },
]

// Mirrors the editor's rendering 1:1 in email clients. The editor shows
// paragraphs 0.75em apart and a blank line where you pressed Enter twice —
// the sent email must look identical, so paragraphs get the same margin
// inline and empty paragraphs (which email clients collapse to nothing)
// get a &nbsp; so the blank line survives.
function processBodyHtml(html) {
  return html
    // Blank lines typed in the editor are empty <p> tags — give them content
    // or Gmail/Outlook collapse them to zero height
    .replace(/<p([^>]*)>(?:\s|&nbsp;|<br[^>]*\/?>)*<\/p>/gi, '<p$1>&nbsp;</p>')
    // Style plain and align-styled paragraphs to match the editor exactly.
    // Runs before the h1-h3 conversions so headings keep their own styles.
    .replace(/<p>/gi, '<p style="margin:0 0 0.75em;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333;">')
    .replace(/<p style="(?!margin:0 0 0\.75em)/gi, '<p style="margin:0 0 0.75em;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333;')
    .replace(/<ul(\s[^>]*)?>/gi, (_, a = '') => `<ul${a} style="margin:0 0 0.75em;padding-left:1.5em;list-style-type:disc;">`)
    .replace(/<ol(\s[^>]*)?>/gi, (_, a = '') => `<ol${a} style="margin:0 0 0.75em;padding-left:1.5em;list-style-type:decimal;">`)
    .replace(/<li(\s[^>]*)?>/gi, (_, a = '') => `<li${a} style="margin:0 0 0.35em;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333;">`)
    .replace(/<blockquote(\s[^>]*)?>/gi, (_, a = '') => `<blockquote${a} style="margin:0 0 0.75em;padding:0.5em 1em;border-left:3px solid #ddd;color:#666;">`)
    .replace(/<h1(\s[^>]*)?>/gi, (_, a = '') => `<p${a} style="margin:0 0 0.75em;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;">`)
    .replace(/<\/h1>/gi, '</p>')
    .replace(/<h2(\s[^>]*)?>/gi, (_, a = '') => `<p${a} style="margin:0 0 0.7em;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;line-height:1.3;">`)
    .replace(/<\/h2>/gi, '</p>')
    .replace(/<h3(\s[^>]*)?>/gi, (_, a = '') => `<p${a} style="margin:0 0 0.6em;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1a1a1a;">`)
    .replace(/<\/h3>/gi, '</p>')
}

// Plain, personal-looking email: white background, no boxed layout, no
// coloured header/footer — just the message with the signature underneath,
// like an email typed by hand. (The old template put everything in a beige
// box with a dark logo header, which read as dated marketing.)
function buildHtml(bodyHtml) {
  const processed = processBodyHtml(bodyHtml)
  return `<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>:root{color-scheme:light;supported-color-schemes:light;}</style>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;">
      <tr>
        <td style="padding:28px 24px 4px;background:#ffffff;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333;">${processed}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 4px;background:#ffffff;">
          ${EMAIL_SIGNATURE_HTML}
        </td>
      </tr>
      <!-- Unsubscribe — replaced per-recipient by broadcasts route.js -->
      <tr>
        <td style="padding:0 24px 32px;background:#ffffff;">
          <!-- UNSUBSCRIBE_FOOTER -->
        </td>
      </tr>
    </table>
  </td></tr>
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
        <span key={email} className="bc-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(0,0,0,0.05)', border: '0.5px solid rgba(0,0,0,0.1)', padding: '2px 4px 2px 8px', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', color: '#444' }}>
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

// Search everyone we know — members, past applicants, AND contacts — by name
// or email and add their email as a chip. The list is merged and de-duplicated
// by email (see the load effect), with a small source tag so the admin can see
// who they're adding. Sits above the free-text ChipInput so an admin can find
// someone without knowing their exact email, while still pasting/typing raw
// addresses below.
function RecipientSearch({ people, addedEmails, onAdd }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const added = new Set(addedEmails)
  const filtered = q
    ? people.filter(p => p.email && !added.has(p.email.toLowerCase())
        && (p.name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))).slice(0, 8)
    : []
  return (
    <div style={{ position: 'relative' }}>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search members, applicants & contacts…"
        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.15)', background: '#fff', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', borderRadius: '8px', boxSizing: 'border-box' }} />
      {filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto' }}>
          {filtered.map(p => (
            <button key={p.email} type="button" onClick={() => { onAdd(p.email.toLowerCase()); setSearch('') }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem', background: 'none', border: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.05)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '12px', color: '#1a1a1a' }}>{p.name || '(no name)'}</span>
                {p.source && <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', flexShrink: 0 }}>{p.source}</span>}
              </div>
              <div style={{ fontSize: '10px', color: '#999' }}>{p.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── React preview signature ──────────────────────────────────────────────────
function Signature() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-color.svg" width="78" style={{ display: 'block', marginRight: '14px', flexShrink: 0 }} alt="Canvas Routes" />
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
          <span style={{ fontSize: '12px', color: '#555', fontFamily: 'Arial,sans-serif' }}>Canvas Routes &lt;{fromEmail || 'jerry@canvasroutes.com'}&gt;</span>
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
            style={{ fontSize: '15px', lineHeight: '1.7', color: '#333', fontFamily: 'Arial,sans-serif', marginBottom: '20px' }}
            /* Same processed HTML as the sent email — the preview IS the email */
            dangerouslySetInnerHTML={{ __html: processBodyHtml(bodyHtml) }}
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
  background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif',
  padding: '2px 4px', cursor: 'pointer', color: '#555',
  outline: 'none', height: '24px', appearance: 'none', WebkitAppearance: 'none',
}

const INP = {
  width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem',
  border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '13px',
  fontFamily: 'var(--font-inter),sans-serif', outline: 'none',
  background: '#fff', color: '#1a1a1a', borderRadius: '10px',
}

// ── 7. Toolbar with {{name}} insert button ───────────────────────────────────
function Toolbar({ editor }) {
  if (!editor) return null
  const currentFont = editor.getAttributes('textStyle').fontFamily || FONTS[0].value
  const currentSize = editor.getAttributes('textStyle').fontSize || '15px'

  return (
    <div className="bc-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', padding: '0.5rem 0.75rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', alignItems: 'center' }}>
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
      <button
        style={{ ...TBTN(false), fontSize: '10px', minWidth: 'auto', padding: '3px 7px', letterSpacing: '0.03em', fontFamily: 'var(--font-inter),sans-serif' }}
        title="Insert first name only (e.g. 'Marc' instead of 'Marc-Antoine Sauvé')"
        onClick={() => editor.chain().focus().insertContent('{{firstName}}').run()}
      >
        {'{{firstName}}'}
      </button>
    </div>
  )
}

export default function BroadcastsClient({ emailEvents, emailCounts, emailConfigured, emailLoadError, emailFetchedAt }) {
  const confirm = useConfirm()
  const searchParams = useSearchParams()
  const [tab, setTab]                           = useState(() => (searchParams.get('tab') === 'activity' ? 'activity' : 'compose'))
  const [audience, setAudience]                 = useState('specific_emails')
  const [fromEmail, setFromEmail]               = useState('jerry@canvasroutes.com')
  const [chipEmails, setChipEmails]             = useState([])          // 1. chip emails
  const [people, setPeople]                     = useState([])          // members + applicants + contacts, for the specific-emails search-select
  const [extraEmails, setExtraEmails]           = useState([])          // one list — treated as include OR exclude per emailMode
  const [emailMode, setEmailMode]               = useState(null)        // null | 'exclude' | 'include' — field greyed until one is picked
  const [subject, setSubject]                   = useState('')
  const [bodyHtml, setBodyHtml]                 = useState('')          // explicit state for draft save
  const [sendMode, setSendMode]                 = useState('now')       // 'now' | 'schedule'
  const [scheduledAtLocal, setScheduledAtLocal] = useState('')          // raw datetime-local value, interpreted as Montreal time server-side
  const [sending, setSending]                   = useState(false)
  const [error, setError]                       = useState(null)
  const [result, setResult]                     = useState(null)
  const [history, setHistory]                   = useState([])
  const [historyLoading, setHistoryLoading]     = useState(false)
  const [historyError, setHistoryError]         = useState(null)
  const [deliveryModalId, setDeliveryModalId]   = useState(null)       // which broadcast's delivery modal is open
  const [deliveryStats, setDeliveryStats]       = useState({})        // { [broadcastId]: { loading, error, counts, recipients, showList } }
  const [deleteHistoryConfirm, setDeleteHistoryConfirm] = useState(null)
  const [deletingHistory, setDeletingHistory]   = useState(false)
  const [historyActionErr, setHistoryActionErr] = useState(null)
  const [cancelConfirm, setCancelConfirm]       = useState(null)       // broadcast row pending cancel confirmation
  const [cancelingScheduled, setCancelingScheduled] = useState(false)
  const [cancelActionErr, setCancelActionErr]   = useState(null)
  const [recipientCount, setRecipientCount]     = useState(null)
  const [countLoading, setCountLoading]         = useState(false)
  const [testEmail, setTestEmail]               = useState('')
  const [testSending, setTestSending]           = useState(false)
  const [testResult, setTestResult]             = useState(null)
  const [attachments, setAttachments]           = useState([]) // { filename, contentType, size, content(base64) }
  const [attachErr, setAttachErr]               = useState(null)
  const attachRef                               = useRef(null)
  const [previewExpanded, setPreviewExpanded]   = useState(false)
  const [savedTemplates, setSavedTemplates]     = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName]         = useState('')
  const [templateSaving, setTemplateSaving]     = useState(false)
  const [templateSaveError, setTemplateSaveError] = useState(null)
  const sendingRef      = useRef(false)
  const tabRef          = useRef(tab)
  const draftRestoredRef = useRef(false)
  useEffect(() => { tabRef.current = tab }, [tab])

  // For the "Specific Emails" search-select — loaded once, independent of
  // audience/tab so it's ready the moment an admin switches to that mode.
  // Pulls from members, applications, AND contacts so any known person can be
  // found by name, merged and de-duplicated by email (members win the source
  // label, then applicants, then contacts).
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/members').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/admin/applications').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/admin/contacts').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([mem, apps, contacts]) => {
      const byEmail = new Map()
      const add = (name, email, source) => {
        const e = (email || '').toLowerCase().trim()
        if (!e || byEmail.has(e)) return
        byEmail.set(e, { id: e, name: name || '', email: e, source })
      }
      ;(Array.isArray(mem) ? mem : []).forEach(m => add(m.name, m.email, 'member'))
      ;(Array.isArray(apps) ? apps : []).forEach(a => add(a.name, a.email, 'applicant'))
      ;(Array.isArray(contacts) ? contacts : []).forEach(c => add(c.name, c.email, 'contact'))
      setPeople([...byEmail.values()])
    }).catch(() => {})
  }, [])

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
      if (Array.isArray(saved.extraEmails) && saved.extraEmails.length) setExtraEmails(saved.extraEmails)
      if (saved.emailMode === 'exclude' || saved.emailMode === 'include') setEmailMode(saved.emailMode)
      if (saved.bodyHtml && saved.bodyHtml !== '<p></p>') {
        editor.commands.setContent(saved.bodyHtml)
        setBodyHtml(saved.bodyHtml)
      }
      // Only restore a "schedule for later" draft if the saved time is still
      // in the future — a stale past time from a session days ago would just
      // fail validation silently sitting in the field otherwise.
      const savedISO = saved.scheduledAtLocal ? mtlDatetimeLocalToISO(saved.scheduledAtLocal) : null
      if (saved.sendMode === 'schedule' && savedISO && new Date(savedISO) > new Date()) {
        setSendMode('schedule')
        setScheduledAtLocal(saved.scheduledAtLocal)
      }
    } catch {}
  }, [editor])

  // Pre-fill from ?email= — the EmailLink shortcut on Members/Applications/
  // Contacts (see shared.jsx) lands here with a specific address to message.
  // Declared after the draft-restore effect above so it always runs second
  // in the same commit (both gated on `editor` first becoming ready) — a
  // stale saved draft can never silently drop the address someone just
  // clicked through for.
  const emailParamAppliedRef = useRef(false)
  useEffect(() => {
    if (!editor || emailParamAppliedRef.current) return
    const emailParam = searchParams.get('email')?.trim().toLowerCase()
    if (!emailParam) return
    emailParamAppliedRef.current = true
    setAudience('specific_emails')
    setChipEmails(prev => prev.includes(emailParam) ? prev : [...prev, emailParam])
  }, [editor, searchParams])

  // 4. Auto-save draft to localStorage on any change
  useEffect(() => {
    if (!draftRestoredRef.current) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, bodyHtml, audience, chipEmails, extraEmails, emailMode, fromEmail, sendMode, scheduledAtLocal })) } catch {}
  }, [subject, bodyHtml, audience, chipEmails, extraEmails, emailMode, fromEmail, sendMode, scheduledAtLocal])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch('/api/admin/broadcasts')
      if (res.ok) setHistory(await res.json())
      else {
        const d = await res.json().catch(() => ({}))
        setHistoryError(d.error || 'Failed to load broadcast history.')
      }
    } catch {
      setHistoryError('Network error.')
    }
    setHistoryLoading(false)
  }, [])

  useEffect(() => { if (tab === 'activity') loadHistory() }, [tab, loadHistory])

  async function deleteHistory(id) {
    setDeletingHistory(true)
    setHistoryActionErr(null)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setHistoryActionErr(d.error || 'Failed to delete.'); return }
      setHistory(prev => prev.filter(h => h.id !== id))
      if (deliveryModalId === id) setDeliveryModalId(null)
      setDeleteHistoryConfirm(null)
    } catch {
      setHistoryActionErr('Network error — entry not deleted.')
    } finally {
      setDeletingHistory(false)
    }
  }

  async function cancelScheduled(id) {
    setCancelingScheduled(true)
    setCancelActionErr(null)
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}/cancel`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setCancelActionErr(d.error || 'Failed to cancel.'); return }
      setHistory(prev => prev.map(h => h.id === id ? { ...h, canceled_at: new Date().toISOString() } : h))
      setCancelConfirm(null)
    } catch {
      setCancelActionErr('Network error — not canceled.')
    } finally {
      setCancelingScheduled(false)
    }
  }

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const res = await fetch('/api/admin/broadcasts/templates')
      if (res.ok) setSavedTemplates(await res.json())
    } catch {}
    setTemplatesLoading(false)
  }, [])

  useEffect(() => { if (tab === 'templates') loadTemplates() }, [tab, loadTemplates])

  function useTemplate(t) {
    setSubject(t.subject || '')
    if (editor) {
      if (t.bodyHtml) { editor.commands.setContent(t.bodyHtml); setBodyHtml(t.bodyHtml) }
      else { editor.commands.clearContent(); setBodyHtml('') }
    }
    setResult(null); setError(null)
    setTab('compose')
  }

  async function saveTemplate() {
    if (!templateName.trim()) { setTemplateSaveError('Template name is required.'); return }
    if (!subject.trim()) { setTemplateSaveError('Add a subject line before saving.'); return }
    setTemplateSaving(true); setTemplateSaveError(null)
    try {
      const res = await fetch('/api/admin/broadcasts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName.trim(), subject: subject.trim(), bodyHtml }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setTemplateSaveError(d.error || 'Failed to save.'); return }
      setShowSaveTemplate(false); setTemplateName(''); setTemplateSaveError(null)
    } catch { setTemplateSaveError('Network error.') }
    setTemplateSaving(false)
  }

  async function deleteTemplate(id) {
    if (!(await confirm({ title: 'Delete this template?', message: 'This removes the saved template. It cannot be undone.', confirmLabel: 'Yes, delete', danger: true }))) return
    await fetch('/api/admin/broadcasts/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setSavedTemplates(prev => prev.filter(t => t.id !== id))
  }

  const onBroadcastChange = useCallback(() => {
    if (tabRef.current === 'activity') loadHistory()
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

  // Attachments: read as base64 for the Resend API. 3 MB total keeps the
  // request comfortably under Vercel's 4.5 MB body limit after base64 growth.
  const MAX_ATTACH_BYTES = 3 * 1024 * 1024
  const fmtSize = b => b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`
  const attachmentPayload = () => attachments.map(({ filename, contentType, content }) => ({ filename, contentType, content }))

  async function handleAttach(e) {
    const files = Array.from(e.target.files || [])
    if (attachRef.current) attachRef.current.value = ''
    if (!files.length) return
    setAttachErr(null)
    const current = [...attachments]
    for (const f of files) {
      if (current.length >= 5) { setAttachErr('Up to 5 attachments per email.'); break }
      if (current.reduce((s, a) => s + a.size, 0) + f.size > MAX_ATTACH_BYTES) { setAttachErr('Attachments are limited to 3 MB total.'); break }
      const content = await new Promise(resolve => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result).split(',')[1] || null)
        r.onerror = () => resolve(null)
        r.readAsDataURL(f)
      })
      if (!content) { setAttachErr(`Could not read ${f.name}.`); continue }
      current.push({ filename: f.name, contentType: f.type || 'application/octet-stream', size: f.size, content })
    }
    setAttachments(current)
  }

  async function sendTest() {
    const email = testEmail.trim()
    if (!email.includes('@') || !email.includes('.')) return
    if (!subject.trim() && bodyEmpty) return
    setTestSending(true); setTestResult(null)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim() || '(Test)', html: buildHtml(bodyHtml), body_html: bodyHtml, audience: 'specific_emails', specificEmails: [email], fromEmail, ...(attachments.length > 0 ? { attachments: attachmentPayload() } : {}) }),
      })
      const data = await res.json().catch(() => ({}))
      // res.ok with sent:0 means the address was filtered out (unsubscribed) —
      // report that instead of a misleading "Sent ✓".
      setTestResult(!res.ok ? (data.error || 'Failed.')
        : data.sent > 0 ? 'sent'
        : 'Not sent — that address may be unsubscribed.')
    } catch { setTestResult('Network error.') }
    finally { setTestSending(false) }
  }

  // 1. chip emails are already parsed — no textarea to parse
  const parsedEmails = chipEmails
  const audienceLabel = audience === 'specific_emails'
    ? `${parsedEmails.length} specific email${parsedEmails.length !== 1 ? 's' : ''}`
    : AUDIENCE_OPTIONS.find(o => o.value === audience)?.label || audience

  function fmtScheduledLocal(localStr) {
    const iso = mtlDatetimeLocalToISO(localStr)
    if (!iso) return ''
    return new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Toronto' })
  }

  // Soft UX floor for the datetime-local picker's `min` — server validation
  // (2-minute floor, converted correctly for DST) is what's actually
  // authoritative. Expressed in Montreal wall-clock terms so it lines up
  // with how the picked value itself gets interpreted.
  function minScheduleLocal() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(Date.now() + 3 * 60 * 1000))
    const get = t => parts.find(p => p.type === t)?.value
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
  }

  async function handleSendClick() {
    setError(null)
    if (!subject.trim()) { setError('Subject is required.'); return }
    if (bodyEmpty) { setError('Message body is required.'); return }
    if (audience === 'specific_emails' && parsedEmails.length === 0) { setError('Enter at least one valid email.'); return }
    const isSchedule = sendMode === 'schedule'
    if (isSchedule && !scheduledAtLocal) { setError('Pick a date and time to schedule for.'); return }
    const countStr = recipientCount !== null ? `${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}` : null
    const scheduledLabel = isSchedule ? fmtScheduledLocal(scheduledAtLocal) : null
    if (!(await confirm({
      title: isSchedule ? 'Schedule this broadcast?' : 'Send this broadcast?',
      message: isSchedule
        ? 'This queues the email to go out at the chosen time. You can cancel it any time before then from Email Activity.'
        : 'This emails everyone in the selected audience and cannot be undone.',
      details: <>To: <strong>{audienceLabel}</strong>{countStr ? <> · {countStr}</> : null}<br />Subject: {subject.trim() || '—'}{isSchedule && scheduledLabel ? <><br />Sends: <strong>{scheduledLabel}</strong></> : null}</>,
      confirmLabel: isSchedule ? 'Yes, schedule broadcast' : 'Yes, send broadcast',
    }))) return
    confirmSend()
  }

  async function confirmSend() {
    if (sendingRef.current) return
    sendingRef.current = true
    setSending(true); setError(null); setResult(null)
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
          // The one list is sent as exclude OR include depending on the toggle.
          ...(emailMode === 'exclude' && extraEmails.length > 0 ? { excludeEmails: extraEmails } : {}),
          ...(emailMode === 'include' && extraEmails.length > 0 ? { includeEmails: extraEmails } : {}),
          ...(attachments.length > 0 ? { attachments: attachmentPayload() } : {}),
          ...(sendMode === 'schedule' && scheduledAtLocal ? { scheduledAt: scheduledAtLocal } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to send.'); return }
      setResult(data)
      setSubject('')
      editor?.chain().clearContent().unsetAllMarks().run()
      setBodyHtml('')
      setChipEmails([])
      setExtraEmails([]); setEmailMode(null)
      setAttachments([])
      setAttachErr(null)
      setFromEmail('jerry@canvasroutes.com')
      setAudience('specific_emails')
      setSendMode('now'); setScheduledAtLocal('')
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

  // Reload a past broadcast targeting ONLY the recipients it failed to reach —
  // one click to resend after a partial failure (rate-limit blip, a bad address
  // in the batch, etc.) instead of re-sending to the whole audience.
  function retryFailed(h) {
    const emails = [...new Set((h.failed_recipients || []).map(f => (f.email || '').toLowerCase().trim()).filter(Boolean))]
    if (emails.length === 0) return
    setSubject(h.subject || '')
    if (editor) {
      if (h.body_html) { editor.commands.setContent(h.body_html); setBodyHtml(h.body_html) }
      else { editor.commands.clearContent(); setBodyHtml('') }
    }
    setAudience('specific_emails')
    setChipEmails(emails)
    setExtraEmails([]); setEmailMode(null)
    setResult(null); setError(null)
    setTab('compose')
    if (!h.body_html) setError('The original message body wasn’t saved for this broadcast — re-add it before resending.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Lazy-loaded per-broadcast delivery status (delivered/opened/clicked/
  // bounced), fetched once per row on first expand and cached in state.
  // Broadcasts sent before broadcast_recipients existed (2026-08-21) come
  // back with an empty recipients array — handled as "no data" in the UI,
  // not zero counts.
  function loadDeliveryStats(id) {
    if (deliveryStats[id]) return // already loaded or loading
    setDeliveryStats(prev => ({ ...prev, [id]: { loading: true } }))
    fetch(`/api/admin/broadcasts/${id}/stats`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setDeliveryStats(prev => ({ ...prev, [id]: { loading: false, counts: data.counts, recipients: data.recipients } })))
      .catch(() => setDeliveryStats(prev => ({ ...prev, [id]: { loading: false, error: true } })))
  }

  function openDeliveryModal(h) {
    setDeliveryModalId(h.id)
    loadDeliveryStats(h.id)
  }

  const deliveryModalBroadcast = deliveryModalId ? history.find(h => h.id === deliveryModalId) : null

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <style>{`
        .tiptap-editor { border: 0.5px solid rgba(0,0,0,0.15); background: #fff; }
        .tiptap-editor:focus-within { border-color: rgba(0,0,0,0.3); }
        /* Editor typography mirrors the sent email exactly (Arial 15px,
           1.7 line-height, 0.75em paragraph gap) so what you type is what
           the recipient sees — including blank lines between paragraphs */
        .tiptap-editor .ProseMirror { min-height: 160px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: #333; }
        .tiptap-editor p { margin: 0 0 0.75em; }
        .tiptap-editor ul, .tiptap-editor ol { margin: 0 0 0.75em; padding-left: 1.5em; }
        .tiptap-editor li { margin: 0 0 0.35em; }
        /* Comfortable tap targets on touch devices — the 24px toolbar buttons
           are precise enough with a mouse but fiddly with a thumb */
        @media (hover: none) {
          .bc-toolbar button, .bc-toolbar select { min-height: 32px; min-width: 30px; }
        }
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
          animation: adminOverlayIn 0.18s ease-out;
        }
        .bc-preview-modal {
          background: #fff; width: 100%; max-width: 760px;
          max-height: 90vh; display: flex; flex-direction: column;
          border: 0.5px solid rgba(0,0,0,0.15);
          animation: adminModalIn 0.22s cubic-bezier(0.2,0.8,0.3,1);
        }
        /* ── Broadcast animations ── */
        @keyframes bc-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bc-pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes bc-shimmer { 0% { left: -60%; } 16% { left: 130%; } 100% { left: 130%; } }
        /* Compose cards + preview rise in with a light stagger on mount / tab-in */
        .bc-compose-col > div { animation: bc-fade-up 0.42s cubic-bezier(0.16,1,0.3,1) both; }
        .bc-compose-col > div:nth-child(1) { animation-delay: 0.03s; }
        .bc-compose-col > div:nth-child(2) { animation-delay: 0.08s; }
        .bc-compose-col > div:nth-child(3) { animation-delay: 0.13s; }
        .bc-compose-col > div:nth-child(4) { animation-delay: 0.18s; }
        .bc-compose-col > div:nth-child(n+5) { animation-delay: 0.22s; }
        .bc-preview-sticky { animation: bc-fade-up 0.42s cubic-bezier(0.16,1,0.3,1) 0.12s both; }
        /* Email chips pop in as they're added */
        .bc-chip { animation: bc-pop 0.18s cubic-bezier(0.16,1,0.3,1) both; }
        /* Send button — hover lift + a periodic shimmer sweep */
        .bc-send-btn { position: relative; overflow: hidden; transition: transform 0.18s cubic-bezier(0.23,1,0.32,1), box-shadow 0.18s ease; }
        .bc-send-btn::after {
          content: ''; position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
          background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%);
          transform: skewX(-14deg); animation: bc-shimmer 5s ease-in-out 1.4s infinite; pointer-events: none;
        }
        @media (hover: hover) {
          .bc-send-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(15,30,20,0.28); }
          .bc-seg-btn:not(:disabled):hover { box-shadow: inset 0 0 0 20px rgba(197,168,130,0.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bc-compose-col > div, .bc-preview-sticky, .bc-chip, .bc-send-btn::after { animation: none; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Broadcasts</h1>
      </div>

      {/* Tabs — horizontal scroll (not wrap) once 4 tabs no longer fit a narrow viewport */}
      <div style={{ display: 'flex', marginBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {[{ id: 'compose', label: 'Compose' }, { id: 'templates', label: 'Templates' }, { id: 'activity', label: 'Email Activity' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '0.6rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
            color: tab === t.id ? '#1a1a1a' : '#aaa',
            borderBottom: tab === t.id ? '1.5px solid #1a1a1a' : '1.5px solid transparent',
            marginBottom: '-0.5px', transition: 'color 0.15s',
            fontFamily: 'var(--font-inter),sans-serif',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Email Activity — one merged feed. A broadcast's send appears as a
           single aggregate row (not once per recipient event) alongside
           individual transactional email rows, so nothing shows twice. ── */}
      {tab === 'activity' && (
        <EmailActivityClient
          events={emailEvents}
          counts={emailCounts}
          configured={emailConfigured}
          loadError={emailLoadError}
          fetchedAt={emailFetchedAt}
          broadcasts={history}
          broadcastsLoading={historyLoading}
          broadcastsError={historyError}
          onViewDelivery={openDeliveryModal}
          onReuseBroadcast={reuseHistory}
          onRetryFailedBroadcast={retryFailed}
          onDeleteBroadcast={h => setDeleteHistoryConfirm(h)}
          onCancelScheduled={h => { setCancelActionErr(null); setCancelConfirm(h) }}
        />
      )}

      {/* ── Templates ── */}
      {tab === 'templates' && (
        <div>
          {/* Preset templates */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.85rem' }}>Starter templates</div>
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              {PRESET_TEMPLATES.map((t, idx) => (
                <div key={t.id} style={{ padding: '1rem 1.25rem', borderBottom: idx < PRESET_TEMPLATES.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.2rem' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                  </div>
                  <button
                    onClick={() => useTemplate(t)}
                    style={{ flexShrink: 0, background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '4px 12px', cursor: 'pointer', fontSize: '10px', color: '#555', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Saved templates */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.85rem' }}>Saved templates</div>
            {templatesLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
            ) : savedTemplates.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', fontSize: '13px', color: '#ccc', textAlign: 'center' }}>
                No saved templates yet — compose an email and click <strong style={{ color: '#bbb', fontWeight: '500' }}>Save as template</strong> to save it here.
              </div>
            ) : (
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                {savedTemplates.map((t, idx) => (
                  <div key={t.id} style={{ padding: '1rem 1.25rem', borderBottom: idx < savedTemplates.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.2rem' }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>{t.subject}</span>
                        <span style={{ fontSize: '10px', color: '#ccc', flexShrink: 0 }}>
                          {new Date(t.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => useTemplate(t)}
                        style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '4px 12px', cursor: 'pointer', fontSize: '10px', color: '#555', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                      >
                        Use
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        style={{ background: 'none', border: '0.5px solid rgba(147,51,62,0.2)', padding: '4px 10px', cursor: 'pointer', fontSize: '10px', color: '#93333E', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#3B6B2F', marginBottom: (result.failed > 0 || result.truncated || result.historySaved === false) ? '0.35rem' : 0 }}>
                {result.scheduledFor
                  ? <>✓ Broadcast scheduled for {new Date(result.scheduledFor).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Toronto' })} — {result.sent} recipient{result.sent !== 1 ? 's' : ''} queued.</>
                  : <>✓ Broadcast sent — {result.sent} email{result.sent !== 1 ? 's' : ''} delivered.</>}
              </div>
              {result.failed > 0 && <div style={{ fontSize: '12px', color: '#93333E', marginTop: '0.25rem' }}>{result.failed} failed to {result.scheduledFor ? 'queue' : 'deliver'}.</div>}
              {result.truncated && <div style={{ fontSize: '12px', color: '#8A6535', marginTop: '0.25rem' }}>⚠ List capped at {MAX_RECIPIENTS} — {result.totalRecipients - MAX_RECIPIENTS} recipients not reached.</div>}
              {result.historySaved === false && <div style={{ fontSize: '12px', color: '#93333E', marginTop: '0.25rem' }}>⚠ Emails were sent, but this broadcast could not be saved to History{result.historyError ? ` — ${result.historyError}` : ''}.</div>}
              <button onClick={() => setResult(null)} style={{ marginTop: '0.75rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '10px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Compose another
              </button>
            </div>
          )}

          {!result && (
            <div className="bc-grid">

              {/* ── Left column ── */}
              <div className="bc-compose-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* From */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
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
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
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
                        {countLoading ? 'Counting…' : recipientCount !== null
                          ? `${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`
                            + (emailMode === 'include' && extraEmails.length ? ` + ${extraEmails.length} extra` : '')
                            + (emailMode === 'exclude' && extraEmails.length ? ` − ${extraEmails.length} excluded` : '')
                            + (recipientCount > MAX_RECIPIENTS ? ` (capped at ${MAX_RECIPIENTS})` : '')
                          : ''}
                      </div>
                    )}
                    {/* One email list — the toggle decides whether it Excludes members
                        or Includes extra recipients. Field is greyed until a mode is picked. */}
                    {audience !== 'specific_emails' && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb' }}>Extra emails</span>
                          <div style={{ marginLeft: 'auto', display: 'inline-flex', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '7px', overflow: 'hidden' }}>
                            {[['exclude', 'Exclude'], ['include', 'Include']].map(([m, label]) => (
                              <button key={m} type="button" className="bc-seg-btn" onClick={() => setEmailMode(cur => cur === m ? null : m)}
                                style={{ padding: '5px 13px', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif', transition: 'background 0.18s, color 0.18s', background: emailMode === m ? '#0F1E14' : '#fff', color: emailMode === m ? '#F5F1EC' : '#888' }}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ opacity: emailMode ? 1 : 0.4, pointerEvents: emailMode ? 'auto' : 'none', transition: 'opacity 0.2s ease' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>
                            {emailMode === 'include' ? 'Also send to these extra emails' : emailMode === 'exclude' ? 'Exclude these members' : 'Pick Exclude or Include above'}
                          </div>
                          <ChipInput
                            chips={extraEmails}
                            onAdd={email => setExtraEmails(prev => prev.includes(email) ? prev : [...prev, email])}
                            onRemove={email => setExtraEmails(prev => prev.filter(e => e !== email))}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                            <span style={{ fontSize: '11px', color: extraEmails.length > 0 ? '#8A6535' : '#ccc' }}>
                              {extraEmails.length > 0
                                ? `${extraEmails.length} ${emailMode === 'include' ? 'to add' : emailMode === 'exclude' ? 'to exclude' : 'email' + (extraEmails.length !== 1 ? 's' : '')}`
                                : 'None'}
                            </span>
                            {extraEmails.length > 0 && (
                              <button onClick={() => setExtraEmails([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>Clear</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 1. Chip email input */}
                    {audience === 'specific_emails' && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <RecipientSearch
                          people={people}
                          addedEmails={chipEmails}
                          onAdd={email => setChipEmails(prev => prev.includes(email) ? prev : [...prev, email])}
                        />
                        <div style={{ margin: '0.5rem 0', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ccc', textAlign: 'center' }}>or paste/type emails directly</div>
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
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
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

                    {/* Attachments */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                        <L style={{ margin: 0 }}>Attachments</L>
                        <span style={{ fontSize: '10px', color: '#ccc' }}>up to 5 files · 3 MB total</span>
                      </div>
                      <input ref={attachRef} type="file" multiple style={{ display: 'none' }} onChange={handleAttach} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {attachments.map((a, i) => (
                          <span key={`${a.filename}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.04)', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '4px 4px 4px 9px', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', color: '#444', maxWidth: '100%' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>📎 {a.filename}</span>
                            <span style={{ color: '#aaa', flexShrink: 0 }}>{fmtSize(a.size)}</span>
                            <button onClick={() => { setAttachments(p => p.filter((_, idx) => idx !== i)); setAttachErr(null) }} aria-label={`Remove ${a.filename}`}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#aaa', fontSize: '15px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
                          </span>
                        ))}
                        <button type="button" onClick={() => attachRef.current?.click()}
                          style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', minHeight: '30px', border: '0.5px dashed rgba(0,0,0,0.25)', borderRadius: '6px', background: 'none', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', WebkitTapHighlightColor: 'transparent' }}>
                          + Attach file
                        </button>
                      </div>
                      {attachErr && <div style={{ fontSize: '11px', color: '#93333E', marginTop: '0.35rem' }}>{attachErr}</div>}
                      {attachments.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.35rem' }}>
                          Attachment sends go out one at a time — limited to 300 recipients per send.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Test send */}
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
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
                      <div style={{ marginTop: '0.4rem', fontSize: '11px', color: testResult === 'sent' ? '#3B6B2F' : '#93333E' }}>
                        {testResult === 'sent' ? '✓ Test email sent.' : testResult}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save as template */}
                {!showSaveTemplate ? (
                  <button
                    onClick={() => { setShowSaveTemplate(true); setTemplateName('') }}
                    style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.12)', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '11px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left' }}
                  >
                    + Save as template
                  </button>
                ) : (
                  <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.6rem' }}>Save as template</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        style={{ ...INP, flex: 1 }}
                        value={templateName}
                        onChange={e => { setTemplateName(e.target.value); setTemplateSaveError(null) }}
                        placeholder="Template name…"
                        maxLength={80}
                        onKeyDown={e => e.key === 'Enter' && saveTemplate()}
                        autoFocus
                      />
                      <GhostBtn onClick={saveTemplate} disabled={templateSaving} small>{templateSaving ? 'Saving…' : 'Save'}</GhostBtn>
                      <GhostBtn onClick={() => { setShowSaveTemplate(false); setTemplateSaveError(null) }} disabled={templateSaving} small>Cancel</GhostBtn>
                    </div>
                    {templateSaveError && <div style={{ marginTop: '0.4rem', fontSize: '11px', color: '#93333E' }}>{templateSaveError}</div>}
                  </div>
                )}

                <Err msg={error} />

                {/* Send — two direct actions; the Yes/No gate is a popup either
                    way (see handleSendClick). Picking "Send Later" reveals the
                    datetime field inline instead of a separate now/later toggle. */}
                {sendMode === 'now' ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <PrimaryBtn onClick={handleSendClick} disabled={sending} className="bc-send-btn">
                      {sending ? 'Sending…' : 'Send Broadcast'}
                    </PrimaryBtn>
                    <GhostBtn onClick={() => { setSendMode('schedule'); setError(null) }} disabled={sending}>
                      Send Later
                    </GhostBtn>
                  </div>
                ) : (
                  <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1rem 1.25rem' }}>
                    <input type="datetime-local" style={INP} min={minScheduleLocal()} value={scheduledAtLocal} onChange={e => setScheduledAtLocal(e.target.value)} />
                    <div style={{ fontSize: '10px', color: '#999', margin: '0.4rem 0 0.85rem' }}>Times are Montreal time (America/Toronto).</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                      <PrimaryBtn onClick={handleSendClick} disabled={sending} className="bc-send-btn">
                        {sending ? 'Scheduling…' : 'Schedule Broadcast'}
                      </PrimaryBtn>
                      <GhostBtn onClick={() => { setSendMode('now'); setScheduledAtLocal(''); setError(null) }} disabled={sending}>
                        Cancel
                      </GhostBtn>
                    </div>
                  </div>
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

      {deleteHistoryConfirm && (
        <ConfirmDialog
          title="Delete this broadcast from history?"
          message="This only removes the history entry — the emails were already sent. This cannot be undone."
          details={<>
            <strong>{deleteHistoryConfirm.subject}</strong><br />
            {new Date(deleteHistoryConfirm.sent_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })} · {deleteHistoryConfirm.sent_count} sent
            {historyActionErr && <><br /><span style={{ color: '#93333E' }}>{historyActionErr}</span></>}
          </>}
          confirmLabel="Yes, delete"
          danger
          busy={deletingHistory}
          onConfirm={() => deleteHistory(deleteHistoryConfirm.id)}
          onCancel={() => { setDeleteHistoryConfirm(null); setHistoryActionErr(null) }}
        />
      )}

      {cancelConfirm && (
        <ConfirmDialog
          title="Cancel this scheduled broadcast?"
          message="Stops it from going out. The recipients who would have gotten it are unaffected — nothing was sent."
          details={<>
            <strong>{cancelConfirm.subject}</strong><br />
            Scheduled for {new Date(cancelConfirm.sent_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' })} · {cancelConfirm.sent_count} queued
            {cancelActionErr && <><br /><span style={{ color: '#93333E' }}>{cancelActionErr}</span></>}
          </>}
          confirmLabel="Yes, cancel it"
          danger
          busy={cancelingScheduled}
          onConfirm={() => cancelScheduled(cancelConfirm.id)}
          onCancel={() => { setCancelConfirm(null); setCancelActionErr(null) }}
        />
      )}

      {/* Per-broadcast delivery detail */}
      {deliveryModalBroadcast && (
        <div className="bc-preview-overlay" onClick={() => setDeliveryModalId(null)}>
          <div className="bc-preview-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', padding: '0.85rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.25rem' }}>Delivery</div>
                <div style={{ fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deliveryModalBroadcast.subject}</div>
              </div>
              <button onClick={() => setDeliveryModalId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#aaa', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
            </div>
            <div style={{ padding: '1.1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
              {deliveryModalBroadcast.audience === 'specific_emails' && deliveryModalBroadcast.specific_emails?.length > 0 && (
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '0.75rem', wordBreak: 'break-word' }}>
                  To: {deliveryModalBroadcast.specific_emails.join(', ')}
                </div>
              )}
              {(() => {
                const ds = deliveryStats[deliveryModalBroadcast.id]
                if (!ds || ds.loading) {
                  return <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '0.75rem' }}>{ds?.loading ? 'Loading delivery status…' : ''}</div>
                }
                if (ds.error) {
                  return <div style={{ fontSize: '11px', color: '#93333E', marginBottom: '0.75rem' }}>Could not load delivery status.</div>
                }
                if (!ds.counts || ds.counts.total === 0) {
                  return <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '0.75rem' }}>No delivery data — this broadcast was sent before per-recipient tracking was added.</div>
                }
                const c = ds.counts
                return (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif' }}>
                      <span style={{ color: '#3B6B2F' }}>{c.delivered} delivered</span>
                      <span style={{ color: '#4FA3A5' }}>{c.opened} opened</span>
                      <span style={{ color: '#4FA3A5' }}>{c.clicked} clicked</span>
                      {c.bounced > 0 && <span style={{ color: '#93333E' }}>{c.bounced} bounced</span>}
                      {c.complained > 0 && <span style={{ color: '#93333E' }}>{c.complained} complained</span>}
                      {c.pending > 0 && <span style={{ color: '#bbb' }}>{c.pending} pending</span>}
                      {c.deliveryFailed > 0 && <span style={{ color: '#93333E' }}>{c.deliveryFailed} delivery failed</span>}
                      {c.sendFailed > 0 && <span style={{ color: '#93333E' }}>{c.sendFailed} failed to send</span>}
                    </div>
                    {ds.recipients?.length > 0 && (
                      <div style={{ marginTop: '0.75rem', maxHeight: '260px', overflowY: 'auto', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '6px', background: '#fff' }}>
                        {ds.recipients.map((r, ri) => (
                          <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', borderBottom: ri < ds.recipients.length - 1 ? '0.5px solid rgba(0,0,0,0.04)' : 'none' }}>
                            <span style={{ color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || r.email}</span>
                            <span style={{ flexShrink: 0, color: DELIVERY_STATUS_META[r.status]?.color || '#999', letterSpacing: '0.04em' }}>
                              {DELIVERY_STATUS_META[r.status]?.label || r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
              {deliveryModalBroadcast.failed_recipients?.length > 0 && (
                <div style={{ padding: '0.75rem 0.9rem', background: 'rgba(147,51,62,0.04)', border: '0.5px solid rgba(147,51,62,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#93333E', fontFamily: 'var(--font-inter),sans-serif' }}>
                      {deliveryModalBroadcast.failed_recipients.length} failed recipient{deliveryModalBroadcast.failed_recipients.length !== 1 ? 's' : ''}
                    </div>
                    <button type="button" onClick={() => { setDeliveryModalId(null); retryFailed(deliveryModalBroadcast) }}
                      style={{ background: '#93333E', color: '#F5F1EC', border: 'none', borderRadius: '5px', padding: '3px 10px', cursor: 'pointer', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }}>
                      Retry these →
                    </button>
                  </div>
                  {deliveryModalBroadcast.failed_recipients.map((f, fi) => (
                    <div key={fi} style={{ fontSize: '12px', color: '#444', marginBottom: fi < deliveryModalBroadcast.failed_recipients.length - 1 ? '0.35rem' : 0, fontFamily: 'var(--font-inter),sans-serif' }}>
                      <span style={{ fontWeight: '500', color: '#1a1a1a' }}>{f.name || f.email}</span>
                      {f.name && <span style={{ color: '#999' }}> · {f.email}</span>}
                      <CopyBtn value={f.email} />
                      {f.reason && <span style={{ color: '#93333E' }}> — {f.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
