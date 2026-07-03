'use client'
import { useState } from 'react'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import WtetWaiverSection from '../../../components/WtetWaiverSection'
import WtetLunchSection from '../../../components/WtetLunchSection'
import { WTET_WAIVER_TEXT, WTET_WAIVER_TEXT_FR } from '../../../lib/wtetRegistrationContent'
import { WTET_CHECKIN_T } from '../../../lib/wtetCheckinI18n'

const NAV_LINKS = [
  { href: '/',         label: 'Home' },
  { href: '/#events',  label: 'Events' },
  { href: '/#contact', label: 'Contact' },
  { href: '/faq',      label: 'FAQ' },
]

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const label = { display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }

function LangToggle({ lang, setLang }) {
  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 100, display: 'flex', background: '#0F1E14', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
      {['en', 'fr'].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: '0.45rem 0.75rem', background: lang === l ? '#c5a882' : 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: lang === l ? '#0F1E14' : 'rgba(197,168,130,0.55)', fontWeight: lang === l ? '700' : '400', fontFamily: 'sans-serif', transition: 'all 0.15s ease' }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export default function WtetMyRegistrationPage() {
  const [lang, setLang] = useState('en')
  const t = WTET_CHECKIN_T[lang]
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('gate') // gate | loading | found
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  async function lookup(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !email.includes('@')) { setError(t.invalidEmailError); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/wtet-registration/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || t.genericError); setStatus('gate'); return }
      setData(d)
      setStatus('found')
    } catch {
      setError(t.networkError)
      setStatus('gate')
    }
  }

  const firstName = data?.name?.trim().split(' ')[0] || ''
  const bothDone = data && !!data.waiver && !!data.lunch
  const waiverText = lang === 'fr' ? WTET_WAIVER_TEXT_FR : WTET_WAIVER_TEXT

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <SiteNav links={NAV_LINKS} />
      <LangToggle lang={lang} setLang={setLang} />
      <main style={{ maxWidth: '620px', margin: '0 auto', padding: '7rem 1.5rem 6rem' }}>

        {(status === 'gate' || status === 'loading') && (
          <>
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
                {t.eyebrow}
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
                {t.lookupTitle}
              </h1>
              <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>
                {t.lookupBody}
              </p>
              <p style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.7', margin: '0.85rem 0 0' }}>
                {t.lookupHint}
              </p>
            </div>
            <form onSubmit={lookup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '380px' }}>
              <div>
                <label style={label}>{t.emailLabel}</label>
                <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} style={inp} />
              </div>
              {error && <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.7rem 0.9rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{error}</div>}
              <button type="submit" disabled={status === 'loading'} style={{ alignSelf: 'flex-start', padding: '0.9rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
                {status === 'loading' ? t.lookingUpBtn : t.continueBtn}
              </button>
            </form>
          </>
        )}

        {status === 'found' && data && (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
                {t.dashEyebrow}
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
                {firstName ? t.hiName(firstName) : t.defaultTitle}
              </h1>
              <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
              {bothDone ? (
                <p style={{ fontSize: '14px', color: '#3B6B2F', lineHeight: '1.8', margin: 0 }}>{t.allDoneMsgWaiverLunch}</p>
              ) : (
                <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>{t.incompleteMsg}</p>
              )}
            </div>

            <WtetWaiverSection
              waiverText={waiverText}
              identifier={{ email: data.email }}
              waiver={data.waiver}
              carYear={data.carYear}
              carMake={data.carMake}
              carModel={data.carModel}
              lang={lang}
              onSaved={waiver => setData(prev => ({ ...prev, waiver }))}
            />
            <WtetLunchSection
              identifier={{ email: data.email }}
              lunch={data.lunch}
              lunchOptions={data.lunchOptions}
              lunchCutoff={data.lunchCutoff}
              lunchLocked={data.lunchLocked}
              lang={lang}
              onSaved={lunch => setData(prev => ({ ...prev, lunch }))}
            />

            <button onClick={() => { setStatus('gate'); setData(null); setEmail('') }} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '11px', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {t.lookupAgain}
            </button>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
