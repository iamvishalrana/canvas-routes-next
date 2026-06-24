const OG_IMAGE = 'https://canvasroutes.com/api/og?type=event&title=Whips+to+Eastern+Townships&date=July+5%2C+2026&bg=/wtet.png'

export const metadata = {
  title: { absolute: 'Whips to Eastern Townships — July 5 · Canvas Routes' },
  description: 'A curated convoy road trip from Montreal to Lac Memphrémagog — July 5, 2026. Private winery experience in Dunham, Chemin des Cantons backroads, and lunch at Auberge & Restaurant McGowan in Georgeville. $179 members / $199 non-members. Limited to 15 cars.',
  keywords: 'Eastern Townships road trip Montreal, road trip from Montreal 2026, Canvas Routes road trip, curated driving event Quebec, Lac Memphremagog drive, scenic drive Eastern Townships, convoy drive Quebec, car road trip Montreal, Quebec backroads driving, Chemin des Cantons, Dunham winery drive, Georgeville restaurant',
  alternates: { canonical: 'https://canvasroutes.com/wtet' },
  openGraph: {
    title: 'Whips to Eastern Townships — July 5, 2026 | Canvas Routes',
    description: 'Curated convoy from Montreal through wine country to Lac Memphrémagog — July 5, 2026. Winery stop in Dunham, Chemin des Cantons backroads, lunch at Auberge & Restaurant McGowan. $179 members / $199. Limited to 15 cars.',
    url: 'https://canvasroutes.com/wtet',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Whips to Eastern Townships — Canvas Routes Road Trip July 5 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Whips to Eastern Townships — July 5, 2026 | Canvas Routes',
    description: 'Curated convoy from Montreal to Lac Memphrémagog. Winery in Dunham, Chemin des Cantons backroads, lunch at Auberge McGowan. $179 members / $199. 15 cars max.',
    images: [OG_IMAGE],
  },
}

const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Whips to Eastern Townships — Canvas Routes Road Trip',
  startDate: '2026-07-05T08:00:00-04:00',
  endDate: '2026-07-05T20:00:00-04:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  description: 'A curated convoy through the Eastern Townships — private winery experience at Vignoble Domaine du Brésée in Dunham, Chemin des Cantons backroads through the Sutton Mountains, and lunch at Auberge & Restaurant McGowan overlooking Lac Memphrémagog.',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      {children}
    </>
  )
}
