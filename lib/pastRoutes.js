// Routes Canvas Routes has actually run. These launched outside the
// interest-gathering `upcoming_routes` table into their own dedicated
// registration pages, so there's no DB row to pull them from — hardcoded
// here as the single source of truth, shared by the homepage, admin panel,
// and members portal so past and upcoming routes can render side by side.
export const PAST_ROUTES = [
  {
    slug: 'into-the-laurentians',
    name: 'Into the Laurentians',
    destination: 'Mont-Tremblant, QC',
    month_label: 'June 2026',
    description: 'The road starts at 7 AM in LaSalle. By the time you reach the Laurentians, the city feels far away.',
    photo: '/trem-trip.jpg',
    href: '/routes/into-the-laurentians',
    cars: 11,
    target: 9,
  },
  {
    slug: 'whips-to-eastern-townships',
    name: 'Whips to Eastern Townships',
    destination: 'Eastern Townships, QC',
    month_label: 'July 2026',
    description: 'Serene backroads through wine country, mountain passes, and a fine dining experience to close the day.',
    photo: '/wtet.png',
    href: '/wtet',
    cars: 22,
    target: 18,
  },
]
