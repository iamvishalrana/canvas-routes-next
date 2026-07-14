export const metadata = {
  title: { absolute: 'Routes — 2026 Season | Canvas Routes' },
  description: 'Charlevoix. Gaspésie. Tobermory. Calabogie. The Cabot Trail. Express your interest in Canvas Routes\' upcoming drives from Montreal — each route launches once the crew is ready. No payment, no commitment.',
  keywords: 'Canvas Routes, upcoming drives Montreal 2026, Charlevoix drive, Gaspésie drive, Cabot Trail drive, Tobermory drive, Calabogie, scenic drives Quebec, convoy drives Canada, driving events Montreal',
  alternates: { canonical: 'https://canvasroutes.com/routes' },
  openGraph: {
    title: 'Routes — 2026 Season — Canvas Routes',
    description: 'Charlevoix to the Cabot Trail — five drives from Montreal waiting for a crew. Put your name down — each route launches when enough drivers are in.',
    url: 'https://canvasroutes.com/routes',
    images: [{ url: 'https://canvasroutes.com/api/og?type=photo&bg=/convoy-hero.jpg', width: 1200, height: 630, alt: 'Routes — 2026 Season — Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Routes — 2026 Season — Canvas Routes',
    description: 'Charlevoix to the Cabot Trail — five drives from Montreal waiting for a crew. Put your name down — each route launches when enough drivers are in.',
    images: ['https://canvasroutes.com/api/og?type=photo&bg=/convoy-hero.jpg'],
  },
}

export default function RoutesLayout({ children }) {
  return <>{children}</>
}
