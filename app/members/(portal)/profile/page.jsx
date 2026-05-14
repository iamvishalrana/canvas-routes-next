'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'

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
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', dob_day: '', dob_month: '', dob_year: '', car_year: '', car_make: '', car_model: '' })

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DOB_YEARS = Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })

  const pwRules = [
    { label: 'At least 8 characters', pass: pwForm.password.length >= 8 },
    { label: 'Under 72 characters', pass: pwForm.password.length > 0 && pwForm.password.length <= 72 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(pwForm.password) },
    { label: 'One number', pass: /[0-9]/.test(pwForm.password) },
  ]
  const pwAllPass = pwRules.every(r => r.pass)
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedPw, setSavedPw] = useState(false)
  const [error, setError] = useState(null)
  const [pwError, setPwError] = useState(null)

  useEffect(() => {
    fetch('/api/member/me')
      .then(r => r.json())
      .then(({ user, member }) => {
        if (user) setUser(user)
        if (member) setForm({
          name: member.name || '',
          phone: member.phone || '',
          dob_day: member.dob_day ? String(member.dob_day) : '',
          dob_month: member.dob_month ? String(member.dob_month) : '',
          dob_year: member.dob_year ? String(member.dob_year) : '',
          car_year: member.car_year || '',
          car_make: member.car_make || '',
          car_model: member.car_model || '',
        })
      })
  }, [])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    const res = await fetch('/api/member/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        dob_day: form.dob_day ? parseInt(form.dob_day) : null,
        dob_month: form.dob_month ? parseInt(form.dob_month) : null,
        dob_year: form.dob_year ? parseInt(form.dob_year) : null,
      }),
    })
    setSaving(false)
    if (!res.ok) setError('Could not save. Please try again.')
    else setSaved(true)
  }

  async function savePassword(e) {
    e.preventDefault()
    if (!pwAllPass) { setPwError('Please meet all password requirements.'); return }
    if (pwForm.password !== pwForm.confirm) { setPwError('Passwords do not match.'); return }
    setSavingPw(true); setPwError(null); setSavedPw(false)
    const res = await fetch('/api/member/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwForm.password }),
    })
    const data = await res.json()
    setSavingPw(false)
    if (!res.ok) setPwError(data.error || 'Could not update password.')
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
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '1.5rem 0 1rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>Date of Birth</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Month *</label>
                <div style={{ position: 'relative' }}>
                  <select value={form.dob_month} onChange={e => setForm(p => ({ ...p, dob_month: e.target.value }))} style={selectStyle} required>
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Day *</label>
                <div style={{ position: 'relative' }}>
                  <select value={form.dob_day} onChange={e => setForm(p => ({ ...p, dob_day: e.target.value }))} style={selectStyle} required>
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={form.dob_year} onChange={e => setForm(p => ({ ...p, dob_year: e.target.value }))} style={selectStyle}>
                    <option value="">Optional</option>
                    {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>
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
            {pwForm.password.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {pwRules.map(r => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: r.pass ? '#3B6B2F' : '#aaa' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: r.pass ? '#3B6B2F' : '#ccc', flexShrink: 0 }} />
                    {r.label}
                  </div>
                ))}
              </div>
            )}
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
