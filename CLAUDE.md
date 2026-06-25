# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build — always run before committing
npm run health   # Playwright health checks against canvasroutes.com (live site)
```

Always run `npm run build` before committing. The project has no lint script — build errors are the gate.

## Stack

- **Next.js 15** (App Router) + **React 19** — all new pages use Server Components by default; add `'use client'` only for interactivity
- **Supabase** — auth + database. Three client variants exist and must be used in the right context:
  - `lib/supabase/server.js` → async Server Components and API routes that run as the logged-in user
  - `lib/supabase/admin.js` → API routes that need to bypass RLS (service role key). All admin API routes use this.
  - `lib/supabase/client.js` → client components only
- **Stripe** (`lib/stripe.js`) — singleton initialized on `globalThis` to survive hot reload. `stripe` export is `null` if `STRIPE_SECRET_KEY` is not set; all callers must guard against this.
- **Resend** — called directly via `fetch('https://api.resend.com/emails', ...)`, no SDK wrapper. API key is `RESEND_API_KEY`.
- **Anthropic SDK** (`lib/anthropic.js`) — lazy singleton via `getAnthropic()`, returns `null` if key absent.
- **Upstash Redis** (`lib/rateLimit.js`) — rate limiting on all public POST routes. Falls back to in-memory per-instance cache if Redis env vars are absent (not globally shared in serverless).
- **Sentry** — error tracking via `lib/sentry.js` helpers (`captureException`, `captureMessage`). Wrap third-party calls in try/catch and report there.

## Auth & Access Control

Auth runs in two places:

1. **`middleware.js`** — protects `/members/*`, `/admin/*`, and `/api/admin/*` routes. Admin check: user email must be in `ADMIN_EMAILS` env var (comma-separated). This is the first line of defence.

2. **`lib/supabase/authCheck.js`** — `requireAdmin()` is called at the top of every admin API route handler as a second check. Never skip this in admin routes.

Members portal lives under `app/members/(portal)/` with its own layout that assumes an authenticated user.

## Key Data Model

Four tables hold user data (all in Supabase `public` schema):

- `members` — auth users who have been approved. `id` is a FK to `auth.users` with `ON DELETE CASCADE`. Has `car_photo_url` pointing to `member-photos` storage bucket at path `<uuid>.<ext>`.
- `applications` — raw form submissions. `email` is unique. No FK to members — linked by matching email. Holds all Stripe payment fields.
- `contacts` — CRM layer. `application_id` FK to `applications(id) ON DELETE CASCADE`. Deleting an application cascades to contacts.
- `announcements`, `events` — shared community data, not linked to individual users.

**Delete chain for a member:** delete `auth.users` row → cascades to `members` → also explicitly delete `member-photos` storage file and the `applications` row by email (which cascades to `contacts`). See `app/api/admin/members/[id]/route.js`.

## Public-Facing Forms

There are four registration forms, each with a phone field that includes a country code selector (defaults to `+1`). When submitting, phone is stored as `"${countryCode} ${nationalNumber}"`. Forms:

- `app/page.jsx` — main join/waitlist form
- `app/routes/page.jsx` — road trip registration
- `app/routes/into-the-laurentians/page.jsx` — specific route registration
- `components/MembershipContent.jsx` — membership application + Stripe payment

The membership form has a two-step flow: form validation → Stripe PaymentIntent creation → Stripe `Elements` checkout → `membership-waitlist` API call on payment success.

## Stripe Payment Flow

Three flows exist:

1. **WTET non-member** — `wtet-register` creates PI with `capture_method: 'manual'` (hold only). Admin captures manually after review.
2. **WTET member** — `wtet-member-register` creates PI with automatic capture. `wtet-member-confirm` sends confirmation email after payment.
3. **Membership** — `create-payment-intent` creates PI with `capture_method: 'manual'`. `membership-waitlist` saves form data + sends emails. Admin captures manually.

Steps for each: PI creation → Stripe `Elements` → `confirmPayment()` → server API → webhook rescue.

Webhook signature verified via `STRIPE_WEBHOOK_SECRET`. Never trust payment status from the client.

## Payment Patterns — Required for Every New Event/Flow

When building any new payment flow, these are mandatory. Each rule exists because a real bug was found and fixed.

### Server-side API rules

**1. Variable scope across try-blocks**
Never declare a variable with `const` inside a `try {}` block if you need it outside. Use `let` before the block:
```js
// WRONG — `existing` is out of scope after the try closes
if (condition) try {
  const { data: existing } = await supabase...
} catch {}
if (existing?.stripe_payment_intent_id) ... // ReferenceError

// CORRECT
let existing = null
if (condition) try {
  const { data: existingData } = await supabase...
  existing = existingData
} catch {}
if (existing?.stripe_payment_intent_id) ...
```

**2. Always cancel the previous PaymentIntent on re-registration**
Every registration route must fetch `stripe_payment_intent_id` from the existing DB row and cancel it before creating a new PI, to prevent ghost holds on customer cards:
```js
const { data: existing } = await supabase.from('applications')
  .select('registrations, stripe_payment_intent_id')
  .eq('email', normalEmail).maybeSingle()

const pi = await stripe.paymentIntents.create({ ... })

if (existing?.stripe_payment_intent_id && existing.stripe_payment_intent_id !== pi.id) {
  stripe.paymentIntents.cancel(existing.stripe_payment_intent_id).catch(() => {})
}
```
This pattern must be in: `wtet-register`, `wtet-member-register`, `membership-waitlist`. Check every new route.

**3. Always write `stripe_payment_status: 'pending'` on the initial upsert**
Every registration DB upsert must include `stripe_payment_status: 'pending'` so there is never a window where a row has a PI ID but no status.

**4. Store all form fields in PI metadata**
For any paid event where the client calls a separate API after `confirmPayment`, store all form fields in PI metadata at creation time. The webhook rescue path (`payment_intent.requires_capture`) reads from metadata and writes to DB — if the user closes the tab mid-flow, the data is not lost:
```js
metadata: {
  type, email, name,
  phone, dob, car_year, car_make, car_model, source, // form fields for rescue
}
```

**5. Use server-verified values in PI metadata, never trust client-supplied values**
For example, `is_member` must use the server-verified `verifiedMember` boolean, not the client-supplied `isMember` field from the request body. The metadata drives webhook routing (which email template fires) — wrong values cause wrong emails.

**6. Idempotency keys on all Stripe write operations**
Every `stripe.refunds.create()` and `stripe.paymentIntents.capture()` must have an idempotency key:
```js
stripe.refunds.create({ payment_intent: piId }, { idempotencyKey: `refund-${piId}` })
stripe.paymentIntents.capture(piId, {}, { idempotencyKey: `capture-${piId}` })
```
Without this, admin double-clicks can issue duplicate charges/refunds.

**7. Webhook must return 500 on handler crash — not 200**
The final catch block in `app/api/stripe/webhook/route.js` must return `{ status: 500 }`. A 200 tells Stripe delivery was successful; Stripe won't retry. A 500 triggers exponential backoff retries for up to 72 hours. All handlers use `upsert` so retries are safe.

**8. Emails in API routes must not block the response**
Fire emails async — do not `await` Resend calls before returning the response. Use `Promise.allSettled([...])` without await, with per-call `.catch(() => captureException(...))`. Blocking on Resend can cause client timeouts and user re-submits even though the DB write already succeeded.

**9. Dispute webhook must handle `warning_closed`**
`charge.dispute.closed` has three terminal states: `won`, `lost`, and `warning_closed`. Only `lost` means funds were withdrawn. Use a three-way check:
```js
const newStatus = dispute.status === 'won' ? 'disputed_won'
                : dispute.status === 'lost' ? 'disputed_lost'
                : 'disputed' // warning_closed — no funds lost
```

**10. Admin capture routes must guard against wrong statuses**
A capture route that only blocks `paid` will still attempt to capture a `failed`, `refunded`, or `disputed` PI (Stripe errors, confusing UX). Check explicitly:
```js
if (app.stripe_payment_status === 'paid') return error('Already captured.')
if (app.stripe_payment_status && !['pending', 'authorized'].includes(app.stripe_payment_status)) {
  return error(`Cannot capture: status is ${app.stripe_payment_status}`)
}
```

### Client-side Stripe Elements rules

**11. `elements.update({ amount })` is only valid in deferred-intent mode**
`elements.update()` only works when `<Elements>` is initialized with `mode: 'payment'` and NO `clientSecret`. If `clientSecret` is already set (confirmed-intent mode), `elements.update()` is silently ignored or errors. The membership flow uses `clientSecret` — do not call `elements.update()` there. The WTET flow uses `mode: 'payment'` — `elements.update()` is correct there.

**12. `confirmPayment` retry/confirm callbacks must check `res.ok`**
`fetch().catch()` only fires on network-level errors (no connection, DNS failure). A 500 response resolves normally and bypasses `.catch()`. Any fire-and-forget confirmation call must explicitly check `res.ok`:
```js
const doConfirm = () =>
  fetch('/api/wtet-member-confirm', { ... })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`) })
doConfirm().catch(() => setTimeout(() => doConfirm().catch(() => {}), 4000))
```

**13. Block payment if a promo code is typed but not applied**
Both WTET and membership payment forms must check `promoInput.trim()` before `confirmPayment` and show an error if a code is entered but not applied. Do this before `setPaying(true)` so the button does not get stuck.

## Event Registration Page Template

The WTET page (`app/wtet/page.jsx`) is the established template for paid road-trip/event registration pages. Reuse its structure for every future event — only swap out the route name, date, hero image, stops, pricing, and copy.

### Page structure (5 sections in order)

```
<PageLoader images={['/event-hero.png']} minMs={1500} />
1. <SiteNav />
2. HERO          — dark, full-bleed, staggered entrance animations
3. STATS BAR     — #F5F1EC background, 6 quick-facts with Bebas numbers
4. DETAILS       — #EDE8E1 background, pricing + description bullets + car eligibility
5. ITINERARY     — dark overlay on background image, timeline stops + what's included
6. FORM/PAYMENT  — #F5F1EC background, member/non-member selector, Stripe Elements
<SiteFooter />
```

### Hero section pattern

```jsx
<section className="event-hero" style={{
  backgroundColor:'#0F1E14',
  padding:'clamp(140px,18vw,210px) 3rem 6rem',
  textAlign:'center',
  position:'relative',overflow:'hidden',
  backgroundImage:"url('/event-hero.png')",
  backgroundSize:'cover',backgroundPosition:'center 50%'
}}>
  {/* Dark overlay */}
  <div className="event-hero-overlay" style={{position:'absolute',inset:0,background:'rgba(10,20,12,0.72)',zIndex:1}} />

  {/* Top gold hairline */}
  <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',
    background:'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)',zIndex:2}} />

  <div style={{position:'relative',zIndex:2}}>
    {/* Eyebrow — fade-in, delay 100ms */}
    <div style={{fontSize:'11px',letterSpacing:'0.25em',textTransform:'uppercase',
      color:'rgba(197,168,130,0.6)',marginBottom:'1.2rem',
      animation:'event-fade-in 0.7s ease both',animationDelay:'100ms'}}>Canvas Routes</div>

    {/* Title — Cormorant, fade-up, delay 250ms */}
    <h1 style={{fontFamily:'var(--font-cormorant),serif',
      fontSize:'clamp(3rem,7vw,5.5rem)',fontWeight:'300',color:'#F5F1EC',
      lineHeight:'1.05',letterSpacing:'-0.01em',
      animation:'event-fade-up 0.8s ease both',animationDelay:'250ms'}}>
      Event Name
    </h1>

    {/* Subtitle — italic Cormorant, fade-up, delay 450ms */}
    <div style={{fontFamily:'var(--font-cormorant),serif',fontSize:'clamp(1.2rem,2.8vw,1.55rem)',
      fontStyle:'italic',color:'rgba(245,241,236,0.82)',marginBottom:'1.2rem',
      animation:'event-fade-up 0.7s ease both',animationDelay:'450ms'}}>
      Route subtitle
    </div>

    {/* Date badge with periodic gold streak — fade-in, delay 600ms */}
    <div className="event-date-badge" style={{display:'inline-block',
      padding:'0.5rem 1.4rem',border:'1px solid rgba(197,168,130,0.7)',
      background:'rgba(197,168,130,0.12)',fontSize:'11px',letterSpacing:'0.22em',
      textTransform:'uppercase',color:'#F5F1EC',marginBottom:'2.5rem',
      animation:'event-fade-in 0.6s ease both',animationDelay:'600ms'}}>
      Day · Month Date, Year
    </div>

    {/* Gold divider line — fade-in, delay 700ms */}
    <div style={{width:'40px',height:'0.5px',background:'rgba(197,168,130,0.5)',
      margin:'0 auto 2.5rem',animation:'event-fade-in 0.5s ease both',animationDelay:'700ms'}} />

    {/* Body copy — fade-up, delay 800ms */}
    <p style={{fontSize:'15px',color:'rgba(245,241,236,0.55)',maxWidth:'460px',
      margin:'0 auto 3rem',lineHeight:'1.9',
      animation:'event-fade-up 0.7s ease both',animationDelay:'800ms'}}>
      One-line event pitch.
    </p>

    {/* Live countdown — fade-in, delay 950ms — hide when event date passes */}
    {countdown && <div className="event-countdown" ...>...</div>}

    {/* CTA — fade-up, delay 1100ms — one-time shimmer sweep on load */}
    <div style={{animation:'event-fade-up 0.65s ease both',animationDelay:'1100ms'}}>
      <a href="#form" className="event-hero-cta"
        style={{display:'inline-block',padding:'0.9rem 2.5rem',
          background:'#F5F1EC',color:'#0F1E14',
          fontSize:'11px',letterSpacing:'0.2em',textTransform:'uppercase',
          fontFamily:'var(--font-inter),sans-serif',fontWeight:'600'}}>
        Secure your seat →
      </a>
    </div>
  </div>

  {/* Bottom gold hairline */}
  <div style={{position:'absolute',bottom:0,left:0,right:0,height:'1px',
    background:'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)',zIndex:2}} />
