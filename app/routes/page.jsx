import SiteNav from '../../components/SiteNav'
import SiteFooter from '../../components/SiteFooter'
import PageLoader from '../../components/PageLoader'
import UpcomingRoadtrips from '../../components/UpcomingRoadtrips'

export default function RoutesPage() {
  return (
    <>
      {/* Brand loading screen — holds until the hero + route photos are cached
          (4s bail-out inside PageLoader keeps slow connections from waiting) */}
      <PageLoader
        minMs={1400}
        images={[
          '/convoy-hero.jpg',
          '/routes-photos/memoirs-to-charlevoix.jpg',
          '/routes-photos/the-gaspesie-odyssey.jpg',
          '/routes-photos/the-tobermory-story.jpg',
          '/routes-photos/the-calabogie-boogie.jpg',
          '/routes-photos/the-cabot-trail-grail.jpg',
        ]}
      />
      <SiteNav links={[
        { href: '/',         label: 'Home'    },
        { href: '/#events',  label: 'Events'  },
        { href: '/#contact', label: 'Contact' },
        { href: '/faq',      label: 'FAQ'     },
      ]} />
      <UpcomingRoadtrips />
      <SiteFooter />
    </>
  )
}
