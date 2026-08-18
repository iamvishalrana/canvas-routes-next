// Private/password-gated page — not indexed, not linked anywhere yet (the
// public /rise-and-drive registration form isn't open either). Uses a
// generic placeholder hero (/Convoy.png) for the OG image until a real
// Laurentians photo exists — swap HERO_IMAGE below when one is ready.
const HERO_IMAGE = 'https://www.canvasroutes.com/Convoy.png'
const PAGE_URL = 'https://canvasroutes.com/itinerary-rise-and-drive-august-30'

export const metadata = {
  title: 'Rise and Drive — Private Itinerary',
  description: 'Your route, stops, and itinerary for Rise and Drive · August 30, 2026 · Canvas Routes',
  robots: { index: false, follow: false },
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: PAGE_URL,
    title: 'Rise and Drive — August 30',
    description: 'Your route and itinerary for the Canvas Routes morning drive through the Laurentians.',
    images: [{ url: HERO_IMAGE, width: 1400, height: 788, alt: 'Rise and Drive — Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rise and Drive — August 30',
    description: 'Your route and itinerary for the Canvas Routes morning drive through the Laurentians.',
    images: [HERO_IMAGE],
  },
}

export default function ItineraryLayout({ children }) {
  return children
}
