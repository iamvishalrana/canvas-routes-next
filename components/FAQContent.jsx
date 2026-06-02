'use client'
import { useState, useEffect, useRef } from 'react'
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

// ── Scroll-car constants (same geometry as test page) ────────────────────────
const C_STEPS = 500
const C_NAV_H = 68
const C_DONUT_SPEED = 4500
const C_TIRE_INTERVAL = 90
const C_REAR_TYRES = [{ lx: -16.8, ly: -6.9 }, { lx: -16.8, ly: 6.9 }]
const C_FRONT_AXLE = 17

function cBuildPoints(isMobile, navH = C_NAV_H) {
  const vw = window.innerWidth, vh = window.innerHeight
  const cx  = isMobile ? vw * 0.82 : vw * 0.88
  const amp = isMobile ? vw * 0.06 : vw * 0.04
  const yStart = navH, yEnd = vh - 12, cycles = 2.5
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
  const [open, setOpen]       = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
  const halfDonutActiveRef = useRef(false)
  const halfDonutRafRef   = useRef(null)
  const facingOffsetRef   = useRef(0)   // 0 = forward, 180 = backward

  useEffect(() => {
    if (!isMobile) {
      // ── Desktop: scroll-driven vertical animation ──────────────────────
      function init(mobile = false) {
        const navH = document.querySelector('.nav')?.offsetHeight || 155
        const pts = cBuildPoints(mobile, navH)
        pointsRef.current = pts
        const p = cPoly(pts)
        ;[rl1, rl2, rl3, rl4].forEach(r => r.current?.setAttribute('points', p))
        scrollLastY.current      = window.scrollY
        scrollDirRef.current     = 1
        facingOffsetRef.current  = 0
        halfDonutActiveRef.current = false
        tick(0)
      }
      function tick(p) {
        if (!carRef.current || !carInnerRef.current || !pointsRef.current.length) return
        const { x, y, angle } = pointsRef.current[Math.min(Math.round(p * C_STEPS), C_STEPS)]
        lastAngle.current = angle; lastX.current = x; lastY.current = y
        carRef.current.style.transform = `translate(${x}px,${y}px)`
        carRef.current.style.opacity   = '1'
        if (!halfDonutActiveRef.current) {
          carInnerRef.current.style.transform = `rotate(${angle + facingOffsetRef.current}deg)`
        }
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
        carRef.current.style.transform = `translate(${lastX.current}px,${lastY.current}px)`
        if (!halfDonutActiveRef.current) {
          carInnerRef.current.style.transform = `rotate(${lastAngle.current + facingOffsetRef.current}deg)`
        }
      }
      function startHalfDonut() {
        if (halfDonutActiveRef.current) return
        if (isDonuting.current) stopDonut()
        halfDonutActiveRef.current = true
        const startAngle   = lastAngle.current + facingOffsetRef.current
        const targetOffset = facingOffsetRef.current === 0 ? 180 : 0
        const duration     = 650
        const t0           = Date.now()
        function halfFrame() {
          const t    = Math.min(1, (Date.now() - t0) / duration)
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
          if (carInnerRef.current) {
            carInnerRef.current.style.transform = `rotate(${startAngle - ease * 180}deg)`
          }
          if (t < 1) {
            halfDonutRafRef.current = requestAnimationFrame(halfFrame)
          } else {
            facingOffsetRef.current    = targetOffset
            halfDonutActiveRef.current = false
            if (carInnerRef.current) {
              carInnerRef.current.style.transform = `rotate(${lastAngle.current + facingOffsetRef.current}deg)`
            }
          }
        }
        halfDonutRafRef.current = requestAnimationFrame(halfFrame)
      }
      function startDonut() {
        if (!carInnerRef.current || !carRef.current || isDonuting.current) return
        if (halfDonutActiveRef.current) return
        isDonuting.current = true; donutStart.current = Date.now()
        const baseAngle = lastAngle.current + facingOffsetRef.current
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
      function update() {
        const max = document.documentElement.scrollHeight - window.innerHeight
        tick(max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0)
      }
      init(); update()
      const onScroll = () => {
        const currentY = window.scrollY
        const delta    = currentY - scrollLastY.current
        scrollLastY.current = currentY
        if (Math.abs(delta) > 2) {
          const newDir = delta > 0 ? 1 : -1
          if (newDir !== scrollDirRef.current && !halfDonutActiveRef.current) {
            startHalfDonut()
          }
          scrollDirRef.current = newDir
        }
        if (isDonuting.current) stopDonut()
        clearTimeout(stopTimerR.current)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(update)
        stopTimerR.current = setTimeout(startDonut, 600)
      }
      const onResize = () => { init(false); update() }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize)
      stopTimerR.current = setTimeout(startDonut, 1500)
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        clearTimeout(stopTimerR.current); clearTimeout(donutStopR.current)
        clearInterval(tireIntervalR.current)
        cancelAnimationFrame(rafRef.current); cancelAnimationFrame(donutRafRef.current)
        cancelAnimationFrame(halfDonutRafRef.current)
        if (tireMarksSvg.current) tireMarksSvg.current.innerHTML = ''
        if (carRef.current) carRef.current.style.opacity = '0'
      }
    } else {
      // ── Mobile: scroll-driven horizontal car at nav bottom edge ──────────
      ;[rl1, rl2, rl3, rl4].forEach(r => r.current?.setAttribute('points', ''))

      const navEl = document.querySelector('.nav')
      const navH  = navEl?.offsetHeight || 110
      // Full screen width: carRef is 50px wide, marginLeft=-25, so center at x=25 puts left edge at 0
      const xMin = 25
      const xMax = window.innerWidth - 25
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
    <div suppressHydrationWarning style={{ background: '#F5F1EC', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        @keyframes faq-qfloat {
          0%   { opacity: 0;    transform: translateY(0);     }
          18%  { opacity: 0.82; transform: translateY(-3px);  }
          58%  { opacity: 0.82; transform: translateY(-8px);  }
          100% { opacity: 0;    transform: translateY(-16px); }
        }
      `}</style>

      {/* Fixed road */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5, overflow: 'visible' }}>
        <polyline ref={rl1} fill="none" stroke="rgba(130,110,80,0.12)"  strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl2} fill="none" stroke="rgba(160,135,95,0.2)"  strokeWidth="7"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl3} fill="none" stroke="rgba(18,14,10,0.88)"   strokeWidth="5"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl4} fill="none" stroke="rgba(197,168,130,0.6)" strokeWidth="1"  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 12" />
      </svg>

      {/* Fixed tire marks */}
      <svg ref={tireMarksSvg} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }} />

      {/* Fixed car */}
      <div ref={carRef} style={{
        position: 'fixed', top: 0, left: 0,
        width:       isMobile ? '50px'    : '46px',
        height:      isMobile ? '17px'    : '21px',
        marginLeft:  isMobile ? '-25px'   : '-23px',
        marginTop:   isMobile ? '-16px'   : '-10.5px',
        willChange: 'transform', pointerEvents: 'none',
        zIndex: isMobile ? 101 : 12, opacity: 0, overflow: 'visible',
      }}>
        {/* Question marks — desktop only */}
        {!isMobile && [
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
        <div ref={carInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isMobile ? (
            /* ── Mobile: sports car side profile, front = right ── */
            <svg viewBox="0 0 60 20" width="50" height="17" style={{ display: 'block', overflow: 'visible' }}>
              {/* Shadow */}
              <ellipse cx="30" cy="19.5" rx="26" ry="1.1" fill="rgba(0,0,0,0.14)" />
              {/* Tyres — drawn before body so body covers inner area */}
              <circle cx="11" cy="15" r="5"   fill="#111" />
              <circle cx="11" cy="15" r="3"   fill="#252525" />
              <circle cx="11" cy="15" r="1.2" fill="#111" />
              <circle cx="47" cy="15" r="4.5" fill="#111" />
              <circle cx="47" cy="15" r="2.7" fill="#252525" />
              <circle cx="47" cy="15" r="1.2" fill="#111" />
              {/* Body */}
              <path d="M 5,14 C 4,12 4,10 5.5,9 C 8,7.5 15,7 21,7 C 27,7 31,6.5 35,6.5 C 39,6.5 43,7 47,8 L 54,10 C 57,11.5 58,13 58,15 L 4,15 C 4,14.5 4.5,14 5,14 Z" fill="#CC0000" />
              {/* Cabin dark overlay */}
              <path d="M 17,9 L 21,7 C 27,7 31,6.5 35,6.5 C 39,6.5 43,7 46,8.5 L 43,12 L 19,12 Z" fill="rgba(10,8,8,0.45)" />
              {/* Windshield glass */}
              <path d="M 35,6.5 C 39,6.5 43,7 46,8.5 L 43,12 L 34,12 Z" fill="rgba(140,200,230,0.45)" />
              {/* Side window */}
              <path d="M 21,7 L 34,6.5 L 34,12 L 20,12 Z" fill="rgba(140,200,230,0.3)" />
              {/* Rear quarter glass */}
              <path d="M 17,9 L 21,7 L 20,12 L 16,12 Z" fill="rgba(140,200,230,0.2)" />
              {/* Door seam */}
              <line x1="32" y1="6.8" x2="31" y2="15" stroke="rgba(0,0,0,0.14)" strokeWidth="0.6" />
              {/* Headlight */}
              <path d="M 54,11 L 58,13 L 57.5,15 L 53.5,13.5 Z" fill="rgba(255,250,200,0.92)" />
              {/* Tail light */}
              <rect x="4" y="11" width="1.5" height="4" rx="0.4" fill="rgba(220,55,55,0.95)" />
              {/* Spoiler lip */}
              <rect x="4" y="14" width="2" height="1" rx="0.3" fill="rgba(80,0,0,0.8)" />
            </svg>
          ) : (
            /* ── Desktop: F40 top-down view ── */
            <svg viewBox="0 0 56 26" width="46" height="21" style={{ display: 'block', overflow: 'visible' }}>
            <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.45)" />
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
            <rect x="49" y="1"    width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
            <rect x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
          </svg>
          )}
        </div>
      </div>

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
      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: 'clamp(3rem,6vw,5rem) clamp(1.25rem,5vw,2.5rem) 2rem', position: 'relative', zIndex: 6 }}>
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
      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '0 clamp(1.25rem,5vw,2.5rem) 6rem', position: 'relative', zIndex: 6 }}>

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
