export const metadata = {
  title: { absolute: 'Upcoming Roadtrips | Canvas Routes' },
  description: 'Browse Canvas Routes\' upcoming 2026 road trips from Montreal — Charlevoix, Gaspésie, Tobermory, Calabogie, and the Cabot Trail. Register your interest; each route launches once the crew is ready. No payment, no commitment.',
  keywords: 'Canvas Routes road trips, upcoming drives Montreal 2026, Charlevoix drive, Gaspésie road trip, Cabot Trail drive, Tobermory drive, Calabogie, scenic drives Quebec, convoy road trips Canada, driving events Montreal',
  alternates: { canonical: 'https://canvasroutes.com/routes' },
  openGraph: {
    title: 'Upcoming Roadtrips — 2026 Season | Canvas Routes',
    description: 'Register your interest in Canvas Routes\' upcoming 2026 road trips from Montreal. Routes launch once enough drivers are in — you\'re notified the moment we hit critical mass.',
    url: 'https://canvasroutes.com/routes',
    images: [{ url: 'https://canvasroutes.com/api/og?type=event&title=Upcoming+Roadtrips&date=2026+Season', width: 1200, height: 630, alt: 'Upcoming Roadtrips — Canvas Routes 2026 Season' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Upcoming Roadtrips — 2026 Season | Canvas Routes',
    description: 'Register your interest in Canvas Routes\' upcoming 2026 road trips from Montreal. Routes launch once the crew is ready.',
    images: ['https://canvasroutes.com/api/og?type=event&title=Upcoming+Roadtrips&date=2026+Season'],
  },
}

export default function RoutesLayout({ children }) {
  return <>{children}</>
}
