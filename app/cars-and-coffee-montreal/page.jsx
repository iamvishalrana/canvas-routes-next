import CarsAndCoffeeMontrealContent from '../../components/CarsAndCoffeeMontrealContent'

const OG_IMAGE = 'https://canvasroutes.com/api/og?type=event&title=Cars%20%26%20Coffee%20in%20Montreal&bg=%2Fmeet-photo.png'

export const metadata = {
  title: 'Cars & Coffee Montreal — Invite-Only Car Meets | Canvas Routes',
  description: "Montreal's curated, invite-only Cars & Coffee — free to attend, personally reviewed, no fixed schedule. Learn how to get your car approved for the next meet.",
  keywords: 'cars and coffee montreal, car meet montreal, car club montreal, invite only car meet, montreal car enthusiasts',
  alternates: { canonical: 'https://canvasroutes.com/cars-and-coffee-montreal' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Cars & Coffee Montreal — Invite-Only Car Meets',
    description: "Montreal's curated, invite-only Cars & Coffee — free to attend, personally reviewed, no fixed schedule.",
    url: 'https://canvasroutes.com/cars-and-coffee-montreal',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Cars & Coffee in Montreal — Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cars & Coffee Montreal — Invite-Only Car Meets',
    description: "Montreal's curated, invite-only Cars & Coffee — free to attend, personally reviewed, no fixed schedule.",
    images: [OG_IMAGE],
  },
}

// Mirrors the visible page copy (kept in English for structured data, same
// convention as app/faq/page.jsx's JSON-LD) — reuses the same facts already
// published in lib/i18n/faq.js so this never contradicts the FAQ page.
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I get invited to Cars and Coffee Montreal?',
      acceptedAnswer: { '@type': 'Answer', text: "Meets are announced periodically throughout the season — there's no fixed weekly or monthly schedule. Once a meet is announced, anyone can apply at canvasroutes.com. Every registration is personally reviewed and confirmed by email; this is not a first come, first served event." },
    },
    {
      '@type': 'Question',
      name: 'Is Cars and Coffee Montreal free?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cars and Coffee events are completely free to attend, and Canvas Routes provides complimentary coffee for every registered car.' },
    },
    {
      '@type': 'Question',
      name: 'What kind of cars show up to Canvas Routes Cars and Coffee?',
      acceptedAnswer: { '@type': 'Answer', text: 'A mix of exotics, classics, performance cars and enthusiast builds. Themed meets give preference to specific categories, but all passionate enthusiasts are welcome to apply.' },
    },
    {
      '@type': 'Question',
      name: 'How often does Canvas Routes host Cars and Coffee in Montreal?',
      acceptedAnswer: { '@type': 'Answer', text: "There's no fixed cadence — meets are announced periodically throughout the season (June through October) rather than on a set weekly or monthly schedule. Signing up for notifications or following @canvasroutes on Instagram is the best way to hear about the next one." },
    },
  ],
}

export default function CarsAndCoffeeMontrealPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <CarsAndCoffeeMontrealContent />
    </>
  )
}
