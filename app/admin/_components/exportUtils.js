// All exports use dynamic imports so libraries are only loaded on demand.

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadCSV(filename, headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

export async function downloadExcel(filename, headers, rows) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Export')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  triggerDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export async function downloadPDF(filename, title, headers, rows) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: rows.length > 0 && headers.length > 6 ? 'landscape' : 'portrait' })
  doc.setFont('helvetica')
  doc.setFontSize(14)
  doc.text(title, 14, 18)
  doc.setFontSize(9)
  doc.setTextColor(150)
  doc.text(`Exported ${new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`, 14, 25)
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 30, 20], textColor: [197, 168, 130], fontStyle: 'normal' },
    alternateRowStyles: { fillColor: [250, 250, 248] },
  })
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

export async function downloadDOCX(filename, title, headers, rows) {
  const {
    Document, Packer, Table, TableRow, TableCell,
    Paragraph, TextRun, HeadingLevel, WidthType, BorderStyle,
  } = await import('docx')

  const border = { style: BorderStyle.SINGLE, size: 1, color: 'e0e0e0' }
  const cellBorders = { top: border, bottom: border, left: border, right: border }

  const headerRow = new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(h), bold: true, size: 18 })] })],
      shading: { fill: '0F1E14' },
      borders: cellBorders,
    })),
  })

  const dataRows = rows.map(row => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ''), size: 18 })] })],
      borders: cellBorders,
    })),
  }))

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({
          children: [new TextRun({ text: `Exported ${new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}`, color: '999999', size: 18 })],
        }),
        new Paragraph({ text: '' }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`)
}

export async function exportData(format, filename, title, headers, rows) {
  switch (format) {
    case 'csv':   return downloadCSV(filename, headers, rows)
    case 'xlsx':  return downloadExcel(filename, headers, rows)
    case 'pdf':   return downloadPDF(filename, title, headers, rows)
    case 'docx':  return downloadDOCX(filename, title, headers, rows)
    default: throw new Error(`Unknown format: ${format}`)
  }
}
