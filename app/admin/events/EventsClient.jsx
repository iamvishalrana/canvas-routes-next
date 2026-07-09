'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import {
  EVENT_TYPES, TRIP_LENGTH_OPTIONS, normalizeEventName,
  parseCarMakeModel,
  inp, sel, L, SelectWrap, PrimaryBtn, GhostBtn, DangerBtn, Err, ToggleSwitch, ConfirmDialog, KebabMenu, CopyBtn,
} from '../_components/shared'
import { WTET_EVENT_NAME } from '../../../lib/wtetRegistrationContent'
import { MONTREAL_TZ } from '../../../lib/mtlTime'
import WaiverViewerModal from '../_components/WaiverViewerModal'
import WtetClient from '../wtet/WtetClient'
import WtetAwardsClient from '../wtet-awards/WtetAwardsClient'
import CheckinStatusClient from '../_components/CheckinStatusClient'
import AwardsTallyClient from '../_components/AwardsTallyClient'

function isWtetRegEvent(eventName) {
  return eventName === WTET_EVENT_NAME || (eventName || '').toLowerCase().includes('eastern townships')
}

// ── RSVP helpers (previously in EventApplicationsClient) ──────────────────────

function StatusChip({ rsvp }) {
  if (!rsvp) return <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.06em' }}>—</span>
  if (rsvp.declined_at) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#93333E', border: '0.5px solid rgba(147,51,62,0.35)', padding: '2px 8px', background: 'rgba(147,51,62,0.05)', whiteSpace: 'nowrap' }}>Declined</span>
  )
  if (rsvp.confirmed_at) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.35)', padding: '2px 8px', background: 'rgba(59,107,47,0.07)', whiteSpace: 'nowrap' }}>✓ Confirmed</span>
  )
  const expired = new Date(rsvp.expires_at) <= new Date()
  if (expired) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', border: '0.5px solid rgba(0,0,0,0.12)', padding: '2px 8px', whiteSpace: 'nowrap' }}>Expired</span>
  )
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.4)', padding: '2px 8px', background: 'rgba(197,168,130,0.07)', whiteSpace: 'nowrap' }}>Awaiting RSVP</span>
  )
}

