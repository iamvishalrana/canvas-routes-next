// /drive is a bare redirect (see page.jsx) to /itinerary-into-the-laurentians-june-7
// — it has no content of its own to index. This metadata used to be copy-pasted
// from the redirect target's own layout.jsx and never customized.
export const metadata = {
  title: 'Redirecting… | Canvas Routes',
  robots: { index: false, follow: false },
}

export default function DriveLayout({ children }) {
  return children
}
