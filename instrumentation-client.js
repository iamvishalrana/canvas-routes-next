// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b3a011e919cbc56969f1da6bc828dcc2@o4511482659471360.ingest.us.sentry.io/4511482660585472",

  tracesSampleRate: 0.1,
  enableLogs: true,

  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value || ''
    // Instagram in-app browser on Android crashes its own Java WebView bridge —
    // not our code, not actionable.
    if (msg.includes('enableDidUserTypeOnKeyboardLogging') || msg.includes('Java object is gone')) return null
    return event
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
