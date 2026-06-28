---
name: feedback_site_rules
description: Hard rules for the Canvas Routes website — terminology, templates, payment flow, and fonts. Apply to every session without exception.
metadata:
  type: feedback
---

## Rules — apply always, no exceptions

**1. Road trip → Route/Routes**
Never write "road trip" or "Road Trip" in any user-facing copy, emails, page headings, metadata descriptions, or link previews. Always use "route" (singular) or "routes" (plural). Internal code variable names (isRoadTrip, road_trip_wtet) can stay — this rule is about what the client and public see.

**Why:** Canvas Routes brand language. "Road trip" is generic. "Route" is the brand word.
**How to apply:** Before committing any copy change, grep for "road trip" in the touched files.

---

**2. WTET page is the standard event template**
The `/wtet/page.jsx` is the canonical template for all paid events going forward. Every new paid event page must reuse its exact structure: hero → stats bar → details + pricing + description bullets + Michelin-style highlight callout → itinerary section with stops → included/not-included grid → registration form section.

**Why:** Avoid building new layouts and introducing new inconsistencies each time.
**How to apply:** When a new event page is needed, copy `/wtet/page.jsx` and swap out event-specific content only.

---

**3. WTET payment flow is canonical**
The WTET payment flow (PI creation → Stripe Elements → confirmPayment → server confirm API → webhook rescue) is the established, audited, bug-fixed flow. Never build a new payment or registration flow from scratch for new events. Reuse `wtet-register`, `wtet-member-register`, `wtet-member-confirm`, and the webhook handlers as the reference implementation.

**Why:** Every new flow introduced new bugs that required multiple audit-and-fix sessions.
**How to apply:** For a new paid event, clone the WTET API routes, update EVENT_NAME/price constants, and wire to the new event page.

---

**4. Fonts must be consistent**
Three font variables are defined in `app/layout.jsx` and must be used exclusively across the entire site:
- `var(--font-cormorant)` — headings, prices, hero text, editorial copy
- `var(--font-inter)` — all UI labels, body copy, buttons, form elements
- `var(--font-bebas)` — large numeric stats only (prices, countdown, stat bars)

Never introduce `font-family: sans-serif`, `font-family: Arial`, `font-family: Georgia` or any hardcoded font string in page components. Always reference the CSS variables.

**Why:** Ad-hoc font strings have created visual inconsistencies across pages.
**How to apply:** Search for `font-family:` in any new code — if it's not a CSS variable, replace it.
