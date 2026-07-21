import { buildCheckinCompleteHtml } from '../../../lib/checkinCompleteEmail'

export const metadata = { title: 'Check-in complete email preview', robots: { index: false, follow: false } }

export default function CheckinCompleteEmailPreviewPage() {
  const html = buildCheckinCompleteHtml('Jordan', 'Hello to Montebello — 2026', {
    full_name: 'Jordan Whitfield',
    signed_at: new Date().toISOString(),
    vehicle: { year: '2022', make: 'Porsche', model: '911' },
    emergency_contact: { name: 'Sam Whitfield', phone: '+1 514 555 0100' },
    passengers: [{ name: 'Sam Whitfield', age: '31' }],
    waiver_text_snapshot: 'PARTICIPANT LIABILITY WAIVER & RELEASE OF CLAIMS\nHello to Montebello Road Trip — August 1, 2026\n\n(Full waiver text appears here exactly as signed.)',
    waiver_text_snapshot_fr: 'DÉCHARGE DE RESPONSABILITÉ ET RENONCIATION À RECOURS DU PARTICIPANT\nRoad Trip Hello to Montebello — 1er août 2026\n\n(Le texte complet de la décharge apparaît ici tel que signé.)',
  })

  return (
    <iframe
      srcDoc={html}
      title="Sample check-in complete email"
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
    />
  )
}
