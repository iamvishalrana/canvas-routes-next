// Launched 2026-08-20 — share preview uses the real hero photo directly (no
// generated text-overlay image), matching its actual dimensions. Title/OG
// follow the site convention ("Name — Year" only, never the exact date —
// see the Route names memory rule); HTM's own August-1-in-the-title is
// called out there as a deliberate one-off exception, not the pattern to copy.
const HERO_IMAGE = 'https://www.canvasroutes.com/laurentian-cars-morning-mirrored.png'

export const metadata = {
  title: 'Sunday Silhouette — 2026',
  description: 'A quick loop through the Laurentians — coffee at Café Marius in Saint-Donat, breakfast at a premium brunch restaurant in Saint-Sauveur, back before noon. Out at 7:30 AM from Laval. $99 members / $125.',
  keywords: 'Laurentians route Montreal, Canvas Routes route, scenic morning drive Quebec, Saint-Donat drive, Saint-Sauveur drive, convoy drive Quebec, car route Montreal, Lanaudière backroads',
  alternates: { canonical: 'https://canvasroutes.com/sunday-silhouette-2026' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Sunday Silhouette — 2026 | Canvas Routes',
    description: 'A quick loop through the Laurentians — coffee at Café Marius, breakfast at a premium brunch restaurant, back before noon. $99 members / $125.',
    url: 'https://canvasroutes.com/sunday-silhouette-2026',
    images: [{ url: HERO_IMAGE, width: 1535, height: 1024, alt: 'Sunday Silhouette — Canvas Routes Route' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sunday Silhouette — 2026 | Canvas Routes',
    description: 'A quick loop through the Laurentians — coffee at Café Marius, breakfast at a premium brunch restaurant, back before noon. $99 members / $125.',
    images: [HERO_IMAGE],
  },
}

const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Sunday Silhouette — Canvas Routes Route',
  startDate: '2026-08-30T07:30:00-04:00',
  endDate: '2026-08-30T12:00:00-04:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  description: 'A quick escape through the Laurentians, back before lunch — coffee at Café Marius in Saint-Donat, breakfast at a premium brunch restaurant in Saint-Sauveur.',
  image: HERO_IMAGE,
  url: 'https://canvasroutes.com/sunday-silhouette-2026',
  location: {
    '@type': 'Place',
    name: 'Laval, Quebec',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Laval',
      addressRegion: 'QC',
      addressCountry: 'CA',
    },
  },
  organizer: {
    '@type': 'Organization',
    name: 'Canvas Routes',
    url: 'https://canvasroutes.com',
  },
  offers: [
    { '@type': 'Offer', name: 'Member rate', price: '99', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: 'https://canvasroutes.com/sunday-silhouette-2026' },
    { '@type': 'Offer', name: 'Standard rate', price: '125', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: 'https://canvasroutes.com/sunday-silhouette-2026' },
  ],
}

export default function SundaySilhouetteLayout({ children }) {
  return (
    <>
      {/* Polyfill for in-app browsers where native-bridge calls throw on
          window.webkit.messageHandlers[someHandler].postMessage(...) — Stripe.js's
          Apple Pay availability check hits this. Instagram doesn't define
          window.webkit at all; Facebook DOES define window.webkit.messageHandlers,
          but its own injected in-app-browser instrumentation sometimes calls a
          handler key that isn't actually registered, throwing on
          undefined.postMessage. This page uses PaymentElement with Apple Pay
          enabled (same as /wtet, /hello-to-montebello, and /cbtd-2026), so it
          has the same exposure. Wrapping messageHandlers itself in a Proxy
          (rather than only creating it when entirely absent) covers both
          cases — real handlers still work via the `in target` check, anything
          else falls back to a no-op instead of crashing. */}
      <script dangerouslySetInnerHTML={{ __html: `
        try {
          if (!window.webkit) {
            window.webkit = {};
          }
          var existingHandlers = window.webkit.messageHandlers || {};
          window.webkit.messageHandlers = new Proxy(existingHandlers, {
            get: function(target, prop) {
              if (prop in target) return target[prop];
              return { postMessage: function() {} };
            }
          });
        } catch(e) {}
      `}} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      {children}
    </>
  )
}
