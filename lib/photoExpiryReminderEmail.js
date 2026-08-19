import { MONTREAL_TZ } from './mtlTime'
import { emailShell, p, button, accentCard, COLOR, escapeEmail as h } from './emailLayout.js'

// "Your photos are removed soon" reminder for a non-member photo-share person,
// sent ~3 days before a folder expires by the photo-shares-expiry-reminder cron.
// `folders` is [{ title, expires_at }] — usually one, but a person can have
// several event folders expiring together, so they're listed in a single email.
// Built on the shared design system (lib/emailLayout.js).

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
}

export function buildPhotoExpiryReminderHtml({ firstName, link, folders = [] }) {
  const rows = folders.map((f, i) => `
    <tr><td style="padding:${i === 0 ? '0' : '10px'} 0 0;">
      ${i === 0 ? '' : `<div style="height:1px;background:${COLOR.line};margin-bottom:10px;line-height:1px;font-size:1px;">&nbsp;</div>`}
      <span style="font-family:${'-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif'};font-size:15px;color:${COLOR.head};">${h(f.title)}</span>
      <span style="font-family:${'-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif'};font-size:13px;color:${COLOR.muted};"> &mdash; removed ${h(fmtDate(f.expires_at))}</span>
    </td></tr>`).join('')

  const body = `
    ${p(`A quick heads-up &mdash; your Canvas Routes photos are about to be taken down. Download anything you&rsquo;d like to keep before then:`, { mb: '20px' })}
    ${accentCard(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>`, { mb: '26px' })}
    ${button(h(link), 'View &amp; Download &rarr;', { variant: 'solid', mb: '26px' })}
    ${p(`See you on the road,<br/>Jerry<br/><span style="color:${COLOR.muted};">Canvas Routes</span>`, { mb: '0' })}
  `
  return emailShell({
    title: 'Your Canvas Routes Photos',
    preheader: 'Your Canvas Routes photos are about to be taken down — download anything you’d like to keep.',
    eyebrow: 'Canvas Routes',
    heading: `Hi ${h(firstName)},`,
    body,
  })
}

export function photoExpiryReminderText({ firstName, link, folders = [] }) {
  const list = folders.map(f => `- ${f.title} — removed ${fmtDate(f.expires_at)}`).join('\n')
  return `Hi ${firstName},

A quick heads-up — your Canvas Routes photos are about to be taken down. Download anything you'd like to keep before then:

${list}

View & download: ${link}

See you on the road,
Jerry
Canvas Routes`
}
