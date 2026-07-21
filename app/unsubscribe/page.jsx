'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { unsubscribeT } from '../../lib/i18n/unsubscribe'

function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display: 'inline-flex', border: '0.5px solid rgba(197,168,130,0.3)', borderRadius: '99px', overflow: 'hidden', marginBottom: '1.25rem' }}>
      {['en', 'fr'].map(l => (
        <button key={l} type="button" onClick={() => setLang(l)}
          style={{
            padding: '0.35rem 0.85rem', border: 'none', cursor: 'pointer',
            fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
            fontFamily: 'var(--font-inter),sans-serif', fontWeight: lang === l ? '600' : '400',
            background: lang === l ? '#c5a882' : 'transparent', color: lang === l ? '#0F1E14' : 'rgba(245,241,236,0.5)',
          }}>
          {l}
        </button>
      ))}
    </div>
  )
}

function UnsubscribeContent() {
  const params = useSearchParams()
  const email = params.get('email') || ''
  const { lang, setLang } = useLanguage()
  const t = unsubscribeT[lang]
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [alreadyDone, setAlreadyDone] = useState(false)

  useEffect(() => {
    if (!email) return
    fetch(`/api/unsubscribe?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => { if (d.unsubscribed) setAlreadyDone(true) })
      .catch(() => {})
  }, [email])

  async function handleUnsubscribe() {
    setStatus('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const LABEL = { fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '1rem' }
  const BODY  = { fontSize: '14px', lineHeight: '1.8', color: 'rgba(245,241,236,0.6)', fontFamily: 'var(--font-inter),sans-serif' }
  const EMAIL_STRONG = { color: 'rgba(245,241,236,0.8)', fontWeight: '400' }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536} style={{ width: '100px', height: 'auto', opacity: 0.85 }} />
        </Link>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ width: '28px', height: '1px', background: '#c5a882', marginBottom: '1.5rem' }} />

          {!email ? (
            <>
              <div style={LABEL}>{t.unsubscribeLabel}</div>
              <p style={BODY}>{t.invalidLink}</p>
            </>
          ) : status === 'done' || alreadyDone ? (
            <>
              <div style={LABEL}>{t.canvasRoutes}</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>
                {alreadyDone && status !== 'done' ? t.alreadyUnsubscribedTitle : t.unsubscribedTitle}
              </h1>
              <p style={BODY}>
                {email && <><strong style={EMAIL_STRONG}>{email}</strong> {t.removedFromListAfterEmail}</>}
                {' '}{t.wontReceiveBroadcast}
              </p>
              <p style={{ ...BODY, marginTop: '0.75rem', fontSize: '13px', color: 'rgba(245,241,236,0.35)' }}>
                {t.changedMind}
              </p>
            </>
          ) : status === 'error' ? (
            <>
              <div style={LABEL}>{t.errorTitle}</div>
              <p style={BODY}>{t.errorBody}</p>
              <button
                onClick={handleUnsubscribe}
                style={{ marginTop: '1.25rem', padding: '0.85rem 2rem', background: 'transparent', border: '1px solid rgba(197,168,130,0.4)', color: '#c5a882', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
              >
                {t.tryAgain}
              </button>
            </>
          ) : (
            <>
              <div style={LABEL}>{t.canvasRoutes}</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>
                {t.confirmTitle}
              </h1>
              <p style={BODY}>
                {email
                  ? <><strong style={EMAIL_STRONG}>{email}</strong> {t.confirmBodyAfterEmail}</>
                  : t.confirmBodyNoEmail}
              </p>
              <p style={{ ...BODY, marginTop: '0.5rem', fontSize: '13px', color: 'rgba(245,241,236,0.35)' }}>
                {t.transactionalNote}
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleUnsubscribe}
                  disabled={status === 'loading'}
                  style={{ padding: '0.85rem 2rem', background: '#c5a882', border: 'none', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', fontWeight: '600', opacity: status === 'loading' ? 0.7 : 1 }}
                >
                  {status === 'loading' ? t.unsubscribing : t.yesUnsubscribe}
                </button>
                <Link href="/" style={{ padding: '0.85rem 2rem', border: '1px solid rgba(197,168,130,0.25)', color: 'rgba(245,241,236,0.4)', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif', display: 'inline-block' }}>
                  {t.cancel}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '1.25rem 2rem', borderTop: '0.5px solid rgba(197,168,130,0.08)', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.2)', margin: 0 }}>{t.footer}</p>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}
