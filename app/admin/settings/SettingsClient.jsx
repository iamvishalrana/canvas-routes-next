'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, L, Err } from '../_components/shared'

const SECTION_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem 1.75rem', marginBottom: '1.5rem' }
const SECTION_LABEL = { fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }

function ToggleSetting({ label, description, value, onChange, saving }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem', paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5 }}>{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => !saving && onChange(!value)}
        style={{
          position: 'relative', flexShrink: 0, width: '40px', height: '22px',
          background: value ? '#0F1E14' : 'rgba(0,0,0,0.15)',
          border: 'none', borderRadius: '11px',
          cursor: saving ? 'wait' : 'pointer',
          transition: 'background 0.18s',
          opacity: saving ? 0.6 : 1,
          marginTop: '2px',
        }}
      >
        <span style={{
          position: 'absolute', top: '3px', left: value ? '20px' : '3px',
          width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
          transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          display: 'block',
        }} />
      </button>
    </div>
  )
}

function TextSetting({ label, description, value, onChange, onSave, saving, placeholder, type = 'text' }) {
  return (
    <div style={{ paddingBottom: '1.25rem', marginBottom: '1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>{label}</div>
      {description && <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5, marginBottom: '0.65rem' }}>{description}</div>}
      {type === 'textarea' ? (
        <textarea
          style={{ ...inp, height: '72px', resize: 'vertical', marginBottom: '0.5rem' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          style={{ ...inp, marginBottom: '0.5rem' }}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        style={{ padding: '0.4rem 1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

export default function SettingsClient() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving]     = useState({})
  const [errors, setErrors]     = useState({})
  const [saved, setSaved]       = useState({})

  // Local draft state for text fields
  const [drafts, setDrafts] = useState({})

  const load = useCallback(() => {
    setLoadError(false)
    fetch('/api/admin/settings')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed')))
      .then(data => {
        setSettings(data)
        setDrafts({
          notify_email:              data.notify_email              || '',
          membership_closed_message: data.membership_closed_message || '',
          event_closed_message:      data.event_closed_message      || '',
          founder_promo_code:        data.founder_promo_code        || '',
          admin_banner:              data.admin_banner              || '',
          homepage_banner:           data.homepage_banner           || '',
          event_page_url:            data.event_page_url            || '',
        })
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function saveSetting(key, value) {
    setSaving(p => ({ ...p, [key]: true }))
    setErrors(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()
      if (!res.ok) { setErrors(p => ({ ...p, [key]: data.error || 'Failed to save.' })); return }
      setSettings(p => ({ ...p, [key]: value }))
      setSaved(p => ({ ...p, [key]: true }))
      setTimeout(() => setSaved(p => ({ ...p, [key]: false })), 2000)
    } catch {
      setErrors(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setSaving(p => ({ ...p, [key]: false }))
    }
  }

  function boolVal(key, fallback = true) {
    if (!(key in settings)) return fallback
    return settings[key] !== 'false'
  }

  function SavedIndicator({ k }) {
    return saved[k] ? <span style={{ fontSize: '11px', color: '#3B6B2F', marginLeft: '0.75rem', fontFamily: 'var(--font-inter),sans-serif' }}>✓ Saved</span> : null
  }

  if (loading) return (
    <div style={SECTION_STYLE}>
      <div style={{ fontSize: '13px', color: '#ccc' }}>Loading…</div>
    </div>
  )

  if (loadError) return (
    <div style={SECTION_STYLE}>
      <div style={{ background: 'rgba(123,32,50,0.06)', border: '0.5px solid rgba(123,32,50,0.2)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '13px', color: '#7B2032', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.4rem' }}>Failed to load settings</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}>Could not reach the settings API. Saving is disabled to prevent overwriting values with defaults.</div>
        <button onClick={load} style={{ marginTop: '0.75rem', padding: '0.35rem 0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Retry</button>
      </div>
    </div>
  )

  return (
    <div style={SECTION_STYLE}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>Settings</h1>
      </div>

      {/* Registration */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Registration</div>

        <ToggleSetting
          label="Membership Applications Open"
          description="When off, the membership form shows a paused message and stops accepting submissions."
          value={boolVal('membership_open', true)}
          saving={saving.membership_open}
          onChange={v => !loadError && saveSetting('membership_open', v ? 'true' : 'false')}
        />
        {errors.membership_open && <Err msg={errors.membership_open} />}
        <SavedIndicator k="membership_open" />

        <TextSetting
          label="Membership Closed Message"
          description="Shown when membership applications are off. Leave blank for the default."
          value={drafts.membership_closed_message}
          onChange={v => setDrafts(p => ({ ...p, membership_closed_message: v }))}
          onSave={() => saveSetting('membership_closed_message', drafts.membership_closed_message)}
          saving={saving.membership_closed_message}
          placeholder="Membership applications are currently paused. Check back soon."
          type="textarea"
        />
        {errors.membership_closed_message && <Err msg={errors.membership_closed_message} />}
        <SavedIndicator k="membership_closed_message" />

        <ToggleSetting
          label="Event Registration Open"
          description="When off, the standalone event registration form is hidden and the page shows a closed notice. Reuse this for each new one-off event page."
          value={boolVal('event_registration_open', true)}
          saving={saving.event_registration_open}
          onChange={v => !loadError && saveSetting('event_registration_open', v ? 'true' : 'false')}
        />
        {errors.event_registration_open && <Err msg={errors.event_registration_open} />}
        <SavedIndicator k="event_registration_open" />

        <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <TextSetting
            label="Event Closed Message"
            description="Shown on the event page when registration is off. Update this for each new event."
            value={drafts.event_closed_message}
            onChange={v => setDrafts(p => ({ ...p, event_closed_message: v }))}
            onSave={() => saveSetting('event_closed_message', drafts.event_closed_message)}
            saving={saving.event_closed_message}
            placeholder="Registration for this event is now closed."
            type="textarea"
          />
          {errors.event_closed_message && <Err msg={errors.event_closed_message} />}
          <SavedIndicator k="event_closed_message" />
        </div>
      </div>

      {/* Email */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Email</div>

        <TextSetting
          label="Event Promo Code"
          description="Promo code included in event registration confirmation emails. Update before each new event."
          value={drafts.founder_promo_code}
          onChange={v => setDrafts(p => ({ ...p, founder_promo_code: v.toUpperCase() }))}
          onSave={() => saveSetting('founder_promo_code', drafts.founder_promo_code)}
          saving={saving.founder_promo_code}
          placeholder="e.g. FOUNDING"
        />
        {errors.founder_promo_code && <Err msg={errors.founder_promo_code} />}
        <SavedIndicator k="founder_promo_code" />

        <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <TextSetting
            label="Admin Notification Email"
            description="Where internal registration and event notification emails are sent. Note: changing this only affects routes that read from settings; hardcoded addresses in email templates are unaffected."
            value={drafts.notify_email}
            onChange={v => setDrafts(p => ({ ...p, notify_email: v }))}
            onSave={() => saveSetting('notify_email', drafts.notify_email)}
            saving={saving.notify_email}
            placeholder="info@canvasroutes.com"
            type="email"
          />
          {errors.notify_email && <Err msg={errors.notify_email} />}
          <SavedIndicator k="notify_email" />
        </div>
      </div>

      {/* Admin banner */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Admin Panel</div>
        <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <TextSetting
            label="Admin Banner"
            description="A notice shown at the top of every admin page. Leave blank to hide. Useful for reminders or alerts visible only to admins."
            value={drafts.admin_banner}
            onChange={v => setDrafts(p => ({ ...p, admin_banner: v }))}
            onSave={() => saveSetting('admin_banner', drafts.admin_banner)}
            saving={saving.admin_banner}
            placeholder="e.g. Event tomorrow — confirm final headcount in Contacts"
            type="textarea"
          />
          {errors.admin_banner && <Err msg={errors.admin_banner} />}
          <SavedIndicator k="admin_banner" />
        </div>
      </div>

      {/* Homepage */}
      <div style={CARD}>
        <div style={SECTION_LABEL}>Homepage</div>

        <TextSetting
          label="Announcement Banner"
          description="A short message shown as a public banner on the homepage — use it to announce upcoming events, registration openings, or news. Leave blank to hide the banner."
          value={drafts.homepage_banner}
          onChange={v => setDrafts(p => ({ ...p, homepage_banner: v }))}
          onSave={() => saveSetting('homepage_banner', drafts.homepage_banner)}
          saving={saving.homepage_banner}
          placeholder="e.g. New event July 19 — registration now open"
        />
        {errors.homepage_banner && <Err msg={errors.homepage_banner} />}
        <SavedIndicator k="homepage_banner" />

        <div style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
          <TextSetting
            label="Event Page URL"
            description="The URL the announcement banner links to. Set alongside the banner text. Can be an internal path (/cars-coffee-dad-jokes) or a full URL."
            value={drafts.event_page_url}
            onChange={v => setDrafts(p => ({ ...p, event_page_url: v }))}
            onSave={() => saveSetting('event_page_url', drafts.event_page_url)}
            saving={saving.event_page_url}
            placeholder="e.g. /next-event or https://canvasroutes.com/next-event"
          />
          {errors.event_page_url && <Err msg={errors.event_page_url} />}
          <SavedIndicator k="event_page_url" />
        </div>
      </div>

      {/* SQL reminder */}
      <div style={{ background: 'rgba(197,168,130,0.06)', border: '0.5px solid rgba(197,168,130,0.2)', padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>Supabase</div>
        <div style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.6 }}>
          The <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 4px', fontFamily: 'monospace' }}>settings</code> table must exist in your database.
          Run <code style={{ background: 'rgba(0,0,0,0.05)', padding: '1px 4px', fontFamily: 'monospace' }}>supabase/migrations/add_settings_table.sql</code> in the Supabase SQL Editor if settings don't save.
        </div>
      </div>
    </div>
  )
}
