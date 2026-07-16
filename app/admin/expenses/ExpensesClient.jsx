'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { inp, sel, L, GhostBtn, DangerBtn, Err } from '../_components/shared'
import { EXPENSE_CATEGORIES } from '../../../lib/expenseCategories'

const CATEGORIES = EXPENSE_CATEGORIES

const PAYMENT_METHODS = [
  { value: 'cash',      label: 'Cash' },
  { value: 'credit',    label: 'Credit card' },
  { value: 'etransfer', label: 'E-transfer' },
  { value: 'other',     label: 'Other' },
]
const PAYMENT_LABELS = { cash: 'Cash', credit: 'Card', etransfer: 'E-transfer', other: 'Other' }

// Canadian sales tax by province/territory, split into the federal GST/HST-federal
// portion (gst) and the provincial portion (prov: QST / PST / HST-provincial).
// Quebec is the default. "No tax / Other" covers non-taxable or foreign spend.
const PROVINCES = [
  { value: 'QC',   label: 'Quebec',                 gst: 0.05, prov: 0.09975, provLabel: 'QST' },
  { value: 'ON',   label: 'Ontario',                gst: 0.05, prov: 0.08,    provLabel: 'HST' },
  { value: 'BC',   label: 'British Columbia',       gst: 0.05, prov: 0.07,    provLabel: 'PST' },
  { value: 'AB',   label: 'Alberta',                gst: 0.05, prov: 0,       provLabel: 'PST' },
  { value: 'MB',   label: 'Manitoba',               gst: 0.05, prov: 0.07,    provLabel: 'PST' },
  { value: 'SK',   label: 'Saskatchewan',           gst: 0.05, prov: 0.06,    provLabel: 'PST' },
  { value: 'NS',   label: 'Nova Scotia',            gst: 0.05, prov: 0.09,    provLabel: 'HST' },
  { value: 'NB',   label: 'New Brunswick',          gst: 0.05, prov: 0.10,    provLabel: 'HST' },
  { value: 'NL',   label: 'Newfoundland & Lab.',    gst: 0.05, prov: 0.10,    provLabel: 'HST' },
  { value: 'PE',   label: 'Prince Edward Island',   gst: 0.05, prov: 0.10,    provLabel: 'HST' },
  { value: 'YT',   label: 'Yukon',                  gst: 0.05, prov: 0,       provLabel: 'PST' },
  { value: 'NT',   label: 'Northwest Territories',  gst: 0.05, prov: 0,       provLabel: 'PST' },
  { value: 'NU',   label: 'Nunavut',                gst: 0.05, prov: 0,       provLabel: 'PST' },
  { value: 'NONE', label: 'No tax / Other',         gst: 0,    prov: 0,       provLabel: 'Tax' },
]
const PROVINCE_MAP = Object.fromEntries(PROVINCES.map(p => [p.value, p]))
const provLabelOf = (code) => (PROVINCE_MAP[code] || PROVINCE_MAP.QC).provLabel

const EMPTY_FORM = { expense_date: '', event_name: '', vendor: '', paid: '', gst_amount: '', qst_amount: '', province: 'QC', category: '', payment_method: '', receipt_url: '' }

function round2(n) { return Math.round((parseFloat(n) || 0) * 100) / 100 }
// Break a tax-INCLUDED total into { subtotal, gst, qst } for a province's rates.
function splitTax(total, provinceCode) {
  const p = PROVINCE_MAP[provinceCode] || PROVINCE_MAP.QC
  const t = parseFloat(total) || 0
  const sub = t / (1 + p.gst + p.prov)
  return { subtotal: round2(sub), gst: round2(sub * p.gst), qst: round2(sub * p.prov) }
}
// A row's tax total: prefer the GST+QST split; fall back to the legacy tax_amount
// column so pre-split expenses keep showing their tax.
function taxOf(e) {
  const split = (parseFloat(e.gst_amount) || 0) + (parseFloat(e.qst_amount) || 0)
  return split > 0 ? split : (parseFloat(e.tax_amount) || 0)
}

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
function SelectChevron() {
  return <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
}

const COL = '96px 1fr 1fr 88px 88px 88px 78px'

