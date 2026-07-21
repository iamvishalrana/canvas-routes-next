'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err, ToggleSwitch } from './shared'
import CheckinStatusClient from './CheckinStatusClient'
import AwardsTallyClient from './AwardsTallyClient'

// Registrants / Check-in (trip details, waiver, lunch) / Route Awards config,
// embedded directly where a route lives (Admin > Routes) instead of requiring
// a trip to Admin > Events. Reuses the same generic per-event system and API
// routes EventsClient.jsx's 'checkin'/'genericAwards' tabs already use — this
// is a second, route-scoped surface for the same underlying event row, not a
// parallel system.
export default function RouteEventConfigClient({ eventId }) {
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/checkin/${eventId}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/admin/awards/${eventId}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([checkinData, awardsData]) => {
      const cEv = checkinData?.event || {}
      const aEv = awardsData?.event || {}
      setForm({
        checkin_enabled: !!cEv.checkin_enabled,
        checkin_sections: cEv.checkin_sections || [],
        checkin_max_passengers: cEv.checkin_max_passengers || 2,
        checkin_waiver_text: cEv.checkin_waiver_text || '',
        checkin_lunch_cutoff: cEv.checkin_lunch_cutoff ? cEv.checkin_lunch_cutoff.slice(0, 16) : '',
        checkin_lunch_options: cEv.checkin_lunch_options || [],
        awards_categories: aEv.awards_categories || [],
        awards_ineligible_names: aEv.awards_ineligible_names || [],
      })
    }).finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => { load() }, [load])

  async function save(fields, { silent = false } = {}) {
    if (!silent) { setSaving(true); setSaveError(null) }
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { if (!silent) setSaveError(data.error || 'Failed to save.'); return }
      if (!silent) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch { if (!silent) setSaveError('Network error.') }
    finally { if (!silent) setSaving(false) }
  }

  if (loading || !form) return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>

  return (
    <div>
      {/* Check-in settings */}
      <div style={{ padding: '1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Check-in — Trip Details, Waiver & Lunch</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.1rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>Check-in enabled</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '0.2rem', overflowWrap: 'anywhere' }}>
              {form.checkin_enabled ? `Public check-in page: canvasroutes.com/checkin/${eventId}` : 'Turn on to let registrants use the check-in page.'}
            </div>
          </div>
          <ToggleSwitch checked={form.checkin_enabled} onChange={v => { setForm(p => ({ ...p, checkin_enabled: v })); save({ checkin_enabled: v }, { silent: true }) }} label="Check-in enabled" />
        </div>

        {form.checkin_enabled && (
          <>
            <div style={{ marginBottom: '1.1rem' }}>
              <L>Sections</L>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[['trip_details', 'Trip Details'], ['waiver', 'Waiver'], ['lunch', 'Lunch']].map(([id, label]) => {
                  const on = (form.checkin_sections || []).includes(id)
                  return (
                    <button key={id} type="button"
                      onClick={() => setForm(p => ({ ...p, checkin_sections: on ? p.checkin_sections.filter(s => s !== id) : [...(p.checkin_sections || []), id] }))}
                      style={{ fontSize: '11px', letterSpacing: '0.06em', padding: '0.5rem 1rem', borderRadius: '8px', border: `0.5px solid ${on ? '#3B6B2F' : 'rgba(0,0,0,0.15)'}`, background: on ? 'rgba(59,107,47,0.06)' : '#fff', color: on ? '#3B6B2F' : '#666', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                      {on ? '✓ ' : ''}{label}
                    </button>
                  )
                })}
              </div>
            </div>

            {(form.checkin_sections || []).includes('trip_details') && (
              <div style={{ marginBottom: '1.1rem', maxWidth: '220px' }}>
                <L>Max Passengers Per Car</L>
                <input type="number" min="1" max="10" style={inp} value={form.checkin_max_passengers}
                  onChange={e => setForm(p => ({ ...p, checkin_max_passengers: e.target.value }))} />
              </div>
            )}

            {(form.checkin_sections || []).includes('waiver') && (
              <div style={{ marginBottom: '1.1rem' }}>
                <L>Waiver Text</L>
                <textarea style={{ ...inp, height: '140px', resize: 'vertical' }}
                  value={form.checkin_waiver_text}
                  onChange={e => setForm(p => ({ ...p, checkin_waiver_text: e.target.value }))}
                  placeholder="Paste the liability waiver text participants will read and agree to…" />
              </div>
            )}

            {(form.checkin_sections || []).includes('lunch') && (
              <div style={{ marginBottom: '1.1rem' }}>
                <L>Lunch Cutoff</L>
                <input type="datetime-local" style={{ ...inp, maxWidth: '260px' }} value={form.checkin_lunch_cutoff}
                  onChange={e => setForm(p => ({ ...p, checkin_lunch_cutoff: e.target.value }))} />

                <div style={{ marginTop: '0.85rem' }}>
                  <L>Lunch Options</L>
                  {(form.checkin_lunch_options || []).map((dish, di) => (
                    <div key={dish.id || di} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input style={inp} placeholder="Dish name" value={dish.name || ''}
                        onChange={e => setForm(p => ({ ...p, checkin_lunch_options: p.checkin_lunch_options.map((d, i2) => i2 === di ? { ...d, name: e.target.value } : d) }))} />
                      <input style={inp} placeholder="Description (optional)" value={dish.description || ''}
                        onChange={e => setForm(p => ({ ...p, checkin_lunch_options: p.checkin_lunch_options.map((d, i2) => i2 === di ? { ...d, description: e.target.value } : d) }))} />
                      <DangerBtn small onClick={() => setForm(p => ({ ...p, checkin_lunch_options: p.checkin_lunch_options.filter((_, i2) => i2 !== di) }))}>Remove</DangerBtn>
                    </div>
                  ))}
                  <GhostBtn small onClick={() => setForm(p => ({ ...p, checkin_lunch_options: [...(p.checkin_lunch_options || []), { id: `dish_${Date.now()}_${p.checkin_lunch_options?.length || 0}`, name: '', description: '' }] }))}>
                    + Add Dish
                  </GhostBtn>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
          <PrimaryBtn small disabled={saving} onClick={() => save({
            checkin_sections: form.checkin_sections,
            checkin_max_passengers: form.checkin_max_passengers,
            checkin_waiver_text: form.checkin_waiver_text,
            checkin_lunch_cutoff: form.checkin_lunch_cutoff || null,
            checkin_lunch_options: form.checkin_lunch_options,
          })}>{saving ? 'Saving…' : 'Save Check-in Settings'}</PrimaryBtn>
          {saved && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}
        </div>
        <Err msg={saveError} />
      </div>

      {/* Registrants + live check-in status — same component EventsClient.jsx uses */}
      {form.checkin_enabled && (
        <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <CheckinStatusClient eventId={eventId} />
        </div>
      )}

      {/* Route Awards categories */}
      <div style={{ padding: '1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Route Awards — Categories</div>

        <div style={{ marginBottom: '1.1rem' }}>
          <L>Categories</L>
          {(form.awards_categories || []).map((cat, ci) => (
            <div key={cat.id || ci} style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input style={inp} placeholder="Category label (e.g. Most Beautiful Car)" value={cat.label || ''}
                  onChange={e => setForm(p => ({ ...p, awards_categories: p.awards_categories.map((c, i2) => i2 === ci ? { ...c, label: e.target.value } : c) }))} />
                <input type="number" min="0" max="100" style={inp} placeholder="% off" value={cat.discount_pct ?? ''}
                  onChange={e => setForm(p => ({ ...p, awards_categories: p.awards_categories.map((c, i2) => i2 === ci ? { ...c, discount_pct: e.target.value === '' ? null : parseInt(e.target.value) } : c) }))} />
                <DangerBtn small onClick={() => setForm(p => ({ ...p, awards_categories: p.awards_categories.filter((_, i2) => i2 !== ci) }))}>Remove</DangerBtn>
              </div>
              <textarea style={{ ...inp, height: '60px', resize: 'vertical' }} placeholder="Short description shown to voters (optional)" value={cat.body || ''}
                onChange={e => setForm(p => ({ ...p, awards_categories: p.awards_categories.map((c, i2) => i2 === ci ? { ...c, body: e.target.value } : c) }))} />
            </div>
          ))}
          <GhostBtn small onClick={() => setForm(p => ({
            ...p,
            awards_categories: [...(p.awards_categories || []), { id: `cat_${Date.now()}_${p.awards_categories?.length || 0}`, label: '', body: '', discount_pct: null }],
          }))}>
            + Add Category
          </GhostBtn>
        </div>

        <div style={{ marginBottom: '1.1rem' }}>
          <L>Ineligible Names</L>
          <input style={inp} placeholder="e.g. Jerry — separate with commas"
            value={(form.awards_ineligible_names || []).join(', ')}
            onChange={e => setForm(p => ({ ...p, awards_ineligible_names: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '0.3rem' }}>These names are excluded from every candidate list — e.g. the event organizer.</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <PrimaryBtn small disabled={saving} onClick={() => save({
            awards_categories: form.awards_categories,
            awards_ineligible_names: form.awards_ineligible_names,
          })}>{saving ? 'Saving…' : 'Save Awards Categories'}</PrimaryBtn>
        </div>
      </div>

      {/* Voting toggle + live tallies — same component EventsClient.jsx uses */}
      <AwardsTallyClient eventId={eventId} />
    </div>
  )
}
