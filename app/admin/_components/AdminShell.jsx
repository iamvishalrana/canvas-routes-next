'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import GlobalSearch from './GlobalSearch'
import PullToRefresh from './PullToRefresh'

const SECTIONS = [
  {
    id: 'dashboard', label: 'Overview',
    items: [{ href: '/admin/dashboard', label: 'Dashboard' }],
  },
  {
    id: 'members', label: 'Members',
    items: [
      { href: '/admin/members',      label: 'Members'      },
      { href: '/admin/applications', label: 'Applications' },
      { href: '/admin/contacts',     label: 'Contacts'     },
      { href: '/admin/cars',         label: 'Cars'         },
    ],
  },
  {
    id: 'events', label: 'Events',
    items: [
      { href: '/admin/events',      label: 'Events'  },
      { href: '/admin/road-trips',  label: 'Routes'  },
    ],
  },
  {
    id: 'business', label: 'Business',
    items: [
      { href: '/admin/payments',    label: 'Payments'    },
      { href: '/admin/revenue',     label: 'Revenue'     },
      { href: '/admin/expenses',    label: 'Expenses'    },
      { href: '/admin/promo-codes', label: 'Promo Codes' },
    ],
  },
  {
    id: 'communication', label: 'Communication',
    items: [
      { href: '/admin/announcements', label: 'Announcements' },
      { href: '/admin/broadcasts',    label: 'Broadcasts'    },
    ],
  },
  {
    id: 'system', label: 'System',
    items: [
      { href: '/admin/links',        label: 'Link Library' },
      { href: '/admin/settings',     label: 'Settings'     },
      { href: '/admin/activity-log', label: 'Activity Log' },
      { href: '/admin/tools',        label: 'Tools'        },
    ],
  },
]

const COLLAPSIBLE_IDS = SECTIONS.filter(s => s.label).map(s => s.id)
const ALL_COLLAPSED = Object.fromEntries(COLLAPSIBLE_IDS.map(id => [id, true]))

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function CollapseAllIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 8 12 3 6 8"/>
      <polyline points="18 16 12 21 6 16"/>
    </svg>
  )
}

