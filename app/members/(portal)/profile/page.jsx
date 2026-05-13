'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase/client'

const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const selectStyle = { ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }

export default function ProfilePage() {
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', car_year: '', car_make: '', car_model: '' })
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedPw, setSavedPw] = useState(false)
  const [error, setError] = useState(null)
  const [pwError, setPwError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const { data } = await supabase.from('members').select('*').eq('id', user.id).single()
      if (data) setForm({ name: data.name || '', phone: data.phone || '', car_year: data.car_year || '', car_make: data.car_make || '', car_model: data.car_model || '' })
    }
    load()
  }, [])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    const { error } = await supabase.from('members').update({ ...form }).eq('id', user.id)
    setSaving(false)
    if (error) setError('Could not save. Please try again.')
    else setSaved(true)
  }

  async function savePassword(e) {
    e.preventDefault()
    if (pwForm.password !== pwForm.confirm) { setPwError('Passwords do not match.'); return }
    if (pwForm.password.length < 8) { setPwError('Minimum 8 characters.'); return }
    setSavingPw(true); setPwError(null); setSavedPw(false)
    const { error } = await supabase.auth.updateUser({ password: pwForm.password })
    setSavingPw(false)
    if (error) setPwError('Could not update password.')
    else { setSavedPw(true); setPwForm({ password: '', confirm: '' }) }
  }

  return (
    <div>
      <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Account</div>
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.4rem', fontWeight: '300', color: '#1a1a1a' }}>Your Profile</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>

        {/* Profile Info */}
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem' }}>Personal Info</div>
          <form onSubmit={saveProfile}>
            <Field label="Email">
              <input type="email" value={user?.email || ''} disabled
                style={{ ...inputStyle, background: 'rgba(0,0,0,0.03)', color: '#999', cursor: 'not-allowed' }} />
            </Field>
            <Field label="Full Name">
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                maxLength={100} style={inputStyle} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                maxLength={20} style={inputStyle} />
            </Field>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '1.5rem 0 1rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>Your Car</div>
            <Field label="Year">
              <div style={{ position: 'relative' }}>
                <select value={form.car_year} onChange={e => setForm(p => ({ ...p, car_year: e.target.value }))} style={selectStyle}>
                  <option value="">Select year</option>
                  {CAR_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </Field>
            <Field label="Make">
              <input type="text" value={form.car_make} onChange={e => setForm(p => ({ ...p, car_make: e.target.value }))}
                placeholder="e.g. Porsche" maxLength={50} style={inputStyle} />
            </Field>
            <Field label="Model">
              <input type="text" value={form.car_model} onChange={e => setForm(p => ({ ...p, car_model: e.target.value }))}
                placeholder="e.g. 911 Carrera" maxLength={100} style={inputStyle} />
            </Field>
            {error && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.75rem' }}>{error}</div>}
            {saved && <div style={{ fontSize: '12px', color: '#3B6B2F', marginBottom: '0.75rem' }}>Saved.</div>}
            <button type="submit" disabled={saving}
              style={{ padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem' }}>Change Password</div>
          <form onSubmit={savePassword}>
            <Field label="New Password">
              <input type="password" value={pwForm.password} onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
                minLength={8} autoComplete="new-password" style={inputStyle} />
            </Field>
            <Field label="Confirm Password">
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                minLength={8} autoComplete="new-password" style={inputStyle} />
            </Field>
            {pwError && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.75rem' }}>{pwError}</div>}
            {savedPw && <div style={{ fontSize: '12px', color: '#3B6B2F', marginBottom: '0.75rem' }}>Password updated.</div>}
            <button type="submit" disabled={savingPw}
              style={{ padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: savingPw ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: savingPw ? 0.6 : 1 }}>
              {savingPw ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
