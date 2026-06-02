import * as Sentry from '@sentry/nextjs'

export function captureException(err, extra) {
  try { Sentry.captureException(err, { extra }) } catch {}
}

export function captureMessage(msg, extra) {
  try { Sentry.captureMessage(msg, { level: 'error', extra }) } catch {}
}