</section>
```

### Animations (copy into the page's `<style>` block, prefix with event slug)

```css
/* Hero entrance */
@keyframes event-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes event-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Date badge — periodic gold streak, repeats every 4.5s */
@keyframes event-date-streak {
  0%, 100% { left: -110%; opacity: 0; }
  6%        { opacity: 1; }
  20%       { left: 130%; opacity: 0; }
  21%, 99%  { left: -110%; opacity: 0; }
}
.event-date-badge { position: relative; overflow: hidden; }
.event-date-badge::after {
  content: '';
  position: absolute;
  top: -20%; left: -110%;
  width: 55%; height: 140%;
  background: linear-gradient(105deg, transparent 15%, rgba(255,215,100,0.22) 50%, transparent 85%);
  transform: skewX(-12deg);
  animation: event-date-streak 4.5s ease-in-out 1.6s infinite;
  pointer-events: none;
}

/* Hero CTA — one-time shimmer sweep on page load */
@keyframes event-cta-shimmer {
  0%   { left: -80%; opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { left: 130%; opacity: 0; }
}
.event-hero-cta { position: relative; overflow: hidden; }
.event-hero-cta::after {
  content: '';
  position: absolute;
  top: -10%; left: -80%;
  width: 40%; height: 120%;
  background: linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.28) 50%, transparent 90%);
  transform: skewX(-10deg);
  animation: event-cta-shimmer 0.9s cubic-bezier(0.4,0,0.2,1) 1.4s forwards;
  pointer-events: none;
}

