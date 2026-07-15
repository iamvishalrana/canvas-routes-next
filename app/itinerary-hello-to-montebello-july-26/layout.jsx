const OG_IMAGE = 'https://canvasroutes.com/api/og?type=event&title=Hello+to+Montebello&date=July+26%2C+2026&bg=/montebello-hero.jpg'

export const metadata = {
  title: 'Hello to Montebello — Private Itinerary',
  description: 'Your route, stops, and itinerary for Hello to Montebello · July 26, 2026 · Canvas Routes',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: 'https://canvasroutes.com/itinerary-hello-to-montebello-july-26',
    title: 'Hello to Montebello — July 26, 2026',
    description: 'Your route and itinerary for the Canvas Routes drive to Fairmont Le Château Montebello.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Hello to Montebello — Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello to Montebello — July 26, 2026',
    description: 'Your route and itinerary for the Canvas Routes drive to Fairmont Le Château Montebello.',
    images: [OG_IMAGE],
  },
}

export default function DriveLayout({ children }) {
  return children
}
