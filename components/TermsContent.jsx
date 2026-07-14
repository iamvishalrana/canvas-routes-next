'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SiteFooter from './SiteFooter'

export default function TermsContent() {
  const router = useRouter()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{background:"#F5F1EC",minHeight:"100vh",fontFamily:"'Inter',sans-serif"}}>
      <nav style={{position:"sticky",top:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"1rem 3rem",borderBottom:"0.5px solid rgba(0,0,0,0.12)",background:"#F5F1EC"}}>
        <a href="/" onClick={e => { e.preventDefault(); router.push('/') }}><img src="/logo-color.svg" alt="Canvas Routes" style={{height:"180px",width:"auto"}} /></a>
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
        <div style={{fontSize:"12px",color:"#888",marginBottom:"3rem"}}>Last updated: July 2026</div>
        {[
          {
            title: "Acceptance of terms",
            body: "By submitting a membership application, route registration, expression of interest in an upcoming route, notification-list signup, or any other form on Canvas Routes, you agree to be bound by these Terms & Conditions as issued by Événements Canvas Routes Inc. / Canvas Routes Events Inc., a corporation incorporated in Quebec, Canada. If you do not agree, please do not submit an application or registration."
          },
          {
            title: "Membership tiers",
            body: "Canvas Routes offers two membership tiers per season. Routes Member is $99 CAD per season and includes access to Canvas Routes events, routes, and Cars & Coffee gatherings as described on the site. Inner Circle is $249 CAD per season and includes everything in Routes Member, with extended access through November and additional benefits as described on the site. The standard season runs June through October. Inner Circle membership extends through November. Pricing is subject to change for future seasons."
          },
          {
            title: "Application & approval",
            body: "All membership applications are reviewed personally. Canvas Routes reserves the right to accept or decline any application at its sole discretion, for any reason or no reason. Submitting an application does not guarantee membership. You will be notified by email of the outcome of your application."
          },
          {
            title: "Payment",
            body: "Membership fees are processed through Stripe. When you complete checkout as part of your membership application, an authorization hold is placed on your card for the applicable membership fee — your card is not charged at that moment. If your application is approved, the held amount is captured and your membership begins. If your application is declined, the hold is released in full and no charge is made; depending on your bank, the hold may take a few business days to disappear from your statement. All prices are in Canadian dollars (CAD). Membership is not active until your application has been reviewed and approved by Canvas Routes. By submitting your card details, you authorize Événements Canvas Routes Inc. to place this hold and, upon approval, capture the applicable membership fee."
          },
          {
            title: "Cancellations & refunds",
            body: "Membership fees are non-refundable once your application has been approved and the season has begun. If your application is declined, a full refund is issued automatically. If you are approved but choose not to proceed before the season begins, contact us as soon as possible at info@canvasroutes.com. If Canvas Routes cancels a membership without cause on its part, a prorated refund may be issued at our discretion based on the remaining portion of the season."
          },
          {
            title: "Expressing interest in upcoming routes",
            body: "Our Routes page lists planned drives that launch once enough drivers have registered their interest. Expressing interest is free and is not a booking, reservation, or commitment of any kind — it signals that you would like to join, and no payment details are collected. Each planned route has a minimum interest threshold; when it is reached, Canvas Routes may launch the route and notify everyone on the interest list by email with full details, including the per-car fee and how to confirm a spot. Interest counts shown on the site are indicative only. Canvas Routes may modify, postpone, or withdraw any planned route at its discretion, including where the interest threshold is not met, and expressing interest does not guarantee that a route will run, that spots will be available, or that you will receive a spot. Members receive priority when spots are confirmed. Trip preferences you share when expressing interest are used to help plan the route and carry no obligation on either side."
          },
          {
            title: "Route fees",
            body: "Route participation fees vary by event and are stated on the individual event page or, for routes announced through the interest process, in the launch email — per-car fees are set for each route based on its length, planned stops, overnight stays, and logistics, and are always communicated before any payment is collected. Payment is collected at the time of registration. Route fees are non-refundable once your registration has been confirmed. If you are unable to attend after confirmation, you may transfer your spot to another eligible Canvas Routes member with prior written approval from info@canvasroutes.com. Canvas Routes reserves the right to cancel or reschedule any route due to weather, road conditions, or other circumstances beyond its control — in such cases, a full refund will be issued."
          },
          {
            title: "Member conduct",
            body: "Members are expected to treat other members, guests, and venues with respect at all times. Conduct that is unsafe, disrespectful, threatening, or otherwise damaging to the Canvas Routes community will not be tolerated. Canvas Routes reserves the right to revoke membership at any time, without refund, for conduct that violates these standards. This applies at events, on drives, and in any community spaces associated with Canvas Routes."
          },
          {
            title: "Events & waivers",
            body: "Event schedules, locations, and formats are subject to change without notice. A waiver of liability may be required at all Canvas Routes events, including routes, Cars & Coffee gatherings, and any other organized activity. By registering for or attending any Canvas Routes event, you agree to sign any waiver presented at the event. Members who participate in routes, drives, and other events do so entirely at their own risk. Canvas Routes does not organize racing or any illegal driving activity, and members are expected to obey all applicable traffic laws at all times."
          },
          {
            title: "Third party activities",
            body: "Some Canvas Routes events may include optional or suggested activities operated by independent third parties, including but not limited to Ziptrek Ecotours, Skyline Luge, restaurants, and other service providers. Participation in any third-party activity is entirely voluntary and subject to that provider's own terms, conditions, waivers, and safety rules. Événements Canvas Routes Inc. has no affiliation with, and accepts no liability for, any injury, loss, or damage arising from participation in activities organized or operated by third parties."
          },
          {
            title: "Food & beverage",
            body: "Canvas Routes events may include group dining at third-party restaurants and cafés. Événements Canvas Routes Inc. is not responsible for the quality, safety, or suitability of food or beverages served by any third-party establishment. Any dietary requirements, allergies, or food-related concerns are the sole responsibility of the individual member. Canvas Routes accepts no liability for any adverse reaction, illness, or loss arising from food or beverages consumed at third-party venues during Canvas Routes events."
          },
          {
            title: "Photo gallery",
            body: "As a Canvas Routes member, you may submit photos and media to be stored in your private member profile. Member-submitted photos are stored securely and are not shared publicly or with other members unless you explicitly choose to make them visible. Event photos taken by Canvas Routes organizers may be shared in the member gallery or on Canvas Routes social media channels. If you wish to have a specific photo removed, contact info@canvasroutes.com and it will be removed within 14 days."
          },
          {
            title: "Partner discounts",
            body: "Canvas Routes members may be offered promotional discounts or promo codes through our partner brands and sponsors. All partner discounts are subject to availability and may be modified, suspended, or withdrawn at any time by the partner or by Canvas Routes without notice. Promo codes are non-transferable and may be subject to additional terms set by the issuing partner. Canvas Routes makes no warranty or guarantee regarding the continued availability of any partner discount or the quality of partner products and services."
          },
          {
            title: "Intellectual property",
            body: "Photos, videos, and other content produced by Canvas Routes may not be reproduced, shared commercially, or used without prior written permission. By attending Canvas Routes events, members consent to being photographed or filmed for community use, including on the Canvas Routes website and social media channels."
          },
          {
            title: "Limitation of liability",
            body: "Événements Canvas Routes Inc., its directors, officers, organizers, and representatives are not liable for any personal injury, property damage, vehicle damage, or loss of any kind arising from participation in Canvas Routes events or activities, including routes, Cars & Coffee gatherings, or any other organized event. This limitation extends to injuries, losses, or damages arising from participation in third-party activities suggested or arranged in connection with Canvas Routes events, and to any adverse experience at third-party food and beverage establishments. Members are solely responsible for maintaining appropriate vehicle insurance and ensuring their vehicle is roadworthy. Participation in all Canvas Routes activities is voluntary and at each member's own risk."
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
            <div style={{fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#93333E",marginBottom:"0.8rem"}}>{s.title}</div>
            <p style={{fontSize:"0.9rem",lineHeight:"1.9",color:"#555"}}>{s.body}</p>
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  )
}
