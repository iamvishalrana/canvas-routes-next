'use client'
import { useState, useEffect } from 'react'
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

// Collapse-all icon
function CollapseAllIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 8 12 3 6 8"/>
      <polyline points="18 16 12 21 6 16"/>
    </svg>
  )
}

// Chevron for section header
function Chevron({ open }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function NavContent({ pathname, onNavClick }) {
  const [collapsed, setCollapsed] = useState({})

  function toggle(id) { setCollapsed(p => ({ ...p, [id]: !p[id] })) }
  function collapseAll() {
    setCollapsed(Object.fromEntries(COLLAPSIBLE_IDS.map(id => [id, true])))
  }

  return (
    <>
      {/* Search + collapse-all */}
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
                    fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'rgba(197,168,130,0.35)',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(197,168,130,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(197,168,130,0.35)'}
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

      <div style={{ padding: '1rem 1.25rem', borderTop: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
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

  const logoBlock = (onClick, size = 90) => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.25rem 1rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
      <Link href="/" onClick={onClick} style={{ display: 'flex', justifyContent: 'center' }}>
        <Image
          src="/white-outline.png"
          alt="Canvas Routes"
          width={140}
          height={93}
          style={{ width: `${size}px`, height: 'auto', opacity: 0.9 }}
        />
      </Link>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Hamburger button — shown only on mobile via CSS */}
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

      {/* Mobile drawer backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300 }}
        />
      )}

      {/* Mobile drawer */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
        background: '#0F1E14',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 400,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(197,168,130,0.1)',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
          <Link href="/" onClick={() => setIsOpen(false)} style={{ display: 'flex' }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={140} height={93} style={{ width: '80px', height: 'auto', opacity: 0.9 }} />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.4)', fontSize: '24px', lineHeight: 1, padding: '4px 6px' }}
          >×</button>
        </div>
        <NavContent pathname={pathname} onNavClick={() => setIsOpen(false)} />
      </aside>

      {/* Desktop sidebar — hidden on mobile via CSS */}
      <aside className="admin-sidebar-desktop" style={{
        width: '220px', flexShrink: 0, background: '#0F1E14',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(197,168,130,0.1)',
        minHeight: '100vh', position: 'sticky', top: 0, height: '100vh',
      }}>
        {logoBlock(undefined, 90)}
        <NavContent pathname={pathname} onNavClick={undefined} />
      </aside>

      {/* Main content */}
      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
