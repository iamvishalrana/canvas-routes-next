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
