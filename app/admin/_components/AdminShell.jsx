'use client'
import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import GlobalSearch from './GlobalSearch'

const SECTIONS = [
  {
    id: 'dashboard',
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
      { href: '/admin/events',      label: 'Events'     },
      { href: '/admin/road-trips',  label: 'Road Trips' },
    ],
  },
  {
    id: 'business', label: 'Business',
    items: [
      { href: '/admin/payments',    label: 'Payments'    },
      { href: '/admin/revenue',     label: 'Revenue'     },
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
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/birthdays')
      if (res.ok) setBirthdays(await res.json())
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const count = birthdays?.length ?? 0

  return (
    <div style={{ borderTop: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', fontWeight: '600' }}>Birthdays</span>
          {count > 0 && (
            <span style={{ fontSize: '9px', background: 'rgba(197,168,130,0.2)', color: '#c5a882', padding: '1px 6px', borderRadius: '999px' }}>{count}</span>
          )}
        </div>
        <Chevron open={open} />
      </button>

      {open && (
        <div style={{ padding: '0 1.25rem 0.75rem' }}>
          {birthdays === null ? (
            <div style={{ fontSize: '11px', color: 'rgba(245,241,236,0.25)' }}>Loading…</div>
          ) : count === 0 ? (
            <div style={{ fontSize: '11px', color: 'rgba(245,241,236,0.25)' }}>No birthdays in the next 30 days</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {birthdays.map((b, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(245,241,236,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                    {b.name}
                  </span>
                  <span style={{ fontSize: '11px', color: b.daysUntil === 0 ? '#c5a882' : 'rgba(245,241,236,0.35)', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {b.daysUntil === 0 ? '🎂 Today' : `${MONTHS_SHORT[b.month - 1]} ${b.day}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NavContent({ pathname, onNavClick }) {
  const [collapsed, setCollapsed] = useState(ALL_COLLAPSED)

  function toggle(id) { setCollapsed(p => ({ ...p, [id]: !p[id] })) }
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

      <nav style={{ flex: 1, padding: '0.25rem 0', overflowY: 'auto' }}>
        {SECTIONS.map(section => {
          const isCollapsible = !!section.label
          const isCollapsed = isCollapsible && collapsed[section.id]

          return (
            <div key={section.id}>
              {isCollapsible && (
                <button
                  onClick={() => toggle(section.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem 0.3rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: 'rgba(197,168,130,0.65)', fontWeight: '600',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(197,168,130,0.9)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(197,168,130,0.65)'}
                >
                  {section.label}
                  <Chevron open={!isCollapsed} />
                </button>
              )}

              {!isCollapsed && section.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link key={item.href} href={item.href} onClick={onNavClick} style={{
                    display: 'block', padding: '0.55rem 1.25rem',
                    fontSize: '13px', textDecoration: 'none', transition: 'all 0.15s',
                    color: active ? '#c5a882' : 'rgba(245,241,236,0.55)',
                    background: active ? 'rgba(197,168,130,0.08)' : 'transparent',
                    borderLeft: active ? '2px solid #c5a882' : '2px solid transparent',
                    letterSpacing: '0.01em',
                  }}>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <BirthdaysWidget />

      <div style={{ padding: '0.75rem 1.25rem', borderTop: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
        <Link href="/members/dashboard" onClick={onNavClick} style={{ fontSize: '11px', color: 'rgba(245,241,236,0.3)', textDecoration: 'none', letterSpacing: '0.06em' }}>
          ← Member portal
        </Link>
      </div>
    </>
  )
}

export default function AdminShell({ children }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => { setIsOpen(false) }, [pathname])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3', fontFamily: 'var(--font-inter),sans-serif' }}>

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

      {isOpen && (
        <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300 }} />
      )}

      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        background: '#0F1E14',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 400, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(197,168,130,0.1)', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
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
        {/* Logo sent to back — large, absolute, no layout space */}
        <Link href="/" style={{ position: 'absolute', top: '0.5rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 0, pointerEvents: 'none' }}>
          <Image src="/white-outline.png" alt="Canvas Routes" width={280} height={186} style={{ width: '170px', height: 'auto', opacity: 0.13 }} />
        </Link>
        {/* Nav floats in front */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <NavContent pathname={pathname} onNavClick={undefined} />
        </div>
      </aside>

      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
