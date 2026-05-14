'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

function Handler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get('next') || '/members/reset-password'
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      router.replace(`/members/login?error=${encodeURIComponent(errorParam)}`)
      return
    }

    if (code) {
      // PKCE redirect: use a direct REST call that omits code_verifier entirely.
      // The JS SDK sends code_verifier:"" which Supabase rejects for admin-initiated
      // invite/reset codes. Omitting the field lets Supabase accept them without one.
      fetch(`/api/auth/exchange?code=${encodeURIComponent(code)}`)
        .then(r => r.json())
        .then(data => {
          if (data.token) {
            router.replace(`${next}?token=${encodeURIComponent(data.token)}`)
          } else {
            router.replace(`/members/login?error=${encodeURIComponent(data.error || 'Link expired or already used.')}`)
          }
        })
        .catch(() => router.replace('/members/login?error=Something+went+wrong.'))
      return
    }

    // No code in URL — implicit flow: Supabase puts tokens in the URL hash.
    // The browser Supabase client reads the hash automatically.
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session?.access_token) {
        subscription.unsubscribe()
        clearTimeout(timeout)
        router.replace(`${next}?token=${encodeURIComponent(session.access_token)}`)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        subscription.unsubscribe()
        clearTimeout(timeout)
        router.replace(`${next}?token=${encodeURIComponent(session.access_token)}`)
      }
    })

    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/members/login?error=Link+expired+or+already+used.')
    }, 10000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  return null
}

export default function CallbackPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter),sans-serif' }}>
      <Suspense>
        <Handler />
      </Suspense>
      <div style={{ fontSize: '12px', color: 'rgba(245,241,236,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        Verifying link…
      </div>
    </div>
  )
}
