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

1. `POST /api/stripe/create-payment-intent` — creates a PaymentIntent, returns `clientSecret`
2. Client renders Stripe `Elements` with the `clientSecret`
3. `POST /api/stripe/apply-promo` — validates a Stripe promotion code and updates the PaymentIntent amount in-place
4. `confirmPayment()` — Stripe handles the charge
5. `POST /api/membership-waitlist` — saves application to DB + sends Resend emails (confirmation to applicant, notification to admin)
6. `POST /api/stripe/webhook` — Stripe confirms payment server-side, updates `applications` row with Stripe fields

Webhook signature is verified via `STRIPE_WEBHOOK_SECRET`. Never trust payment status from the client.

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
