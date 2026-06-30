export const metadata = {
  title: 'Whips to Eastern Townships — Private Itinerary',
  description: 'Your route, stops, and itinerary for Whips to Eastern Townships · July 5, 2026 · Canvas Routes',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: 'https://canvasroutes.com/whips-to-eastern-townships',
    title: 'Whips to Eastern Townships — July 5, 2026',
    description: 'Your route and itinerary for the Canvas Routes drive through the Eastern Townships. 20 cars · 3 groups · Chemin des Cantons.',
    images: [{
      url: 'https://canvasroutes.com/wtet-og.jpg',
      width: 1200,
      height: 630,
      alt: 'Whips to Eastern Townships — Canvas Routes',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Whips to Eastern Townships — July 5, 2026',
    description: 'Your route and itinerary for the Canvas Routes drive through the Eastern Townships.',
    images: ['https://canvasroutes.com/wtet-og.jpg'],
  },
}

export default function DriveLayout({ children }) {
  return children
}
