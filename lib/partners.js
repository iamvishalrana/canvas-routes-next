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
    how: '25% off all kinds of orders. Mention Canvas Routes in your message when ordering.',
    tiers: ['Routes Member', 'Inner Circle'],
    logo: '/partners/koko-bakehouse.jpg',
  },
  {
    name: 'Café Napoléon',
    instagram: 'cafenapoleon',
    category: 'Café & Restaurant',
    discount: '10–15% off',
    // Single shared code — Jerry manually notifies Café Napoléon by email
    // each time a new member joins so they're added to the café's own
    // discount list tied to that email. No per-member code to track here.
    // Two different rates depending on what's ordered: 10% on in-store
    // drinks/food, 15% on any coffee (in-store or online).
    how: '10% off in-store drink & food purchases. 15% off all in-store or online orders of any coffee they sell. Mention code CANVASROUTE15 when ordering — Jerry lets them know by email whenever a new member joins, so you’ll already be on their list.',
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
    // The code is a single, unique one-time-assigned code (one per member,
    // never shared) — but Skyline Luge lets members reuse it on every visit,
    // it isn't limited to a single checkout.
    how: 'Reveal your one-time Canvas Routes code below and enter it at checkout. It’s yours alone, but you can redeem it as many times as you like — no problem.',
    tiers: ['Routes Member', 'Inner Circle'],
    logo: '/partners/skyline-luge-tremblant.png',
    website: 'https://tremblant.skylineluge.com',
    hasCode: true,
  },
]
