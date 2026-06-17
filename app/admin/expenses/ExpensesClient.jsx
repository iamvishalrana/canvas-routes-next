'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { inp, sel, L, GhostBtn, DangerBtn, Err } from '../_components/shared'

const CATEGORIES = ['Fuel', 'Food & Beverages', 'Venue / Parking', 'Photography / Video', 'Merchandise', 'Equipment', 'Marketing', 'Insurance', 'Printing', 'Other']
const EMPTY_FORM = { expense_date: '', event_name: '', vendor: '', amount: '', tax_amount: '', category: '', receipt_url: '' }

function computeFolderPath(eventName, date) {
  const slug = slugify(eventName)
  return date ? `${slug}/${date}` : slug
}
function fmt(n) { return `$${(parseFloat(n) || 0).toFixed(2)}` }
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return new Date(y, m - 1, day).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}
function slugify(str) {
  if (!str?.trim()) return 'general'
  return str.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'general'
}

function ChevronIcon({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const COL = '100px 1fr 1fr 90px 90px 90px 80px'

export default function ExpensesClient() {
  const [expenses, setExpenses]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [folderPath, setFolderPath]     = useState('general')
  const folderEditedRef                 = useRef(false)
  const [submitting, setSubmitting]     = useState(false)
  const [formErr, setFormErr]           = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [receiptName, setReceiptName]   = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting]         = useState(null)
  const [openGroups, setOpenGroups]     = useState({})
  const [filterEvent, setFilterEvent]   = useState('all')
  const [editingId, setEditingId]       = useState(null)
  const [editForm, setEditForm]         = useState({})
  const [editSaving, setEditSaving]     = useState(false)
  const [editErr, setEditErr]           = useState(null)
  const [newIds, setNewIds]             = useState(new Set())
  const fileRef = useRef(null)

  const load = useCallback(() => {
    fetch('/api/admin/expenses')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setExpenses(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!folderEditedRef.current) setFolderPath(computeFolderPath(form.event_name, form.expense_date))
  }, [form.event_name, form.expense_date])

  // Groups: all events sorted by most recent
  const allGroups = (() => {
    const map = {}
    for (const e of expenses) {
      const key = e.event_name?.trim() || 'General'
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return Object.entries(map)
      .map(([name, items]) => ({
        name,
        items: [...items].sort((a, b) => b.expense_date.localeCompare(a.expense_date)),
        total:    items.reduce((s, e) => s + parseFloat(e.amount    || 0), 0),
        totalTax: items.reduce((s, e) => s + parseFloat(e.tax_amount || 0), 0),
      }))
      .sort((a, b) => b.items[0].expense_date.localeCompare(a.items[0].expense_date))
  })()

  const eventNames = allGroups.map(g => g.name)
  const groups = filterEvent === 'all' ? allGroups : allGroups.filter(g => g.name === filterEvent)

  const visibleExpenses = groups.flatMap(g => g.items)
  const grandTotal    = visibleExpenses.reduce((s, e) => s + parseFloat(e.amount    || 0), 0)
  const grandTotalTax = visibleExpenses.reduce((s, e) => s + parseFloat(e.tax_amount || 0), 0)

  function toggleGroup(name) { setOpenGroups(p => ({ ...p, [name]: !p[name] })) }

  function startEdit(expense) {
    setEditingId(expense.id)
    setEditErr(null)
    setDeleteConfirm(null)
    setEditForm({
      expense_date: expense.expense_date || '',
      event_name:   expense.event_name   || '',
      vendor:       expense.vendor       || '',
      amount:       expense.amount != null ? String(expense.amount) : '',
      tax_amount:   expense.tax_amount != null ? String(expense.tax_amount) : '',
      category:     expense.category     || '',
      receipt_url:  expense.receipt_url  || '',
    })
  }

  function cancelEdit() { setEditingId(null); setEditErr(null) }

  async function saveEdit(id) {
    setEditSaving(true); setEditErr(null)
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          amount:     parseFloat(editForm.amount)     || 0,
          tax_amount: parseFloat(editForm.tax_amount) || 0,
          event_name: editForm.event_name?.trim() || null,
          vendor:     editForm.vendor?.trim()     || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setEditErr(data.error || 'Failed to save.'); return }
      setExpenses(prev => prev.map(e => e.id === id ? data : e))
      setEditingId(null)
    } catch { setEditErr('Network error.') }
    finally { setEditSaving(false) }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true); setFormErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder_path', folderPath)
      const res = await fetch('/api/admin/expenses/upload-receipt', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Upload failed.'); return }
      setForm(p => ({ ...p, receipt_url: data.url }))
      setReceiptName(file.name)
    } catch { setFormErr('Upload failed.') }
    finally { setUploadingFile(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.expense_date) { setFormErr('Date is required.'); return }
    if (!form.amount || parseFloat(form.amount) < 0) { setFormErr('Valid amount is required.'); return }
    setSubmitting(true); setFormErr(null)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Failed to save.'); return }
      setExpenses(prev => [data, ...prev])
      setNewIds(prev => new Set([...prev, data.id]))
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(data.id); return n }), 700)
      // Auto-open the group this expense landed in
      const groupName = data.event_name?.trim() || 'General'
      setOpenGroups(p => ({ ...p, [groupName]: true }))
      setForm(EMPTY_FORM)
      setFolderPath('general')
      folderEditedRef.current = false
      setReceiptName('')
      if (fileRef.current) fileRef.current.value = ''
    } catch { setFormErr('Network error.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(expense) {
    setDeleting(expense.id)
    try {
      const res = await fetch(`/api/admin/expenses/${expense.id}`, { method: 'DELETE' })
      if (res.ok) setExpenses(prev => prev.filter(e => e.id !== expense.id))
    } catch {}
    setDeleting(null); setDeleteConfirm(null)
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Event', 'Vendor', 'Category', 'Amount', 'Tax', 'Total', 'Receipt'],
      ...expenses.map(e => [
        e.expense_date, e.event_name || 'General', e.vendor || '', e.category || '',
        parseFloat(e.amount || 0).toFixed(2), parseFloat(e.tax_amount || 0).toFixed(2),
        (parseFloat(e.amount || 0) + parseFloat(e.tax_amount || 0)).toFixed(2),
        e.receipt_url || '',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `canvas-routes-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '900px' }}>
      <style>{`
        @keyframes expFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes expPanelIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .exp-new { animation: expFadeIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .exp-edit-panel { animation: expPanelIn 0.2s ease both; }
        .exp-filter-chip { transition: background 0.15s, color 0.15s, border-color 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Expenses</h1>
      </div>

      {/* Add form */}
      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Add Expense</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div>
            <L>Date</L>
            <input type="date" style={inp} max={today} value={form.expense_date}
              onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} required />
          </div>
          <div style={{ minWidth: '180px' }}>
            <L>Event / Label</L>
            <input style={inp} value={form.event_name} placeholder="e.g. Into the Laurentians"
              onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} maxLength={100} />
          </div>
          <div>
            <L>Vendor</L>
            <input style={inp} value={form.vendor} placeholder="e.g. Costco"
              onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} maxLength={100} />
          </div>
          <div>
            <L>Category</L>
            <div style={{ position: 'relative' }}>
              <select style={sel} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
          </div>
          <div>
            <L>Amount ($)</L>
            <input style={inp} type="number" min="0" step="0.01" value={form.amount} placeholder="0.00"
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
          </div>
          <div>
            <L>Tax ($)</L>
            <input style={inp} type="number" min="0" step="0.01" value={form.tax_amount} placeholder="0.00"
              onChange={e => setForm(p => ({ ...p, tax_amount: e.target.value }))} />
          </div>
        </div>

        <div style={{ marginBottom: '0.6rem' }}>
          <L>Receipt Folder</L>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', color: '#bbb', userSelect: 'none', whiteSpace: 'nowrap' }}>receipts /</span>
            <input style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: '12px', color: '#555' }}
              value={folderPath} placeholder="general"
              onChange={e => { folderEditedRef.current = true; setFolderPath(e.target.value) }}
              onBlur={e => { if (!e.target.value.trim()) { folderEditedRef.current = false; setFolderPath(computeFolderPath(form.event_name, form.expense_date)) } }}
              maxLength={200} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingFile}
            style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: '0.5px solid rgba(0,0,0,0.2)', background: 'none', cursor: uploadingFile ? 'default' : 'pointer', color: '#777', fontFamily: 'var(--font-inter),sans-serif' }}>
            {uploadingFile ? 'Uploading…' : '↑ Receipt'}
          </button>
          {receiptName && (
            <span style={{ fontSize: '11px', color: '#3B6B2F', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ✓ {receiptName}
              <button type="button" onClick={() => { setForm(p => ({ ...p, receipt_url: '' })); setReceiptName(''); if (fileRef.current) fileRef.current.value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>×</button>
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button type="submit" disabled={submitting || uploadingFile}
              style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 20px', background: submitting ? 'rgba(15,30,20,0.6)' : '#0F1E14', color: '#F5F1EC', border: 'none', cursor: submitting ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {submitting ? 'Saving…' : 'Add Expense'}
            </button>
          </div>
        </div>
        {formErr && <Err msg={formErr} />}
      </form>

      {/* Filter + summary bar */}
      {expenses.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          {/* Event filter chips */}
          {eventNames.length > 1 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              {['all', ...eventNames].map(name => {
                const active = filterEvent === name
                return (
                  <button key={name} className="exp-filter-chip"
                    onClick={() => setFilterEvent(name)}
                    style={{
                      fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '4px 11px', border: '0.5px solid',
                      cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif',
                      background: active ? '#0F1E14' : 'none',
                      color:      active ? '#F5F1EC' : '#888',
                      borderColor: active ? '#0F1E14' : 'rgba(0,0,0,0.15)',
                    }}>
                    {name === 'all' ? 'All' : name}
                  </button>
                )
              })}
            </div>
          )}

          {/* Summary row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999' }}>
              {visibleExpenses.length} expense{visibleExpenses.length !== 1 ? 's' : ''}
              {filterEvent !== 'all' && <span style={{ color: '#c5a882' }}> · {filterEvent}</span>}
              &nbsp;·&nbsp;
              <span style={{ color: '#1a1a1a' }}>{fmt(grandTotal)}</span>
              {grandTotalTax > 0 && <> + <span style={{ color: '#888' }}>{fmt(grandTotalTax)} tax</span></>}
            </div>
            <button onClick={exportCSV}
              style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', border: '0.5px solid rgba(0,0,0,0.18)', background: 'none', cursor: 'pointer', color: '#555', fontFamily: 'var(--font-inter),sans-serif', marginLeft: 'auto' }}>
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Grouped expense list */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : expenses.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No expenses yet.</div>
      ) : groups.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No expenses for this event.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {groups.map(group => {
            const isOpen = !!openGroups[group.name]
            return (
              <div key={group.name} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                {/* Group header */}
                <button onClick={() => toggleGroup(group.name)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1.1rem', background: '#fafaf9', border: 'none', borderBottom: isOpen ? '0.5px solid rgba(0,0,0,0.07)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <ChevronIcon open={isOpen} />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', flex: 1 }}>{group.name}</span>
                  <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '0.5rem' }}>
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '13px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.total)}</span>
                  {group.totalTax > 0 && (
                    <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '0.25rem' }}>+{fmt(group.totalTax)} tax</span>
                  )}
                </button>

                {isOpen && (
                  <div>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.45rem 1.1rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fdfdfc' }}>
                      {['Date', 'Vendor', 'Category', 'Amount', 'Tax', 'Total', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                      ))}
                    </div>

                    {group.items.map((expense, i) => {
                      const total           = parseFloat(expense.amount || 0) + parseFloat(expense.tax_amount || 0)
                      const isPendingDelete = deleteConfirm === expense.id
                      const isDeletingThis  = deleting === expense.id
                      const isEditing       = editingId === expense.id
                      const isNew           = newIds.has(expense.id)

                      return (
                        <div key={expense.id} className={isNew ? 'exp-new' : ''}
                          style={{ borderBottom: i < group.items.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>

                          {/* Data row */}
                          <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.65rem 1.1rem', alignItems: 'center', background: isEditing ? 'rgba(197,168,130,0.04)' : undefined, transition: 'background 0.2s' }}>
                            <div style={{ fontSize: '12px', color: '#555' }}>{fmtDate(expense.expense_date)}</div>
                            <div style={{ fontSize: '12px', color: '#333' }}>
                              {expense.vendor || <span style={{ color: '#ddd' }}>—</span>}
                              {expense.receipt_url && (
                                <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
                                  style={{ marginLeft: '0.4rem', fontSize: '10px', color: '#c5a882', textDecoration: 'none' }}>↗</a>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{expense.category || <span style={{ color: '#ddd' }}>—</span>}</div>
                            <div style={{ fontSize: '12px', color: '#333', fontVariantNumeric: 'tabular-nums' }}>{fmt(expense.amount)}</div>
                            <div style={{ fontSize: '12px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                              {parseFloat(expense.tax_amount) > 0 ? fmt(expense.tax_amount) : <span style={{ color: '#ddd' }}>—</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem', alignItems: 'center' }}>
                              {!isPendingDelete && !isEditing && (
                                <>
                                  <button onClick={() => startEdit(expense)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '11px', padding: '2px 5px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', transition: 'color 0.15s', letterSpacing: '0.04em' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#555'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
                                    Edit
                                  </button>
                                  <button onClick={() => { setDeleteConfirm(expense.id); setEditingId(null) }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '14px', padding: '2px 4px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', transition: 'color 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#7B2032'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>×</button>
                                </>
                              )}
                              {isEditing && (
                                <button onClick={cancelEdit}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '11px', padding: '2px 5px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.04em' }}>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Edit panel */}
                          {isEditing && (
                            <div className="exp-edit-panel" style={{ padding: '1rem 1.1rem 1.1rem', borderTop: '0.5px solid rgba(197,168,130,0.2)', background: 'rgba(197,168,130,0.04)', borderLeft: '2px solid #c5a882' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div>
                                  <L>Date</L>
                                  <input type="date" style={inp} value={editForm.expense_date} max={today}
                                    onChange={e => setEditForm(p => ({ ...p, expense_date: e.target.value }))} />
                                </div>
                                <div style={{ minWidth: '160px' }}>
                                  <L>Event / Label</L>
                                  <input style={inp} value={editForm.event_name} placeholder="General"
                                    onChange={e => setEditForm(p => ({ ...p, event_name: e.target.value }))} maxLength={100} />
                                </div>
                                <div>
                                  <L>Vendor</L>
                                  <input style={inp} value={editForm.vendor} placeholder="—"
                                    onChange={e => setEditForm(p => ({ ...p, vendor: e.target.value }))} maxLength={100} />
                                </div>
                                <div>
                                  <L>Category</L>
                                  <div style={{ position: 'relative' }}>
                                    <select style={sel} value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                                      <option value="">—</option>
                                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                                  </div>
                                </div>
                                <div>
                                  <L>Amount ($)</L>
                                  <input style={inp} type="number" min="0" step="0.01" value={editForm.amount} placeholder="0.00"
                                    onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
                                </div>
                                <div>
                                  <L>Tax ($)</L>
                                  <input style={inp} type="number" min="0" step="0.01" value={editForm.tax_amount} placeholder="0.00"
                                    onChange={e => setEditForm(p => ({ ...p, tax_amount: e.target.value }))} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button onClick={() => saveEdit(expense.id)} disabled={editSaving}
                                  style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 16px', background: '#0F1E14', color: '#F5F1EC', border: 'none', cursor: editSaving ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: editSaving ? 0.6 : 1 }}>
                                  {editSaving ? 'Saving…' : 'Save'}
                                </button>
                                <GhostBtn small onClick={cancelEdit}>Cancel</GhostBtn>
                                {editForm.receipt_url && (
                                  <a href={editForm.receipt_url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: '11px', color: '#c5a882', marginLeft: '0.5rem', textDecoration: 'none' }}>
                                    View receipt ↗
                                  </a>
                                )}
                              </div>
                              {editErr && <Err msg={editErr} />}
                            </div>
                          )}

                          {/* Delete confirm */}
                          {isPendingDelete && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 1.1rem', background: 'rgba(123,32,50,0.03)', borderTop: '0.5px solid rgba(123,32,50,0.08)' }}>
                              <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete this expense?</span>
                              <DangerBtn small onClick={() => handleDelete(expense)} disabled={isDeletingThis}>{isDeletingThis ? '…' : 'Delete'}</DangerBtn>
                              <GhostBtn small onClick={() => setDeleteConfirm(null)}>Cancel</GhostBtn>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Group total row */}
                    <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.55rem 1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9' }}>
                      <div style={{ gridColumn: '1 / 4', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Group total</div>
                      <div style={{ fontSize: '12px', color: '#555', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.total)}</div>
                      <div style={{ fontSize: '12px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>{group.totalTax > 0 ? fmt(group.totalTax) : '—'}</div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.total + group.totalTax)}</div>
                      <div />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
