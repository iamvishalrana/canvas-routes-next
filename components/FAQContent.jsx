'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import SiteNav from './SiteNav'

function renderAnswer(text) {
  if (!text) return text
  const pattern = /(info@canvasroutes\.com|canvasroutes\.com(?:\/[^\s.,;)]*)?)/g
  const parts = []
  let last = 0, m
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const raw = m[0]
    if (raw.includes('@')) {
      parts.push(<a key={m.index} href={`mailto:${raw}`} style={{ color: '#c5a882', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{raw}</a>)
    } else {
      const path = raw === 'canvasroutes.com' ? '/' : `/${raw.replace('canvasroutes.com/', '')}`
      parts.push(<a key={m.index} href={path} style={{ color: '#c5a882', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{raw}</a>)
    }
    last = pattern.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? text : parts
}

const SECTIONS = [
  {
    title: 'About',
    items: [
      {
        q: 'What is Canvas Routes?',
        a: 'Canvas Routes is a Montreal-based automotive community built around curated car meets, scenic routes and convoy adventures across North America and beyond. The passion for the road matters more than the badge on your car, though we do maintain a performance and luxury standard across all our events.',
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
    title: 'Meets',
    items: [
      {
        q: 'What kind of meets does Canvas Routes host?',
        a: 'Our main format is Cars and Coffee — a curated invite-only morning meet at a premium venue in Montreal. Great cars, great coffee, great people. We also host themed and seasonal meets throughout the year, but Cars and Coffee is the heartbeat of what we do.',
      },
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
    title: 'Routes',
    items: [
      {
        q: 'What is a Canvas Routes route?',
        a: 'A fully planned curated convoy through some of the most scenic backroads in North America. Every detail is handled — breakfast before departure, stops along the route, group lunch, farewell drinks and personal photography of your car on the road. All you bring is your car and your energy.',
      },
      {
        q: 'What kind of roads can I expect?',
        a: 'We plan every route to avoid highways as much as possible. After the first regroup stop we take nothing but backroads all the way to the destination. Every route is personally mapped and scouted before the trip. Expect winding two-lane roads, elevation changes, lake views and long sweeping corners.',
      },
      {
        q: 'How do you choose your routes?',
        a: 'Every route we run has been driven by us — multiple times. Before anything is announced, we go out and scout the full road ourselves: every turn, every stop, every restaurant, every viewpoint. We drive it in different conditions, time the segments, eat the food, and only sign off on a route once there are zero question marks left. By the time you show up, every detail has already been figured out.',
      },
      {
        q: 'Do I find out the route in advance?',
        a: 'The full itinerary is shared privately with confirmed participants ahead of the trip. We generally keep the specific stops and roads a surprise — part of the Canvas Routes experience is the discovery along the way.',
      },
      {
        q: 'What is included in the route fee?',
        a: 'The fee covers premium breakfast before departure, all food and drink stops along the route, personal photography of your car on the road, a Canvas Routes members kit and full media coverage of the day. Parking fees (if needed) and your car\'s gas are not included.',
      },
      {
        q: 'Can I bring a passenger?',
        a: 'Yes — the base fee covers two people per car. Additional passengers are charged separately. Children are welcome and we offer tiered pricing depending on age.',
      },
      {
        q: 'Do I need to sign a waiver?',
        a: 'Yes. All route participants are required to sign a Canvas Routes participant waiver before the event. This is sent to you upon confirmation of your spot.',
      },
      {
        q: 'What is your cancellation and refund policy?',
        a: 'Generally, any fee paid to Canvas Routes is fully refundable. That said, it can vary depending on the type of event or trip and how close to the date the cancellation is made. If you need to cancel, reach out directly — we will always do our best to work with you.',
      },
      {
        q: 'Are routes open to non-members?',
        a: 'Yes — Canvas Routes routes are not exclusive to members. Anyone can register for an upcoming route. Members simply get priority access during a dedicated registration window before spots open to the public, and benefit from preferred member pricing on every route.',
      },
      {
        q: 'How do I register and pay?',
        a: 'Registration is handled through canvasroutes.com. Spots are strictly limited and confirmed on a first paid basis. Registration deadlines apply for each event.',
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
        q: 'What is the Canvas Routes flagship route?',
        a: 'The Cabot Trail in Nova Scotia — a full convoy from Montreal to Cape Breton, one of the greatest driving roads in North America. This is a route we are actively planning. Reach out at info@canvasroutes.com to be kept in the loop.',
      },
      {
        q: 'How far do your routes go?',
        a: 'Our routes span North America — scenic backroads through the northeast, longer expeditions further afield, and overnight adventures for those who want to go further. The road has no limits and neither do we.',
      },
    ],
  },
  {
    title: 'Membership',
    items: [
      {
        q: 'Is membership open now?',
        a: 'Yes — Canvas Routes membership is open for the 2026 season. Apply at canvasroutes.com/membership. Every application is reviewed personally and spots are limited.',
      },
      {
        q: 'What does membership include?',
        a: 'Priority registration for all events and routes, preferred member pricing on every route, access to members-only events, partner discounts, a Canvas Routes members kit and more. Inner Circle members receive additional exclusive perks and an extended season through December.',
      },
      {
        q: 'How much does membership cost?',
        a: 'Routes Member is $99 CAD per season. Inner Circle is $249 CAD per season. Full details and benefits at canvasroutes.com/membership.',
      },
      {
        q: 'What is the difference between Routes Member and Inner Circle?',
        a: 'Routes Member gives you full access to every Canvas Routes event and route with priority registration and preferred pricing all season. Inner Circle includes everything in Routes Member plus 48hr exclusive early access to all events, a $70 route credit, a professional car photoshoot on a route, exclusive partner discounts, and a Canvas Routes cap.',
      },
      {
        q: 'Are there events exclusive to members?',
        a: 'Yes. Alongside our open events, Canvas Routes runs a calendar of members-only experiences throughout the season — exclusive cruises, private gatherings, and routes that are not open to the public. These are part of what makes membership worthwhile.',
      },
      {
        q: 'How is my application reviewed?',
        a: 'Every application is read personally. We look at the car, the person, and what they bring to the community. There is no algorithm — just a genuine review. You will hear back by email.',
      },
      {
        q: 'What happens if my application is declined?',
        a: 'If your application is not approved, your payment is refunded in full — no charge is made. You are welcome to reapply in a future season.',
      },
      {
        q: 'Can I cancel my membership?',
        a: 'Membership fees are non-refundable once the season has begun. If you are approved but choose not to proceed before the season starts, contact us at info@canvasroutes.com as soon as possible.',
      },
    ],
  },
]

// ── Scroll-car constants (same geometry as test page) ────────────────────────
const C_STEPS = 500
const C_NAV_H = 68
const C_DONUT_SPEED = 4500
const C_TIRE_INTERVAL = 90
const C_REAR_TYRES = [{ lx: -16.8, ly: -6.9 }, { lx: -16.8, ly: 6.9 }]
const C_FRONT_AXLE = 17

function cBuildPoints(isMobile, navH = C_NAV_H, yEndDoc) {
  const vw  = window.innerWidth, vh = window.innerHeight
  const cx  = isMobile ? vw * 0.82 : vw * 0.08
  const amp = isMobile ? vw * 0.06 : vw * 0.02
  const yStart = navH
  const yEnd = isMobile ? vh - 12 : (yEndDoc || document.documentElement.scrollHeight - 20)
  const cycles = 2.5
  return Array.from({ length: C_STEPS + 1 }, (_, i) => {
    const t  = i / C_STEPS
    const x  = cx + amp * Math.sin(t * cycles * Math.PI * 2)
    const y  = yStart + t * (yEnd - yStart)
    const dx = amp * cycles * Math.PI * 2 * Math.cos(t * cycles * Math.PI * 2)
    const dy = yEnd - yStart
    return { x, y, angle: Math.atan2(dy, dx) * 180 / Math.PI }
  })
}
function cPoly(pts) { return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }
// ─────────────────────────────────────────────────────────────────────────────

function AccordionItem({ item, isOpen, onToggle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '0.5px solid rgba(197,168,130,0.18)',
        borderLeft: isOpen ? '2px solid rgba(197,168,130,0.55)' : '2px solid transparent',
        paddingLeft: isOpen ? '1.1rem' : '0',
        transition: 'border-color 0.22s ease, padding-left 0.22s ease',
        background: isOpen ? 'rgba(197,168,130,0.04)' : hovered ? 'rgba(0,0,0,0.012)' : 'transparent',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'clamp(1rem,3vw,2rem)',
          padding: '1.4rem 0.75rem 1.4rem 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-inter),sans-serif',
        }}
      >
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: isOpen ? '#111' : '#1a1a1a',
          lineHeight: '1.55',
          flex: 1,
          transition: 'color 0.15s',
        }}>
          {item.q}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isOpen ? '#c5a882' : 'rgba(0,0,0,0.28)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.28s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ paddingBottom: '1.6rem', paddingRight: 'clamp(1.25rem,4vw,2.5rem)' }}>
            <p style={{
              fontSize: '13.5px',
              color: '#4d4d4d',
              lineHeight: '1.95',
              margin: 0,
              fontFamily: 'var(--font-inter),sans-serif',
            }}>
              {renderAnswer(item.a)}
            </p>
            {item.a2 && (
              <p style={{ fontSize: '13.5px', color: '#666', lineHeight: '1.95', margin: '0.75rem 0 0', fontFamily: 'var(--font-inter),sans-serif' }}>
                {renderAnswer(item.a2)}
              </p>
            )}
            {item.note && (
              <p style={{ fontSize: '13.5px', color: '#444', fontWeight: '500', lineHeight: '1.95', margin: '0.75rem 0 0', fontFamily: 'var(--font-inter),sans-serif' }}>
                {renderAnswer(item.note)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FAQContent() {
  const [open, setOpen]       = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ── Cinematic fade-in refs ───────────────────────────────────────────────────
  // Hero header elements (fade on mount)
  const fadeHeroLabelRef    = useRef(null)
  const fadeHeroH1Ref       = useRef(null)
  const fadeHeroDividerRef  = useRef(null)
  const fadeHeroSubtitleRef = useRef(null)
  // Section heading refs (mobile only, scroll-triggered)
  const fadeSectionHeadRefs = useRef([])
  // Accordion item group refs (scroll-triggered stagger)
  const fadeAccordionRefs   = useRef([])
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Hero header mount fade-in ────────────────────────────────────────────────
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const heroEls = [
      { el: fadeHeroLabelRef.current,    delay:   0 },
      { el: fadeHeroH1Ref.current,       delay:  80 },
      { el: fadeHeroDividerRef.current,  delay: 150 },
      { el: fadeHeroSubtitleRef.current, delay: 210 },
    ]
    heroEls.forEach(({ el, delay }) => {
      if (!el) return
      el.classList.add('cr-fade')
      const t = setTimeout(() => el.classList.add('cr-visible'), delay)
      // store timeout id on element for cleanup
      el._crFadeTimer = t
    })
    return () => {
      heroEls.forEach(({ el }) => {
        if (el && el._crFadeTimer != null) clearTimeout(el._crFadeTimer)
      })
    }
  }, [])

  // ── Scroll-triggered section headings + accordion stagger ───────────────────
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    // Collect all elements that need scroll-triggered fade
    // Section heading divs (mobile)
    const headEls = fadeSectionHeadRefs.current.filter(Boolean)
    // Accordion item children — each child in the group gets a staggered class
    const groupEls = fadeAccordionRefs.current.filter(Boolean)

    // Apply initial hidden state
    headEls.forEach(el => el.classList.add('cr-fade'))
    groupEls.forEach(group => {
      Array.from(group.children).forEach(child => child.classList.add('cr-fade'))
    })

    // IntersectionObserver for section headings
    let headObs = null
    if (headEls.length > 0) {
      headObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('cr-visible')
            headObs.unobserve(entry.target)
          }
        })
      }, { threshold: 0.2 })
      headEls.forEach(el => headObs.observe(el))
    }

    // IntersectionObserver for accordion groups (stagger children)
    let acObs = null
    if (groupEls.length > 0) {
      acObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const children = Array.from(entry.target.children)
            children.forEach((child, i) => {
              const t = setTimeout(() => child.classList.add('cr-visible'), i * 60)
              child._crStaggerTimer = t
            })
            acObs.unobserve(entry.target)
          }
        })
      }, { threshold: 0.08 })
      groupEls.forEach(el => acObs.observe(el))
    }

    return () => {
      if (headObs) headObs.disconnect()
      if (acObs) acObs.disconnect()
      // Clear any pending stagger timers
      groupEls.forEach(group => {
        Array.from(group.children).forEach(child => {
          if (child._crStaggerTimer != null) clearTimeout(child._crStaggerTimer)
        })
      })
    }
  }, [isMobile])
  // ────────────────────────────────────────────────────────────────────────────

  // ── Scroll-car refs ─────────────────────────────────────────────────────────
  const pointsRef      = useRef([])
  const carRef         = useRef(null)
  const carInnerRef    = useRef(null)
  const tireMarksSvg   = useRef(null)
  const rl1 = useRef(null), rl2 = useRef(null), rl3 = useRef(null), rl4 = useRef(null)
  const rafRef         = useRef(null)
  const donutRafRef    = useRef(null)
  const stopTimerR     = useRef(null)
  const tireIntervalR  = useRef(null)
  const donutStopR     = useRef(null)
  const isDonuting     = useRef(false)
  const lastAngle      = useRef(90)
  const lastX          = useRef(0)
  const lastY          = useRef(0)
  const donutStart     = useRef(0)
  const donutBaseAngle = useRef(0)
  const donutPivotX    = useRef(0)
  const donutPivotY    = useRef(0)
  const donutCarX         = useRef(0)
  const donutCarY         = useRef(0)
  const scrollLastY       = useRef(0)
  const scrollDirRef      = useRef(1)
  const facingAngleRef    = useRef(90)
  const isSlidingRef      = useRef(false)
  const isRecoveringRef   = useRef(false)
  const slideRafRef       = useRef(null)
  const recoverRafRef     = useRef(null)
  const speechRef         = useRef(null)
  const qmarksRef         = useRef(null)
  const sectionLabelRef   = useRef(null)
  const sectionRefsArr    = useRef([])
  const activeSectionRef  = useRef(-1)
  const ctaSectionRef     = useRef(null)
  const footerRef         = useRef(null)
  const wrapperRef        = useRef(null)
  const lastYDoc          = useRef(0)
  const flashTimerR       = useRef(null)
  const faqHL1Ref         = useRef(null)
  const faqHL2Ref         = useRef(null)
  const faqBeam1Ref       = useRef(null)
  const faqBeam2Ref       = useRef(null)
  const isTurningRef      = useRef(false)
  const turnRafRef        = useRef(null)
  const carFacingUpRef    = useRef(false)

  useEffect(() => {
    if (!isMobile) {
      // ── Desktop: scroll-driven vertical animation ──────────────────────
      function init(mobile = false) {
        const navH = document.querySelector('.nav')?.offsetHeight || 155
        let yEndDoc
        if (!mobile && footerRef.current) {
          const r = footerRef.current.getBoundingClientRect()
          yEndDoc = r.top + window.scrollY - 18
        }
        const pts = cBuildPoints(mobile, navH, yEndDoc)
        pointsRef.current = pts
        const p = cPoly(pts)
        ;[rl1, rl2, rl3, rl4].forEach(r => r.current?.setAttribute('points', p))
        scrollLastY.current    = window.scrollY
        scrollDirRef.current   = 1
        facingAngleRef.current = 90
        lastYDoc.current       = 0
        carFacingUpRef.current = false
        if (isTurningRef.current) stopUTurn()
        tick(0)
      }
      function tick(p) {
        if (!carRef.current || !carInnerRef.current || !pointsRef.current.length) return
        const { x, y: yDoc, angle } = pointsRef.current[Math.min(Math.round(p * C_STEPS), C_STEPS)]
        const y = yDoc - window.scrollY  // viewport Y for the fixed car
        // Use document-coordinate delta for facing (viewport delta is ~0 so velocity would break)
        const dx = x - lastX.current, dyDoc = yDoc - lastYDoc.current
        const dist = Math.sqrt(dx * dx + dyDoc * dyDoc)
        if (dist > 0.5) {
          const movAngle = Math.atan2(dyDoc, dx) * 180 / Math.PI
          const diff = ((movAngle - facingAngleRef.current) % 360 + 540) % 360 - 180
          facingAngleRef.current += diff * 0.25
        }
        lastAngle.current = angle; lastX.current = x; lastY.current = y; lastYDoc.current = yDoc
        carRef.current.style.transform = `translate(${x}px,${y}px)`
        carRef.current.style.opacity   = '1'
        carInnerRef.current.style.transform = `rotate(${facingAngleRef.current}deg)`
        if (sectionLabelRef.current) sectionLabelRef.current.style.top = `${y}px`
      }
      function dropMark() {
        const svg = tireMarksSvg.current; if (!svg) return
        const cx = donutCarX.current, cy = donutCarY.current
        const elapsed  = Date.now() - donutStart.current
        const spinRad  = -(elapsed / C_DONUT_SPEED) * Math.PI * 2
        const totalRad = donutBaseAngle.current + spinRad
        const ns = 'http://www.w3.org/2000/svg'
        C_REAR_TYRES.forEach(({ lx, ly }) => {
          const wx = cx + lx * Math.cos(totalRad) - ly * Math.sin(totalRad)
          const wy = cy + lx * Math.sin(totalRad) + ly * Math.cos(totalRad)
          const el = document.createElementNS(ns, 'ellipse')
          el.setAttribute('cx', wx.toFixed(1)); el.setAttribute('cy', wy.toFixed(1))
          el.setAttribute('rx', '3.5'); el.setAttribute('ry', '1.8')
          const td = (totalRad * 180 / Math.PI) + 90
          el.setAttribute('transform', `rotate(${td.toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)})`)
          el.setAttribute('fill', 'rgba(0,0,0,0.75)'); el.style.opacity = '1'
          svg.appendChild(el)
          requestAnimationFrame(() => { el.style.transition = 'opacity 2s ease-out'; el.style.opacity = '0' })
          setTimeout(() => el.remove(), 2100)
        })
      }
      function stopDonut() {
        if (!carInnerRef.current || !carRef.current) return
        isDonuting.current = false
        cancelAnimationFrame(donutRafRef.current)
        clearInterval(tireIntervalR.current); clearTimeout(donutStopR.current)
        carRef.current.style.transform      = `translate(${lastX.current}px,${lastY.current}px)`
        carInnerRef.current.style.transform = `rotate(${facingAngleRef.current}deg)`
      }
      function startDonut() {
        if (!carInnerRef.current || !carRef.current || isDonuting.current) return
        isDonuting.current = true; donutStart.current = Date.now()
        const baseAngle = facingAngleRef.current
        const baseRad   = baseAngle * Math.PI / 180
        donutBaseAngle.current = baseRad
        donutPivotX.current = lastX.current + C_FRONT_AXLE * Math.cos(baseRad)
        donutPivotY.current = lastY.current + C_FRONT_AXLE * Math.sin(baseRad)
        donutCarX.current = lastX.current; donutCarY.current = lastY.current
        function spinFrame() {
          if (!isDonuting.current || !carInnerRef.current || !carRef.current) return
          const elapsed = Date.now() - donutStart.current
          const spinRad = -(elapsed / C_DONUT_SPEED) * Math.PI * 2
          const totalRad = baseRad + spinRad
          const cx = donutPivotX.current - C_FRONT_AXLE * Math.cos(totalRad)
          const cy = donutPivotY.current - C_FRONT_AXLE * Math.sin(totalRad)
          donutCarX.current = cx; donutCarY.current = cy
          carRef.current.style.transform      = `translate(${cx}px,${cy}px)`
          carInnerRef.current.style.transform = `rotate(${baseAngle - (elapsed / C_DONUT_SPEED) * 360}deg)`
          donutRafRef.current = requestAnimationFrame(spinFrame)
        }
        donutRafRef.current   = requestAnimationFrame(spinFrame)
        tireIntervalR.current = setInterval(dropMark, C_TIRE_INTERVAL)
        donutStopR.current    = setTimeout(stopDonut, 30000)
      }
      function stopUTurn() {
        isTurningRef.current = false
        cancelAnimationFrame(turnRafRef.current)
      }
      // atEnd=true  → spinning at road end, car will face up  (90° → -90°)
      // atEnd=false → spinning at road start, car will face down (-90° → 90°)
      function startUTurn(atEnd) {
        if (isTurningRef.current || !carRef.current || !carInnerRef.current) return
        if (isDonuting.current) stopDonut()
        isTurningRef.current = true
        const baseAngle = facingAngleRef.current
        const baseRad   = baseAngle * Math.PI / 180
        const pivotX    = lastX.current + C_FRONT_AXLE * Math.cos(baseRad)
        const pivotY    = lastY.current + C_FRONT_AXLE * Math.sin(baseRad)
        const turnDur   = 1600
        const t0 = Date.now()
        let lastMarkAt  = 0
        function turnFrame() {
          if (!isTurningRef.current) return
          const elapsed = Date.now() - t0
          const t = Math.min(1, elapsed / turnDur)
          const ease = t < 0.5 ? 2*t*t : -1 + (4-2*t)*t
          const spinRad  = -ease * Math.PI
          const totalRad = baseRad + spinRad
          const cx = pivotX - C_FRONT_AXLE * Math.cos(totalRad)
          const cy = pivotY - C_FRONT_AXLE * Math.sin(totalRad)
          const curAngle = baseAngle - ease * 180
          carRef.current.style.transform      = `translate(${cx}px,${cy}px)`
          carInnerRef.current.style.transform = `rotate(${curAngle}deg)`
          facingAngleRef.current = curAngle
          // Drop tire marks at burnout interval
          const now = Date.now()
          if (now - lastMarkAt > C_TIRE_INTERVAL && tireMarksSvg.current) {
            lastMarkAt = now
            const svg = tireMarksSvg.current, ns = 'http://www.w3.org/2000/svg'
            C_REAR_TYRES.forEach(({ lx, ly }) => {
              const wx = cx + lx * Math.cos(totalRad) - ly * Math.sin(totalRad)
              const wy = cy + lx * Math.sin(totalRad) + ly * Math.cos(totalRad)
              const el = document.createElementNS(ns, 'ellipse')
              el.setAttribute('cx', wx.toFixed(1)); el.setAttribute('cy', wy.toFixed(1))
              el.setAttribute('rx', '3.5'); el.setAttribute('ry', '1.8')
              const td = (totalRad * 180 / Math.PI) + 90
              el.setAttribute('transform', `rotate(${td.toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)})`)
              el.setAttribute('fill', 'rgba(0,0,0,0.75)'); el.style.opacity = '1'
              svg.appendChild(el)
              requestAnimationFrame(() => { el.style.transition = 'opacity 2s ease-out'; el.style.opacity = '0' })
              setTimeout(() => el.remove(), 2100)
            })
          }
          if (t < 1) {
            turnRafRef.current = requestAnimationFrame(turnFrame)
          } else {
            isTurningRef.current    = false
            carFacingUpRef.current  = atEnd
            lastX.current = cx; lastY.current = cy
            flashHeadlights()
          }
        }
        turnRafRef.current = requestAnimationFrame(turnFrame)
      }
      // Decide what idle animation to play: U-turn at endpoints, donut elsewhere
      function scheduleIdle() {
        clearTimeout(stopTimerR.current)
        stopTimerR.current = setTimeout(() => {
          if (isSlidingRef.current || isRecoveringRef.current || isTurningRef.current) return
          const p = getScrollProgress()
          if      (p >= 0.98 && !carFacingUpRef.current) startUTurn(true)
          else if (p <= 0.02 &&  carFacingUpRef.current) startUTurn(false)
          else startDonut()
        }, 3000)
      }
      function update() {
        const max = document.documentElement.scrollHeight - window.innerHeight
        tick(max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0)
      }
      function getScrollProgress() {
        const max = document.documentElement.scrollHeight - window.innerHeight
        return max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0
      }
      function showBubble() {
        if (!speechRef.current) return
        speechRef.current.style.animation = 'none'
        void speechRef.current.offsetHeight
        speechRef.current.style.animation = 'faq-bubble-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards'
      }
      function hideBubble() {
        if (!speechRef.current) return
        speechRef.current.style.animation = 'none'
        speechRef.current.style.opacity = '0'
      }
      function pauseQmarks() { if (qmarksRef.current) qmarksRef.current.style.visibility = 'hidden' }
      function resumeQmarks() { if (qmarksRef.current) qmarksRef.current.style.visibility = '' }
      function triggerSlideOff() {
        if (isSlidingRef.current || isRecoveringRef.current) return
        const startX = isDonuting.current ? donutCarX.current : isTurningRef.current ? lastX.current : lastX.current
        const startY = isDonuting.current ? donutCarY.current : lastY.current
        if (isDonuting.current) stopDonut()
        if (isTurningRef.current) stopUTurn()
        cancelAnimationFrame(rafRef.current)
        clearTimeout(stopTimerR.current)
        isSlidingRef.current = true

        const roadRad     = lastAngle.current * Math.PI / 180
        const perpX       = -Math.sin(roadRad), perpY = Math.cos(roadRad)
        const startFacing = facingAngleRef.current

        showBubble()
        pauseQmarks()
        clearTimeout(sectionFadeTimer)
        if (sectionLabelRef.current) sectionLabelRef.current.style.opacity = '0'

        // Skid immediately — ease-out (fast break, tyres bite and decelerate)
        const endX      = startX + perpX * 190
        const endY      = startY + perpY * 190
        const endFacing = startFacing - 38
        const dur = 480, t0 = Date.now()
        function slideFrame() {
          const t    = Math.min(1, (Date.now() - t0) / dur)
          const ease = 1 - (1 - t) * (1 - t)  // ease-out
          if (carRef.current)
            carRef.current.style.transform = `translate(${startX + (endX - startX) * ease}px,${startY + (endY - startY) * ease}px)`
          if (carInnerRef.current)
            carInnerRef.current.style.transform = `rotate(${startFacing + (endFacing - startFacing) * ease}deg)`
          if (t < 1) { slideRafRef.current = requestAnimationFrame(slideFrame) }
          else { isSlidingRef.current = false; setTimeout(() => startRecovery(endX, endY, endFacing), 160) }
        }
        slideRafRef.current = requestAnimationFrame(slideFrame)
      }
      function startRecovery(fromX, fromY, fromFacingDeg) {
        isRecoveringRef.current = true
        // Snap target road position once (don't chase scroll during recovery)
        const idx    = Math.min(Math.round(getScrollProgress() * C_STEPS), C_STEPS)
        const roadPt = pointsRef.current[idx]
        const toX = roadPt.x
        // roadPt.y is document-space; car is position:fixed so convert to viewport y
        const toY = roadPt.y - window.scrollY
        const toAngle = roadPt.angle
        // Approach angle: road direction + facingOffset so bezier arrives correctly
        const toApproachAngle = toAngle
        // Cubic bezier control points
        const dx = toX - fromX, dy = toY - fromY
        const ctrl   = Math.max(80, Math.sqrt(dx*dx + dy*dy) * 0.28)
        const fromRad = fromFacingDeg * Math.PI / 180
        const toRad   = toApproachAngle * Math.PI / 180
        const p1x = fromX + Math.cos(fromRad) * ctrl, p1y = fromY + Math.sin(fromRad) * ctrl
        const p2x = toX   - Math.cos(toRad)   * ctrl, p2y = toY   - Math.sin(toRad)   * ctrl
        function bez(t, a, b, c, d) { const u=1-t; return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d }
        function bezT(t, a, b, c, d) { const u=1-t; return 3*u*u*(b-a)+6*u*t*(c-b)+3*t*t*(d-c) }
        const finalFacing = toAngle
        const dur = 1600, t0 = Date.now()
        let bubbleHidden = false
        function recoverFrame() {
          const t    = Math.min(1, (Date.now() - t0) / dur)
          const ease = t < 0.5 ? 2*t*t : -1 + (4-2*t)*t
          const cx = bez(ease, fromX, p1x, p2x, toX)
          const cy = bez(ease, fromY, p1y, p2y, toY)
          // Car faces its direction of travel along the bezier
          const tx = bezT(ease, fromX, p1x, p2x, toX)
          const ty = bezT(ease, fromY, p1y, p2y, toY)
          const movingAngle = (tx !== 0 || ty !== 0) ? Math.atan2(ty, tx) * 180/Math.PI : finalFacing
          // Blend toward final road facing in last 20% to eliminate snap at handoff
          const blendT = Math.max(0, (t - 0.8) / 0.2)
          const diff = ((finalFacing - movingAngle) % 360 + 540) % 360 - 180
          const ca = movingAngle + diff * blendT
          facingAngleRef.current = ca
          if (carRef.current)
            carRef.current.style.transform = `translate(${cx}px,${cy}px)`
          if (carInnerRef.current)
            carInnerRef.current.style.transform = `rotate(${ca}deg)`
          if (t >= 0.45 && !bubbleHidden) { bubbleHidden = true; hideBubble() }
          if (t < 1) {
            recoverRafRef.current = requestAnimationFrame(recoverFrame)
          } else {
            isRecoveringRef.current = false
            // Settle at current scroll position (user may have scrolled during the 3s recovery)
            const curIdx = Math.min(Math.round(getScrollProgress() * C_STEPS), C_STEPS)
            const curPt  = pointsRef.current[curIdx]
            const curVY = curPt.y - window.scrollY
            lastX.current = curPt.x; lastY.current = curVY; lastYDoc.current = curPt.y; lastAngle.current = curPt.angle
            facingAngleRef.current = curPt.angle
            if (carRef.current)      carRef.current.style.transform      = `translate(${curPt.x}px,${curVY}px)`
            if (carInnerRef.current) carInnerRef.current.style.transform = `rotate(${facingAngleRef.current}deg)`
            resumeQmarks()
            updateSectionLabel()
            scheduleIdle()
          }
        }
        recoverRafRef.current = requestAnimationFrame(recoverFrame)
      }
      function flashHeadlights() {
        const h1 = faqHL1Ref.current, h2 = faqHL2Ref.current
        const b1 = faqBeam1Ref.current, b2 = faqBeam2Ref.current
        if (!h1 || !h2) return
        const normal = 'rgba(255,250,195,0.9)', bright = 'rgba(255,255,215,1.0)', dark = 'rgba(18,12,4,0.65)'
        function beams(on) { const op = on ? '1' : '0'; if (b1) b1.style.opacity = op; if (b2) b2.style.opacity = op }
        h1.setAttribute('fill', dark);   h2.setAttribute('fill', dark);   beams(false)
        setTimeout(() => {
          h1.setAttribute('fill', bright); h2.setAttribute('fill', bright); beams(true)
          setTimeout(() => {
            h1.setAttribute('fill', dark);   h2.setAttribute('fill', dark);   beams(false)
            setTimeout(() => {
              h1.setAttribute('fill', bright); h2.setAttribute('fill', bright); beams(true)
              setTimeout(() => {
                h1.setAttribute('fill', normal); h2.setAttribute('fill', normal); beams(false)
              }, 220)
            }, 110)
          }, 220)
        }, 110)
      }
      init(); update()
      // Recalculate after fonts swap in — display:swap can shorten the page
      // and leave the road drawn past the (moved-up) footer.
      document.fonts.ready.then(() => { init(false); update() })
      // ── Section label ─────────────────────────────────────────────────────
      let sectionFadeTimer = null
      function updateSectionLabel() {
        const carY = lastY.current
        // If car has entered the CTA zone, clear label and flip ? marks to white
        const ctaEl = ctaSectionRef.current
        if (ctaEl && ctaEl.getBoundingClientRect().top <= carY) {
          if (qmarksRef.current) qmarksRef.current.style.filter = 'invert(1)'
          if (activeSectionRef.current !== -1) {
            activeSectionRef.current = -1
            clearTimeout(sectionFadeTimer)
            if (sectionLabelRef.current) sectionLabelRef.current.style.opacity = '0'
          }
          return
        }
        if (qmarksRef.current) qmarksRef.current.style.filter = ''
        let newActive = -1
        sectionRefsArr.current.forEach((el, i) => {
          if (el && el.getBoundingClientRect().top <= carY) newActive = i
        })
        if (newActive === activeSectionRef.current) return
        activeSectionRef.current = newActive
        const label = sectionLabelRef.current
        if (!label) return
        clearTimeout(sectionFadeTimer)
        label.style.opacity = '0'
        if (newActive < 0) return
        sectionFadeTimer = setTimeout(() => {
          label.textContent = SECTIONS[newActive].title
          label.style.opacity = '1'
        }, 320)
      }

      // Velocity accumulator: decays each event, fires only on hard sustained scroll
      let scrollVel = 0
      let slideReady = false
      setTimeout(() => { slideReady = true }, 1200)
      const onScroll = () => {
        const currentY = window.scrollY
        const delta    = currentY - scrollLastY.current
        scrollLastY.current = currentY
        if (isSlidingRef.current || isRecoveringRef.current) return
        // Accumulate speed; decay toward 0 each event so brief spikes don't trigger
        scrollVel = scrollVel * 0.55 + Math.abs(delta) * 0.45
        if (slideReady && scrollVel > 220) { scrollVel = 0; triggerSlideOff(); return }
        if (Math.abs(delta) > 2) {
          scrollDirRef.current = delta > 0 ? 1 : -1
        }
        if (isDonuting.current) stopDonut()
        if (isTurningRef.current) stopUTurn()
        clearTimeout(stopTimerR.current); clearTimeout(flashTimerR.current)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(update)
        scheduleIdle()
        flashTimerR.current = setTimeout(flashHeadlights, 49000)
        updateSectionLabel()
      }
      const onResize = () => { if (!isSlidingRef.current && !isRecoveringRef.current) { init(false); update() } }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize)
      scheduleIdle()
      updateSectionLabel()
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        clearTimeout(stopTimerR.current); clearTimeout(donutStopR.current); clearTimeout(flashTimerR.current); clearTimeout(sectionFadeTimer)
        clearInterval(tireIntervalR.current)
        cancelAnimationFrame(rafRef.current); cancelAnimationFrame(donutRafRef.current)
        cancelAnimationFrame(slideRafRef.current); cancelAnimationFrame(recoverRafRef.current)
        cancelAnimationFrame(turnRafRef.current); isTurningRef.current = false
        if (tireMarksSvg.current) tireMarksSvg.current.innerHTML = ''
        if (carRef.current) carRef.current.style.opacity = '0'
      }
    } else {
      // ── Mobile: scroll-driven horizontal car at nav bottom edge ──────────
      ;[rl1, rl2, rl3, rl4].forEach(r => r.current?.setAttribute('points', ''))

      const navEl = document.querySelector('.nav')
      const navH  = navEl?.offsetHeight || 110
      // carRef is 65px wide, marginLeft=-33; xMin=45 keeps ~12px margin from each edge
      const xMin = 45
      const xMax = window.innerWidth - 45
      // carRef marginTop:-16px → translateY=navH lands car wheels on nav bottom line
      const y = navH

      let lastScrollY = window.scrollY
      let facingRight = true

      function getMobileX() {
        const max = document.documentElement.scrollHeight - window.innerHeight
        if (max <= 0) return xMin
        return xMin + Math.max(0, Math.min(1, window.scrollY / max)) * (xMax - xMin)
      }

      function updateMobile() {
        const sy = window.scrollY
        if (sy > lastScrollY + 1)      facingRight = true
        else if (sy < lastScrollY - 1) facingRight = false
        lastScrollY = sy
        const x = getMobileX()
        if (carRef.current) {
          carRef.current.style.transform = `translate(${x}px,${y}px)`
          carRef.current.style.opacity   = '1'
        }
        if (carInnerRef.current) {
          carInnerRef.current.style.transform = facingRight ? 'scaleX(1)' : 'scaleX(-1)'
        }
      }

      updateMobile()
      const onScroll = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(updateMobile)
      }
      window.addEventListener('scroll', onScroll, { passive: true })

      return () => {
        window.removeEventListener('scroll', onScroll)
        cancelAnimationFrame(rafRef.current)
        if (carRef.current) carRef.current.style.opacity = '0'
      }
    }
  }, [isMobile])
  // ────────────────────────────────────────────────────────────────────────────

  function toggle(key) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div suppressHydrationWarning style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif', position: 'relative' }}>
      <style>{`
        @keyframes faq-qfloat {
          0%   { opacity: 0;    transform: translateY(0);     }
          18%  { opacity: 0.82; transform: translateY(-3px);  }
          58%  { opacity: 0.82; transform: translateY(-8px);  }
          100% { opacity: 0;    transform: translateY(-16px); }
        }
        @keyframes faq-bubble-pop {
          0%   { opacity: 0; transform: scale(0.6) translateY(5px);  }
          65%  { opacity: 1; transform: scale(1.07) translateY(-1px); }
          100% { opacity: 1; transform: scale(1) translateY(0);      }
        }
        .cr-fade {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
        }
        .cr-fade.cr-visible {
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .cr-fade { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      {/* Road — in page flow, scrolls with content */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 8, overflow: 'visible' }}>
        <polyline ref={rl1} fill="none" stroke="rgba(130,110,80,0.12)"  strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl2} fill="none" stroke="rgba(160,135,95,0.2)"  strokeWidth="7"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl3} fill="none" stroke="rgba(18,14,10,0.88)"   strokeWidth="5"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl4} fill="none" stroke="rgba(197,168,130,0.6)" strokeWidth="1"  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 12" />
      </svg>

      {/* Fixed tire marks */}
      <svg ref={tireMarksSvg} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }} />

      {/* Fixed car */}
      <div ref={carRef} style={{
        position: 'fixed', top: 0, left: 0,
        width:       isMobile ? '65px'    : '46px',
        height:      isMobile ? '26px'    : '21px',
        marginLeft:  isMobile ? '-33px'   : '-23px',
        marginTop:   isMobile ? '-26px'   : '-10.5px',
        willChange: 'transform', pointerEvents: 'none',
        zIndex: isMobile ? (menuOpen ? 98 : 101) : 55, opacity: 0, overflow: 'visible',
      }}>
        {/* Speech bubble — desktop only, shown on fast scroll */}
        {!isMobile && (
          <div ref={speechRef} style={{
            position: 'absolute',
            left: 'calc(100% + 10px)',
            top: '-20px',
            background: '#FAFAF8',
            border: '0.5px solid rgba(197,168,130,0.5)',
            borderRadius: '8px 8px 8px 2px',
            padding: '5px 12px',
            whiteSpace: 'nowrap',
            fontSize: '11.5px',
            fontFamily: 'var(--font-inter),sans-serif',
            fontWeight: '600',
            fontStyle: 'normal',
            letterSpacing: '0.04em',
            color: '#8B1F1F',
            opacity: 0,
            pointerEvents: 'none',
            transformOrigin: 'left center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.09)',
          }}>
            SLOW DOWN! SLOW DOWN!
            {/* Tail border */}
            <span style={{ position:'absolute', left:'-7px', top:'50%', transform:'translateY(-50%)', width:0, height:0, borderTop:'5px solid transparent', borderBottom:'5px solid transparent', borderRight:'7px solid rgba(197,168,130,0.5)' }} />
            {/* Tail fill */}
            <span style={{ position:'absolute', left:'-6px', top:'50%', transform:'translateY(-50%)', width:0, height:0, borderTop:'4px solid transparent', borderBottom:'4px solid transparent', borderRight:'6px solid #FAFAF8' }} />
          </div>
        )}
        {/* Question marks — desktop only */}
        {!isMobile && (
          <div ref={qmarksRef}>
          {[
            { top: '-26px', left: '2px',  delay: '0s'     },
            { top: '-34px', left: '17px', delay: '0.93s'  },
            { top: '-24px', left: '32px', delay: '1.87s'  },
          ].map((pos, i) => (
            <span key={i} style={{
            position: 'absolute', top: pos.top, left: pos.left,
            fontFamily: 'var(--font-cormorant),serif', fontSize: '15px', fontWeight: '300',
            color: 'rgba(0,0,0,0.72)',
            textShadow: '0 1px 3px rgba(255,255,255,0.5)',
            opacity: 0,
            animation: `faq-qfloat 2.8s ease-in-out infinite`,
            animationDelay: pos.delay,
            lineHeight: 1,
          }}>?</span>
          ))}
          </div>
        )}
        <div ref={carInnerRef} style={{ position: 'relative', width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isMobile ? (
            /* ── Mobile: car photo 65×26 + exhaust overlay ── */
            <>
              <Image src="/IMG_5513.png" alt="" width={65} height={26} style={{ objectFit: 'contain', display: 'block' }} priority unoptimized />
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '65px', height: '26px', overflow: 'visible', pointerEvents: 'none' }}>
                {[0, 0.42, 0.84].map(d => (
                  <circle key={d} cx="5" cy="21" r="1" fill="rgba(170,170,170,0.45)"
                    style={{ animation: 'faq-exhaust 1.2s ease-out infinite', animationDelay: `${d}s`, transformBox: 'fill-box', transformOrigin: 'center' }} />
                ))}
              </svg>
            </>
          ) : (
            /* ── Desktop: F40 top-down view ── */
            <svg viewBox="0 0 56 26" width="46" height="21" style={{ display: 'block', overflow: 'visible' }}>
            <polygon ref={faqBeam1Ref} points="53,4.75 257,-55 257,28"   fill="rgba(197,168,130,0.38)" style={{ opacity: 0, transition: 'opacity 0.04s' }} />
            <polygon ref={faqBeam2Ref} points="53,21.25 257,-4 257,77"  fill="rgba(197,168,130,0.38)" style={{ opacity: 0, transition: 'opacity 0.04s' }} />
            <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.45)" />
            {/* Exhaust puffs — two rear pipes, 3 staggered puffs each */}
            {[0, 0.42, 0.84].map(d => (
              <circle key={`ea${d}`} cx="2" cy="9"  r="1" fill="rgba(175,175,175,0.45)"
                style={{ animation: 'faq-exhaust 1.2s ease-out infinite', animationDelay: `${d}s`, transformBox: 'fill-box', transformOrigin: 'center' }} />
            ))}
            {[0, 0.42, 0.84].map(d => (
              <circle key={`eb${d}`} cx="2" cy="17" r="1" fill="rgba(175,175,175,0.45)"
                style={{ animation: 'faq-exhaust 1.2s ease-out infinite', animationDelay: `${d}s`, transformBox: 'fill-box', transformOrigin: 'center' }} />
            ))}
            <rect x="3"  y="-1"  width="9" height="11" rx="2" fill="#111" />
            <rect x="3"  y="16"  width="9" height="11" rx="2" fill="#111" />
            <rect x="45" y="0"   width="8" height="9"  rx="2" fill="#111" />
            <rect x="45" y="17"  width="8" height="9"  rx="2" fill="#111" />
            <path d="M55,13 C53,9 49,6.5 46,5.5 C41,4.5 35,4.5 28,5 C21,5.5 14,3 8,1 C5,0.5 3,2 3,4.5 L3,21.5 C3,24 5,25.5 8,25 C14,23 21,20.5 28,21 C35,21.5 41,21.5 46,20.5 C49,19.5 53,17 55,13Z" fill="#CC0000" />
            <path d="M46,5.5 C38,6.2 30,6.8 22,7.2 C16,7.5 9,6.2 4.5,5.5"    fill="none" stroke="rgba(255,80,80,0.2)" strokeWidth="1" />
            <path d="M46,20.5 C38,19.8 30,19.2 22,18.8 C16,18.5 9,19.8 4.5,20.5" fill="none" stroke="rgba(255,80,80,0.2)" strokeWidth="1" />
            <path d="M43,7.5 C47,9.5 48,11 48,13 C48,15 47,16.5 43,18.5 L36,17.5 L36,8.5Z" fill="rgba(120,175,205,0.45)" stroke="rgba(200,175,135,0.3)" strokeWidth="0.6" />
            <path d="M36,8.5 L43,7.5 L43,18.5 L36,17.5 L24,17 L24,9Z" fill="rgba(55,0,0,0.55)" />
            <path d="M24,9 L24,17 L18,16.5 L18,9.5Z" fill="rgba(120,175,205,0.22)" stroke="rgba(200,175,135,0.15)" strokeWidth="0.5" />
            <path d="M19,5.5 C22,5 26,5 29,5.5 L29,8.5 C26,9 22,9 19,8.5Z"       fill="rgba(0,0,0,0.6)" />
            <path d="M19,17.5 C22,17 26,17 29,17.5 L29,20.5 C26,21 22,21 19,20.5Z" fill="rgba(0,0,0,0.6)" />
            <rect x="8" y="8.2"  width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
            <rect x="8" y="10"   width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
            <rect x="8" y="11.8" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
            <rect x="8" y="13.6" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
            <rect x="8" y="15.4" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
            <rect x="8" y="17.2" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
            <rect x="5"   y="7"  width="3" height="5"   rx="0.8" fill="rgba(220,55,55,0.95)" />
            <rect x="5"   y="14" width="3" height="5"   rx="0.8" fill="rgba(220,55,55,0.95)" />
            <rect x="4.5" y="12" width="3" height="2.5" rx="0.6" fill="rgba(185,40,40,0.75)" />
            <rect x="0.5" y="-6"   width="4.5" height="38" rx="1.5" fill="#1c1c1c" />
            <rect x="0.5" y="-7"   width="8"   height="5.5" rx="1.2" fill="#242424" />
            <rect x="0.5" y="27.5" width="8"   height="5.5" rx="1.2" fill="#242424" />
            <rect x="3.5" y="4.5"  width="9"   height="2.5" rx="0.8" fill="#181818" />
            <rect x="3.5" y="19"   width="9"   height="2.5" rx="0.8" fill="#181818" />
            <rect ref={faqHL1Ref} x="49" y="1"    width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
            <rect ref={faqHL2Ref} x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
          </svg>
          )}
        </div>
      </div>

      {/* Section label — outside carRef so it doesn't oscillate with the car's sine path */}
      {!isMobile && (
        <span ref={sectionLabelRef} style={{
          position: 'fixed', top: 0, left: 'calc(8vw + 37px)',
          transform: 'translateY(-50%)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-playfair),serif',
          fontSize: '18px', fontWeight: '400', fontStyle: 'italic',
          color: '#1a1a1a', opacity: 0,
          transition: 'opacity 0.32s ease',
          lineHeight: 1, pointerEvents: 'none', zIndex: 55,
        }} />
      )}

      <SiteNav
        links={[
          { href: '/',         label: 'Home' },
          { href: '/#events',  label: 'Events' },
          { href: '/#contact', label: 'Contact' },
          { href: '/faq',      label: 'FAQ' },
        ]}
        onMenuChange={setMenuOpen}
      />

      {/* Hero */}
      <section style={{ minHeight: 'clamp(420px,60vh,560px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(140px,16vw,200px) 2rem clamp(4rem,8vw,6rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background image */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src="/faq-page.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 55%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,15,10,0.85) 0%, rgba(8,15,10,0.72) 50%, rgba(8,15,10,0.9) 100%)' }} />
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />
        <div ref={fadeHeroLabelRef} style={{ position: 'relative', zIndex: 1, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '2rem', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          <span style={{ display: 'inline-block', width: '24px', height: '0.5px', background: 'rgba(197,168,130,0.5)' }} />
          Canvas Routes
          <span style={{ display: 'inline-block', width: '24px', height: '0.5px', background: 'rgba(197,168,130,0.5)' }} />
        </div>
        <h1 ref={fadeHeroH1Ref} style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3rem,6.5vw,5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.0, marginBottom: '1.5rem', letterSpacing: '-0.02em', textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}>
          Frequently Asked<br />
          <em style={{ fontStyle: 'italic', color: '#F5F1EC' }}>Questions</em>
        </h1>
        <div ref={fadeHeroDividerRef} style={{ position: 'relative', zIndex: 1, width: '40px', height: '0.5px', background: 'rgba(197,168,130,0.6)', margin: '0 auto 1.75rem' }} />
        <p ref={fadeHeroSubtitleRef} style={{ position: 'relative', zIndex: 1, fontSize: '14px', color: 'rgba(245,241,236,0.65)', maxWidth: '360px', margin: '0 auto', lineHeight: '1.9', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.01em', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          From your first meet to the open road — answered.
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.25),transparent)' }} />
      </section>

      {/* Content */}
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: 'clamp(3.5rem,7vw,5.5rem) clamp(1.25rem,5vw,2.5rem) 2rem', position: 'relative', zIndex: 6 }}>
        {isMobile ? (
          /* Mobile: stacked, section label above items */
          SECTIONS.map((section, si) => (
            <div key={si} ref={el => sectionRefsArr.current[si] = el} style={{ marginBottom: '4rem' }}>
              <div ref={el => fadeSectionHeadRefs.current[si] = el} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontFamily: 'var(--font-playfair),serif', fontSize: 'clamp(1.25rem,4vw,1.5rem)', fontWeight: '400', fontStyle: 'italic', color: '#1a1a1a', lineHeight: 1 }}>{section.title}</div>
                <div style={{ flex: 1, height: '0.5px', background: 'rgba(197,168,130,0.3)' }} />
              </div>
              <div ref={el => fadeAccordionRefs.current[si] = el}>
                {section.items.map((item, ii) => (
                  <AccordionItem key={`${si}-${ii}`} item={item} isOpen={!!open[`${si}-${ii}`]} onToggle={() => toggle(`${si}-${ii}`)} />
                ))}
              </div>
            </div>
          ))
        ) : (
          /* Desktop: 2-col grid, label sticky in its own row */
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', columnGap: 'clamp(3rem,5vw,5rem)', rowGap: '4rem', alignItems: 'start' }}>
            {SECTIONS.map((section, si) => (
              <React.Fragment key={si}>
                {/* Label column — intentionally empty, car carries the heading */}
                <div />

                {/* Accordion items */}
                <div ref={el => { sectionRefsArr.current[si] = el; fadeAccordionRefs.current[si] = el }}>
                  {section.items.map((item, ii) => (
                    <AccordionItem key={`${si}-${ii}`} item={item} isOpen={!!open[`${si}-${ii}`]} onToggle={() => toggle(`${si}-${ii}`)} />
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div ref={ctaSectionRef} style={{ background: '#0F1E14', position: 'relative', zIndex: 6, textAlign: 'center', padding: 'clamp(3rem,6vw,5rem) 2rem' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.45),transparent)' }} />
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.2 }}>
          Still have questions?
        </div>
        <div style={{ width: '28px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.25rem' }} />
        <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.5)', lineHeight: '1.85', maxWidth: '340px', margin: '0 auto 1.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
          Reach out at{' '}
          <a href="mailto:info@canvasroutes.com" style={{ color: '#c5a882', textDecoration: 'none' }}>info@canvasroutes.com</a>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <a href="https://www.instagram.com/canvasroutes" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', border: '0.5px solid rgba(197,168,130,0.3)', color: 'rgba(245,241,236,0.6)', textDecoration: 'none', transition: 'border-color 0.18s, color 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197,168,130,0.7)'; e.currentTarget.style.color = '#c5a882' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,168,130,0.3)'; e.currentTarget.style.color = 'rgba(245,241,236,0.6)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/share/1B8GXiPHUe/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', border: '0.5px solid rgba(197,168,130,0.3)', color: 'rgba(245,241,236,0.6)', textDecoration: 'none', transition: 'border-color 0.18s, color 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197,168,130,0.7)'; e.currentTarget.style.color = '#c5a882' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(197,168,130,0.3)'; e.currentTarget.style.color = 'rgba(245,241,236,0.6)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </a>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </div>

      {/* Footer */}
      <div ref={footerRef} style={{ position: 'relative', zIndex: 6, padding: '2rem clamp(1.25rem,5vw,2.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <p style={{ fontSize: '11px', color: '#aaa', fontFamily: 'var(--font-inter),sans-serif' }}>© 2026 Canvas Routes. Montreal, QC.</p>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <Link href="/privacy" style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Terms</Link>
          <Link href="/partners" style={{ fontSize: '11px', color: '#aaa', textDecoration: 'none' }}>Partner with us</Link>
        </div>
      </div>

    </div>
  )
}
