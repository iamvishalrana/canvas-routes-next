// Detailed, "interactive" expense report PDF — a formal, printable companion
// to the on-screen Summary panel and CSV export. Interactive = a clickable
// bookmark outline (jump straight to a year/event) and clickable receipt
// links, both native PDF-viewer features (Acrobat, Preview, Chrome) so they
// work with no extra tooling on the reader's end.
//
// Presentation-only: all the business logic (which rows are visible, totals,
// tax-recoverability) is computed in ExpensesClient.jsx and handed in ready
// to render, so this file has no risk of drifting out of sync with the
// filters/tax rules defined there.

const GREEN = [15, 30, 20]
const GOLD = [197, 168, 130]
const CREAM = [245, 241, 236]
const DARK = [26, 26, 26]
const MUTED = [140, 140, 140]

function fmt(n) { return `$${(parseFloat(n) || 0).toFixed(2)}` }

// Fetch the logo and hand back a base64 PNG data URL, downscaled to roughly
// its printed size first. The source PNG is 1544×600 with an alpha channel;
// jsPDF re-encodes an embedded PNG as raw FlateDecoded pixels rather than
// reusing the file's own (much better) DEFLATE stream, so embedding it at
// full resolution bloats every report by several MB for a logo drawn at
// 34mm wide. Same createImageBitmap+canvas approach as compressImageClient.js.
async function loadLogoDataUrl(path, targetWidthPx = 420) {
  const res = await fetch(path)
  const blob = await res.blob()
  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, targetWidthPx / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    return canvas.toDataURL('image/png')
  } catch {
    // Fall back to the untouched file if canvas resizing isn't available —
    // a larger PDF beats no logo at all.
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

// Page break helper — starts a fresh page if `needed` mm won't fit before the
// bottom margin, returning the (possibly new) Y to draw at.
function ensureSpace(doc, y, needed, margin, pageH) {
  if (y + needed > pageH - margin) {
    doc.addPage()
    return margin
  }
  return y
}

function drawHeader(doc, logoDataUrl, title, subtitle, margin) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.4)
  doc.line(0, 30, pageW, 30)
  if (logoDataUrl) {
    // Source is 1544×600 (≈2.57:1) — 34mm wide keeps it legible without
    // crowding the title text next to it.
    const w = 34, h = w / (1544 / 600)
    doc.addImage(logoDataUrl, 'PNG', margin, (30 - h) / 2, w, h)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...CREAM)
  doc.text(title, pageW - margin, 13, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text(subtitle, pageW - margin, 20, { align: 'right' })
  return 40
}

function drawStatTiles(doc, stats, y, margin, pageW) {
  const gap = 4
  const w = (pageW - margin * 2 - gap * (stats.length - 1)) / stats.length
  const h = 18
  stats.forEach((s, i) => {
    const x = margin + i * (w + gap)
    doc.setDrawColor(225, 225, 220)
    doc.setLineWidth(0.2)
    doc.rect(x, y, w, h)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...(s.color || DARK))
    doc.text(String(s.value), x + w / 2, y + 9, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(s.label.toUpperCase(), x + w / 2, y + 14.5, { align: 'center', charSpace: 0.3 })
  })
  return y + h + 8
}

function drawSectionLabel(doc, text, y, margin) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...DARK)
  doc.text(text, margin, y)
  return y + 5
}

