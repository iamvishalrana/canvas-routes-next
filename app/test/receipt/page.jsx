import { buildReceiptHtml } from '../../../lib/receiptEmail'
import { computeTax } from '../../../lib/tax'

export const metadata = { title: 'Receipt preview', robots: { index: false, follow: false } }

export default function ReceiptPreviewPage() {
  const t = computeTax(9900) // sample: $99 Routes Member membership
  const html = buildReceiptHtml({
    firstName: 'Jordan',
    itemLabel: 'Routes Member Membership',
    subtotal: t.subtotal,
    discount: 0,
    gst: t.gst,
    qst: t.qst,
    total: t.total,
    paidAt: new Date().toISOString(),
    receiptId: 'pi_3QxK9L2eA1B7fH3c0Fj2Xk9'.slice(-10),
  })

  return (
    <iframe
      srcDoc={html}
      title="Sample receipt"
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
    />
  )
}