/* iOS zoom prevention */
input, select, textarea { font-size: 16px !important; }
```

### Stats bar pattern (below hero)

```jsx
{/* Numbers use Bebas Neue, labels are 9px uppercase Inter */}
{[
  { num:'~210', unit:'km' },
  { num:'70%',  unit:'backroads' },
  { num:'4',    unit:'stops' },
  { num:'15',   unit:'cars max' },
  { num:'2',    unit:'per car' },
].map(({ num, unit }, i, arr) => (
  <>
    <div key={unit} className="event-stat" style={{textAlign:'center',padding:'0 2rem'}}>
      <div style={{fontFamily:'var(--font-bebas),sans-serif',fontSize:'2.4rem',
        fontWeight:'400',color:'#1a1a1a',lineHeight:1,letterSpacing:'0.04em'}}>{num}</div>
      <div style={{fontSize:'9px',letterSpacing:'0.2em',textTransform:'uppercase',
        color:'#aaa',marginTop:'4px'}}>{unit}</div>
    </div>
    {i < arr.length - 1 && <div key={`d${i}`} className="stat-divider"
      style={{width:'1px',height:'32px',background:'rgba(0,0,0,0.1)',flexShrink:0}} />}
  </>
))}
```

### Itinerary stops pattern (dark section)

Each stop object: `{ label, venue, venueHref?, address, desc, pays }`.
- `pays: true` → gold dot + "Included in the fee." appended in gold
- `pays: false` → faded gold dot
- `venueHref` → venue name is a link with external icon

Wrap each stop in `<FadeUp delay={i * 80}>` for staggered scroll-in.

### Countdown timer

```jsx
const [countdown, setCountdown] = useState(null)
useEffect(() => {
  const EVENT = new Date('2026-MM-DDTHH:00:00Z')
  function tick() {
    const diff = EVENT - new Date()
    if (diff <= 0) { setCountdown(null); return }
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    setCountdown({ d, h, m, s })
  }
  tick()
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}, [])
```
Numbers use `var(--font-bebas)` at `2.8rem`. Each cell is `72px` min-width with `0.5px solid rgba(197,168,130,0.15)` dividers. Disappears automatically when the event date passes.

### Pricing display

Prices always use Bebas Neue at `3rem` with a `0.5px solid rgba(0,0,0,0.1)` vertical divider between member and non-member tiers. Label above each price is `10px` uppercase Inter in `#c5a882` (gold) for members, `#888` for non-members.

