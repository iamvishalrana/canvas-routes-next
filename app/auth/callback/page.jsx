'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

function Handler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') || '/members/reset-password'
    const errorParam = searchParams.get('error')

    if (errorParam) {
      router.replace(`/members/login?error=${encodeURIComponent(errorParam)}`)
      return
    }

    const supabase = createClient()

    if (code) {
      // Exchange the code client-side — browser client handles invite/reset OTP
      // codes without needing a stored PKCE code_verifier
      ;(async () => {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session?.access_token) {
          router.replace(`${next}?token=${encodeURIComponent(data.session.access_token)}`)
        } else {
          router.replace(`/members/login?error=${encodeURIComponent(error?.message || 'Link expired or already used.')}`)
        }
      })()
      return
    }

    // No code in URL — implicit flow: browser client reads hash tokens automatically
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
