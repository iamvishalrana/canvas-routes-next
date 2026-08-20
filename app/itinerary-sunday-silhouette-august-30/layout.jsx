// Private/password-gated page — not indexed, not linked anywhere yet (the
// public /sunday-silhouette registration form isn't open either).
const HERO_IMAGE = 'https://www.canvasroutes.com/laurentian-cars-morning-mirrored.png'
const PAGE_URL = 'https://canvasroutes.com/itinerary-sunday-silhouette-august-30'

export const metadata = {
  title: 'Sunday Silhouette — Private Itinerary',
  description: 'Your route, stops, and itinerary for Sunday Silhouette · August 30, 2026 · Canvas Routes',
  robots: { index: false, follow: false },
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: PAGE_URL,
    title: 'Sunday Silhouette — August 30',
    description: 'Your route and itinerary for the Canvas Routes morning drive through the Laurentians.',
    images: [{ url: HERO_IMAGE, width: 1535, height: 1024, alt: 'Sunday Silhouette — Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sunday Silhouette — August 30',
    description: 'Your route and itinerary for the Canvas Routes morning drive through the Laurentians.',
    images: [HERO_IMAGE],
  },
}

export default function ItineraryLayout({ children }) {
  return children
}
