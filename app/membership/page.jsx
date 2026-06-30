import MembershipContent from '../../components/MembershipContent'

export const metadata = {
  title: { absolute: 'Membership | Canvas Routes' },
  description: 'Apply to join Canvas Routes — the Montreal automotive community. Curated road trips, Cars & Coffee events, and a network of drivers who care about the craft.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Membership | Canvas Routes',
    description: 'Apply to join Canvas Routes — curated road trips, Cars & Coffee, and a community of drivers in Montreal.',
    url: 'https://canvasroutes.com/membership',
    images: [{ url: 'https://canvasroutes.com/membership-hero.jpeg', width: 1200, height: 630, alt: 'Canvas Routes Membership — Montreal Automotive Community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Membership | Canvas Routes',
    description: 'Apply to join Canvas Routes — curated road trips, Cars & Coffee, and a community of drivers in Montreal.',
    images: ['https://canvasroutes.com/membership-hero.jpeg'],
  },
}

export default function MembershipPage() {
  return <MembershipContent />
}
