'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import { inp, sel, L, GhostBtn, DangerBtn, Err } from '../_components/shared'
import { EXPENSE_CATEGORIES } from '../../../lib/expenseCategories'
import { EXPENSE_PAYMENT_METHODS, EXPENSE_PAYMENT_LABELS } from '../../../lib/expensePaymentMethods'
import { EXPENSE_PROVINCES, EXPENSE_PROVINCE_MAP } from '../../../lib/expenseProvinces'
import { uploadToSupabaseStorage } from '../../../lib/uploadToSupabaseStorage'
import { compressImageClient } from '../../../lib/compressImageClient'
import { convertHeicIfNeeded } from '../../../lib/convertHeicIfNeeded'

const CATEGORIES = EXPENSE_CATEGORIES
const PAYMENT_METHODS = EXPENSE_PAYMENT_METHODS
const PAYMENT_LABELS = EXPENSE_PAYMENT_LABELS
const PROVINCES = EXPENSE_PROVINCES
const PROVINCE_MAP = EXPENSE_PROVINCE_MAP
const provLabelOf = (code) => (PROVINCE_MAP[code] || PROVINCE_MAP.QC).provLabel
const provinceNameOf = (code) => (PROVINCE_MAP[code] || PROVINCE_MAP.QC).label
const paymentLabelOf = (code) => code ? (PAYMENT_LABELS[code] || code) : '—'

const EMPTY_FORM = { expense_date: '', event_name: '', vendor: '', paid: '', gst_amount: '', qst_amount: '', tip: '', province: 'QC', category: '', payment_method: '', vendor_tax_id: '', currency: 'CAD', original_amount: '', receipt_url: '', notes: '' }

// Currencies offered for foreign purchases (US car parts, etc.). CAD is the
// reporting currency — amount/gst/qst/tip are always stored in CAD; a non-CAD
// currency just records what the receipt itself was in, with original_amount.
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'Other']

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
// Tip / gratuity (restaurants) — sits on top of subtotal + tax, untaxed.
function tipOf(e) { return parseFloat(e.tip_amount) || 0 }
// Portion of a row's tax that's actually claimable as an input tax credit —
// GST always is; the provincial portion only in provRecoverable provinces
// (Quebec's QST and the provincial slice of HST). A standalone PST
// (BC/MB/SK) was paid but isn't recoverable, so it's excluded here even
// though taxOf() above still counts it as money actually spent.
function recoverableTaxOf(e) {
  const p = PROVINCE_MAP[e.province] || PROVINCE_MAP.QC
  const gst = parseFloat(e.gst_amount) || 0
  const qst = p.provRecoverable ? (parseFloat(e.qst_amount) || 0) : 0
  const legacyTax = (gst === 0 && qst === 0) ? (parseFloat(e.tax_amount) || 0) : 0
  return gst + qst + (p.provRecoverable ? legacyTax : 0)
}
// Grand total actually paid: subtotal + tax + tip.
function grandTotalOf(e) { return (parseFloat(e.amount) || 0) + taxOf(e) + tipOf(e) }

// All attachments on an expense (new receipt_urls list, falling back to the
// legacy single receipt_url for older rows).
function attachmentsOf(e) {
  const urls = (Array.isArray(e.receipt_urls) && e.receipt_urls.length) ? e.receipt_urls : (e.receipt_url ? [e.receipt_url] : [])
  return urls.filter(Boolean)
}
// File extension from a storage URL (defaults to jpg).
function receiptExt(url) {
  const x = (url.split('?')[0].split('.').pop() || '').toLowerCase()
  return /^[a-z0-9]{2,5}$/.test(x) ? x : 'jpg'
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

const COL = '22px 96px 1fr 1fr 88px 88px 88px 78px'

// Shared by all three upload sites below: browser -> Supabase Storage
// directly via a signed URL (receipts include scanned PDFs, which run
// larger than a request body limit should have to accommodate), then a
// confirm step verifies the file landed and hands back its public URL.
async function uploadReceipt(file, folderPath) {
  if (file.size > 25 * 1024 * 1024) throw new Error('File must be under 25 MB.')
  const urlRes = await fetch('/api/admin/expenses/upload-receipt/upload-url', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath, fileName: file.name, fileType: file.type }),
  })
  const urls = await urlRes.json().catch(() => ({}))
  if (!urlRes.ok) throw new Error(urls.error || 'Upload failed.')
  await uploadToSupabaseStorage({ bucket: 'receipts', path: urls.path, token: urls.token, file })
  const res = await fetch('/api/admin/expenses/upload-receipt', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: urls.path }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Upload failed.')
  return data.url
}

// Cleans up a receipt that was uploaded but never made it into a saved
// expense row (replaced before saving, removed, or the edit/add was
// abandoned) — without this, every such upload sits in Storage forever,
// since the only other cleanup path only ever looks at what's already in
// the DB. Best-effort: the server also refuses to delete anything still
// attached to a real expense, so this is safe to fire liberally.
async function deleteReceiptByUrl(url) {
  if (!url) return
  await fetch('/api/admin/expenses/upload-receipt', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }).catch(() => {})
}

