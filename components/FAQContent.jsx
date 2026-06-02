'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const SECTIONS = [
  {
    title: 'About',
    items: [
      {
        q: 'What is Canvas Routes?',
        a: 'Canvas Routes is a Montreal-based automotive community built around curated car meets, scenic road trips and convoy adventures across North America and beyond. The passion for the road matters more than the badge on your car, though we do maintain a performance and luxury standard across all our events.',
      },
      {
        q: 'Who is Canvas Routes for?',
        a: 'Anyone who genuinely loves to drive. Not to be seen, not to park and pose — but to actually get out and experience the road. Our community brings together enthusiasts of all backgrounds who share a respect for the drive, the machine and the people around them.',
      },
      {
        q: 'Are you a car club?',
        a: 'Yes — a car club built around the drivers. Cars are the common thread, but the real heart of Canvas Routes is the person behind the wheel. Someone who chose their car with intention and would rather be out on the road than standing next to it. If that sounds like you, you belong here.',
      },
      {
        q: 'Where are you based?',
        a: 'Montreal, Quebec. All current events depart from Montreal or the greater Montreal area. We are a young and growing community with ambitions that stretch across Quebec, Ontario, Vermont, Maine, New York and beyond.',
      },
      {
        q: 'How do I stay updated on upcoming events?',
        a: 'Follow us on Instagram @canvasroutes and on Facebook. All event announcements drop there first. You can also register at canvasroutes.com to be on our list.',
      },
      {
        q: 'I registered — what should I expect?',
        a: 'All Canvas Routes communication happens by email — confirmations, event details, payment information and updates are all sent directly to your inbox. Please check your junk or spam folder as our emails can sometimes land there. We recommend adding info@canvasroutes.com to your contacts so nothing gets missed.',
      },
    ],
  },
  {
    title: 'Cars & Coffee',
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
        a: 'A mix of exotics, classics, performance cars and enthusiast builds. Themed events give preference to specific categories but all passionate enthusiasts are welcome.',
      },
      {
        q: 'What if it rains?',
        a: 'Rain or shine we go ahead — meets have a great energy regardless of the weather. We only postpone in the case of severe weather. You will always be notified in advance if anything changes.',
      },
      {
        q: 'Can I bring a friend or spectator?',
        a: 'Absolutely. If they have a car they love, have them register at canvasroutes.com. Spectators are also welcome to come and enjoy the morning.',
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
        a: 'A fully planned curated convoy through some of the most scenic backroads in North America. Every detail is handled — breakfast before departure, stops along the route, group lunch, farewell drinks and personal photography of your car on the road. All you bring is your car and your energy.',
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
        a: 'The fee covers premium breakfast before departure, all food and drink stops along the route, personal photography of your car on the road, a Canvas Routes welcome kit and full media coverage of the day. Parking fees (if needed) and your car\'s gas are not included.',
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
        q: 'What is your cancellation and refund policy?',
        a: 'Generally, any fee paid to Canvas Routes is fully refundable. That said, it can vary depending on the type of event or trip and how close to the date the cancellation is made. If you need to cancel, reach out directly — we will always do our best to work with you.',
      },
      {
        q: 'Are road trips members only?',
        a: 'From June 2026, Canvas Routes members get first access to every road trip — spots open to members before anyone else, at preferred member pricing. The Into the Laurentians road trip on June 7 is the last trip with open registration before membership launches.',
      },
      {
        q: 'How do I register and pay?',
        a: 'Registration is handled through canvasroutes.com. Once confirmed, payment details are sent by email. Spots are strictly limited and confirmed on a first paid basis. Registration deadlines apply for each trip.',
      },
    ],
  },
  {
    title: 'Overnight & Long Distance',
    items: [
      {
        q: 'Do you organize overnight trips?',
        a: 'Yes — overnight and multi-day convoy adventures are a core part of Canvas Routes. We have overnight trips planned for this season and longer expeditions in the works beyond that.',
      },
      {
        q: 'What is the Canvas Routes flagship road trip?',
        a: 'The Cabot Trail in Nova Scotia — a full convoy from Montreal to Cape Breton, one of the greatest driving roads in North America. This is a trip we are actively planning. Reach out at info@canvasroutes.com to be kept in the loop.',
      },
      {
        q: 'How far do your road trips go?',
        a: 'Our routes span North America — scenic backroads through the northeast, longer expeditions further afield, and overnight adventures for those who want to go further. The road has no limits and neither do we.',
      },
    ],
  },
  {
    title: 'Membership',
    items: [
      {
        q: 'When do memberships launch?',
        a: 'Canvas Routes memberships have launched for the 2026 season. Register your interest at canvasroutes.com/membership.',
      },
      {
        q: 'What does membership include?',
        a: 'Priority registration for all events and road trips, access to members-only experiences, partner discounts, a Canvas Routes welcome kit and more. Inner Circle members receive additional exclusive perks and an extended season through December.',
      },
      {
        q: 'How much does membership cost?',
        a: 'Routes Member is $99 CAD per season. Inner Circle is $249 CAD per season. Full details and benefits at canvasroutes.com/membership.',
      },
      {
        q: 'What is the difference between Routes Member and Inner Circle?',
        a: 'Routes Member gives you full access to every Canvas Routes event and road trip with priority registration all season. Inner Circle includes everything in Routes Member plus 48hr exclusive early access to all events, a $70 road trip credit, a professional car photoshoot on a road trip, exclusive partner discounts, and a Canvas Routes cap.',
      },
    ],
  },
]

