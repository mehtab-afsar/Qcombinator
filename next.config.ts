import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      // Google account profile pictures (Sign in with Google) — next/image refuses any host
      // that isn't explicitly listed here, which is what founders saw as a crash after signing
      // up with Google: their own avatar broke the page it was meant to appear on.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
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
      // ⚠️ A redirect() here runs BEFORE Next.js ever looks for a matching page.tsx — an entry
      // whose `source` is also a real route silently makes that route unreachable, no matter how
      // many places link to it. Five of these were doing exactly that, found 4 Aug 2026: real,
      // current pages (metrics/portfolio/activity/pitch-deck/library), several with live inbound
      // links from the dashboard and getting-started, were being redirected away from — mostly to
      // /founder/cxo/*, a route tree deleted this morning (ADR-034), so those clicks landed on a
      // 404. Removed rather than repointed — nothing suggested the real pages were meant to be
      // retired, they're actively linked to and were touched in today's own commits.
      { source: '/founder/startup-profile', destination: '/founder/settings?tab=company', permanent: false },
      // /founder/library is a deliberate pair with its own page.tsx, which itself does a
      // client-side redirect() to /founder/academy — this entry is the server-side half of the
      // SAME intentional redirect, not a stray leftover. Keep both together.
      { source: '/founder/library',         destination: '/founder/academy',              permanent: false },
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
