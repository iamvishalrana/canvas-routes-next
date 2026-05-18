'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const SECTIONS = [
  {
    title: 'About Canvas Routes',
    items: [
      {
        q: 'What is Canvas Routes?',
        a: 'Canvas Routes is a Montreal-based drivers community built around curated car meets, scenic road trips and convoy adventures across Canada, the United States and beyond. We are a drivers group before we are a car club — the passion for the road matters more than the badge on your car, though we do maintain a performance and luxury standard across all our events.',
      },
      {
        q: 'Who is Canvas Routes for?',
        a: 'Anyone who genuinely loves to drive. Not to be seen, not to park and pose — but to actually get out and experience the road. Our community brings together enthusiasts of all backgrounds who share a respect for the drive, the machine and the people around them.',
      },
      {
        q: 'Are you a car club?',
        a: 'We prefer to think of ourselves as a drivers group. Cars are the common thread but the real heart of Canvas Routes is the person behind the wheel. Someone who chose their car with intention and would rather put real kilometres on it than let it sit.',
      },
      {
        q: 'Where are you based?',
        a: 'Montreal, Quebec. All current events depart from Montreal or the greater Montreal area. We are a young and growing community with national and international ambitions.',
      },
      {
        q: 'How do I stay updated on upcoming events?',
        a: 'Follow us on Instagram @canvasroutes and on Facebook. All event announcements drop there first. You can also register at canvasroutes.com to be on our list.',
      },
    ],
  },
  {
    title: 'Cars and Coffee',
    items: [
      {
        q: 'What is a Canvas Routes Cars and Coffee?',
        a: 'A curated invite-only morning meet at a premium venue in Montreal. Great cars, great coffee, great people. No entry fee, no judging — just a morning worth waking up for.',
      },
      {
        q: 'How do I get an invite?',
        a: 'Register at canvasroutes.com. All registrations are personally reviewed and confirmed. This is not a first come first served event — we take care with every registration to make sure the right fit is there.',
      },
      {
        q: 'Is there a cost to attend?',
        a: 'No. Cars and Coffee events are completely free. Canvas Routes provides complimentary coffee for all registered cars.',
      },
      {
        q: 'What kind of cars show up?',
        a: 'A mix of exotics, classics, performance cars and enthusiast builds. Themed events like Exotics and Classics give preference to specific categories but all passionate enthusiasts are welcome.',
      },
      {
        q: 'What if it rains?',
        a: 'Rain or shine we go ahead — car meets have a great energy regardless of the weather. We only postpone in the case of severe weather conditions. You will always be notified in advance if anything changes.',
      },
      {
        q: 'Can I bring a friend or spectator?',
        a: 'Absolutely. If they have a car they love, have them register at canvasroutes.com. Spectators are also welcome to come and enjoy the morning.',
      },
      {
        q: 'Can I bring my kids?',
        a: 'Yes — Canvas Routes is a welcoming community for all ages.',
      },
      {
        q: 'What are the rules?',
        a: 'No revving, no burnouts, no aggressive driving at any time. We are guests of our venue partners and neighbours of the communities we meet in. Respect the space, respect the cars around you and bring the right energy.',
      },
    ],
  },
  {
    title: 'Road Trips',
    items: [
      {
        q: 'What is a Canvas Routes road trip?',
        a: 'A fully planned curated convoy through some of the most scenic backroads in North America and beyond. Every detail is handled — breakfast before departure, stops along the route, group lunch, farewell drinks and personal photography of your car on the road. All you bring is your car and your energy.',
      },
      {
        q: 'What kind of roads can I expect?',
        a: 'We plan every route to avoid highways as much as possible. After the first regroup stop we take nothing but backroads all the way to the destination. Every route is personally mapped and scouted before the trip. Expect winding two-lane roads, elevation changes, lake views and long sweeping corners.',
      },
      {
        q: 'Do I find out the route in advance?',
        a: 'The full itinerary is shared privately with confirmed participants ahead of the trip. We generally keep the specific stops and roads a surprise — part of the Canvas Routes experience is the discovery along the way.',
      },
      {
        q: 'What is included in the road trip fee?',
        a: 'The fee covers premium breakfast before departure, all food and drink stops along the route, personal photography of your car on the road, a Canvas Routes welcome kit and full media coverage of the day. Gas and any optional parking fees are on you.',
      },
      {
        q: 'What makes each road trip unique?',
        a: 'Every Canvas Routes road trip is built around a signature experience that goes beyond just driving. We plan something special and unexpected at each stop along the way — the kind of moment you did not see coming and will not forget. We keep the details close until the day, but trust us when we say it is worth showing up for.',
      },
      {
        q: 'Can I bring a passenger?',
        a: 'Yes — the base fee covers two people per car. Additional passengers are charged separately. Children are welcome and we offer tiered pricing depending on age.',
      },
      {
        q: 'Do I need to sign a waiver?',
        a: 'Yes. All road trip participants are required to sign a Canvas Routes participant waiver before the event. This is sent to you upon confirmation of your spot.',
      },
      {
        q: 'What is the cancellation policy?',
        a: 'Cancellations made more than 7 days before the trip receive a full refund. Cancellations within 7 days are non-refundable due to pre-booked reservations.',
      },
      {
        q: 'What cars are eligible for road trips?',
        a: 'Performance and luxury vehicles across all eras. The real standard is the person driving — someone who loves the road and shows up with the right attitude. If you are unsure whether your car qualifies, reach out at info@canvasroutes.com.',
      },
      {
        q: 'Are road trips members only?',
        a: 'Currently road trips are open to all enthusiasts. Once Canvas Routes memberships launch, future road trips will be members only with members receiving priority registration and preferred pricing.',
      },
      {
        q: 'How do I register and pay?',
        a: 'Register at canvasroutes.com and send your Interac E-transfer to info@canvasroutes.com to secure your spot. Include your name and car in the message. Spots are strictly limited and confirmed on a first paid basis.',
      },
    ],
  },
  {
    title: 'Overnight and Long Distance Trips',
    items: [
      {
        q: 'Do you organize overnight trips?',
        a: 'Yes — overnight and multi-day convoy adventures are a core part of Canvas Routes. We have overnight trips planned for this season and longer expeditions in the works beyond that.',
      },
      {
        q: 'What is the Canvas Routes flagship road trip?',
        a: 'The Cabot Trail in Nova Scotia — a full convoy from Montreal to Cape Breton, one of the greatest driving roads in North America. This is a trip we are actively planning for this season or next depending on interest. If you want to be part of it reach out at info@canvasroutes.com and we will keep you in the loop.',
      },
      {
        q: 'How far do your road trips go?',
        a: 'We are based in Montreal but our ambitions go far beyond. We are planning trips across Canada, into the United States and eventually internationally as the community grows. The road has no limits and neither do we.',
      },
    ],
  },
  {
    title: 'Membership',
    items: [
      {
        q: 'When do memberships launch?',
        a: 'Canvas Routes memberships open after our first road trip on May 31. Register at canvasroutes.com to be among the first notified.',
      },
      {
        q: 'What will membership include?',
        a: 'Priority registration for all events and road trips, access to members only experiences, partner discounts, a Canvas Routes welcome kit and more. Full details dropping at launch.',
      },
      {
        q: 'How much does membership cost?',
        a: 'The Canvas Routes season runs May to November. Full pricing and details will be announced at membership launch.',
      },
    ],
  },
]

