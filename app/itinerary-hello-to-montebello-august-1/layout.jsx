// Share preview uses the actual hero photo directly (no generated text-overlay
// image) — matches its real 1400x788 dimensions. Title format is an
// intentional HTM-specific exception (month + day, no year), matching the
// public registration page — the general site convention is "Name — Year"
// only for every other route/event.
//
// Image URL must be the www host, not the bare apex — canvasroutes.com
// 301-redirects every request (including this image) to www.canvasroutes.com,
// and several link-preview crawlers (notably iMessage) don't follow a
// redirect on an og:image URL, so the share preview silently showed no
// photo at all. The title/description still worked fine via the apex URL
// since those are read straight off the meta tags, not fetched as a binary.
const HERO_IMAGE = 'https://www.canvasroutes.com/montebello-itinerary.jpg'
const PAGE_URL = 'https://canvasroutes.com/itinerary-hello-to-montebello-august-1'

export const metadata = {
  title: 'Hello to Montebello — Private Itinerary',
  description: 'Your route, stops, and itinerary for Hello to Montebello · August 1, 2026 · Canvas Routes',
  robots: { index: false, follow: false },
  // Without this, Next falls back to the root layout's default canonical
  // (the homepage) since this page never declared its own.
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: PAGE_URL,
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
