import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
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
  const isMembers = pathname.startsWith('/members') && !isLogin && !isReset
  const isAdmin = pathname.startsWith('/admin')

  if (isLogin && user) {
    return NextResponse.redirect(new URL('/members/dashboard', request.url))
  }

  if ((isMembers || isAdmin) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/members/login'
    return NextResponse.redirect(url)
  }

  if (isAdmin && user) {
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    if (!adminEmails.includes(user.email)) {
      return NextResponse.redirect(new URL('/members/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/members/:path*', '/admin/:path*'],
}
