'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SiteFooter from './SiteFooter'

export default function PrivacyContent() {
  const router = useRouter()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{background:"#F5F1EC",minHeight:"100vh",fontFamily:"'Inter',sans-serif"}}>
      <nav style={{position:"sticky",top:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1rem 3rem",borderBottom:"0.5px solid rgba(0,0,0,0.12)",background:"#F5F1EC"}}>
        <a href="/" onClick={e => { e.preventDefault(); router.push('/') }}><img src="/canvas_routes_refined.png" alt="Canvas Routes" style={{height:"180px",width:"auto"}} /></a>
        <div style={{display:"flex",alignItems:"center",gap:"1.5rem"}}>
          <a href="/faq" style={{background:"none",border:"none",cursor:"pointer",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#888",textDecoration:"none"}}>FAQ</a>
          <button onClick={() => router.push('/')} style={{background:"none",border:"none",cursor:"pointer",fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#888",display:"flex",alignItems:"center",gap:"0.5rem",padding:0}}>
            ← Back
          </button>
        </div>
      </nav>
      <div style={{maxWidth:"720px",margin:"0 auto",padding:"4rem 2rem"}}>
        <div style={{fontSize:"11px",letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",marginBottom:"1rem"}}>Legal</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.8rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"0.5rem",lineHeight:"1.2"}}>Privacy Policy</div>
        <div style={{width:"40px",height:"1px",background:"#c5a882",margin:"1.5rem 0"}}></div>
        <div style={{fontSize:"12px",color:"#888",marginBottom:"3rem"}}>Last updated: June 2026</div>
        {[
          {
            title: "Who we are",
            body: "Canvas Routes is operated by Événements Canvas Routes Inc. / Canvas Routes Events Inc., a corporation incorporated in Quebec, Canada. We can be reached at info@canvasroutes.com. This Privacy Policy applies to the website canvasroutes.com and any services offered through it."
          },
          {
            title: "Privacy officer",
            body: "The person responsible for the protection of personal information at Événements Canvas Routes Inc. is the owner. For any privacy-related questions, requests, or concerns, please contact: info@canvasroutes.com. We will respond within 30 days."
          },
          {
            title: "What information we collect",
            body: "When you submit a membership application or event registration, we collect the following personal information: your full name, email address, date of birth (month and day, year optional), phone number (optional), Instagram handle (optional), the year, make, model, and colour of your vehicle, and any additional information you choose to share. For approved members, we may also collect and store photos and media you submit for your member profile or gallery. We collect payment card information through Stripe — we do not store raw card data ourselves."
          },
          {
            title: "How we use your information",
            body: "The information you provide is used solely to assess your membership application, process payments, communicate with you about Canvas Routes events and membership status, and send you relevant updates about our community. By submitting our forms, you consent to receive these communications. You may withdraw your consent at any time by contacting info@canvasroutes.com. We do not sell, rent, or share your personal information with any third parties for marketing purposes."
          },
          {
            title: "Who processes your data",
            body: "We use the following third-party services to operate Canvas Routes: Supabase (supabase.com) stores your personal information in a secure database, including membership applications, member profiles, and event registrations. Stripe (stripe.com) processes payment card information for membership fees and event registrations. Stripe handles, stores, and secures all payment card data on our behalf — we do not store raw card numbers. Resend (resend.com) delivers confirmation and notification emails. Meta Pixel (meta.com) collects anonymised behavioural data on our website to support advertising and analytics through Facebook and Instagram — this data is subject to Meta's own privacy policy and advertising practices. Cloudinary and Backblaze may be used in the future to store member-submitted photos and media. Upstash (upstash.com) provides rate limiting by temporarily storing your IP address to prevent abuse — this data is not linked to your identity and expires automatically. Vercel (vercel.com) hosts the website and processes all web requests — basic technical data including IP addresses may be processed for infrastructure and security purposes. All third-party services are engaged solely to operate Canvas Routes and are contractually restricted from using your personal data for purposes beyond what we have authorised."
          },
          {
            title: "Data transfers outside Quebec",
            body: "Your personal information is processed by third-party services based in the United States: Supabase, Inc. (database storage), Stripe, Inc. (payment processing), Resend, Inc. (email delivery), Meta Platforms, Inc. (advertising analytics), Upstash, Inc. (rate limiting), and Vercel, Inc. (website hosting and infrastructure). As a result, your personal information may be stored and processed outside of Quebec and Canada. Before using these services, we assessed that each provides a level of protection comparable to Quebec's privacy law requirements. By submitting our forms, you acknowledge that your information will be transferred to the United States for the purposes described in this policy."
          },
          {
            title: "Cookies & Analytics",
            body: "This website uses Google Analytics 4 and the Meta Pixel to collect anonymised usage data, including pages visited, time spent on site, and general location (country/city level). Google Analytics sets the following cookies: _ga (distinguishes users, expires after 2 years) and _ga_* (maintains session state, expires after 2 years). The Meta Pixel sets the _fbp cookie (identifies browsers, expires after 90 days) and may set _fbc if you arrive via a Facebook advertisement. No personally identifiable information is shared with Google or Meta. Analytics and advertising cookies are only set after you give consent using the banner on our site. You can change your cookie preference at any time using the 'Manage cookies' link at the bottom of any page. Basic technical cookies may also be set by our hosting provider (Vercel) for infrastructure and security purposes."
          },
          {
            title: "Your rights under Quebec Law 25",
            body: "As a Quebec resident, you have the following rights regarding your personal information: the right to access the personal information we hold about you; the right to request corrections to inaccurate information; the right to request deletion of your personal information; the right to data portability — to receive your personal information in a commonly used technological format; and the right to withdraw your consent to our use of your data at any time. To exercise any of these rights, contact us at info@canvasroutes.com and we will respond within 30 days."
          },
          {
            title: "Data retention",
            body: "We retain your personal information for as long as necessary to manage your membership application and communicate with you about Canvas Routes. If you request deletion of your data, we will remove it from our records within 30 days."
          },
          {
            title: "Security",
            body: "We take reasonable measures to protect your personal information. Our website is served over HTTPS, and data transmitted through our forms is encrypted in transit. Payment card data is handled exclusively by Stripe and subject to PCI-DSS compliance. However, no method of transmission over the internet is 100% secure."
          },
          {
            title: "Changes to this policy",
            body: "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. For material changes to how we collect or use your personal information, we will notify you directly by email if you have provided your contact information. For minor changes, we will update the date at the top of this page."
          },
          {
            title: "Contact",
            body: "If you have any questions about this Privacy Policy or how we handle your personal information, please contact us at info@canvasroutes.com."
          },
        ].map((s,i) => (
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
