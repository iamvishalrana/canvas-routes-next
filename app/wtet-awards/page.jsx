'use client'
import { useState } from 'react'
import Image from 'next/image'
import PageLoader from '../../components/PageLoader'
import { normalizeEmail } from '../../lib/normalizeEmail'
import { captureException } from '../../lib/sentry'
import { WTET_AWARD_CATEGORIES, CATEGORY_DISCOUNT_PCT } from '../../lib/wtetAwardsContent'

// Only the logo — candidate photos are multi-megabyte originals and aren't
// needed until after email verification, well after this loader is gone.
// Preloading them all upfront was flooding mobile connections and causing
// the email lookup fetch itself to fail (Sentry: TypeError "Load failed").
const PRELOAD_IMAGES = ['/canvas_routes_refined.png']

const T = {
  en: {
    eyebrow: 'Whips to Eastern Townships',
    title: 'Route Awards',
    subtitle: "Cast your vote for the route's best. You can't vote for yourself, and Jerry's disqualified — he's just here to hand out the prizes.",
    emailLabel: 'Your email', emailPlaceholder: 'you@email.com',
    gateBody: 'Enter the email you registered with.',
    enterBtn: 'Continue', checkingBtn: 'Checking…',
    notFoundError: "We couldn't find a registration matching that email.",
    invalidEmailError: 'Please enter a valid email address.',
    genericError: 'Something went wrong — please try again.',
    closedTitle: 'Voting isn\'t open yet',
    closedBody: "Check back soon — we'll open the ballot once it's time to vote.",
    pickLabel: 'Tap a car to vote', submitBtn: 'Submit My Vote', submittingBtn: 'Submitting…', updateBtn: 'Update My Vote',
    successTitle: 'Your ballot is in!', successBody: 'You can come back and change your vote any time before voting closes.',
    votingAs: name => `Voting as ${name}`,
    incompleteNote: 'Pick one car in each category to submit.',
    discountTag: pct => `Winner gets ${pct}% off the next route`,
    finishLater: 'Finish later',
  },
  fr: {
    eyebrow: 'Whips to Eastern Townships',
    title: 'Prix de la Route',
    subtitle: "Votez pour les meilleurs de la route. Vous ne pouvez pas voter pour vous-même, et Jerry est disqualifié — il est seulement ici pour remettre les prix.",
    emailLabel: 'Votre courriel', emailPlaceholder: 'vous@courriel.com',
    gateBody: 'Entrez le courriel utilisé lors de votre inscription.',
    enterBtn: 'Continuer', checkingBtn: 'Vérification…',
    notFoundError: "Nous n'avons trouvé aucune inscription correspondant à ce courriel.",
    invalidEmailError: 'Veuillez entrer une adresse courriel valide.',
    genericError: 'Une erreur est survenue — veuillez réessayer.',
    closedTitle: "Le vote n'est pas encore ouvert",
    closedBody: 'Revenez bientôt — nous ouvrirons le vote quand ce sera le temps.',
    pickLabel: 'Touchez une voiture pour voter', submitBtn: 'Soumettre Mon Vote', submittingBtn: 'Envoi…', updateBtn: 'Modifier Mon Vote',
    successTitle: 'Votre vote a été reçu!', successBody: 'Vous pouvez revenir modifier votre vote en tout temps avant la fermeture du vote.',
    votingAs: name => `Vous votez en tant que ${name}`,
    incompleteNote: 'Choisissez une voiture dans chaque catégorie pour soumettre.',
    discountTag: pct => `Le gagnant reçoit ${pct} % de rabais sur la prochaine route`,
    finishLater: 'Terminer plus tard',
  },
}

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '15px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box', borderRadius: '4px',
}

