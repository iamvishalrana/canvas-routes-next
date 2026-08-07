import * as Sentry from '@sentry/nextjs'

export function captureException(err, extra) {
  try { Sentry.captureException(err, { extra }) } catch {}
}

// level defaults to 'error' so existing callers page as before. Pass 'info' or
// 'warning' for expected, self-healing diagnostics (e.g. a webhook rescue that
// fired by design) so they stay queryable in Sentry without tripping the
// high-priority alert rule.
export function captureMessage(msg, extra, level = 'error') {
  try { Sentry.captureMessage(msg, { level, extra }) } catch {}
}
