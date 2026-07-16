import AdminShell from './_components/AdminShell'

// iOS shows a blank white screen while a standalone home-screen app loads
// unless apple-touch-startup-image links are provided. iOS only uses a splash
// whose pixel size + media query EXACTLY match the device, so one entry per
// iPhone size (portrait; manifest locks orientation to portrait-primary).
const splash = (w, h, dw, dh, dpr) => ({
  url: `/admin-splash/splash-${w}x${h}.png`,
  media: `screen and (device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
})

export const metadata = {
  title: { default: 'Admin — Canvas Routes', template: '%s — Admin' },
  manifest: '/admin-manifest.json',
  // Overrides the root layout's icons for /admin/* — the home-screen icon iOS
  // captures at Add to Home Screen comes from this apple-touch-icon.
  icons: {
    icon: [
      { url: '/admin-icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: { url: '/admin-icon-180.png', sizes: '180x180' },
  },
  appleWebApp: {
    capable: true,
    title: 'CR Admin',
    statusBarStyle: 'black',
    startupImage: [
      splash(750, 1334, 375, 667, 2),   // SE 2/3, 6s–8
      splash(828, 1792, 414, 896, 2),   // XR, 11
      splash(1125, 2436, 375, 812, 3),  // X, XS, 11 Pro, 12/13 mini
      splash(1170, 2532, 390, 844, 3),  // 12/13/14, 12/13 Pro
      splash(1179, 2556, 393, 852, 3),  // 14 Pro, 15, 15 Pro, 16
      splash(1206, 2622, 402, 874, 3),  // 16 Pro
      splash(1242, 2688, 414, 896, 3),  // XS Max, 11 Pro Max
      splash(1284, 2778, 428, 926, 3),  // 12/13 Pro Max, 14 Plus
      splash(1290, 2796, 430, 932, 3),  // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
      splash(1320, 2868, 440, 956, 3),  // 16 Pro Max
    ],
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
