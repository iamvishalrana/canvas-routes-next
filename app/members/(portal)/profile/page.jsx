'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'

const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOB_YEARS = Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i)
const EMPTY_CAR = { year: '', make: '', model: '', license_plate: '' }

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>{label}</label>
      {children}
    </div>
  )
}

const inp = { width: '100%', padding: '0.85rem 1rem', border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const sel = { ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }

function SelectWrap({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} style={sel}>{children}</select>
      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ padding: '0.85rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', minWidth: '90px', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{value}</div>
    </div>
  )
}

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', instagram: '', dob_day: '', dob_month: '', dob_year: '' })
  const [cars, setCars] = useState([{ ...EMPTY_CAR }])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const savedForm = useRef(null)
  const savedCars = useRef(null)

  const [tier, setTier] = useState(null)

  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const pwRules = [
    { label: 'At least 8 characters', pass: pwForm.password.length >= 8 },
    { label: 'Under 72 characters', pass: pwForm.password.length > 0 && pwForm.password.length <= 72 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(pwForm.password) },
    { label: 'One number', pass: /[0-9]/.test(pwForm.password) },
  ]
  const pwAllPass = pwRules.every(r => r.pass)
  const [savingPw, setSavingPw] = useState(false)
  const [savedPw, setSavedPw] = useState(false)
  const [pwError, setPwError] = useState(null)

  const [carPhotoUrl, setCarPhotoUrl] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/member/me')
      .then(r => r.json())
      .then(({ user, member }) => {
        if (user) setUser(user)
        if (member) {
          const f = {
            name: member.name || '',
            phone: member.phone || '',
            instagram: member.instagram || '',
            dob_day: member.dob_day ? String(member.dob_day) : '',
            dob_month: member.dob_month ? String(member.dob_month) : '',
            dob_year: member.dob_year ? String(member.dob_year) : '',
          }
          const c = member.cars?.length > 0
            ? member.cars
            : (member.car_year || member.car_make || member.car_model)
              ? [{ year: member.car_year || '', make: member.car_make || '', model: member.car_model || '', license_plate: '' }]
              : [{ ...EMPTY_CAR }]
          setForm(f)
          setCars(c)
          savedForm.current = f
          savedCars.current = c
          if (member?.car_photo_url) setCarPhotoUrl(member.car_photo_url)
          if (member?.tier) setTier(member.tier)
        }
      })
  }, [])

  function startEditing() {
    savedForm.current = { ...form }
    savedCars.current = cars.map(c => ({ ...c }))
    setEditing(true)
    setSaved(false)
    setError(null)
  }

  function cancelEditing() {
    if (savedForm.current) setForm(savedForm.current)
    if (savedCars.current) setCars(savedCars.current)
    setEditing(false)
    setError(null)
  }

  function updateCar(idx, field, value) {
    setCars(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  function addCar() {
    if (cars.length >= 5) return
    setCars(prev => [...prev, { ...EMPTY_CAR }])
  }

  function removeCar(idx) {
    setCars(prev => prev.length === 1 ? [{ ...EMPTY_CAR }] : prev.filter((_, i) => i !== idx))
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    const cleanCars = cars.filter(c => c.year || c.make || c.model || c.license_plate)
    const res = await fetch('/api/member/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        dob_day: form.dob_day ? parseInt(form.dob_day) : null,
        dob_month: form.dob_month ? parseInt(form.dob_month) : null,
        dob_year: form.dob_year ? parseInt(form.dob_year) : null,
        cars: cleanCars,
        car_year: cleanCars[0]?.year || '',
        car_make: cleanCars[0]?.make || '',
        car_model: cleanCars[0]?.model || '',
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Could not save. Please try again.')
    } else {
      setSaved(true)
      savedForm.current = { ...form }
      savedCars.current = cars.map(c => ({ ...c }))
      setEditing(false)
    }
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

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true); setPhotoError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/member/photo', { method: 'POST', body: fd })
    const data = await res.json()
    setPhotoUploading(false)
    if (res.ok) setCarPhotoUrl(data.url)
    else setPhotoError(data.error || 'Upload failed.')
  }

  const sectionLabel = { fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', margin: '1.5rem 0 1rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(0,0,0,0.08)' }

  const hasCar = cars.some(c => c.year || c.make || c.model || c.license_plate)
  const dobDisplay = form.dob_month
    ? `${MONTHS_SHORT[parseInt(form.dob_month) - 1]} ${form.dob_day}${form.dob_year ? `, ${form.dob_year}` : ''}`
    : null

  return (
    <div>
      {tier && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.85rem 1.25rem',
          background: tier === 'inner_circle' ? 'linear-gradient(90deg, rgba(197,168,130,0.12), rgba(197,168,130,0.06))' : 'rgba(0,0,0,0.03)',
          border: tier === 'inner_circle' ? '0.5px solid rgba(197,168,130,0.35)' : '0.5px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2px', height: '20px', background: tier === 'inner_circle' ? '#c5a882' : 'rgba(0,0,0,0.15)' }} />
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: tier === 'inner_circle' ? '#c5a882' : '#bbb', marginBottom: '0.15rem' }}>Canvas Routes</div>
              <div style={{ fontSize: '13px', color: tier === 'inner_circle' ? '#7B5B2E' : '#555', letterSpacing: '0.04em' }}>
                {tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'}
              </div>
            </div>
          </div>
          {tier === 'inner_circle' && (
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', textAlign: 'right' }}>
              Season 2026<br />
              <span style={{ color: 'rgba(197,168,130,0.4)' }}>June — December</span>
            </div>
          )}
          {tier === 'routes_member' && (
            <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', textAlign: 'right' }}>
              Season 2026<br />
              <span style={{ color: '#ccc' }}>June — November</span>
            </div>
          )}
        </div>
      )}
      <div style={{ marginBottom: isMobile ? '2rem' : '3rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Account</div>
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: '300', color: '#1a1a1a' }}>Your Profile</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '2.5rem' : '4rem', alignItems: 'start' }}>

        {/* Profile Info */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888' }}>Personal Info</div>
            {!editing && (
              <button onClick={startEditing}
                style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(0,0,0,0.25)', padding: '0.35rem 0.9rem', cursor: 'pointer', color: '#555', fontFamily: 'var(--font-inter),sans-serif' }}>
                Edit
              </button>
            )}
          </div>

          {!editing ? (
            /* ── VIEW MODE ── */
            <div>
              <InfoRow label="Email" value={user?.email} />
              <InfoRow label="Name" value={form.name ? form.name.charAt(0).toUpperCase() + form.name.slice(1) : null} />
              <InfoRow label="Phone" value={form.phone || null} />
              <InfoRow label="Instagram" value={form.instagram ? `@${form.instagram.replace(/^@/, '')}` : null} />
              <InfoRow label="Birthday" value={dobDisplay} />

              {hasCar && (
                <>
                  <div style={{ ...sectionLabel, marginTop: '1.5rem' }}>Your Cars</div>
                  {cars.filter(c => c.year || c.make || c.model || c.license_plate).map((car, i) => (
                    <div key={i} style={{ padding: '0.85rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                      <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>
                        {[car.year, car.make, car.model].filter(Boolean).join(' ') || 'Unnamed car'}
                      </div>
                      {car.license_plate && (
                        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginTop: '0.2rem' }}>
                          {car.license_plate}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {!form.name && !form.phone && !dobDisplay && !hasCar && (
                <div style={{ fontSize: '13px', color: '#aaa', paddingTop: '0.5rem' }}>No profile info saved yet. Click Edit to add your details.</div>
              )}

              {saved && <div style={{ fontSize: '12px', color: '#3B6B2F', marginTop: '1rem' }}>Changes saved.</div>}
            </div>
          ) : (
            /* ── EDIT MODE ── */
            <form onSubmit={saveProfile}>
              <Field label="Email">
                <input type="email" value={user?.email || ''} disabled
                  style={{ ...inp, background: 'rgba(0,0,0,0.03)', color: '#999', cursor: 'not-allowed' }} />
              </Field>
              <Field label="Full Name">
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  maxLength={100} autoCapitalize="words" style={{ ...inp, textTransform: 'capitalize' }} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Phone">
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    maxLength={20} style={inp} />
                </Field>
                <Field label="Instagram">
                  <input type="text" value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                    maxLength={50} placeholder="@yourhandle" style={inp} />
                </Field>
              </div>

              <div style={sectionLabel}>Date of Birth</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Month</label>
                  <SelectWrap value={form.dob_month} onChange={e => setForm(p => ({ ...p, dob_month: e.target.value }))}>
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Day</label>
                  <SelectWrap value={form.dob_day} onChange={e => setForm(p => ({ ...p, dob_day: e.target.value }))}>
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Year</label>
                  <SelectWrap value={form.dob_year} onChange={e => setForm(p => ({ ...p, dob_year: e.target.value }))}>
                    <option value="">Optional</option>
                    {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </SelectWrap>
                </div>
              </div>

              <div style={sectionLabel}>Your Cars <span style={{ color: '#bbb', fontWeight: '300', textTransform: 'none', letterSpacing: 0 }}>({cars.length}/5)</span></div>

              {cars.map((car, idx) => (
                <div key={idx} style={{ border: '0.5px solid rgba(0,0,0,0.12)', padding: '1.1rem', marginBottom: '0.75rem', background: '#fafaf9', position: 'relative' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.75rem' }}>Car {idx + 1}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem' }}>Year</label>
                      <SelectWrap value={car.year} onChange={e => updateCar(idx, 'year', e.target.value)}>
                        <option value="">Select year</option>
                        {CAR_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </SelectWrap>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem' }}>Make</label>
                      <input type="text" value={car.make} onChange={e => updateCar(idx, 'make', e.target.value)}
                        placeholder="e.g. Porsche" maxLength={50} style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem' }}>Model</label>
                      <input type="text" value={car.model} onChange={e => updateCar(idx, 'model', e.target.value)}
                        placeholder="e.g. 911 Carrera" maxLength={100} style={inp} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem' }}>License Plate</label>
                      <input type="text" value={car.license_plate} onChange={e => updateCar(idx, 'license_plate', e.target.value)}
                        placeholder="e.g. ABC-123" maxLength={15} style={{ ...inp, textTransform: 'uppercase' }} />
                    </div>
                  </div>
                  {(cars.length > 1 || car.year || car.make || car.model || car.license_plate) && (
                    <button type="button" onClick={() => removeCar(idx)}
                      style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B2032', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {cars.length < 5 && (
                <button type="button" onClick={addCar}
                  style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.4)', padding: '0.55rem 1rem', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '1.25rem' }}>
                  + Add Car
                </button>
              )}

              {error && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.75rem' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={saving}
                  style={{ padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={cancelEditing} disabled={saving}
                  style={{ padding: '0.85rem 1.5rem', background: 'none', color: '#888', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Change Password — collapsible tile */}
        <div>
          <button
            type="button"
            onClick={() => { setPwOpen(o => !o); setPwError(null); setSavedPw(false); setPwForm({ password: '', confirm: '' }) }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left' }}
          >
            <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555' }}>Change Password</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: pwOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {pwOpen && (
            <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderTop: 'none', padding: '1.5rem 1.25rem', background: '#fafaf9' }}>
              <form onSubmit={savePassword}>
                <Field label="New Password">
                  <input type="password" value={pwForm.password} onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
                    minLength={8} autoComplete="new-password" style={inp} />
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
                    minLength={8} autoComplete="new-password" style={inp} />
                </Field>
                {pwError && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.75rem' }}>{pwError}</div>}
                {savedPw && <div style={{ fontSize: '12px', color: '#3B6B2F', marginBottom: '0.75rem' }}>Password updated.</div>}
                <button type="submit" disabled={savingPw}
                  style={{ padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: savingPw ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: savingPw ? 0.6 : 1 }}>
                  {savingPw ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* Photo with your car */}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', cursor: 'default', fontFamily: 'var(--font-inter),sans-serif', textAlign: 'left' }}
            >
              <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555' }}>Photo with your car</span>
            </button>
            <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderTop: 'none', padding: '1.5rem 1.25rem', background: '#fafaf9' }}>
              {carPhotoUrl ? (
                <div style={{ marginBottom: '1rem' }}>
                  <img src={carPhotoUrl} alt="Your car" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{ marginBottom: '1rem', height: '140px', border: '0.5px dashed rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f2' }}>
                  <span style={{ fontSize: '12px', color: '#bbb', letterSpacing: '0.06em' }}>No photo yet</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              {photoError && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.75rem' }}>{photoError}</div>}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                style={{ padding: '0.75rem 1.5rem', background: 'none', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: photoUploading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: photoUploading ? 0.6 : 1 }}
              >
                {photoUploading ? 'Uploading…' : carPhotoUrl ? 'Change photo' : 'Upload photo'}
              </button>
              <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.6rem' }}>A photo of you with your car. Max 8 MB.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