export default function FAQContent() {
  const [open, setOpen] = useState({})

  function toggle(key) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 3rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)', background: '#F5F1EC', height: '72px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={110} height={73} style={{ display: 'block' }} />
        </Link>
        <Link href="/" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          ← Back
        </Link>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '4rem 2rem 6rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '4rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#aaa', marginBottom: '1rem' }}>Support</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '3rem', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.1', marginBottom: '1.5rem' }}>
            Frequently asked<br />questions.
          </div>
          <div style={{ width: '40px', height: '1px', background: '#c5a882' }} />
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
          {SECTIONS.map((section, si) => (
            <div key={si}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7B2032', whiteSpace: 'nowrap' }}>
                  {section.title}
                </div>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(123,32,50,0.15)' }} />
              </div>

              {/* Accordion items */}
              <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
                {section.items.map((item, ii) => {
                  const key = `${si}-${ii}`
                  const isOpen = !!open[key]
                  const isLast = ii === section.items.length - 1
                  return (
                    <div key={ii} style={{ borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.07)' }}>
                      <button
                        onClick={() => toggle(key)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '1.5rem', padding: '1.15rem 1.4rem',
                          background: isOpen ? 'rgba(197,168,130,0.05)' : 'transparent',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'var(--font-inter),sans-serif',
                          transition: 'background 0.15s',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: '500', color: isOpen ? '#1a1a1a' : '#333', lineHeight: '1.5', flex: 1 }}>
                          {item.q}
                        </span>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke={isOpen ? '#c5a882' : '#bbb'} strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s, stroke 0.15s' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 1.4rem 1.35rem', borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                          <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.85', margin: '1rem 0 0' }}>
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: '5rem', paddingTop: '3rem', borderTop: '0.5px solid rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.8rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem' }}>
            Still have questions?
          </div>
          <div style={{ width: '28px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.85', maxWidth: '420px', margin: '0 auto 2rem' }}>
            Reach out at{' '}
            <a href="mailto:info@canvasroutes.com" style={{ color: '#7B2032', textDecoration: 'none', borderBottom: '0.5px solid rgba(123,32,50,0.3)', paddingBottom: '1px' }}>
              info@canvasroutes.com
            </a>
            {' '}or follow us at{' '}
            <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer" style={{ color: '#7B2032', textDecoration: 'none', borderBottom: '0.5px solid rgba(123,32,50,0.3)', paddingBottom: '1px' }}>
              @canvasroutes
            </a>
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.04em' }}>© 2026 Canvas Routes. Montreal, QC.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/privacy" style={{ fontSize: '10px', color: '#bbb', textDecoration: 'none', letterSpacing: '0.03em' }}>Privacy Policy</Link>
          </div>
        </div>
      </div>

    </div>
  )
}
