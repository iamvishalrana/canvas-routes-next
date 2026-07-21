'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SiteFooter from './SiteFooter'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { legalChrome, termsT } from '../lib/i18n/legal'

export default function TermsContent() {
  const router = useRouter()
  const { lang } = useLanguage()
  const c = legalChrome[lang]
  const t = termsT[lang]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{background:"#F5F1EC",minHeight:"100vh",fontFamily:"'Inter',sans-serif"}}>
      <nav style={{position:"sticky",top:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1rem 3rem",borderBottom:"0.5px solid rgba(0,0,0,0.12)",background:"#F5F1EC"}}>
        <a href="/" onClick={e => { e.preventDefault(); router.push('/') }}><img src="/logo-color.svg" alt="Canvas Routes" style={{height:"180px",width:"auto"}} /></a>
        <div style={{display:"flex",alignItems:"center",gap:"1.5rem"}}>
          <a href="/faq" style={{background:"none",border:"none",cursor:"pointer",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#888",textDecoration:"none"}}>{c.faq}</a>
          <button onClick={() => router.push('/')} style={{background:"none",border:"none",cursor:"pointer",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#888",display:"flex",alignItems:"center",gap:"0.5rem",padding:0}}>
            {c.back}
          </button>
        </div>
      </nav>
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