function AccordionItem({ item, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          padding: '1.35rem 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-inter),sans-serif',
        }}
      >
        <span style={{
          fontSize: '14px',
          fontWeight: '400',
          color: '#1a1a1a',
          lineHeight: '1.5',
          flex: 1,
        }}>
          {item.q}
        </span>
        <div style={{
          flexShrink: 0,
          width: '22px',
          height: '22px',
          border: `0.5px solid ${isOpen ? 'rgba(197,168,130,0.5)' : 'rgba(0,0,0,0.12)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? '#c5a882' : '#aaa',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.22s ease, border-color 0.15s, color 0.15s',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <div style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.25s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ paddingBottom: '1.5rem', paddingRight: '2rem' }}>
            <p style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.9',
              margin: 0,
              fontFamily: 'var(--font-inter),sans-serif',
            }}>
              {item.a}
            </p>
            {item.a2 && (
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.9', margin: '0.75rem 0 0', fontFamily: 'var(--font-inter),sans-serif' }}>
                {item.a2}
              </p>
            )}
            {item.note && (
              <p style={{ fontSize: '14px', color: '#444', fontWeight: '500', lineHeight: '1.9', margin: '0.75rem 0 0', fontFamily: 'var(--font-inter),sans-serif' }}>
                {item.note}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FAQContent() {
  const [open, setOpen] = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function toggle(key) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav className="nav">
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </Link>
        <div className="nav-links">
          <Link href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
          <Link href="/#events" style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
          <Link href="/#contact" style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
          <Link href="/faq" style={{ color: '#1a1a1a', textDecoration: 'none', fontWeight: '500' }}>FAQ</Link>
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
        <Link href="/#events" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
        <Link href="/#contact" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
        <Link href="/faq" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>FAQ</Link>
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#3B6B2F', fontWeight: '500' }}>Members Login</Link>
      </div>

      {/* Hero */}
      <section style={{ background: '#0F1E14', padding: 'clamp(120px,14vw,180px) 2rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />
        <div style={{ fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1.25rem', fontFamily: 'var(--font-inter),sans-serif' }}>
          Canvas Routes
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,6vw,4.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
          Frequently Asked Questions
        </h1>
        <div style={{ width: '40px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.5rem' }} />
        <p style={{ fontSize: '15px', color: 'rgba(245,241,236,0.5)', maxWidth: '400px', margin: '0 auto', lineHeight: '1.85', fontFamily: 'var(--font-inter),sans-serif' }}>
          Everything you need to know about the community, the events and the road ahead.
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)' }} />
      </section>

      {/* Content */}
      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: 'clamp(3rem,6vw,5rem) clamp(1.25rem,5vw,2.5rem) 2rem' }}>
        {isMobile ? (
          /* Mobile: stacked, section label above items */
          SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: '3.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif' }}>{section.title}</div>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(197,168,130,0.25)' }} />
              </div>
              {section.items.map((item, ii) => (
                <AccordionItem key={`${si}-${ii}`} item={item} isOpen={!!open[`${si}-${ii}`]} onToggle={() => toggle(`${si}-${ii}`)} />
              ))}
            </div>
          ))
        ) : (
          /* Desktop: 2-col grid, label sticky in its own row */
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', columnGap: '4rem', rowGap: '3.5rem', alignItems: 'start' }}>
            {SECTIONS.map((section, si) => (
              <>
                {/* Label — sticky within this grid row (the row is as tall as the section content) */}
                <div key={`label-${si}`} style={{ position: 'sticky', top: '100px' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', lineHeight: '1.5' }}>
                    {section.title}
                  </div>
                </div>

                {/* Accordion items */}
                <div key={`items-${si}`}>
                  {section.items.map((item, ii) => (
                    <AccordionItem key={`${si}-${ii}`} item={item} isOpen={!!open[`${si}-${ii}`]} onToggle={() => toggle(`${si}-${ii}`)} />
                  ))}
                </div>
              </>
            ))}
          </div>
        )}
      </div>

      {/* CTA + Footer */}
      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 clamp(1.25rem,5vw,2.5rem) 6rem' }}>

        {/* CTA */}
        <div style={{ marginTop: '1rem', padding: 'clamp(2rem,4vw,3rem)', background: '#0F1E14', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Still have questions?
          </div>
          <div style={{ width: '28px', height: '0.5px', background: 'rgba(197,168,130,0.6)', margin: '0 auto 1.25rem' }} />
          <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.55)', lineHeight: '1.85', maxWidth: '340px', margin: '0 auto', fontFamily: 'var(--font-inter),sans-serif' }}>
            Reach out at{' '}
            <a href="mailto:info@canvasroutes.com" style={{ color: '#c5a882', textDecoration: 'none' }}>info@canvasroutes.com</a>
            {' '}or follow us at{' '}
            <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer" style={{ color: '#c5a882', textDecoration: 'none' }}>@canvasroutes</a>
          </p>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: '2.5rem', marginTop: '3rem', borderTop: '0.5px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ fontSize: '11px', color: '#aaa', fontFamily: 'var(--font-inter),sans-serif' }}>© 2026 Canvas Routes. Montreal, QC.</p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/privacy" style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Terms</Link>
          </div>
        </div>
      </div>

    </div>
  )
}