export default function WtetAwardsPage() {
  const [lang, setLang] = useState('en')
  const t = T[lang]

  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const [verified, setVerified] = useState(null) // { email, voterName, candidates, votingOpen, existingVote }

  const [picks, setPicks] = useState({ most_beautiful: '', best_driver: '', best_energy: '' })
  const allPicked = WTET_AWARD_CATEGORIES.every(cat => picks[cat.id])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

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
      const res = await fetch('/api/wtet-awards/lookup', {
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
      if (data.existingVote) {
        setPicks({
          most_beautiful: data.existingVote.most_beautiful || '',
          best_driver:    data.existingVote.best_driver || '',
          best_energy:    data.existingVote.best_energy || '',
        })
      }
      setChecking(false)
    } catch (err) {
      captureException(err, { context: 'wtet-awards-gate-lookup' })
      setErrMsg(t.genericError)
      setChecking(false)
    }
  }

  async function submitVote(e) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/wtet-awards/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verified.email, ...picks }),
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
      captureException(err, { context: 'wtet-awards-vote-submit' })
      setSubmitError(t.genericError)
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), sans-serif' }}>
      <PageLoader images={PRELOAD_IMAGES} minMs={1200} />

      {/* Language toggle */}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, display: 'flex', background: '#0F1E14', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        {['en', 'fr'].map(l => (
          <button key={l} onClick={() => setLang(l)} style={{ padding: '0.45rem 0.75rem', background: lang === l ? '#c5a882' : 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: lang === l ? '#0F1E14' : 'rgba(197,168,130,0.55)', fontWeight: lang === l ? '700' : '400', fontFamily: 'sans-serif', transition: 'all 0.15s ease' }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: 'clamp(2.5rem,8vw,4.5rem) 1.25rem 4rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{ width: '190px', margin: '0 auto 1.5rem', display: 'block', opacity: 0.94 }} />
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.75rem' }}>{t.eyebrow}</div>
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
            {errMsg && <p style={{ fontSize: '12px', color: '#7B2032', margin: '0 0 0.75rem' }}>{errMsg}</p>}
            <button type="submit" disabled={checking} style={{ width: '100%', padding: '0.85rem', background: '#45643c', color: '#fff', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: '600', cursor: checking ? 'wait' : 'pointer', opacity: checking ? 0.6 : 1, fontFamily: 'var(--font-inter), sans-serif' }}>
              {checking ? t.checkingBtn : t.enterBtn}
            </button>
          </form>
        ) : !verified.votingOpen ? (
          <div style={{ background: '#fff', padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', color: '#0F1E14', margin: '0 0 0.5rem' }}>{t.closedTitle}</p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{t.closedBody}</p>
          </div>
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
                {WTET_AWARD_CATEGORIES.map(cat => (
                  <div key={cat.id} style={{ width: '6px', height: '6px', borderRadius: '50%', background: picks[cat.id] ? '#45643c' : 'rgba(0,0,0,0.15)', transition: 'background 0.15s' }} />
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setVerified(null)}
                style={{ background: 'none', border: 'none', padding: '0.95rem 1rem', margin: '-0.95rem 0', fontSize: '11px', color: '#999', textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {t.finishLater}
              </button>
            </div>
            {WTET_AWARD_CATEGORIES.map((cat, catIdx) => (
              <div key={cat.id} style={{ background: '#fff', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #c5a882', color: '#c5a882', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '3px', fontFamily: 'var(--font-inter), sans-serif' }}>
                    {catIdx + 1}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.3rem', fontWeight: '500', color: '#0F1E14', margin: 0, lineHeight: '1.25' }}>{cat[lang].label}</h2>
                </div>
                <div style={{ marginBottom: '0.9rem' }}>
                  <span style={{ display: 'inline-block', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#45643c', border: '0.5px solid #45643c', borderRadius: '99px', padding: '3px 9px', fontWeight: '600' }}>
                    {t.discountTag(CATEGORY_DISCOUNT_PCT[cat.id])}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.7', margin: '0 0 1.1rem' }}>{cat[lang].body}</p>
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
                            <Image src={c.photo} alt={c.car} fill sizes="100px" quality={60} style={{ objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '100%', aspectRatio: '1', borderRadius: '7px', background: '#EDE8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13"/><path d="M3 13h18v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z"/><circle cx="7" cy="15" r="0.5"/><circle cx="17" cy="15" r="0.5"/></svg>
                          </div>
                        )}
                        <div style={{ fontSize: '10.5px', fontWeight: '600', color: '#1a1a1a', textAlign: 'center', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.car}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {submitError && <p style={{ fontSize: '12px', color: '#7B2032', margin: '0 0 1rem', textAlign: 'center' }}>{submitError}</p>}
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
