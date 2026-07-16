import AdminShell from './_components/AdminShell'

export const metadata = {
  title: { default: 'Admin — Canvas Routes', template: '%s — Admin' },
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CR Admin',
    statusBarStyle: 'black',
  },
}

// maximumScale 1 suppresses iOS's auto-zoom on focused inputs (pinch zoom
// still works — iOS ignores the cap for user gestures). That lets admin
// inputs keep their designed 13px instead of the sitewide anti-zoom 16px,
// which made every value/placeholder/select look oversized on mobile admin.
// See the matching .admin-shell font-size override in globals.css.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F1E14',
}

// Auth is already fully enforced by middleware.js for every /admin/:path* request
// (redirects unauthenticated/non-admin users before this layout ever renders).
// Re-checking here would mean a second Supabase Auth network round-trip on every
// single admin navigation — this layout can trust middleware and skip it.
export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>
}
