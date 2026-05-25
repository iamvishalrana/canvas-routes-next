'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TermsContent() {
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
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"2.8rem",fontWeight:"300",color:"#1a1a1a",marginBottom:"0.5rem",lineHeight:"1.2"}}>Terms & Conditions</div>
        <div style={{width:"40px",height:"1px",background:"#c5a882",margin:"1.5rem 0"}}></div>
        <div style={{fontSize:"12px",color:"#888",marginBottom:"3rem"}}>Last updated: May 2026</div>
        {[
          {
            title: "Acceptance of terms",
            body: "By submitting a membership application to Canvas Routes, you agree to be bound by these Terms & Conditions. If you do not agree, please do not submit an application."
          },
          {
            title: "Membership tiers",
            body: "Canvas Routes offers two membership tiers per season. Routes Member is $99 CAD per season and includes access to Canvas Routes events, road trips, and Cars & Coffee gatherings as described on the site. Inner Circle is $249 CAD per season and includes everything in Routes Member, with extended access through December and additional benefits as described on the site. The standard season runs June through November. Inner Circle membership extends through December."
          },
          {
            title: "Application & approval",
            body: "All membership applications are reviewed personally. Canvas Routes reserves the right to accept or decline any application at its sole discretion, for any reason or no reason. Submitting an application does not guarantee membership. You will be notified by email of the outcome of your application."
          },
          {
            title: "Payment",
            body: "Membership fees are due upon approval and confirmation of your application. All prices are in Canadian dollars (CAD). Payment instructions will be provided at the time of approval. Membership is not active until payment is received and confirmed."
          },
          {
            title: "Cancellations & refunds",
            body: "Membership fees are non-refundable once the season has begun. If you are approved but choose not to proceed before the season begins, please contact us as soon as possible at info@canvasroutes.com. If Canvas Routes cancels a membership without cause on its part, a prorated refund may be issued at our discretion based on the remaining portion of the season."
          },
          {
            title: "Member conduct",
            body: "Members are expected to treat other members, guests, and venues with respect at all times. Conduct that is unsafe, disrespectful, threatening, or otherwise damaging to the Canvas Routes community will not be tolerated. Canvas Routes reserves the right to revoke membership at any time, without refund, for conduct that violates these standards. This applies at events, on drives, and in any community spaces associated with Canvas Routes."
          },
          {
            title: "Events",
            body: "Event schedules, locations, and formats are subject to change without notice. Canvas Routes is not liable for road conditions, weather, traffic, mechanical failures, accidents, or any other circumstances beyond its control. Members who participate in road trips, drives, and other events do so entirely at their own risk. Canvas Routes does not organize racing or any illegal driving activity, and members are expected to obey all applicable traffic laws at all times."
          },
          {
            title: "Intellectual property",
            body: "Photos, videos, and other content produced by Canvas Routes may not be reproduced, shared commercially, or used without prior written permission. By attending Canvas Routes events, members consent to being photographed or filmed for community use, including on the Canvas Routes website and social media channels."
          },
          {
            title: "Limitation of liability",
            body: "Canvas Routes, its owner, organizers, and representatives are not liable for any personal injury, property damage, vehicle damage, or loss of any kind arising from participation in Canvas Routes events or activities. Members are solely responsible for maintaining appropriate vehicle insurance and ensuring their vehicle is roadworthy. Participation in all Canvas Routes activities is voluntary and at each member's own risk."
          },
          {
            title: "Governing law",
            body: "These Terms & Conditions are governed by and construed in accordance with the laws of the Province of Quebec and the laws of Canada applicable therein, without regard to conflict of law principles. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of the Province of Quebec."
          },
          {
            title: "Contact",
            body: "If you have any questions about these Terms & Conditions, please contact us at info@canvasroutes.com."
          },
        ].map((s,i) => (
          <div key={i} style={{marginBottom:"2.5rem"}}>
            <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#7B2032",marginBottom:"0.8rem"}}>{s.title}</div>
            <p style={{fontSize:"0.9rem",lineHeight:"1.9",color:"#555"}}>{s.body}</p>
          </div>
        ))}
        <div style={{borderTop:"0.5px solid rgba(0,0,0,0.1)",paddingTop:"2rem",marginTop:"2rem"}}>
          <p style={{fontSize:"11px",color:"#aaa"}}>© 2026 Canvas Routes. Montreal, QC. — info@canvasroutes.com</p>
          <a href="/faq" style={{fontSize:"10px",color:"#aaa",textDecoration:"none",letterSpacing:"0.03em",display:"inline-block",marginTop:"0.25rem"}}>FAQ</a>
          <button onClick={() => window.dispatchEvent(new Event('cookieConsentReset'))} style={{background:"none",border:"none",padding:0,fontSize:"11px",color:"#aaa",cursor:"pointer",fontFamily:"'Inter',sans-serif",marginTop:"0.5rem"}}>Manage cookies</button>
        </div>
      </div>
    </div>
  )
}
