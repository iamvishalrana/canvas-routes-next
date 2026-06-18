import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b3a011e919cbc56969f1da6bc828dcc2@o4511482659471360.ingest.us.sentry.io/4511482660585472",

  tracesSampleRate: 0.1,

  ignoreErrors: [
    /runtime\.sendMessage/,
    /window\.webkit\.messageHandlers/,
    /webkit\.messageHandlers/,
    /setupIosCallbackHandler/,
    /elm\.events\.push is not a function/,
  ],

  beforeSend(event, hint) {
    // Drop errors originating from injected third-party scripts (Facebook IAB, etc.)
    // identified by the app:// or app:/// filename scheme in their stack frames.
    const frames = event.exception?.values?.[0]?.stacktrace?.frames
    if (frames?.some(f => f.filename?.startsWith('app://'))) return null

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
