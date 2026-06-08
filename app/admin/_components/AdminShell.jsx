'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import GlobalSearch from './GlobalSearch'

const NAV = [
  { href: '/admin/dashboard',     label: 'Dashboard'     },
  { label: 'Members', divider: true },
  { href: '/admin/members',       label: 'Members'       },
  { href: '/admin/applications',  label: 'Applications'  },
  { href: '/admin/contacts',      label: 'Contacts'      },
  { href: '/admin/cars',          label: 'Cars'          },
  { label: 'Events', divider: true },
  { href: '/admin/events',        label: 'Events'        },
  { href: '/admin/road-trips',    label: 'Road Trips'    },
  { label: 'Business', divider: true },
  { href: '/admin/payments',      label: 'Payments'      },
  { href: '/admin/revenue',       label: 'Revenue'       },
  { href: '/admin/promo-codes',   label: 'Promo Codes'   },
  { label: 'Communication', divider: true },
  { href: '/admin/announcements', label: 'Announcements' },
  { href: '/admin/broadcasts',    label: 'Broadcasts'    },
  { label: 'System', divider: true },
  { href: '/admin/activity-log',  label: 'Activity Log'  },
  { href: '/admin/tools',         label: 'Tools'         },
]

function NavLinks({ pathname, onNavClick }) {
  return (
    <nav style={{ flex: 1, padding: '0.25rem 0' }}>
      {NAV.map((item, i) => {
        if (item.divider) return (
          <div key={i} style={{ padding: '1rem 1.25rem 0.3rem', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.25)' }}>
            {item.label}
          </div>
        )
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} onClick={onNavClick} style={{
            display: 'block', padding: '0.55rem 1.25rem',
            fontSize: '13px',
            textDecoration: 'none', transition: 'all 0.15s',
            color: active ? '#c5a882' : 'rgba(245,241,236,0.55)',
            background: active ? 'rgba(197,168,130,0.08)' : 'transparent',
            borderLeft: active ? '2px solid #c5a882' : '2px solid transparent',
            letterSpacing: '0.01em',
          }}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function AdminShell({ children }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => { setIsOpen(false) }, [pathname])

  const sidebarContent = (onNavClick) => (
    <>
      <div style={{ padding: '0.75rem 1rem 0.5rem' }}>
        <GlobalSearch />
      </div>
      <NavLinks pathname={pathname} onNavClick={onNavClick} />
      <div style={{ padding: '1rem 1.25rem', borderTop: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
        <Link href="/members/dashboard" onClick={onNavClick} style={{ fontSize: '11px', color: 'rgba(245,241,236,0.3)', textDecoration: 'none', letterSpacing: '0.06em' }}>
          ← Member portal
        </Link>
      </div>
    </>
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
        <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Link href="/" onClick={() => setIsOpen(false)} style={{ display: 'block' }}>
            <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={140} height={93} style={{ width: '100px', height: 'auto', opacity: 0.9 }} />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.4)', fontSize: '24px', lineHeight: 1, padding: '4px 6px' }}
          >×</button>
        </div>
        {sidebarContent(() => setIsOpen(false))}
      </aside>

      {/* Desktop sidebar — hidden on mobile via CSS */}
      <aside className="admin-sidebar-desktop" style={{
        width: '220px', flexShrink: 0, background: '#0F1E14',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(197,168,130,0.1)',
        minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)', flexShrink: 0 }}>
          <Link href="/" style={{ display: 'block' }}>
            <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={140} height={93} style={{ width: '120px', height: 'auto', opacity: 0.9 }} />
          </Link>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginTop: '0.5rem' }}>
            Admin
          </div>
        </div>
        {sidebarContent(undefined)}
      </aside>

      {/* Main content */}
      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
