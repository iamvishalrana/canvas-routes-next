// Shared builder for polished, "interactive" table PDFs — real searchable
// text (jsPDF + autotable, never a rasterised screenshot), a clickable
// bookmark outline to jump between sections, clickable mailto: links on email
// columns, a branded header, and page numbers. Native PDF-viewer features, so
// they work with no extra tooling for the reader (Acrobat/Preview/Chrome).
//
// Mirrors the approach in expenses/expensePdf.js but kept as its own generic
// module so it can't destabilise that (test-less, financial) report. Used by
// the registrant exports in Meets & Events and in the Routes section.
import { MONTREAL_TZ } from '../../../lib/mtlTime'

const GREEN = [15, 30, 20]
const GOLD = [197, 168, 130]
const CREAM = [245, 241, 236]
const DARK = [26, 26, 26]
const MUTED = [140, 140, 140]

// Fetch the logo and hand back a downscaled base64 PNG — jsPDF re-encodes
// embedded PNGs inefficiently, so shrinking it first keeps the file small.
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

function drawHeader(doc, logo, title, subtitle, margin) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.4)
  doc.line(0, 30, pageW, 30)
  if (logo) {
    const w = 34, h = w / (1544 / 600) // source PNG is 1544×600
    doc.addImage(logo, 'PNG', margin, (30 - h) / 2, w, h)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...CREAM)
  doc.text(title, pageW - margin, 13, { align: 'right' })
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GOLD)
    doc.text(subtitle, pageW - margin, 20, { align: 'right', maxWidth: pageW - margin - 50 })
  }
  return 40
}

// sections: [{ label?, columns: [{ header, halign?, email? }], rows: (string|number)[][] }]
export async function exportTablePdf({ title, subtitle, filename, sections }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'), import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 12
  const pageH = doc.internal.pageSize.getHeight()
  doc.setProperties({ title })

  let logo = null
  try { logo = await loadLogoDataUrl('/logo-white.png') } catch { /* report still works without it */ }
  let y = drawHeader(doc, logo, title, subtitle, margin)

  for (const sec of sections) {
    if (!sec || !sec.columns?.length) continue
    const emailCols = new Set(sec.columns.map((c, i) => (c.email ? i : -1)).filter(i => i >= 0))

    if (sec.label) {
      if (y + 18 > pageH - margin) { doc.addPage(); y = margin }
      // Clickable bookmark to this section in the PDF outline.
      try { doc.outline.add(null, sec.label, { pageNumber: doc.getNumberOfPages() }) } catch {}
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...DARK)
      doc.text(sec.label, margin, y)
      y += 5
    }

    autoTable(doc, {
      head: [sec.columns.map(c => c.header)],
      body: (sec.rows || []).map(r => r.map(c => (c == null ? '' : String(c)))),
      startY: y,
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, overflow: 'linebreak', textColor: DARK, lineColor: [232, 228, 223], lineWidth: 0.1 },
      headStyles: { fillColor: GREEN, textColor: GOLD, fontStyle: 'normal', fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 249, 247] },
      columnStyles: Object.fromEntries(sec.columns.map((c, i) => [i, { halign: c.halign || 'left' }])),
      // Overlay an invisible mailto link annotation on each email cell — the
      // text stays selectable/searchable AND becomes clickable.
      didDrawCell: (data) => {
        if (data.section === 'body' && emailCols.has(data.column.index)) {
          const raw = String(data.cell.raw ?? '').trim()
          if (raw && raw.includes('@')) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: `mailto:${raw}` })
          }
        }
      },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Footer on every page: generated date + page x of y.
  const pageCount = doc.getNumberOfPages()
  const genStr = `Generated ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: MONTREAL_TZ })}`
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED)
    doc.text(genStr, margin, ph - 6)
    doc.text(`Page ${i} of ${pageCount}`, pw - margin, ph - 6, { align: 'right' })
  }

  doc.save(filename)
}

// Small helper for a filesystem-safe filename slug.
export function pdfSlug(s) {
  return String(s || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export'
}
