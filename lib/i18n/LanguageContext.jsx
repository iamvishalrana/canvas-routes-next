'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext({ lang: 'en', setLang: () => {} })

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cr_lang')
      if (saved === 'fr' || saved === 'en') setLangState(saved)
    } catch {}
  }, [])

  function setLang(l) {
    setLangState(l)
    try { localStorage.setItem('cr_lang', l) } catch {}
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
