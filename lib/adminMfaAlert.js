import { after } from 'next/server'
import { emailShell, p } from './emailLayout'
import { captureException } from './sentry'

// Best-effort "a recovery method was used to access your admin account" alert,
// sent to the primary AND recovery email so misuse of a recovery path is
// visible to the real admin even if one inbox is compromised. Never blocks the
// response or throws — wrapped in after(); a send failure is only logged.
// `method` is a fixed string from our own code (never user input), so it's
// safe to interpolate into the HTML.
export function alertRecoveryUsed({ user, method }) {
  if (!process.env.RESEND_API_KEY) return
  const recipients = [...new Set([user.email, user.app_metadata?.mfa_recovery_email].filter(Boolean))]
  if (!recipients.length) return
  const when = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })
  const html = emailShell({
    title: 'Admin account recovery used',
    eyebrow: 'Canvas Routes &middot; Admin &middot; Security',
    heading: 'A recovery method was just used',
    body: `
      ${p(`Your Canvas Routes admin account was just signed in using <strong>${method}</strong> on ${when} (Montreal time), instead of the usual email code.`)}
      ${p(`If this was you, no action is needed. If it wasn't, change your admin password immediately and review your recovery methods in Settings &rarr; Security.`, { tone: 'fine', mb: '0' })}
    `,
  })
  after(() =>
    Promise.allSettled(recipients.map((to) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({ from: 'Canvas Routes <info@canvasroutes.com>', to, subject: 'Security alert: admin recovery method used', html }),
      }).then((r) => { if (!r.ok) throw new Error(`Resend ${r.status}`) })
    )).then((results) => {
      results.forEach((r) => { if (r.status === 'rejected') captureException(r.reason, { context: 'admin-mfa-recovery-alert' }) })
    })
  )
}
