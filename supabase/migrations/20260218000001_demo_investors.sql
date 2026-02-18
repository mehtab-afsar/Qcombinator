-- ============================================================
-- Migration: Demo Investor Seed Data
-- Creates a standalone demo_investors table (no auth.users FK)
-- Used by the founder matching page to show real-looking investors.
-- ============================================================

CREATE TABLE IF NOT EXISTS demo_investors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  firm            TEXT NOT NULL,
  title           TEXT NOT NULL,
  location        TEXT NOT NULL,
  check_sizes     TEXT[] DEFAULT '{}',
  stages          TEXT[] DEFAULT '{}',
  sectors         TEXT[] DEFAULT '{}',
  geography       TEXT[] DEFAULT '{}',
  thesis          TEXT,
  portfolio       TEXT[] DEFAULT '{}',
  response_rate   INTEGER DEFAULT 70,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Public read access (no auth required) — founders browse without login
ALTER TABLE demo_investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read demo investors"
  ON demo_investors FOR SELECT
  USING (true);

-- ── Seed: 15 realistic investors ─────────────────────────────────────────────

INSERT INTO demo_investors
  (name, firm, title, location, check_sizes, stages, sectors, geography, thesis, portfolio, response_rate)
VALUES
  (
    'Sarah Johnson',
    'Apex Ventures',
    'General Partner',
    'San Francisco, CA',
    ARRAY['$1M–$5M'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['AI/ML', 'SaaS', 'Enterprise'],
    ARRAY['North America', 'Europe'],
    'Backing AI-first founders who are redefining enterprise workflows with a product-led approach.',
    ARRAY['Vercel', 'Linear', 'Codeium'],
    88
  ),
  (
    'Michael Chen',
    'Meridian Health Ventures',
    'Managing Partner',
    'Boston, MA',
    ARRAY['$500K–$2M'],
    ARRAY['Pre-Seed', 'Seed', 'Series A'],
    ARRAY['Healthcare', 'AI/ML', 'B2B SaaS'],
    ARRAY['North America'],
    'Healthcare innovation at the intersection of AI and clinical data — reducing burden on the 28% of hospital budgets lost to admin.',
    ARRAY['Carta', 'Abridge', 'Olive AI'],
    74
  ),
  (
    'Emily Rodriguez',
    'Greenfield Capital',
    'Partner',
    'New York, NY',
    ARRAY['$2M–$10M'],
    ARRAY['Seed', 'Series A'],
    ARRAY['Climate', 'Energy', 'DeepTech'],
    ARRAY['North America', 'Europe', 'Global'],
    'Climate solutions that replace fossil infrastructure — not offset it. We back founders with real unit economics, not carbon credits.',
    ARRAY['Sunrun', 'Commonwealth Fusion', 'Turntide Technologies'],
    91
  ),
  (
    'James Park',
    'Compound VC',
    'Principal',
    'Menlo Park, CA',
    ARRAY['$250K–$1M'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['Fintech', 'Developer Tools', 'Marketplace'],
    ARRAY['North America'],
    'Developer-first infrastructure and fintech primitives — the picks and shovels of the next wave of software companies.',
    ARRAY['Stripe', 'Plaid', 'Mercury'],
    70
  ),
  (
    'Priya Patel',
    'Accel',
    'Partner',
    'London, UK',
    ARRAY['$2M–$12M'],
    ARRAY['Seed', 'Series A', 'Series B'],
    ARRAY['AI/ML', 'SaaS', 'Enterprise'],
    ARRAY['Europe', 'North America'],
    'Enterprise software that makes knowledge workers 10× more productive — with a clear path from PLG to enterprise ACV.',
    ARRAY['Pipedrive', 'Samsara', 'Coda'],
    68
  ),
  (
    'David Osei',
    'Launch Africa',
    'Founding Partner',
    'Lagos, Nigeria',
    ARRAY['$100K–$500K', '$500K–$1M'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['Fintech', 'E-commerce', 'Healthcare'],
    ARRAY['Africa', 'Europe'],
    'Backing the next generation of African entrepreneurs solving real problems with mobile-first, capital-efficient models.',
    ARRAY['Flutterwave', 'Andela', 'mPharma'],
    82
  ),
  (
    'Rachel Kim',
    'Tiger Global (Scout)',
    'Investment Manager',
    'New York, NY',
    ARRAY['$1M–$5M', '$5M–$25M'],
    ARRAY['Series A', 'Series B'],
    ARRAY['Consumer', 'Marketplace', 'E-commerce'],
    ARRAY['North America', 'Asia Pacific'],
    'High-growth consumer marketplaces with strong network effects and clear dominant market share potential.',
    ARRAY['Faire', 'Gopuff', 'Kavak'],
    61
  ),
  (
    'Tom Hargreaves',
    'LocalGlobe',
    'Partner',
    'London, UK',
    ARRAY['$500K–$2M'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['SaaS', 'Fintech', 'EdTech'],
    ARRAY['Europe'],
    'The best European seed fund for founders who are contrarian, technical, and obsessed with a specific problem.',
    ARRAY['Robinhood', 'Figma', 'Improbable'],
    79
  ),
  (
    'Ayesha Mirza',
    'Khosla Ventures',
    'Associate',
    'Menlo Park, CA',
    ARRAY['$500K–$3M'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['AI/ML', 'DeepTech', 'Climate'],
    ARRAY['North America'],
    'Breakthrough science with 10× impact — energy, biology, and AI applied to problems that matter at civilisational scale.',
    ARRAY['OpenAI', 'Scale AI', 'Commonwealth Fusion'],
    85
  ),
  (
    'Carlos Fernandez',
    'NXTP Labs',
    'Partner',
    'Buenos Aires, Argentina',
    ARRAY['$100K–$500K'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['Fintech', 'SaaS', 'Marketplace'],
    ARRAY['Latin America', 'North America'],
    'Latin America''s most active early stage fund — we back founders who understand their local market deeply before going global.',
    ARRAY['Mural', 'Pomelo', 'Aleph'],
    77
  ),
  (
    'Jessica Tao',
    'Sequoia Capital',
    'Partner',
    'San Francisco, CA',
    ARRAY['$1M–$10M'],
    ARRAY['Seed', 'Series A'],
    ARRAY['AI/ML', 'Consumer', 'SaaS'],
    ARRAY['North America', 'Asia Pacific'],
    'Generational companies with exceptional founders who move faster than incumbents can defend. Product velocity is our primary signal.',
    ARRAY['Airbnb', 'DoorDash', 'Snowflake'],
    72
  ),
  (
    'Nikhil Basu Trivedi',
    'Footwork VC',
    'General Partner',
    'San Francisco, CA',
    ARRAY['$500K–$2M'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['Consumer', 'Marketplace', 'AI/ML'],
    ARRAY['North America'],
    'Consumer products that create habit, community, and an emotional connection with users — especially those powered by AI.',
    ARRAY['Superhuman', 'Airtable', 'Whatnot'],
    83
  ),
  (
    'Marie Curie',
    'Balderton Capital',
    'Partner',
    'Paris, France',
    ARRAY['$2M–$15M'],
    ARRAY['Seed', 'Series A', 'Series B'],
    ARRAY['SaaS', 'Enterprise', 'DeepTech'],
    ARRAY['Europe'],
    'European technology companies with global ambitions — we back founders who see Europe as a launchpad, not a ceiling.',
    ARRAY['Revolut', 'Darktrace', 'Depop'],
    67
  ),
  (
    'Arjun Sethi',
    'Tribe Capital',
    'Co-Founder & Partner',
    'San Francisco, CA',
    ARRAY['$1M–$5M', '$5M–$25M'],
    ARRAY['Seed', 'Series A', 'Series B'],
    ARRAY['SaaS', 'Fintech', 'Marketplace'],
    ARRAY['North America', 'Asia Pacific'],
    'Data-driven investing at scale — we use product analytics and PMF signals to identify breakout companies earlier than traditional VCs.',
    ARRAY['Slack', 'Facebook', 'Carta'],
    75
  ),
  (
    'Nneka Okonkwo',
    'Ventures Platform',
    'General Partner',
    'Abuja, Nigeria',
    ARRAY['$50K–$250K', '$250K–$500K'],
    ARRAY['Pre-Seed', 'Seed'],
    ARRAY['Fintech', 'Healthcare', 'Agriculture'],
    ARRAY['Africa'],
    'Africa''s most impactful early-stage fund — we back founders solving problems that touch millions of lives with sustainable, scalable models.',
    ARRAY['TeamApt', 'LifeBank', 'Mono'],
    80
  );
