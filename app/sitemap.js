// Next.js native dynamic sitemap — replaces the old hand-maintained
// public/sitemap.xml, which had drifted stale (missing /membership,
// pointing at nothing for pages added since). This file is code-reviewed
// like anything else, so it can't silently rot the same way.
//
// Only pages with `robots: { index: true }` (the default, i.e. no noindex
// set) belong here. Deliberately excluded:
//  - /partners — noindex by owner's choice
//  - /cbtd-2026 — not yet ready to be surfaced anywhere (see feedback_year_scope_recurring_events memory)
//  - /drive — bare redirect stub, no content of its own
//  - /unsubscribe — utility page
//  - /itinerary-hello-to-montebello-august-1, /itinerary-into-the-laurentians-june-7,
//    /itinerary-sunday-silhouette-august-30-2026, /whips-to-eastern-townships —
//    password-gated private itineraries
//  - /admin/*, /members/*, /api/*, /test/* — already blocked in robots.txt
//
// Past events (WTET, Cars Coffee & Dad Jokes, WTET Awards) ARE included —
// Vishal wants them discoverable in search as a track-record/credibility
// signal, not hidden once the date passes.
const SITE = 'https://canvasroutes.com'

export default function sitemap() {
  const now = new Date()
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE}/routes`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/membership`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/hello-to-montebello`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/sunday-silhouette-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/cars-and-coffee-montreal`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/notify`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/routes/into-the-laurentians`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/routes/past`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/wtet`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/wtet-awards`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/cars-coffee-dad-jokes`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
