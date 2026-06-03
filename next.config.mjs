import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
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
