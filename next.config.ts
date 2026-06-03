import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/founder/workspace',       destination: '/founder/cxo',                  permanent: false },
      { source: '/founder/pitch-deck',      destination: '/founder/cxo/sage',             permanent: false },
      { source: '/founder/metrics',         destination: '/founder/dashboard',            permanent: false },
      { source: '/founder/portfolio',       destination: '/founder/dashboard',            permanent: false },
      { source: '/founder/activity',        destination: '/founder/messages',             permanent: false },
      { source: '/library',                 destination: '/founder/academy',              permanent: false },
      { source: '/founder/library',         destination: '/founder/academy',              permanent: false },
      { source: '/founder/startup-profile', destination: '/founder/settings?tab=company', permanent: false },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI/production — skip in local dev
  silent: !process.env.CI,

  // Upload source maps so stack traces are readable in Sentry
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger in production
  disableLogger: true,

  // Disable Sentry entirely if DSN is not set (e.g. local dev without Sentry)
  ...(process.env.SENTRY_DSN ? {} : { autoInstrumentServerFunctions: false }),
});
