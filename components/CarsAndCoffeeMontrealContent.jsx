'use client'
import Link from 'next/link'
import SiteNav from './SiteNav'
import SiteFooter from './SiteFooter'
import FadeUp from './FadeUp'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { carsAndCoffeeMontrealT } from '../lib/i18n/carsAndCoffeeMontreal'

const SECTION_LIGHT = { background: '#F5F1EC', padding: 'clamp(3.5rem,8vw,6rem) 1.5rem' }
const SECTION_TAUPE = { background: '#EDE8E1', padding: 'clamp(3.5rem,8vw,6rem) 1.5rem' }
const INNER = { maxWidth: '760px', margin: '0 auto' }
const EYEBROW = { fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem', fontFamily: 'var(--font-inter), sans-serif' }
const H2 = { fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.15, margin: '0 0 1.5rem', letterSpacing: '-0.01em' }
const BODY = { fontSize: '15px', color: '#555', lineHeight: 1.9, letterSpacing: '0.01em', margin: '0 0 1.1rem' }

export default function CarsAndCoffeeMontrealContent() {
  const { lang } = useLanguage()
  const t = carsAndCoffeeMontrealT[lang]

  const steps = [
    { title: t.step1Title, body: t.step1Body },
    { title: t.step2Title, body: t.step2Body },
    { title: t.step3Title, body: t.step3Body },
    { title: t.step4Title, body: t.step4Body },
  ]
  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
  ]

  return (
    <>
      <SiteNav />

      {/* Hero */}
      <section style={{
        background: '#0F1E14', padding: 'clamp(140px,18vw,190px) 1.5rem 5rem', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />
        <FadeUp>
          <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '1.2rem', fontFamily: 'var(--font-inter), sans-serif' }}>
            {t.eyebrow}
          </div>
        </FadeUp>
        <FadeUp delay={100}>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(2.6rem,6vw,4.2rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.08, letterSpacing: '-0.01em', margin: '0 0 1.1rem' }}>
            {t.h1}
          </h1>
        </FadeUp>
        <FadeUp delay={180}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.1rem,2.6vw,1.4rem)', fontStyle: 'italic', color: 'rgba(245,241,236,0.82)', marginBottom: '1.5rem' }}>
            {t.heroItalic}
          </div>
        </FadeUp>
        <FadeUp delay={260}>
          <p style={{ fontSize: '15px', color: 'rgba(245,241,236,0.6)', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.85, fontFamily: 'var(--font-inter), sans-serif' }}>
            {t.heroBody}
          </p>
        </FadeUp>
        <FadeUp delay={340}>
          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/notify" style={{ display: 'inline-block', padding: '0.9rem 2rem', background: '#F5F1EC', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif', fontWeight: '600' }}>
              {t.ctaNotify}
            </Link>
            <Link href="/membership" style={{ display: 'inline-block', padding: '0.9rem 2rem', background: 'transparent', color: '#F5F1EC', border: '0.5px solid rgba(245,241,236,0.35)', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
              {t.ctaMembership}
            </Link>
          </div>
        </FadeUp>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)' }} />
      </section>

      {/* What it is */}
      <section style={SECTION_LIGHT}>
        <div style={INNER}>
          <FadeUp>
            <div style={EYEBROW}>{t.eyebrow}</div>
            <h2 style={H2}>{t.whatTitle}</h2>
            <p style={BODY}>{t.whatBody1}</p>
            <p style={{ ...BODY, marginBottom: 0 }}>{t.whatBody2}</p>
          </FadeUp>
        </div>
      </section>

      {/* How it works */}
      <section style={SECTION_TAUPE}>
        <div style={INNER}>
          <FadeUp>
            <h2 style={H2}>{t.howTitle}</h2>
            <p style={{ ...BODY, marginBottom: '2.5rem' }}>{t.howIntro}</p>
          </FadeUp>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {steps.map((s, i) => (
              <FadeUp key={i} delay={i * 80}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: '30px', height: '30px', borderRadius: '50%',
                    border: '0.5px solid rgba(197,168,130,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '13px', color: '#c5a882',
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.35rem', fontFamily: 'var(--font-inter), sans-serif' }}>{s.title}</div>
                    <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.8, fontFamily: 'var(--font-inter), sans-serif' }}>{s.body}</div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* What kind of cars */}
      <section style={SECTION_LIGHT}>
        <div style={INNER}>
          <FadeUp>
            <h2 style={H2}>{t.carsTitle}</h2>
            <p style={{ ...BODY, marginBottom: 0 }}>{t.carsBody}</p>
          </FadeUp>
        </div>
      </section>

      {/* FAQ */}
      <section style={SECTION_TAUPE}>
        <div style={INNER}>
          <FadeUp>
            <h2 style={H2}>{t.faqTitle}</h2>
          </FadeUp>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {faqs.map((f, i) => (
              <FadeUp key={i} delay={i * 70}>
                <div style={{ padding: '1.4rem 0', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.5rem', fontFamily: 'var(--font-inter), sans-serif' }}>{f.q}</div>
                  <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.8, fontFamily: 'var(--font-inter), sans-serif' }}>{f.a}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTAs */}
      <section style={{ background: '#0F1E14', padding: 'clamp(3.5rem,8vw,5.5rem) 1.5rem' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <FadeUp>
            <div style={{ border: '0.5px solid rgba(197,168,130,0.25)', padding: '2rem', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.6rem' }}>{t.ctaTitle}</div>
              <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.55)', lineHeight: 1.8, marginBottom: '1.5rem' }}>{t.ctaBody}</p>
              <Link href="/notify" style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
                {t.ctaNotifyBtn}
              </Link>
            </div>
          </FadeUp>
          <FadeUp delay={100}>
            <div style={{ border: '0.5px solid rgba(197,168,130,0.25)', padding: '2rem', height: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.6rem' }}>{t.ctaMemberTitle}</div>
              <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.55)', lineHeight: 1.8, marginBottom: '1.5rem' }}>{t.ctaMemberBody}</p>
              <Link href="/membership" style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}>
                {t.ctaMemberBtn}
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
