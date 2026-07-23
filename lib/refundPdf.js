import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { GST_NUMBER, QST_NUMBER } from './companyInfo.js'

const fmt = cents => `$${(cents / 100).toFixed(2)}`

const COPY = {
  fr: {
    eyebrow: 'Canvas Routes · Remboursement',
    greeting: name => `Bonjour, ${name}.`,
    subtitle: 'Voici votre reçu de remboursement — conservez-le pour vos dossiers.',
    receiptLabel: 'Remboursement',
    billedTo: 'Facturé à',
    subtotalLabel: 'Sous-total original',
    discountLabel: 'Remise',
    gstLabel: `TPS (5 %) · ${GST_NUMBER}`,
    qstLabel: `TVQ (9,975 %) · ${QST_NUMBER}`,
    originalTotalLabel: 'Total payé original',
    refundLabel: 'Montant remboursé',
    questions: 'Des questions à propos de ce remboursement? Répondez directement à ce courriel ou écrivez-nous à info@canvasroutes.com.',
    footer: '© 2026 Événements Canvas Routes Inc. — Montréal, QC.',
    dateLocale: 'fr-CA',
  },
  en: {
    eyebrow: 'Canvas Routes · Refund',
    greeting: name => `Hi ${name},`,
    subtitle: "Here's your refund receipt — keep it for your records.",
    receiptLabel: 'Refund',
    billedTo: 'Billed to',
    subtotalLabel: 'Original subtotal',
    discountLabel: 'Discount',
    gstLabel: `GST (5%) · ${GST_NUMBER}`,
    qstLabel: `QST (9.975%) · ${QST_NUMBER}`,
    originalTotalLabel: 'Original total paid',
    refundLabel: 'Amount refunded',
    questions: 'Questions about this refund? Reply directly to this email or reach out at info@canvasroutes.com.',
    footer: '© 2026 Canvas Routes Events Inc. — Montreal, QC.',
    dateLocale: 'en-CA',
  },
}

function drawRefundPage(doc, lang, data) {
  const t = COPY[lang]
  const { firstName, billedToName, billedToEmail, itemLabel, subtotal, discount, gst, qst, originalTotal, refundAmount, refundedAt, receiptId } = data
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20

  // Header band
  doc.setFillColor(15, 30, 20)
  doc.rect(0, 0, pageW, 42, 'F')
  doc.setDrawColor(197, 168, 130)
  doc.setLineWidth(0.4)
  doc.line(margin, 30, margin + 14, 30)
  doc.setTextColor(197, 168, 130)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(t.eyebrow.toUpperCase(), margin, 15)
  doc.setTextColor(245, 241, 236)
  doc.setFontSize(22)
  doc.text(t.greeting(firstName), margin, 26)

  let y = 55
  doc.setTextColor(68, 68, 68)
  doc.setFontSize(11)
  doc.text(t.subtitle, margin, y)
  y += 12

  // Receipt card
  const cardX = margin, cardW = pageW - margin * 2
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  const cardTop = y
  doc.setFontSize(8.5)
  doc.setTextColor(197, 168, 130)
  doc.text(`${t.receiptLabel.toUpperCase()}${receiptId ? ` · #${receiptId}` : ''}`, cardX + 4, y + 6)
  const dateStr = refundedAt ? new Date(refundedAt).toLocaleDateString(t.dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) : ''
  doc.setTextColor(150, 150, 150)
  doc.text(dateStr, cardX + cardW - 4, y + 6, { align: 'right' })

  y += 14
  doc.setTextColor(26, 26, 26)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(itemLabel, cardX + 4, y)
  doc.setFont('helvetica', 'normal')
  if (billedToName) {
    y += 6
    doc.setFontSize(9.5)
    doc.setTextColor(150, 150, 150)
    doc.text(`${t.billedTo} ${billedToName}${billedToEmail ? ` · ${billedToEmail}` : ''}`, cardX + 4, y)
  }

  y += 8
  const rows = [[t.subtotalLabel, fmt(subtotal)]]
  if (discount > 0) rows.push([t.discountLabel, `-${fmt(discount)}`])
  rows.push([t.gstLabel, fmt(gst)])
  rows.push([t.qstLabel, fmt(qst)])

  autoTable(doc, {
    body: rows,
    startY: y,
    margin: { left: cardX + 4, right: margin + 4 },
    tableWidth: cardW - 8,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 10, textColor: [80, 80, 80], cellPadding: { top: 2, bottom: 2, left: 0, right: 0 } },
    columnStyles: { 1: { halign: 'right' } },
  })

  let afterTableY = doc.lastAutoTable.finalY + 4
  doc.setDrawColor(220, 220, 220)
  doc.line(cardX + 4, afterTableY, cardX + cardW - 4, afterTableY)
  afterTableY += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(26, 26, 26)
  doc.text(t.originalTotalLabel, cardX + 4, afterTableY)
  doc.setTextColor(59, 107, 47)
  doc.text(`${fmt(originalTotal)} CAD`, cardX + cardW - 4, afterTableY, { align: 'right' })

  afterTableY += 9
  doc.setFontSize(13)
  doc.setTextColor(147, 51, 62)
  doc.text(t.refundLabel, cardX + 4, afterTableY)
  doc.text(`-${fmt(refundAmount)} CAD`, cardX + cardW - 4, afterTableY, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  const cardBottom = afterTableY + 6
  doc.setDrawColor(220, 220, 220)
  doc.rect(cardX, cardTop, cardW, cardBottom - cardTop)

  y = cardBottom + 12
  doc.setFontSize(9.5)
  doc.setTextColor(120, 120, 120)
  const questionLines = doc.splitTextToSize(t.questions, cardW)
  doc.text(questionLines, margin, y)

  // Footer
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(15, 30, 20)
  doc.rect(0, pageH - 14, pageW, 14, 'F')
  doc.setFontSize(8)
  doc.setTextColor(245, 241, 236)
  doc.text(t.footer, margin, pageH - 6)
}

// Two-page bilingual PDF — page 1 French, page 2 English, same pattern as
// buildReceiptPdfBuffer (lib/receiptPdf.js) for Charter s.57 prominence.
export function buildRefundPdfBuffer(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawRefundPage(doc, 'fr', data)
  doc.addPage()
  drawRefundPage(doc, 'en', data)
  return Buffer.from(doc.output('arraybuffer'))
}
