// Sent once a registrant's check-in is fully complete — includes a copy of
// their signed waiver for their records. Built on the shared design system
// (lib/emailLayout.js). The waiver text always includes both EN and FR
// (whichever the event has on file), matching the check-in page's display.
import { emailShell, p, accentCard, instagram, FONT, COLOR } from './emailLayout.js'

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildCheckinCompleteHtml(firstName, eventName, waiver, tripDetails) {
  const vehicle = [waiver?.vehicle?.year, waiver?.vehicle?.make, waiver?.vehicle?.model].filter(Boolean).join(' ') || '—'
  const signedAt = waiver?.signed_at
    ? new Date(waiver.signed_at).toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })
    : '—'
  // The waiver's own passenger list is the source of truth, but if it's empty
  // (e.g. the waiver was signed before Trip Details was completed) fall back to
  // the passengers entered in Trip Details — excluding the driver at index 0 —
  // so the email never reads "None listed" when passengers actually exist.
  const waiverPax = waiver?.passengers || []
  const pax = waiverPax.length ? waiverPax : (tripDetails?.passengers_list || []).slice(1)
  const passengerLines = pax.map(p => `${escapeHtml(p.name)}, age ${escapeHtml(p.age)}`).join('<br/>') || 'None listed'

  const waiverCard = accentCard(`
    <div style="font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};margin-bottom:10px;">Your Signed Waiver</div>
    <div style="font-family:${FONT};font-size:18px;font-weight:600;color:${COLOR.head};margin:0 0 10px;">${escapeHtml(waiver?.full_name || firstName)}</div>
    <div style="font-family:${FONT};font-size:12px;color:${COLOR.muted};line-height:1.9;">
      Signed ${signedAt}<br/>
      Vehicle: ${escapeHtml(vehicle)}<br/>
      Emergency contact: ${escapeHtml(waiver?.emergency_contact?.name || '—')} &middot; ${escapeHtml(waiver?.emergency_contact?.phone || '—')}<br/>
      Passengers covered: ${passengerLines}
    </div>`, { bg: COLOR.taupe, mb: '20px' })

  const body = `
    ${p(`Your check-in for <strong style="color:${COLOR.head};font-weight:600;">${escapeHtml(eventName)}</strong> is complete &mdash; everything you submitted is on file.`)}
    ${p(`The full itinerary &mdash; meeting point, timing, and everything else &mdash; will be shared with you a few days before the day of the route.`, { tone: 'muted', mb: '22px' })}
    ${waiverCard}
    ${p(`You agreed to the full liability waiver when you signed &mdash; we keep a copy on file. Reply to this email if you&rsquo;d like a copy sent to you.`, { tone: 'muted', mb: '24px' })}
    ${p(`Keep an eye on <a href="https://www.instagram.com/canvasroutes" style="color:#3B6B2F;text-decoration:none;">@canvasroutes</a> for updates. Reply to this email if anything on file needs correcting.`, { tone: 'muted', mb: '24px' })}
    ${p(`See you on the road,<br/>Jerry<br/><span style="color:${COLOR.muted};">Canvas Routes</span>`, { mb: '26px' })}
    ${instagram()}
  `

  return emailShell({
    title: 'You’re all set — Canvas Routes',
    preheader: `Your check-in for ${eventName} is complete — see you on the road.`,
    eyebrow: 'Canvas Routes &middot; Check-in',
    heading: `You&rsquo;re all set, ${escapeHtml(firstName)}.`,
    body,
  })
}
