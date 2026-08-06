'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'

const TEXT = {
  en: { pre: 'By submitting, you agree to our', terms: 'Terms', and: '&', privacy: 'Privacy Policy' },
  fr: { pre: 'En soumettant, vous acceptez nos', terms: 'Modalités et conditions', and: 'et notre', privacy: 'Politique de confidentialité' },
}

// Passive consent line (no checkbox) for every form that collects personal
// info but is too lightweight to warrant the membership flow's required
// checkbox — most of the site's forms had no Terms/Privacy link at all
// before this. `dark` picks the on-dark-background color variant.
export default function TermsPrivacyNote({ dark = false, style }) {
  const { lang } = useLanguage()
  const t = TEXT[lang] || TEXT.en
  const color = dark ? 'rgba(245,241,236,0.4)' : '#bbb'
  const linkColor = dark ? 'rgba(245,241,236,0.65)' : '#888'
  return (
    <div style={{ fontSize: '10px', color, textAlign: 'center', lineHeight: 1.6, ...style }}>
      {t.pre}{' '}
      <a href="/terms" style={{ color: linkColor, textDecoration: 'underline', textUnderlineOffset: '2px' }}>{t.terms}</a>
      {' '}{t.and}{' '}
      <a href="/privacy" style={{ color: linkColor, textDecoration: 'underline', textUnderlineOffset: '2px' }}>{t.privacy}</a>.
    </div>
  )
}
