'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import CountUp from '../../../../components/CountUp'
import { MONTREAL_TZ } from '../../../../lib/mtlTime'

const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOB_YEARS = Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i)
const EMPTY_CAR = { year: '', make: '', model: '', license_plate: '', paint: '', mods: [], photo_url: null }

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

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', instagram: '', instagram_opted_out: false, dob_day: '', dob_month: '', dob_year: '' })
  const [cars, setCars] = useState([{ ...EMPTY_CAR }])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const savedForm = useRef(null)
  const savedCars = useRef(null)

  const [tier, setTier] = useState(null)
  const [stats, setStats] = useState(null)
  const [membershipNumber, setMembershipNumber] = useState(null)
  const editAnchorRef = useRef(null)

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

  const [photoUploadingIdx, setPhotoUploadingIdx] = useState(null)
  const [photoErrors, setPhotoErrors] = useState({})
  const [uploadTargetIdx, setUploadTargetIdx] = useState(null)
  const carFileInputRef = useRef(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const avatarInputRef = useRef(null)

  useEffect(() => { document.title = 'Your Profile — Canvas Routes' }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/member/me')
      .then(r => {
        if (r.status === 401) { window.location.href = '/members/login'; return null }
        if (!r.ok) throw new Error('Failed to load profile')
        return r.json()
      })
      .then(data => {
        if (!data) return
        const { user, member } = data
        if (user) setUser(user)
        if (member) {
          const f = {
            name: member.name || '',
            phone: member.phone || '',
            instagram: member.instagram || '',
            instagram_opted_out: !!member.instagram_opted_out,
            dob_day: member.dob_day ? String(member.dob_day) : '',
            dob_month: member.dob_month ? String(member.dob_month) : '',
            dob_year: member.dob_year ? String(member.dob_year) : '',
          }
          let c = member.cars?.length > 0
            ? member.cars.map(car => ({ paint: '', mods: [], photo_url: null, ...car }))
            : (member.car_year || member.car_make || member.car_model)
              ? [{ ...EMPTY_CAR, year: member.car_year || '', make: member.car_make || '', model: member.car_model || '' }]
              : [{ ...EMPTY_CAR }]
          // Backfill car 0's photo from the legacy shared column for members
          // who uploaded before per-car photos existed.
          if (member?.car_photo_url && !c[0].photo_url) {
            c = c.map((car, i) => i === 0 ? { ...car, photo_url: member.car_photo_url } : car)
          }
          setForm(f)
          setCars(c)
          savedForm.current = f
          savedCars.current = c
          if (member?.profile_photo_url) setAvatarUrl(member.profile_photo_url)
          if (member?.tier) setTier(member.tier)
          if (member?.membership_number) setMembershipNumber(member.membership_number)
        }
        if (data.stats) setStats(data.stats)
      })
      .catch(() => setError('Could not load your profile. Please refresh.'))
  }, [])

  function formatPhone(v) {
    let d = v.replace(/\D/g, '')
    // The '+1 ' prefix echoes back through onChange as a leading 1, and users
    // often type their own country-code 1 on top of it. NANP area codes never
    // start with 1, so every leading 1 is safe to drop.
    while (d.startsWith('1')) d = d.slice(1)
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
    setTimeout(() => editAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  function cancelEditing() {
    if (savedForm.current) setForm(savedForm.current)
    if (savedCars.current) setCars(savedCars.current)
    setEditing(false); setError(null); setSaved(false)
  }

  function updateCar(idx, field, value) {
    if (field === 'model' || field === 'make') value = value.replace(/(^|\s)\S/g, c => c.toUpperCase())
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
    try {
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Could not save. Please try again.')
      } else {
        setSaved(true)
        savedForm.current = { ...form }
        savedCars.current = cars.map(c => ({ ...c }))
        router.refresh()
        setEditing(false)
      }
    } catch {
      setError('Connection error. Please check your network and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (!pwAllPass) { setPwError('Please meet all password requirements.'); return }
    if (pwForm.password !== pwForm.confirm) { setPwError('Passwords do not match.'); return }
    setSavingPw(true); setPwError(null); setSavedPw(false)
    try {
      const res = await fetch('/api/member/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwForm.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setPwError(data.error || 'Could not update password.')
      else { setSavedPw(true); setPwForm({ password: '', confirm: '' }) }
    } catch {
      setPwError('Connection error. Please check your network and try again.')
    } finally {
      setSavingPw(false)
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarInputRef.current) avatarInputRef.current.value = ''
    setAvatarUploading(true); setAvatarError(null)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      fd.append('kind', 'avatar')
      const res = await fetch('/api/member/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setAvatarUrl(data.url)
      else setAvatarError(data.error || 'Upload failed.')
    } catch {
      setAvatarError('Upload failed. Please check your connection.')
    } finally {
      setAvatarUploading(false)
    }
  }

  function triggerCarPhotoUpload(idx) {
    setUploadTargetIdx(idx)
    carFileInputRef.current?.click()
  }

  async function handleCarFileSelected(e) {
    const file = e.target.files?.[0]
    if (carFileInputRef.current) carFileInputRef.current.value = ''
    const idx = uploadTargetIdx
    if (!file || idx === null) return
    setPhotoUploadingIdx(idx); setPhotoErrors(p => ({ ...p, [idx]: null }))
    try {
      const fd = new FormData()
      fd.append('photo', file)
      fd.append('carIndex', String(idx))
      const res = await fetch('/api/member/photo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setCars(prev => prev.map((c, i) => i === idx ? { ...c, photo_url: data.url } : c))
      else setPhotoErrors(p => ({ ...p, [idx]: data.error || 'Upload failed.' }))
    } catch {
      setPhotoErrors(p => ({ ...p, [idx]: 'Upload failed. Please check your connection.' }))
    } finally {
      setPhotoUploadingIdx(null)
    }
  }

  const hasCar = cars.some(c => c.year || c.make || c.model || c.license_plate)
  const dobDisplay = (form.dob_month && form.dob_day)
    ? `${MONTHS_SHORT[parseInt(form.dob_month) - 1]} ${form.dob_day}${form.dob_year ? `, ${form.dob_year}` : ''}`
    : null

  const displayName = form.name || (user?.email ? user.email.split('@')[0] : '')
  const initials = displayName.trim().split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const isInnerCircle = tier === 'inner_circle'

  // Profile completeness — drives the hero progress bar
  const validCarsList = cars.filter(c => c.year || c.make || c.model)
  const primaryCar = validCarsList[0] || null
  const primaryCarIdx = primaryCar ? cars.indexOf(primaryCar) : 0
  const completeness = [
    !!form.name, !!form.phone, !!form.instagram || form.instagram_opted_out,
    !!(form.dob_month && form.dob_day), validCarsList.length > 0, !!primaryCar?.photo_url, !!avatarUrl,
  ]
  const completeCount = completeness.filter(Boolean).length
  const completePct = Math.round((completeCount / completeness.length) * 100)
  const extraCars = validCarsList.slice(1)
  const memberSinceStr = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: MONTREAL_TZ })
    : null
  const igHandle = (form.instagram || '').replace(/^@/, '').trim()

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

        @keyframes cr-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cr-scale-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes cr-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cr-save-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(59,107,47,0.35); }
          70%  { box-shadow: 0 0 0 8px rgba(59,107,47,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,107,47,0); }
        }

        .cr-anim-avatar {
          animation: cr-scale-in 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .cr-anim-header {
          animation: cr-fade-up 0.38s ease both;
          animation-delay: 0.06s;
        }
        .cr-anim-section {
          animation: cr-fade-up 0.35s ease both;
          animation-delay: 0.12s;
        }
        .cr-anim-right {
          animation: cr-fade-up 0.4s ease both;
          animation-delay: 0.18s;
        }
        .cr-save-success {
          animation: cr-save-pulse 0.6s ease-out;
        }
        .cr-anim-avatar:hover {
          filter: brightness(1.08);
          transition: filter 0.2s;
        }

        /* ── Hero / garage / stats cards ── */
        @keyframes ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(197,168,130,0.55); }
          70%  { box-shadow: 0 0 0 7px rgba(197,168,130,0); }
          100% { box-shadow: 0 0 0 0 rgba(197,168,130,0); }
        }
        @keyframes cr-glow-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(15,30,20,1), 0 0 0 4.5px rgba(197,168,130,0.9), 0 0 24px rgba(197,168,130,0.35); }
          50%      { box-shadow: 0 0 0 3px rgba(15,30,20,1), 0 0 0 4.5px rgba(197,168,130,0.9), 0 0 38px rgba(197,168,130,0.6); }
        }
        @keyframes cr-bar-grow {
          from { width: 0; }
        }
        @keyframes cr-shimmer-sweep {
          from { left: -75%; }
          to   { left: 130%; }
        }
        .cr-hero-card    { animation: cr-fade-up 0.45s ease both; }
        .cr-garage-card  { animation: cr-fade-up 0.45s ease both; animation-delay: 0.1s; }
        .cr-stats-card   { animation: cr-fade-up 0.45s ease both; animation-delay: 0.18s; }
        .cr-hero-avatar  {
          animation: cr-scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, cr-glow-pulse 3.6s ease-in-out 0.7s infinite;
        }
        .cr-progress-fill { animation: cr-bar-grow 1.1s cubic-bezier(0.23,1,0.32,1) 0.5s both; }
        .cr-garage-photo img { transition: transform 0.45s cubic-bezier(0.23,1,0.32,1); }
        @media (hover: hover) {
          .cr-garage-photo:hover img { transform: scale(1.025); }
          .cr-hero-pill:hover { background: rgba(245,241,236,0.14) !important; }
          .cr-hero-editbtn:hover { border-color: rgba(197,168,130,0.6) !important; color: #c5a882 !important; }
        }
        .cr-stat-tile { transition: transform 0.15s ease, border-color 0.2s ease; }
        .cr-stat-tile:active { transform: scale(0.98); }
        @media (prefers-reduced-motion: reduce) {
          .cr-hero-card, .cr-garage-card, .cr-stats-card, .cr-hero-avatar,
          .cr-progress-fill, .cr-anim-avatar, .cr-anim-header, .cr-anim-section,
          .cr-anim-right, .cr-garage-photo img {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ── Hero card ── */}
      <div className="cr-hero-card" style={{ background: '#0F1E14', borderRadius: '20px', border: '0.5px solid rgba(197,168,130,0.18)', padding: isMobile ? '1.5rem 1.25rem 1.75rem' : '2rem 2rem 2.25rem', position: 'relative', overflow: 'hidden', marginBottom: '1rem', boxShadow: '0 8px 32px rgba(15,30,20,0.18)' }}>
        {/* Gold hairline top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(197,168,130,0.5), transparent)' }} />

        {/* Season chip + edit button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '8px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', fontFamily: 'var(--font-inter), sans-serif', padding: '0.35rem 0.85rem', border: '0.5px solid rgba(197,168,130,0.25)', borderRadius: '99px' }}>
            Season 2026
          </span>
          <button
            type="button"
            className="cr-hero-editbtn"
            onClick={startEditing}
            aria-label="Edit profile"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '0.5px solid rgba(245,241,236,0.2)', borderRadius: '99px', padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.55)', fontFamily: 'var(--font-inter), sans-serif', transition: 'border-color 0.2s, color 0.2s' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            Edit
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          {/* Glowing avatar — profile photo when set, initials otherwise */}
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          <div style={{ position: 'relative', width: '92px', margin: '0 auto 1.1rem' }}>
            <div className="cr-hero-avatar" style={{
              width: '92px', height: '92px', borderRadius: '50%', overflow: 'hidden',
              background: avatarUrl ? '#16261b' : (isInnerCircle ? 'linear-gradient(135deg, #c5a882, #8A6535)' : 'linear-gradient(135deg, #2c4133, #16261b)'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: avatarUploading ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2rem', fontWeight: '400', color: '#F5F1EC', letterSpacing: '0.04em' }}>{initials}</span>}
            </div>
            <button
              type="button"
              onClick={() => !avatarUploading && avatarInputRef.current?.click()}
              aria-label={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
              style={{ position: 'absolute', bottom: '-2px', right: '-6px', width: '32px', height: '32px', borderRadius: '50%', background: '#16261b', border: '1.5px solid rgba(197,168,130,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarUploading ? 'wait' : 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.4)', zIndex: 2 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
          {avatarError && <div style={{ fontSize: '11px', color: '#d06070', marginBottom: '0.6rem', fontFamily: 'var(--font-inter), sans-serif' }}>{avatarError}</div>}

          {/* Name */}
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, letterSpacing: '-0.01em', marginBottom: '0.85rem' }}>
            {displayName || 'Your Profile'}
          </div>

          {/* Instagram pill */}
          {igHandle ? (
            <a
              href={`https://instagram.com/${igHandle}`}
              target="_blank"
              rel="noreferrer"
              className="cr-hero-pill"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(245,241,236,0.08)', borderRadius: '99px', padding: '0.5rem 1.2rem', fontSize: '11px', color: 'rgba(245,241,236,0.85)', fontFamily: 'var(--font-inter), sans-serif', textDecoration: 'none', letterSpacing: '0.03em', marginBottom: '1.35rem', transition: 'background 0.2s' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              @{igHandle}
            </a>
          ) : form.instagram_opted_out ? (
            <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(245,241,236,0.3)', fontFamily: 'var(--font-inter), sans-serif', marginBottom: '1.35rem' }}>
              Instagram not shared
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="cr-hero-pill"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(245,241,236,0.06)', border: 'none', borderRadius: '99px', padding: '0.5rem 1.2rem', fontSize: '11px', color: 'rgba(245,241,236,0.45)', fontFamily: 'var(--font-inter), sans-serif', cursor: 'pointer', letterSpacing: '0.03em', marginBottom: '1.35rem', transition: 'background 0.2s' }}
            >
              + Add Instagram
            </button>
          )}

          {/* Tier row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z"/></svg>
            <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', fontWeight: '500' }}>
              {isInnerCircle ? 'Inner Circle' : 'Routes Member'}
            </span>
            {membershipNumber && (
              <>
                <span style={{ color: 'rgba(245,241,236,0.25)' }}>·</span>
                <span style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.5)', fontFamily: 'var(--font-inter), sans-serif' }}>
                  No. {String(membershipNumber).padStart(3, '0')}
                </span>
              </>
            )}
          </div>

          {/* Profile completeness bar */}
          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(245,241,236,0.1)', overflow: 'hidden' }}>
              <div className="cr-progress-fill" style={{ width: `${completePct}%`, height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #8A6535, #c5a882)', boxShadow: '0 0 12px rgba(197,168,130,0.5)' }} />
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', color: completePct === 100 ? '#c5a882' : 'rgba(245,241,236,0.45)', fontFamily: 'var(--font-inter), sans-serif', marginTop: '0.6rem', textTransform: 'uppercase' }}>
              {completePct === 100 ? 'Profile complete' : `Profile ${completeCount} / ${completeness.length} complete`}
            </div>
          </div>
        </div>
      </div>

      {/* ── My Garage card ── */}
      <div className="cr-garage-card" style={{ background: '#0F1E14', borderRadius: '20px', border: '0.5px solid rgba(197,168,130,0.18)', padding: isMobile ? '1.35rem 1.25rem' : '1.75rem', marginBottom: '1rem', boxShadow: '0 8px 32px rgba(15,30,20,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.1rem' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.45rem', fontWeight: '400', color: '#F5F1EC', letterSpacing: '0.01em' }}>My Garage</div>
          <button type="button" onClick={startEditing} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter), sans-serif', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            Edit
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <input ref={carFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCarFileSelected} />

        {primaryCar?.photo_url ? (
          <div className="cr-garage-photo" style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', lineHeight: 0 }}>
            <img src={primaryCar.photo_url} alt={primaryCar ? [primaryCar.year, primaryCar.make, primaryCar.model].filter(Boolean).join(' ') : 'Your car'} style={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,18,12,0.82) 0%, rgba(10,18,12,0.15) 45%, transparent 65%)', pointerEvents: 'none' }} />
            {/* Featured chip */}
            <div style={{ position: 'absolute', top: '0.85rem', left: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(10,18,12,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: '99px', padding: '0.35rem 0.85rem' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#c5a882" stroke="#c5a882" strokeWidth="1"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z"/></svg>
              <span style={{ fontSize: '8.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.9)', fontFamily: 'var(--font-inter), sans-serif' }}>Featured</span>
            </div>
            {/* Change photo */}
            <button
              type="button"
              onClick={() => photoUploadingIdx === null && triggerCarPhotoUpload(primaryCarIdx)}
              aria-label="Change car photo"
              style={{ position: 'absolute', bottom: '0.85rem', right: '0.85rem', width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(10,18,12,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '0.5px solid rgba(197,168,130,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photoUploadingIdx === primaryCarIdx ? 'wait' : 'pointer', animation: photoUploadingIdx === primaryCarIdx ? 'ring-pulse 1.4s ease-out infinite' : 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            {/* Car name overlay */}
            {primaryCar && (
              <div style={{ position: 'absolute', bottom: '0.95rem', left: '1.1rem', right: '4rem', lineHeight: 1.2 }}>
                <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.3rem, 4.5vw, 1.8rem)', fontWeight: '400', color: '#F5F1EC', letterSpacing: '0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                  {primaryCar.model || primaryCar.make}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(245,241,236,0.65)', fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.04em', marginTop: '0.2rem' }}>
                  {[primaryCar.year, primaryCar.make, primaryCar.model].filter(Boolean).join(' ')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="photo-empty"
            onClick={() => photoUploadingIdx === null && triggerCarPhotoUpload(primaryCarIdx)}
            style={{ borderRadius: '14px', height: '170px', border: '0.5px dashed rgba(197,168,130,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(197,168,130,0.04)', cursor: 'pointer', gap: '0.65rem', animation: photoUploadingIdx === primaryCarIdx ? 'ring-pulse 1.4s ease-out infinite' : 'none' }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/>
              <rect x="11" y="13" width="10" height="8" rx="2"/>
              <circle cx="7.5" cy="17.5" r="1.5"/>
              <circle cx="17.5" cy="17.5" r="1.5"/>
            </svg>
            <span style={{ fontSize: '12px', color: 'rgba(245,241,236,0.45)', letterSpacing: '0.04em', fontFamily: 'var(--font-inter), sans-serif' }}>
              {photoUploadingIdx === primaryCarIdx ? 'Uploading…' : primaryCar ? `Add a photo of your ${primaryCar.model || primaryCar.make}` : 'No photo yet — tap to upload'}
            </span>
          </div>
        )}
        {photoErrors[primaryCarIdx] && <div style={{ fontSize: '12px', color: '#d06070', marginTop: '0.75rem', fontFamily: 'var(--font-inter), sans-serif' }}>{photoErrors[primaryCarIdx]}</div>}

        {/* Additional cars */}
        {extraCars.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {extraCars.map((car, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(245,241,236,0.045)', border: '0.5px solid rgba(197,168,130,0.12)' }}>
                {car.photo_url ? (
                  <img src={car.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/>
                    <rect x="11" y="13" width="10" height="8" rx="2"/>
                    <circle cx="7.5" cy="17.5" r="1.5"/>
                    <circle cx="17.5" cy="17.5" r="1.5"/>
                  </svg>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: 'rgba(245,241,236,0.8)', fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.02em' }}>
                    {[car.year, car.make, car.model].filter(Boolean).join(' ')}
                  </div>
                  {car.paint && <div style={{ fontSize: '10px', color: 'rgba(245,241,236,0.4)', fontFamily: 'var(--font-inter), sans-serif', marginTop: '1px' }}>{car.paint}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Season Stats card ── */}
      <div className="cr-stats-card" style={{ background: '#0F1E14', borderRadius: '20px', border: '0.5px solid rgba(197,168,130,0.18)', padding: isMobile ? '1.35rem 1.25rem' : '1.75rem', marginBottom: '3rem', boxShadow: '0 8px 32px rgba(15,30,20,0.18)' }}>
        <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.45rem', fontWeight: '400', color: '#F5F1EC', letterSpacing: '0.01em', marginBottom: '1.1rem' }}>Season Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            {
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
              value: stats ? stats.attended : null, label: 'Events attended',
            },
            {
              icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 15 11 17 15 13"/></svg>,
              value: stats ? stats.registered : null, label: 'Registrations',
            },
          ].map(tile => (
            <div key={tile.label} className="cr-stat-tile" style={{ background: 'rgba(245,241,236,0.045)', border: '0.5px solid rgba(197,168,130,0.12)', borderRadius: '14px', padding: '1.1rem 1.2rem' }}>
              <div style={{ marginBottom: '0.6rem' }}>{tile.icon}</div>
              <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.9rem', fontWeight: '400', color: '#F5F1EC', lineHeight: 1, letterSpacing: '0.03em' }}>
                {tile.value === null ? '—' : <CountUp to={tile.value} />}
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', fontFamily: 'var(--font-inter), sans-serif', marginTop: '0.4rem' }}>{tile.label}</div>
            </div>
          ))}
          <div className="cr-stat-tile" style={{ gridColumn: '1 / -1', background: 'rgba(245,241,236,0.045)', border: '0.5px solid rgba(197,168,130,0.12)', borderRadius: '14px', padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', fontFamily: 'var(--font-inter), sans-serif' }}>Member since</span>
            </div>
            <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.2rem', fontWeight: '400', color: '#F5F1EC' }}>{memberSinceStr || '—'}</span>
          </div>
        </div>
      </div>

      <div ref={editAnchorRef} style={{ scrollMarginTop: '84px' }} />

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
              ].map((row, ri) => row.value ? (
                <div key={row.label} className="info-row" style={{
                  animationName: 'cr-fade-up', animationDuration: '0.32s', animationFillMode: 'both', animationTimingFunction: 'ease',
                  animationDelay: `${0.14 + ri * 0.055}s`,
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
              <Field label="Email *">
                <input type="email" value={user?.email || ''} disabled
                  style={{ ...inp, background: 'rgba(0,0,0,0.02)', color: '#bbb', cursor: 'not-allowed', borderColor: 'rgba(0,0,0,0.08)' }} />
              </Field>
              <Field label="Full Name *">
                <input className="cr-input" type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) }))}
                  maxLength={100} autoCapitalize="words" style={inp} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Phone *">
                  <input className="cr-input" type="tel" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                    placeholder="+1 (514) 000-0000" maxLength={18} style={inp} />
                </Field>
                <Field label="Instagram">
                  <input className="cr-input" type="text" value={form.instagram}
                    onChange={e => setForm(p => ({ ...p, instagram: e.target.value, instagram_opted_out: e.target.value ? false : p.instagram_opted_out }))}
                    maxLength={50} placeholder={form.instagram_opted_out ? 'Not shared' : '@yourhandle'} style={inp} />
                  {!form.instagram && (
                    <button type="button"
                      onClick={() => setForm(p => ({ ...p, instagram_opted_out: !p.instagram_opted_out }))}
                      style={{ background: 'none', border: 'none', padding: '0.35rem 0 0', fontSize: '10px', letterSpacing: '0.04em', color: form.instagram_opted_out ? '#3B6B2F' : '#bbb', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                    >
                      {form.instagram_opted_out ? "✓ Won't share Instagram" : "Don't share Instagram"}
                    </button>
                  )}
                </Field>
              </div>

              <SectionDivider>Date of Birth *</SectionDivider>
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
                        style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#93333E', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: 0.75 }}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    {[['Year', 'year', true], ['Make', 'make', false], ['Model', 'model', false], ['Plate', 'license_plate', false], ['Paint', 'paint', false]].map(([label, field, isSelect]) => (
                      <div key={field}>
                        <FieldLabel>{label}{idx === 0 && ['year', 'make', 'model'].includes(field) ? ' *' : ''}</FieldLabel>
                        {isSelect ? (
                          <SelectWrap value={car[field]} onChange={e => updateCar(idx, field, e.target.value)}>
                            <option value="">Select</option>
                            {CAR_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                          </SelectWrap>
                        ) : (
                          <input className="cr-input" type="text" value={car[field]}
                            onChange={e => updateCar(idx, field, e.target.value)}
                            placeholder={field === 'make' ? 'e.g. Porsche' : field === 'model' ? 'e.g. 911' : field === 'paint' ? 'e.g. Guards Red' : 'ABC-123'}
                            maxLength={field === 'license_plate' ? 15 : 100}
                            style={{ ...inp, ...(field === 'license_plate' ? { textTransform: 'uppercase' } : {}) }} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '0.6rem' }}>
                    <FieldLabel>Mods</FieldLabel>
                    <input className="cr-input" type="text"
                      value={(car.mods || []).join(', ')}
                      onChange={e => updateCar(idx, 'mods', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. Coilovers, Exhaust, Wheels — separate with commas"
                      maxLength={300}
                      style={inp} />
                  </div>

                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {car.photo_url ? (
                      <img src={car.photo_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(0,0,0,0.03)', border: '0.5px dashed rgba(0,0,0,0.15)', flexShrink: 0 }} />
                    )}
                    <button type="button" onClick={() => photoUploadingIdx === null && triggerCarPhotoUpload(idx)}
                      style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.35)', padding: '0.5rem 0.9rem', cursor: photoUploadingIdx === idx ? 'wait' : 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
                      {photoUploadingIdx === idx ? 'Uploading…' : car.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {photoErrors[idx] && <span style={{ fontSize: '11px', color: '#93333E' }}>{photoErrors[idx]}</span>}
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


              {error && <div style={{ fontSize: '12px', color: '#93333E', margin: '0.75rem 0' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem' }}>
                <button type="submit" disabled={saving}
                  style={{ padding: '0.9rem 2rem', background: '#45643c', color: '#F5F1EC', border: 'none', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: saving ? 0.6 : 1 }}>
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
        <div className="cr-anim-right">
          <div style={{ border: '0.5px solid rgba(0,0,0,0.09)', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)' }}>
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
                  {pwError && <div style={{ fontSize: '12px', color: '#93333E', marginBottom: '0.75rem' }}>{pwError}</div>}
                  {savedPw && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: '#3B6B2F', marginBottom: '0.75rem' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Password updated.
                    </div>
                  )}
                  <button type="submit" disabled={savingPw}
                    style={{ padding: '0.85rem 1.75rem', background: '#45643c', color: '#F5F1EC', border: 'none', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: savingPw ? 'wait' : 'pointer', fontFamily: 'var(--font-inter), sans-serif', opacity: savingPw ? 0.6 : 1 }}>
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
