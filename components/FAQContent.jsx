'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

const SECTIONS = [
  {
    num: '01',
    title: 'About Canvas Routes',
    items: [
      {
        q: 'What is Canvas Routes?',
        a: 'Canvas Routes is a Montreal-based car club built around curated car meets, scenic road trips and convoy adventures across Canada, the United States and beyond. We are a car club for drivers — the passion for the road matters more than the badge on your car, though we do maintain a performance and luxury standard across all our events.',
      },
      {
        q: 'Who is Canvas Routes for?',
        a: 'Anyone who genuinely loves to drive. Not to be seen, not to park and pose — but to actually get out and experience the road. Our community brings together enthusiasts of all backgrounds who share a respect for the drive, the machine and the people around them.',
      },
      {
        q: 'Are you a car club?',
        a: 'Yes — a car club built around the driver. Cars are the common thread but the real heart of Canvas Routes is the person behind the wheel. Someone who chose their car with intention and would rather put real kilometres on it than let it sit. We are not a show-and-tell club. We drive.',
      },
      {
        q: 'Where are you based?',
        a: 'Montreal, Quebec. All current events depart from Montreal or the greater Montreal area. We are a young and growing community with national and international ambitions.',
      },
      {
        q: 'How do I stay updated on upcoming events?',
        a: 'Follow us on Instagram @canvasroutes and on Facebook. All event announcements drop there first. You can also register at canvasroutes.com to be on our list.',
      },
      {
        q: 'I registered — what should I expect?',
        a: 'All Canvas Routes communication happens by email — confirmations, event details, payment information and updates are all sent directly to your inbox. Please make sure to check your junk or spam folder as our emails can sometimes land there. We recommend adding info@canvasroutes.com and jerry@canvasroutes.com to your contacts so nothing gets missed.',
      },
    ],
  },
  {
    num: '02',
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
    num: '03',
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
        a: 'Register at canvasroutes.com. Once your registration is reviewed, payment details will be shared with you by email. Spots are strictly limited and confirmed on a first paid basis.',
      },
    ],
  },
  {
    num: '04',
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
    num: '05',
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

function AccordionItem({ item, index, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '1.5rem', padding: '1.25rem 0',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-inter),sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
          <span style={{
            fontSize: '10px', letterSpacing: '0.12em', color: isOpen ? '#c5a882' : '#ccc',
            paddingTop: '2px', flexShrink: 0, transition: 'color 0.2s', fontVariantNumeric: 'tabular-nums',
          }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span style={{
            fontSize: '14px', fontWeight: isOpen ? '500' : '400',
            color: isOpen ? '#1a1a1a' : '#444', lineHeight: '1.55', flex: 1,
            transition: 'color 0.2s, font-weight 0.2s',
          }}>
            {item.q}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ flexShrink: 0, marginTop: '2px', color: isOpen ? '#c5a882' : '#ccc' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.2 } }}
            style={{ overflow: 'hidden' }}
          >
            <motion.p
              initial={{ y: -6 }}
              animate={{ y: 0 }}
              exit={{ y: -6 }}
              transition={{ duration: 0.22 }}
              style={{
                fontSize: '13px', color: '#666', lineHeight: '1.9',
                margin: '0 0 1.5rem', paddingLeft: '2rem',
                fontFamily: 'var(--font-inter),sans-serif',
              }}
            >
              {item.a}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQContent() {
  const [open, setOpen] = useState({})

  function toggle(key) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 3rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
        background: '#F5F1EC', height: '72px',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={110} height={73} style={{ display: 'block' }} />
        </Link>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ← Back
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 2rem 2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#aaa', marginBottom: '1.2rem' }}>Support</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '3.4rem', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.05', marginBottom: '2rem' }}>
            Frequently asked<br />questions.
          </div>
          <div style={{ width: '40px', height: '1px', background: '#c5a882', marginBottom: '1.5rem' }} />
          <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.8', maxWidth: '500px', marginBottom: '4rem' }}>
            Everything you need to know about Canvas Routes — the car club, the events, and the road ahead.
          </p>
        </motion.div>

        {/* Quick nav */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '5rem' }}
        >
          {SECTIONS.map((s, i) => (
            <a
              key={i}
              href={`#section-${i}`}
              onClick={e => {
                e.preventDefault()
                document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              style={{
                fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#888', textDecoration: 'none',
                border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.45rem 1rem',
                background: 'transparent', transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)' }}
            >
              {s.title}
            </a>
          ))}
        </motion.div>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
        {SECTIONS.map((section, si) => (
          <motion.div
            key={si}
            id={`section-${si}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
            style={{ marginBottom: '5rem', scrollMarginTop: '100px' }}
          >
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
              <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.8rem', fontWeight: '300', color: 'rgba(197,168,130,0.4)', lineHeight: 1 }}>
                {section.num}
              </span>
              <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.6rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>
                {section.title}
              </span>
            </div>

            {/* Accordion */}
            <div>
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`
                return (
                  <AccordionItem
                    key={key}
                    item={item}
                    index={ii}
                    isOpen={!!open[key]}
                    onToggle={() => toggle(key)}
                  />
                )
              })}
            </div>
          </motion.div>
        ))}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ marginTop: '2rem', marginBottom: '5rem', padding: '3.5rem', background: '#0F1E14', textAlign: 'center' }}
        >
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>
            Still have questions?
          </div>
          <div style={{ width: '28px', height: '0.5px', background: 'rgba(197,168,130,0.6)', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.55)', lineHeight: '1.85', maxWidth: '380px', margin: '0 auto 2rem' }}>
            Reach out at{' '}
            <a href="mailto:info@canvasroutes.com" style={{ color: '#c5a882', textDecoration: 'none', borderBottom: '0.5px solid rgba(197,168,130,0.4)', paddingBottom: '1px' }}>
              info@canvasroutes.com
            </a>
            {' '}or follow us at{' '}
            <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer" style={{ color: '#c5a882', textDecoration: 'none', borderBottom: '0.5px solid rgba(197,168,130,0.4)', paddingBottom: '1px' }}>
              @canvasroutes
            </a>
          </p>
        </motion.div>

        {/* Footer */}
        <div style={{ paddingBottom: '3rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.04em' }}>© 2026 Canvas Routes. Montreal, QC.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/privacy" style={{ fontSize: '10px', color: '#bbb', textDecoration: 'none', letterSpacing: '0.03em' }}>Privacy Policy</Link>
          </div>
        </div>
      </div>

    </div>
  )
}
