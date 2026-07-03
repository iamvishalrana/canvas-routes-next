'use client'
import { WTET_WAIVER_TEXT, WTET_WAIVER_TEXT_FR } from '../../../lib/wtetRegistrationContent'

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function printWaiver(name, email, waiver) {
  const waiverText = waiver.lang === 'fr' ? WTET_WAIVER_TEXT_FR : WTET_WAIVER_TEXT
  const vehicle = [waiver.vehicle?.year, waiver.vehicle?.make, waiver.vehicle?.model].filter(Boolean).join(' ') || '—'
  const passengersHtml = waiver.passengers?.length
    ? waiver.passengers.map(p => `<div>${esc(p.name)}${p.age ? `, age ${esc(p.age)}` : ''}</div>`).join('')
    : '<div>None declared</div>'
  const signedAt = new Date(waiver.signed_at).toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  const html = `<!DOCTYPE html><html><head><title>Signed Waiver — ${esc(waiver.full_name)}</title>
<style>
  @page { size: letter; margin: 18mm 16mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; font-size: 12px; }
  h1 { font-family: Arial, sans-serif; font-size: 18px; font-weight: 400; margin: 0 0 4px; }
  .meta { font-family: Arial, sans-serif; font-size: 10px; color: #666; margin-bottom: 20px; }
  .waiver-body { white-space: pre-wrap; font-size: 11px; line-height: 1.65; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 16px 0; margin-bottom: 20px; }
  .sig-block { font-family: Arial, sans-serif; }
  .sig-name { font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 26px; margin: 10px 0 4px; }
  .sig-row { display: flex; gap: 24px; flex-wrap: wrap; font-size: 11px; margin-bottom: 10px; }
  .sig-row div { min-width: 160px; }
  .sig-label { text-transform: uppercase; letter-spacing: 0.08em; font-size: 8px; color: #888; margin-bottom: 2px; }
</style></head><body>
<h1>Whips to Eastern Townships — Signed Liability Waiver</h1>
<div class="meta">${esc(name)} &middot; ${esc(email)} &middot; Signed ${signedAt}</div>
<div class="waiver-body">${esc(waiverText)}</div>
<div class="sig-block">
  <div class="sig-label">Signature</div>
  <div class="sig-name">${esc(waiver.full_name)}</div>
  <div class="sig-row">
    <div><div class="sig-label">Signed</div>${signedAt}</div>
    <div><div class="sig-label">IP Address</div>${esc(waiver.ip_address)}</div>
  </div>
  <div class="sig-row">
    <div><div class="sig-label">Vehicle</div>${esc(vehicle)}</div>
    <div><div class="sig-label">Emergency Contact</div>${esc(waiver.emergency_contact?.name)} &middot; ${esc(waiver.emergency_contact?.phone)}</div>
  </div>
  <div><div class="sig-label">Passengers</div>${passengersHtml}</div>
</div>
</body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

export default function WaiverViewerModal({ name, email, waiver, onClose }) {
  const waiverText = waiver.lang === 'fr' ? WTET_WAIVER_TEXT_FR : WTET_WAIVER_TEXT
  const vehicle = [waiver.vehicle?.year, waiver.vehicle?.make, waiver.vehicle?.model].filter(Boolean).join(' ') || '—'
  const signedAt = new Date(waiver.signed_at).toLocaleString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,30,20,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
    >
      <div
        className="admin-modal-enter"
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: '620px', maxHeight: '85dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>Signed Waiver</div>
            <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '20px', color: '#1a1a1a' }}>{name}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => printWaiver(name, email, waiver)} style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '8px', padding: '6px 12px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', lineHeight: 1, color: '#555' }}>×</button>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', padding: '1rem 1.1rem', background: 'rgba(59,107,47,0.04)', border: '0.5px solid rgba(59,107,47,0.2)', borderRadius: '10px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem', fontFamily: 'var(--font-inter),sans-serif' }}>Signature</div>
            <div style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: '28px', color: '#1a1a1a', marginBottom: '0.65rem' }}>{waiver.full_name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '12px', color: '#444', fontFamily: 'var(--font-inter),sans-serif' }}>
              <div><div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa' }}>Signed</div>{signedAt}</div>
              <div><div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa' }}>IP Address</div>{waiver.ip_address}</div>
              <div><div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa' }}>Vehicle</div>{vehicle}</div>
              <div><div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa' }}>Emergency Contact</div>{waiver.emergency_contact?.name} · {waiver.emergency_contact?.phone}</div>
            </div>
            {waiver.passengers?.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.3rem', fontFamily: 'var(--font-inter),sans-serif' }}>Passengers</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {waiver.passengers.map((p, i) => (
                    <span key={i} style={{ fontSize: '11px', color: '#444', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '2px 8px', fontFamily: 'var(--font-inter),sans-serif' }}>
                      {p.name}{p.age ? `, ${p.age}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', fontFamily: 'var(--font-inter),sans-serif' }}>Full Waiver Text</div>
            <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.4)', borderRadius: '99px', padding: '1px 8px' }}>
              Signed in {waiver.lang === 'fr' ? 'French' : 'English'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', maxHeight: '340px', overflowY: 'auto', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '1rem 1.1rem', background: '#fafaf9' }}>
            {waiverText}
          </div>
        </div>
      </div>
    </div>
  )
}
