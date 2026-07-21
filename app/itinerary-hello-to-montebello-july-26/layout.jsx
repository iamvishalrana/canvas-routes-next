// Share preview uses the actual hero photo directly (no generated text-overlay
// image) — matches its real 1400x788 dimensions. Title format is an
// intentional HTM-specific exception (month + day, no year), matching the
// public registration page — the general site convention is "Name — Year"
// only for every other route/event.
const HERO_IMAGE = 'https://canvasroutes.com/montebello-itinerary.jpg'

export const metadata = {
  title: 'Hello to Montebello — Private Itinerary',
  description: 'Your route, stops, and itinerary for Hello to Montebello · August 1, 2026 · Canvas Routes',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: 'https://canvasroutes.com/itinerary-hello-to-montebello-july-26',
    title: 'Hello to Montebello — August 1',
    description: 'Your route and itinerary for the Canvas Routes drive to Fairmont Le Château Montebello.',
    images: [{ url: HERO_IMAGE, width: 1400, height: 788, alt: 'Hello to Montebello — Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hello to Montebello — August 1',
    description: 'Your route and itinerary for the Canvas Routes drive to Fairmont Le Château Montebello.',
    images: [HERO_IMAGE],
  },
}

export default function DriveLayout({ children }) {
  return children
}
