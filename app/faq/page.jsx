import FAQContent from '../../components/FAQContent'

export const metadata = {
  title: 'FAQ | Canvas Routes — Montreal Car Club',
  description: "Frequently asked questions about Canvas Routes — Montreal's luxury car club. Cars and coffee, road trips from Montreal, membership, and more.",
  keywords: 'Canvas Routes FAQ, car club Montreal, road trips from Montreal, cars and coffee Montreal, automotive community Montreal, luxury car meets Quebec',
  alternates: { canonical: 'https://canvasroutes.com/faq' },
  openGraph: {
    title: 'FAQ | Canvas Routes — Montreal Car Club',
    description: "Frequently asked questions about Canvas Routes — Montreal's luxury car club. Cars and coffee, road trips from Montreal, membership, and more.",
    url: 'https://canvasroutes.com/faq',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Canvas Routes?',
      acceptedAnswer: { '@type': 'Answer', text: 'Canvas Routes is a Montreal-based luxury automotive community built around curated car meets, scenic road trips and convoy adventures across Quebec, Ontario, Vermont, Maine, New York and beyond. The passion for the road matters more than the badge on your car, though we do maintain a performance and luxury standard across all our events.' },
    },
    {
      '@type': 'Question',
      name: 'Who is Canvas Routes for?',
      acceptedAnswer: { '@type': 'Answer', text: 'Anyone who genuinely loves to drive. Not to be seen, not to park and pose — but to actually get out and experience the road. Our community brings together enthusiasts of all backgrounds who share a respect for the drive, the machine and the people around them.' },
    },
    {
      '@type': 'Question',
      name: 'Are you a car club?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes — a car club built around the drivers. Cars are the common thread, but the real heart of Canvas Routes is the person behind the wheel. Someone who chose their car with intention and would rather be out on the road than standing next to it. If that sounds like you, you belong here.' },
    },
    {
      '@type': 'Question',
      name: 'Where are you based?',
      acceptedAnswer: { '@type': 'Answer', text: 'Montreal, Quebec. All current events depart from Montreal or the greater Montreal area. We are a young and growing community with ambitions that stretch across Quebec, Ontario, Vermont, Maine, New York and beyond.' },
    },
    {
      '@type': 'Question',
      name: 'What is a Canvas Routes Cars and Coffee?',
      acceptedAnswer: { '@type': 'Answer', text: 'A curated invite-only morning meet at a premium venue in Montreal. Great cars, great coffee, great people. No entry fee, no judging — just a morning worth waking up for.' },
    },
    {
      '@type': 'Question',
      name: 'Is there a cost to attend Cars and Coffee?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. Cars and Coffee events are completely free. Canvas Routes provides complimentary coffee for all registered cars.' },
    },
    {
      '@type': 'Question',
      name: 'What is a Canvas Routes road trip?',
      acceptedAnswer: { '@type': 'Answer', text: 'A fully planned curated convoy through some of the most scenic backroads in North America and beyond. Every detail is handled — breakfast before departure, stops along the route, group lunch, farewell drinks and personal photography of your car on the road. All you bring is your car and your energy.' },
    },
    {
      '@type': 'Question',
      name: 'What is included in the road trip fee?',
      acceptedAnswer: { '@type': 'Answer', text: 'The fee covers premium breakfast before departure, all food and drink stops along the route, personal photography of your car on the road, a Canvas Routes welcome kit and full media coverage of the day. Parking fees (if needed) and your car\'s gas are at your own cost and are not included in the road trip fee.' },
    },
    {
      '@type': 'Question',
      name: 'What is your refund policy?',
      acceptedAnswer: { '@type': 'Answer', text: 'Generally, any fee paid to Canvas Routes is fully refundable. That said, it can vary depending on the type of event or trip and how close to the date the cancellation is made. If you need to cancel or have any questions about a refund, we always encourage you to reach out to us directly — we will do our best to work with you.' },
    },
    {
      '@type': 'Question',
      name: 'When do memberships launch?',
      acceptedAnswer: { '@type': 'Answer', text: 'Canvas Routes memberships open after our first road trip on May 31. Register at canvasroutes.com to be among the first notified.' },
    },
    {
      '@type': 'Question',
      name: 'What will membership include?',
      acceptedAnswer: { '@type': 'Answer', text: 'Priority registration for all events and road trips, access to members only experiences, partner discounts, a Canvas Routes welcome kit and more. Full details dropping at launch.' },
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
