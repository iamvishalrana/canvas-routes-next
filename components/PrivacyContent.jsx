'use client'
import { useEffect } from 'react'
import SiteNav from './SiteNav'
import SiteFooter from './SiteFooter'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { legalChrome, privacyT } from '../lib/i18n/legal'

export default function PrivacyContent() {
  const { lang } = useLanguage()
  const c = legalChrome[lang]
  const t = privacyT[lang]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{background:"#F5F1EC",minHeight:"100vh",fontFamily:"'Inter',sans-serif"}}>
      <SiteNav />
      <div style={{maxWidth:"720px",margin:"0 auto",padding:"4rem 2rem"}}>
        <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>{c.eyebrow}</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.8rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"0.5rem",lineHeight:"1.2"}}>{t.pageTitle}</div>
        <div style={{width:"40px",height:"1px",background:"#c5a882",margin:"1.5rem 0"}}></div>
        <div style={{fontSize:"12px",color:"#888",marginBottom:"3rem"}}>{c.lastUpdated}</div>
        {t.sections.map((s,i) => (
          <div key={i} style={{marginBottom:"2.5rem"}}>
            <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#93333E",marginBottom:"0.8rem"}}>{s.title}</div>
            <p style={{fontSize:"0.9rem",lineHeight:"1.9",color:"#555"}}>{s.body}</p>
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  )
}
