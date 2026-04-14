-- ============================================================
-- Migration: Seed exactly 2 demo investors
-- Clears any existing demo_investors rows and inserts 2 clean,
-- well-crafted profiles used on the founder matching page.
-- ============================================================

-- Remove all existing demo investors (clean slate)
DELETE FROM demo_investors;

-- Insert 2 demo investor profiles
INSERT INTO demo_investors (
  id,
  name,
  firm,
  title,
  location,
  check_sizes,
  stages,
  sectors,
  geography,
  thesis,
  portfolio,
  response_rate,
  is_active
) VALUES
(
  gen_random_uuid(),
  'James Okafor',
  'Meridian Ventures',
  'General Partner',
  'San Francisco, CA',
  ARRAY['$100K–$500K', '$500K–$2M'],
  ARRAY['Pre-Seed', 'Seed'],
  ARRAY['AI/ML', 'SaaS', 'Developer Tools', 'Cybersecurity'],
  ARRAY['North America', 'Europe'],
  'We back exceptional technical founders building the infrastructure layer of the next decade. Our focus is on developer-first products and AI-native tools that create compounding defensibility through network effects or proprietary data. We write $250K–$1M first checks and lead rounds at pre-seed and seed. We add value through our network of 200+ engineering leaders and our LP base of Fortune 500 CTOs.',
  ARRAY['Stripe', 'Notion', 'Linear', 'Vercel', 'Retool'],
  85,
  true
),
(
  gen_random_uuid(),
  'Priya Nair',
  'Foundry Capital',
  'Managing Partner',
  'New York, NY',
  ARRAY['$500K–$2M', '$2M+'],
  ARRAY['Seed', 'Series A'],
  ARRAY['HealthTech', 'FinTech', 'Marketplace', 'Consumer'],
  ARRAY['North America'],
  'Foundry Capital invests in category-defining companies where regulatory complexity or data moats create durable competitive advantages. We partner with founders who have deep domain expertise and a contrarian view of how large markets will be restructured. Typical first check is $750K–$2M at seed; we reserve 2× for follow-on. Our portfolio founders get access to our bench of 50 operators who have scaled companies through $100M ARR.',
  ARRAY['Oscar Health', 'Plaid', 'Brex', 'ClassPass', 'Faire'],
  78,
  true
);