### Responsive breakpoints (add to each event page's `<style>`)

```css
@media (max-width: 768px) {
  .event-hero    { padding: clamp(100px,14vw,160px) 1.25rem 3.5rem !important; }
  .event-details { padding: 3rem 1.25rem !important; }
  .event-itinerary { padding: 3.5rem 1.25rem 4.5rem !important; }
  .event-form-section { padding: 2.5rem 1.25rem 4.5rem !important; }
  .event-stats-bar { flex-wrap: wrap !important; padding: 1.25rem 0.5rem !important; }
  .event-stats-bar .stat-divider { display: none !important; }
  .event-stat { flex: 0 0 33.333% !important; padding: 0.75rem 0.25rem !important; }
  .incl-grid { grid-template-columns: 1fr !important; }
  .event-hero-cta { display: block !important; width: 100% !important; text-align: center !important; }
  .event-stop { gap: 1rem !important; padding: 1.25rem 0 !important; }
}
@media (max-width: 480px) {
  .event-stat { flex: 0 0 50% !important; }
  .event-countdown-num { font-size: 1.8rem !important; }
  .join-form-row { flex-direction: column !important; }
  .wtet-dob-grid { grid-template-columns: 1fr 1fr !important; }
  .wtet-dob-year { grid-column: 1 / -1 !important; }
}
```