export default function ExpensesClient() {
  const [expenses, setExpenses]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [folderEvent, setFolderEvent]   = useState('General')
  const folderManualRef                 = useRef(false)
  const taxManualRef                    = useRef(false)
  const [submitting, setSubmitting]     = useState(false)
  const [formErr, setFormErr]           = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [scanning, setScanning]         = useState(false)
  const [receiptName, setReceiptName]   = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteErr, setDeleteErr] = useState(null)
  const [deleting, setDeleting]         = useState(null)
  const [openGroups, setOpenGroups]     = useState({})
  const [openYears, setOpenYears]       = useState({})
  const [sortBy, setSortBy]             = useState('date_desc')
  const [filterEvent, setFilterEvent]   = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [showSummary, setShowSummary]   = useState(false)
  const [isMobile, setIsMobile]         = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [editForm, setEditForm]         = useState({})
  const [editSaving, setEditSaving]     = useState(false)
  const [editErr, setEditErr]           = useState(null)
  const [newIds, setNewIds]             = useState(new Set())
  const [editUploading, setEditUploading] = useState(false)
  const fileRef = useRef(null)
  const scanRef = useRef(null)
  const editFileRef = useRef(null)

  const load = useCallback(() => {
    fetch('/api/admin/expenses')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setExpenses(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  // Card layout on phones (iPhone 13 Pro ≈ 390px) instead of a side-scrolling table
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Sync folder selection to the form's event name unless user picked manually
  useEffect(() => {
    if (!folderManualRef.current) setFolderEvent(form.event_name?.trim() || 'General')
  }, [form.event_name])

  // Auto-split GST/QST from the tax-included amount + province, unless the admin
  // has typed a tax value by hand (taxManualRef). Recomputes as they type.
  useEffect(() => {
    if (taxManualRef.current) return
    if (!form.paid) return
    const { gst, qst } = splitTax(form.paid, form.province)
    setForm(p => ({ ...p, gst_amount: gst ? String(gst) : '', qst_amount: qst ? String(qst) : '' }))
  }, [form.paid, form.province])

  // Date-range + category filters feed both the list and the summary
  const baseFiltered = expenses.filter(e => {
    if (filterCategory !== 'all' && (e.category || '') !== filterCategory) return false
    if (dateFrom && e.expense_date < dateFrom) return false
    if (dateTo && e.expense_date > dateTo) return false
    return true
  })
  const usedCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))].sort()

  // Sort order applies to expenses within a folder AND to the folder order itself
  const totalOf = e => parseFloat(e.amount || 0) + taxOf(e)
  const sortItems = items => {
    const arr = [...items]
    if (sortBy === 'date_asc')    return arr.sort((a, b) => a.expense_date.localeCompare(b.expense_date))
    if (sortBy === 'amount_desc') return arr.sort((a, b) => totalOf(b) - totalOf(a))
    if (sortBy === 'amount_asc')  return arr.sort((a, b) => totalOf(a) - totalOf(b))
    if (sortBy === 'vendor_az')   return arr.sort((a, b) => (a.vendor || '').localeCompare(b.vendor || '') || b.expense_date.localeCompare(a.expense_date))
    return arr.sort((a, b) => b.expense_date.localeCompare(a.expense_date))
  }
  const sortEventGroups = evs => {
    if (sortBy === 'vendor_az')   return evs.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'amount_desc') return evs.sort((a, b) => (b.total + b.totalTax) - (a.total + a.totalTax))
    if (sortBy === 'amount_asc')  return evs.sort((a, b) => (a.total + a.totalTax) - (b.total + b.totalTax))
    if (sortBy === 'date_asc')    return evs.sort((a, b) => a.items[0].expense_date.localeCompare(b.items[0].expense_date))
    return evs.sort((a, b) => b.items[0].expense_date.localeCompare(a.items[0].expense_date))
  }

  // Groups: all events (used for the filter chips and totals)
  const allGroups = (() => {
    const map = {}
    for (const e of baseFiltered) {
      const key = e.event_name?.trim() || 'General'
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return sortEventGroups(Object.entries(map)
      .map(([name, items]) => ({
        name,
        items: sortItems(items),
        total:    items.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
        totalTax: items.reduce((s, e) => s + taxOf(e), 0),
      })))
  })()

  const eventNames = allGroups.map(g => g.name)
  const groups = filterEvent === 'all' ? allGroups : allGroups.filter(g => g.name === filterEvent)
  // Autocomplete source for the Event/Vendor inputs — reduces near-duplicate
  // group names from typos (e.g. "Into the Laurentians" vs "into the laurentians"
  // fragmenting the same event across two separate groups).
  const vendorNames = [...new Set(expenses.map(e => e.vendor?.trim()).filter(Boolean))].sort()

  // If the category/date filters narrow the list until the selected event's
  // chip disappears, the filter was silently still active with no chip shown
  // as selected -- reset to "All" so the UI never shows an orphaned filter.
  useEffect(() => {
    if (filterEvent !== 'all' && !eventNames.includes(filterEvent)) setFilterEvent('all')
  })

  // Folder hierarchy: Year → Event. An event spanning two years shows in both,
  // holding only that year's expenses, so yearly totals stay truthful.
  const yearGroups = (() => {
    const byYear = {}
    for (const g of groups) {
      for (const e of g.items) {
        const y = (e.expense_date || '').slice(0, 4) || 'Undated'
        if (!byYear[y]) byYear[y] = {}
        if (!byYear[y][g.name]) byYear[y][g.name] = []
        byYear[y][g.name].push(e)
      }
    }
    return Object.entries(byYear)
      .map(([year, evMap]) => {
        const events = sortEventGroups(Object.entries(evMap).map(([name, items]) => ({
          name,
          items: sortItems(items),
          total:    items.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
          totalTax: items.reduce((s, e) => s + taxOf(e), 0),
        })))
        return {
          year, events,
          count:    events.reduce((s, ev) => s + ev.items.length, 0),
          total:    events.reduce((s, ev) => s + ev.total, 0),
          totalTax: events.reduce((s, ev) => s + ev.totalTax, 0),
        }
      })
      .sort((a, b) => sortBy === 'date_asc' ? a.year.localeCompare(b.year) : b.year.localeCompare(a.year))
  })()
  const newestYear = yearGroups.reduce((m, g) => (g.year > m ? g.year : m), '')

  const visibleExpenses = groups.flatMap(g => g.items)
  const grandTotal    = visibleExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const grandTotalTax = visibleExpenses.reduce((s, e) => s + taxOf(e), 0)
  const missingReceiptCount = visibleExpenses.filter(e => !e.receipt_url).length

  // Summary breakdowns — reflect whatever the filters currently show
  const summaryByCategory = (() => {
    const map = {}
    for (const e of visibleExpenses) {
      const c = e.category || 'Uncategorized'
      if (!map[c]) map[c] = { count: 0, amount: 0, tax: 0 }
      map[c].count++
      map[c].amount += parseFloat(e.amount || 0)
      map[c].tax += taxOf(e)
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.amount + v.tax }))
      .sort((a, b) => b.total - a.total)
  })()
  // Per calendar quarter — GST + QST recoverable as input tax credits
  const summaryByQuarter = (() => {
    const map = {}
    for (const e of visibleExpenses) {
      if (!e.expense_date) continue
      const [y, m] = e.expense_date.split('-')
      const q = Math.floor((parseInt(m, 10) - 1) / 3) + 1
      const key = `${y}-Q${q}`
      if (!map[key]) map[key] = { gst: 0, qst: 0 }
      map[key].gst += parseFloat(e.gst_amount || 0)
      map[key].qst += parseFloat(e.qst_amount || 0)
    }
    return Object.entries(map)
      .map(([period, v]) => ({ period, ...v, total: v.gst + v.qst }))
      .sort((a, b) => b.period.localeCompare(a.period))
  })()
  const summaryGst = summaryByQuarter.reduce((s, q) => s + q.gst, 0)
  const summaryQst = summaryByQuarter.reduce((s, q) => s + q.qst, 0)

  function setRangePreset(preset) {
    const now = new Date()
    const y = now.getFullYear()
    const pad = n => String(n).padStart(2, '0')
    if (preset === 'all') { setDateFrom(''); setDateTo(''); return }
    if (preset === 'year') { setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`); return }
    if (preset === 'quarter') {
      const startM = Math.floor(now.getMonth() / 3) * 3 + 1
      const endM = startM + 2
      setDateFrom(`${y}-${pad(startM)}-01`); setDateTo(`${y}-${pad(endM)}-${pad(new Date(y, endM, 0).getDate())}`); return
    }
    if (preset === 'month') {
      const m = now.getMonth() + 1
      setDateFrom(`${y}-${pad(m)}-01`); setDateTo(`${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`)
    }
  }
  const hasDateFilter = !!(dateFrom || dateTo)

  function toggleGroup(name) { setOpenGroups(p => ({ ...p, [name]: !p[name] })) }

  function startEdit(expense) {
    setEditingId(expense.id)
    setEditErr(null)
    setDeleteConfirm(null)
    setEditForm({
      expense_date:   expense.expense_date || '',
      event_name:     expense.event_name   || '',
      vendor:         expense.vendor       || '',
      amount:         expense.amount != null ? String(expense.amount) : '',
      gst_amount:     expense.gst_amount != null && expense.gst_amount !== 0 ? String(expense.gst_amount) : '',
      qst_amount:     expense.qst_amount != null && expense.qst_amount !== 0 ? String(expense.qst_amount) : '',
      province:       expense.province     || 'QC',
      category:       expense.category     || '',
      payment_method: expense.payment_method || '',
      receipt_url:    expense.receipt_url  || '',
    })
  }

  function cancelEdit() { setEditingId(null); setEditErr(null) }

  // Edit uses the stored pre-tax subtotal directly, so tax = subtotal × rate.
  function applyEditTax() {
    const p = PROVINCE_MAP[editForm.province] || PROVINCE_MAP.QC
    const sub = parseFloat(editForm.amount) || 0
    setEditForm(f => ({ ...f, gst_amount: String(round2(sub * p.gst)), qst_amount: String(round2(sub * p.prov)) }))
  }

  async function saveEdit(id) {
    if (!editForm.expense_date) { setEditErr('Date is required.'); return }
    const amtNum = parseFloat(editForm.amount) || 0
    const gstNum = parseFloat(editForm.gst_amount) || 0
    const qstNum = parseFloat(editForm.qst_amount) || 0
    if (amtNum < 0 || gstNum < 0 || qstNum < 0) { setEditErr('Amounts cannot be negative.') ; return }
    setEditSaving(true); setEditErr(null)
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date:   editForm.expense_date,
          event_name:     editForm.event_name?.trim() || null,
          vendor:         editForm.vendor?.trim()     || null,
          category:       editForm.category || null,
          province:       editForm.province || 'QC',
          payment_method: editForm.payment_method || null,
          receipt_url:    editForm.receipt_url || null,
          amount:         amtNum,
          gst_amount:     gstNum,
          qst_amount:     qstNum,
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
      const uploadPath = slugify(folderEvent) + (form.expense_date ? `/${form.expense_date}` : '')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder_path', uploadPath)
      const res = await fetch('/api/admin/expenses/upload-receipt', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Upload failed.'); return }
      setForm(p => ({ ...p, receipt_url: data.url }))
      setReceiptName(file.name)
    } catch { setFormErr('Upload failed.') }
    finally { setUploadingFile(false) }
  }

  // Attach or replace a receipt on an existing expense from the edit panel.
  // The actual old-file cleanup happens server-side on Save (PATCH diffs the
  // receipt_url) so cancelling the edit here doesn't touch storage at all.
  async function handleEditFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditUploading(true); setEditErr(null)
    try {
      const uploadPath = slugify(editForm.event_name || 'General') + (editForm.expense_date ? `/${editForm.expense_date}` : '')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder_path', uploadPath)
      const res = await fetch('/api/admin/expenses/upload-receipt', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setEditErr(data.error || 'Upload failed.'); return }
      setEditForm(p => ({ ...p, receipt_url: data.url }))
    } catch { setEditErr('Upload failed.') }
    finally { setEditUploading(false); if (editFileRef.current) editFileRef.current.value = '' }
  }

  // Scan a receipt photo: Claude vision extracts the fields, we prefill the empty
  // ones (never clobber what the admin already typed), then attach the same file.
  async function handleScan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true); setFormErr(null)
    try {
      const sfd = new FormData()
      sfd.append('file', file)
      const res = await fetch('/api/admin/expenses/scan-receipt', { method: 'POST', body: sfd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Scan failed.'); return }

      const total = data.total != null ? data.total
        : (data.amount != null ? round2((data.amount || 0) + (data.gst || 0) + (data.qst || 0)) : null)
      if (data.gst != null || data.qst != null) taxManualRef.current = true
      setForm(p => ({
        ...p,
        vendor:       p.vendor       || data.vendor   || '',
        expense_date: p.expense_date || data.date     || '',
        category:     p.category     || data.category || '',
        paid:         p.paid         || (total   != null ? String(total)   : ''),
        gst_amount:   p.gst_amount   || (data.gst != null ? String(data.gst) : ''),
        qst_amount:   p.qst_amount   || (data.qst != null ? String(data.qst) : ''),
      }))

      // Also store the scanned file so it's attached to the expense in one step
      try {
        const path = slugify(folderEvent) + ((data.date || form.expense_date) ? `/${data.date || form.expense_date}` : '')
        const ufd = new FormData()
        ufd.append('file', file)
        ufd.append('folder_path', path)
        const ures = await fetch('/api/admin/expenses/upload-receipt', { method: 'POST', body: ufd })
        const udata = await ures.json().catch(() => ({}))
        if (ures.ok && udata.url) { setForm(p => ({ ...p, receipt_url: udata.url })); setReceiptName(file.name) }
      } catch {}
    } catch { setFormErr('Scan failed.') }
    finally { setScanning(false); if (scanRef.current) scanRef.current.value = '' }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.expense_date) { setFormErr('Date is required.'); return }
    const paidNum = parseFloat(form.paid) || 0
    if (!form.paid || paidNum <= 0) { setFormErr('Amount paid is required.'); return }
    const gstNum = round2(form.gst_amount)
    const qstNum = round2(form.qst_amount)
    if (gstNum < 0 || qstNum < 0) { setFormErr('Tax amounts cannot be negative.'); return }
    const subtotal = round2(paidNum - gstNum - qstNum)
    if (subtotal < 0) { setFormErr('Taxes are more than the amount paid.'); return }
    setSubmitting(true); setFormErr(null)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date:   form.expense_date,
          event_name:     form.event_name,
          vendor:         form.vendor,
          category:       form.category,
          receipt_url:    form.receipt_url,
          province:       form.province,
          payment_method: form.payment_method,
          amount:         subtotal,
          gst_amount:     gstNum,
          qst_amount:     qstNum,
        }),
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
      setFolderEvent('General')
      folderManualRef.current = false
      taxManualRef.current = false
      setReceiptName('')
      if (fileRef.current) fileRef.current.value = ''
    } catch { setFormErr('Network error.') }
    finally { setSubmitting(false) }
  }

  async function handleDelete(expense) {
    setDeleting(expense.id)
    setDeleteErr(null)
    try {
      const res = await fetch(`/api/admin/expenses/${expense.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setDeleteErr(d.error || 'Failed to delete expense.')
        setDeleting(null)
        return
      }
      setExpenses(prev => prev.filter(e => e.id !== expense.id))
      setDeleteConfirm(null)
    } catch {
      setDeleteErr('Network error — expense not deleted.')
    }
    setDeleting(null)
  }

  function exportCSV() {
    // Must match what's on screen — visibleExpenses already reflects the
    // event, category, AND date-range filters. A previous version of this
    // only respected the event filter, so "This quarter" + Export CSV
    // silently exported all-time data instead.
    const source = visibleExpenses
    const rows = [
      ['Date', 'Event', 'Vendor', 'Category', 'Payment', 'Province', 'Amount', 'GST', 'QST', 'Tax', 'Total', 'Receipt'],
      ...source.map(e => {
        const gst = parseFloat(e.gst_amount || 0), qst = parseFloat(e.qst_amount || 0)
        return [
          e.expense_date, e.event_name || 'General', e.vendor || '', e.category || '',
          PAYMENT_LABELS[e.payment_method] || '', e.province || 'QC',
          parseFloat(e.amount || 0).toFixed(2), gst.toFixed(2), qst.toFixed(2), taxOf(e).toFixed(2),
          (parseFloat(e.amount || 0) + taxOf(e)).toFixed(2),
          e.receipt_url || '',
        ]
      }),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `canvas-routes-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const today = new Date().toISOString().slice(0, 10)

  // Live breakdown for the add form
  const paidNum = parseFloat(form.paid) || 0
  const gstNum = parseFloat(form.gst_amount) || 0
  const qstNum = parseFloat(form.qst_amount) || 0
  const subtotalNum = round2(paidNum - gstNum - qstNum)

  return (
    <div className="exp-wrap" style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)', maxWidth: '900px' }}>
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
        /* iOS: inputs must be >=16px or Safari zooms on focus; kill tap highlight */
        .exp-wrap input, .exp-wrap select, .exp-wrap textarea { font-size: 16px !important; }
        .exp-wrap button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .exp-tap { min-height: 44px; }
        /* Grid cells must be allowed to shrink or they force page-level scroll on iOS */
        .exp-form-grid > div { min-width: 0; }
        .exp-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 640px) {
          .exp-form-grid { grid-template-columns: 1fr 1fr !important; }
          .exp-actions-row { flex-wrap: wrap; }
        }
      `}</style>

      <datalist id="exp-event-names">{eventNames.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="exp-vendor-names">{vendorNames.map(n => <option key={n} value={n} />)}</datalist>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Expenses</h1>
      </div>

      {/* Add form */}
      <form className="exp-form" onSubmit={handleSubmit} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Add Expense</div>

        {/* Scan-to-fill banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.7rem 0.85rem', marginBottom: '1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.35)', borderRadius: '8px' }}>
          <input ref={scanRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }} onChange={handleScan} />
          <button type="button" className="exp-tap" onClick={() => scanRef.current?.click()} disabled={scanning}
            style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', border: 'none', borderRadius: '6px', background: scanning ? 'rgba(15,30,20,0.55)' : '#0F1E14', color: '#F5F1EC', cursor: scanning ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {scanning ? 'Scanning…' : '⚡ Scan receipt'}
          </button>
          <span style={{ fontSize: '11px', color: '#8a7a5c', lineHeight: 1.4 }}>Snap or upload a receipt — we’ll auto-fill the vendor, date, amount &amp; tax.</span>
        </div>

        {/* Row 1 — what & where */}
        <div className="exp-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div>
            <L>Date</L>
            <input type="date" style={inp} max={today} value={form.expense_date}
              onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} required />
          </div>
          <div>
            <L>Event / Label</L>
            <input style={inp} value={form.event_name} placeholder="e.g. Into the Laurentians" list="exp-event-names"
              onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} maxLength={100} />
          </div>
          <div>
            <L>Vendor</L>
            <input style={inp} value={form.vendor} placeholder="e.g. Costco" list="exp-vendor-names"
              onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} maxLength={100} />
          </div>
          <div>
            <L>Category</L>
            <div style={{ position: 'relative' }}>
              <select style={sel} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <SelectChevron />
            </div>
          </div>
        </div>

        {/* Row 2 — money */}
        <div className="exp-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.6rem', marginBottom: '0.35rem' }}>
          <div>
            <L>Payment</L>
            <div style={{ position: 'relative' }}>
              <select style={sel} value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                <option value="">How paid…</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <L>Province</L>
            <div style={{ position: 'relative' }}>
              <select style={sel} value={form.province}
                onChange={e => { taxManualRef.current = false; setForm(p => ({ ...p, province: e.target.value })) }}>
                {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <L>Amount paid ($)</L>
            <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={form.paid} placeholder="tax incl."
              onChange={e => { taxManualRef.current = false; setForm(p => ({ ...p, paid: e.target.value })) }} required />
          </div>
          <div>
            <L>GST ($)</L>
            <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={form.gst_amount} placeholder="0.00"
              onChange={e => { taxManualRef.current = true; setForm(p => ({ ...p, gst_amount: e.target.value })) }} />
          </div>
          <div>
            <L>{provLabelOf(form.province)} ($)</L>
            <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={form.qst_amount} placeholder="0.00"
              onChange={e => { taxManualRef.current = true; setForm(p => ({ ...p, qst_amount: e.target.value })) }} />
          </div>
        </div>

        {/* Live breakdown */}
        {paidNum > 0 && (
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
            Subtotal <span style={{ color: '#555' }}>{fmt(subtotalNum)}</span>
            &nbsp;·&nbsp; GST <span style={{ color: '#555' }}>{fmt(gstNum)}</span>
            &nbsp;·&nbsp; {provLabelOf(form.province)} <span style={{ color: '#555' }}>{fmt(qstNum)}</span>
            &nbsp;·&nbsp; Total <span style={{ color: '#1a1a1a' }}>{fmt(paidNum)}</span>
          </div>
        )}

        {/* Folder selector */}
        {(() => {
          const existingNames = [...new Set(expenses.map(e => e.event_name?.trim()).filter(Boolean))]
          const formName = form.event_name?.trim()
          const options = ['General', ...existingNames, ...(formName && !existingNames.includes(formName) ? [formName] : [])]
          const previewPath = `receipts/${slugify(folderEvent)}${form.expense_date ? `/${form.expense_date}` : ''}/`
          return (
            <div style={{ marginBottom: '0.6rem' }}>
              <L>Save Receipt To</L>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
                {options.map(name => {
                  const active = folderEvent === name
                  return (
                    <button key={name} type="button" className="exp-tap"
                      onClick={() => { folderManualRef.current = true; setFolderEvent(name) }}
                      style={{
                        fontSize: '11px', padding: '6px 12px', border: '0.5px solid', cursor: 'pointer',
                        fontFamily: 'var(--font-inter),sans-serif', transition: 'all 0.15s', borderRadius: '6px',
                        background: active ? '#0F1E14' : 'none',
                        color:      active ? '#F5F1EC' : '#666',
                        borderColor: active ? '#0F1E14' : 'rgba(0,0,0,0.18)',
                      }}>
                      {name}
                    </button>
                  )
                })}
                {/* Dropdown for any custom value not in the list */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={options.includes(folderEvent) ? '' : folderEvent}
                    onChange={e => { if (e.target.value) { folderManualRef.current = true; setFolderEvent(e.target.value) } }}
                    style={{ ...sel, fontSize: '11px', padding: '6px 28px 6px 10px', color: options.includes(folderEvent) ? '#bbb' : '#333' }}>
                    <option value="">Other…</option>
                    {existingNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#bbb', fontFamily: 'monospace', wordBreak: 'break-all' }}>{previewPath}</div>
            </div>
          )
        })()}

        <div className="exp-actions-row" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          <button type="button" className="exp-tap" onClick={() => fileRef.current?.click()} disabled={uploadingFile}
            style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: 'none', cursor: uploadingFile ? 'default' : 'pointer', color: '#777', fontFamily: 'var(--font-inter),sans-serif' }}>
            {uploadingFile ? 'Uploading…' : '↑ Attach receipt'}
          </button>
          {receiptName && (
            <span style={{ fontSize: '11px', color: '#3B6B2F', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              ✓ {receiptName}
              <button type="button" onClick={() => { setForm(p => ({ ...p, receipt_url: '' })); setReceiptName(''); if (fileRef.current) fileRef.current.value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>×</button>
            </span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button type="submit" className="exp-tap" disabled={submitting || uploadingFile || scanning}
              style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', background: submitting ? 'rgba(15,30,20,0.6)' : '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '6px', cursor: submitting ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
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
                  <button key={name} className="exp-filter-chip exp-tap"
                    onClick={() => setFilterEvent(name)}
                    style={{
                      fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '6px 11px', border: '0.5px solid', borderRadius: '6px',
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

          {/* Date range + category filters */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.85rem' }}>
            <div style={{ width: '150px' }}>
              <L>From</L>
              <input type="date" style={inp} value={dateFrom} max={dateTo || today}
                onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div style={{ width: '150px' }}>
              <L>To</L>
              <input type="date" style={inp} value={dateTo} min={dateFrom || undefined} max={today}
                onChange={e => setDateTo(e.target.value)} />
            </div>
            <div style={{ width: '180px' }}>
              <L>Category</L>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="all">All categories</option>
                  {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SelectChevron />
              </div>
            </div>
            <div style={{ width: '170px' }}>
              <L>Sort</L>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="amount_desc">Highest amount</option>
                  <option value="amount_asc">Lowest amount</option>
                  <option value="vendor_az">Vendor A–Z</option>
                </select>
                <SelectChevron />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', paddingBottom: '2px' }}>
              {[['month', 'This month'], ['quarter', 'This quarter'], ['year', 'This year'], ['all', 'All time']].map(([key, label]) => {
                const active = key === 'all' ? !hasDateFilter : false
                return (
                  <button key={key} type="button" className="exp-tap" onClick={() => setRangePreset(key)}
                    style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 10px', border: '0.5px solid', borderRadius: '6px', background: active ? '#0F1E14' : 'none', color: active ? '#F5F1EC' : '#777', borderColor: active ? '#0F1E14' : 'rgba(0,0,0,0.15)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Summary row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999' }}>
              {visibleExpenses.length} expense{visibleExpenses.length !== 1 ? 's' : ''}
              {filterEvent !== 'all' && <span style={{ color: '#c5a882' }}> · {filterEvent}</span>}
              &nbsp;·&nbsp;
              <span style={{ color: '#1a1a1a' }}>{fmt(grandTotal)}</span>
              {grandTotalTax > 0 && <> + <span style={{ color: '#888' }}>{fmt(grandTotalTax)} tax</span></>}
              {missingReceiptCount > 0 && <> &nbsp;·&nbsp; <span style={{ color: '#93333E' }}>{missingReceiptCount} missing receipt{missingReceiptCount !== 1 ? 's' : ''}</span></>}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
              <button onClick={() => setShowSummary(s => !s)} className="exp-tap"
                style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: '0.5px solid', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', background: showSummary ? '#0F1E14' : 'none', color: showSummary ? '#F5F1EC' : '#555', borderColor: showSummary ? '#0F1E14' : 'rgba(0,0,0,0.18)' }}>
                {showSummary ? 'Hide summary' : 'Summary'}
              </button>
              <button onClick={exportCSV} className="exp-tap"
                style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px', background: 'none', cursor: 'pointer', color: '#555', fontFamily: 'var(--font-inter),sans-serif' }}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary panel */}
          {showSummary && (
            <div style={{ marginTop: '1rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.1rem 1.25rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '1.1rem' }}>
                Summary{hasDateFilter ? ` · ${dateFrom || '…'} → ${dateTo || '…'}` : ' · All time'}
                {filterEvent !== 'all' && ` · ${filterEvent}`}
                {filterCategory !== 'all' && ` · ${filterCategory}`}
              </div>

              {visibleExpenses.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#bbb' }}>No expenses in this range.</div>
              ) : (
                <>
                  {/* By category */}
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>By category</div>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem' }}>
                    <div style={{ minWidth: '440px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 90px 90px 92px', padding: '0.35rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                        {['Category', 'Items', 'Subtotal', 'Tax', 'Total'].map((h, i) => (
                          <div key={i} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
                        ))}
                      </div>
                      {summaryByCategory.map(c => (
                        <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 90px 90px 92px', padding: '0.45rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: '12px', color: '#333' }}>{c.name}</div>
                          <div style={{ fontSize: '12px', color: '#999', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.count}</div>
                          <div style={{ fontSize: '12px', color: '#555', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.amount)}</div>
                          <div style={{ fontSize: '12px', color: '#888', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.tax)}</div>
                          <div style={{ fontSize: '12px', color: '#1a1a1a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.total)}</div>
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 90px 90px 92px', padding: '0.5rem 0', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
                        <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>Total</div>
                        <div />
                        <div style={{ fontSize: '12px', color: '#555', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal)}</div>
                        <div style={{ fontSize: '12px', color: '#888', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotalTax)}</div>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal + grandTotalTax)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Tax recoverable by quarter */}
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.3rem' }}>Tax recoverable by quarter</div>
                  <div style={{ fontSize: '10px', color: '#bbb', marginBottom: '0.65rem' }}>GST &amp; QST paid — claimable as input tax credits.</div>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <div style={{ minWidth: '380px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '0.35rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                        {['Quarter', 'GST', 'QST', 'Total'].map((h, i) => (
                          <div key={i} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
                        ))}
                      </div>
                      {summaryByQuarter.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#bbb', padding: '0.5rem 0' }}>No GST/QST recorded in this range.</div>
                      ) : (
                        <>
                          {summaryByQuarter.map(q => (
                            <div key={q.period} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '0.45rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                              <div style={{ fontSize: '12px', color: '#333' }}>{q.period.replace('-', ' ')}</div>
                              <div style={{ fontSize: '12px', color: '#555', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(q.gst)}</div>
                              <div style={{ fontSize: '12px', color: '#555', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(q.qst)}</div>
                              <div style={{ fontSize: '12px', color: '#1a1a1a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(q.total)}</div>
                            </div>
                          ))}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '0.5rem 0', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
                            <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>Total</div>
                            <div style={{ fontSize: '12px', color: '#555', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(summaryGst)}</div>
                            <div style={{ fontSize: '12px', color: '#555', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(summaryQst)}</div>
                            <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(summaryGst + summaryQst)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {yearGroups.map(yg => {
            // Newest year starts open; the rest start collapsed
            const yearOpen = openYears[yg.year] ?? (yg.year === newestYear)
            return (
              <div key={yg.year}>
                {/* Year folder header */}
                <button onClick={() => setOpenYears(p => ({ ...p, [yg.year]: !yearOpen }))} className="exp-tap"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.35rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <ChevronIcon open={yearOpen} />
                  <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '21px', fontWeight: 400, color: '#1a1a1a', lineHeight: 1 }}>{yg.year}</span>
                  <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {yg.events.length} folder{yg.events.length !== 1 ? 's' : ''} · {yg.count} item{yg.count !== 1 ? 's' : ''}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(yg.total)}</span>
                  {yg.totalTax > 0 && (
                    <span style={{ fontSize: '11px', color: '#bbb', whiteSpace: 'nowrap' }}>+{fmt(yg.totalTax)} tax</span>
                  )}
                </button>

                {yearOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: isMobile ? 0 : '1.5rem', marginBottom: '0.75rem' }}>
          {yg.events.map(group => {
            const gKey = `${yg.year}::${group.name}`
            const isOpen = !!openGroups[gKey]
            return (
              <div key={gKey} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                {/* Group header */}
                <button onClick={() => toggleGroup(gKey)} className="exp-tap"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1.1rem', background: '#fafaf9', border: 'none', borderRadius: isOpen ? '12px 12px 0 0' : '12px', borderBottom: isOpen ? '0.5px solid rgba(0,0,0,0.07)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <ChevronIcon open={isOpen} />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', flex: 1, minWidth: 0 }}>{group.name}</span>
                  <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '13px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(group.total)}</span>
                  {group.totalTax > 0 && (
                    <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '0.25rem', whiteSpace: 'nowrap' }}>+{fmt(group.totalTax)} tax</span>
                  )}
                </button>

                {isOpen && (
                  <div>
                    {/* Column headers — desktop only; mobile uses card rows */}
                    {!isMobile && (
                      <div className="exp-scroll">
                        <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.45rem 1.1rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fdfdfc', minWidth: '560px' }}>
                          {['Date', 'Vendor', 'Category', 'Amount', 'Tax', 'Total', ''].map((h, i) => (
                            <div key={i} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {group.items.map((expense, i) => {
                      const rowTax          = taxOf(expense)
                      const total           = parseFloat(expense.amount || 0) + rowTax
                      const isPendingDelete = deleteConfirm === expense.id
                      const isDeletingThis  = deleting === expense.id
                      const isEditing       = editingId === expense.id
                      const isNew           = newIds.has(expense.id)

                      const actionButtons = (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', alignItems: 'center' }}>
                          {!isPendingDelete && !isEditing && (
                            <>
                              <button onClick={() => startEdit(expense)}
                                style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: '6px', cursor: 'pointer', color: '#777', fontSize: '11px', padding: isMobile ? '7px 16px' : '4px 8px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.04em' }}>
                                Edit
                              </button>
                              <button onClick={() => { setDeleteConfirm(expense.id); setEditingId(null) }} aria-label="Delete expense"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c99', fontSize: '18px', padding: isMobile ? '4px 10px' : '2px 6px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                            </>
                          )}
                          {isEditing && (
                            <button onClick={cancelEdit}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '11px', padding: '4px 6px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.04em' }}>
                              Cancel
                            </button>
                          )}
                        </div>
                      )

                      return (
                        <div key={expense.id} className={isNew ? 'exp-new' : ''}
                          style={{ borderBottom: i < group.items.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>

                          {isMobile ? (
                            /* Mobile card — no horizontal scroll */
                            <div style={{ padding: '0.8rem 1.1rem', background: isEditing ? 'rgba(197,168,130,0.04)' : undefined }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    {expense.vendor || <span style={{ color: '#ccc' }}>No vendor</span>}
                                    {expense.receipt_url && (
                                      <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
                                        style={{ fontSize: '11px', color: '#c5a882', textDecoration: 'none' }}>↗</a>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                                    {fmtDate(expense.expense_date)}
                                    {expense.category && <> · {expense.category}</>}
                                    {expense.payment_method && <> · {PAYMENT_LABELS[expense.payment_method]}</>}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</div>
                                  {rowTax > 0 && (
                                    <div style={{ fontSize: '10px', color: '#aaa', fontVariantNumeric: 'tabular-nums', marginTop: '1px' }}>{fmt(expense.amount)} + {fmt(rowTax)} tax</div>
                                  )}
                                </div>
                              </div>
                              {!isEditing && !isPendingDelete && <div style={{ marginTop: '0.6rem' }}>{actionButtons}</div>}
                            </div>
                          ) : (
                            /* Desktop table row — scrolls horizontally on its own */
                            <div className="exp-scroll">
                              <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.65rem 1.1rem', alignItems: 'center', background: isEditing ? 'rgba(197,168,130,0.04)' : undefined, transition: 'background 0.2s', minWidth: '560px' }}>
                                <div style={{ fontSize: '12px', color: '#555' }}>{fmtDate(expense.expense_date)}</div>
                                <div style={{ fontSize: '12px', color: '#333', minWidth: 0 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    {expense.vendor || <span style={{ color: '#ddd' }}>—</span>}
                                    {expense.receipt_url && (
                                      <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer"
                                        style={{ fontSize: '10px', color: '#c5a882', textDecoration: 'none' }}>↗</a>
                                    )}
                                    {expense.payment_method && (
                                      <span style={{ fontSize: '9px', color: '#aaa', letterSpacing: '0.04em' }}>· {PAYMENT_LABELS[expense.payment_method]}</span>
                                    )}
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#888' }}>{expense.category || <span style={{ color: '#ddd' }}>—</span>}</div>
                                <div style={{ fontSize: '12px', color: '#333', fontVariantNumeric: 'tabular-nums' }}>{fmt(expense.amount)}</div>
                                <div style={{ fontSize: '12px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                                  {rowTax > 0 ? fmt(rowTax) : <span style={{ color: '#ddd' }}>—</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</div>
                                {actionButtons}
                              </div>
                            </div>
                          )}

                          {/* Edit panel — full width, not inside the row scroller */}
                          {isEditing && (
                            <div className="exp-edit-panel" style={{ padding: '1rem 1.1rem 1.1rem', borderTop: '0.5px solid rgba(197,168,130,0.2)', background: 'rgba(197,168,130,0.04)', borderLeft: '2px solid #c5a882' }}>
                              <div className="exp-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div>
                                  <L>Date</L>
                                  <input type="date" style={inp} value={editForm.expense_date} max={today} required
                                    onChange={e => setEditForm(p => ({ ...p, expense_date: e.target.value }))} />
                                </div>
                                <div>
                                  <L>Event / Label</L>
                                  <input style={inp} value={editForm.event_name} placeholder="General" list="exp-event-names"
                                    onChange={e => setEditForm(p => ({ ...p, event_name: e.target.value }))} maxLength={100} />
                                </div>
                                <div>
                                  <L>Vendor</L>
                                  <input style={inp} value={editForm.vendor} placeholder="—" list="exp-vendor-names"
                                    onChange={e => setEditForm(p => ({ ...p, vendor: e.target.value }))} maxLength={100} />
                                </div>
                                <div>
                                  <L>Category</L>
                                  <div style={{ position: 'relative' }}>
                                    <select style={sel} value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                                      <option value="">—</option>
                                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <SelectChevron />
                                  </div>
                                </div>
                                <div>
                                  <L>Payment</L>
                                  <div style={{ position: 'relative' }}>
                                    <select style={sel} value={editForm.payment_method} onChange={e => setEditForm(p => ({ ...p, payment_method: e.target.value }))}>
                                      <option value="">—</option>
                                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                    <SelectChevron />
                                  </div>
                                </div>
                                <div>
                                  <L>Province</L>
                                  <div style={{ position: 'relative' }}>
                                    <select style={sel} value={editForm.province} onChange={e => setEditForm(p => ({ ...p, province: e.target.value }))}>
                                      {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                    <SelectChevron />
                                  </div>
                                </div>
                                <div>
                                  <L>Subtotal ($)</L>
                                  <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={editForm.amount} placeholder="0.00"
                                    onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
                                </div>
                                <div>
                                  <L>GST ($)</L>
                                  <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={editForm.gst_amount} placeholder="0.00"
                                    onChange={e => setEditForm(p => ({ ...p, gst_amount: e.target.value }))} />
                                </div>
                                <div>
                                  <L>{provLabelOf(editForm.province)} ($)</L>
                                  <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={editForm.qst_amount} placeholder="0.00"
                                    onChange={e => setEditForm(p => ({ ...p, qst_amount: e.target.value }))} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => saveEdit(expense.id)} disabled={editSaving || editUploading} className="exp-tap"
                                  style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', background: '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '6px', cursor: (editSaving || editUploading) ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: (editSaving || editUploading) ? 0.6 : 1 }}>
                                  {editSaving ? 'Saving…' : 'Save'}
                                </button>
                                <GhostBtn small onClick={cancelEdit}>Cancel</GhostBtn>
                                <button type="button" onClick={applyEditTax}
                                  style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 12px', background: 'none', border: '0.5px solid rgba(197,168,130,0.6)', borderRadius: '6px', color: '#8a7a5c', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                                  Auto tax ({editForm.province})
                                </button>
                                <input ref={editFileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleEditFileChange} />
                                {editForm.receipt_url ? (
                                  <>
                                    <a href={editForm.receipt_url} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize: '11px', color: '#c5a882', marginLeft: '0.25rem', textDecoration: 'none' }}>
                                      View receipt ↗
                                    </a>
                                    <button type="button" onClick={() => editFileRef.current?.click()} disabled={editUploading}
                                      style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 12px', background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px', color: '#777', cursor: editUploading ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                                      {editUploading ? 'Uploading…' : 'Replace'}
                                    </button>
                                    <button type="button" onClick={() => setEditForm(p => ({ ...p, receipt_url: '' }))}
                                      style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 12px', background: 'none', border: 'none', color: '#c99', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                                      Remove
                                    </button>
                                  </>
                                ) : (
                                  <button type="button" onClick={() => editFileRef.current?.click()} disabled={editUploading}
                                    style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 12px', background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px', color: '#777', cursor: editUploading ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                                    {editUploading ? 'Uploading…' : '↑ Attach receipt'}
                                  </button>
                                )}
                              </div>
                              {editErr && <Err msg={editErr} />}
                            </div>
                          )}

                          {/* Delete confirm */}
                          {isPendingDelete && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.6rem 1.1rem', background: 'rgba(147,51,62,0.03)', borderTop: '0.5px solid rgba(147,51,62,0.08)', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', color: '#93333E' }}>Delete this expense?</span>
                              <DangerBtn small onClick={() => handleDelete(expense)} disabled={isDeletingThis}>{isDeletingThis ? '…' : 'Delete'}</DangerBtn>
                              <GhostBtn small onClick={() => { setDeleteConfirm(null); setDeleteErr(null) }}>Cancel</GhostBtn>
                              {deleteErr && <span style={{ fontSize: '11px', color: '#93333E' }}>{deleteErr}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Group total row */}
                    {isMobile ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', padding: '0.7rem 1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9' }}>
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>Group total</span>
                        <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 500, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                          {fmt(group.total + group.totalTax)}
                          {group.totalTax > 0 && <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 400 }}> incl. {fmt(group.totalTax)} tax</span>}
                        </span>
                      </div>
                    ) : (
                      <div className="exp-scroll">
                        <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.55rem 1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9', minWidth: '560px' }}>
                          <div style={{ gridColumn: '1 / 4', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Group total</div>
                          <div style={{ fontSize: '12px', color: '#555', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.total)}</div>
                          <div style={{ fontSize: '12px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>{group.totalTax > 0 ? fmt(group.totalTax) : '—'}</div>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.total + group.totalTax)}</div>
                          <div />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
