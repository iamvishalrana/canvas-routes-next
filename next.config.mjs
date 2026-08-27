import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
// Security headers applied to every response. Deliberately excludes a strict
// script-src/connect-src CSP — that needs staged report-only testing against
// Stripe.js, Google Tag Manager, Google Maps, Supabase and the Meta pixel
// before enforcing, or it silently breaks checkout. `frame-ancestors 'self'`
// is the safe subset (clickjacking defense, affects no resource loading).
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Lock down powerful features the site never uses via web APIs; leave
  // payment/geolocation at their defaults so Stripe wallets and maps keep working.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), browsing-topics=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  // Friendly short links that mask the real page — the URL bar keeps
  // showing the short path (unlike redirect(), which would send the
  // browser to the destination URL instead).
  async rewrites() {
    return [
      { source: '/ccsept5-2026', destination: '/meet/1a020f09-f618-42ed-b646-75c1927da38a' },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: "canvas-routes",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  automaticVercelMonitors: true,
  disableLogger: true,
});
