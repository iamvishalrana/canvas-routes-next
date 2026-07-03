// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// process.env.VERCEL is only set when actually deployed/running on Vercel —
// gates out local `next dev`/`next start` runs (including Playwright health
// checks against a local server) so they don't report into the same Sentry
// project as production and get mistaken for real incidents.
if (process.env.VERCEL) {
  Sentry.init({
    dsn: "https://b3a011e919cbc56969f1da6bc828dcc2@o4511482659471360.ingest.us.sentry.io/4511482660585472",

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 0.1,

    enableLogs: true,
  });
}
