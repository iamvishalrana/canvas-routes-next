import FAQContent from '../../components/FAQContent'

export const metadata = {
  title: { absolute: 'FAQ | Canvas Routes' },
  description: "Frequently asked questions about Canvas Routes — Montreal's car community. Cars and Coffee events, road trips from Montreal, scenic drives through the Laurentians and Eastern Townships, membership, and more.",
  keywords: 'Canvas Routes FAQ, car club Montreal, road trips from Montreal, cars and coffee Montreal, automotive community Montreal, Laurentians road trip, Eastern Townships drive, car meets Quebec, scenic drives Quebec',
  alternates: { canonical: 'https://canvasroutes.com/faq' },
  openGraph: {
    type: 'website',
    siteName: 'Canvas Routes',
    title: 'FAQ | Canvas Routes',
    description: "Frequently asked questions about Canvas Routes — Montreal's car community. Cars and Coffee, road trips, scenic drives and membership.",
    url: 'https://canvasroutes.com/faq',
    images: [{ url: 'https://canvasroutes.com/faq-page.jpeg', width: 1200, height: 630, alt: 'Canvas Routes — Montreal Automotive Community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ | Canvas Routes',
    description: "Frequently asked questions about Canvas Routes — Montreal's car community.",
    images: ['https://canvasroutes.com/faq-page.jpeg'],
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Canvas Routes?',
      acceptedAnswer: { '@type': 'Answer', text: 'Canvas Routes is a Montreal-based car community built around curated road trips, scenic convoy drives, and invite-only Cars and Coffee events across Quebec, Ontario, Vermont, Maine, New York and beyond. We organize road trips through the Laurentians, Eastern Townships, Charlevoix and further afield, including overnight adventures. The passion for the road matters more than the badge on your car, though we do maintain a performance and luxury standard across all our events.' },
    },
    {
      '@type': 'Question',
      name: 'Who is Canvas Routes for?',
      acceptedAnswer: { '@type': 'Answer', text: 'Anyone who genuinely loves to drive. Not to be seen, not to park and pose — but to actually get out and experience the road. Our community brings together car enthusiasts of all backgrounds who share a respect for the drive, the machine, and the people around them. Based in Montreal, open to drivers across Quebec and beyond.' },
    },
    {
      '@type': 'Question',
      name: 'Are you a car club?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes — a car club built around the drivers. Cars are the common thread, but the real heart of Canvas Routes is the person behind the wheel. Someone who chose their car with intention and would rather be out on the road than standing next to it. If that sounds like you, you belong here.' },
    },
    {
      '@type': 'Question',
      name: 'Where are you based?',
      acceptedAnswer: { '@type': 'Answer', text: 'Montreal, Quebec. All current events depart from Montreal or the greater Montreal area. We organize road trips through the Laurentians, Eastern Townships, Charlevoix, and further destinations including Nova Scotia. We are a young and growing community with ambitions that stretch across Quebec, Ontario, Vermont, Maine, New York and beyond.' },
    },
    {
      '@type': 'Question',
      name: 'How do I stay updated on upcoming events?',
      acceptedAnswer: { '@type': 'Answer', text: 'Follow us on Instagram @canvasroutes and on Facebook. All event announcements drop there first. You can also register at canvasroutes.com to be on our list for upcoming Cars and Coffee events, road trips, and membership launches.' },
    },
    {
      '@type': 'Question',
      name: 'What is a Canvas Routes Cars and Coffee?',
      acceptedAnswer: { '@type': 'Answer', text: 'A curated invite-only morning car meet at a premium venue in Montreal. Great cars, great coffee, great people. No entry fee, no judging — just a morning worth waking up for. Past events include themed meets like Exotics and Classics, Grand Prix weekend, and more.' },
    },
    {
      '@type': 'Question',
      name: 'How do I get an invite to Cars and Coffee?',
      acceptedAnswer: { '@type': 'Answer', text: 'Register at canvasroutes.com. All registrations are personally reviewed and confirmed. This is not a first come first served event — we take care with every registration to make sure the right fit is there.' },
    },
    {
      '@type': 'Question',
      name: 'Is there a cost to attend Cars and Coffee?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. Cars and Coffee events are completely free. Canvas Routes provides complimentary coffee for all registered cars.' },
    },
    {
      '@type': 'Question',
      name: 'What kind of cars show up to Canvas Routes events?',
      acceptedAnswer: { '@type': 'Answer', text: 'A mix of exotics, classics, performance cars and enthusiast builds. Themed events like Exotics and Classics give preference to specific categories but all passionate enthusiasts are welcome. For road trips, the standard is performance and luxury vehicles across all eras — the real qualifier is the person driving.' },
    },
    {
      '@type': 'Question',
      name: 'What is a Canvas Routes road trip?',
      acceptedAnswer: { '@type': 'Answer', text: 'A fully planned curated convoy drive through some of the most scenic backroads in North America. Every detail is handled — premium breakfast before departure, stops along the route, group lunch, farewell drinks and personal photography of your car on the road. Routes include drives through the Laurentians, Eastern Townships, Charlevoix, and beyond. All you bring is your car and your energy.' },
    },
    {
      '@type': 'Question',
      name: 'What kind of roads can I expect on a Canvas Routes road trip?',
      acceptedAnswer: { '@type': 'Answer', text: 'We plan every route to avoid highways as much as possible. After the first regroup stop we take nothing but backroads all the way to the destination. Every route is personally mapped and scouted before the trip. Expect winding two-lane roads, elevation changes, lake views and long sweeping corners — the kind of roads you came for.' },
    },
    {
      '@type': 'Question',
      name: 'What is included in the road trip fee?',
      acceptedAnswer: { '@type': 'Answer', text: 'The fee covers premium breakfast before departure, all food and drink stops along the route, personal photography of your car on the road, a Canvas Routes members kit and full media coverage of the day. Parking fees (if needed) and your car\'s gas are at your own cost and are not included in the road trip fee.' },
    },
    {
      '@type': 'Question',
      name: 'Are Canvas Routes road trips members only?',
      acceptedAnswer: { '@type': 'Answer', text: 'From June 2026, Canvas Routes members get first access to every road trip — spots open to members before anyone else. Members also get significantly better pricing on every trip. The Into the Laurentians road trip on June 7, 2026 is the last trip with open registration before membership launches.' },
    },
    {
      '@type': 'Question',
      name: 'How do I register and pay?',
      acceptedAnswer: { '@type': 'Answer', text: 'Road trip pricing varies based on membership status. Members receive preferred pricing on all Canvas Routes road trips. Full membership details at canvasroutes.com/membership. To register send an Interac E-transfer to info@canvasroutes.com with your name, car and membership status in the message. Spots are strictly limited and confirmed on a first paid basis. Registration deadlines apply for each trip.' },
    },
    {
      '@type': 'Question',
      name: 'Do you organize overnight road trips?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes — overnight and multi-day convoy adventures are a core part of Canvas Routes. We have overnight trips planned for this season and longer expeditions in the works. The Canvas Routes flagship trip is a full convoy from Montreal to Cape Breton to drive the Cabot Trail in Nova Scotia — one of the greatest driving roads in North America.' },
    },
    {
      '@type': 'Question',
      name: 'What is the Canvas Routes flagship road trip?',
      acceptedAnswer: { '@type': 'Answer', text: 'The Cabot Trail in Nova Scotia — a full convoy from Montreal to Cape Breton, driving one of the greatest roads in North America. This is a trip we are actively planning. Reach out at info@canvasroutes.com to be kept in the loop.' },
    },
    {
      '@type': 'Question',
      name: 'What is your cancellation and refund policy?',
      acceptedAnswer: { '@type': 'Answer', text: 'Generally, any fee paid to Canvas Routes is fully refundable. It can vary depending on the type of event or trip and how close to the date the cancellation is made. If you need to cancel, reach out directly — we will always do our best to work with you.' },
    },
    {
      '@type': 'Question',
      name: 'When do Canvas Routes memberships launch?',
      acceptedAnswer: { '@type': 'Answer', text: 'Canvas Routes memberships launch June 2026. Register at canvasroutes.com/membership to secure early access before we open to the public.' },
    },
    {
      '@type': 'Question',
      name: 'How much does Canvas Routes membership cost?',
      acceptedAnswer: { '@type': 'Answer', text: 'Membership hasn\'t launched yet. Pricing and full details will be available at canvasroutes.com/membership when we go live.' },
    },
    {
      '@type': 'Question',
      name: 'What does a Canvas Routes membership include?',
      acceptedAnswer: { '@type': 'Answer', text: 'Priority registration for all events and road trips, access to members-only experiences, partner discounts, a Canvas Routes members kit and more. Inner Circle members receive additional exclusive perks and an extended season through November.' },
    },
    {
      '@type': 'Question',
      name: 'How does expressing interest in an upcoming route work?',
      acceptedAnswer: { '@type': 'Answer', text: "Our Routes page lists the drives we're planning for the season. If a road calls to you, put your name down — it takes thirty seconds, costs nothing, and commits you to nothing. Each route needs a minimum number of cars; once enough drivers are in, we launch it and email everyone on the list with the full details and how to confirm a spot." },
    },
    {
      '@type': 'Question',
      name: 'Do all our routes use the interest list?',
      acceptedAnswer: { '@type': 'Answer', text: "No. The interest list on our Routes page is for our longer routes — overnight and multi-day drives we plan months ahead, where we need a minimum crew before the route makes sense to run. Our shorter day drives work differently: they're announced only a few weeks before they run, with no interest-gathering step at all — spots are first come, first served, with priority given to members." },
    },
    {
      '@type': 'Question',
      name: 'Does expressing interest cost anything or commit me to going?',
      acceptedAnswer: { '@type': 'Answer', text: "No and no. Expressing interest is completely free — no payment details are collected — and it isn't a booking or a commitment. It simply tells us you'd be in the convoy. If your plans change, you simply don't confirm when the route launches." },
    },
    {
      '@type': 'Question',
      name: 'When do I pay for a route?',
      acceptedAnswer: { '@type': 'Answer', text: "Only after a route officially launches. When we hit the crew we need, everyone on the interest list gets a launch email with the per-car fee — set by the route's distance, stops, and any overnight stays — and instructions to confirm your spot. Nothing is charged before then." },
    },
    {
      '@type': 'Question',
      name: "What happens if a route doesn't reach its target?",
      acceptedAnswer: { '@type': 'Answer', text: "It gets postponed to a future season rather than run half-empty — a Canvas Routes convoy only rolls out when the crew is right. Your name stays on the list, and you'll be the first to hear when that route comes back around." },
    },
    {
      '@type': 'Question',
      name: 'Do members get priority on upcoming routes?',
      acceptedAnswer: { '@type': 'Answer', text: "Yes. When a route launches, members get priority as spots are confirmed, and expressing interest from the members portal fills in your details automatically. If you use an email tied to a member account, we'll ask you to log in first so your registration carries that priority." },
    },
    {
      '@type': 'Question',
      name: 'Why do you ask about budget, dates, and activities when I express interest?',
      acceptedAnswer: { '@type': 'Answer', text: "Because the crew shapes the trip. Your preferences — budget range, dates that work, hotel style, the things you'd want to do along the way — feed directly into how we plan the route, where we stay, and what makes the itinerary. Every one of those questions is optional, and none of them commit you to anything." },
    },
  ],
}

export default function FAQ() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <FAQContent />
    </>
  )
}
