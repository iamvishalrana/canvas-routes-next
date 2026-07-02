'use client'
import { useState } from 'react'
import { exportData } from './exportUtils'

const FORMATS = [
  { id: 'csv',  label: 'CSV',         desc: 'Comma-separated values — opens in Excel, Google Sheets' },
  { id: 'xlsx', label: 'Excel',       desc: 'Microsoft Excel workbook (.xlsx)' },
  { id: 'pdf',  label: 'PDF',         desc: 'Formatted PDF document' },
  { id: 'docx', label: 'Word (DOCX)', desc: 'Microsoft Word document (.docx)' },
]

export function ExportModal({ isOpen, onClose, filename, title, headers, rows }) {
  const [selected, setSelected] = useState('csv')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      await exportData(selected, filename, title, headers, rows)
      onClose()
    } catch (e) {
      setError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="admin-modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      <div className="admin-modal-enter" style={{ position: 'relative', background: '#fff', width: '100%', maxWidth: '420px', margin: '1rem', border: '0.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif' }}>Export {title}</div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>{rows.length} record{rows.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: '4px', lineHeight: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '0.75rem', fontFamily: 'var(--font-inter),sans-serif' }}>Choose format</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {FORMATS.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', border: `0.5px solid ${selected === f.id ? 'rgba(15,30,20,0.4)' : 'rgba(0,0,0,0.1)'}`, background: selected === f.id ? 'rgba(15,30,20,0.03)' : '#fff', cursor: 'pointer' }}>
                <input type="radio" name="format" value={f.id} checked={selected === f.id} onChange={() => setSelected(f.id)}
                  style={{ accentColor: '#0F1E14', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif' }}>{f.label}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>{f.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {error && <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.75rem', fontFamily: 'var(--font-inter),sans-serif' }}>{error}</div>}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: '#555', fontFamily: 'var(--font-inter),sans-serif' }}>
            Cancel
          </button>
          <button onClick={handleExport} disabled={exporting}
            style={{ padding: '0.6rem 1.4rem', background: '#0F1E14', border: 'none', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: exporting ? 'wait' : 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Exporting…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ExportButton({ filename, title, headers, rows, style }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding: '0.55rem 1rem', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)',
        fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
        color: '#555', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem',
        ...style,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export
      </button>
      <ExportModal isOpen={open} onClose={() => setOpen(false)} filename={filename} title={title} headers={headers} rows={rows} />
    </>
  )
}
