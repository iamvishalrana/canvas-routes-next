// tiers controls who sees each perk:
// ['Routes Member', 'Inner Circle'] — visible to all members
// ['Inner Circle']                  — Inner Circle only
//
// hasCode: true means this partner is backed by a pool of one-time codes in
// the partner_codes table (see supabase/migrations/20260805_partner_codes.sql)
// — each member claims and is permanently assigned exactly one, via
// /api/member/partner-code/[slug]. Requires `slug` to match the partner_slug
// column. Partners without hasCode just show `how` as static text (e.g. a
// single shared code, or an Instagram DM instruction) same as before.
export const PARTNERS = [
  {
    name: 'Koko Bakehouse',
    instagram: 'koko.bakehouse',
    category: 'Café & Bakery',
    discount: '25% off',
    how: 'Mention Canvas Routes in your message when ordering.',
    tiers: ['Routes Member', 'Inner Circle'],
    logo: '/partners/koko-bakehouse.jpg',
  },
  {
    name: 'Café Napoléon',
    instagram: 'cafenapoleon',
    category: 'Café & Restaurant',
    discount: '15% off',
    // Single shared code — Jerry manually notifies Café Napoléon by email
    // each time a new member joins so they're added to the café's own
    // discount list tied to that email. No per-member code to track here.
    how: 'Mention code CANVASROUTE15 when ordering — Jerry lets them know by email whenever a new member joins, so you’ll already be on their list.',
    tiers: ['Routes Member', 'Inner Circle'],
    logo: '/partners/cafe-napoleon.png',
    website: 'https://cafenapoleon.com',
  },
  {
    name: 'Skyline Luge Tremblant',
    slug: 'skyline-luge-tremblant',
    instagram: 'skylinelugemonttremblant',
    category: 'Adventure & Activities',
    discount: '10% off',
    how: 'Reveal your one-time Canvas Routes code below and enter it at checkout.',
    tiers: ['Routes Member', 'Inner Circle'],
    logo: '/partners/skyline-luge-tremblant.png',
    website: 'https://tremblant.skylineluge.com',
    hasCode: true,
  },
]
