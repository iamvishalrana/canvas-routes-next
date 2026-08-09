export const metadata = {
  title: 'Into the Laurentians — June 7',
  description: 'Canvas Routes convoy briefing — June 7, 2026',
  // Private, password-gated itinerary for confirmed registrants only — was
  // missing this while its sibling (itinerary-hello-to-montebello-august-1)
  // already has it, leaving this one indexable by mistake.
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://canvasroutes.com/itinerary-into-the-laurentians-june-7' },
}

export default function ItineraryLaurentiansLayout({ children }) {
  return children
}
