'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { inp, sel, L, GhostBtn, DangerBtn, Err } from '../_components/shared'

const CATEGORIES = ['Fuel', 'Food & Beverages', 'Venue / Parking', 'Photography / Video', 'Merchandise', 'Equipment', 'Marketing', 'Insurance', 'Printing', 'Other']

const EMPTY_FORM = { expense_date: '', event_name: '', vendor: '', amount: '', tax_amount: '', category: '', receipt_url: '' }

function computeFolderPath(eventName, date) {
  const slug = slugify(eventName)
  return date ? `${slug}/${date}` : slug
}

function fmt(n) {
  const num = parseFloat(n) || 0
  return `$${num.toFixed(2)}`
}

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
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function ExpensesClient() {
  const [expenses, setExpenses]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [folderPath, setFolderPath] = useState('general')
  const folderEditedRef             = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [formErr, setFormErr]       = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [receiptName, setReceiptName]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [openGroups, setOpenGroups] = useState({})
  const fileRef = useRef(null)

  const load = useCallback(() => {
    fetch('/api/admin/expenses')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setExpenses(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-compute folder path from event_name + expense_date unless manually overridden
  useEffect(() => {
    if (!folderEditedRef.current) {
      setFolderPath(computeFolderPath(form.event_name, form.expense_date))
    }
  }, [form.event_name, form.expense_date])

  // Group by event_name, sorted by most recent expense in each group
  const groups = (() => {
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
        total: items.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
        totalTax: items.reduce((s, e) => s + parseFloat(e.tax_amount || 0), 0),
      }))
      .sort((a, b) => b.items[0].expense_date.localeCompare(a.items[0].expense_date))
  })()

  const grandTotal    = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const grandTotalTax = expenses.reduce((s, e) => s + parseFloat(e.tax_amount || 0), 0)

  function toggleGroup(name) {
    setOpenGroups(p => ({ ...p, [name]: !p[name] }))
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    setFormErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder_path', folderPath)
      const res = await fetch('/api/admin/expenses/upload-receipt', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Upload failed.'); return }
      setForm(p => ({ ...p, receipt_url: data.url }))
      setReceiptName(file.name)
    } catch {
      setFormErr('Upload failed. Please try again.')
    } finally {
      setUploadingFile(false)
    }
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
      setForm(EMPTY_FORM)
      setFolderPath('general')
      folderEditedRef.current = false
      setReceiptName('')
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      setFormErr('Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(expense) {
    setDeleting(expense.id)
    try {
      const res = await fetch(`/api/admin/expenses/${expense.id}`, { method: 'DELETE' })
      if (res.ok) setExpenses(prev => prev.filter(e => e.id !== expense.id))
    } catch {}
    setDeleting(null)
    setDeleteConfirm(null)
  }

  function exportCSV() {
    const rows = [
      ['Date', 'Event', 'Vendor', 'Category', 'Amount', 'Tax', 'Total', 'Receipt'],
      ...expenses.map(e => [
        e.expense_date,
        e.event_name || 'General',
        e.vendor || '',
        e.category || '',
        parseFloat(e.amount || 0).toFixed(2),
        parseFloat(e.tax_amount || 0).toFixed(2),
        (parseFloat(e.amount || 0) + parseFloat(e.tax_amount || 0)).toFixed(2),
        e.receipt_url || '',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `canvas-routes-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '900px' }}>
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
          <div style={{ flexGrow: 2, minWidth: '180px' }}>
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

        {/* Folder path + receipt upload row */}
        <div style={{ marginBottom: '0.6rem' }}>
          <L>Receipt Folder</L>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', color: '#bbb', userSelect: 'none' }}>receipts /</span>
            <input
              style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: '12px', color: '#555' }}
              value={folderPath}
              placeholder="general"
              onChange={e => { folderEditedRef.current = true; setFolderPath(e.target.value) }}
              onBlur={e => { if (!e.target.value.trim()) { folderEditedRef.current = false; setFolderPath(computeFolderPath(form.event_name, form.expense_date)) } }}
              maxLength={200}
            />
          </div>
          <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.25rem' }}>
            Auto-filled from event + date. Edit to override — subfolders use <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0 3px' }}>folder/subfolder</code>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          <button type="button" onClick={() => fileRef.current?.click()}
            disabled={uploadingFile}
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

      {/* Summary + export */}
      {expenses.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999' }}>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
            <span style={{ color: '#1a1a1a' }}>{fmt(grandTotal)}</span> + <span style={{ color: '#888' }}>{fmt(grandTotalTax)} tax</span>
          </div>
          <button onClick={exportCSV}
            style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', border: '0.5px solid rgba(0,0,0,0.18)', background: 'none', cursor: 'pointer', color: '#555', fontFamily: 'var(--font-inter),sans-serif', marginLeft: 'auto' }}>
            Export CSV
          </button>
        </div>
      )}

      {/* Grouped expense list */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : expenses.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No expenses yet.</div>
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

                {/* Expense rows */}
                {isOpen && (
                  <div>
                    {/* Desktop header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 90px 90px 90px 36px', padding: '0.45rem 1.1rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fdfdfc' }}>
                      {['Date', 'Vendor', 'Category', 'Amount', 'Tax', 'Total', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                      ))}
                    </div>
                    {group.items.map((expense, i) => {
                      const total = parseFloat(expense.amount || 0) + parseFloat(expense.tax_amount || 0)
                      const isPendingDelete = deleteConfirm === expense.id
                      const isDeletingThis = deleting === expense.id
                      return (
                        <div key={expense.id} style={{ borderBottom: i < group.items.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 90px 90px 90px 36px', padding: '0.65rem 1.1rem', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', color: '#555' }}>{fmtDate(expense.expense_date)}</div>
                            <div style={{ fontSize: '12px', color: '#333' }}>
                              {expense.vendor || <span style={{ color: '#ddd' }}>—</span>}
                              {expense.receipt_url && (
                                <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
                                  style={{ marginLeft: '0.4rem', fontSize: '10px', color: '#c5a882', textDecoration: 'none' }}
                                  title="View receipt">↗</a>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{expense.category || <span style={{ color: '#ddd' }}>—</span>}</div>
                            <div style={{ fontSize: '12px', color: '#333', fontVariantNumeric: 'tabular-nums' }}>{fmt(expense.amount)}</div>
                            <div style={{ fontSize: '12px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(expense.tax_amount) > 0 ? fmt(expense.tax_amount) : <span style={{ color: '#ddd' }}>—</span>}</div>
                            <div style={{ fontSize: '12px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              {!isPendingDelete && (
                                <button onClick={() => setDeleteConfirm(expense.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '14px', padding: '2px 4px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', transition: 'color 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#7B2032'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#ddd'}>
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 90px 90px 90px 36px', padding: '0.55rem 1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9' }}>
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
