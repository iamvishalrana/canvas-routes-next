import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b3a011e919cbc56969f1da6bc828dcc2@o4511482659471360.ingest.us.sentry.io/4511482660585472",

  tracesSampleRate: 0.1,

  ignoreErrors: [
    /runtime\.sendMessage/,
    /window\.webkit\.messageHandlers/,
    /webkit\.messageHandlers/,
  ],

  beforeSend(event, hint) {
    const err = hint?.originalException
    // Safari throws SecurityError (DOMException code 18) when WebSocket is blocked
    // by ITP or privacy policy. The page works fine — realtime sync just degrades.
    if (err instanceof DOMException && err.code === 18) {
      const stack = err.stack || ''
      if (stack.includes('phoenix') || stack.includes('WebSocket') || stack.includes('supabase')) {
        return null
      }
    }
    return event
  },
});
