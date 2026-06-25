'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import { inp, GhostBtn } from '../_components/shared'

export default function CarsClient() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignInputs, setAssignInputs] = useState({})
  const [assigning, setAssigning] = useState({})
  const [editing, setEditing] = useState(null) // { memberId, carIndex }
  const [editForm, setEditForm] = useState({})
  const [modDraft, setModDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [assignErr, setAssignErr] = useState({})

  const load = useCallback(() => {
    fetch('/api/admin/members')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setMembers(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeSync('members', load)

  function startEdit(m, carIndex, car) {
    setEditing({ memberId: m.id, carIndex })
    setEditForm({ year: car.year || '', make: car.make || '', model: car.model || '', paint: car.paint || '', mods: car.mods || [] })
    setModDraft('')
  }

  function cancelEdit() { setEditing(null); setEditForm({}); setModDraft(''); setSaveErr(null) }

  async function saveCar() {
    if (!editing) return
    setSaving(true); setSaveErr(null)
    const m = members.find(x => x.id === editing.memberId)
    const cars = [...(m.cars || [])]
    cars[editing.carIndex] = { ...cars[editing.carIndex], ...editForm }
    try {
      const res = await fetch(`/api/admin/members/${m.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cars }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setSaveErr(d.error || 'Failed to save car. Please try again.')
        return
      }
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, cars } : x))
      cancelEdit()
    } catch {
      setSaveErr('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  function addMod() {
    if (!modDraft.trim()) return
    setEditForm(f => ({ ...f, mods: [...(f.mods || []), modDraft.trim()] }))
    setModDraft('')
  }

  function removeMod(i) {
    setEditForm(f => ({ ...f, mods: f.mods.filter((_, idx) => idx !== i) }))
  }

  async function assignCar(m, make) {
    if (!make.trim()) return
    setAssigning(p => ({ ...p, [m.id]: true }))
    const existingCars = m.cars || []
    let newCars
    if (existingCars.length > 0) {
      const hasNoMake = existingCars.some(c => !c.make)
      if (hasNoMake) {
        newCars = existingCars.map(c => !c.make ? { ...c, make: make.trim() } : c)
      } else {
        newCars = [...existingCars, { year: '', make: make.trim(), model: '', mods: [] }]
      }
    } else {
      newCars = [{ year: '', make: make.trim(), model: '', mods: [] }]
    }
    try {
      const res = await fetch(`/api/admin/members/${m.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cars: newCars }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(x => x.id === m.id ? { ...x, cars: newCars } : x))
        setAssignInputs(p => ({ ...p, [m.id]: '' }))
        setAssignErr(p => ({ ...p, [m.id]: null }))
      } else {
        const d = await res.json().catch(() => ({}))
        setAssignErr(p => ({ ...p, [m.id]: d.error || 'Failed to assign.' }))
      }
    } catch {
      setAssignErr(p => ({ ...p, [m.id]: 'Network error — please try again.' }))
    }
    setAssigning(p => ({ ...p, [m.id]: false }))
  }

  // Group members by car make
  const brandGroups = {}
  const unassigned = []

  members.forEach(m => {
    const cars = m.cars || []
    if (m.car_make && cars.length === 0) {
      const make = m.car_make
      if (!brandGroups[make]) brandGroups[make] = []
      brandGroups[make].push({ member: m, car: { year: m.car_year || '', make, model: m.car_model || '', mods: [] }, carIndex: -1 })
      return
    }
    const carsWithMake = cars.filter(c => c.make)
    if (carsWithMake.length === 0) {
      unassigned.push(m)
    } else {
      carsWithMake.forEach((car, carIndex) => {
        const make = car.make
        if (!brandGroups[make]) brandGroups[make] = []
        brandGroups[make].push({ member: m, car, carIndex })
      })
    }
  })

  const sortedBrands = Object.keys(brandGroups).sort((a, b) => a.localeCompare(b))
  const totalBrands = sortedBrands.length

  const isEditing = (m, carIndex) => editing?.memberId === m.id && editing?.carIndex === carIndex

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Cars</h1>
      </div>
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <>
          <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
            {totalBrands} brand{totalBrands !== 1 ? 's' : ''} represented
          </div>
          {sortedBrands.map(brand => (
            <div key={brand} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', letterSpacing: '0.02em' }}>{brand}</div>
                <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{brandGroups[brand].length} car{brandGroups[brand].length !== 1 ? 's' : ''}</div>
              </div>
              {brandGroups[brand].map(({ member: m, car, carIndex }, i) => (
                <div key={`${m.id}-${i}`}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '1.5fr 1.5fr 1fr auto', padding: '0.75rem 1.25rem', borderBottom: isEditing(m, carIndex) ? 'none' : i < brandGroups[brand].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                      {isMobile && <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{[car.year, car.model].filter(Boolean).join(' ') || '—'}{car.mods?.length > 0 && <span style={{ marginLeft: '0.3rem', color: '#c5a882' }}>{car.mods.length} mod{car.mods.length !== 1 ? 's' : ''}</span>}{car.paint && <span style={{ marginLeft: '0.3rem', color: '#c5a882' }}>{car.paint}</span>}</div>}
                      {isMobile && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{m.email}</div>}
                    </div>
                    {!isMobile && <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>}
                    {!isMobile && (
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        <div>
                          {[car.year, car.model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>}
                          {car.mods?.length > 0 && <span style={{ marginLeft: '0.4rem', fontSize: '10px', color: '#c5a882', letterSpacing: '0.06em' }}>{car.mods.length} mod{car.mods.length !== 1 ? 's' : ''}</span>}
                        </div>
                        {car.paint && <div style={{ fontSize: '11px', color: '#c5a882', marginTop: '1px' }}>{car.paint}</div>}
                      </div>
                    )}
                    {carIndex >= 0 && (
                      <GhostBtn small onClick={() => isEditing(m, carIndex) ? cancelEdit() : startEdit(m, carIndex, car)}>
                        {isEditing(m, carIndex) ? 'Cancel' : 'Edit'}
                      </GhostBtn>
                    )}
                  </div>

                  {isEditing(m, carIndex) && (
                    <div style={{ padding: '1rem 1.25rem 1.25rem', borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(197,168,130,0.03)', borderBottom: i < brandGroups[brand].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                      {/* Car fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 2fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        {[['Year', 'year'], ['Make', 'make'], ['Model', 'model'], ['Paint', 'paint']].map(([label, field]) => (
                          <div key={field}>
                            <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.3rem' }}>{label}</div>
                            <input style={{ ...inp, padding: '0.5rem 0.7rem', fontSize: '12px' }} value={editForm[field] || ''} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} placeholder={field === 'paint' ? 'e.g. Nardo Grey' : ''} maxLength={field === 'paint' ? 60 : undefined} />
                          </div>
                        ))}
                      </div>

                      {/* Mods */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Mods &amp; Packages</div>
                        {editForm.mods?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            {editForm.mods.map((mod, mi) => (
                              <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(197,168,130,0.1)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '2px 8px 2px 10px', fontSize: '11px', color: '#7B5B2E' }}>
                                {mod}
                                <button onClick={() => removeMod(mi)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#bbb', fontSize: '13px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <input
                            style={{ ...inp, padding: '0.45rem 0.7rem', fontSize: '12px', flex: 1 }}
                            placeholder="e.g. Stage 2 tune, Carbon hood, Exhaust…"
                            value={modDraft}
                            onChange={e => setModDraft(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addMod()}
                          />
                          <GhostBtn small onClick={addMod} disabled={!modDraft.trim()}>Add</GhostBtn>
                        </div>
                      </div>

                      <GhostBtn small onClick={saveCar} disabled={saving}>{saving ? 'Saving…' : 'Save'}</GhostBtn>
                      {saveErr && <div style={{ fontSize: '11px', color: '#7B2032', marginTop: '0.4rem' }}>{saveErr}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {unassigned.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#bbb', letterSpacing: '0.02em' }}>Unassigned</div>
                <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{unassigned.length} member{unassigned.length !== 1 ? 's' : ''}</div>
              </div>
              {unassigned.map((m, i) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1.5fr 1fr', padding: '0.75rem 1.25rem', borderBottom: i < unassigned.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                    {isMobile && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{m.email}</div>}
                  </div>
                  {!isMobile && <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input
                      style={{ ...inp, width: '120px', padding: '0.4rem 0.6rem', fontSize: '12px' }}
                      placeholder="Brand"
                      value={assignInputs[m.id] || ''}
                      onChange={e => setAssignInputs(p => ({ ...p, [m.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && assignCar(m, assignInputs[m.id] || '')}
                    />
                    <GhostBtn small onClick={() => assignCar(m, assignInputs[m.id] || '')} disabled={assigning[m.id]}>
                      {assigning[m.id] ? '…' : 'Assign'}
                    </GhostBtn>
                  </div>
                  {assignErr[m.id] && <div style={{ fontSize: '11px', color: '#7B2032', marginTop: '0.25rem', gridColumn: '1 / -1' }}>{assignErr[m.id]}</div>}
                </div>
              ))}
            </div>
          )}

          {sortedBrands.length === 0 && unassigned.length === 0 && (
            <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No members yet.</div>
          )}
        </>
      )}
    </div>
  )
}
