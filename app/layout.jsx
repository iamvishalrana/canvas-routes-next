import CookieBanner from '../components/CookieBanner'
import RouteTracker from '../components/RouteTracker'
import './globals.css'

export const metadata = {
  title: 'Canvas Routes | Luxury Car Meets & Curated Road Trips in Montreal',
  description: "Canvas Routes is Montreal's premier luxury automotive community. Join exclusive car meets, curated road trips, and scenic drives across Quebec. Apply for membership today.",
  keywords: 'luxury car meets Montreal, curated road trips Quebec, automotive community Montreal, car enthusiasts Montreal, scenic drives Quebec, private car meets Montreal, canvas routes, road trips Montreal, Montreal road trips, Montreal car scene, Montreal exotic cars, Quebec driving routes, cars and coffee Montreal, Montreal car club',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://canvasroutes.com' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'Canvas Routes | Luxury Car Meets & Curated Road Trips in Montreal',
    description: "Montreal's premier luxury automotive community. Exclusive car meets, curated road trips, and scenic drives across Quebec. Apply for membership.",
    url: 'https://canvasroutes.com',
    images: [{ url: 'https://canvasroutes.com/canvas_routes_refined.png', alt: 'Canvas Routes — Luxury Automotive Community Montreal' }],
    locale: 'en_CA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Canvas Routes | Luxury Car Meets & Curated Road Trips in Montreal',
    description: "Montreal's premier luxury automotive community. Exclusive car meets, curated road trips, and scenic drives across Quebec.",
    images: [{ url: 'https://canvasroutes.com/canvas_routes_refined.png', alt: 'Canvas Routes — Luxury Automotive Community Montreal' }],
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
      '@type': 'LocalBusiness',
      '@id': 'https://canvasroutes.com/#business',
      name: 'Canvas Routes',
      description: "Canvas Routes is Montreal's premier luxury automotive community, organizing exclusive curated road trips, car meets, and scenic drives across Quebec. Whether you're looking for road trips from Montreal, cars and coffee events, scenic driving routes through the Laurentians, Eastern Townships, or Charlevoix, Canvas Routes brings together passionate car enthusiasts for unforgettable experiences.",
      url: 'https://canvasroutes.com',
      logo: 'https://canvasroutes.com/canvas_routes_refined.png',
      image: 'https://canvasroutes.com/canvas_routes_refined.png',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Montreal',
        addressRegion: 'QC',
        addressCountry: 'CA',
      },
      areaServed: ['Montreal', 'Quebec', 'Laurentians', 'Eastern Townships', 'Charlevoix', 'Cantons-de-l\'Est', 'Mont-Tremblant'],
      email: 'info@canvasroutes.com',
      sameAs: [
        'https://www.instagram.com/canvasroutes',
        'https://www.facebook.com/share/1B8GXiPHUe/',
      ],
    },
    {
      '@type': 'TouristAttraction',
      '@id': 'https://canvasroutes.com/#attraction',
      name: 'Canvas Routes — Curated Road Trips & Car Meets in Montreal',
      description: 'Looking for road trips near Montreal? Canvas Routes organizes curated scenic drives and exclusive car meets across Quebec, including routes through the Laurentians, Eastern Townships, and Charlevoix. A must for car enthusiasts in Montreal and Quebec.',
      url: 'https://canvasroutes.com',
      touristType: ['Car Enthusiasts', 'Road Trip Travellers', 'Automotive Community'],
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500&display=swap" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied'});`,
          }}
        />
      </head>
      <body>
        <RouteTracker />
        <CookieBanner />
        {children}
      </body>
    </html>
  )
}
