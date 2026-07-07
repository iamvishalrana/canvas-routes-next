import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (request.nextUrl.pathname.startsWith('/members') || request.nextUrl.pathname.startsWith('/admin')) {
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
  const { pathname } = request.nextUrl

  const isLogin = pathname === '/members/login'
  const isReset = pathname.startsWith('/members/reset-password')
  const isApiAdmin = pathname.startsWith('/api/admin')
  const isApiMember = pathname.startsWith('/api/member')
  // pathname.startsWith('/admin') does NOT match '/api/admin/...' — the two
  // API prefixes must be checked explicitly or they pass through unauthenticated,
  // relying entirely on each route's own requireAdmin() call as the only gate.
  const isMembers = (pathname.startsWith('/members') && !isLogin && !isReset) || isApiMember
  const isAdmin = pathname.startsWith('/admin') || isApiAdmin

  if (isLogin && user) {
    return NextResponse.redirect(new URL('/members/dashboard', request.url))
  }

  if ((isMembers || isAdmin) && !user) {
    if (isApiAdmin || isApiMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/members/login'
    return NextResponse.redirect(url)
  }

  if (isAdmin && user) {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    if (!adminEmails.includes(user.email)) {
      if (isApiAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      return NextResponse.redirect(new URL('/members/dashboard', request.url))
    }
  }

  // CSRF defense-in-depth: reject cross-site mutating requests to admin API
  // routes. Only blocks when Origin is present AND clearly mismatched — never
  // blocks same-origin requests or requests that omit the header entirely.
  if (isApiAdmin && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
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
  matcher: ['/members/:path*', '/admin/:path*', '/api/admin/:path*', '/api/member/:path*'],
}