export async function exportExpensesPdf({
  filename, subtitle,
  stats,
  summaryByCategory, summaryByPayment, summaryByQuarter,
  grandTotal, grandTotalTax, grandTotalTip,
  yearGroups, // [{ year, events: [{ name, items, total, totalTax, totalTip }] }]
  provinceLabelOf, paymentLabelOf,
  generatedAt,
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'), import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 12
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.setProperties({ title: 'Canvas Routes — Expense Report' })

  let logoDataUrl = null
  try { logoDataUrl = await loadLogoDataUrl('/logo-white.png') } catch { /* report still works without it */ }

  // ---- Page 1: cover + summary --------------------------------------
  let y = drawHeader(doc, logoDataUrl, 'Expense Report', subtitle, margin)
  doc.outline.add(null, 'Summary', { pageNumber: 1 })

  y = drawStatTiles(doc, stats, y, margin, pageW)

  if (summaryByCategory.length) {
    y = drawSectionLabel(doc, 'By category', y, margin)
    autoTable(doc, {
      head: [['Category', 'Items', 'Subtotal', 'Tax', 'Total']],
      body: summaryByCategory.map(c => [c.name, String(c.count), fmt(c.amount), fmt(c.tax), fmt(c.total)]),
      foot: [['Total', '', fmt(grandTotal), fmt(grandTotalTax), fmt(grandTotal + grandTotalTax + grandTotalTip)]],
      startY: y, margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: GREEN, textColor: GOLD, fontStyle: 'normal' },
      footStyles: { fillColor: [250, 250, 248], textColor: DARK, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (summaryByPayment.length) {
    y = ensureSpace(doc, y, 30, margin, pageH)
    y = drawSectionLabel(doc, 'By payment method', y, margin)
    autoTable(doc, {
      head: [['Method', 'Items', 'Total']],
      body: summaryByPayment.map(m => [m.name, String(m.count), fmt(m.total)]),
      startY: y, margin: { left: margin, right: margin }, tableWidth: 120,
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: GREEN, textColor: GOLD, fontStyle: 'normal' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (summaryByQuarter.length) {
    y = ensureSpace(doc, y, 30, margin, pageH)
    y = drawSectionLabel(doc, 'Tax recoverable by quarter', y, margin)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text('GST, QST, and provincial-HST paid — claimable as input tax credits. A non-recoverable PST (BC/MB/SK) isn’t included.', margin, y)
    y += 4
    autoTable(doc, {
      head: [['Quarter', 'GST', 'QST', 'Total']],
      body: summaryByQuarter.map(q => [q.period.replace('-', ' '), fmt(q.gst), fmt(q.qst), fmt(q.total)]),
      startY: y, margin: { left: margin, right: margin }, tableWidth: 120,
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: GREEN, textColor: GOLD, fontStyle: 'normal' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    })
  }

  // ---- One section per year, one table per event ---------------------
  // Column indices: 0 Date, 1 Vendor, 2 Category, 3 Prov., 4 Payment,
  // 5 Amount, 6 Tax, 7 Tip, 8 Total, 9 Rec., 10 Receipt.
  const RECEIPT_COL = 10
  for (const yg of yearGroups) {
    doc.addPage()
    y = margin + 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...DARK)
    doc.text(String(yg.year), margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(`${fmt(yg.total + yg.totalTax + yg.totalTip)} total`, pageW - margin, y, { align: 'right' })
    y += 6
    const yearBookmark = doc.outline.add(null, String(yg.year), { pageNumber: doc.internal.getCurrentPageInfo().pageNumber })

    for (const group of yg.events) {
      y = ensureSpace(doc, y, 26, margin, pageH)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...DARK)
      doc.text(group.name, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...MUTED)
      doc.text(`${group.items.length} item${group.items.length !== 1 ? 's' : ''}`, margin + doc.getTextWidth(group.name) + 4, y)
      doc.outline.add(yearBookmark, group.name, { pageNumber: doc.internal.getCurrentPageInfo().pageNumber })
      y += 4

      const rows = group.items.map(e => {
        const gst = parseFloat(e.gst_amount) || 0
        const qst = parseFloat(e.qst_amount) || 0
        const tax = gst + qst || (parseFloat(e.tax_amount) || 0)
        const tip = parseFloat(e.tip_amount) || 0
        const amount = parseFloat(e.amount) || 0
        const urls = (Array.isArray(e.receipt_urls) && e.receipt_urls.length) ? e.receipt_urls : (e.receipt_url ? [e.receipt_url] : [])
        return [
          e.expense_date || '', e.vendor || '—', e.category || '—',
          provinceLabelOf(e.province), paymentLabelOf(e.payment_method),
          fmt(amount), fmt(tax), tip > 0 ? fmt(tip) : '—', fmt(amount + tax + tip),
          e.reconciled ? '✓' : '',
          urls[0] || '', // raw URL — rendered as a link label in didParseCell below
        ]
      })

      autoTable(doc, {
        head: [['Date', 'Vendor', 'Category', 'Prov.', 'Payment', 'Amount', 'Tax', 'Tip', 'Total', 'Rec.', 'Receipt']],
        body: rows,
        foot: [['', '', '', '', 'Group total', fmt(group.total), fmt(group.totalTax), group.totalTip > 0 ? fmt(group.totalTip) : '', fmt(group.total + group.totalTax + group.totalTip), '', '']],
        startY: y, margin: { left: margin, right: margin },
        styles: { font: 'helvetica', fontSize: 7.8, cellPadding: 1.8, overflow: 'ellipsize' },
        headStyles: { fillColor: GREEN, textColor: GOLD, fontStyle: 'normal', fontSize: 7.5 },
        footStyles: { fillColor: [250, 250, 248], textColor: DARK, fontStyle: 'bold', fontSize: 7.8 },
        columnStyles: {
          0: { cellWidth: 18 }, 3: { cellWidth: 12 }, 4: { cellWidth: 18 },
          5: { halign: 'right', cellWidth: 18 }, 6: { halign: 'right', cellWidth: 16 },
          7: { halign: 'right', cellWidth: 15 }, 8: { halign: 'right', cellWidth: 18, fontStyle: 'bold' },
          9: { halign: 'center', cellWidth: 10 }, [RECEIPT_COL]: { cellWidth: 20 },
        },
        didParseCell(data) {
          if (data.column.index === RECEIPT_COL && data.section === 'body') {
            const url = data.cell.raw
            data.cell.text = [url ? 'View ↗' : '—']
            if (url) data.cell.styles.textColor = GOLD
          }
        },
        didDrawCell(data) {
          if (data.column.index === RECEIPT_COL && data.section === 'body' && data.cell.raw) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: data.cell.raw })
          }
        },
      })
      y = doc.lastAutoTable.finalY + 7
    }
  }

  // ---- Footer on every page ------------------------------------------
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(`Canvas Routes · Expense Report · Generated ${generatedAt}`, margin, pageH - 6)
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 6, { align: 'right' })
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
