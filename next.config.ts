import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/founder/agents/patel',    destination: '/founder/cxo?agent=patel',  permanent: false },
      { source: '/founder/agents/susi',     destination: '/founder/cxo?agent=susi',   permanent: false },
      { source: '/founder/agents/maya',     destination: '/founder/cxo?agent=maya',   permanent: false },
      { source: '/founder/agents/felix',    destination: '/founder/cxo?agent=felix',  permanent: false },
      { source: '/founder/agents/leo',      destination: '/founder/cxo?agent=leo',    permanent: false },
      { source: '/founder/agents/harper',   destination: '/founder/cxo?agent=harper', permanent: false },
      { source: '/founder/agents/nova',     destination: '/founder/cxo?agent=nova',   permanent: false },
      { source: '/founder/agents/atlas',    destination: '/founder/cxo?agent=atlas',  permanent: false },
      { source: '/founder/agents/sage',     destination: '/founder/cxo?agent=sage',   permanent: false },
      { source: '/founder/workspace',       destination: '/founder/cxo',              permanent: false },
      { source: '/founder/pitch-deck',      destination: '/founder/cxo?agent=sage',   permanent: false },
      { source: '/founder/metrics',         destination: '/founder/dashboard',        permanent: false },
      { source: '/founder/portfolio',       destination: '/founder/dashboard',        permanent: false },
      { source: '/founder/activity',        destination: '/founder/messages',         permanent: false },
      { source: '/library',                 destination: '/founder/academy',          permanent: false },
      { source: '/founder/library',         destination: '/founder/academy',          permanent: false },
      { source: '/founder/startup-profile', destination: '/founder/settings?tab=company', permanent: false },
    ];
  },
};

export default nextConfig;
