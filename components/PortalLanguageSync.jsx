'use client'
import { useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'

// The member's own stored language (set from the buried Settings section on
// their profile) is the source of truth for the portal — it must win over
// whatever's in localStorage from anonymous browsing on the same device, and
// it must apply on every device they log in from. Syncing it into the same
// global LanguageContext the rest of the site already uses (rather than a
// separate context) means shared client components already wired to
// useLanguage() — e.g. UpcomingRoadtrips on /members/routes — pick it up for
// free with no changes there. This runs once per portal layout mount (Next
// layouts persist across child navigations), not on every page change.
export default function PortalLanguageSync({ lang }) {
  const { setLang } = useLanguage()
  useEffect(() => {
    if (lang === 'en' || lang === 'fr') setLang(lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])
  return null
}
