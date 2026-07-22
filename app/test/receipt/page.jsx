import { buildReceiptEmailHtml } from '../../../lib/receiptEmail'
import { buildReceiptPdfBuffer } from '../../../lib/receiptPdf'
import { computeTax } from '../../../lib/tax'

export const metadata = { title: 'Receipt preview', robots: { index: false, follow: false } }

export default function ReceiptPreviewPage() {
  const t = computeTax(9900) // sample: $99 Routes Member membership
  const shared = {
    firstName: 'Jordan',
    billedToName: 'Jordan Whitfield',
    billedToEmail: 'jordan@example.com',
    itemLabel: 'Routes Member Membership',
    subtotal: t.subtotal,
    discount: 0,
    gst: t.gst,
    qst: t.qst,
    total: t.total,
    paidAt: new Date().toISOString(),
    receiptId: 'pi_3QxK9L2eA1B7fH3c0Fj2Xk9'.slice(-10),
  }

  const htmlFr = buildReceiptEmailHtml({ lang: 'fr', firstName: shared.firstName, itemLabel: shared.itemLabel })
  const htmlEn = buildReceiptEmailHtml({ lang: 'en', firstName: shared.firstName, itemLabel: shared.itemLabel })
  const pdfBase64 = buildReceiptPdfBuffer(shared).toString('base64')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#ccc' }}>
      <div style={{ display: 'flex', gap: '1px' }}>
        <iframe srcDoc={htmlFr} title="Email — French" style={{ width: '50%', height: '70vh', border: 'none', display: 'block' }} />
        <iframe srcDoc={htmlEn} title="Email — English" style={{ width: '50%', height: '70vh', border: 'none', display: 'block' }} />
      </div>
      <embed src={`data:application/pdf;base64,${pdfBase64}`} type="application/pdf" title="Attached PDF — page 1 French, page 2 English" style={{ width: '100%', height: '100vh' }} />
    </div>
  )
}