### Private itinerary page

After registration, confirmed participants get a password-gated itinerary page at a separate route (e.g., `/whips-to-eastern-townships`). See that file for the full pattern — it includes: password gate with `?pw=` URL fallback, Google Maps integration, route stops list with tap-to-open-in-Maps, convoy rules accordion, and an About the Drive section. The password is stored in a `const PASSWORD = '...'` at the top of the file.

## Fonts & Design Tokens

Three font variables set in `app/layout.jsx`:
- `--font-cormorant` — headings, prices, editorial text (Cormorant Garamond 300/400)
- `--font-inter` — all UI, labels, body copy (Inter 300/400/500)
- `--font-playfair` — occasional accent

Brand colours used throughout:
- `#0F1E14` — dark green (backgrounds, filled buttons)
- `#c5a882` — gold (accents, labels, CTAs)
- `#F5F1EC` — cream (light section backgrounds, text on dark)
- `#EDE8E1` — warm taupe (alternating section backgrounds)

## Environment Variables

Required for full functionality:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB access (bypasses RLS) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js in browser |
| `STRIPE_SECRET_KEY` | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `RESEND_API_KEY` | Transactional email |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis (rate limiting) |
| `ANTHROPIC_API_KEY` | AI email draft generation in admin |

All services degrade gracefully when their key is absent — check the relevant `lib/` singleton before assuming a feature works locally.

## Supabase Schema

Schema source of truth is `supabase/schema.sql`. Incremental changes are in `supabase/migrations/`. To apply migrations, run them manually in the Supabase SQL Editor — there is no migration runner in this project.

## Admin Panel

`app/admin/page.jsx` (~4000 lines) is a single-file tabbed client component covering: Dashboard, Members, Cars, Applications, Contacts, Announcements, Events, Payments, and Tools. All data fetching is client-side via `useEffect` on tab mount with no pagination — the full dataset is loaded each time.

Admin API routes live under `app/api/admin/`. Every handler calls `requireAdmin()` at the top and uses `createAdminClient()` for DB access.