function RsvpAnswers({ answers }) {
  if (!answers) return null
  const ARRIVAL = { opening: 'Arrives at opening', first_hour: 'Arrives within first hour', later: 'Arrives later' }
  const chips = [
    answers.dietary && answers.dietary,
    answers.whatsapp != null && `WhatsApp: ${answers.whatsapp ? 'Yes' : 'No'}`,
    answers.passengers != null && (answers.passengers <= 1 ? 'Solo' : `${answers.passengers} people`),
    answers.bringing_guest != null && (answers.bringing_guest ? 'Bringing a guest' : 'No guest'),
    answers.car_paint && answers.car_paint,
    answers.car_mods  && `Mods: ${answers.car_mods}`,
    answers.arrival   && (ARRIVAL[answers.arrival] || answers.arrival),
  ].filter(Boolean)
  if (!chips.length) return null
  return (
    <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {chips.map((c, i) => (
        <span key={i} style={{ fontSize: '10px', color: '#666', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', border: '0.5px solid rgba(0,0,0,0.1)' }}>{c}</span>
      ))}
    </div>
  )
}

function exportRegistrantsPdf(eventName, registrants) {
  const ARRIVAL = { opening: 'Arrives at opening', first_hour: 'Arrives within first hour', later: 'Arrives later' }
  const fmtDate = iso => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: MONTREAL_TZ }) } catch { return '—' }
  }
  const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const cols = [
    { label: 'Name',        w: '13%' },
    { label: 'Email',       w: '16%' },
    { label: 'Status',      w: '8%'  },
    { label: 'Paid',        w: '6%'  },
    { label: 'Car',         w: '13%' },
    { label: 'Registered',  w: '9%'  },
    { label: 'RSVP',        w: '9%'  },
    { label: 'Dietary',     w: '9%'  },
    { label: 'Pax / Guest', w: '7%'  },
    { label: 'Arrival',     w: '10%' },
  ]

  const rows = registrants.map(r => {
    const a = r.rsvpAnswers || {}
    const pax = a.passengers != null
      ? (a.passengers <= 1 ? 'Solo' : `${a.passengers}`)
      : a.bringing_guest != null ? (a.bringing_guest ? 'Guest' : 'No guest') : '—'
    return [
      r.name || '—',
      r.email || '—',
      r.status || '—',
      r.amount ? `$${(r.amount / 100).toFixed(2)}` : '—',
      r.car || '—',
      fmtDate(r.registeredAt),
      r.confirmedAt ? fmtDate(r.confirmedAt) : (r.status === 'confirmed' ? 'Yes' : '—'),
      a.dietary || '—',
      pax,
      a.arrival ? (ARRIVAL[a.arrival] || a.arrival) : '—',
    ]
  })

  // Checkin section (WTET only — includes anyone with trip details, a signed
  // waiver, or a lunch pick, not just those who completed all three, so a
  // waiver signed without trip details (or vice versa) is never left out.
  const hasCheckin = registrants.some(r => r.wtetCheckin?.completed_at || r.wtetWaiver || r.wtetLunch?.length > 0)
  const checkinRows = hasCheckin ? registrants.filter(r => r.wtetCheckin?.completed_at || r.wtetWaiver || r.wtetLunch?.length > 0).map(r => {
    const ci = r.wtetCheckin || {}
    const pax = (ci.passengers_list || []).map(p => `${p.name} (${p.age})`).join(', ') || '—'
    const waiverStr = r.wtetWaiver ? `Signed by ${r.wtetWaiver.full_name} — ${fmtDate(r.wtetWaiver.signed_at)}` : 'Not signed'
    const lunchStr = r.wtetLunch?.length > 0
      ? r.wtetLunch.map(entry => `${entry.name ? `${entry.name}: ` : ''}${entry.dish_name}`).join(', ')
      : 'Not selected'
    return [r.name || '—', r.email || '—', ci.dietary || '—', ci.whatsapp || '—', pax, waiverStr, lunchStr, ci.completed_at ? fmtDate(ci.completed_at) : '—']
  }) : []

  const thStyle = 'padding:6px 8px;text-align:left;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#fff;background:#0F1E14;font-weight:600;white-space:nowrap;'
  const tdStyle = 'padding:6px 8px;font-size:10px;color:#1a1a1a;border-bottom:1px solid #e8e4df;vertical-align:top;word-break:break-word;'
  const tdAlt   = 'padding:6px 8px;font-size:10px;color:#1a1a1a;border-bottom:1px solid #e8e4df;background:#faf9f7;vertical-align:top;word-break:break-word;'

  const mainTable = `
    <table>
      <colgroup>${cols.map(c => `<col style="width:${c.w}">`).join('')}</colgroup>
      <thead><tr>${cols.map(c => `<th style="${thStyle}">${esc(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row, i) => `<tr>${row.map(cell => `<td style="${i % 2 ? tdAlt : tdStyle}">${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`

  const checkinTable = hasCheckin ? `
    <h2 style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin:28px 0 10px;font-weight:400;">Early Check-in Responses</h2>
    <table>
      <colgroup><col style="width:11%"><col style="width:14%"><col style="width:11%"><col style="width:10%"><col style="width:16%"><col style="width:16%"><col style="width:14%"><col style="width:8%"></colgroup>
      <thead><tr>${['Name','Email','Dietary','WhatsApp','Passengers','Waiver','Lunch','Completed'].map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr></thead>
      <tbody>${checkinRows.map((row, i) => `<tr>${row.map(cell => `<td style="${i % 2 ? tdAlt : tdStyle}">${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(eventName)} — Registrants</title>
<style>
  @page { size: A4 landscape; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #fff; color: #1a1a1a; }
  h1 { font-size: 17px; font-weight: 400; margin: 0 0 4px; color: #0F1E14; }
  .meta { font-size: 10px; color: #999; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<h1>${esc(eventName)}</h1>
<div class="meta">${registrants.length} registrant${registrants.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Exported ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: MONTREAL_TZ })}</div>
${mainTable}
${checkinTable}
</body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

function InviteActions({ app, ev, keyStr, inviting, inviteErr, inviteDone, sendInvite, declining, declineErr, onDecline, onUndecline }) {
  if (app.rsvp?.confirmed_at) {
    return <span style={{ fontSize: '10px', color: '#3B6B2F', letterSpacing: '0.06em' }}>✓ Confirmed</span>
  }
  const busy = inviting[keyStr] || declining?.[keyStr]
  const isDeclined = !!app.rsvp?.declined_at
  const isInvited = !!app.rsvp && !isDeclined
  if (isDeclined) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <GhostBtn small onClick={() => onUndecline(app.id, ev.name)} disabled={busy}>{busy ? '…' : 'Undo Decline'}</GhostBtn>
      {declineErr?.[keyStr] && <div style={{ fontSize: '10px', color: '#93333E' }}>{declineErr[keyStr]}</div>}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <GhostBtn small onClick={() => sendInvite(app, ev)} disabled={busy}>
          {busy ? '…' : isInvited ? 'Re-invite' : 'Approve'}
        </GhostBtn>
        <DangerBtn small onClick={() => onDecline(app.id, ev.name)} disabled={busy}>Decline</DangerBtn>
      </div>
      {inviteErr[keyStr] && <div style={{ fontSize: '10px', color: '#93333E' }}>{inviteErr[keyStr]}</div>}
      {inviteDone[keyStr] && !inviteErr[keyStr] && <div style={{ fontSize: '10px', color: '#3B6B2F' }}>Approved — invite sent.</div>}
      {declineErr?.[keyStr] && <div style={{ fontSize: '10px', color: '#93333E' }}>{declineErr[keyStr]}</div>}
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: active === t.id ? '#1a1a1a' : '#aaa',
            fontFamily: 'var(--font-inter),sans-serif',
            borderBottom: active === t.id ? '2px solid #1a1a1a' : '2px solid transparent',
            marginBottom: '-0.5px', transition: 'color 0.15s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Field info tooltips ───────────────────────────────────────────────────────
const FIELD_INFO = {
  name:                 'Shown on the event tile and popup on the homepage, and in the members events portal.',
  date:                 'The actual event date in YYYY-MM-DD format. Used for sorting, calendar invites, and auto-formatting the date when no Date Display is set.',
  type:                 'Categorises the event. Also controls which RSVP questions members see on the confirm-your-spot page — Route shows dietary / passengers / WhatsApp; all other types show guest / colour / mods / arrival time.',
  trip_length:          'Shown as its own tile on the homepage event card (e.g. "Overnight"). Leave as None to hide it — mainly useful for Route events.',
  awards_ineligible_names: 'Names typed here never appear as a candidate in any category, even though they can still vote themselves — e.g. exclude the event organizer.',
  date_display:         'Optional free-text override for how the date appears to members. Useful for multi-day events (e.g. "June 7–8, 2026") or month-only ranges. Leave blank to auto-format the Date field.',
  location:             'Shown on the tile, popup, and used to generate an embedded map preview. Use the full venue name or address for the best map match.',
  description:          'Short teaser shown on the event tile and in the popup. 1–2 sentences is ideal.',
  registration_url:     'If set, the event tile shows a "Registration Open · Click to Register" link pointing here instead of the member portal. Use this for public events with their own page (e.g. /cars-coffee-dad-jokes).',
  registration_opens:   'Date and time when members can start registering in the portal. Leave blank to disable member registration for this event entirely.',
  registration_closes:  'Optional cut-off after which the register button shows "Registration Closed." Leave blank to keep registration open indefinitely once it opens.',
  member_price:         'Price in CAD. Enter 0.00 for free events. Paid events trigger a Stripe checkout. Leave blank if this event uses an external registration URL instead.',
  capacity:             'Maximum confirmed spots. Enforced atomically at the database level to prevent overbooking. Leave blank for unlimited.',
  priority_window:      'Inner Circle members get exclusive early access until this date and time. After the window closes, all members can register. Leave blank to open to everyone at the same time.',
  photo:                'Shown in the popup when a visitor clicks the event tile on the homepage. Landscape images work best — at least 800 px wide. JPEG, PNG, or WebP.',
}

function InfoTip({ field }) {
  const [show, setShow] = useState(false)
  const text = FIELD_INFO[field]
  if (!text) return null
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '4px', verticalAlign: 'middle' }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.22)', borderRadius: '50%', width: '13px', height: '13px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', color: '#aaa', fontSize: '8px', fontWeight: '700', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}
      >i</button>
      {show && (
        <span style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#f0f0f0', fontSize: '11px', lineHeight: '1.55', padding: '7px 11px', borderRadius: '4px', width: '230px', whiteSpace: 'normal', zIndex: 500, pointerEvents: 'none', fontFamily: 'var(--font-inter),sans-serif', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', letterSpacing: '0' }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1a1a1a' }} />
        </span>
      )}
    </span>
  )
}

const EMPTY_FORM = { name: '', date: '', date_display: '', location: '', description: '', type: 'Route', trip_length: '', registration_url: '', registration_opens_at: '', registration_closes_at: '', capacity: '', member_price: '', priority_window_end: '', registration_visibility: 'members' }

// ── Main component ────────────────────────────────────────────────────────────

export default function EventsClient() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Create form
  const [form, setForm] = useState(EMPTY_FORM)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)

  // Edit form
  const [editing, setEditing] = useState(null)   // event id currently being edited
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [activeTab, setActiveTab] = useState({})  // { [eventId]: 'settings' | 'applications' }

  // Photo
  const [uploadingPhoto, setUploadingPhoto] = useState(null)
  const [photoError, setPhotoError] = useState({})

  // Registration toggle
  const [regToggleError, setRegToggleError] = useState({})
  const [regToggling, setRegToggling] = useState({})
  const [publicRegToggling, setPublicRegToggling] = useState({})

  // Reorder
  const [moving, setMoving] = useState(false)

  // Delete
  const [deleteEventConfirm, setDeleteEventConfirm] = useState(null)
  const [deleteEventError, setDeleteEventError] = useState({})

  // Registrants (members who paid)
  const [showRegistrants, setShowRegistrants] = useState(null)
  const [registrantsData, setRegistrantsData] = useState({})
  const [loadingRegistrants, setLoadingRegistrants] = useState(false)

  // Bulk email registrants compose
  const [regEmailOpen, setRegEmailOpen] = useState({})
  const [regEmailSubject, setRegEmailSubject] = useState({})
  const [regEmailBody, setRegEmailBody] = useState({})
  const [sendingRegEmail, setSendingRegEmail] = useState({})
  const [regEmailResult, setRegEmailResult] = useState({})

  // Individual registrant confirm email (key = `${eventId}::${email}`)
  const [sendingConfirmEmail, setSendingConfirmEmail] = useState({})
  const [confirmEmailResult, setConfirmEmailResult] = useState({})
  const [confirmEmailPending, setConfirmEmailPending] = useState(null) // key pending confirmation

  // Manual add registrant
  const [addRegOpen, setAddRegOpen] = useState({})
  const [addRegName, setAddRegName] = useState({})
  const [addRegEmail, setAddRegEmail] = useState({})
  const [addRegPayment, setAddRegPayment] = useState({})
  const [addingReg, setAddingReg] = useState({})
  const [regSort, setRegSort] = useState({}) // per-event registrant sort
  const [viewingWaiver, setViewingWaiver] = useState(null) // { name, email, waiver }
  const [addRegErr, setAddRegErr] = useState({})
  const [addRegSearch, setAddRegSearch] = useState({})
  const [addRegShowDrop, setAddRegShowDrop] = useState({})
  const [allContacts, setAllContacts] = useState([])
  const [contactsLoaded, setContactsLoaded] = useState(false)

  // RSVP answers expanded state (key = `${eventId}::${email}`)
  const [rsvpExpanded, setRsvpExpanded] = useState({})

  // Past events section
  const [pastOpen, setPastOpen] = useState(false)

  // Remove registrant (key = `${eventId}::${email}`)
  const [deleteRegConfirm, setDeleteRegConfirm] = useState(null)
  const [deletingReg, setDeletingReg] = useState({})
  const [deleteRegErr, setDeleteRegErr] = useState({})

  // Invite actions
  const [inviting, setInviting] = useState({})
  const [inviteErr, setInviteErr] = useState({})
  const [inviteDone, setInviteDone] = useState({})

  // Decline actions
  const [declining, setDeclining] = useState({})
  const [declineErr, setDeclineErr] = useState({})

  // Yes/no gates before anything is emailed to participants
  const [inviteConfirm, setInviteConfirm] = useState(null)     // { app, ev }
  const [declineConfirm, setDeclineConfirm] = useState(null)   // { appId, appName, eventName }
  const [addRegConfirm, setAddRegConfirm] = useState(null)     // eventId
  const [regEmailConfirm, setRegEmailConfirm] = useState(null) // eventId

  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); setIsNarrow(window.innerWidth < 1024) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Load both APIs in parallel and merge by event ID
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evRes, appRes] = await Promise.all([
        fetch('/api/admin/events'),
        fetch('/api/admin/event-applications'),
      ])
      const evData  = evRes.ok  ? await evRes.json().catch(() => [])  : []
      const appData = appRes.ok ? await appRes.json().catch(() => []) : []

      const appMap = new Map((Array.isArray(appData) ? appData : []).map(ev => [ev.id, ev]))
      const merged = (Array.isArray(evData) ? evData : []).map(ev => {
        const a = appMap.get(ev.id) || {}
        return {
          confirmed_count:    a.confirmed_count    || 0,
          invited_count:      a.invited_count      || 0,
          total_applications: a.total_applications || 0,
          applications:       a.applications       || [],
          ...ev,
        }
      })
      setItems(merged)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useRealtimeSync(['events', 'rsvp_tokens', 'applications'], load)

  // ── Actions ────────────────────────────────────────────────────────────────

  async function post(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.date.trim()) { setPostError('Name and date required.'); return }
    setPosting(true); setPostError(null)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPostError(data.error || 'Failed.'); return }
      setForm(EMPTY_FORM)
      load()
    } catch { setPostError('Network error. Please try again.') }
    finally { setPosting(false) }
  }

  function openEdit(item) {
    setEditing(item.id)
    setEditForm({
      name: item.name, date: item.date, date_display: item.date_display || '',
      location: item.location || '', description: item.description || '',
      type: item.type, trip_length: item.trip_length || '', registration_url: item.registration_url || '',
      registration_opens_at: item.registration_opens_at || '',
      registration_closes_at: item.registration_closes_at || '',
      capacity: item.capacity || '', member_price: item.member_price || null,
      priority_window_end: item.priority_window_end || '',
      registration_enabled: item.registration_enabled,
      public_registration_enabled: item.public_registration_enabled,
      registration_visibility: item.registration_visibility || 'members',
      checkin_enabled: item.checkin_enabled || false,
      checkin_sections: item.checkin_sections || [],
      checkin_max_passengers: item.checkin_max_passengers || 2,
      checkin_lunch_options: item.checkin_lunch_options || [],
      checkin_waiver_text: item.checkin_waiver_text || '',
      checkin_lunch_cutoff: item.checkin_lunch_cutoff || '',
      awards_enabled: item.awards_enabled || false,
      awards_categories: item.awards_categories || [],
      awards_ineligible_names: item.awards_ineligible_names || [],
    })
    setSaveError(null)
    setActiveTab(p => ({ ...p, [item.id]: p[item.id] || 'settings' }))
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    try {
      const res = await fetch(`/api/admin/events/${editing}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveError(d.error || 'Failed to save.'); return }
      setRegistrantsData(prev => { const next = { ...prev }; delete next[editing]; return next })
      setEditing(null)
      load()
    } catch { setSaveError('Network error. Please try again.') }
    finally { setSaving(false) }
  }

  async function moveEvent(id, direction) {
    if (moving) return
    const idx = items.findIndex(ev => ev.id === id)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= items.length) return
    const newItems = [...items]
    const a = { ...newItems[idx] }
    const b = { ...newItems[targetIdx] }
    const aOrder = a.sort_order ?? (idx + 1) * 10
    const bOrder = b.sort_order ?? (targetIdx + 1) * 10
    a.sort_order = bOrder; b.sort_order = aOrder
    newItems[idx] = b; newItems[targetIdx] = a
    setItems(newItems)
    setMoving(true)
    try {
      await Promise.all([
        fetch(`/api/admin/events/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: a.sort_order }) }),
        fetch(`/api/admin/events/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: b.sort_order }) }),
      ])
    } catch {
      setItems(prev => {
        const reverted = [...prev]
        const ri = reverted.findIndex(ev => ev.id === a.id)
        const rj = reverted.findIndex(ev => ev.id === b.id)
        if (ri >= 0) reverted[ri] = { ...a, sort_order: aOrder }
        if (rj >= 0) reverted[rj] = { ...b, sort_order: bOrder }
        return reverted
      })
    } finally {
      setMoving(false)
    }
  }

  async function uploadPhoto(eventId, file) {
    setUploadingPhoto(eventId); setPhotoError(p => ({ ...p, [eventId]: null }))
    try {
      const fd = new FormData(); fd.append('photo', file)
      const res = await fetch(`/api/admin/events/${eventId}/photo`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPhotoError(p => ({ ...p, [eventId]: data.error || 'Upload failed.' })); return }
      setItems(prev => prev.map(ev => ev.id === eventId ? { ...ev, photo_url: data.url } : ev))
    } catch { setPhotoError(p => ({ ...p, [eventId]: 'Network error — upload failed.' })) }
    finally { setUploadingPhoto(null) }
  }

  async function removePhoto(eventId) {
    setUploadingPhoto(eventId); setPhotoError(p => ({ ...p, [eventId]: null }))
    try {
      const res = await fetch(`/api/admin/events/${eventId}/photo`, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.map(ev => ev.id === eventId ? { ...ev, photo_url: null } : ev))
      else setPhotoError(p => ({ ...p, [eventId]: 'Could not remove photo.' }))
    } catch { setPhotoError(p => ({ ...p, [eventId]: 'Network error — could not remove photo.' })) }
    finally { setUploadingPhoto(null) }
  }

  async function setRegEnabled(id, value) {
    setRegToggleError(p => ({ ...p, [id]: null }))
    setRegToggling(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_enabled: value }),
      })
      if (res.ok) {
        setItems(prev => prev.map(ev => ev.id === id ? { ...ev, registration_enabled: value } : ev))
      } else {
        const d = await res.json().catch(() => ({}))
        setRegToggleError(p => ({ ...p, [id]: d.error || 'Could not update registration.' }))
      }
    } catch { setRegToggleError(p => ({ ...p, [id]: 'Network error.' })) }
    finally { setRegToggling(p => ({ ...p, [id]: false })) }
  }

  async function setPublicRegEnabled(id, value) {
    setRegToggleError(p => ({ ...p, [id]: null }))
    setPublicRegToggling(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_registration_enabled: value }),
      })
      if (res.ok) {
        setItems(prev => prev.map(ev => ev.id === id ? { ...ev, public_registration_enabled: value } : ev))
      } else {
        const d = await res.json().catch(() => ({}))
        setRegToggleError(p => ({ ...p, [id]: d.error || 'Could not update registration.' }))
      }
    } catch { setRegToggleError(p => ({ ...p, [id]: 'Network error.' })) }
    finally { setPublicRegToggling(p => ({ ...p, [id]: false })) }
  }

  async function del(id) {
    setDeleteEventError(p => ({ ...p, [id]: null }))
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
      if (!res.ok) { setDeleteEventError(p => ({ ...p, [id]: 'Failed to delete event.' })); return }
      setDeleteEventConfirm(null)
      load()
    } catch { setDeleteEventError(p => ({ ...p, [id]: 'Network error.' })) }
  }

  async function ensureContactsLoaded() {
    if (contactsLoaded) return
    try {
      const res = await fetch('/api/admin/contacts')
      if (res.ok) {
        const data = await res.json()
        setAllContacts((Array.isArray(data) ? data : []).map(c => ({ name: c.name || '', email: c.email || '' })).filter(c => c.email))
        setContactsLoaded(true)
      }
    } catch {}
  }

  async function addRegistrant(eventId) {
    const name = (addRegName[eventId] || '').trim()
    const email = (addRegEmail[eventId] || '').trim()
    const payment = addRegPayment[eventId] || 'none'
    if (!name || !email) return
    setAddingReg(p => ({ ...p, [eventId]: true }))
    setAddRegErr(p => ({ ...p, [eventId]: null }))
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, payment }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setAddRegErr(p => ({ ...p, [eventId]: d.error || 'Failed.' })); return }
      setAddRegName(p => ({ ...p, [eventId]: '' }))
      setAddRegEmail(p => ({ ...p, [eventId]: '' }))
      setAddRegPayment(p => ({ ...p, [eventId]: '' }))
      setAddRegOpen(p => ({ ...p, [eventId]: false }))
      setAddRegErr(p => ({ ...p, [eventId]: null }))
      // Force-reload the registrants panel (stays open, shows updated list)
      const item = items.find(i => i.id === eventId)
      if (item) toggleRegistrants(eventId, item.name, { forceReload: true, eventType: item.type, eventPrice: item.member_price })
    } catch {
      setAddRegErr(p => ({ ...p, [eventId]: 'Network error.' }))
    } finally {
      setAddingReg(p => ({ ...p, [eventId]: false }))
    }
  }

  async function deleteRegistrant(eventId, email) {
    const key = `${eventId}::${email}`
    setDeletingReg(p => ({ ...p, [key]: true }))
    setDeleteRegErr(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setDeleteRegErr(p => ({ ...p, [key]: d.error || 'Failed to remove.' })); return }
      setDeleteRegConfirm(null)
      setRegistrantsData(prev => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter(r => r.email !== email),
      }))
    } catch {
      setDeleteRegErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setDeletingReg(p => ({ ...p, [key]: false }))
    }
  }

  async function sendConfirmEmail(eventId, r) {
    const key = `${eventId}::${r.email}`
    setSendingConfirmEmail(p => ({ ...p, [key]: true }))
    setConfirmEmailResult(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrants/confirm-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, name: r.name, isResend: !!r.inviteSent }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setConfirmEmailResult(p => ({ ...p, [key]: { error: d.error || 'Send failed.' } })); return }
      setConfirmEmailResult(p => ({ ...p, [key]: { sent: true } }))
    } catch {
      setConfirmEmailResult(p => ({ ...p, [key]: { error: 'Network error.' } }))
    } finally {
      setSendingConfirmEmail(p => ({ ...p, [key]: false }))
    }
  }

  async function sendEmailToRegistrants(eventId) {
    const registrants = registrantsData[eventId] || []
    const emails = [...new Set(registrants.map(r => r.email).filter(e => e && e !== '—'))]
    if (!emails.length) return
    const subject = (regEmailSubject[eventId] || '').trim()
    const body = (regEmailBody[eventId] || '').trim()
    if (!subject || !body) return
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;max-width:600px;">' +
      body.split('\n').map(l => l.trim()
        ? `<p style="margin:0 0 14px;">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
        : ''
      ).join('') +
      '<!-- UNSUBSCRIBE_FOOTER --></div>'
    setSendingRegEmail(p => ({ ...p, [eventId]: true }))
    setRegEmailResult(p => ({ ...p, [eventId]: null }))
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, html, body_html: body, audience: 'specific_emails', specificEmails: emails }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setRegEmailResult(p => ({ ...p, [eventId]: { error: d.error || 'Send failed.' } })); return }
      setRegEmailResult(p => ({ ...p, [eventId]: { sent: d.sent, failed: d.failed } }))
      setRegEmailSubject(p => ({ ...p, [eventId]: '' }))
      setRegEmailBody(p => ({ ...p, [eventId]: '' }))
      setRegEmailOpen(p => ({ ...p, [eventId]: false }))
    } catch {
      setRegEmailResult(p => ({ ...p, [eventId]: { error: 'Network error.' } }))
    } finally {
      setSendingRegEmail(p => ({ ...p, [eventId]: false }))
    }
  }

  async function declineApplication(appId, eventName) {
    const key = `${appId}-${eventName}`
    setDeclining(p => ({ ...p, [key]: true }))
    setDeclineErr(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/event-applications/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, eventName }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setDeclineErr(p => ({ ...p, [key]: d.error || 'Failed.' })); return }
      load()
    } catch {
      setDeclineErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setDeclining(p => ({ ...p, [key]: false }))
    }
  }

  async function undeclineApplication(appId, eventName) {
    const key = `${appId}-${eventName}`
    setDeclining(p => ({ ...p, [key]: true }))
    setDeclineErr(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/event-applications/decline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, eventName }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setDeclineErr(p => ({ ...p, [key]: d.error || 'Failed.' })); return }
      load()
    } catch {
      setDeclineErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setDeclining(p => ({ ...p, [key]: false }))
    }
  }

  async function toggleRegistrants(eventId, eventName, { forceReload = false, eventType = '', eventPrice = null } = {}) {
    if (!forceReload && showRegistrants === eventId) { setShowRegistrants(null); setConfirmEmailPending(null); return }
    setShowRegistrants(eventId)
    if (!forceReload && registrantsData[eventId]) return
    setLoadingRegistrants(true)
    // Road trips with Stripe payment require an authorized or captured hold to count as registered.
    // Don't require eventPrice > 0 — WTET uses a public page with its own pricing, not member_price.
    const isPaidRoadTrip = eventType === 'Road Trip' || eventType === 'Route'
    try {
      const [regRes, cRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/registrants`),
        fetch('/api/admin/contacts'),
      ])
      const regData  = regRes.ok ? await regRes.json() : []
      const contacts = cRes.ok  ? await cRes.json()   : []
      const evBase = s => normalizeEventName(s).split(/\s[—–]\s/)[0].trim()
      const contactByEmail = Object.fromEntries(
        (Array.isArray(contacts) ? contacts : []).map(c => [(c.email || '').toLowerCase(), c])
      )
      const newRegs = (Array.isArray(regData) ? regData : []).map(r => {
        const email = r.members?.email || r.email || '—'
        const contact = contactByEmail[email.toLowerCase()] || {}
        const { make, model } = parseCarMakeModel(contact.car_model)
        return {
          name: r.members?.name || r.name || '—',
          email,
          type: 'Member',
          status: r.stripe_payment_status,
          amount: r.amount_paid,
          registeredAt: r.registered_at || null,
          car: [contact.car_year, make, model].filter(Boolean).join(' ') || null,
          href: `/admin/members?q=${encodeURIComponent(email)}`,
        }
      })
      const contactRegs = (Array.isArray(contacts) ? contacts : [])
        .filter(c => {
          const matchedReg = (c.registrations || []).find(r => {
            const norm = normalizeEventName(r.event)
            return norm === eventName || evBase(norm) === evBase(eventName)
          })
          if (!matchedReg) return false
          // Admin-manually-added registrants bypass the payment filter — they have no Stripe hold
          if (matchedReg.source === 'admin_manual') return true
          // For paid road trips, only show contacts whose Stripe payment is authorized or captured
          if (isPaidRoadTrip && c.stripe_payment_type?.startsWith('road_trip_')) {
            return ['authorized', 'paid'].includes(c.stripe_payment_status)
          }
          return true
        })
        .map(c => {
          const reg = (c.registrations || []).find(r => evBase(r.event) === evBase(eventName))
          const rsvpToken = (c.rsvp_history || []).find(t => evBase(t.event_name) === evBase(eventName))
          const isConfirmed = !!(rsvpToken?.confirmed_at || reg?.rsvp_confirmed)
          const { make, model } = parseCarMakeModel(c.car_model)
          // For paid road trip contacts, use the real Stripe payment status and amount
          const isRoadTripPayment = c.stripe_payment_type?.startsWith('road_trip_')
          const isTrackedPayment = isRoadTripPayment || c.stripe_payment_type?.startsWith('external_')
          const paymentStatus = isTrackedPayment ? (c.stripe_payment_status || 'registered') : null
          return {
            name: c.name || '—',
            email: c.email || '—',
            type: c.is_invited ? 'Member' : 'Public',
            status: paymentStatus ?? (isConfirmed ? 'confirmed' : 'registered'),
            amount: isRoadTripPayment ? (c.stripe_amount_paid || null) : null,  // external payments have no stored amount
            registeredAt: reg?.registered_at || null,
            rsvpAnswers: rsvpToken?.answers || null,
            confirmedAt: rsvpToken?.confirmed_at || null,
            inviteSent: !!rsvpToken,
            car: [c.car_year, make, model].filter(Boolean).join(' ') || null,
            href: `/admin/contacts?q=${encodeURIComponent(c.email || c.name || '')}`,
            wtetCheckin: c.wtet_checkin || null,
            wtetWaiver: c.wtet_waiver || null,
            wtetLunch: c.wtet_lunch || null,
          }
        })
      // Merge: member-portal rows have payment data; contact rows have RSVP/checkin data.
      // Build a map from contactRegs first, then merge RSVP fields into matching member-portal rows.
      const contactByEmailMap = {}
      for (const c of contactRegs) {
        const k = (c.email || '').toLowerCase()
        if (k) contactByEmailMap[k] = c
      }
      const mergedRegs = newRegs.map(r => {
        const k = (r.email || '').toLowerCase()
        const contact = contactByEmailMap[k]
        if (contact) {
          delete contactByEmailMap[k] // mark as merged so we don't add it again below
          return { ...r, rsvpAnswers: contact.rsvpAnswers, confirmedAt: contact.confirmedAt, inviteSent: contact.inviteSent, wtetCheckin: contact.wtetCheckin, wtetWaiver: contact.wtetWaiver, wtetLunch: contact.wtetLunch, status: contact.confirmedAt ? 'confirmed' : r.status }
        }
        return r
      })
      const combined = [...mergedRegs, ...Object.values(contactByEmailMap)]
      setRegistrantsData(prev => ({ ...prev, [eventId]: combined }))
    } catch {
      setRegistrantsData(prev => ({ ...prev, [eventId]: [] }))
    } finally {
      setLoadingRegistrants(false)
    }
  }

  async function sendInvite(app, ev) {
    const key = `${app.id}-${ev.name}`
    setInviting(p => ({ ...p, [key]: true }))
    setInviteErr(p => ({ ...p, [key]: null }))
    setInviteDone(p => ({ ...p, [key]: false }))
    try {
      const res = await fetch('/api/admin/event-applications/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: app.id, eventName: ev.name, eventDate: ev.date, eventLocation: ev.location, isResend: !!app.rsvp }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setInviteErr(p => ({ ...p, [key]: d.error || 'Failed to send.' })); return }
      setInviteDone(p => ({ ...p, [key]: true }))
      load()
    } catch {
      setInviteErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setInviting(p => ({ ...p, [key]: false }))
    }
  }

  function sortedRegistrants(eventId) {
    const rows = registrantsData[eventId] || []
    const sort = regSort[eventId] || 'default'
    if (sort === 'default') return rows
    const byName = (a, b) => (a.name || '').localeCompare(b.name || '')
    const time = r => r.registeredAt ? new Date(r.registeredAt).getTime() : 0
    const sorted = [...rows]
    if (sort === 'name_az')            sorted.sort(byName)
    else if (sort === 'name_za')       sorted.sort((a, b) => byName(b, a))
    else if (sort === 'newest')        sorted.sort((a, b) => time(b) - time(a))
    else if (sort === 'oldest')        sorted.sort((a, b) => time(a) - time(b))
    else if (sort === 'status')        sorted.sort((a, b) => (a.status || '').localeCompare(b.status || '') || byName(a, b))
    else if (sort === 'amount')        sorted.sort((a, b) => (b.amount || 0) - (a.amount || 0))
    else if (sort === 'members_first') sorted.sort((a, b) => ((a.type === 'Member' ? 0 : 1) - (b.type === 'Member' ? 0 : 1)) || byName(a, b))
    return sorted
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isEventPast = item => !!item.date && new Date(item.date) < today
  const displayItems = [...items.filter(i => !isEventPast(i)), ...items.filter(i => isEventPast(i))]
  const pastCount = displayItems.filter(isEventPast).length
  const nonPastCount = displayItems.length - pastCount

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Events</h1>
      </div>

      {/* ── New event form ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>New Event</div>
        <form onSubmit={post}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 0.9fr 140px 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div><L>Event Name *<InfoTip field="name" /></L><input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Into the Laurentians" maxLength={200} /></div>
            <div><L>Date *<InfoTip field="date" /></L><input style={inp} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><L>Type *<InfoTip field="type" /></L><SelectWrap value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} /></div>
            <div><L>Trip Length<InfoTip field="trip_length" /></L>
              <select style={sel} value={form.trip_length} onChange={e => setForm(p => ({ ...p, trip_length: e.target.value }))}>
                <option value="">None</option>
                {TRIP_LENGTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}><L>Date Display<InfoTip field="date_display" /></L><input style={inp} value={form.date_display} onChange={e => setForm(p => ({ ...p, date_display: e.target.value }))} placeholder="June 2026" /></div>
          <div style={{ marginBottom: '0.75rem' }}><L>Location<InfoTip field="location" /></L><input style={inp} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Montreal → Mont-Tremblant" /></div>
          <div style={{ marginBottom: '0.75rem' }}><L>Description<InfoTip field="description" /></L><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div style={{ marginBottom: '0.75rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
            <L>Registration Visibility</L>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { val: 'members', label: 'Members only', desc: 'Visible in the portal only' },
                { val: 'public',  label: 'Members + Public', desc: 'Also open on the public page' },
              ].map(({ val, label, desc }) => {
                const sel = form.registration_visibility === val
                return (
                  <button key={val} type="button"
                    onClick={() => setForm(p => ({ ...p, registration_visibility: val }))}
                    style={{ padding: '0.65rem 1rem', border: `1px solid ${sel ? '#0F1E14' : 'rgba(0,0,0,0.14)'}`, background: sel ? 'rgba(15,30,20,0.05)' : '#fff', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: sel ? '#0F1E14' : '#555', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '10px', color: '#aaa' }}>{desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>{form.registration_visibility === 'public' ? 'Public Registration URL' : 'Member Registration URL'}<InfoTip field="registration_url" /></L>
            <input style={inp} value={form.registration_url} onChange={e => setForm(p => ({ ...p, registration_url: e.target.value }))}
              placeholder={form.registration_visibility === 'public' ? 'https://canvasroutes.com/wtet' : '/members/events/wtet'} />
          </div>
          <div style={{ marginBottom: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem' }}>Member Registration</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div><L>Registration Opens<InfoTip field="registration_opens" /></L><input style={inp} type="datetime-local" value={form.registration_opens_at} onChange={e => setForm(p => ({ ...p, registration_opens_at: e.target.value }))} /></div>
              <div><L>Registration Closes<InfoTip field="registration_closes" /></L><input style={inp} type="datetime-local" value={form.registration_closes_at} onChange={e => setForm(p => ({ ...p, registration_closes_at: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div><L>Member Price (CAD)<InfoTip field="member_price" /></L><input style={inp} type="number" min="0" step="0.01" value={form.member_price ? (form.member_price / 100).toFixed(2) : ''} onChange={e => { const cents = Math.round(parseFloat(e.target.value) * 100); setForm(p => ({ ...p, member_price: e.target.value && !isNaN(cents) ? cents : '' })) }} placeholder="0.00" /></div>
              <div><L>Capacity<InfoTip field="capacity" /></L><input style={inp} type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="Unlimited" /></div>
              <div><L>IC Priority Window Ends<InfoTip field="priority_window" /></L><input style={inp} type="datetime-local" value={form.priority_window_end} onChange={e => setForm(p => ({ ...p, priority_window_end: e.target.value }))} /></div>
            </div>
          </div>
          <PrimaryBtn type="submit" disabled={posting}>{posting ? 'Adding…' : 'Add Event'}</PrimaryBtn>
          <Err msg={postError} />
        </form>
      </div>

      {/* ── Event list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No events yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayItems.map((item, displayIdx) => {
            const isPast = isEventPast(item)
            const isFirstPast = isPast && (displayIdx === 0 || !isEventPast(displayItems[displayIdx - 1]))
            const idx = items.findIndex(ev => ev.id === item.id)
            const isEditing = editing === item.id
            const tab = activeTab[item.id] || 'settings'
            const spotsLeft = item.capacity ? item.capacity - (item.confirmed_count || 0) : null

            return (
              <div key={item.id} style={{ display: 'contents' }}>
                {isFirstPast && (
                  <button
                    onClick={() => setPastOpen(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1.25rem', background: 'rgba(0,0,0,0.02)', border: '0.5px solid rgba(0,0,0,0.08)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-inter),sans-serif' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" style={{ transform: pastOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                    <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888' }}>Past Events</span>
                    <span style={{ fontSize: '10px', color: '#bbb' }}>({pastCount})</span>
                  </button>
                )}
                {(!isPast || pastOpen) && <div style={{ background: isPast ? '#fafaf8' : '#fff', border: '0.5px solid rgba(0,0,0,0.1)', opacity: isPast ? 0.85 : 1 }}>

                {/* ── Event header (always visible) ───────────────────────── */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1a1a1a' }}>{item.name}</span>
                      <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.45)', padding: '2px 7px' }}>{item.type}</span>
                      {item.trip_length && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.35)', padding: '2px 7px' }}>{item.trip_length}</span>}
                      {item.registration_opens_at && (() => {
                        const now = new Date()
                        const opens = new Date(item.registration_opens_at)
                        const closes = item.registration_closes_at ? new Date(item.registration_closes_at) : null
                        const isOpen = now >= opens && (!closes || now <= closes)
                        const label = isOpen ? 'Reg Open' : now < opens ? `Opens ${opens.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: MONTREAL_TZ })}` : 'Reg Closed'
                        return <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isOpen ? '#3B6B2F' : '#888', border: `0.5px solid ${isOpen ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '2px 7px', background: isOpen ? 'rgba(59,107,47,0.04)' : 'transparent' }}>{label}{item.member_price ? ` · $${(item.member_price / 100).toFixed(2)}` : ''}{item.capacity ? ` · ${item.capacity} spots` : ''}</span>
                      })()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#c5a882', fontWeight: '500', marginBottom: '0.2rem' }}>{item.date_display || item.date}</div>
                    {item.location && <div style={{ fontSize: '12px', color: '#888' }}>{item.location}</div>}

                    {/* Application stats */}
                    {(item.total_applications > 0 || item.confirmed_count > 0) && (
                      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.6rem' }}>
                        {[
                          { label: 'Applied',    value: item.total_applications, color: '#1a1a1a' },
                          { label: 'Invited',    value: item.invited_count,       color: '#8A6535' },
                          { label: 'Confirmed',  value: item.confirmed_count,     color: '#3B6B2F' },
                          spotsLeft !== null && { label: 'Spots left', value: Math.max(0, spotsLeft), color: spotsLeft <= 3 ? '#93333E' : '#888' },
                        ].filter(Boolean).map(s => (
                          <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', marginTop: '2px' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {isMobile ? (
                    <KebabMenu items={[
                      { label: 'Move up', onClick: () => moveEvent(item.id, 'up'), disabled: displayIdx === 0 || isPast || moving },
                      { label: 'Move down', onClick: () => moveEvent(item.id, 'down'), disabled: displayIdx >= nonPastCount - 1 || isPast || moving },
                      { label: showRegistrants === item.id ? 'Hide Registrants' : `Registrants${registrantsData[item.id] ? ` (${registrantsData[item.id].length})` : ''}`, onClick: () => toggleRegistrants(item.id, item.name, { eventType: item.type, eventPrice: item.member_price }) },
                      { label: isEditing ? 'Close' : 'Edit', onClick: () => isEditing ? setEditing(null) : openEdit(item) },
                      { label: 'Delete', danger: true, onClick: () => setDeleteEventConfirm(item.id) },
                    ]} />
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        <button onClick={() => moveEvent(item.id, 'up')} disabled={displayIdx === 0 || isPast || moving} title="Move up" style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', cursor: displayIdx === 0 || isPast || moving ? 'not-allowed' : 'pointer', opacity: displayIdx === 0 || isPast || moving ? 0.3 : 1, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button onClick={() => moveEvent(item.id, 'down')} disabled={displayIdx >= nonPastCount - 1 || isPast || moving} title="Move down" style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', cursor: displayIdx >= nonPastCount - 1 || isPast || moving ? 'not-allowed' : 'pointer', opacity: displayIdx >= nonPastCount - 1 || isPast || moving ? 0.3 : 1, padding: '3px 6px', display: 'flex', alignItems: 'center' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ToggleSwitch
                            checked={!!item.registration_enabled}
                            onChange={v => setRegEnabled(item.id, v)}
                            disabled={regToggling[item.id]}
                            label="Member registration"
                          />
                          <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: item.registration_enabled ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter)' }}>
                            Members
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ToggleSwitch
                            checked={item.public_registration_enabled !== false}
                            onChange={v => setPublicRegEnabled(item.id, v)}
                            disabled={publicRegToggling[item.id]}
                            label="Public registration"
                          />
                          <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: item.public_registration_enabled !== false ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter)' }}>
                            Public
                          </span>
                        </div>
                      </div>
                      {regToggleError[item.id] && <Err msg={regToggleError[item.id]} />}
                      <GhostBtn small onClick={() => toggleRegistrants(item.id, item.name, { eventType: item.type, eventPrice: item.member_price })}>
                        {showRegistrants === item.id ? 'Hide Registrants' : `Registrants${registrantsData[item.id] ? ` (${registrantsData[item.id].length})` : ''}`}
                      </GhostBtn>
                      <GhostBtn small onClick={() => isEditing ? setEditing(null) : openEdit(item)}>
                        {isEditing ? 'Close' : 'Edit'}
                      </GhostBtn>
                      <DangerBtn small onClick={() => setDeleteEventConfirm(item.id)}>Delete</DangerBtn>
                    </div>
                  )}
                </div>

                {/* Registration toggles — own row on mobile so they don't wrap awkwardly next to the kebab */}
                {isMobile && (
                  <div style={{ padding: '0 1.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ToggleSwitch
                        checked={!!item.registration_enabled}
                        onChange={v => setRegEnabled(item.id, v)}
                        disabled={regToggling[item.id]}
                        label="Member registration"
                      />
                      <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: item.registration_enabled ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter)' }}>
                        Members
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ToggleSwitch
                        checked={item.public_registration_enabled !== false}
                        onChange={v => setPublicRegEnabled(item.id, v)}
                        disabled={publicRegToggling[item.id]}
                        label="Public registration"
                      />
                      <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: item.public_registration_enabled !== false ? '#3B6B2F' : '#bbb', fontFamily: 'var(--font-inter)' }}>
                        Public
                      </span>
                    </div>
                    {regToggleError[item.id] && <Err msg={regToggleError[item.id]} />}
                  </div>
                )}

                {/* Delete confirm */}
                {deleteEventConfirm === item.id && (
                  <div style={{ padding: '0.75rem 1.5rem', borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(147,51,62,0.03)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#93333E' }}>Delete this event?</span>
                    <GhostBtn small onClick={() => del(item.id)}>Confirm</GhostBtn>
                    <GhostBtn small onClick={() => { setDeleteEventConfirm(null); setDeleteEventError(p => ({ ...p, [item.id]: null })) }}>Cancel</GhostBtn>
                    {deleteEventError[item.id] && <Err msg={deleteEventError[item.id]} />}
                  </div>
                )}

                {/* ── Standalone registrants panel ────────────────────────── */}
                {showRegistrants === item.id && (
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)', padding: '1.25rem 1.5rem' }}>
                    {loadingRegistrants && !registrantsData[item.id] ? (
                      <div style={{ fontSize: '13px', color: '#ccc' }}>Loading…</div>
                    ) : (
                      <>
                        {/* Header row: count + action buttons — always visible */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {(registrantsData[item.id] || []).length} registrant{(registrantsData[item.id] || []).length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {regEmailResult[item.id]?.sent != null && !regEmailOpen[item.id] && (
                              <span style={{ fontSize: '11px', color: '#3B6B2F' }}>Sent to {regEmailResult[item.id].sent}{regEmailResult[item.id].failed > 0 ? `, ${regEmailResult[item.id].failed} failed` : ''}.</span>
                            )}
                            {(registrantsData[item.id] || []).length > 1 && (
                              <select
                                value={regSort[item.id] || 'default'}
                                onChange={e => setRegSort(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '10px', letterSpacing: '0.04em', fontFamily: 'var(--font-inter),sans-serif', padding: '4px 6px', cursor: 'pointer', color: '#555', outline: 'none', height: '26px', appearance: 'none', WebkitAppearance: 'none' }}
                              >
                                <option value="default">Sort: Registration order</option>
                                <option value="name_az">Name A–Z</option>
                                <option value="name_za">Name Z–A</option>
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                                <option value="status">Status</option>
                                <option value="amount">Amount paid</option>
                                <option value="members_first">Members first</option>
                              </select>
                            )}
                            <GhostBtn small onClick={() => { setAddRegOpen(p => ({ ...p, [item.id]: !p[item.id] })); setAddRegErr(p => ({ ...p, [item.id]: null })); setAddRegSearch(p => ({ ...p, [item.id]: '' })); ensureContactsLoaded() }}>
                              {addRegOpen[item.id] ? 'Cancel' : '+ Add'}
                            </GhostBtn>
                            {(registrantsData[item.id] || []).length > 0 && (
                              <GhostBtn small onClick={() => { setRegEmailOpen(p => ({ ...p, [item.id]: !p[item.id] })); setRegEmailResult(p => ({ ...p, [item.id]: null })) }}>
                                {regEmailOpen[item.id] ? 'Cancel' : 'Email All'}
                              </GhostBtn>
                            )}
                            {(registrantsData[item.id] || []).length > 0 && (
                              <GhostBtn small onClick={() => exportRegistrantsPdf(item.name, sortedRegistrants(item.id))}>
                                Export PDF
                              </GhostBtn>
                            )}
                          </div>
                        </div>

                        {/* Manual add registrant form */}
                        {addRegOpen[item.id] && (
                          <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', marginBottom: '0.65rem', fontFamily: 'var(--font-inter)' }}>
                              Add registrant — invite email sent automatically
                            </div>

                            {/* Contact search */}
                            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                              <input
                                placeholder="Search existing contacts by name or email…"
                                value={addRegSearch[item.id] || ''}
                                onChange={e => { setAddRegSearch(p => ({ ...p, [item.id]: e.target.value })); setAddRegShowDrop(p => ({ ...p, [item.id]: true })) }}
                                onFocus={() => setAddRegShowDrop(p => ({ ...p, [item.id]: true }))}
                                onBlur={() => setTimeout(() => setAddRegShowDrop(p => ({ ...p, [item.id]: false })), 150)}
                                style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                              {addRegShowDrop[item.id] && (addRegSearch[item.id] || '').trim().length >= 1 && (() => {
                                const q = (addRegSearch[item.id] || '').toLowerCase()
                                const matches = allContacts.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 8)
                                return (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.14)', borderTop: 'none', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                    {matches.length === 0 ? (
                                      <div style={{ padding: '0.6rem 0.8rem', fontSize: '12px', color: '#bbb', fontFamily: 'var(--font-inter)' }}>No matching contacts — fill in manually below.</div>
                                    ) : matches.map((c, ci) => (
                                      <div
                                        key={ci}
                                        onMouseDown={() => {
                                          setAddRegName(p => ({ ...p, [item.id]: c.name }))
                                          setAddRegEmail(p => ({ ...p, [item.id]: c.email }))
                                          setAddRegSearch(p => ({ ...p, [item.id]: '' }))
                                          setAddRegShowDrop(p => ({ ...p, [item.id]: false }))
                                        }}
                                        style={{ padding: '0.55rem 0.8rem', cursor: 'pointer', borderBottom: ci < matches.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <div style={{ fontSize: '13px', color: '#1a1a1a', fontFamily: 'var(--font-inter)' }}>{c.name || '—'}</div>
                                        <div style={{ fontSize: '11px', color: '#888', fontFamily: 'var(--font-inter)' }}>{c.email}</div>
                                      </div>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Name + email fields (pre-filled from search or typed manually) */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                              <input
                                placeholder="Name"
                                value={addRegName[item.id] || ''}
                                onChange={e => setAddRegName(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ flex: '1 1 140px', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                              <input
                                placeholder="Email"
                                type="email"
                                value={addRegEmail[item.id] || ''}
                                onChange={e => setAddRegEmail(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ flex: '1 1 180px', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                              <select
                                value={addRegPayment[item.id] || 'none'}
                                onChange={e => setAddRegPayment(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ flex: '1 1 140px', padding: '0.6rem 0.8rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              >
                                <option value="none">No payment</option>
                                <option value="cash">Cash</option>
                                <option value="etransfer">E-Transfer</option>
                                <option value="comped">Comped</option>
                              </select>
                              <PrimaryBtn
                                disabled={addingReg[item.id] || !addRegName[item.id]?.trim() || !addRegEmail[item.id]?.trim() || !(addRegEmail[item.id] || '').includes('@')}
                                onClick={() => setAddRegConfirm(item.id)}
                              >
                                {addingReg[item.id] ? 'Adding…' : 'Add'}
                              </PrimaryBtn>
                            </div>
                            {addRegErr[item.id] && <div style={{ fontSize: '12px', color: '#93333E', marginTop: '0.4rem' }}>{addRegErr[item.id]}</div>}
                          </div>
                        )}

                        {/* Email compose form */}
                        {regEmailOpen[item.id] && (
                          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <input
                                placeholder="Subject"
                                value={regEmailSubject[item.id] || ''}
                                onChange={e => setRegEmailSubject(p => ({ ...p, [item.id]: e.target.value }))}
                                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </div>
                            <div style={{ marginBottom: '0.75rem' }}>
                              <textarea
                                placeholder={'Message\n\nUse {{name}} for personalization.'}
                                value={regEmailBody[item.id] || ''}
                                onChange={e => setRegEmailBody(p => ({ ...p, [item.id]: e.target.value }))}
                                rows={5}
                                style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)', background: '#fff', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <PrimaryBtn
                                disabled={sendingRegEmail[item.id] || !regEmailSubject[item.id]?.trim() || !regEmailBody[item.id]?.trim()}
                                onClick={() => setRegEmailConfirm(item.id)}
                              >
                                {sendingRegEmail[item.id]
                                  ? 'Sending…'
                                  : `Send to ${[...new Set((registrantsData[item.id] || []).map(r => r.email).filter(e => e && e !== '—'))].length}`}
                              </PrimaryBtn>
                              {regEmailResult[item.id]?.error && <span style={{ fontSize: '12px', color: '#93333E' }}>{regEmailResult[item.id].error}</span>}
                            </div>
                          </div>
                        )}

                        {/* Empty state — shown after add form, so add is still accessible */}
                        {(!registrantsData[item.id] || registrantsData[item.id].length === 0) && !addRegOpen[item.id] && (
                          <div style={{ fontSize: '13px', color: '#ccc', paddingTop: '0.5rem' }}>No registrants on record.</div>
                        )}

                        {/* Registrants table */}
                        {(registrantsData[item.id] || []).length > 0 && <div style={{ overflowX: 'auto' }}>
                          <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', minWidth: isNarrow ? 'unset' : '680px' }}>
                            {!isMobile && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.8fr 70px 70px 140px 100px', padding: '0.5rem 0.85rem', background: '#fafaf9', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                                {['Name', 'Email', 'Type', 'Status', 'Paid', '', ''].map((h, i) => (
                                  <div key={i} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                                ))}
                              </div>
                            )}
                            {sortedRegistrants(item.id).map((r, ri) => {
                              const indivKey = `${item.id}::${r.email}`
                              const sending = !!sendingConfirmEmail[indivKey]
                              const result = confirmEmailResult[indivKey]
                              const isPending = confirmEmailPending === indivKey
                              const canSend = r.email && r.email !== '—' && r.status !== 'confirmed'
                              const isDeletePending = deleteRegConfirm === indivKey
                              const isDeleting = !!deletingReg[indivKey]
                              const deleteErr = deleteRegErr[indivKey]
                              // Sub-section visibility + which one renders last (for border-bottom sequencing)
                              const hasRsvp = r.rsvpAnswers && Object.values(r.rsvpAnswers).some(v => v != null && v !== '')
                              const hasOldCheckin = !!r.wtetCheckin
                              const showWtetReg = isWtetRegEvent(item.name)
                              const isLastTableRow = ri === registrantsData[item.id].length - 1
                              const rsvpIsLastBlock = hasRsvp && !hasOldCheckin && !showWtetReg
                              const oldCheckinIsLastBlock = hasOldCheckin && !showWtetReg
                              return (
                                <div key={ri}>
                                  <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.8fr 70px 70px 140px 100px', padding: '0.55rem 0.85rem', borderBottom: ri < registrantsData[item.id].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center' }}>
                                    {isMobile ? (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <div>
                                            {r.href
                                              ? <button onClick={() => router.push(r.href)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: '#333', fontWeight: '500', textAlign: 'left', fontFamily: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.2)' }}>{r.name || '—'}</button>
                                              : <div style={{ fontSize: '12px', color: '#333', fontWeight: '500' }}>{r.name || '—'}</div>
                                            }
                                            <div style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '2px' }}>{r.email || '—'}<CopyBtn value={r.email} /></div>
                                            {r.car && <div style={{ fontSize: '10px', color: '#aaa', marginTop: '1px' }}>{r.car}</div>}
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: r.type === 'Member' ? '#3B6B2F' : r.type === 'Public' ? '#2563a0' : '#8A6535' }}>{r.type}</span>
                                              {r.status && <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: (r.status === 'paid' || r.status === 'free' || r.status === 'confirmed') ? '#3B6B2F' : r.status === 'authorized' ? '#8A6535' : r.status === 'registered' ? '#2563a0' : '#888' }}>{r.status === 'confirmed' ? '✓ Confirmed' : r.status === 'authorized' ? 'Hold' : r.status}</span>}
                                              {r.amount > 0 && <span style={{ fontSize: '10px', color: '#555' }}>${(r.amount / 100).toFixed(2)}</span>}
                                              {!r.amount && r.status === 'free' && <span style={{ fontSize: '10px', color: '#3B6B2F' }}>Free</span>}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {canSend && !result?.sent && (
                                              isPending
                                                ? <><span style={{ fontSize: '10px', color: '#555' }}>{r.inviteSent ? 'Resend?' : 'Send?'}</span>
                                                    <PrimaryBtn small disabled={sending} onClick={() => { setConfirmEmailPending(null); sendConfirmEmail(item.id, r) }}>{sending ? '…' : 'Yes'}</PrimaryBtn>
                                                    <GhostBtn small onClick={() => setConfirmEmailPending(null)}>No</GhostBtn></>
                                                : <GhostBtn small onClick={() => setConfirmEmailPending(indivKey)}>{r.inviteSent ? 'Resend' : 'Invite'}</GhostBtn>
                                            )}
                                            {result?.sent && <span style={{ fontSize: '10px', color: '#3B6B2F' }}>✓ Sent</span>}
                                            {isDeletePending
                                              ? <><span style={{ fontSize: '10px', color: '#555' }}>Remove?</span>
                                                  <DangerBtn small disabled={isDeleting} onClick={() => deleteRegistrant(item.id, r.email)}>{isDeleting ? '…' : 'Yes'}</DangerBtn>
                                                  <GhostBtn small onClick={() => setDeleteRegConfirm(null)}>No</GhostBtn></>
                                              : <DangerBtn small onClick={() => { setDeleteRegConfirm(indivKey); setDeleteRegErr(p => ({ ...p, [indivKey]: null })) }}>Remove</DangerBtn>
                                            }
                                          </div>
                                        </div>
                                        {result?.error && <div style={{ fontSize: '11px', color: '#93333E', marginTop: '0.25rem' }}>{result.error}</div>}
                                        {deleteErr && <div style={{ fontSize: '11px', color: '#93333E', marginTop: '0.25rem' }}>{deleteErr}</div>}
                                      </div>
                                    ) : (
                                      <>
                                        <div>
                                          {r.href
                                            ? <button onClick={() => router.push(r.href)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', color: '#333', textAlign: 'left', fontFamily: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.2)' }}>{r.name || '—'}</button>
                                            : <span style={{ fontSize: '12px', color: '#333' }}>{r.name || '—'}</span>
                                          }
                                          {r.car && <div style={{ fontSize: '10px', color: '#aaa', marginTop: '1px' }}>{r.car}</div>}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '2px' }}>{r.email || '—'}<CopyBtn value={r.email} /></div>
                                        <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: r.type === 'Member' ? '#3B6B2F' : r.type === 'Public' ? '#2563a0' : '#8A6535' }}>{r.type}</div>
                                        <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: (r.status === 'paid' || r.status === 'free' || r.status === 'confirmed') ? '#3B6B2F' : r.status === 'authorized' ? '#8A6535' : r.status === 'registered' ? '#2563a0' : r.status === 'pending' ? '#c5a882' : '#888' }}>{r.status === 'confirmed' ? '✓ Confirmed' : r.status === 'authorized' ? 'Hold' : r.status || '—'}</div>
                                        <div style={{ fontSize: '11px', color: '#555' }}>{r.amount > 0 ? `$${(r.amount / 100).toFixed(2)}` : r.status === 'free' ? 'Free' : r.registeredAt ? new Date(r.registeredAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: MONTREAL_TZ }) : '—'}</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                          {canSend && !result?.sent && (
                                            isPending
                                              ? <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                  <span style={{ fontSize: '10px', color: '#555' }}>Send?</span>
                                                  <PrimaryBtn small disabled={sending} onClick={() => { setConfirmEmailPending(null); sendConfirmEmail(item.id, r) }}>{sending ? '…' : 'Yes'}</PrimaryBtn>
                                                  <GhostBtn small onClick={() => setConfirmEmailPending(null)}>No</GhostBtn>
                                                </div>
                                              : <GhostBtn small onClick={() => setConfirmEmailPending(indivKey)}>{r.inviteSent ? 'Resend' : 'Invite'}</GhostBtn>
                                          )}
                                          {result?.sent && <span style={{ fontSize: '10px', color: '#3B6B2F' }}>✓ Sent</span>}
                                          {result?.error && <span style={{ fontSize: '10px', color: '#93333E' }}>{result.error}</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                          {isDeletePending
                                            ? <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '10px', color: '#555' }}>Remove?</span>
                                                <DangerBtn small disabled={isDeleting} onClick={() => deleteRegistrant(item.id, r.email)}>{isDeleting ? '…' : 'Yes'}</DangerBtn>
                                                <GhostBtn small onClick={() => setDeleteRegConfirm(null)}>No</GhostBtn>
                                              </div>
                                            : <DangerBtn small onClick={() => { setDeleteRegConfirm(indivKey); setDeleteRegErr(p => ({ ...p, [indivKey]: null })) }}>Remove</DangerBtn>
                                          }
                                          {deleteErr && <span style={{ fontSize: '10px', color: '#93333E' }}>{deleteErr}</span>}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {hasRsvp && (
                                    <>
                                      <button
                                        onClick={() => setRsvpExpanded(p => ({ ...p, [indivKey]: !p[indivKey] }))}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%', padding: '0.3rem 0.85rem', background: 'none', border: 'none', borderBottom: (!rsvpExpanded[indivKey] && !(rsvpIsLastBlock && isLastTableRow)) ? '0.5px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                                      >
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" style={{ transform: rsvpExpanded[indivKey] ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                                        <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'var(--font-inter)' }}>RSVP Answers</span>
                                      </button>
                                      {rsvpExpanded[indivKey] && (
                                        <div style={{ padding: '0.4rem 0.85rem 0.65rem', background: '#fafaf9', borderBottom: !(rsvpIsLastBlock && isLastTableRow) ? '0.5px solid rgba(0,0,0,0.05)' : 'none', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                          {Object.entries(r.rsvpAnswers).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                                            <span key={k} style={{ fontSize: '10px', color: '#555', fontFamily: 'var(--font-inter)' }}>
                                              <span style={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>{k.replace(/_/g, ' ')}</span>
                                              {' '}
                                              <span style={{ color: '#333' }}>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {hasOldCheckin && (
                                    <>
                                      <button
                                        onClick={() => setRsvpExpanded(p => ({ ...p, [`checkin_${indivKey}`]: !p[`checkin_${indivKey}`] }))}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%', padding: '0.3rem 0.85rem', background: 'none', border: 'none', borderBottom: (!rsvpExpanded[`checkin_${indivKey}`] && !(oldCheckinIsLastBlock && isLastTableRow)) ? '0.5px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                                      >
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" style={{ transform: rsvpExpanded[`checkin_${indivKey}`] ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                                        <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', fontFamily: 'var(--font-inter)' }}>✓ Trip Details</span>
                                      </button>
                                      {rsvpExpanded[`checkin_${indivKey}`] && (
                                        <div style={{ padding: '0.5rem 0.85rem 0.75rem', background: 'rgba(59,107,47,0.03)', borderBottom: !(oldCheckinIsLastBlock && isLastTableRow) ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: r.wtetCheckin.passengers_list?.length ? '0.6rem' : 0 }}>
                                            {r.wtetCheckin.dietary && (
                                              <span style={{ fontSize: '10px', color: '#555', fontFamily: 'var(--font-inter)' }}>
                                                <span style={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>Dietary </span>
                                                <span style={{ color: '#333' }}>{r.wtetCheckin.dietary}</span>
                                              </span>
                                            )}
                                            {r.wtetCheckin.whatsapp && (
                                              <span style={{ fontSize: '10px', color: '#555', fontFamily: 'var(--font-inter)' }}>
                                                <span style={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>WhatsApp </span>
                                                <span style={{ color: '#333' }}>{r.wtetCheckin.whatsapp}</span>
                                              </span>
                                            )}
                                            {!r.wtetCheckin.dietary && !r.wtetCheckin.whatsapp && (
                                              <span style={{ fontSize: '10px', color: '#aaa', fontFamily: 'var(--font-inter)' }}>No dietary restrictions · No WhatsApp provided</span>
                                            )}
                                          </div>
                                          {r.wtetCheckin.passengers_list?.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                              {r.wtetCheckin.passengers_list.map((p, pi) => (
                                                <span key={pi} style={{ fontSize: '10px', color: '#555', fontFamily: 'var(--font-inter)', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                                                  <span style={{ color: '#aaa', fontSize: '9px' }}>{pi === 0 ? 'Driver' : `P${pi + 1}`} </span>
                                                  {p.name}, {p.age}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {showWtetReg && (() => {
                                    const doneCount = [!!r.wtetWaiver, r.wtetLunch?.length > 0, !!r.wtetCheckin].filter(Boolean).length
                                    const bothDone = doneCount === 3
                                    const anyDone = doneCount > 0
                                    const color = bothDone ? '#3B6B2F' : anyDone ? '#8A6535' : '#93333E'
                                    const wtetKey = `wtetreg_${indivKey}`
                                    return (
                                      <>
                                        <button
                                          onClick={() => setRsvpExpanded(p => ({ ...p, [wtetKey]: !p[wtetKey] }))}
                                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%', padding: '0.3rem 0.85rem', background: 'none', border: 'none', borderBottom: (!rsvpExpanded[wtetKey] && !isLastTableRow) ? '0.5px solid rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                                        >
                                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ transform: rsvpExpanded[wtetKey] ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                                          <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color, fontFamily: 'var(--font-inter)' }}>
                                            {bothDone ? '✓ Check In Complete' : anyDone ? `◐ Check In ${doneCount}/3` : '✗ Not Checked In'}
                                          </span>
                                        </button>
                                        {rsvpExpanded[wtetKey] && (
                                          <div style={{ padding: '0.5rem 0.85rem 0.75rem', background: bothDone ? 'rgba(59,107,47,0.03)' : 'rgba(147,51,62,0.02)', borderBottom: !isLastTableRow ? '0.5px solid rgba(0,0,0,0.05)' : 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ fontSize: '10px', fontFamily: 'var(--font-inter)' }}>
                                              <span style={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>Trip Details </span>
                                              {r.wtetCheckin ? (
                                                <span style={{ color: '#3B6B2F' }}>
                                                  Complete
                                                  {' — '}Dietary: {r.wtetCheckin.dietary || 'None'}
                                                  {r.wtetCheckin.passengers_list?.length > 0 && (
                                                    <>{' · '}{r.wtetCheckin.passengers_list.map((p, pi) => `${pi === 0 ? 'Driver' : `P${pi + 1}`}: ${p.name}, ${p.age}`).join(' · ')}</>
                                                  )}
                                                </span>
                                              ) : <span style={{ color: '#93333E' }}>Not submitted</span>}
                                            </div>
                                            <div style={{ fontSize: '10px', fontFamily: 'var(--font-inter)' }}>
                                              <span style={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>WhatsApp </span>
                                              {r.wtetCheckin?.whatsapp ? (
                                                <span style={{ color: '#3B6B2F' }}>{r.wtetCheckin.whatsapp}</span>
                                              ) : <span style={{ color: '#93333E' }}>Not provided</span>}
                                            </div>
                                            <div style={{ fontSize: '10px', fontFamily: 'var(--font-inter)' }}>
                                              <span style={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>Waiver </span>
                                              {r.wtetWaiver ? (
                                                <>
                                                  <span style={{ color: '#3B6B2F' }}>
                                                    Signed by {r.wtetWaiver.full_name} — {new Date(r.wtetWaiver.signed_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: MONTREAL_TZ })}
                                                  </span>
                                                  {' · '}
                                                  <button onClick={e => { e.stopPropagation(); setViewingWaiver({ name: r.name, email: r.email, waiver: r.wtetWaiver }) }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#8A6535', textDecoration: 'underline', fontSize: '10px', fontFamily: 'var(--font-inter)' }}>View full waiver</button>
                                                </>
                                              ) : <span style={{ color: '#93333E' }}>Not signed</span>}
                                            </div>
                                            <div style={{ fontSize: '10px', fontFamily: 'var(--font-inter)' }}>
                                              <span style={{ color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '9px' }}>Lunch </span>
                                              {r.wtetLunch?.length > 0 ? (
                                                <span style={{ color: '#3B6B2F' }}>
                                                  {r.wtetLunch.map((entry, i) => `${entry.name ? `${entry.name}: ` : ''}${entry.dish_name}`).join(' · ')}
                                                </span>
                                              ) : <span style={{ color: '#93333E' }}>Not selected</span>}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              )
                            })}
                          </div>
                        </div>}
                      </>
                    )}
                  </div>
                )}

                {/* ── Expanded edit panel ──────────────────────────────────── */}
                {isEditing && (
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                    <TabBar
                      tabs={[
                        { id: 'settings',     label: `Settings` },
                        { id: 'applications', label: `Applications${item.total_applications > 0 ? ` (${item.total_applications})` : ''}` },
                        ...(isWtetRegEvent(item.name) ? [
                          { id: 'waiver', label: 'Waiver & Lunch' },
                          { id: 'awards', label: 'Route Awards' },
                        ] : [
                          { id: 'checkin', label: 'Check-in' },
                          { id: 'genericAwards', label: 'Route Awards' },
                        ]),
                      ]}
                      active={tab}
                      onChange={id => setActiveTab(p => ({ ...p, [item.id]: id }))}
                    />

                    {/* ── Settings tab ──────────────────────────────────── */}
                    {tab === 'settings' && (
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 0.9fr 140px 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div><L>Name<InfoTip field="name" /></L><input style={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                          <div><L>Date<InfoTip field="date" /></L><input style={inp} type="date" value={editForm.date || ''} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} /></div>
                          <div><L>Type<InfoTip field="type" /></L><SelectWrap value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} /></div>
                          <div><L>Trip Length<InfoTip field="trip_length" /></L>
                            <select style={sel} value={editForm.trip_length || ''} onChange={e => setEditForm(p => ({ ...p, trip_length: e.target.value }))}>
                              <option value="">None</option>
                              {TRIP_LENGTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.6rem' }}><L>Date Display<InfoTip field="date_display" /></L><input style={inp} value={editForm.date_display || ''} onChange={e => setEditForm(p => ({ ...p, date_display: e.target.value }))} placeholder="June 2026" /></div>
                        <div style={{ marginBottom: '0.6rem' }}><L>Location<InfoTip field="location" /></L><input style={inp} value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
                        <div style={{ marginBottom: '0.6rem' }}><L>Description<InfoTip field="description" /></L><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
                        <div style={{ marginBottom: '0.6rem', paddingTop: '0.6rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
                          <L>Registration Visibility</L>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                            {[
                              { val: 'members', label: 'Members only', desc: 'Visible in the portal only' },
                              { val: 'public',  label: 'Members + Public', desc: 'Also open on the public page' },
                            ].map(({ val, label, desc }) => {
                              const sel = editForm.registration_visibility === val
                              return (
                                <button key={val} type="button"
                                  onClick={() => setEditForm(p => ({ ...p, registration_visibility: val }))}
                                  style={{ padding: '0.65rem 1rem', border: `1px solid ${sel ? '#0F1E14' : 'rgba(0,0,0,0.14)'}`, background: sel ? 'rgba(15,30,20,0.05)' : '#fff', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left', transition: 'all 0.15s' }}>
                                  <div style={{ fontSize: '12px', fontWeight: '500', color: sel ? '#0F1E14' : '#555', marginBottom: '2px' }}>{label}</div>
                                  <div style={{ fontSize: '10px', color: '#aaa' }}>{desc}</div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.6rem' }}>
                          <L>{editForm.registration_visibility === 'public' ? 'Public Registration URL' : 'Member Registration URL'}<InfoTip field="registration_url" /></L>
                          <input style={inp} value={editForm.registration_url || ''} onChange={e => setEditForm(p => ({ ...p, registration_url: e.target.value }))}
                            placeholder={editForm.registration_visibility === 'public' ? 'https://canvasroutes.com/wtet' : '/members/events/wtet'} />
                        </div>
                        <div style={{ paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.6rem' }}>Member Registration</div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                            <div><L>Registration Opens<InfoTip field="registration_opens" /></L><input style={inp} type="datetime-local" value={editForm.registration_opens_at ? editForm.registration_opens_at.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, registration_opens_at: e.target.value || null }))} /></div>
                            <div><L>Registration Closes<InfoTip field="registration_closes" /></L><input style={inp} type="datetime-local" value={editForm.registration_closes_at ? editForm.registration_closes_at.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, registration_closes_at: e.target.value || null }))} /></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.6rem' }}>
                            <div><L>Member Price (CAD)<InfoTip field="member_price" /></L><input style={inp} type="number" min="0" step="0.01" value={editForm.member_price ? (editForm.member_price / 100).toFixed(2) : ''} onChange={e => { const cents = Math.round(parseFloat(e.target.value) * 100); setEditForm(p => ({ ...p, member_price: e.target.value && !isNaN(cents) ? cents : null })) }} placeholder="0.00" /></div>
                            <div><L>Capacity<InfoTip field="capacity" /></L><input style={inp} type="number" min="1" value={editForm.capacity || ''} onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Unlimited" /></div>
                            <div><L>IC Priority Window Ends<InfoTip field="priority_window" /></L><input style={inp} type="datetime-local" value={editForm.priority_window_end ? editForm.priority_window_end.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, priority_window_end: e.target.value || null }))} /></div>
                          </div>
                        </div>
                        <div style={{ paddingTop: '0.5rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '1rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.6rem' }}>Event Photo<InfoTip field="photo" /></div>
                          {item.photo_url && (
                            <div style={{ marginBottom: '0.6rem', position: 'relative', display: 'inline-block' }}>
                              <img src={item.photo_url} alt="" style={{ width: '160px', height: '90px', objectFit: 'cover', display: 'block', border: '0.5px solid rgba(0,0,0,0.1)' }} />
                              <button onClick={() => removePhoto(item.id)} disabled={uploadingPhoto === item.id} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(147,51,62,0.85)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '11px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            </div>
                          )}
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: '#555', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.45rem 0.9rem', background: '#fafaf9' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                            {uploadingPhoto === item.id ? 'Uploading…' : item.photo_url ? 'Replace Photo' : 'Upload Photo'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingPhoto === item.id} onChange={e => { if (e.target.files[0]) uploadPhoto(item.id, e.target.files[0]) }} />
                          </label>
                          {photoError[item.id] && <Err msg={photoError[item.id]} />}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</PrimaryBtn>
                          <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                        </div>
                        <Err msg={saveError} />
                      </div>
                    )}

                    {/* ── Applications tab ──────────────────────────────── */}
                    {tab === 'applications' && (
                      <div style={{ overflowX: 'auto' }}>
                        {(item.applications ?? []).length === 0 ? (
                          <div style={{ padding: '2.5rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>
                            No applications for this event yet.
                          </div>
                        ) : (
                          <>
                            {!isMobile && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 150px', padding: '0.6rem 1.5rem', background: '#fafaf9', borderBottom: '0.5px solid rgba(0,0,0,0.06)', minWidth: '560px' }}>
                                {['Name', 'Car', 'Member', 'RSVP', ''].map((h, i) => (
                                  <div key={i} style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                                ))}
                              </div>
                            )}
                            {(item.applications ?? []).map((app, appIdx) => {
                              const key = `${app.id}-${item.name}`
                              const { make, model } = parseCarMakeModel(app.car_model)
                              const car = [app.car_year, make, model].filter(Boolean).join(' ')
                              return (
                                <div key={app.id} style={{ borderBottom: appIdx < item.applications.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                                  {isMobile ? (
                                    <div style={{ padding: '0.85rem 1.5rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                        <div>
                                          <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500', marginBottom: '0.1rem' }}>{app.name || '—'}</div>
                                          <div style={{ fontSize: '11px', color: '#888' }}>{car || '—'}</div>
                                        </div>
                                        <StatusChip rsvp={app.rsvp} />
                                      </div>
                                      {app.rsvp?.answers && <RsvpAnswers answers={app.rsvp.answers} />}
                                      <div style={{ marginTop: '0.65rem' }}>
                                        <InviteActions app={app} ev={item} keyStr={key} inviting={inviting} inviteErr={inviteErr} inviteDone={inviteDone} sendInvite={(app2, ev2) => setInviteConfirm({ app: app2, ev: ev2 })} declining={declining} declineErr={declineErr} onDecline={(appId, eventName) => setDeclineConfirm({ appId, appName: app.name, eventName })} onUndecline={undeclineApplication} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 150px', padding: '0.85rem 1.5rem', alignItems: 'start', gap: '0.5rem', minWidth: '560px' }}>
                                      <div>
                                        <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '0.1rem' }}>{app.name || '—'}</div>
                                        <div style={{ fontSize: '11px', color: '#aaa' }}>{app.email}</div>
                                        {app.rsvp?.answers && <RsvpAnswers answers={app.rsvp.answers} />}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#666' }}>{car || '—'}</div>
                                      <div>
                                        {app.is_member
                                          ? <span style={{ fontSize: '10px', color: '#3B6B2F', letterSpacing: '0.06em' }}>✓ Member</span>
                                          : <span style={{ fontSize: '10px', color: '#bbb' }}>—</span>}
                                      </div>
                                      <StatusChip rsvp={app.rsvp} />
                                      <InviteActions app={app} ev={item} keyStr={key} inviting={inviting} inviteErr={inviteErr} inviteDone={inviteDone} sendInvite={(app2, ev2) => setInviteConfirm({ app: app2, ev: ev2 })} declining={declining} declineErr={declineErr} onDecline={(appId, eventName) => setDeclineConfirm({ appId, appName: app.name, eventName })} onUndecline={undeclineApplication} />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </>
                        )}
                      </div>
                    )}

                    {/* ── Check-in tab (any event) ────────────────────────── */}
                    {tab === 'checkin' && (
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Check-in enabled</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '0.2rem', overflowWrap: 'anywhere' }}>
                              {editForm.checkin_enabled ? `Public check-in page: canvasroutes.com/checkin/${item.id}` : 'Turn on to let registrants use the check-in page for this event.'}
                            </div>
                          </div>
                          <ToggleSwitch checked={!!editForm.checkin_enabled} onChange={v => setEditForm(p => ({ ...p, checkin_enabled: v }))} label="Check-in enabled" />
                        </div>

                        {editForm.checkin_enabled && (
                          <>
                            <div style={{ marginBottom: '1.1rem' }}>
                              <L>Sections</L>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[['trip_details', 'Trip Details'], ['waiver', 'Waiver'], ['lunch', 'Lunch']].map(([id, label]) => {
                                  const on = (editForm.checkin_sections || []).includes(id)
                                  return (
                                    <button key={id} type="button"
                                      onClick={() => setEditForm(p => ({ ...p, checkin_sections: on ? p.checkin_sections.filter(s => s !== id) : [...(p.checkin_sections || []), id] }))}
                                      style={{ fontSize: '11px', letterSpacing: '0.06em', padding: '0.5rem 1rem', borderRadius: '8px', border: `0.5px solid ${on ? '#3B6B2F' : 'rgba(0,0,0,0.15)'}`, background: on ? 'rgba(59,107,47,0.06)' : '#fff', color: on ? '#3B6B2F' : '#666', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                                      {on ? '✓ ' : ''}{label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {(editForm.checkin_sections || []).includes('trip_details') && (
                              <div style={{ marginBottom: '1.1rem', maxWidth: '220px' }}>
                                <L>Max Passengers Per Car</L>
                                <input type="number" min="1" max="10" style={inp} value={editForm.checkin_max_passengers}
                                  onChange={e => setEditForm(p => ({ ...p, checkin_max_passengers: e.target.value }))} />
                              </div>
                            )}

                            {(editForm.checkin_sections || []).includes('waiver') && (
                              <div style={{ marginBottom: '1.1rem' }}>
                                <L>Waiver Text</L>
                                <textarea style={{ ...inp, height: '140px', resize: 'vertical' }}
                                  value={editForm.checkin_waiver_text}
                                  onChange={e => setEditForm(p => ({ ...p, checkin_waiver_text: e.target.value }))}
                                  placeholder="Paste the liability waiver text participants will read and agree to…" />
                              </div>
                            )}

                            {(editForm.checkin_sections || []).includes('lunch') && (
                              <div style={{ marginBottom: '1.1rem' }}>
                                <L>Lunch Cutoff</L>
                                <input type="datetime-local" style={{ ...inp, maxWidth: '260px' }} value={editForm.checkin_lunch_cutoff}
                                  onChange={e => setEditForm(p => ({ ...p, checkin_lunch_cutoff: e.target.value }))} />

                                <div style={{ marginTop: '0.85rem' }}>
                                  <L>Lunch Options</L>
                                  {(editForm.checkin_lunch_options || []).map((dish, di) => (
                                    <div key={dish.id || di} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                      <input style={inp} placeholder="Dish name" value={dish.name || ''}
                                        onChange={e => setEditForm(p => ({ ...p, checkin_lunch_options: p.checkin_lunch_options.map((d, i2) => i2 === di ? { ...d, name: e.target.value } : d) }))} />
                                      <input style={inp} placeholder="Description (optional)" value={dish.description || ''}
                                        onChange={e => setEditForm(p => ({ ...p, checkin_lunch_options: p.checkin_lunch_options.map((d, i2) => i2 === di ? { ...d, description: e.target.value } : d) }))} />
                                      <DangerBtn small onClick={() => setEditForm(p => ({ ...p, checkin_lunch_options: p.checkin_lunch_options.filter((_, i2) => i2 !== di) }))}>Remove</DangerBtn>
                                    </div>
                                  ))}
                                  <GhostBtn small onClick={() => setEditForm(p => ({ ...p, checkin_lunch_options: [...(p.checkin_lunch_options || []), { id: `dish_${Date.now()}_${p.checkin_lunch_options?.length || 0}`, name: '', description: '' }] }))}>
                                    + Add Dish
                                  </GhostBtn>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Check-in Settings'}</PrimaryBtn>
                        </div>
                        <Err msg={saveError} />

                        {editForm.checkin_enabled && item.checkin_enabled && (
                          <div style={{ marginTop: '2rem', borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '1rem' }}>
                            <CheckinStatusClient eventId={item.id} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Generic Route Awards tab (any non-WTET event) ───── */}
                    {tab === 'genericAwards' && !isWtetRegEvent(item.name) && (
                      <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Route Awards enabled</div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '0.2rem', overflowWrap: 'anywhere' }}>
                              {editForm.awards_enabled ? `Public ballot: canvasroutes.com/awards/${item.id}` : 'Turn on to configure a Route Awards ballot for this event.'}
                            </div>
                          </div>
                          <ToggleSwitch checked={!!editForm.awards_enabled} onChange={v => setEditForm(p => ({ ...p, awards_enabled: v }))} label="Route Awards enabled" />
                        </div>

                        {editForm.awards_enabled && (
                          <>
                            <div style={{ marginBottom: '1.1rem' }}>
                              <L>Categories</L>
                              {(editForm.awards_categories || []).map((cat, ci) => (
                                <div key={cat.id || ci} style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.6rem' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 110px auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input style={inp} placeholder="Category label (e.g. Most Beautiful Car)" value={cat.label || ''}
                                      onChange={e => setEditForm(p => ({ ...p, awards_categories: p.awards_categories.map((c, i2) => i2 === ci ? { ...c, label: e.target.value } : c) }))} />
                                    <input type="number" min="0" max="100" style={inp} placeholder="% off" value={cat.discount_pct ?? ''}
                                      onChange={e => setEditForm(p => ({ ...p, awards_categories: p.awards_categories.map((c, i2) => i2 === ci ? { ...c, discount_pct: e.target.value === '' ? null : parseInt(e.target.value) } : c) }))} />
                                    <DangerBtn small onClick={() => setEditForm(p => ({ ...p, awards_categories: p.awards_categories.filter((_, i2) => i2 !== ci) }))}>Remove</DangerBtn>
                                  </div>
                                  <textarea style={{ ...inp, height: '60px', resize: 'vertical' }} placeholder="Short description shown to voters (optional)" value={cat.body || ''}
                                    onChange={e => setEditForm(p => ({ ...p, awards_categories: p.awards_categories.map((c, i2) => i2 === ci ? { ...c, body: e.target.value } : c) }))} />
                                </div>
                              ))}
                              <GhostBtn small onClick={() => setEditForm(p => ({
                                ...p,
                                awards_categories: [...(p.awards_categories || []), { id: `cat_${Date.now()}_${p.awards_categories?.length || 0}`, label: '', body: '', discount_pct: null }],
                              }))}>
                                + Add Category
                              </GhostBtn>
                            </div>

                            <div style={{ marginBottom: '1.1rem' }}>
                              <L>Ineligible Names<InfoTip field="awards_ineligible_names" /></L>
                              <input style={inp} placeholder="e.g. Jerry — separate with commas"
                                value={(editForm.awards_ineligible_names || []).join(', ')}
                                onChange={e => setEditForm(p => ({ ...p, awards_ineligible_names: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
                              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '0.3rem' }}>These names are excluded from every candidate list — e.g. the event organizer.</div>
                            </div>
                          </>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Awards Settings'}</PrimaryBtn>
                        </div>
                        <Err msg={saveError} />

                        {editForm.awards_enabled && item.awards_enabled && (
                          <div style={{ marginTop: '2rem', borderTop: '0.5px solid rgba(0,0,0,0.08)', paddingTop: '1rem' }}>
                            <AwardsTallyClient eventId={item.id} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Waiver & Lunch tab (WTET only) ──────────────────── */}
                    {tab === 'waiver' && isWtetRegEvent(item.name) && <WtetClient />}

                    {/* ── Route Awards tab (WTET only) ────────────────────── */}
                    {tab === 'awards' && isWtetRegEvent(item.name) && <WtetAwardsClient />}

                  </div>
                )}
              </div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Yes/no gates — every one of these sends email to participants */}
      {inviteConfirm && (
        <ConfirmDialog
          title={inviteConfirm.app.rsvp ? 'Re-send this invite?' : 'Approve and send invite?'}
          message="An RSVP invite email goes out immediately."
          details={<><strong>{inviteConfirm.app.name || '—'}</strong> · {inviteConfirm.app.email}<br />Event: <strong>{inviteConfirm.ev.name}</strong></>}
          confirmLabel={inviteConfirm.app.rsvp ? 'Yes, re-send' : 'Yes, send invite'}
          busy={!!inviting[`${inviteConfirm.app.id}-${inviteConfirm.ev.name}`]}
          onConfirm={async () => { const { app, ev } = inviteConfirm; await sendInvite(app, ev); setInviteConfirm(null) }}
          onCancel={() => setInviteConfirm(null)}
        />
      )}
      {declineConfirm && (
        <ConfirmDialog
          title="Decline this application?"
          message="You can undo this later with Undo Decline."
          details={<><strong>{declineConfirm.appName || '—'}</strong><br />Event: <strong>{declineConfirm.eventName}</strong></>}
          confirmLabel="Yes, decline"
          danger
          busy={!!declining[`${declineConfirm.appId}-${declineConfirm.eventName}`]}
          onConfirm={async () => { const { appId, eventName } = declineConfirm; await declineApplication(appId, eventName); setDeclineConfirm(null) }}
          onCancel={() => setDeclineConfirm(null)}
        />
      )}
      {addRegConfirm && (
        <ConfirmDialog
          title="Add registrant and send invite?"
          message="Adding a registrant automatically emails them a Confirm-My-Spot invite."
          details={<><strong>{(addRegName[addRegConfirm] || '').trim() || '—'}</strong> · {(addRegEmail[addRegConfirm] || '').trim()}<br />Payment: <strong>{addRegPayment[addRegConfirm] || 'none'}</strong></>}
          confirmLabel="Yes, add & email"
          busy={!!addingReg[addRegConfirm]}
          onConfirm={async () => { const id = addRegConfirm; await addRegistrant(id); setAddRegConfirm(null) }}
          onCancel={() => setAddRegConfirm(null)}
        />
      )}
      {regEmailConfirm && (
        <ConfirmDialog
          title={`Email ${[...new Set((registrantsData[regEmailConfirm] || []).map(r => r.email).filter(e => e && e !== '—'))].length} registrant${[...new Set((registrantsData[regEmailConfirm] || []).map(r => r.email).filter(e => e && e !== '—'))].length !== 1 ? 's' : ''}?`}
          message="This sends to every registrant of the event and cannot be unsent."
          details={<>Subject: <strong>{(regEmailSubject[regEmailConfirm] || '').trim() || '—'}</strong></>}
          confirmLabel="Yes, send to all"
          busy={!!sendingRegEmail[regEmailConfirm]}
          onConfirm={async () => { const id = regEmailConfirm; await sendEmailToRegistrants(id); setRegEmailConfirm(null) }}
          onCancel={() => setRegEmailConfirm(null)}
        />
      )}
      {viewingWaiver && (
        <WaiverViewerModal
          name={viewingWaiver.name}
          email={viewingWaiver.email}
          waiver={viewingWaiver.waiver}
          onClose={() => setViewingWaiver(null)}
        />
      )}
    </div>
  )
}
