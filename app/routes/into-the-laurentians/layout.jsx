export const metadata = {
  title: { absolute: 'Into the Laurentians | Canvas Routes' },
  description: 'A curated convoy route from Montreal into the Laurentians on June 7, 2026. Scenic backroads to Mont-Tremblant, premium breakfast, artisanal lunch, full media coverage and farewell drinks. $200 per car. Spots are limited.',
  keywords: 'Laurentians route Montreal, route from Montreal 2026, Canvas Routes route, curated driving event Quebec, Mont-Tremblant drive, scenic drive Laurentians, convoy drive Quebec, car route Montreal, Quebec backroads driving, route June 2026',
  alternates: { canonical: 'https://canvasroutes.com/routes/into-the-laurentians' },
  openGraph: {
    title: 'Into the Laurentians — June 7, 2026 | Canvas Routes',
    description: 'Curated convoy route from Montreal through the Laurentians — June 7, 2026. Scenic backroads, premium breakfast, artisanal lunch, full media coverage. $200 per car. Limited spots remaining.',
    url: 'https://canvasroutes.com/routes/into-the-laurentians',
    images: [{ url: 'https://canvasroutes.com/api/og?type=event&title=Into+the+Laurentians&date=June+7%2C+2026&bg=/trem-trip.png', width: 1200, height: 630, alt: 'Into the Laurentians — Canvas Routes Route June 7 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Into the Laurentians — June 7, 2026 | Canvas Routes',
    description: 'Curated convoy route from Montreal through the Laurentians. June 7, 2026. $200 per car. Spots are limited.',
    images: ['https://canvasroutes.com/api/og?type=event&title=Into+the+Laurentians&date=June+7%2C+2026&bg=/trem-trip.png'],
  },
}

const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Into the Laurentians — Canvas Routes Route',
  startDate: '2026-06-07T07:00:00-04:00',
  endDate: '2026-06-07T21:00:00-04:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  description: 'A curated convoy through the Laurentians — premium breakfast in LaSalle, scenic backroads to Mont-Tremblant, a Horology stop, artisanal lunch, full media coverage of your car on the road, and farewell drinks. Canvas Routes organizes exclusive routes for passionate drivers from Montreal.',
  image: 'https://canvasroutes.com/june7-poster.png',
  url: 'https://canvasroutes.com/routes/into-the-laurentians',
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
    url: 'https://canvasroutes.com/routes/into-the-laurentians',
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
