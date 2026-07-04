'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const INP = {
  width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
  background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)',
  color: '#1a1a1a', fontSize: '15px', fontFamily: 'var(--font-inter),sans-serif',
  outline: 'none', borderRadius: 0, appearance: 'none', WebkitAppearance: 'none',
  transition: 'border-color 0.15s',
}
const LABEL = {
  display: 'block', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: '#888', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif',
}

function ToggleBtn({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '0.75rem 1rem',
      background: selected ? '#45643c' : '#fff',
      border: `0.5px solid ${selected ? '#45643c' : 'rgba(0,0,0,0.15)'}`,
      color: selected ? '#F5F1EC' : '#555',
      fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
      cursor: 'pointer', transition: 'all 0.15s', borderRadius: 0,
    }}>{children}</button>
  )
}

export default function EventProfilePage() {
  const { token } = useParams()
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  // Editable fields
  const [dietary, setDietary] = useState('')
  const [whatsapp, setWhatsapp] = useState(null)
  const [passengerDetails, setPassengerDetails] = useState([])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/rsvp/${token}/profile`)
      .then(r => r.json().then(d => ({ ok: r.ok, ...d })))
      .then(d => {
        if (!d.ok) { setState('error'); setErr(d.error || 'Invalid link.'); return }
        setData(d)
        setDietary(d.answers?.dietary || '')
        setWhatsapp(d.answers?.whatsapp ?? null)
        const existingPassengers = d.answers?.passenger_details || []
        const passengerCount = d.answers?.passengers || 1
        // Pre-fill passenger slots based on count (minus driver)
        const slots = Array.from({ length: Math.max(0, passengerCount - 1) }, (_, i) => ({
          name: existingPassengers[i]?.name || '',
          age: existingPassengers[i]?.age || '',
        }))
        setPassengerDetails(slots)
        setState('ready')
      })
      .catch(() => { setState('error'); setErr('Could not load your profile.') })
  }, [token])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setSaveErr(null); setSaved(false)
    try {
      const res = await fetch(`/api/rsvp/${token}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dietary, whatsapp, passengerDetails }),
      })
      const d = await res.json()
      if (!res.ok) { setSaveErr(d.error || 'Failed to save.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setSaveErr('Network error. Please try again.') }
    finally { setSaving(false) }
  }

  function updatePassenger(index, field, value) {
    setPassengerDetails(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  function addPassenger() {
    setPassengerDetails(prev => [...prev, { name: '', age: '' }])
  }

  function removePassenger(index) {
    setPassengerDetails(prev => prev.filter((_, i) => i !== index))
  }

  const carLabel = [data?.carYear, data?.carMake, data?.carModel].filter(Boolean).join(' ')

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ background: '#0F1E14', padding: '1rem 2rem' }}>
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={140} height={93} style={{ width: '90px', height: 'auto', opacity: 0.9 }} />
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem 4rem' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>

          {state === 'loading' && (
            <p style={{ color: '#aaa', fontSize: '13px' }}>Loading your profile…</p>
          )}

          {state === 'error' && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '2.5rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem', lineHeight: 1.2 }}>Something went wrong.</h1>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.8' }}>{err}</p>
            </div>
          )}

          {state === 'ready' && data && (
            <>
              {/* Header card */}
              <div style={{ background: '#0F1E14', padding: '2rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '0.5rem' }}>
                  Canvas Routes &middot; {data.eventName}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                  {/* Car photo or placeholder */}
                  <div style={{ width: '90px', height: '90px', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(197,168,130,0.2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {data.carPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.carPhotoUrl} alt={carLabel} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.3)" strokeWidth="1.5" strokeLinecap="round"><path d="M19 17H5c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h1l2-3h8l2 3h1c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2z"/><circle cx="8.5" cy="13.5" r="1.5"/><circle cx="15.5" cy="13.5" r="1.5"/></svg>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                      <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1 }}>{data.name}</div>
                      {data.isMember && (
                        <span style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 7px', flexShrink: 0 }}>Member</span>
                      )}
                    </div>
                    {carLabel && (
                      <div style={{ fontSize: '12px', color: 'rgba(245,241,236,0.55)', lineHeight: 1.4 }}>{carLabel}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Editable form */}
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '2rem' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.5rem' }}>Your details</div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* Dietary */}
                  <div>
                    <label htmlFor="profile-dietary" style={LABEL}>
                      Dietary restrictions or allergies{' '}
                      <span style={{ color: '#bbb', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span>
                    </label>
                    <input
                      id="profile-dietary"
                      type="text"
                      value={dietary}
                      onChange={e => setDietary(e.target.value)}
                      placeholder="None / Vegetarian / No shellfish…"
                      maxLength={200}
                      style={INP}
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <div style={LABEL}>WhatsApp group with all participants?</div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <ToggleBtn selected={whatsapp === true}  onClick={() => setWhatsapp(true)}>Yes, add me</ToggleBtn>
                      <ToggleBtn selected={whatsapp === false} onClick={() => setWhatsapp(false)}>No thanks</ToggleBtn>
                    </div>
                    <p style={{ fontSize: '11px', color: '#bbb', margin: '0.5rem 0 0' }}>We'll use the phone number from your registration.</p>
                  </div>

                  {/* Passengers */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={LABEL}>Passengers{' '}<span style={{ color: '#bbb', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span></div>
                      <button type="button" onClick={addPassenger} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#45643c', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>
                        + Add passenger
                      </button>
                    </div>
                    {passengerDetails.length === 0 && (
                      <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>No passengers added yet.</p>
                    )}
                    {passengerDetails.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={p.name}
                          onChange={e => updatePassenger(i, 'name', e.target.value)}
                          placeholder="Name"
                          maxLength={60}
                          style={{ ...INP, flex: 2 }}
                        />
                        <input
                          type="text"
                          value={p.age}
                          onChange={e => updatePassenger(i, 'age', e.target.value)}
                          placeholder="Age"
                          maxLength={10}
                          style={{ ...INP, flex: 1 }}
                        />
                        <button type="button" onClick={() => removePassenger(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '18px', lineHeight: 1, padding: '0.8rem 0.25rem', flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                  </div>

                  {saveErr && <p style={{ fontSize: '12px', color: '#d06070', margin: 0 }}>{saveErr}</p>}
                  {saved && <p style={{ fontSize: '12px', color: '#3B6B2F', margin: 0 }}>✓ Saved.</p>}

                  <button
                    type="submit"
                    disabled={saving || whatsapp === null}
                    style={{
                      padding: '1rem', border: 'none',
                      background: saving || whatsapp === null ? 'rgba(69,100,60,0.35)' : '#45643c',
                      color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
                      fontWeight: '600', cursor: saving || whatsapp === null ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-inter),sans-serif', transition: 'background 0.2s', borderRadius: 0,
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>

                  {whatsapp === null && (
                    <p style={{ fontSize: '11px', color: '#bbb', margin: '-0.75rem 0 0', textAlign: 'center' }}>
                      Select a WhatsApp preference to save
                    </p>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ background: '#0F1E14', padding: '1.25rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.25)', margin: 0 }}>© 2026 Canvas Routes. Montreal, QC.</p>
      </div>
    </div>
  )
}
