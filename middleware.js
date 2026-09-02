import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { isAdminUser } from './lib/adminAccess.js'
import { createAdminClient } from './lib/supabase/admin.js'
import { isReservedSlug } from './lib/reservedSlugs.js'
import { readSession } from './lib/otp.js'
import { ADMIN_MFA_COOKIE_NAME } from './lib/adminMfa.js'

// lib/otp.js pulls in Node's `crypto` (randomBytes etc.) — not available
// under the default Edge runtime, so this middleware opts into Node.js
// Middleware (supported since Next 15) to reuse it for the admin two-factor
// session check below rather than duplicating OTP-session logic edge-safe.
export const runtime = 'nodejs'

// In-memory cache of events.slug -> id, so a bare short-link path (e.g.
// /ccsept5-2026) doesn't cost a DB round trip on every request — refreshed
// at most once every 60s. This is a pure perf optimization: a cold/expired
// cache just means the next lookup re-fetches, correctness never depends on
// it, and each middleware instance keeps its own copy (fine at this scale).
let eventSlugCache = null // { map: Map<string,string>, expiresAt: number }

async function resolveEventSlug(slug) {
  const now = Date.now()
  if (!eventSlugCache || now > eventSlugCache.expiresAt) {
    try {
      const admin = createAdminClient()
      const { data, error } = await admin.from('events').select('id, slug').not('slug', 'is', null)
      if (error) return null // e.g. migration not run yet — retry next request, don't cache a false "no slugs" result
      const map = new Map((data || []).map(e => [e.slug, e.id]))
      eventSlugCache = { map, expiresAt: now + 60_000 }
    } catch {
      // DB unreachable — don't cache a failure, and don't block the
      // request. The path just falls through to Next's normal routing
      // (404 for a real short link is a much smaller problem than every
      // request failing because this lookup errored).
      return null
    }
  }
  return eventSlugCache.map.get(slug) || null
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // '/:slug' in the matcher below now also invokes middleware for every
  // bare single-segment public page (e.g. /wtet, /faq) that never used to
  // reach it at all — those must short-circuit here with a plain next(),
  // not fall through into the Supabase auth/session block further down.
  // That block does a real getUser() network call, which would otherwise
  // run on every visit to every public single-segment page for no reason
  // (bare /admin and /members are excluded from this fast path since they
  // legitimately need that block's redirect-if-unauthenticated behavior).
  if (/^\/[^/]+$/.test(pathname) && !pathname.includes('.') && pathname !== '/admin' && pathname !== '/members') {
    const slug = pathname.slice(1)
    if (!isReservedSlug(slug)) {
      const eventId = await resolveEventSlug(slug)
      if (eventId) return NextResponse.rewrite(new URL(`/meet/${eventId}`, request.url))
    }
    return NextResponse.next()
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const p = request.nextUrl.pathname
    if (p.startsWith('/admin') && p !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (p.startsWith('/members') && p !== '/members/login') {
      return NextResponse.redirect(new URL('/members/login', request.url))
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLogin = pathname === '/members/login'
  const isAdminLogin = pathname === '/admin/login'
  const isReset = pathname.startsWith('/members/reset-password')
  const isApiAdmin = pathname.startsWith('/api/admin')
  const isApiMember = pathname.startsWith('/api/member')
  // pathname.startsWith('/admin') does NOT match '/api/admin/...' — the two
  // API prefixes must be checked explicitly or they pass through unauthenticated,
  // relying entirely on each route's own requireAdmin() call as the only gate.
  const isMembers = (pathname.startsWith('/members') && !isLogin && !isReset) || isApiMember
  const isAdmin = (pathname.startsWith('/admin') && !isAdminLogin) || isApiAdmin
  const isAdminMfaChallenge = pathname === '/admin/mfa-challenge'
  const isAdminMfaApi = pathname.startsWith('/api/admin/mfa')

  if (isLogin && user) {
    return NextResponse.redirect(new URL('/members/dashboard', request.url))
  }
  if (isAdminLogin && user) {
    // Already signed in — admins go to the dashboard, everyone else to the portal
    return NextResponse.redirect(new URL(isAdminUser(user) ? '/admin/dashboard' : '/members/dashboard', request.url))
  }

  if ((isMembers || isAdmin) && !user) {
    if (isApiAdmin || isApiMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    // Admin pages get the admin login — it lives inside the /admin segment so
    // the CR Admin PWA metadata is present wherever Add to Home Screen happens
    url.pathname = pathname.startsWith('/admin') ? '/admin/login' : '/members/login'
    return NextResponse.redirect(url)
  }

  if (isAdmin && user) {
    if (!isAdminUser(user)) {
      if (isApiAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL('/members/dashboard', request.url))
    }
    // Self-serve two-factor (Settings → Security). Never touches the shared
    // /api/auth/login route — this is a post-login gate only, and it exempts
    // the challenge page/API themselves so a not-yet-verified admin can
    // actually reach and complete the challenge.
    if (user.app_metadata?.mfa_enabled && !isAdminMfaChallenge && !isAdminMfaApi) {
      const cookieVal = request.cookies.get(ADMIN_MFA_COOKIE_NAME)?.value
      const verifiedEmail = cookieVal ? await readSession(user.id, cookieVal) : null
      if (!verifiedEmail || verifiedEmail !== user.email) {
        if (isApiAdmin) return NextResponse.json({ error: 'MFA required' }, { status: 401 })
        const url = request.nextUrl.clone()
        url.pathname = '/admin/mfa-challenge'
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  // CSRF defense-in-depth: reject cross-site mutating requests to admin AND
  // member API routes. Only blocks when Origin is present AND clearly
  // mismatched — never blocks same-origin requests or requests that omit the
  // header entirely.
  if ((isApiAdmin || isApiMember) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin')
    if (origin) {
      try {
        if (new URL(origin).host !== request.nextUrl.host) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } catch {}
    }
  }

  return supabaseResponse
}

export const config = {
  // '/:slug' additionally matches every bare single-segment path (e.g.
  // /ccsept5-2026, but not /routes/into-the-laurentians) so event short
  // links can resolve without a deploy. It also matches bare /admin and
  // /members — those two are excluded by exact-pathname checks inside the
  // function so they still fall through to the existing logic below
  // unchanged; every other single-segment path short-circuits before ever
  // reaching that logic.
  matcher: ['/members/:path*', '/admin/:path*', '/api/admin/:path*', '/api/member/:path*', '/:slug'],
}