function Chevron({ open }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function BirthdaysWidget() {
  const [birthdays, setBirthdays] = useState(null)
  const [offset, setOffset] = useState(0) // months from today

  useEffect(() => {
    fetch('/api/admin/birthdays')
      .then(r => r.ok ? r.json() : [])
      .then(setBirthdays)
      .catch(() => setBirthdays([]))
  }, [])

  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const today = offset === 0 ? now.getDate() : null
  const monthName = MONTHS_SHORT[month]
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  // Build flat array of 42 slots (6 weeks × 7)
  const slots = []
  for (let i = 0; i < 42; i++) {
    const day = i - firstDow + 1
    slots.push(day >= 1 && day <= daysInMonth ? day : null)
  }
  // Trim trailing empty week
  while (slots.length > 35 && slots.slice(-7).every(d => d === null)) slots.splice(-7)

  const bdayDays = new Set((birthdays || []).filter(b => b.month - 1 === month).map(b => b.day))
  const monthBirthdays = (birthdays || []).filter(b => b.month - 1 === month).sort((a, b) => a.day - b.day)

  return (
    <div style={{ borderTop: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0, padding: '0.85rem 1.1rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: '0.4rem' }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', fontWeight: '600' }}>
          Birthdays
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setOffset(o => o - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(197,168,130,0.45)', padding: '2px 3px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontSize: '9px', color: 'rgba(197,168,130,0.45)', letterSpacing: '0.05em', minWidth: '48px', textAlign: 'center' }}>
            {monthName} {year}
          </span>
          <button onClick={() => setOffset(o => o + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(197,168,130,0.45)', padding: '2px 3px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Day-of-week row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '2px' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '8px', color: 'rgba(245,241,236,0.18)', fontWeight: '500', paddingBottom: '2px' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
        {slots.map((day, i) => {
          if (!day) return <div key={i} />
          const isToday = today !== null && day === today
          const hasBday = bdayDays.has(day)
          return (
            <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '3px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '17px', height: '17px', borderRadius: '50%', fontSize: '9px',
                background: isToday ? '#c5a882' : 'transparent',
                color: isToday ? '#0F1E14' : hasBday ? '#c5a882' : 'rgba(245,241,236,0.38)',
                fontWeight: isToday ? '700' : hasBday ? '600' : '400',
              }}>{day}</span>
              {hasBday && !isToday && (
                <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#c5a882', marginTop: '1px' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Month birthday list */}
      {birthdays === null ? (
        <div style={{ fontSize: '10px', color: 'rgba(245,241,236,0.2)', marginTop: '0.6rem' }}>Loading…</div>
      ) : monthBirthdays.length === 0 ? (
        <div style={{ fontSize: '10px', color: 'rgba(245,241,236,0.2)', marginTop: '0.6rem' }}>No birthdays in {monthName}</div>
      ) : (
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '0.5px solid rgba(197,168,130,0.08)', paddingTop: '0.5rem' }}>
          {monthBirthdays.map((b, i) => {
            const href = b.email
              ? `${b.type === 'member' ? '/admin/members' : '/admin/applications'}?q=${encodeURIComponent(b.email)}`
              : null
            const row = (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '11px', color: 'rgba(245,241,236,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name}
                </span>
                <span style={{ fontSize: '10px', color: b.daysUntil === 0 ? '#c5a882' : 'rgba(245,241,236,0.3)', flexShrink: 0 }}>
                  {b.daysUntil === 0 ? '🎂' : b.day}
                </span>
              </div>
            )
            return href ? (
              <Link key={i} href={href} style={{ textDecoration: 'none', borderRadius: '2px', padding: '1px 2px', margin: '0 -2px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(197,168,130,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{row}</Link>
            ) : <div key={i}>{row}</div>
          })}
        </div>
      )}
    </div>
  )
}

function NavContent({ pathname, onNavClick }) {
  const [collapsed, setCollapsed] = useState(ALL_COLLAPSED)
  const sectionRefs = useRef({})

  function toggle(id) {
    setCollapsed(p => {
      const next = { ...p, [id]: !p[id] }
      if (!next[id]) {
        // expanding — scroll the header into view after paint
        requestAnimationFrame(() => {
          sectionRefs.current[id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      }
      return next
    })
  }
  function collapseAll() { setCollapsed(ALL_COLLAPSED) }

  // Auto-expand the section containing the active page
  useEffect(() => {
    const activeSection = SECTIONS.find(s => s.label && s.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/')))
    if (activeSection) setCollapsed(p => ({ ...p, [activeSection.id]: false }))
  }, [pathname])

  return (
    <>
      <div style={{ padding: '0.75rem 1rem 0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}><GlobalSearch /></div>
        <button
          onClick={collapseAll}
          title="Collapse all sections"
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(197,168,130,0.35)', padding: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(197,168,130,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(197,168,130,0.35)'}
        >
          <CollapseAllIcon />
        </button>
      </div>

      <nav style={{ flex: 1, minHeight: 0, padding: '0.25rem 0', overflowY: 'auto' }}>
        {SECTIONS.map((section, sectionIdx) => {
          const isCollapsible = !!section.label
          const isCollapsed = isCollapsible && collapsed[section.id]

          return (
            <div key={section.id}>
              {isCollapsible && (
                <button
                  ref={el => { sectionRefs.current[section.id] = el }}
                  onClick={() => toggle(section.id)}
                  className="admin-section-header"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem 0.3rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: 'rgba(197,168,130,0.65)', fontWeight: '600',
                    transition: 'color 0.2s',
                    animationDelay: `${0.2 + sectionIdx * 0.06}s`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(197,168,130,0.9)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(197,168,130,0.65)'}
                >
                  {section.label}
                  <Chevron open={!isCollapsed} />
                </button>
              )}

              {!isCollapsed && section.items.map((item, idx) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={`admin-nav-item${active ? ' admin-nav-link-active' : ''}`}
                    style={{
                      display: 'block', padding: '0.55rem 1.25rem',
                      fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s, background 0.2s',
                      color: active ? '#c5a882' : 'rgba(245,241,236,0.55)',
                      background: active ? 'rgba(197,168,130,0.08)' : 'transparent',
                      borderLeft: active ? '2px solid #c5a882' : '2px solid transparent',
                      letterSpacing: '0.01em',
                      animationDelay: `${idx * 0.04}s`,
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <BirthdaysWidget />

      <div className="admin-sidebar-footer admin-sidebar-safe-bottom" style={{ padding: '0.75rem 1.25rem', borderTop: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
        <Link href="/members/dashboard" onClick={onNavClick} style={{ fontSize: '11px', color: 'rgba(245,241,236,0.3)', textDecoration: 'none', letterSpacing: '0.06em', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,241,236,0.55)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,241,236,0.3)'}
        >
          ← Member portal
        </Link>
      </div>
    </>
  )
}

function AdminBanner() {
  const [banner, setBanner] = useState(null)
  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.ok ? r.json() : {}).then(s => {
      setBanner(s.admin_banner?.trim() || null)
    }).catch(() => {})
  }, [])
  if (!banner) return null
  return (
    <div style={{ background: 'rgba(197,168,130,0.12)', borderBottom: '0.5px solid rgba(197,168,130,0.25)', padding: '0.6rem 1.25rem', fontSize: '12px', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1.5 }}>
      {banner}
    </div>
  )
}

export default function AdminShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { setIsOpen(false) }, [pathname])

  // Pull-to-refresh: bump refreshKey to remount the current page's client
  // component (re-runs its data-fetching useEffect) and ask the router to
  // re-fetch any server-rendered data too, in case a future admin page uses it.
  const handleRefresh = useCallback(() => {
    router.refresh()
    setRefreshKey(k => k + 1)
  }, [router])

  return (
    <div className="admin-shell" style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3', fontFamily: 'var(--font-inter),sans-serif' }}>

      <button
        className="admin-hamburger"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation"
        style={{
          position: 'fixed', top: '1rem', left: '1rem', zIndex: 200,
          background: '#0F1E14', border: '0.5px solid rgba(197,168,130,0.2)',
          padding: '10px 12px', cursor: 'pointer',
          flexDirection: 'column', gap: '5px', alignItems: 'center',
        }}
      >
        <span style={{ display: 'block', width: '18px', height: '1.5px', background: '#c5a882' }} />
        <span style={{ display: 'block', width: '18px', height: '1.5px', background: '#c5a882' }} />
        <span style={{ display: 'block', width: '18px', height: '1.5px', background: '#c5a882' }} />
      </button>

      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300,
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        background: '#0F1E14',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 400, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(197,168,130,0.1)', overflowY: 'auto',
      }}>
        <div className="admin-sidebar-safe-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
          <Link href="/" onClick={() => setIsOpen(false)} style={{ display: 'flex' }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={140} height={93} style={{ width: '80px', height: 'auto', opacity: 0.9 }} />
          </Link>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.4)', fontSize: '24px', lineHeight: 1, padding: '4px 6px' }}>×</button>
        </div>
        <NavContent pathname={pathname} onNavClick={() => setIsOpen(false)} />
      </aside>

      <aside className="admin-sidebar-desktop" style={{
        width: '220px', flexShrink: 0, background: '#0F1E14',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(197,168,130,0.1)',
        minHeight: '100vh', position: 'sticky', top: 0, height: '100vh',
        overflow: 'hidden',
      }}>
        <div className="admin-sidebar-safe-top" style={{ padding: '0.2rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <Link href="/" className="admin-sidebar-logo" style={{ display: 'flex' }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={200} height={133} style={{ width: '110px', height: 'auto', opacity: 0.9 }} />
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <NavContent pathname={pathname} onNavClick={undefined} />
        </div>
      </aside>

      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <AdminBanner />
        <PullToRefresh onRefresh={handleRefresh}>
          <div key={`${pathname}:${refreshKey}`} className="admin-page-enter">
            {children}
          </div>
        </PullToRefresh>
      </main>
    </div>
  )
}
