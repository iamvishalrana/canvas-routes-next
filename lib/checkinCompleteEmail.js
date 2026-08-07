// Sent once a registrant's check-in is fully complete — includes a copy of
// their signed waiver for their records. Built on the shared design system
// (lib/emailLayout.js). The waiver text always includes both EN and FR
// (whichever the event has on file), matching the check-in page's display.
import { emailShell, p, accentCard, instagram, FONT, COLOR } from './emailLayout.js'

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildCheckinCompleteHtml(firstName, eventName, waiver) {
  const vehicle = [waiver?.vehicle?.year, waiver?.vehicle?.make, waiver?.vehicle?.model].filter(Boolean).join(' ') || '—'
  const signedAt = waiver?.signed_at
    ? new Date(waiver.signed_at).toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })
    : '—'
  const passengerLines = (waiver?.passengers || []).map(p => `${escapeHtml(p.name)}, age ${escapeHtml(p.age)}`).join('<br/>') || 'None listed'

  const waiverCard = accentCard(`
    <div style="font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};margin-bottom:10px;">Your Signed Waiver</div>
    <div style="font-family:${FONT};font-size:18px;font-weight:600;color:${COLOR.head};margin:0 0 10px;">${escapeHtml(waiver?.full_name || firstName)}</div>
    <div style="font-family:${FONT};font-size:12px;color:${COLOR.muted};line-height:1.9;">
      Signed ${signedAt}<br/>
      Vehicle: ${escapeHtml(vehicle)}<br/>
      Emergency contact: ${escapeHtml(waiver?.emergency_contact?.name || '—')} &middot; ${escapeHtml(waiver?.emergency_contact?.phone || '—')}<br/>
      Passengers covered: ${passengerLines}
    </div>`, { bg: COLOR.taupe, mb: '20px' })

  const waiverText = waiver?.waiver_text_snapshot ? `
    <div style="font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.muted};margin-bottom:8px;">Full Waiver Text — For Your Records${waiver?.waiver_text_snapshot_fr ? ' (French version follows below)' : ''}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFAF9;border:1px solid rgba(0,0,0,0.08);border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:16px 18px;">
        <div style="font-family:${FONT};font-size:11px;line-height:1.7;color:#777;white-space:pre-wrap;">${escapeHtml(waiver.waiver_text_snapshot)}</div>
        ${waiver?.waiver_text_snapshot_fr ? `
        <div style="height:1px;background:rgba(0,0,0,0.1);margin:16px 0;"></div>
        <div style="font-family:${FONT};font-size:11px;line-height:1.7;color:#777;white-space:pre-wrap;">${escapeHtml(waiver.waiver_text_snapshot_fr)}</div>` : ''}
      </td></tr>
    </table>` : ''

  const body = `
    ${p(`Your check-in for <strong style="color:${COLOR.head};font-weight:600;">${escapeHtml(eventName)}</strong> is complete &mdash; trip details, waiver, and lunch are all on file.`)}
    ${p(`The full itinerary &mdash; meeting point, timing, and everything else &mdash; will be shared with you a few days before the day of the route.`, { tone: 'muted', mb: '22px' })}
    ${waiverCard}
    ${waiverText}
    ${p(`Keep an eye on <a href="https://www.instagram.com/canvasroutes" style="color:#3B6B2F;text-decoration:none;">@canvasroutes</a> for updates. Reply to this email if anything on file needs correcting.`, { tone: 'muted', mb: '24px' })}
    ${p(`See you on the road,<br/>Jerry<br/><span style="color:${COLOR.muted};">Canvas Routes</span>`, { mb: '26px' })}
    ${instagram()}
  `

  return emailShell({
    title: 'You’re all set — Canvas Routes',
    preheader: `Your check-in for ${eventName} is complete. Your signed waiver is enclosed for your records.`,
    eyebrow: 'Canvas Routes &middot; Check-in',
    heading: `You&rsquo;re all set, ${escapeHtml(firstName)}.`,
    body,
  })
}
