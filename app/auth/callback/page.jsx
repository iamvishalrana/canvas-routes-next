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
    const errorParam = searchParams.get('error')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const code = searchParams.get('code')

    if (errorParam) {
      router.replace(`/members/login?error=${encodeURIComponent(errorParam)}`)
      return
    }

    // Format 1: ?token_hash=XXX&type=invite|recovery (newer Supabase OTP format)
    if (token_hash && type) {
      const supabase = createClient()
      supabase.auth.verifyOtp({ token_hash, type })
        .then(({ data, error }) => {
          if (!error && data.session?.access_token) {
            router.replace(`${next}?token=${encodeURIComponent(data.session.access_token)}`)
          } else {
            router.replace(`/members/login?error=${encodeURIComponent(error?.message || 'Link expired or already used.')}`)
          }
        })
      return
    }

    // Format 2: ?code=XXX (PKCE auth code)
    if (code) {
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

    // Format 3: #access_token=XXX in URL hash (implicit flow)
    // Read directly from window.location.hash — faster and more reliable than
    // waiting for onAuthStateChange which depends on Supabase client init timing.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const hashToken = hashParams.get('access_token')
    if (hashToken) {
      router.replace(`${next}?token=${encodeURIComponent(hashToken)}`)
      return
    }

    // Format 3b: wait for Supabase client to parse hash (fallback)
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
      const hashKeys = Array.from(hashParams.keys()).join(',')
      const queryKeys = Array.from(searchParams.keys()).join(',')
      router.replace(`/members/login?error=${encodeURIComponent(
        `No auth params found. Query: [${queryKeys}] Hash: [${hashKeys}]`
      )}`)
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
