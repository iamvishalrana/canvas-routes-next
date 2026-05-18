export const metadata = {
  title: 'Into the Laurentians — Canvas Routes',
  description: 'Join Canvas Routes for a curated road trip into the Laurentians on May 31, 2026. Premium breakfast, scenic backroads, artisanal lunch, media coverage, and farewell drinks. $200 per car. Spots are limited.',
  keywords: 'Laurentians road trip Montreal, Canvas Routes road trip, curated driving event Quebec, cars and coffee road trip Montreal, Mont-Tremblant drive, scenic drive Laurentians',
  alternates: { canonical: 'https://canvasroutes.com/routes' },
  openGraph: {
    title: 'Into the Laurentians — Canvas Routes',
    description: 'A curated road trip through the Laurentians on May 31, 2026. Premium breakfast, scenic backroads, artisanal lunch, full media coverage. $200 per car.',
    url: 'https://canvasroutes.com/routes',
    images: [{ url: 'https://canvasroutes.com/itl.png', alt: 'Into the Laurentians — Canvas Routes Road Trip' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Into the Laurentians — Canvas Routes',
    description: 'A curated road trip through the Laurentians on May 31, 2026. $200 per car. Spots are limited.',
    images: ['https://canvasroutes.com/itl.png'],
  },
}

const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Into the Laurentians — Canvas Routes Road Trip',
  startDate: '2026-05-31',
  endDate: '2026-05-31',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  description: 'A curated convoy through the Laurentians — premium breakfast in Montreal, scenic backroads, artisanal lunch, full media coverage, and farewell drinks. Canvas Routes organizes exclusive road trips for passionate drivers.',
  image: 'https://canvasroutes.com/itl.png',
  url: 'https://canvasroutes.com/routes',
  location: {
    '@type': 'Place',
    name: 'Mont-Tremblant, Quebec',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Mont-Tremblant',
      addressRegion: 'QC',
      addressCountry: 'CA',
    },
  },
  organizer: {
    '@type': 'Organization',
    name: 'Canvas Routes',
    url: 'https://canvasroutes.com',
  },
  offers: {
    '@type': 'Offer',
    price: '200',
    priceCurrency: 'CAD',
    availability: 'https://schema.org/InStock',
    url: 'https://canvasroutes.com/routes',
    validFrom: '2026-05-13',
  },
}

export default function RoutesLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      {children}
    </>
  )
}
