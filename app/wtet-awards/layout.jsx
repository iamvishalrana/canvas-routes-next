const OG_IMAGE = 'https://canvasroutes.com/api/og?type=event&title=Route+Awards&date=Whips+to+Eastern+Townships&bg=/wtet-og.jpg'

export const metadata = {
  title: 'Route Awards — Whips to Eastern Townships',
  description: "Vote for the route's best — Most Beautiful, Best Driver, Best Energy. Whips to Eastern Townships · July 5, 2026 · Canvas Routes",
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: 'https://canvasroutes.com/wtet-awards',
    title: 'Route Awards — Whips to Eastern Townships',
    description: "Vote for the route's best — Most Beautiful, Best Driver, Best Energy.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Route Awards — Whips to Eastern Townships' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Route Awards — Whips to Eastern Townships',
    description: "Vote for the route's best — Most Beautiful, Best Driver, Best Energy.",
    images: [OG_IMAGE],
  },
}

export default function WtetAwardsLayout({ children }) {
  return children
}
