'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import PageLoader from '../../../components/PageLoader'
import { normalizeEmail } from '../../../lib/normalizeEmail'
import { captureException } from '../../../lib/sentry'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import { genericAwardsT } from '../../../lib/i18n/genericAwards'

// Only the logo — candidate photos are real uploaded car photos and aren't
// needed until after email verification, well after this loader is gone.
// (Same fix applied to /wtet-awards after a Sentry-reported "Load failed.")
const PRELOAD_IMAGES = ['/logo-color.svg']

function LangToggle({ lang, setLang }) {
  return (
    <div style={{ display: 'inline-flex', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '99px', overflow: 'hidden', marginBottom: '1.25rem' }}>
      {['en', 'fr'].map(l => (
        <button key={l} type="button" onClick={() => setLang(l)}
          style={{
            padding: '0.35rem 0.85rem', border: 'none', cursor: 'pointer',
            fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
            fontFamily: 'var(--font-inter), sans-serif', fontWeight: lang === l ? '600' : '400',
            background: lang === l ? '#0F1E14' : 'transparent', color: lang === l ? '#F5F1EC' : '#999',
          }}>
          {l}
        </button>
      ))}
    </div>
  )
}

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '15px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', borderRadius: '4px',
}

export default function EventAwardsPage() {
  const { eventId } = useParams()
  const { lang, setLang } = useLanguage()
  const t = genericAwardsT[lang]

  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const [verified, setVerified] = useState(null) // { email, voterName, candidates, categories, votingOpen, existingVote }

  const [picks, setPicks] = useState({})
  const categories = verified?.categories || []
  const allPicked = categories.length > 0 && categories.every(cat => picks[cat.id])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  function resetToGate() {
    setVerified(null)
    setEmail('')
    setErrMsg(null)
    setPicks({})
    setSubmitted(false)
    setSubmitError(null)
  }

  async function submitEmail(e) {
    e.preventDefault()
    setErrMsg(null)
    const entered = normalizeEmail(email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entered)) {
      setErrMsg(t.invalidEmailError)
      return
    }
    setChecking(true)
    try {
      const res = await fetch(`/api/awards/${eventId}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: entered }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrMsg(res.status === 404 ? (data.error || t.notFoundError) : (data.error || t.genericError))
        setChecking(false)
        return
      }
      setVerified({ email: entered, ...data })
      if (data.existingVote) setPicks(data.existingVote)
      setChecking(false)
    } catch (err) {
      captureException(err, { context: 'generic-awards-gate-lookup' })
      setErrMsg(t.genericError)
      setChecking(false)
    }
  }

  async function submitVote(e) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/awards/${eventId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verified.email, picks }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(data.error || t.genericError)
        setSubmitting(false)
        return
      }
      setSubmitted(true)
      setSubmitting(false)
    } catch (err) {
      captureException(err, { context: 'generic-awards-vote-submit' })
      setSubmitError(t.genericError)
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), sans-serif' }}>
      <PageLoader images={PRELOAD_IMAGES} minMs={1200} />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: 'clamp(2.5rem,8vw,4.5rem) 1.25rem 4rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo-color.svg" alt="Canvas Routes" style={{ width: '190px', margin: '0 auto 1.5rem', display: 'block', opacity: 0.94 }} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LangToggle lang={lang} setLang={setLang} />
          </div>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.75rem' }}>{verified?.eventName || t.eyebrow}</div>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.2rem,6vw,3rem)', fontWeight: '400', color: '#0F1E14', margin: '0 0 1rem', lineHeight: '1.1' }}>{t.title}</h1>
          <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.75', margin: 0, maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>{t.subtitle}</p>
        </div>

        {!verified ? (
          <form onSubmit={submitEmail} style={{ background: '#fff', padding: '1.75rem 1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '12.5px', color: '#888', margin: '0 0 1rem' }}>{t.gateBody}</p>
            <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '0.4rem' }}>{t.emailLabel}</label>
            <input
              type="email" inputMode="email" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              style={{ ...inp, marginBottom: '0.75rem' }}
            />
            {errMsg && <p style={{ fontSize: '12px', color: '#93333E', margin: '0 0 0.75rem' }}>{errMsg}</p>}
            <button type="submit" disabled={checking} style={{ width: '100%', padding: '0.85rem', background: '#45643c', color: '#fff', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: '600', cursor: checking ? 'wait' : 'pointer', opacity: checking ? 0.6 : 1, fontFamily: 'var(--font-inter), sans-serif' }}>
              {checking ? t.checkingBtn : t.enterBtn}
            </button>
          </form>
        ) : submitted ? (
          <div style={{ background: '#fff', padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', color: '#3B6B2F', margin: '0 0 0.5rem' }}>✓ {t.successTitle}</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 1.25rem' }}>{t.successBody}</p>
            <button onClick={() => setSubmitted(false)} style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.6rem 1.25rem', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
              {t.updateBtn}
            </button>
          </div>
        ) : (
          <form onSubmit={submitVote}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c5a882', margin: 0 }}>
                {t.votingAs(verified.voterName)}
              </p>
              <div style={{ display: 'flex', gap: '5px' }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ width: '6px', height: '6px', borderRadius: '50%', background: picks[cat.id] ? '#45643c' : 'rgba(0,0,0,0.15)', transition: 'background 0.15s' }} />
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={resetToGate}
                style={{ background: 'none', border: 'none', padding: '0.95rem 1rem', margin: '-0.95rem 0', fontSize: '11px', color: '#999', textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {t.finishLater}
              </button>
            </div>

            {categories.map((cat, catIdx) => (
              <div key={cat.id} style={{ background: '#fff', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #c5a882', color: '#c5a882', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '3px', fontFamily: 'var(--font-inter), sans-serif' }}>
                    {catIdx + 1}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.3rem', fontWeight: '500', color: '#0F1E14', margin: 0, lineHeight: '1.25' }}>{cat.label}</h2>
                </div>
                {typeof cat.discount_pct === 'number' && (
                  <div style={{ marginBottom: '0.9rem' }}>
                    <span style={{ display: 'inline-block', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#45643c', border: '0.5px solid #45643c', borderRadius: '99px', padding: '3px 9px', fontWeight: '600' }}>
                      {t.discountTag(cat.discount_pct)}
                    </span>
                  </div>
                )}
                {cat.body && <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.7', margin: '0 0 1.1rem' }}>{cat.body}</p>}
                <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '0.6rem' }}>{t.pickLabel}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem' }}>
                  {verified.candidates.map(c => {
                    const isSelected = picks[cat.id] === c.name
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setPicks(p => ({ ...p, [cat.id]: c.name }))}
                        aria-pressed={isSelected}
                        style={{
                          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                          padding: '0.5rem 0.35rem', background: isSelected ? 'rgba(197,168,130,0.14)' : '#fff',
                          border: isSelected ? '1.5px solid #c5a882' : '0.5px solid rgba(0,0,0,0.1)',
                          borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif',
                          WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                        }}
                      >
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', borderRadius: '50%', background: '#45643c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                        {c.photo ? (
                          <div style={{ width: '100%', aspectRatio: '1', borderRadius: '7px', position: 'relative', overflow: 'hidden', background: '#EDE8E1' }}>
                            <Image src={c.photo} alt={c.car || ''} fill sizes="100px" quality={60} style={{ objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '100%', aspectRatio: '1', borderRadius: '7px', background: '#EDE8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13"/><path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z"/><circle cx="7" cy="15" r="0.5"/><circle cx="17" cy="15" r="0.5"/></svg>
                          </div>
                        )}
                        <div style={{ fontSize: '10.5px', fontWeight: '600', color: '#1a1a1a', textAlign: 'center', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.car || c.name}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {submitError && <p style={{ fontSize: '12px', color: '#93333E', margin: '0 0 1rem', textAlign: 'center' }}>{submitError}</p>}
            {!allPicked && <p style={{ fontSize: '12px', color: '#999', margin: '0 0 1rem', textAlign: 'center' }}>{t.incompleteNote}</p>}
            <button type="submit" disabled={submitting || !allPicked} style={{ width: '100%', padding: '0.9rem', background: '#45643c', color: '#fff', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: '600', cursor: (submitting || !allPicked) ? 'not-allowed' : 'pointer', opacity: (submitting || !allPicked) ? 0.5 : 1, fontFamily: 'var(--font-inter), sans-serif' }}>
              {submitting ? t.submittingBtn : (verified.existingVote ? t.updateBtn : t.submitBtn)}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
