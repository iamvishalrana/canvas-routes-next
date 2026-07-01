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

// Auth is already fully enforced by middleware.js for every /admin/:path* request
// (redirects unauthenticated/non-admin users before this layout ever renders).
// Re-checking here would mean a second Supabase Auth network round-trip on every
// single admin navigation — this layout can trust middleware and skip it.
export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>
}
