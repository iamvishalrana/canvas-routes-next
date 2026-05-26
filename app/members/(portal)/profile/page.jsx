'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'

const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOB_YEARS = Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i)
const EMPTY_CAR = { year: '', make: '', model: '', license_plate: '' }

const inp = {
  width: '100%', padding: '0.88rem 1rem',
  border: '0.5px solid rgba(0,0,0,0.16)', background: '#fff',
  fontSize: '13px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const sel = { ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }

function FieldLabel({ children }) {
  return <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.45rem', fontFamily: 'var(--font-inter), sans-serif' }}>{children}</div>
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function SelectWrap({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} style={sel} className="cr-select">{children}</select>
      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  )
}

function SectionDivider({ children, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#aaa', margin: '1.5rem 0 0.85rem', fontFamily: 'var(--font-inter), sans-serif' }}>
      {children}
      {extra && <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>{extra}</span>}
    </div>
  )
}

function PhotoSection({ carPhotoUrl, photoUploading, photoError, fileInputRef, onUpload }) {
  return (
    <div style={{ marginTop: '1.75rem' }}>
      <SectionDivider>Car Photo</SectionDivider>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onUpload} />
      {carPhotoUrl ? (
        <div style={{ position: 'relative', lineHeight: 0, marginBottom: '0.85rem' }}>
          <img src={carPhotoUrl} alt="Your car" style={{ width: '100%', maxHeight: '230px', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,30,20,0.45) 0%, transparent 55%)', pointerEvents: 'none' }} />
        </div>
      ) : (
        <div
          className="photo-empty"
          onClick={() => !photoUploading && fileInputRef.current?.click()}
          style={{
            marginBottom: '0.85rem', height: '150px',
            border: '0.5px dashed rgba(197,168,130,0.28)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(197,168,130,0.02)', cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s', gap: '0.65rem',
          }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.45)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/>
            <rect x="11" y="13" width="10" height="8" rx="2"/>
            <circle cx="7.5" cy="17.5" r="1.5"/>
            <circle cx="17.5" cy="17.5" r="1.5"/>
          </svg>
          <span style={{ fontSize: '12px', color: '#ccc', letterSpacing: '0.04em', fontFamily: 'var(--font-inter), sans-serif' }}>No photo yet — tap to upload</span>
        </div>
      )}
      {photoError && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.65rem' }}>{photoError}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={photoUploading}
          style={{ padding: '0.75rem 1.5rem', background: 'none', color: '#555', border: '0.5px solid rgba(0,0,0,0.18)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: photoUploading ? 'wait' : 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: photoUploading ? 0.6 : 1 }}>
          {photoUploading ? 'Uploading…' : carPhotoUrl ? 'Change Photo' : 'Upload Photo'}
        </button>
        <span style={{ fontSize: '11px', color: '#ccc' }}>Max 8 MB</span>
      </div>
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

  useEffect(() => { document.title = 'Your Profile — Canvas Routes' }, [])

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

  function formatPhone(v) {
    let d = v.replace(/\D/g, '')
    if (d.startsWith('1') && d.length > 1) d = d.slice(1)
    d = d.slice(0, 10)
    if (!d) return ''
    const p = '+1 '
    if (d.length <= 3) return p + d
    if (d.length <= 6) return `${p}(${d.slice(0,3)}) ${d.slice(3)}`
    return `${p}(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`
  }

  function startEditing() {
    savedForm.current = { ...form }
    savedCars.current = cars.map(c => ({ ...c }))
    setEditing(true); setSaved(false); setError(null)
  }

  function cancelEditing() {
    if (savedForm.current) setForm(savedForm.current)
    if (savedCars.current) setCars(savedCars.current)
    setEditing(false); setError(null); setSaved(false)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
    setPhotoUploading(true); setPhotoError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/member/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setCarPhotoUrl(data.url)
      else setPhotoError(data.error || 'Upload failed.')
    } catch {
      setPhotoError('Upload failed. Please check your connection.')
    } finally {
      setPhotoUploading(false)
    }
  }

  const hasCar = cars.some(c => c.year || c.make || c.model || c.license_plate)
  const dobDisplay = form.dob_month
    ? `${MONTHS_SHORT[parseInt(form.dob_month) - 1]} ${form.dob_day}${form.dob_year ? `, ${form.dob_year}` : ''}`
    : null

  const displayName = form.name || (user?.email ? user.email.split('@')[0] : '')
  const initials = displayName.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const isInnerCircle = tier === 'inner_circle'

  return (
    <div>
      <style>{`
        .cr-input:focus, .cr-select:focus {
          border-color: rgba(197,168,130,0.55) !important;
          box-shadow: 0 0 0 2.5px rgba(197,168,130,0.08);
        }
        .info-row:hover { background: rgba(197,168,130,0.025); }
        .car-view-card:hover { border-color: rgba(197,168,130,0.35) !important; }
        .photo-empty:hover { border-color: rgba(197,168,130,0.45) !important; background: rgba(197,168,130,0.04) !important; }
        .pw-toggle:hover { background: rgba(0,0,0,0.01) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '3rem', paddingBottom: '2.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '50%', flexShrink: 0,
            background: isInnerCircle
              ? 'linear-gradient(135deg, #c5a882, #a8885f)'
              : 'linear-gradient(135deg, #243328, #0F1E14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isInnerCircle ? '0 3px 14px rgba(197,168,130,0.28)' : '0 3px 14px rgba(15,30,20,0.22)',
            marginTop: '3px',
          }}>
            <span style={{ fontSize: '16px', color: '#fff', fontFamily: 'var(--font-inter), sans-serif', fontWeight: '400', letterSpacing: '0.05em' }}>{initials}</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.34em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem', fontFamily: 'var(--font-inter), sans-serif' }}>
              Canvas Routes &mdash; Season 2026
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: isMobile ? '2rem' : '2.5rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1, marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>
              {form.name || (user?.email ? user.email.split('@')[0] : 'Your Profile')}
            </div>
            {user?.email && (
              <div style={{ fontSize: '12px', color: '#bbb', letterSpacing: '0.03em', marginBottom: '0.6rem' }}>{user.email}</div>
            )}
            {tier && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
                padding: '0.28rem 0.9rem',
                border: isInnerCircle ? '0.5px solid rgba(197,168,130,0.5)' : '0.5px solid rgba(197,168,130,0.25)',
                background: isInnerCircle ? 'rgba(197,168,130,0.09)' : 'transparent',
                color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif',
              }}>
                {isInnerCircle ? 'Inner Circle' : 'Routes Member'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '2.5rem' : '4rem', alignItems: 'start' }}>

        {/* ── Left: Profile Info ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'var(--font-inter), sans-serif' }}>Personal Info</div>
            {!editing && (
              <button onClick={startEditing}
                style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.38rem 1rem', cursor: 'pointer', color: '#666', fontFamily: 'var(--font-inter), sans-serif' }}>
                Edit
              </button>
            )}
          </div>

          {!editing ? (
            /* ── View mode ── */
            <div>
              {[
                { label: 'Email', value: user?.email },
                { label: 'Name', value: form.name || null },
                { label: 'Phone', value: form.phone || null },
                { label: 'Instagram', value: form.instagram ? `@${form.instagram.replace(/^@/, '')}` : null },
                { label: 'Birthday', value: dobDisplay },
              ].map(row => row.value ? (
                <div key={row.label} className="info-row" style={{
                  display: 'flex', gap: '1rem', alignItems: 'baseline',
                  padding: '0.88rem 0.5rem',
                  borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                  margin: '0 -0.5rem',
                  transition: 'background 0.12s',
                }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ccc', minWidth: '82px', flexShrink: 0, fontFamily: 'var(--font-inter), sans-serif' }}>{row.label}</div>
                  <div style={{ fontSize: '13px', color: '#1a1a1a', letterSpacing: '0.01em' }}>{row.value}</div>
                </div>
              ) : null)}

              {hasCar && (
                <>
                  <SectionDivider>Your Cars</SectionDivider>
                  {cars.filter(c => c.year || c.make || c.model || c.license_plate).map((car, i) => (
                    <div key={i} className="car-view-card" style={{
                      display: 'flex', alignItems: 'center', gap: '0.9rem',
                      padding: '0.9rem 1rem', marginBottom: '0.5rem',
                      border: '0.5px solid rgba(0,0,0,0.08)',
                      background: 'rgba(197,168,130,0.025)',
                      transition: 'border-color 0.15s',
                    }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/>
                        <rect x="11" y="13" width="10" height="8" rx="2"/>
                        <circle cx="7.5" cy="17.5" r="1.5"/>
                        <circle cx="17.5" cy="17.5" r="1.5"/>
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#1a1a1a', letterSpacing: '0.02em' }}>
                          {[car.year, car.make, car.model].filter(Boolean).map((p, pi) => (
                            <span key={pi}>
                              {pi > 0 && <span style={{ color: '#c5a882', margin: '0 0.3rem', fontSize: '9px' }}>·</span>}
                              {p}
                            </span>
                          ))}
                        </div>
                        {car.license_plate && (
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginTop: '0.15rem' }}>{car.license_plate}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Car photo in view mode */}
              <PhotoSection carPhotoUrl={carPhotoUrl} photoUploading={photoUploading} photoError={photoError} fileInputRef={fileInputRef} onUpload={handlePhotoUpload} />

              {!form.name && !form.phone && !dobDisplay && !hasCar && (
                <div style={{ fontSize: '13px', color: '#bbb', paddingTop: '0.5rem', lineHeight: 1.75 }}>
                  No profile info yet. Click Edit to add your details.
                </div>
              )}

              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: '#3B6B2F', marginTop: '1.25rem' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Changes saved.
                </div>
              )}
            </div>
          ) : (
            /* ── Edit mode ── */
            <form onSubmit={saveProfile}>
              <Field label="Email">
                <input type="email" value={user?.email || ''} disabled
                  style={{ ...inp, background: 'rgba(0,0,0,0.02)', color: '#bbb', cursor: 'not-allowed', borderColor: 'rgba(0,0,0,0.08)' }} />
              </Field>
              <Field label="Full Name">
                <input className="cr-input" type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                  maxLength={100} autoCapitalize="words" style={inp} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Phone">
                  <input className="cr-input" type="tel" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                    placeholder="+1 (514) 000-0000" maxLength={18} style={inp} />
                </Field>
                <Field label="Instagram">
                  <input className="cr-input" type="text" value={form.instagram}
                    onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                    maxLength={50} placeholder="@yourhandle" style={inp} />
                </Field>
              </div>

              <SectionDivider>Date of Birth</SectionDivider>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <FieldLabel>Month</FieldLabel>
                  <SelectWrap value={form.dob_month} onChange={e => setForm(p => ({ ...p, dob_month: e.target.value }))}>
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <FieldLabel>Day</FieldLabel>
                  <SelectWrap value={form.dob_day} onChange={e => setForm(p => ({ ...p, dob_day: e.target.value }))}>
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                  </SelectWrap>
                </div>
                <div>
                  <FieldLabel>Year</FieldLabel>
                  <SelectWrap value={form.dob_year} onChange={e => setForm(p => ({ ...p, dob_year: e.target.value }))}>
                    <option value="">Optional</option>
                    {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </SelectWrap>
                </div>
              </div>

              <SectionDivider extra={`(${cars.length}/5)`}>Your Cars</SectionDivider>

              {cars.map((car, idx) => (
                <div key={idx} style={{ border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.2rem', marginBottom: '0.65rem', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ccc', fontFamily: 'var(--font-inter), sans-serif' }}>Car {idx + 1}</div>
                    {(cars.length > 1 || car.year || car.make || car.model || car.license_plate) && (
                      <button type="button" onClick={() => removeCar(idx)}
                        style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B2032', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: 0.75 }}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    {[['Year', 'year', true], ['Make', 'make', false], ['Model', 'model', false], ['Plate', 'license_plate', false]].map(([label, field, isSelect]) => (
                      <div key={field}>
                        <FieldLabel>{label}</FieldLabel>
                        {isSelect ? (
                          <SelectWrap value={car.year} onChange={e => updateCar(idx, 'year', e.target.value)}>
                            <option value="">Select</option>
                            {CAR_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                          </SelectWrap>
                        ) : (
                          <input className="cr-input" type="text" value={car[field]}
                            onChange={e => updateCar(idx, field, e.target.value)}
                            placeholder={field === 'make' ? 'e.g. Porsche' : field === 'model' ? 'e.g. 911' : 'ABC-123'}
                            maxLength={field === 'license_plate' ? 15 : 100}
                            style={{ ...inp, ...(field === 'license_plate' ? { textTransform: 'uppercase' } : {}) }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {cars.length < 5 && (
                <button type="button" onClick={addCar}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.35)', padding: '0.55rem 1.1rem', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '0.5rem' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Car
                </button>
              )}

              {/* Car photo in edit mode */}
              <PhotoSection carPhotoUrl={carPhotoUrl} photoUploading={photoUploading} photoError={photoError} fileInputRef={fileInputRef} onUpload={handlePhotoUpload} />

              {error && <div style={{ fontSize: '12px', color: '#7B2032', margin: '0.75rem 0' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="submit" disabled={saving}
                  style={{ padding: '0.9rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={cancelEditing} disabled={saving}
                  style={{ padding: '0.9rem 1.5rem', background: 'none', color: '#888', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Right: Password ── */}
        <div>
          <div style={{ border: '0.5px solid rgba(0,0,0,0.09)', overflow: 'hidden', background: '#fff' }}>
            <button
              type="button"
              className="pw-toggle"
              onClick={() => { setPwOpen(o => !o); setPwError(null); setSavedPw(false); setPwForm({ password: '', confirm: '' }) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', textAlign: 'left', transition: 'background 0.1s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555' }}>Change Password</span>
              </div>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: pwOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {pwOpen && (
              <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', padding: '1.4rem 1.25rem', background: 'rgba(250,250,248,0.8)' }}>
                <form onSubmit={savePassword}>
                  <Field label="New Password">
                    <input className="cr-input" type="password" value={pwForm.password}
                      onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
                      minLength={8} autoComplete="new-password" style={inp} />
                  </Field>
                  {pwForm.password.length > 0 && (
                    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {pwRules.map(r => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: r.pass ? '#3B6B2F' : '#bbb', transition: 'color 0.15s' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: r.pass ? '#3B6B2F' : '#ddd', flexShrink: 0, transition: 'background 0.15s' }} />
                          {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                  <Field label="Confirm Password">
                    <input className="cr-input" type="password" value={pwForm.confirm}
                      onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                      minLength={8} autoComplete="new-password" style={inp} />
                  </Field>
                  {pwError && <div style={{ fontSize: '12px', color: '#7B2032', marginBottom: '0.75rem' }}>{pwError}</div>}
                  {savedPw && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: '#3B6B2F', marginBottom: '0.75rem' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Password updated.
                    </div>
                  )}
                  <button type="submit" disabled={savingPw}
                    style={{ padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: savingPw ? 'wait' : 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: savingPw ? 0.6 : 1 }}>
                    {savingPw ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
