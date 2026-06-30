const OG_IMAGE = 'https://canvasroutes.com/api/og?type=event&title=Whips+to+Eastern+Townships&date=July+5%2C+2026&bg=/wtet.png'

export const metadata = {
  title: 'Whips to Eastern Townships — July 5, 2026',
  description: 'A curated convoy route from Montreal through the Eastern Townships — July 5, 2026. Private winery experience at Vignoble Domaine du Brésée, Chemin des Cantons backroads through the Sutton Mountains, and lunch at Auberge & Restaurant McGowan in Georgeville with a chef from Michelin-starred kitchens. $179 members / $199.',
  keywords: 'Eastern Townships route Montreal, route from Montreal 2026, Canvas Routes route, curated driving event Quebec, Lac Memphremagog drive, scenic drive Eastern Townships, convoy drive Quebec, car route Montreal, Quebec backroads driving, Chemin des Cantons, Frelighsburg winery drive, Georgeville restaurant',
  alternates: { canonical: 'https://canvasroutes.com/wtet' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Whips to Eastern Townships — July 5, 2026 | Canvas Routes',
    description: 'Curated convoy from Montreal through wine country to Lac Memphrémagog. Private winery stop, Chemin des Cantons backroads, lunch by a chef from Michelin-starred kitchens at Auberge McGowan. $179 members / $199.',
    url: 'https://canvasroutes.com/wtet',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Whips to Eastern Townships — Canvas Routes Route July 5 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Whips to Eastern Townships — July 5, 2026 | Canvas Routes',
    description: 'Curated convoy from Montreal to Lac Memphrémagog. Winery stop, Chemin des Cantons backroads, Michelin-starred kitchen lunch at Auberge McGowan. $179 members / $199.',
    images: [OG_IMAGE],
  },
}

const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Whips to Eastern Townships — Canvas Routes Route',
  startDate: '2026-07-05T08:00:00-04:00',
  endDate: '2026-07-05T20:00:00-04:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  description: 'A curated convoy through the Eastern Townships — private winery experience at Vignoble Domaine du Brésée in Frelighsburg, Chemin des Cantons backroads through the Sutton Mountains, and lunch at Auberge & Restaurant McGowan overlooking Lac Memphrémagog.',
  image: OG_IMAGE,
  url: 'https://canvasroutes.com/wtet',
  location: {
    '@type': 'Place',
    name: 'Eastern Townships, Quebec',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lac Memphrémagog',
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
    { '@type': 'Offer', name: 'Member rate', price: '179', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: 'https://canvasroutes.com/wtet' },
    { '@type': 'Offer', name: 'Standard rate', price: '199', priceCurrency: 'CAD', availability: 'https://schema.org/InStock', url: 'https://canvasroutes.com/wtet' },
  ],
}

export default function WtetLayout({ children }) {
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
