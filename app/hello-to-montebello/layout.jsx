// Share preview uses the actual hero photo directly (no generated text-overlay
// image) — matches its real 1400x788 dimensions. Title format here is an
// intentional HTM-specific exception (month + day, no year) — the general
// site convention is "Name — Year" only for every other route/event.
const HERO_IMAGE = 'https://canvasroutes.com/montebello-hero.jpg'

export const metadata = {
  title: 'Hello to Montebello — August 1',
  description: 'A curated convoy route from Montreal to Fairmont Le Château Montebello — August 1, 2026. Meet in Laval, regroup at Porte du Nord, coffee at L\'Atelier des Deux P, and lunch at Aux Chantignoles inside the largest log château in the world. $199 members / $225.',
  keywords: 'Montebello route Montreal, Fairmont Le Château Montebello drive, Canvas Routes route, curated driving event Quebec, scenic drive Outaouais, convoy drive Quebec, car route Montreal, Aux Chantignoles lunch drive',
  alternates: { canonical: 'https://canvasroutes.com/hello-to-montebello' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Hello to Montebello — August 1 | Canvas Routes',
    description: 'Curated convoy from Montreal to Fairmont Le Château Montebello. Coffee at L\'Atelier des Deux P, lunch at Aux Chantignoles, a stroll around Montebello. $199 members / $225.',
    url: 'https://canvasroutes.com/hello-to-montebello',
    images: [{ url: HERO_IMAGE, width: 1400, height: 788, alt: 'Hello to Montebello — Canvas Routes Route' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello to Montebello — August 1 | Canvas Routes',
    description: 'Curated convoy from Montreal to Fairmont Le Château Montebello. Coffee stop, lunch at Aux Chantignoles, a stroll around Montebello. $199 members / $225.',
    images: [HERO_IMAGE],
  },
}

const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Hello to Montebello — Canvas Routes Route',
  startDate: '2026-08-01T08:00:00-04:00',
  endDate: '2026-08-01T20:00:00-04:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  description: 'A curated convoy from Montreal to Fairmont Le Château Montebello — coffee at L\'Atelier des Deux P in Amherst, lunch at Aux Chantignoles inside the largest log château in the world, and a stroll around Montebello before the drive home.',
  image: HERO_IMAGE,
  url: 'https://canvasroutes.com/hello-to-montebello',
  location: {
    '@type': 'Place',
    name: 'Montebello, Quebec',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Montebello',
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
    { '@type': 'Offer', name: 'Member rate', price: '199', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: 'https://canvasroutes.com/hello-to-montebello' },
    { '@type': 'Offer', name: 'Standard rate', price: '225', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: 'https://canvasroutes.com/hello-to-montebello' },
  ],
}

export default function HelloToMontebelloLayout({ children }) {
  return (
    <>
      {/* Polyfill for in-app browsers where Stripe.js's Apple Pay detection throws on
          window.webkit.messageHandlers: Facebook's in-app browser defines window.webkit
          but not messageHandlers; Instagram's doesn't define window.webkit at all. */}
      <script dangerouslySetInnerHTML={{ __html: `
        try {
          if (!window.webkit) {
            window.webkit = {};
          }
          if (!window.webkit.messageHandlers) {
            window.webkit.messageHandlers = new Proxy({}, { get: function() { return { postMessage: function() {} } } });
          }
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
