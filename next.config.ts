import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  async redirects() {
    return [
      // Redirect old /founder/agents/:agentId → /founder/cxo/:agentId
      // missing _embed=1 ensures iframes (which add ?_embed=1) bypass this redirect
      {
        source: '/founder/agents/:agentId',
        destination: '/founder/cxo/:agentId',
        permanent: false,
        missing: [{ type: 'query', key: '_embed' }],
      },
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
