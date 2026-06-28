export const metadata = {
  title: 'Whips to Eastern Townships — Private Itinerary',
  description: 'Your route, stops, and itinerary for WTET · July 5, 2026 · Canvas Routes',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Whips to Eastern Townships — July 5, 2026',
    description: 'Your route and itinerary for the Canvas Routes road trip through the Eastern Townships.',
    images: [{ url: 'https://canvasroutes.com/wtet.png', width: 1200, height: 630, alt: 'Whips to Eastern Townships — Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Whips to Eastern Townships — July 5, 2026',
    description: 'Your route and itinerary for the Canvas Routes road trip through the Eastern Townships.',
    images: ['https://canvasroutes.com/wtet.png'],
  },
}

export default function DriveLayout({ children }) {
  return children
}
