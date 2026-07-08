const OG_IMAGE = 'https://canvasroutes.com/api/og'

export const metadata = {
  title: 'Get Notified — Canvas Routes',
  description: "We'll email you when new car meets and routes are announced — no membership required. Priority is always given to Canvas Routes members.",
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    url: 'https://canvasroutes.com/notify',
    title: 'Get Notified — Canvas Routes',
    description: "We'll email you when new car meets and routes are announced — no membership required.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Canvas Routes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get Notified — Canvas Routes',
    description: "We'll email you when new car meets and routes are announced — no membership required.",
    images: [OG_IMAGE],
  },
}

export default function NotifyLayout({ children }) {
  return children
}
