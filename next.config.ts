import type { NextConfig } from "next";

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

export default nextConfig;
