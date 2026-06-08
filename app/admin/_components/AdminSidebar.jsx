'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const NAV = [
  { href: '/admin/dashboard',     label: 'Dashboard'     },
  { href: '/admin/members',       label: 'Members'       },
  { href: '/admin/applications',  label: 'Applications'  },
  { href: '/admin/contacts',      label: 'Contacts'      },
  { href: '/admin/events',        label: 'Events'        },
  { href: '/admin/announcements', label: 'Announcements' },
  { href: '/admin/payments',      label: 'Payments'      },
  { href: '/admin/cars',          label: 'Cars'          },
  { href: '/admin/tools',         label: 'Tools'         },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: '220px', flexShrink: 0, background: '#0F1E14',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(197,168,130,0.1)',
      minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '0.5px solid rgba(197,168,130,0.1)' }}>
        <Link href="/" style={{ display: 'block' }}>
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={140} height={93} style={{ width: '120px', height: 'auto', opacity: 0.9 }} />
        </Link>
        <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginTop: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
          Admin
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.75rem 0' }}>
        {NAV.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{
              display: 'block', padding: '0.6rem 1.25rem',
              fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
              textDecoration: 'none', transition: 'all 0.15s',
              color: active ? '#c5a882' : 'rgba(245,241,236,0.55)',
              background: active ? 'rgba(197,168,130,0.08)' : 'transparent',
              borderLeft: active ? '2px solid #c5a882' : '2px solid transparent',
              letterSpacing: '0.01em',
            }}>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '0.5px solid rgba(197,168,130,0.1)' }}>
        <Link href="/members/dashboard" style={{ fontSize: '11px', color: 'rgba(245,241,236,0.3)', textDecoration: 'none', letterSpacing: '0.06em', fontFamily: 'var(--font-inter),sans-serif' }}>
          ← Member portal
        </Link>
      </div>
    </aside>
  )
}
