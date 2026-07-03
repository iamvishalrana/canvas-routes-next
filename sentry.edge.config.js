// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// process.env.VERCEL is only set when actually deployed/running on Vercel —
// gates out local runs so they don't report into the same Sentry project as
// production and get mistaken for real incidents.
if (process.env.VERCEL) {
  Sentry.init({
    dsn: "https://b3a011e919cbc56969f1da6bc828dcc2@o4511482659471360.ingest.us.sentry.io/4511482660585472",

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 0.1,

    enableLogs: true,
  });
}
