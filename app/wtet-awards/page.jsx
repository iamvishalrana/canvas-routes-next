'use client'
import { useState } from 'react'
import { normalizeEmail } from '../../lib/normalizeEmail'
import { captureException } from '../../lib/sentry'
import { WTET_AWARD_CATEGORIES } from '../../lib/wtetAwardsContent'

const T = {
  en: {
    eyebrow: 'Whips to Eastern Townships',
    title: 'Route Awards',
    subtitle: "Cast your vote — winners get 50%, 25%, and 15% off the next route. You can't vote for yourself, and Jerry's disqualified — he's just here to hand out the prizes.",
    emailLabel: 'Your email', emailPlaceholder: 'you@email.com',
    gateBody: 'Enter the email you registered with.',
    enterBtn: 'Continue', checkingBtn: 'Checking…',
    notFoundError: "We couldn't find a registration matching that email.",
    invalidEmailError: 'Please enter a valid email address.',
    genericError: 'Something went wrong — please try again.',
    closedTitle: 'Voting isn\'t open yet',
    closedBody: "Check back soon — we'll open the ballot once it's time to vote.",
    pickLabel: 'Pick a car', submitBtn: 'Submit My Vote', submittingBtn: 'Submitting…', updateBtn: 'Update My Vote',
    successTitle: 'Your ballot is in!', successBody: 'You can come back and change your vote any time before voting closes.',
    votingAs: name => `Voting as ${name}`,
  },
  fr: {
    eyebrow: 'Whips to Eastern Townships',
    title: 'Prix de la Route',
    subtitle: "Votez — les gagnants reçoivent 50 %, 25 % et 15 % de rabais sur la prochaine route. Vous ne pouvez pas voter pour vous-même, et Jerry est disqualifié — il est seulement ici pour remettre les prix.",
    emailLabel: 'Votre courriel', emailPlaceholder: 'vous@courriel.com',
    gateBody: 'Entrez le courriel utilisé lors de votre inscription.',
    enterBtn: 'Continuer', checkingBtn: 'Vérification…',
    notFoundError: "Nous n'avons trouvé aucune inscription correspondant à ce courriel.",
    invalidEmailError: 'Veuillez entrer une adresse courriel valide.',
    genericError: 'Une erreur est survenue — veuillez réessayer.',
    closedTitle: "Le vote n'est pas encore ouvert",
    closedBody: 'Revenez bientôt — nous ouvrirons le vote quand ce sera le temps.',
    pickLabel: 'Choisissez une voiture', submitBtn: 'Soumettre Mon Vote', submittingBtn: 'Envoi…', updateBtn: 'Modifier Mon Vote',
    successTitle: 'Votre vote a été reçu!', successBody: 'Vous pouvez revenir modifier votre vote en tout temps avant la fermeture du vote.',
    votingAs: name => `Vous votez en tant que ${name}`,
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
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: 'clamp(2.5rem,8vw,4.5rem) 1.25rem 4rem' }}>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button onClick={() => setLang(l => l === 'en' ? 'fr' : 'en')} style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.3rem 0.75rem', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
            {lang === 'en' ? 'Français' : 'English'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
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
            <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c5a882', textAlign: 'center', marginBottom: '1.75rem' }}>
              {t.votingAs(verified.voterName)}
            </p>
            {WTET_AWARD_CATEGORIES.map(cat => (
              <div key={cat.id} style={{ background: '#fff', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.3rem', fontWeight: '500', color: '#0F1E14', margin: '0 0 0.5rem' }}>{cat[lang].label}</h2>
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.7', margin: '0 0 1rem' }}>{cat[lang].body}</p>
                <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '0.4rem' }}>{t.pickLabel}</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={picks[cat.id]}
                    onChange={e => setPicks(p => ({ ...p, [cat.id]: e.target.value }))}
                    required
                    style={{ ...inp, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
                  >
                    <option value="" disabled>—</option>
                    {verified.candidates.map(c => (
                      <option key={c.name} value={c.name}>{c.name} — {c.car}</option>
                    ))}
                  </select>
                  <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            ))}
            {submitError && <p style={{ fontSize: '12px', color: '#7B2032', margin: '0 0 1rem', textAlign: 'center' }}>{submitError}</p>}
            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '0.9rem', background: '#45643c', color: '#fff', border: 'none', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: '600', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.6 : 1, fontFamily: 'var(--font-inter), sans-serif' }}>
              {submitting ? t.submittingBtn : (verified.existingVote ? t.updateBtn : t.submitBtn)}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
