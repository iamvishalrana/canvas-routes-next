import { Cormorant_Garamond, Inter } from 'next/font/google'
import CookieBanner from '../components/CookieBanner'
import RouteTracker from '../components/RouteTracker'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata = {
  title: {
    default: 'Canvas Routes | Car Meets, Road Trips & Scenic Drives — Montreal',
    template: '%s — Canvas Routes',
  },
  description: "Canvas Routes is Montreal's premier car club. Curated road trips through the Laurentians and Eastern Townships, invite-only Cars and Coffee events, scenic convoy drives across Quebec, Ontario, Vermont and beyond. Join a community of drivers who love the road.",
  keywords: 'car meets Montreal, road trips Montreal, cars and coffee Montreal, scenic drives Quebec, Montreal car club, road trip from Montreal, Laurentians road trip, Eastern Townships scenic drive, curated road trips Quebec, automotive community Montreal, car enthusiasts Montreal, private car meets Montreal, canvas routes, Montreal road trips, Quebec driving routes, cars and coffee invite only, Montreal automotive events 2026, convoy drive Montreal, car club Montreal 2026, Quebec road trip, Montreal exotic cars, cars and coffee Quebec, scenic drive Laurentians, road trip Quebec 2026, Montreal cars and coffee 2026, curated car events Montreal, Grand Prix car meet Montreal, Mont-Tremblant drive, Charlevoix road trip, Nova Scotia road trip, Cabot Trail road trip, luxury car meets Montreal, scenic backroads Quebec, overnight road trip Montreal, car convoy Quebec, car community Montreal, weekend road trip Quebec, Montreal car enthusiasts 2026',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://canvasroutes.com' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Canvas Routes | Car Meets, Road Trips & Scenic Drives — Montreal',
    description: "Montreal's premier car club. Curated road trips through the Laurentians and Eastern Townships, invite-only Cars and Coffee events, and scenic convoy drives across Quebec and beyond.",
    url: 'https://canvasroutes.com',
    images: [{ url: 'https://canvasroutes.com/api/og?title=Car+Meets+%26+Road+Trips&subtitle=Cars+%26+Coffee+%C2%B7+Curated+Routes+%C2%B7+Members+Community&label=Canvas+Routes+%C2%B7+Montreal', width: 1200, height: 630, alt: 'Canvas Routes — Car Meets & Road Trips Montreal' }],
    locale: 'en_CA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Canvas Routes | Car Meets, Road Trips & Scenic Drives — Montreal',
    description: "Montreal's premier car club. Curated road trips, invite-only Cars and Coffee, scenic drives through the Laurentians and Eastern Townships.",
    images: ['https://canvasroutes.com/api/og?title=Car+Meets+%26+Road+Trips&subtitle=Cars+%26+Coffee+%C2%B7+Curated+Routes+%C2%B7+Members+Community&label=Canvas+Routes+%C2%B7+Montreal'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.png', type: 'image/png' },
    ],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://canvasroutes.com/#website',
      url: 'https://canvasroutes.com',
      name: 'Canvas Routes',
      description: "Montreal's premier car club — curated road trips, invite-only Cars and Coffee events, and scenic convoy drives.",
      publisher: { '@id': 'https://canvasroutes.com/#organization' },
      inLanguage: 'en-CA',
    },
    {
      '@type': 'Organization',
      '@id': 'https://canvasroutes.com/#organization',
      name: 'Canvas Routes',
      alternateName: 'Canvas Routes Montreal',
      url: 'https://canvasroutes.com',
      logo: { '@type': 'ImageObject', url: 'https://canvasroutes.com/canvas_routes_refined.png' },
      image: 'https://canvasroutes.com/canvas_routes_refined.png',
      email: 'info@canvasroutes.com',
      foundingLocation: { '@type': 'Place', name: 'Montreal, Quebec, Canada' },
      knowsAbout: [
        'Curated road trips from Montreal',
        'Cars and Coffee events Montreal',
        'Scenic drives through the Laurentians',
        'Eastern Townships scenic driving routes',
        'Charlevoix road trips',
        'Mont-Tremblant convoy drives',
        'Cabot Trail road trip Nova Scotia',
        'Overnight car convoy adventures',
        'Invite-only car meets Quebec',
        'Luxury and performance car community',
        'Automotive photography and media',
        'Quebec backroads driving routes',
      ],
      sameAs: [
        'https://www.instagram.com/canvasroutes',
        'https://www.facebook.com/share/1B8GXiPHUe/',
      ],
    },
    {
      '@type': ['LocalBusiness', 'SportsActivityLocation'],
      '@id': 'https://canvasroutes.com/#business',
      name: 'Canvas Routes',
      description: "Canvas Routes is Montreal's premier car club, organizing invite-only Cars and Coffee events, curated road trips through the Laurentians and Eastern Townships, and scenic convoy drives across Quebec, Ontario, Vermont, Maine, New York and beyond. Whether you're searching for road trips from Montreal, cars and coffee events in Quebec, scenic driving routes through the Laurentians, or an overnight car convoy to Nova Scotia's Cabot Trail, Canvas Routes brings passionate drivers together for unforgettable experiences on the road.",
      url: 'https://canvasroutes.com',
      logo: 'https://canvasroutes.com/canvas_routes_refined.png',
      image: 'https://canvasroutes.com/canvas_routes_refined.png',
      priceRange: '$–$$$',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Montreal',
        addressRegion: 'QC',
        addressCountry: 'CA',
      },
      areaServed: [
        'Montreal', 'Laval', 'Longueuil', 'Quebec City', 'Laurentians', 'Mont-Tremblant',
        'Eastern Townships', 'Cantons-de-l\'Est', 'Charlevoix', 'Gatineau', 'Ontario',
        'Vermont', 'Maine', 'New York', 'Nova Scotia',
      ],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Canvas Routes Events & Membership',
        itemListElement: [
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Cars and Coffee — Invite-Only Car Meet', description: 'Curated invite-only morning car meet at a premium Montreal venue. Complimentary coffee, no entry fee.' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Curated Road Trip', description: 'Fully planned convoy drive through scenic Quebec backroads. Includes breakfast, lunch stops, media coverage and welcome kit. $200 CAD per car.' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Routes Member — Season Membership', description: 'Canvas Routes season membership. Priority event access, members-only experiences, partner discounts. $99 CAD per season.' } },
          { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Inner Circle — Season Membership', description: 'Premium Canvas Routes membership tier. Extended season, exclusive perks, inner circle access. $249 CAD per season.' } },
        ],
      },
      email: 'info@canvasroutes.com',
      sameAs: [
        'https://www.instagram.com/canvasroutes',
        'https://www.facebook.com/share/1B8GXiPHUe/',
      ],
      parentOrganization: { '@id': 'https://canvasroutes.com/#organization' },
    },
    {
      '@type': 'TouristAttraction',
      '@id': 'https://canvasroutes.com/#attraction',
      name: 'Canvas Routes — Car Meets, Road Trips & Scenic Drives from Montreal',
      description: 'Looking for road trips near Montreal or cars and coffee events in Quebec? Canvas Routes organizes curated convoy road trips through the Laurentians, Eastern Townships, Charlevoix, and Nova Scotia, plus invite-only Cars and Coffee events in Montreal. The best automotive community in Quebec for drivers who love the road.',
      url: 'https://canvasroutes.com',
      touristType: ['Car Enthusiasts', 'Road Trip Travellers', 'Automotive Community', 'Scenic Drive Seekers'],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Montreal',
        addressRegion: 'QC',
        addressCountry: 'CA',
      },
    },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/gtag-consent.js" />
        <script
          dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1499785301931870');fbq('track','PageView');` }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <noscript><img height="1" width="1" style={{display:'none'}} src="https://www.facebook.com/tr?id=1499785301931870&ev=PageView&noscript=1" alt="" /></noscript>
        <RouteTracker />
        <CookieBanner />
        <div style={{ overflowX: 'hidden' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
