// Reminder for registrants who haven't finished the pre-event check-in yet —
// lists exactly which sections are still missing for THIS registrant and
// includes the event date/location so the email stands on its own. Built on
// the shared design system (lib/emailLayout.js).
import { emailShell, p, button, infoCard, instagram, FONT, COLOR } from './emailLayout.js'

export function buildCheckinReminderHtml({ firstName, checkinUrl, eventLabel, dateDisplay, location, missingLabels }) {
  const checklist = (missingLabels || []).map((label, i, arr) => `
    <tr><td style="padding:10px 0;${i === arr.length - 1 ? '' : `border-bottom:1px solid ${COLOR.line};`}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="width:18px;vertical-align:middle;">
          <div style="width:15px;height:15px;border:1.5px solid ${COLOR.gold};border-radius:4px;">&nbsp;</div>
        </td>
        <td style="font-family:${FONT};font-size:14px;color:${COLOR.head};padding-left:12px;vertical-align:middle;">${label}</td>
      </tr></table>
    </td></tr>`).join('')

  const body = `
    ${p(`You&rsquo;re registered for <strong style="color:${COLOR.head};font-weight:600;">${eventLabel}</strong>, but we still need the following from you before the day:`, { mb: '20px' })}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">${checklist}</table>
    ${(dateDisplay || location) ? infoCard([
      dateDisplay && ['Date', dateDisplay],
      location && ['Location', location],
    ]) : ''}
    ${p(`It only takes a couple of minutes, and your email is already pre-filled &mdash; just tap the button below.`, { tone: 'muted' })}
    ${button(checkinUrl, 'Complete Check-in &rarr;', { variant: 'solid', mb: '8px' })}
    ${p(`If you&rsquo;ve already completed check-in, you can ignore this email.`, { tone: 'fine', mb: '26px' })}
    ${p(`Any questions &mdash; reply directly to this email or reach out at <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>.`, { mb: '26px' })}
    ${instagram()}
  `

  return emailShell({
    title: 'Don’t forget to check in — Canvas Routes',
    preheader: `You're registered for ${eventLabel} — a couple of quick things still need finishing before the day.`,
    eyebrow: 'Canvas Routes &middot; Route',
    heading: `Don&rsquo;t forget to check in, ${firstName}.`,
    body,
  })
}
