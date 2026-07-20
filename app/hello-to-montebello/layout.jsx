// Name says "Name — Year" only, never the exact date (site convention) — the
// og image's `date` param prints directly onto the shared preview image, so
// it counts as part of the name/link, not page body copy.
const OG_IMAGE = 'https://canvasroutes.com/api/og?type=event&title=Hello+to+Montebello&date=2026&bg=/montebello-hero.jpg'

export const metadata = {
  title: 'Hello to Montebello — 2026',
  description: 'A curated convoy route from Montreal to Fairmont Le Château Montebello — August 1, 2026. Meet in Laval, regroup at Porte du Nord, coffee at L\'Atelier des Deux P, and lunch at Aux Chantignoles inside the largest log château in the world. $199 members / $225.',
  keywords: 'Montebello route Montreal, Fairmont Le Château Montebello drive, Canvas Routes route, curated driving event Quebec, scenic drive Outaouais, convoy drive Quebec, car route Montreal, Aux Chantignoles lunch drive',
  alternates: { canonical: 'https://canvasroutes.com/hello-to-montebello' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Hello to Montebello — 2026 | Canvas Routes',
    description: 'Curated convoy from Montreal to Fairmont Le Château Montebello. Coffee at L\'Atelier des Deux P, lunch at Aux Chantignoles, chocolate at Chocomotive. $199 members / $225.',
    url: 'https://canvasroutes.com/hello-to-montebello',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Hello to Montebello — Canvas Routes Route 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello to Montebello — 2026 | Canvas Routes',
    description: 'Curated convoy from Montreal to Fairmont Le Château Montebello. Coffee stop, lunch at Aux Chantignoles, chocolate at Chocomotive. $199 members / $225.',
    images: [OG_IMAGE],
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
  description: 'A curated convoy from Montreal to Fairmont Le Château Montebello — coffee at L\'Atelier des Deux P in Amherst, lunch at Aux Chantignoles inside the largest log château in the world, and a stop at Chocomotive before the drive home.',
  image: OG_IMAGE,
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
      {/* Polyfill for Facebook in-app browser: window.webkit.messageHandlers is partially
          implemented and throws when Stripe.js tries to init Apple Pay native handlers. */}
      <script dangerouslySetInnerHTML={{ __html: `
        try {
          if (window.webkit && !window.webkit.messageHandlers) {
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