export default function ExpensesClient() {
  const [expenses, setExpenses]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [folderEvent, setFolderEvent]   = useState('General')
  const folderManualRef                 = useRef(false)
  const taxManualRef                    = useRef(false)
  // Set once the admin picks a province by hand, so a receipt scan won't
  // overwrite it. Default 'QC' is truthy, so the scan's `|| data.province`
  // pattern could never apply a scanned province without this.
  const provinceManualRef               = useRef(false)
  // Signature of the last add-form state the admin confirmed past the
  // duplicate warning, so re-clicking Save adds it, but editing any key field
  // re-arms the check.
  const dupAckSigRef                    = useRef(null)
  const [submitting, setSubmitting]     = useState(false)
  const [formErr, setFormErr]           = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [scanning, setScanning]         = useState(false)
  const [scanNotice, setScanNotice]     = useState(null) // { type: 'ok'|'warn', text }
  const [attachments, setAttachments]   = useState([]) // add-form attachments: [{ url, name }] — invoice + receipt, etc.
  const [filterMissing, setFilterMissing] = useState(false)
  const [filterUnreconciled, setFilterUnreconciled] = useState(false)
  const [zippingReceipts, setZippingReceipts] = useState(null) // { done, total, failed } | null
  const [exportingPdf, setExportingPdf] = useState(false)
  const [pdfErr, setPdfErr] = useState(null)
  const [copiedReceipt, setCopiedReceipt] = useState(null) // url just copied
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteErr, setDeleteErr] = useState(null)
  const [deleting, setDeleting]         = useState(null)
  const [openGroups, setOpenGroups]     = useState({})
  const [openYears, setOpenYears]       = useState({})
  const [sortBy, setSortBy]             = useState('date_desc')
  const [viewMode, setViewMode]         = useState('flat') // 'flat' (one date-sorted list) | 'folders' (Year → Event)
  const [filterEvent, setFilterEvent]   = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPayment, setFilterPayment]   = useState('all')
  const [filterProvince, setFilterProvince] = useState('all')
  const [filterCurrency, setFilterCurrency] = useState('all') // 'all' | 'CAD' | 'foreign'
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [showSummary, setShowSummary]   = useState(false)
  const [showAdd, setShowAdd]           = useState(false)
  const [isMobile, setIsMobile]         = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [editForm, setEditForm]         = useState({})
  const [editSaving, setEditSaving]     = useState(false)
  const [editErr, setEditErr]           = useState(null)
  const [newIds, setNewIds]             = useState(new Set())
  const [editUploading, setEditUploading] = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const [selectedIds, setSelectedIds]   = useState(new Set())
  const [bulkBusy, setBulkBusy]         = useState(false)
  const [bulkErr, setBulkErr]           = useState(null)
  const [bulkConfirm, setBulkConfirm]   = useState(null) // { field, value, label } awaiting yes/no
  const [bulkCategoryPick, setBulkCategoryPick] = useState('')
  const [bulkEventPick, setBulkEventPick] = useState('')
  const fileRef = useRef(null)
  const scanRef = useRef(null)
  const cameraRef = useRef(null) // camera-capture input (opens the rear camera directly on iOS)
  const scanBtnRef = useRef(null)
  const [scanHighlight, setScanHighlight] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const runScanRef = useRef(null) // always points at the latest runScan for the DnD listeners
  const editFileRef = useRef(null)
  // Tracks an uploaded-but-not-yet-saved receipt so it can be deleted from
  // Storage if it's replaced, removed, or the form/edit is abandoned before
  // saving — see deleteReceiptByUrl above.
  const [editAttachments, setEditAttachments] = useState([]) // edit panel: [{ url, isNew }]

  const load = useCallback(() => {
    fetch('/api/admin/expenses')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setExpenses(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  // First visit with nothing recorded: open the add form so the page isn't bare
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (!loading && expenses.length === 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      setShowAdd(true)
    }
  }, [loading, expenses.length])

  // Deep link from the dashboard "Scan a Receipt" button (/admin/expenses?scan=1):
  // open the add form, scroll the scanner into view and pulse it. The file
  // picker can't be auto-opened (browsers require a user gesture), so we make
  // the Scan button the obvious next tap. The query param is cleared so a
  // refresh doesn't re-trigger it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!new URLSearchParams(window.location.search).get('scan')) return
    setShowAdd(true)
    setScanHighlight(true)
    window.history.replaceState(null, '', '/admin/expenses')
    const scrollT = setTimeout(() => scanBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    const offT = setTimeout(() => setScanHighlight(false), 3200)
    return () => { clearTimeout(scrollT); clearTimeout(offT) }
  }, [])

  // Card layout on phones (iPhone 13 Pro ≈ 390px) instead of a side-scrolling table
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Keep the DnD listeners pointed at the latest runScan without re-binding them.
  useEffect(() => { runScanRef.current = runScan })

  // Drag-and-drop a receipt anywhere on the page to scan it (desktop only —
  // touch devices have no file drag-and-drop, and drag events don't fire there,
  // so the Scan button stays the path on mobile). Listeners live on window so a
  // drop counts no matter where on the page it lands. A depth counter avoids the
  // overlay flickering as the cursor crosses child elements.
  useEffect(() => {
    if (isMobile) return
    let depth = 0
    const hasFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files')
    const onEnter = e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setDragActive(true) }
    const onOver  = e => { if (!hasFiles(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy' }
    const onLeave = e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (depth === 0) setDragActive(false) }
    const onDrop  = e => {
      if (!hasFiles(e)) return
      e.preventDefault(); depth = 0; setDragActive(false)
      const file = e.dataTransfer.files?.[0]
      if (file) runScanRef.current?.(file)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [isMobile])

  // Sync folder selection to the form's event name unless user picked manually
  useEffect(() => {
    if (!folderManualRef.current) setFolderEvent(form.event_name?.trim() || 'General')
  }, [form.event_name])

  // Auto-split GST/QST from the tax-included amount + province, unless the admin
  // has typed a tax value by hand (taxManualRef). The tip is subtracted first —
  // it's not taxed — so the split is only on subtotal + tax. Recomputes as they type.
  useEffect(() => {
    if (taxManualRef.current) return
    if (!form.paid) return
    const taxable = (parseFloat(form.paid) || 0) - (parseFloat(form.tip) || 0)
    const { gst, qst } = splitTax(taxable, form.province)
    setForm(p => ({ ...p, gst_amount: gst ? String(gst) : '', qst_amount: qst ? String(qst) : '' }))
  }, [form.paid, form.province, form.tip])

  // Date-range + category + free-text filters feed both the list and the summary
  const searchTerm = searchQuery.trim().toLowerCase()
  const baseFiltered = expenses.filter(e => {
    if (filterCategory !== 'all' && (e.category || '') !== filterCategory) return false
    if (filterPayment !== 'all' && (e.payment_method || '') !== filterPayment) return false
    if (filterProvince !== 'all' && (e.province || 'QC') !== filterProvince) return false
    if (filterCurrency === 'CAD' && e.currency && e.currency !== 'CAD') return false
    if (filterCurrency === 'foreign' && (!e.currency || e.currency === 'CAD')) return false
    if (dateFrom && e.expense_date < dateFrom) return false
    if (dateTo && e.expense_date > dateTo) return false
    if (filterMissing && attachmentsOf(e).length) return false
    if (filterUnreconciled && e.reconciled) return false
    if (searchTerm) {
      const haystack = `${e.vendor || ''} ${e.event_name || ''} ${e.category || ''} ${e.notes || ''}`.toLowerCase()
      if (!haystack.includes(searchTerm)) return false
    }
    return true
  })
  const usedCategories = [...new Set(expenses.map(e => e.category).filter(Boolean))].sort()
  // Only offer provinces actually in use — computed from the full list (not
  // baseFiltered) so the option never disappears out from under a selection
  // the way a dynamic value like event name could.
  const usedProvinces = PROVINCES.filter(p => expenses.some(e => (e.province || 'QC') === p.value))
  const usedForeign = expenses.some(e => e.currency && e.currency !== 'CAD')

  // Sort order applies to expenses within a folder AND to the folder order itself
  const totalOf = e => grandTotalOf(e)
  const sortItems = items => {
    const arr = [...items]
    // Guard the date sort keys — expense_date is NOT NULL in the DB today, but
    // a null slipping in (bad import, future schema change) would throw on
    // .localeCompare and blank the whole list rather than just mis-order a row.
    const d = e => e.expense_date || ''
    if (sortBy === 'date_asc')    return arr.sort((a, b) => d(a).localeCompare(d(b)))
    if (sortBy === 'amount_desc') return arr.sort((a, b) => totalOf(b) - totalOf(a))
    if (sortBy === 'amount_asc')  return arr.sort((a, b) => totalOf(a) - totalOf(b))
    if (sortBy === 'vendor_az')   return arr.sort((a, b) => (a.vendor || '').localeCompare(b.vendor || '') || d(b).localeCompare(d(a)))
    if (sortBy === 'category_az') return arr.sort((a, b) => (a.category || '').localeCompare(b.category || '') || d(b).localeCompare(d(a)))
    // Mostly useful in flat (by-date) view, where rows from different events
    // are interleaved — clusters same-event rows together without folding
    // into Folders view.
    if (sortBy === 'event_az')    return arr.sort((a, b) => (a.event_name?.trim() || 'General').localeCompare(b.event_name?.trim() || 'General') || d(b).localeCompare(d(a)))
    if (sortBy === 'added_desc')  return arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return arr.sort((a, b) => d(b).localeCompare(d(a)))
  }
  const sortEventGroups = evs => {
    // Guard the date key like sortItems does — a null/blank expense_date would
    // otherwise throw on .localeCompare and blank the whole list.
    const gd = g => g.items[0]?.expense_date || ''
    if (sortBy === 'vendor_az' || sortBy === 'event_az') return evs.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'amount_desc') return evs.sort((a, b) => (b.total + b.totalTax + b.totalTip) - (a.total + a.totalTax + a.totalTip))
    if (sortBy === 'amount_asc')  return evs.sort((a, b) => (a.total + a.totalTax + a.totalTip) - (b.total + b.totalTax + b.totalTip))
    if (sortBy === 'date_asc')    return evs.sort((a, b) => gd(a).localeCompare(gd(b)))
    if (sortBy === 'added_desc')  return evs.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
    return evs.sort((a, b) => gd(b).localeCompare(gd(a)))
  }
  // Most recent created_at among a folder's items — powers the "added_desc"
  // group order (category_az has no folder-level equivalent, so it falls
  // through to the default date order at the group level; items within each
  // folder still sort by category).
  const addedAtOf = items => items.reduce((m, e) => (e.created_at && e.created_at > m ? e.created_at : m), '')

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
        totalTip: items.reduce((s, e) => s + tipOf(e), 0),
        addedAt:  addedAtOf(items),
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
          totalTip: items.reduce((s, e) => s + tipOf(e), 0),
          addedAt:  addedAtOf(items),
        })))
        return {
          year, events,
          count:    events.reduce((s, ev) => s + ev.items.length, 0),
          total:    events.reduce((s, ev) => s + ev.total, 0),
          totalTax: events.reduce((s, ev) => s + ev.totalTax, 0),
          totalTip: events.reduce((s, ev) => s + ev.totalTip, 0),
        }
      })
      .sort((a, b) => sortBy === 'date_asc' ? a.year.localeCompare(b.year) : b.year.localeCompare(a.year))
  })()
  const newestYear = yearGroups.reduce((m, g) => (g.year > m ? g.year : m), '')

  const visibleExpenses = groups.flatMap(g => g.items)
  const grandTotal    = visibleExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const grandTotalTax = visibleExpenses.reduce((s, e) => s + taxOf(e), 0)
  const grandTotalTip = visibleExpenses.reduce((s, e) => s + tipOf(e), 0)
  // What's actually claimable as an ITC — see recoverableTaxOf. Distinct from
  // grandTotalTax (all tax actually paid, including non-recoverable PST).
  const grandRecoverableTax = visibleExpenses.reduce((s, e) => s + recoverableTaxOf(e), 0)
  const missingReceiptCount = visibleExpenses.filter(e => !attachmentsOf(e).length).length

  // The list renders from `renderYearGroups`. In 'folders' mode that's the real
  // Year → Event hierarchy; in 'flat' mode it's a single synthetic year+group
  // holding every visible receipt in one strict date order (honouring the sort
  // dropdown) — so the same row machinery (edit/delete/select) is reused, just
  // with the year/event headers hidden and the event name shown per row.
  const renderYearGroups = viewMode === 'flat'
    ? [{
        year: '__flat__',
        events: [{ name: '__flat__', items: sortItems(visibleExpenses), total: grandTotal, totalTax: grandTotalTax, totalTip: grandTotalTip }],
        count: visibleExpenses.length, total: grandTotal, totalTax: grandTotalTax, totalTip: grandTotalTip,
      }]
    : yearGroups

  // Summary breakdowns — reflect whatever the filters currently show
  const summaryByCategory = (() => {
    const map = {}
    for (const e of visibleExpenses) {
      const c = e.category || 'Uncategorized'
      if (!map[c]) map[c] = { count: 0, amount: 0, tax: 0, tip: 0 }
      map[c].count++
      map[c].amount += parseFloat(e.amount || 0)
      map[c].tax += taxOf(e)
      map[c].tip += tipOf(e)
    }
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.amount + v.tax + v.tip }))
      .sort((a, b) => b.total - a.total)
  })()
  // By payment method — for reconciling against a card/bank statement.
  const summaryByPayment = (() => {
    const map = {}
    for (const e of visibleExpenses) {
      const key = e.payment_method || 'unset'
      if (!map[key]) map[key] = { count: 0, total: 0 }
      map[key].count++
      map[key].total += grandTotalOf(e)
    }
    return Object.entries(map)
      .map(([key, v]) => ({ key, name: key === 'unset' ? 'Not set' : (PAYMENT_LABELS[key] || key), ...v }))
      .sort((a, b) => b.total - a.total)
  })()
  // Per calendar quarter — GST + QST recoverable as input tax credits. The
  // provincial column only counts a row's tax if that province's tax is
  // actually an ITC (QST / provincial-HST) — a BC/MB/SK PST line shows up in
  // "By category" and CSV as tax paid, but not here, since it can't be
  // claimed back. See recoverableTaxOf.
  const summaryByQuarter = (() => {
    const map = {}
    for (const e of visibleExpenses) {
      if (!e.expense_date) continue
      const [y, m] = e.expense_date.split('-')
      const q = Math.floor((parseInt(m, 10) - 1) / 3) + 1
      const key = `${y}-Q${q}`
      if (!map[key]) map[key] = { gst: 0, qst: 0 }
      const p = PROVINCE_MAP[e.province] || PROVINCE_MAP.QC
      map[key].gst += parseFloat(e.gst_amount || 0)
      if (p.provRecoverable) map[key].qst += parseFloat(e.qst_amount || 0)
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
    // Switching edit targets without saving abandons any attachment just added
    // in the previous edit panel — flush the unsaved ones before starting fresh.
    editAttachments.filter(a => a.isNew).forEach(a => deleteReceiptByUrl(a.url))
    setEditingId(expense.id)
    setEditErr(null)
    setDeleteConfirm(null)
    setEditAttachments(attachmentsOf(expense).map(url => ({ url, isNew: false })))
    setEditForm({
      expense_date:   expense.expense_date || '',
      event_name:     expense.event_name   || '',
      vendor:         expense.vendor       || '',
      amount:         expense.amount != null ? String(expense.amount) : '',
      gst_amount:     expense.gst_amount != null && expense.gst_amount !== 0 ? String(expense.gst_amount) : '',
      qst_amount:     expense.qst_amount != null && expense.qst_amount !== 0 ? String(expense.qst_amount) : '',
      tip:            expense.tip_amount != null && expense.tip_amount !== 0 ? String(expense.tip_amount) : '',
      province:       expense.province     || 'QC',
      category:       expense.category     || '',
      payment_method: expense.payment_method || '',
      vendor_tax_id:  expense.vendor_tax_id || '',
      currency:       expense.currency     || 'CAD',
      original_amount: expense.original_amount != null ? String(expense.original_amount) : '',
      notes:          expense.notes        || '',
    })
  }

  function cancelEdit() {
    // Attachments added but not saved are discarded with the rest of the edit —
    // clean them up rather than leaving them orphaned in Storage. Originals
    // (isNew:false) are left alone.
    editAttachments.filter(a => a.isNew).forEach(a => deleteReceiptByUrl(a.url))
    setEditAttachments([])
    setEditingId(null); setEditErr(null)
  }

  // Remove one attachment from the edit panel. An unsaved (just-uploaded) one is
  // deleted from storage now; an original is only removed from the list — the
  // PATCH route cleans up removed originals after Save.
  function removeEditAttachment(url) {
    setEditAttachments(prev => {
      const a = prev.find(x => x.url === url)
      if (a?.isNew) deleteReceiptByUrl(url)
      return prev.filter(x => x.url !== url)
    })
  }

  // Copy an expense into the Add form — recurring purchases (fuel, coffee
  // supplies, the same vendor every event) become a two-tap entry
  function duplicateExpense(expense) {
    const total = grandTotalOf(expense)
    // Start the new draft with no attachments — discard any the current draft
    // had uploaded-but-unsaved so they don't carry over or orphan.
    attachments.forEach(a => deleteReceiptByUrl(a.url))
    setAttachments([])
    taxManualRef.current = true
    folderManualRef.current = true
    provinceManualRef.current = true
    dupAckSigRef.current = null
    setFolderEvent(expense.event_name || 'General')
    setForm({
      ...EMPTY_FORM,
      event_name:     expense.event_name || '',
      vendor:         expense.vendor || '',
      paid:           total ? String(round2(total)) : '',
      gst_amount:     expense.gst_amount ? String(expense.gst_amount) : '',
      qst_amount:     expense.qst_amount ? String(expense.qst_amount) : '',
      tip:            expense.tip_amount ? String(expense.tip_amount) : '',
      province:       expense.province || 'QC',
      category:       expense.category || '',
      payment_method: expense.payment_method || '',
      vendor_tax_id:  expense.vendor_tax_id || '',
      currency:       expense.currency || 'CAD',
      original_amount: expense.original_amount != null ? String(expense.original_amount) : '',
    })
    setScanNotice({ type: 'ok', text: `Copied "${expense.vendor || 'expense'}" — set the date and save.` })
    setFormErr(null)
    setShowAdd(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
    const tipNum = parseFloat(editForm.tip) || 0
    if (amtNum < 0 || gstNum < 0 || qstNum < 0 || tipNum < 0) { setEditErr('Amounts cannot be negative.') ; return }
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
          receipt_urls:   editAttachments.map(a => a.url),
          notes:          editForm.notes || null,
          amount:         amtNum,
          gst_amount:     gstNum,
          qst_amount:     qstNum,
          tip_amount:     tipNum,
          vendor_tax_id:  editForm.vendor_tax_id || '',
          currency:       editForm.currency || 'CAD',
          original_amount: (editForm.currency && editForm.currency !== 'CAD') ? (editForm.original_amount || '') : '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setEditErr(data.error || 'Failed to save.'); return }
      // Committed — the PATCH route already cleaned up any removed originals.
      setEditAttachments([])
      setExpenses(prev => prev.map(e => e.id === id ? data : e))
      setEditingId(null)
    } catch { setEditErr('Network error.') }
    finally { setEditSaving(false) }
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || [])
    if (fileRef.current) fileRef.current.value = ''
    if (!files.length) return
    setUploadingFile(true); setFormErr(null)
    try {
      // Attach one OR several files (invoice + receipt) — each appends to the
      // list rather than replacing, so nothing you attach is lost.
      const uploadPath = slugify(folderEvent) + (form.expense_date ? `/${form.expense_date}` : '')
      for (const file of files) {
        const url = await uploadReceipt(file, uploadPath)
        setAttachments(prev => [...prev, { url, name: file.name }])
      }
    } catch (err) { setFormErr(err.message || 'Upload failed.') }
    finally { setUploadingFile(false) }
  }

  // Attach one or more files to an existing expense from the edit panel — each
  // appends to the list (invoice + receipt). New (unsaved) attachments are
  // cleaned up on Cancel; removed originals are cleaned up server-side on Save.
  async function handleEditFileChange(e) {
    const files = Array.from(e.target.files || [])
    if (editFileRef.current) editFileRef.current.value = ''
    if (!files.length) return
    setEditUploading(true); setEditErr(null)
    try {
      const uploadPath = slugify(editForm.event_name || 'General') + (editForm.expense_date ? `/${editForm.expense_date}` : '')
      for (const file of files) {
        const url = await uploadReceipt(file, uploadPath)
        setEditAttachments(prev => [...prev, { url, isNew: true }])
      }
    } catch (err) { setEditErr(err.message || 'Upload failed.') }
    finally { setEditUploading(false) }
  }

  // Scan a receipt photo: Claude vision extracts the fields, we prefill the empty
  // ones (never clobber what the admin already typed), then attach the same file.
  async function handleScan(e) {
    await runScan(e.target.files?.[0])
  }

  // Core scan pipeline — shared by the Scan button (file input) and desktop
  // drag-and-drop (drop a receipt anywhere on the page). Opens the add form so
  // the fields it prefills are visible.
  async function runScan(file) {
    if (!file) return
    setShowAdd(true)
    setScanning(true); setFormErr(null); setScanNotice(null)
    try {
      // Claude's vision API doesn't need full camera resolution to read a
      // receipt, and this route posts straight to a Next.js API route body —
      // unlike every other upload on this page, it can't use a signed
      // Storage URL, so it's stuck with Vercel's ~4.5MB serverless request
      // cap. A downscaled copy comfortably clears that; the untouched
      // original is still what gets attached to the expense below via
      // uploadReceipt(). PDFs can't be canvas-compressed, so those are
      // capped client-side instead of silently hitting the platform wall.
      let scanFile = file
      if (file.type === 'application/pdf') {
        if (file.size > 4 * 1024 * 1024) { setFormErr('PDF is too large to scan (max 4 MB) — attach it below instead and enter the details manually.'); return }
      } else {
        // iPhone receipt photos are usually HEIC — the scan route can't read
        // those and compressImageClient passes small ones through untouched,
        // so convert to JPEG first (no-op for already-web formats). Downscale
        // to ~1400px / q0.72 specifically for the OCR call — under the vision
        // API's ~1568px cap, so it costs fewer image tokens while staying
        // legible, and the full-resolution original is still what gets attached
        // to the expense below via uploadReceipt(file).
        scanFile = await compressImageClient(await convertHeicIfNeeded(file), { maxEdge: 1400, quality: 0.72 })
      }
      const sfd = new FormData()
      sfd.append('file', scanFile)
      const res = await fetch('/api/admin/expenses/scan-receipt', { method: 'POST', body: sfd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || (res.status === 413 ? 'That file is too large to scan.' : 'Scan failed.')); return }

      const total = data.total != null ? data.total
        : (data.amount != null ? round2((data.amount || 0) + (data.gst || 0) + (data.qst || 0) + (data.tip || 0)) : null)
      const scanTip = data.tip != null ? round2(data.tip) : null

      // Scan-time duplicate check — warn right away if this vendor + date + total
      // already exists, so the same receipt isn't scanned and saved twice. Mirrors
      // the Save-time guard in handleSubmit, just caught earlier.
      const sVendor = (data.vendor || '').trim().toLowerCase()
      const sTotal = total != null ? round2(total) : null
      const dup = (sVendor && data.date && sTotal != null)
        ? expenses.find(x =>
            (x.vendor || '').trim().toLowerCase() === sVendor &&
            x.expense_date === data.date &&
            Math.abs(grandTotalOf(x) - sTotal) < 0.01)
        : null

      // Second document (invoice + receipt): compare this scan against what the
      // first one already filled and flag any differences, so a mismatched total
      // / vendor / date / tender between the two doesn't slip through. Fields
      // already filled are kept (not clobbered); genuinely empty ones still get
      // filled from this scan by the merge below.
      const isSubsequent = attachments.length > 0
      const curTip = parseFloat(form.tip) || 0
      const curPaid = parseFloat(form.paid) || 0

      // Non-total diffs first — if the vendor/date/tender don't match, this is
      // probably a genuinely different purchase, not a tip-only difference, so
      // the higher-total-means-tip fallback below must not fire.
      const otherDiffs = []
      if (isSubsequent) {
        if (data.vendor && form.vendor && data.vendor.trim().toLowerCase() !== form.vendor.trim().toLowerCase()) otherDiffs.push(`vendor “${data.vendor}” vs “${form.vendor}”`)
        if (data.date && form.expense_date && data.date !== form.expense_date) otherDiffs.push(`date ${data.date} vs ${form.expense_date}`)
        if (data.payment_method && form.payment_method && data.payment_method !== form.payment_method) otherDiffs.push(`paid by ${PAYMENT_LABELS[data.payment_method] || data.payment_method} vs ${PAYMENT_LABELS[form.payment_method] || form.payment_method}`)
      }

      // Restaurant flow: the first document is the itemized bill (subtotal +
      // tax); the later payment receipt often adds a TIP on top. Two cases:
      //  1. The model read an explicit tip line ("Pourboire"/"Tip"/"Service") —
      //     use that value directly.
      //  2. The payment slip only prints a single total with no line items to
      //     key off (common on card terminal slips), so the model can't tell
      //     tip from anything else — in that case, if this scan's total is
      //     simply higher than what's already on the form and nothing else
      //     about it looks like a different purchase, treat the extra as a
      //     tip instead of hard-erroring as a mismatch. A tip guess the admin
      //     can correct beats blocking every restaurant receipt with a card tip.
      let tipAdded = null
      let tipGuessed = false
      if (isSubsequent && curTip === 0 && sTotal != null) {
        if (scanTip != null && scanTip > 0) {
          tipAdded = scanTip
        } else if (!otherDiffs.length && curPaid > 0 && sTotal > curPaid) {
          tipAdded = round2(sTotal - curPaid)
          tipGuessed = true
        }
      }

      const diffs = [...otherDiffs]
      if (isSubsequent && tipAdded == null) {
        // Compare amounts NET of tip on both sides, so a tip-only difference
        // doesn't read as a mismatch.
        const scanPreTip = (sTotal != null ? sTotal : 0) - (scanTip || 0)
        const curPreTip = curPaid - curTip
        if (sTotal != null && curPaid > 0 && Math.abs(scanPreTip - curPreTip) > 0.01) diffs.push(`total ${fmt(scanPreTip)} vs ${fmt(curPreTip)}`)
      }

      // Foreign-currency receipt (US car parts, etc.): we DON'T drop the foreign
      // amounts into the CAD fields — the CAD figure is whatever the card was
      // actually charged (from the statement). Record the currency + original
      // total and prompt for the CAD amount.
      const isForeign = !!(data.currency && data.currency !== 'CAD')
      setScanNotice(dup
        ? { type: 'warn', text: `Heads up — you already logged a ${fmt(sTotal)} expense from “${data.vendor}” on ${data.date}. Saving will add a second copy.` }
        : isForeign
          ? { type: 'ok', text: `Scanned a ${data.currency} receipt — original total ${fmt(total)} ${data.currency} recorded. Enter the CAD amount your card was charged before saving.` }
          : diffs.length
            ? { type: 'warn', text: `Second document differs from the first — ${diffs.join(' · ')}. The fields already filled were kept; adjust manually if this one is the correct source.` }
            : tipAdded != null
              ? { type: 'ok', text: tipGuessed
                  ? `Payment receipt total is ${fmt(tipAdded)} higher than the invoice — treating the difference as a tip (couldn't find a separate tip line). Total updated to ${fmt(total)} — double-check before saving.`
                  : `Payment receipt adds a ${fmt(tipAdded)} tip — total updated to ${fmt(total)}. ✓` }
              : data.mismatch
                ? { type: 'warn', text: "Scanned, but the numbers on this receipt don't add up (subtotal + taxes ≠ total). Double-check the amounts before saving." }
                : isSubsequent
                  ? { type: 'ok', text: 'Second document scanned & attached — it matches the first. ✓' }
                  : { type: 'ok', text: `Scanned ✓ ${data.vendor || 'receipt'}${data.total != null ? ` — ${fmt(data.total)}` : ''}. Review the fields before saving.` })

      // The scan is authoritative about tax — including a receipt that has NONE
      // (zero-rated groceries/food). Always lock out the auto-split effect after
      // a scan so it can't impute GST/QST the receipt didn't actually charge.
      // (To re-enable auto-split, the admin just changes the province.)
      taxManualRef.current = true
      setForm(p => ({
        ...p,
        vendor:         p.vendor         || data.vendor   || '',
        expense_date:   p.expense_date   || data.date     || '',
        category:       p.category       || data.category || '',
        // Money fields fill from the scan ONLY for CAD receipts — a foreign
        // receipt's amounts aren't CAD, so they're left for manual entry from
        // the statement (see isForeign notice). When a later payment receipt
        // adds a tip, bump paid to the tipped grand total; otherwise fill if empty.
        paid:           isForeign ? p.paid : (tipAdded != null ? (total != null ? String(total) : p.paid) : (p.paid || (total != null ? String(total) : ''))),
        gst_amount:     isForeign ? p.gst_amount : (p.gst_amount || (data.gst != null ? String(data.gst) : '')),
        qst_amount:     isForeign ? p.qst_amount : (p.qst_amount || (data.qst != null ? String(data.qst) : '')),
        // tipAdded covers both an explicit tip line on a subsequent scan AND a
        // guessed tip (case 2 above); scanTip covers an explicit tip found on
        // a FIRST scan (tipAdded is only ever set when isSubsequent).
        tip:            isForeign ? p.tip : (parseFloat(p.tip) > 0 ? p.tip : ((tipAdded ?? scanTip) > 0 ? String(tipAdded ?? scanTip) : p.tip)),
        payment_method: p.payment_method || data.payment_method || '',
        vendor_tax_id:  p.vendor_tax_id  || data.vendor_tax_id || '',
        currency:       (p.currency && p.currency !== 'CAD') ? p.currency : (data.currency || p.currency || 'CAD'),
        original_amount: isForeign ? (p.original_amount || (total != null ? String(total) : '')) : p.original_amount,
        // Scanned province wins ONLY if the admin hasn't picked one by hand —
        // then a total-only receipt from, say, Ontario splits at ON rates, not
        // the QC default. Scanning never sets provinceManualRef, so re-scanning
        // a different receipt still updates it.
        province:       provinceManualRef.current ? p.province : (data.province || p.province),
        notes:          p.notes          || data.notes    || '',
      }))

      // Also attach the scanned file — APPENDED, so scanning an invoice and
      // then its receipt keeps both on the expense instead of replacing.
      try {
        const path = slugify(folderEvent) + ((data.date || form.expense_date) ? `/${data.date || form.expense_date}` : '')
        const url = await uploadReceipt(file, path)
        setAttachments(prev => [...prev, { url, name: file.name }])
      } catch {
        // Fields were extracted fine, but the receipt image itself didn't
        // attach — this used to fail silently, leaving a green "Scanned ✓"
        // banner while the expense would save with no receipt at all.
        setScanNotice({ type: 'warn', text: "Fields were read, but the receipt image couldn't be attached — use \"Attach receipt\" below to add it manually." })
      }
    } catch { setFormErr('Scan failed.') }
    finally { setScanning(false); if (scanRef.current) scanRef.current.value = '' }
  }

  // Close the Add form WITHOUT saving → discard the whole draft: delete any
  // receipt that was uploaded-but-never-saved (otherwise it orphans in storage)
  // and clear the form so a scanned-but-abandoned expense doesn't linger.
  function closeAddForm() {
    // Discard every uploaded-but-unsaved attachment so nothing orphans.
    attachments.forEach(a => deleteReceiptByUrl(a.url))
    setAttachments([])
    setForm(EMPTY_FORM)
    setFolderEvent('General')
    folderManualRef.current = false
    taxManualRef.current = false
    provinceManualRef.current = false
    dupAckSigRef.current = null
    setScanNotice(null)
    setFormErr(null)
    if (fileRef.current) fileRef.current.value = ''
    if (scanRef.current) scanRef.current.value = ''
    setShowAdd(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.expense_date) { setFormErr('Date is required.'); return }
    const paidNum = parseFloat(form.paid) || 0
    if (!form.paid || paidNum <= 0) { setFormErr('Amount paid is required.'); return }
    const gstNum = round2(form.gst_amount)
    const qstNum = round2(form.qst_amount)
    const tipNum = round2(form.tip)
    if (gstNum < 0 || qstNum < 0 || tipNum < 0) { setFormErr('Tax/tip amounts cannot be negative.'); return }
    const subtotal = round2(paidNum - gstNum - qstNum - tipNum)
    if (subtotal < 0) { setFormErr('Taxes and tip are more than the amount paid.'); return }

    // Duplicate guard — scanning the same receipt twice, or a double-tap on
    // Save, would otherwise silently create two identical rows. Warn once; a
    // second Save with the same vendor+date+total goes through, and editing any
    // of those fields re-arms the check.
    const totalPaid = round2(paidNum)
    const vendorKey = (form.vendor || '').trim().toLowerCase()
    const sig = `${vendorKey}|${form.expense_date}|${totalPaid}`
    if (vendorKey && dupAckSigRef.current !== sig) {
      const dup = expenses.find(x =>
        (x.vendor || '').trim().toLowerCase() === vendorKey &&
        x.expense_date === form.expense_date &&
        Math.abs(grandTotalOf(x) - totalPaid) < 0.01
      )
      if (dup) {
        setFormErr(`Looks like a duplicate — a ${fmt(totalPaid)} expense from “${form.vendor.trim()}” on ${form.expense_date} already exists. Click Save again to add it anyway.`)
        dupAckSigRef.current = sig
        return
      }
    }
    setSubmitting(true); setFormErr(null)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date:   form.expense_date,
          event_name:     form.event_name,
          vendor:         form.vendor,
          category:       form.category,
          receiptUrls:    attachments.map(a => a.url),
          province:       form.province,
          payment_method: form.payment_method,
          notes:          form.notes,
          amount:         subtotal,
          gst_amount:     gstNum,
          qst_amount:     qstNum,
          tip_amount:     tipNum,
          vendor_tax_id:  form.vendor_tax_id,
          currency:       form.currency || 'CAD',
          original_amount: form.currency !== 'CAD' ? form.original_amount : '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setFormErr(data.error || 'Failed to save.'); return }
      // Now committed to the DB row — the attachments are saved, so just clear
      // the list (don't delete the files).
      setAttachments([])
      setExpenses(prev => [data, ...prev])
      setNewIds(prev => new Set([...prev, data.id]))
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(data.id); return n }), 700)
      // Auto-open the year + group this expense landed in — group keys are
      // `${year}::${name}` since the Year → Event folders rework (a bare name
      // key silently matched nothing)
      const groupName = data.event_name?.trim() || 'General'
      const groupYear = String(data.expense_date || '').slice(0, 4)
      setOpenGroups(p => ({ ...p, [`${groupYear}::${groupName}`]: true }))
      if (groupYear) setOpenYears(p => ({ ...p, [groupYear]: true }))
      setForm(EMPTY_FORM)
      setFolderEvent('General')
      folderManualRef.current = false
      taxManualRef.current = false
      provinceManualRef.current = false
      dupAckSigRef.current = null
      setScanNotice(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch { setFormErr('Network error.') }
    finally { setSubmitting(false) }
  }

  // Tick an expense off against the bank/card statement (optimistic).
  async function toggleReconciled(expense) {
    const next = !expense.reconciled
    setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, reconciled: next } : e))
    try {
      const res = await fetch(`/api/admin/expenses/${expense.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reconciled: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, reconciled: !next } : e))
    }
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
      setSelectedIds(prev => { if (!prev.has(expense.id)) return prev; const n = new Set(prev); n.delete(expense.id); return n })
      setDeleteConfirm(null)
    } catch {
      setDeleteErr('Network error — expense not deleted.')
    }
    setDeleting(null)
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function clearSelection() {
    setSelectedIds(new Set()); setBulkConfirm(null); setBulkCategoryPick(''); setBulkEventPick(''); setBulkErr(null)
  }

  // Bulk delete / re-categorize / move-to-event for every currently-selected
  // expense — loops the existing per-id endpoints (same confirm-then-apply
  // pattern as the Members admin page's bulkUpdate) rather than adding a new
  // bulk API route.
  async function bulkDelete() {
    setBulkBusy(true); setBulkErr(null)
    const ids = [...selectedIds]
    const results = await Promise.allSettled(ids.map(id =>
      fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' }).then(res => { if (!res.ok) throw new Error() })
    ))
    const succeededIds = new Set(ids.filter((id, i) => results[i].status === 'fulfilled'))
    const failed = ids.length - succeededIds.size
    setExpenses(prev => prev.filter(e => !succeededIds.has(e.id)))
    setBulkBusy(false); setBulkConfirm(null)
    if (failed > 0) { setBulkErr(`${failed} of ${ids.length} failed to delete.`); setSelectedIds(prev => new Set([...prev].filter(id => !succeededIds.has(id)))) }
    else clearSelection()
  }

  async function bulkUpdate(field, value) {
    setBulkBusy(true); setBulkErr(null)
    const ids = [...selectedIds]
    const results = await Promise.allSettled(ids.map(id =>
      fetch(`/api/admin/expenses/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }),
      }).then(res => { if (!res.ok) throw new Error() })
    ))
    const failed = results.filter(r => r.status === 'rejected').length
    setBulkBusy(false); setBulkConfirm(null)
    if (failed > 0) setBulkErr(`${failed} of ${ids.length} failed to update.`)
    load()
    setSelectedIds(new Set()); setBulkCategoryPick(''); setBulkEventPick('')
  }

  function exportCSV() {
    // Must match what's on screen — visibleExpenses already reflects the
    // event, category, AND date-range filters. A previous version of this
    // only respected the event filter, so "This quarter" + Export CSV
    // silently exported all-time data instead.
    const source = visibleExpenses
    const rows = [
      ['Date', 'Event', 'Vendor', 'Vendor Tax #', 'Category', 'Payment', 'Province', 'Currency', 'Original', 'Amount', 'GST', 'QST', 'Tax', 'Tip', 'Total', 'Reconciled', 'Receipt', 'Notes'],
      ...source.map(e => {
        const gst = parseFloat(e.gst_amount || 0), qst = parseFloat(e.qst_amount || 0)
        return [
          e.expense_date, e.event_name || 'General', e.vendor || '', e.vendor_tax_id || '', e.category || '',
          PAYMENT_LABELS[e.payment_method] || '', e.province || 'QC',
          e.currency || 'CAD', (e.original_amount != null ? parseFloat(e.original_amount).toFixed(2) : ''),
          parseFloat(e.amount || 0).toFixed(2), gst.toFixed(2), qst.toFixed(2), taxOf(e).toFixed(2),
          tipOf(e).toFixed(2), grandTotalOf(e).toFixed(2),
          e.reconciled ? 'Yes' : 'No',
          attachmentsOf(e).join(' | '), e.notes || '',
        ]
      }),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `canvas-routes-expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(a.href)
  }

  // Formal, printable report — same filtered/sorted data as the CSV export
  // and the on-screen Summary panel, laid out with a logo header, a clickable
  // bookmark outline (Summary → each Year → each Event), and clickable
  // receipt links. yearGroups always uses the real Year→Event hierarchy
  // regardless of the on-screen viewMode toggle (a printed report reads
  // better organized than a flat dump).
  async function exportPDF() {
    setExportingPdf(true)
    try {
      const { exportExpensesPdf } = await import('./expensePdf')
      const parts = []
      if (hasDateFilter) parts.push(`${dateFrom || '…'} → ${dateTo || '…'}`)
      if (filterEvent !== 'all') parts.push(filterEvent)
      if (filterCategory !== 'all') parts.push(filterCategory)
      if (filterPayment !== 'all') parts.push(PAYMENT_LABELS[filterPayment] || filterPayment)
      if (filterProvince !== 'all') parts.push(PROVINCE_MAP[filterProvince]?.label || filterProvince)
      if (filterCurrency !== 'all') parts.push(filterCurrency === 'CAD' ? 'CAD only' : 'Foreign only')
      if (searchTerm) parts.push(`"${searchQuery.trim()}"`)
      const subtitle = parts.length ? parts.join(' · ') : 'All time'

      const stats = [
        { label: 'Total spent', value: fmt(grandTotal + grandTotalTax + grandTotalTip) },
        { label: 'Tax recoverable', value: fmt(grandRecoverableTax) },
        { label: 'Expenses', value: String(visibleExpenses.length) },
        { label: 'Missing receipts', value: String(missingReceiptCount) },
      ]

      await exportExpensesPdf({
        filename: `canvas-routes-expenses-${today}`,
        subtitle,
        stats,
        summaryByCategory, summaryByPayment, summaryByQuarter,
        grandTotal, grandTotalTax, grandTotalTip,
        yearGroups,
        provinceLabelOf: provinceNameOf,
        paymentLabelOf,
        generatedAt: new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }),
      })
      setPdfErr(null)
    } catch {
      setPdfErr('PDF export failed — try again.')
    } finally {
      setExportingPdf(false)
    }
  }

  // Every attachment across the currently-filtered expenses, with a meaningful
  // filename (date_vendor, unique-suffixed). Powers the bulk "Download receipts"
  // zip (accountant handoff) and the per-expense download.
  function receiptItemsFor(source) {
    const items = []
    let n = 0
    for (const e of source) {
      const atts = attachmentsOf(e)
      atts.forEach((url, i) => {
        n += 1
        const vend = slugify(e.vendor || 'receipt')
        const suffix = atts.length > 1 ? `-${i + 1}` : ''
        items.push({ url, name: `${e.expense_date || 'undated'}_${vend}${suffix}_${String(n).padStart(3, '0')}.${receiptExt(url)}` })
      })
    }
    return items
  }

  // Client-side zip of receipt files — same pattern as the photo gallery's
  // Download All (fetch each, package with JSZip, skip failures). No server
  // endpoint. `items` = [{ url, name }].
  async function zipUrls(items, zipName) {
    if (!items.length) return
    setZippingReceipts({ done: 0, total: items.length, failed: 0 })
    try {
      const zip = new JSZip()
      for (let i = 0; i < items.length; i++) {
        try {
          const res = await fetch(items[i].url)
          if (!res.ok) throw new Error('fetch failed')
          zip.file(items[i].name, await res.blob())
        } catch { setZippingReceipts(z => z ? { ...z, failed: z.failed + 1 } : z) }
        setZippingReceipts(z => z ? { ...z, done: i + 1 } : z)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `${zipName}.zip`
      a.click(); URL.revokeObjectURL(a.href)
    } finally { setZippingReceipts(null) }
  }
  const downloadReceiptsZip = (source, zipName) => zipUrls(receiptItemsFor(source), zipName)

  function copyReceiptLink(url) {
    if (!navigator.clipboard?.writeText) return
    navigator.clipboard.writeText(url).then(() => {
      setCopiedReceipt(url); setTimeout(() => setCopiedReceipt(c => c === url ? null : c), 1800)
    }).catch(() => {})
  }

  const today = new Date().toISOString().slice(0, 10)
  const visibleReceiptCount = visibleExpenses.reduce((n, e) => n + attachmentsOf(e).length, 0)

  // Live breakdown for the add form
  const paidNum = parseFloat(form.paid) || 0
  const gstNum = parseFloat(form.gst_amount) || 0
  const qstNum = parseFloat(form.qst_amount) || 0
  const tipNum = parseFloat(form.tip) || 0
  const subtotalNum = round2(paidNum - gstNum - qstNum - tipNum)

  return (
    <div className="exp-wrap" style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
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
        /* iOS zooms in when a focused input's font-size is under 16px. These
           inputs are 13px, so bump them to 16px on touch devices only — keeps
           desktop density, kills zoom-on-focus in the home-screen app. */
        @media (pointer: coarse) {
          .exp-wrap input, .exp-wrap select, .exp-wrap textarea { font-size: 16px !important; }
        }
        .exp-filter-chip { transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .exp-wrap button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .exp-tap { min-height: 44px; }
        @keyframes expFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .exp-form { animation: expFadeUp 0.28s ease both; }
        .exp-group-body { animation: expFadeUp 0.25s ease both; }
        .exp-stat-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
        @media (hover: hover) {
          .exp-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
        }
        /* Grid cells must be allowed to shrink or they force page-level scroll on iOS */
        .exp-form-grid > div { min-width: 0; }
        .exp-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        /* iOS date/select/text inputs have an intrinsic min-width that overflows
           narrow flex/grid cells (the "date field bleeding into the next" bug on
           iPhone 13 Pro ≈ 390px). Force every field to shrink to its cell. */
        .exp-wrap input, .exp-wrap select, .exp-wrap textarea { max-width: 100%; box-sizing: border-box; }
        .exp-wrap input[type="date"] { min-width: 0; width: 100%; box-sizing: border-box; }
        .exp-filters > div { min-width: 0; }
        @media (max-width: 640px) {
          .exp-form-grid { grid-template-columns: 1fr 1fr !important; }
          .exp-actions-row { flex-wrap: wrap; }
          /* Stack the filter controls cleanly instead of letting fixed widths
             collide; date range stays two-up, everything else full width. */
          .exp-filters { gap: 0.5rem !important; }
          .exp-filters > div { flex: 1 1 100% !important; width: 100% !important; }
          .exp-filters > .exp-filter-half { flex: 1 1 calc(50% - 0.25rem) !important; width: auto !important; }
        }

        /* Scan button — recurring gold shimmer sweep, plus a stronger attention
           pulse when arrived via the dashboard deep link. */
        .exp-scan-btn { position: relative; overflow: hidden; }
        .exp-scan-btn::after {
          content: ''; position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
          background: linear-gradient(105deg, transparent 20%, rgba(197,168,130,0.35) 50%, transparent 80%);
          transform: skewX(-14deg); animation: exp-scan-shimmer 5s ease-in-out 1s infinite; pointer-events: none;
        }
        @keyframes exp-scan-shimmer { 0% { left: -60%; } 16% { left: 130%; } 100% { left: 130%; } }
        .exp-scan-pulse { animation: exp-scan-attn 1s ease-in-out 3; }
        @keyframes exp-scan-attn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(197,168,130,0); }
          50%      { box-shadow: 0 0 0 6px rgba(197,168,130,0.35); }
        }

        /* Expense rows fade + rise in on mount; a light stagger via nth-child so
           filtering/switching views animates the list in rather than snapping. */
        .exp-row { animation: expRowIn 0.34s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes expRowIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .exp-row:nth-child(1) { animation-delay: 0.02s; }
        .exp-row:nth-child(2) { animation-delay: 0.05s; }
        .exp-row:nth-child(3) { animation-delay: 0.08s; }
        .exp-row:nth-child(4) { animation-delay: 0.11s; }
        .exp-row:nth-child(5) { animation-delay: 0.14s; }
        .exp-row:nth-child(6) { animation-delay: 0.17s; }
        .exp-row:nth-child(n+7) { animation-delay: 0.2s; }
        @media (prefers-reduced-motion: reduce) {
          .exp-scan-btn::after, .exp-scan-pulse, .exp-row { animation: none; }
        }
      `}</style>

      <datalist id="exp-event-names">{eventNames.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="exp-vendor-names">{vendorNames.map(n => <option key={n} value={n} />)}</datalist>

      {/* Drag-and-drop scan overlay (desktop). pointer-events:none so the drop
          still reaches the window listener that runs the scan. */}
      {dragActive && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,30,20,0.55)', WebkitBackdropFilter: 'blur(2px)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: '1.5rem' }}>
          <div style={{ border: '2px dashed rgba(197,168,130,0.85)', borderRadius: '18px', padding: 'clamp(1.75rem, 5vw, 2.75rem) clamp(2rem, 6vw, 3.25rem)', background: 'rgba(15,30,20,0.9)', textAlign: 'center', color: '#F5F1EC', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.7rem', letterSpacing: '0.04em', marginTop: '0.85rem', lineHeight: 1.1 }}>Drop to scan receipt</div>
            <div style={{ fontSize: '12px', color: 'rgba(245,241,236,0.6)', marginTop: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>Release anywhere — we’ll auto-fill the expense</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Expenses</h1>
          <button type="button" className="exp-tap" onClick={() => showAdd ? closeAddForm() : setShowAdd(true)}
            style={{ padding: '0.55rem 1.2rem', background: showAdd ? 'rgba(0,0,0,0.05)' : '#0F1E14', color: showAdd ? '#555' : '#F5F1EC', border: showAdd ? '0.5px solid rgba(0,0,0,0.15)' : 'none', borderRadius: '6px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {showAdd ? 'Close' : '+ Add Expense'}
          </button>
        </div>
      </div>

      {/* Stat cards — reflect whatever the filters currently show */}
      {expenses.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Spent',     value: fmt(grandTotal + grandTotalTax + grandTotalTip),  color: '#1a1a1a' },
            // ITC-eligible tax only — a BC/MB/SK PST line is real tax paid
            // (counted in Total Spent above) but isn't claimable, so it's
            // excluded here. See recoverableTaxOf.
            { label: 'Tax Recoverable', value: fmt(grandRecoverableTax),         color: '#8A6535' },
            ...(grandTotalTip > 0 ? [{ label: 'Tips', value: fmt(grandTotalTip), color: '#8A6535' }] : []),
            { label: 'Expenses',        value: visibleExpenses.length,           color: '#1a1a1a' },
            // Tapping toggles a receipt-less-only filter so the gaps are one tap away
            { key: 'missing', label: filterMissing ? 'Missing Receipts · filtering' : 'Missing Receipts', value: missingReceiptCount, color: missingReceiptCount > 0 ? '#93333E' : '#3B6B2F', onClick: () => setFilterMissing(f => !f), active: filterMissing },
            // Tap to show only expenses not yet ticked off against a statement
            (() => { const n = visibleExpenses.filter(e => !e.reconciled).length; return { key: 'unreconciled', label: filterUnreconciled ? 'Unreconciled · filtering' : 'Unreconciled', value: n, color: n > 0 ? '#8A6535' : '#3B6B2F', onClick: () => setFilterUnreconciled(f => !f), active: filterUnreconciled } })(),
          ].map(s => (
            <div key={s.key || s.label} className="exp-stat-card" onClick={s.onClick}
              role={s.onClick ? 'button' : undefined}
              style={{ background: '#fff', border: s.active ? '0.5px solid rgba(147,51,62,0.5)' : '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: s.active ? '0 2px 12px rgba(147,51,62,0.12)' : '0 2px 12px rgba(0,0,0,0.04)', padding: '1rem 1.25rem', cursor: s.onClick ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent' }}>
              <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.55rem', fontWeight: '400', color: s.color, lineHeight: 1.1, letterSpacing: '0.03em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{s.value}</div>
              <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: s.active ? '#93333E' : '#999', marginTop: '0.35rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
      <form className="exp-form" onSubmit={handleSubmit} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>Add Expense</div>

        {/* Scan-to-fill banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.7rem 0.85rem', marginBottom: '1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.35)', borderRadius: '8px' }}>
          {/* Direct rear-camera capture on iOS (snap a receipt on the spot) */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleScan} />
          {/* File / library picker — for an existing photo or a PDF */}
          <input ref={scanRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf" style={{ display: 'none' }} onChange={handleScan} />
          <button type="button" ref={scanBtnRef} className={`exp-tap exp-scan-btn${scanHighlight ? ' exp-scan-pulse' : ''}`} onClick={() => cameraRef.current?.click()} disabled={scanning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, padding: '12px 22px', border: 'none', borderRadius: '8px', background: scanning ? 'rgba(15,30,20,0.55)' : '#0F1E14', color: '#F5F1EC', cursor: scanning ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            {scanning ? 'Scanning…' : 'Take photo'}
          </button>
          <button type="button" className="exp-tap" onClick={() => scanRef.current?.click()} disabled={scanning}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 16px', border: '0.5px solid rgba(15,30,20,0.35)', borderRadius: '8px', background: 'none', color: '#0F1E14', cursor: scanning ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            Upload file
          </button>
          <span style={{ fontSize: '11px', color: '#8a7a5c', lineHeight: 1.4, flex: '1 1 180px', minWidth: 0 }}>Snap or upload a receipt — we’ll auto-fill the vendor, date, amount, tax, payment method, province &amp; a note. Review &amp; save.</span>
        </div>

        {scanNotice && (
          <div style={{ fontSize: '12px', lineHeight: 1.55, padding: '0.65rem 0.85rem', marginBottom: '1rem', borderRadius: '8px', animation: 'expFadeUp 0.3s ease both',
            background: scanNotice.type === 'warn' ? 'rgba(147,51,62,0.06)' : 'rgba(59,107,47,0.07)',
            border: scanNotice.type === 'warn' ? '0.5px solid rgba(147,51,62,0.3)' : '0.5px solid rgba(59,107,47,0.25)',
            color: scanNotice.type === 'warn' ? '#93333E' : '#3B6B2F' }}>
            {scanNotice.text}
          </div>
        )}

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
                onChange={e => { taxManualRef.current = false; provinceManualRef.current = true; setForm(p => ({ ...p, province: e.target.value })) }}>
                {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <SelectChevron />
            </div>
          </div>
          <div>
            <L>Amount paid ($)</L>
            {/* Deliberately does NOT reset taxManualRef — if the admin already
                hand-corrected GST/QST (e.g. to match a receipt that doesn't
                follow the province's blended rate), fixing a typo here used to
                silently overwrite that manual entry with the auto-calculated
                split. Auto-split still applies normally when GST/QST haven't
                been touched, since taxManualRef starts false. */}
            <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={form.paid} placeholder="tax + tip incl."
              onChange={e => setForm(p => ({ ...p, paid: e.target.value }))} required />
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
          <div>
            <L>Tip ($)</L>
            <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={form.tip} placeholder="0.00"
              onChange={e => setForm(p => ({ ...p, tip: e.target.value }))} />
          </div>
        </div>

        {/* Live breakdown */}
        {paidNum > 0 && (
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
            Subtotal <span style={{ color: '#555' }}>{fmt(subtotalNum)}</span>
            &nbsp;·&nbsp; GST <span style={{ color: '#555' }}>{fmt(gstNum)}</span>
            &nbsp;·&nbsp; {provLabelOf(form.province)} <span style={{ color: '#555' }}>{fmt(qstNum)}</span>
            {tipNum > 0 && <>&nbsp;·&nbsp; Tip <span style={{ color: '#555' }}>{fmt(tipNum)}</span></>}
            &nbsp;·&nbsp; Total <span style={{ color: '#1a1a1a' }}>{fmt(paidNum)}</span>
          </div>
        )}

        {/* Currency · original total · vendor tax number */}
        <div className="exp-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.6rem', marginBottom: '0.35rem' }}>
          <div>
            <L>Currency</L>
            <div style={{ position: 'relative' }}>
              <select style={sel} value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <SelectChevron />
            </div>
          </div>
          {form.currency !== 'CAD' && (
            <div>
              <L>Original total ({form.currency})</L>
              <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={form.original_amount} placeholder="0.00"
                onChange={e => setForm(p => ({ ...p, original_amount: e.target.value }))} />
            </div>
          )}
          <div>
            <L>Vendor tax # (opt.)</L>
            <input style={inp} value={form.vendor_tax_id} placeholder="GST/QST reg. #" maxLength={40}
              onChange={e => setForm(p => ({ ...p, vendor_tax_id: e.target.value }))} />
          </div>
        </div>
        {form.currency !== 'CAD' && (
          <div style={{ fontSize: '10.5px', color: '#8a7a5c', marginBottom: '0.85rem', lineHeight: 1.5 }}>
            The amounts above should be in <strong>CAD</strong> (what your card was actually charged) — the original {form.currency} total is recorded for the receipt.
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

        <div style={{ marginBottom: '0.85rem' }}>
          <L>Notes (optional)</L>
          <input style={inp} value={form.notes} placeholder="e.g. reimbursed by Jerry, bought for spare tires"
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} maxLength={1000} />
        </div>

        <div className="exp-actions-row" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={handleFileChange} />
          <button type="button" className="exp-tap" onClick={() => fileRef.current?.click()} disabled={uploadingFile}
            style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 12px', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '6px', background: 'none', cursor: uploadingFile ? 'default' : 'pointer', color: '#777', fontFamily: 'var(--font-inter),sans-serif' }}>
            {uploadingFile ? 'Uploading…' : `↑ Attach${attachments.length ? ' more' : ' invoice / receipt'}`}
          </button>
          {attachments.map(a => (
            <span key={a.url} style={{ fontSize: '11px', color: '#3B6B2F', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(59,107,47,0.08)', border: '0.5px solid rgba(59,107,47,0.25)', borderRadius: '6px', padding: '3px 8px', maxWidth: '100%' }}>
              ✓ <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{a.name}</span>
              <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: '#c5a882', textDecoration: 'none' }}>↗</a>
              <button type="button" aria-label={`Remove ${a.name}`} onClick={() => { deleteReceiptByUrl(a.url); setAttachments(prev => prev.filter(x => x.url !== a.url)) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '17px', lineHeight: 1, padding: '5px 8px', display: 'inline-flex', alignItems: 'center' }}>×</button>
            </span>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <button type="submit" className="exp-tap" disabled={submitting || uploadingFile || scanning}
              style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', background: submitting ? 'rgba(15,30,20,0.6)' : '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '6px', cursor: submitting ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {submitting ? 'Saving…' : 'Add Expense'}
            </button>
          </div>
        </div>
        {formErr && <Err msg={formErr} />}
      </form>
      )}

      {/* Filter + summary bar */}
      {expenses.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1rem 1.1rem', marginBottom: '1.25rem' }}>
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
          <div className="exp-filters" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.85rem' }}>
            <div style={{ width: isMobile ? '100%' : '190px' }}>
              <L>Search</L>
              <input style={inp} value={searchQuery} placeholder="Vendor, event, category, notes…"
                onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="exp-filter-half" style={{ width: isMobile ? 'calc(50% - 0.3rem)' : '150px' }}>
              <L>From</L>
              <input type="date" style={inp} value={dateFrom} max={dateTo || today}
                onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="exp-filter-half" style={{ width: isMobile ? 'calc(50% - 0.3rem)' : '150px' }}>
              <L>To</L>
              <input type="date" style={inp} value={dateTo} min={dateFrom || undefined} max={today}
                onChange={e => setDateTo(e.target.value)} />
            </div>
            <div style={{ width: isMobile ? '100%' : '180px' }}>
              <L>Category</L>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="all">All categories</option>
                  {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <SelectChevron />
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '160px' }}>
              <L>Payment</L>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                  <option value="all">All methods</option>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <SelectChevron />
              </div>
            </div>
            {usedProvinces.length > 1 && (
              <div style={{ width: isMobile ? '100%' : '170px' }}>
                <L>Province / State</L>
                <div style={{ position: 'relative' }}>
                  <select style={sel} value={filterProvince} onChange={e => setFilterProvince(e.target.value)}>
                    <option value="all">Everywhere</option>
                    {usedProvinces.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <SelectChevron />
                </div>
              </div>
            )}
            {usedForeign && (
              <div style={{ width: isMobile ? '100%' : '150px' }}>
                <L>Currency</L>
                <div style={{ position: 'relative' }}>
                  <select style={sel} value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}>
                    <option value="all">All currencies</option>
                    <option value="CAD">CAD only</option>
                    <option value="foreign">Foreign only</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
            )}
            <div style={{ width: isMobile ? '100%' : '170px' }}>
              <L>Sort</L>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="amount_desc">Highest amount</option>
                  <option value="amount_asc">Lowest amount</option>
                  <option value="vendor_az">Vendor A–Z</option>
                  <option value="category_az">Category A–Z</option>
                  <option value="event_az">Event A–Z</option>
                  <option value="added_desc">Recently added</option>
                </select>
                <SelectChevron />
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : 'auto' }}>
              <L>View</L>
              <div style={{ display: 'inline-flex', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', overflow: 'hidden', width: isMobile ? '100%' : 'auto' }}>
                {[['flat', 'By date'], ['folders', 'Folders']].map(([key, label]) => (
                  <button key={key} type="button" className="exp-tap" onClick={() => setViewMode(key)}
                    style={{ flex: 1, padding: '0.45rem 0.9rem', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.04em', fontFamily: 'var(--font-inter),sans-serif',
                      background: viewMode === key ? '#0F1E14' : '#fff', color: viewMode === key ? '#F5F1EC' : '#777' }}>
                    {label}
                  </button>
                ))}
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

          {/* Summary row — totals live in the stat cards above */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: '0.85rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999' }}>
              {visibleExpenses.length} expense{visibleExpenses.length !== 1 ? 's' : ''}
              {filterEvent !== 'all' && <span style={{ color: '#c5a882' }}> · {filterEvent}</span>}
              {(hasDateFilter || filterCategory !== 'all' || filterPayment !== 'all' || filterProvince !== 'all' || filterCurrency !== 'all' || filterMissing || filterUnreconciled || searchTerm) && <span style={{ color: '#c5a882' }}> · filtered</span>}
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
              <button onClick={exportPDF} disabled={exportingPdf} className="exp-tap"
                title="Formal report with a Canvas Routes header, category/payment/tax breakdowns, and clickable receipt links — same filters as what's on screen"
                style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px', background: 'none', cursor: exportingPdf ? 'default' : 'pointer', color: '#555', fontFamily: 'var(--font-inter),sans-serif', opacity: exportingPdf ? 0.6 : 1 }}>
                {exportingPdf ? 'Building PDF…' : 'Export PDF'}
              </button>
              {visibleReceiptCount > 0 && (
                <button onClick={() => downloadReceiptsZip(visibleExpenses, `canvas-routes-receipts-${today}`)} disabled={!!zippingReceipts} className="exp-tap"
                  title="Download all receipt files in view as a .zip (for your accountant)"
                  style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px', background: 'none', cursor: zippingReceipts ? 'default' : 'pointer', color: '#555', fontFamily: 'var(--font-inter),sans-serif', opacity: zippingReceipts ? 0.6 : 1 }}>
                  {zippingReceipts ? `Zipping ${zippingReceipts.done}/${zippingReceipts.total}…` : `⬇ Receipts (${visibleReceiptCount})`}
                </button>
              )}
            </div>
          </div>
          {zippingReceipts && zippingReceipts.failed > 0 && (
            <div style={{ fontSize: '10.5px', color: '#93333E', textAlign: 'right', marginTop: '0.4rem' }}>{zippingReceipts.failed} file{zippingReceipts.failed === 1 ? '' : 's'} couldn’t be fetched — skipped.</div>
          )}
          {pdfErr && (
            <div style={{ fontSize: '10.5px', color: '#93333E', textAlign: 'right', marginTop: '0.4rem' }}>{pdfErr}</div>
          )}

          {/* Summary panel */}
          {showSummary && (
            <div style={{ marginTop: '1rem', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '1.1rem 1.25rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '1.1rem' }}>
                Summary{hasDateFilter ? ` · ${dateFrom || '…'} → ${dateTo || '…'}` : ' · All time'}
                {filterEvent !== 'all' && ` · ${filterEvent}`}
                {filterCategory !== 'all' && ` · ${filterCategory}`}
                {filterPayment !== 'all' && ` · ${PAYMENT_LABELS[filterPayment] || filterPayment}`}
                {filterProvince !== 'all' && ` · ${PROVINCE_MAP[filterProvince]?.label || filterProvince}`}
                {filterCurrency !== 'all' && ` · ${filterCurrency === 'CAD' ? 'CAD only' : 'Foreign only'}`}
                {searchTerm && ` · "${searchQuery.trim()}"`}
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
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal + grandTotalTax + grandTotalTip)}</div>
                      </div>
                    </div>
                  </div>

                  {/* By payment method — reconcile against a card/bank statement */}
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>By payment method</div>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem' }}>
                    <div style={{ minWidth: '300px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px', padding: '0.35rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                        {['Method', 'Items', 'Total'].map((h, i) => (
                          <div key={i} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', textAlign: i === 0 ? 'left' : 'right' }}>{h}</div>
                        ))}
                      </div>
                      {summaryByPayment.map(m => (
                        <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px', padding: '0.45rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                          <div style={{ fontSize: '12px', color: m.key === 'unset' ? '#bbb' : '#333' }}>{m.name}</div>
                          <div style={{ fontSize: '12px', color: '#999', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.count}</div>
                          <div style={{ fontSize: '12px', color: '#1a1a1a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.total)}</div>
                        </div>
                      ))}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px', padding: '0.5rem 0', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
                        <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>Total</div>
                        <div />
                        <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(grandTotal + grandTotalTax + grandTotalTip)}</div>
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

      {/* Bulk action bar — appears once at least one expense is checked */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'sticky', top: '0.5rem', zIndex: 5, background: '#0F1E14', color: '#F5F1EC', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
          <span style={{ fontSize: '12px', fontWeight: 500 }}>{selectedIds.size} selected</span>
          <button onClick={clearSelection} disabled={bulkBusy}
            style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', background: 'none', border: 'none', color: 'rgba(245,241,236,0.6)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            Clear
          </button>

          {!bulkConfirm ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
              <div style={{ position: 'relative', flex: '1 1 130px', minWidth: 0 }}>
                <select value={bulkCategoryPick} disabled={bulkBusy}
                  onChange={e => {
                    const v = e.target.value
                    setBulkCategoryPick(v)
                    if (v) setBulkConfirm({ field: 'category', value: v === '__clear__' ? null : v, label: v === '__clear__' ? 'no category' : v })
                  }}
                  style={{ ...sel, background: 'rgba(245,241,236,0.08)', borderColor: 'rgba(245,241,236,0.25)', color: '#F5F1EC', fontSize: '11px', padding: '6px 26px 6px 10px' }}>
                  <option value="" style={{ color: '#1a1a1a' }}>Set category…</option>
                  <option value="__clear__" style={{ color: '#1a1a1a' }}>— Clear category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c} style={{ color: '#1a1a1a' }}>{c}</option>)}
                </select>
              </div>
              <div style={{ position: 'relative', flex: '1 1 130px', minWidth: 0 }}>
                <select value={bulkEventPick} disabled={bulkBusy}
                  onChange={e => {
                    const v = e.target.value
                    setBulkEventPick(v)
                    if (v) setBulkConfirm({ field: 'event_name', value: v === 'General' ? null : v, label: v })
                  }}
                  style={{ ...sel, background: 'rgba(245,241,236,0.08)', borderColor: 'rgba(245,241,236,0.25)', color: '#F5F1EC', fontSize: '11px', padding: '6px 26px 6px 10px' }}>
                  <option value="" style={{ color: '#1a1a1a' }}>Move to event…</option>
                  <option value="General" style={{ color: '#1a1a1a' }}>General</option>
                  {eventNames.map(n => <option key={n} value={n} style={{ color: '#1a1a1a' }}>{n}</option>)}
                </select>
              </div>
              <button onClick={() => setBulkConfirm({ field: 'delete', value: null, label: 'delete' })} disabled={bulkBusy}
                style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', background: 'none', border: '0.5px solid rgba(147,51,62,0.5)', borderRadius: '6px', color: '#e5a1a8', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                Delete
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12px', color: 'rgba(245,241,236,0.85)' }}>
                {bulkConfirm.field === 'delete'
                  ? <>Delete <strong>{selectedIds.size}</strong> expense{selectedIds.size !== 1 ? 's' : ''}?</>
                  : <>Set {bulkConfirm.field === 'category' ? 'category' : 'event'} to <strong>{bulkConfirm.label}</strong> for <strong>{selectedIds.size}</strong> expense{selectedIds.size !== 1 ? 's' : ''}?</>}
              </span>
              <button onClick={() => bulkConfirm.field === 'delete' ? bulkDelete() : bulkUpdate(bulkConfirm.field, bulkConfirm.value)} disabled={bulkBusy}
                style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', background: bulkConfirm.field === 'delete' ? '#93333E' : '#c5a882', color: bulkConfirm.field === 'delete' ? '#F5F1EC' : '#0F1E14', border: 'none', borderRadius: '6px', cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                {bulkBusy ? '…' : 'Confirm'}
              </button>
              <button onClick={() => { setBulkConfirm(null); setBulkCategoryPick(''); setBulkEventPick('') }} disabled={bulkBusy}
                style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', background: 'none', border: '0.5px solid rgba(245,241,236,0.3)', borderRadius: '6px', color: 'rgba(245,241,236,0.8)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                Cancel
              </button>
            </div>
          )}
          {bulkErr && <span style={{ fontSize: '11px', color: '#ffb3b8', width: '100%' }}>{bulkErr}</span>}
        </div>
      )}

      {/* Grouped expense list */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : expenses.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No expenses yet — use “+ Add Expense” above to record the first one.</div>
      ) : groups.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No expenses for this event.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {renderYearGroups.map(yg => {
            const flat = viewMode === 'flat'
            // Newest year starts open; the rest start collapsed. Flat mode has
            // no year folder, so it's always open.
            const yearOpen = flat ? true : (openYears[yg.year] ?? (yg.year === newestYear))
            return (
              <div key={yg.year}>
                {/* Year folder header — hidden in flat (date) view */}
                {!flat && (
                <button onClick={() => setOpenYears(p => ({ ...p, [yg.year]: !yearOpen }))} className="exp-tap"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.6rem', padding: '0.7rem 0.35rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <ChevronIcon open={yearOpen} />
                  <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '21px', fontWeight: 400, color: '#1a1a1a', lineHeight: 1 }}>{yg.year}</span>
                  <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {yg.events.length} folder{yg.events.length !== 1 ? 's' : ''} · {yg.count} item{yg.count !== 1 ? 's' : ''}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(yg.total)}</span>
                  {yg.totalTax > 0 && (
                    <span style={{ fontSize: '11px', color: '#bbb', whiteSpace: 'nowrap' }}>+{fmt(yg.totalTax)} tax</span>
                  )}
                  {yg.totalTip > 0 && (
                    <span style={{ fontSize: '11px', color: '#bbb', whiteSpace: 'nowrap' }}>+{fmt(yg.totalTip)} tip</span>
                  )}
                </button>
                )}

                {yearOpen && (
                  <div className="exp-group-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: (flat || isMobile) ? 0 : '1.5rem', marginBottom: '0.75rem' }}>
          {yg.events.map(group => {
            const gKey = `${yg.year}::${group.name}`
            const isOpen = flat ? true : !!openGroups[gKey]
            return (
              <div key={gKey} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                {/* Group header — hidden in flat (date) view */}
                {!flat && (
                <button onClick={() => toggleGroup(gKey)} className="exp-tap"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem 0.6rem', padding: '0.85rem 1.1rem', background: '#fafaf9', border: 'none', borderRadius: isOpen ? '12px 12px 0 0' : '12px', borderBottom: isOpen ? '0.5px solid rgba(0,0,0,0.07)' : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <ChevronIcon open={isOpen} />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', flex: 1, minWidth: 0 }}>{group.name}</span>
                  <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '13px', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(group.total)}</span>
                  {group.totalTax > 0 && (
                    <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '0.25rem', whiteSpace: 'nowrap' }}>+{fmt(group.totalTax)} tax</span>
                  )}
                  {group.totalTip > 0 && (
                    <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '0.25rem', whiteSpace: 'nowrap' }}>+{fmt(group.totalTip)} tip</span>
                  )}
                </button>
                )}

                {isOpen && (
                  <div className="exp-group-body">
                    {/* Column headers — desktop only; mobile uses card rows */}
                    {!isMobile && (
                      <div className="exp-scroll">
                        <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.45rem 1.1rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fdfdfc', minWidth: '560px' }}>
                          {['', 'Date', 'Vendor', 'Category', 'Amount', 'Tax', 'Total', ''].map((h, i) => (
                            <div key={i} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {group.items.map((expense, i) => {
                      const rowTax          = taxOf(expense)
                      const rowTip          = tipOf(expense)
                      const total           = parseFloat(expense.amount || 0) + rowTax + rowTip
                      const isPendingDelete = deleteConfirm === expense.id
                      const isDeletingThis  = deleting === expense.id
                      const isEditing       = editingId === expense.id
                      const isNew           = newIds.has(expense.id)

                      // 44px touch targets on mobile (iOS), compact on desktop.
                      const touch = isMobile ? { minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}
                      const actionButtons = (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: isMobile ? '0.5rem' : '0.4rem', alignItems: 'center' }}>
                          {!isPendingDelete && !isEditing && (
                            <>
                              <button onClick={() => toggleReconciled(expense)} title={expense.reconciled ? 'Reconciled against statement — tap to unmark' : 'Mark reconciled (matched to card/bank statement)'}
                                style={{ ...touch, background: expense.reconciled ? 'rgba(59,107,47,0.1)' : 'none', border: `0.5px solid ${expense.reconciled ? 'rgba(59,107,47,0.4)' : 'rgba(0,0,0,0.14)'}`, borderRadius: '6px', cursor: 'pointer', color: expense.reconciled ? '#3B6B2F' : '#ccc', fontSize: '12px', padding: isMobile ? '0 12px' : '4px 8px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>
                                ✓
                              </button>
                              <button onClick={() => duplicateExpense(expense)} title="Copy into the Add Expense form"
                                style={{ ...touch, background: 'none', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: '6px', cursor: 'pointer', color: '#777', fontSize: '11px', padding: isMobile ? '0 12px' : '4px 8px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.04em' }}>
                                ⧉
                              </button>
                              <button onClick={() => startEdit(expense)}
                                style={{ ...touch, background: 'none', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: '6px', cursor: 'pointer', color: '#777', fontSize: '11px', padding: isMobile ? '0 16px' : '4px 8px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.04em' }}>
                                Edit
                              </button>
                              <button onClick={() => { setDeleteConfirm(expense.id); setEditingId(null) }} aria-label="Delete expense"
                                style={{ ...touch, background: 'none', border: 'none', cursor: 'pointer', color: '#c99', fontSize: '18px', padding: isMobile ? '0 10px' : '2px 6px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
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
                        <div key={expense.id} className={isNew ? 'exp-new' : 'exp-row'}
                          style={{ borderBottom: i < group.items.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>

                          {isMobile ? (
                            /* Mobile card — no horizontal scroll */
                            <div style={{ padding: '0.8rem 1.1rem', background: isEditing ? 'rgba(197,168,130,0.04)' : undefined }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                                  <input type="checkbox" checked={selectedIds.has(expense.id)} onChange={() => toggleSelect(expense.id)}
                                    style={{ width: '17px', height: '17px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} aria-label="Select expense" />
                                  <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    {expense.vendor || <span style={{ color: '#ccc' }}>No vendor</span>}
                                    {attachmentsOf(expense).length > 0 && (
                                      <a href={attachmentsOf(expense)[0]} target="_blank" rel="noopener noreferrer"
                                        title={`${attachmentsOf(expense).length} attachment${attachmentsOf(expense).length > 1 ? 's' : ''}`}
                                        style={{ fontSize: '11px', color: '#c5a882', textDecoration: 'none' }}>↗{attachmentsOf(expense).length > 1 ? ` ${attachmentsOf(expense).length}` : ''}</a>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                                    {fmtDate(expense.expense_date)}
                                    {flat && <> · <span style={{ color: '#8A6535' }}>{expense.event_name || 'General'}</span></>}
                                    {expense.category && <> · {expense.category}</>}
                                    {expense.payment_method && <> · {PAYMENT_LABELS[expense.payment_method]}</>}
                                    {expense.currency && expense.currency !== 'CAD' && <> · <span style={{ color: '#8A6535' }}>{expense.currency}{expense.original_amount ? ` ${fmt(expense.original_amount)}` : ''}</span></>}
                                  </div>
                                  {expense.notes && (
                                    <div style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.notes}</div>
                                  )}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</div>
                                  {(rowTax > 0 || rowTip > 0) && (
                                    <div style={{ fontSize: '10px', color: '#aaa', fontVariantNumeric: 'tabular-nums', marginTop: '1px' }}>{fmt(expense.amount)}{rowTax > 0 ? ` + ${fmt(rowTax)} tax` : ''}{rowTip > 0 ? ` + ${fmt(rowTip)} tip` : ''}</div>
                                  )}
                                </div>
                              </div>
                              {!isEditing && !isPendingDelete && <div style={{ marginTop: '0.6rem' }}>{actionButtons}</div>}
                            </div>
                          ) : (
                            /* Desktop table row — scrolls horizontally on its own */
                            <div className="exp-scroll">
                              <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.65rem 1.1rem', alignItems: 'center', background: isEditing ? 'rgba(197,168,130,0.04)' : undefined, transition: 'background 0.2s', minWidth: '560px' }}>
                                <input type="checkbox" checked={selectedIds.has(expense.id)} onChange={() => toggleSelect(expense.id)}
                                  style={{ width: '15px', height: '15px', cursor: 'pointer' }} aria-label="Select expense" />
                                <div style={{ fontSize: '12px', color: '#555' }}>{fmtDate(expense.expense_date)}</div>
                                <div style={{ fontSize: '12px', color: '#333', minWidth: 0 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    {expense.vendor || <span style={{ color: '#ddd' }}>—</span>}
                                    {attachmentsOf(expense).length > 0 && (
                                      <a href={attachmentsOf(expense)[0]} target="_blank" rel="noopener noreferrer"
                                        title={`${attachmentsOf(expense).length} attachment${attachmentsOf(expense).length > 1 ? 's' : ''}`}
                                        style={{ fontSize: '10px', color: '#c5a882', textDecoration: 'none' }}>↗{attachmentsOf(expense).length > 1 ? ` ${attachmentsOf(expense).length}` : ''}</a>
                                    )}
                                    {expense.payment_method && (
                                      <span style={{ fontSize: '9px', color: '#aaa', letterSpacing: '0.04em' }}>· {PAYMENT_LABELS[expense.payment_method]}</span>
                                    )}
                                  </span>
                                  {flat && (
                                    <div style={{ fontSize: '10px', color: '#8A6535', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{expense.event_name || 'General'}</div>
                                  )}
                                  {expense.notes && (
                                    <div style={{ fontSize: '10px', color: '#bbb', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={expense.notes}>{expense.notes}</div>
                                  )}
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
                                <div>
                                  <L>Tip ($)</L>
                                  <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={editForm.tip || ''} placeholder="0.00"
                                    onChange={e => setEditForm(p => ({ ...p, tip: e.target.value }))} />
                                </div>
                                <div>
                                  <L>Currency</L>
                                  <div style={{ position: 'relative' }}>
                                    <select style={sel} value={editForm.currency || 'CAD'} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value }))}>
                                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <SelectChevron />
                                  </div>
                                </div>
                                {editForm.currency && editForm.currency !== 'CAD' && (
                                  <div>
                                    <L>Original ({editForm.currency})</L>
                                    <input style={inp} type="number" inputMode="decimal" min="0" step="0.01" value={editForm.original_amount || ''} placeholder="0.00"
                                      onChange={e => setEditForm(p => ({ ...p, original_amount: e.target.value }))} />
                                  </div>
                                )}
                                <div>
                                  <L>Vendor tax #</L>
                                  <input style={inp} value={editForm.vendor_tax_id || ''} placeholder="—" maxLength={40}
                                    onChange={e => setEditForm(p => ({ ...p, vendor_tax_id: e.target.value }))} />
                                </div>
                              </div>
                              <div style={{ marginBottom: '0.6rem' }}>
                                <L>Notes</L>
                                <input style={inp} value={editForm.notes || ''} placeholder="—"
                                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} maxLength={1000} />
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
                                <input ref={editFileRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={handleEditFileChange} />
                                <button type="button" onClick={() => editFileRef.current?.click()} disabled={editUploading}
                                  style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '7px 12px', background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px', color: '#777', cursor: editUploading ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                                  {editUploading ? 'Uploading…' : `↑ Attach${editAttachments.length ? ' more' : ' receipt'}`}
                                </button>
                              </div>
                              {editAttachments.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem', alignItems: 'center' }}>
                                  {editAttachments.map((a, ai) => (
                                    <span key={a.url} style={{ fontSize: '11px', color: '#3B6B2F', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(59,107,47,0.08)', border: '0.5px solid rgba(59,107,47,0.25)', borderRadius: '6px', padding: '3px 6px' }}>
                                      <a href={a.url} target="_blank" rel="noopener noreferrer" title="View" style={{ color: '#3B6B2F', textDecoration: 'none' }}>Receipt {ai + 1} ↗</a>
                                      <a href={`${a.url}?download=${editForm.expense_date || 'undated'}_${slugify(editForm.vendor || 'receipt')}${ai > 0 ? `-${ai + 1}` : ''}.${receiptExt(a.url)}`} title="Download"
                                        style={{ color: '#8A6535', textDecoration: 'none', fontSize: '13px', padding: '0 2px' }}>⬇</a>
                                      <button type="button" title="Copy link" onClick={() => copyReceiptLink(a.url)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedReceipt === a.url ? '#3B6B2F' : '#999', fontSize: '12px', lineHeight: 1, padding: '0 2px' }}>{copiedReceipt === a.url ? '✓' : '⧉'}</button>
                                      <button type="button" aria-label="Remove attachment" onClick={() => removeEditAttachment(a.url)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '16px', lineHeight: 1, padding: '3px 5px', display: 'inline-flex', alignItems: 'center' }}>×</button>
                                    </span>
                                  ))}
                                  {editAttachments.length > 1 && (
                                    <button type="button" onClick={() => zipUrls(editAttachments.map((a, i) => ({ url: a.url, name: `${editForm.expense_date || 'undated'}_${slugify(editForm.vendor || 'receipt')}-${i + 1}.${receiptExt(a.url)}` })), `${slugify(editForm.vendor || 'receipt')}-${editForm.expense_date || 'undated'}`)} disabled={!!zippingReceipts}
                                      style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '6px', color: '#777', cursor: zippingReceipts ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                                      {zippingReceipts ? '…' : '⬇ All'}
                                    </button>
                                  )}
                                </div>
                              )}
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

                    {/* Group total row — hidden in flat view (it's just the grand
                        total, already shown in the stat cards). */}
                    {flat ? null : isMobile ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', padding: '0.7rem 1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9' }}>
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999' }}>Group total</span>
                        <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 500, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                          {fmt(group.total + group.totalTax + group.totalTip)}
                          {(group.totalTax > 0 || group.totalTip > 0) && <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 400 }}> incl.{group.totalTax > 0 ? ` ${fmt(group.totalTax)} tax` : ''}{group.totalTip > 0 ? ` ${fmt(group.totalTip)} tip` : ''}</span>}
                        </span>
                      </div>
                    ) : (
                      <div className="exp-scroll">
                        <div style={{ display: 'grid', gridTemplateColumns: COL, padding: '0.55rem 1.1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9', minWidth: '560px' }}>
                          <div style={{ gridColumn: '1 / 5', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Group total</div>
                          <div style={{ fontSize: '12px', color: '#555', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.total)}</div>
                          <div style={{ fontSize: '12px', color: '#888', fontVariantNumeric: 'tabular-nums' }}>{group.totalTax > 0 ? fmt(group.totalTax) : '—'}</div>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{fmt(group.total + group.totalTax + group.totalTip)}</div>
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
