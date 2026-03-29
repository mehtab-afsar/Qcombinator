-- ============================================================
-- Consolidates:
--   20260326000001_public_portfolio.sql
--   20260326000002_qscore_knowledge_chunks.sql
--   20260326000003_expand_constraints.sql
--   20260326000004_sector_weights_spec_alignment.sql
--   20260326000005_relax_stage_constraint.sql
--   20260329000001_relax_funding_constraint.sql
-- ============================================================

-- ============================================================
-- SOURCE: 20260326000001_public_portfolio.sql
-- ============================================================

-- Add public portfolio fields to founder_profiles
ALTER TABLE founder_profiles
  ADD COLUMN IF NOT EXISTS is_public   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug TEXT    UNIQUE;

-- Index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_founder_profiles_public_slug
  ON founder_profiles (public_slug)
  WHERE public_slug IS NOT NULL;

-- ============================================================
-- SOURCE: 20260326000002_qscore_knowledge_chunks.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Q-Score Knowledge Chunks
-- DB-backed knowledge base for the RAG scoring pipeline.
-- Replaces the hardcoded TypeScript knowledge-base.ts so chunks can be
-- updated, extended, and A/B tested without code deploys.
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists qscore_knowledge_chunks (
  id           text primary key,        -- e.g. 'mkt-001', 'yc-001'
  category     text not null,           -- market_benchmark | gtm_playbook | team_signal | traction_milestone | scoring_rubric | bluff_pattern | vc_framework
  sector       text[] not null,         -- ['saas_b2b'] or ['all'] or multiple
  stage        text[] not null,         -- ['pre-seed','seed'] or ['all']
  dimension    text not null,           -- market | goToMarket | team | traction | product | financial | all
  title        text not null,
  content      text not null,
  metadata     jsonb not null default '{}',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Fast lookup by scoring dimension + sector
create index if not exists idx_qscore_kc_dimension_sector
  on qscore_knowledge_chunks using gin (sector) where active = true;

create index if not exists idx_qscore_kc_category
  on qscore_knowledge_chunks (category) where active = true;

create index if not exists idx_qscore_kc_dimension
  on qscore_knowledge_chunks (dimension) where active = true;

-- Full-text search for keyword retrieval
create index if not exists idx_qscore_kc_fts
  on qscore_knowledge_chunks
  using gin (to_tsvector('english', title || ' ' || content));

-- RLS: public read (used by scoring pipeline on server), admin write only
alter table qscore_knowledge_chunks enable row level security;

create policy "public_read_knowledge_chunks"
  on qscore_knowledge_chunks for select
  using (active = true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Seed: 31 existing TypeScript chunks + 20 new VC-grade chunks = 51 total
-- ──────────────────────────────────────────────────────────────────────────────

insert into qscore_knowledge_chunks (id, category, sector, stage, dimension, title, content, metadata) values

-- ── MARKET BENCHMARKS ─────────────────────────────────────────────────────────
('mkt-001', 'market_benchmark', '{saas_b2b}', '{all}', 'market',
  'SaaS B2B Conversion Rate Norms',
  'For B2B SaaS, realistic free-trial-to-paid conversion is 2–5% (self-serve) and 15–30% (sales-assisted). Cold outreach to booked demo: 2–8%. Demo to close: 15–30%. Website visitor to trial: 1–3%. Founders claiming >10% cold-to-paid without a proven sales motion are overstating. SMB ACV: $500–$2K. Mid-market: $5K–$50K. Enterprise: $50K+. Healthy net revenue retention (NRR) for early-stage B2B SaaS: >100%.',
  '{"conversionMin": 2, "conversionMax": 5, "sector": "saas_b2b"}'),

('mkt-002', 'market_benchmark', '{saas_b2c}', '{all}', 'market',
  'SaaS B2C / PLG Conversion Rate Norms',
  'For B2C SaaS and PLG products, freemium-to-paid conversion is typically 2–5%. Best-in-class PLG (Slack, Dropbox early-stage) saw 20–30% team conversion after individual activation. Viral coefficient >1.0 is exceptional and rare. Typical DAU/MAU ratio for a sticky app: 20–50%. Churn: <2% monthly for paid tiers is strong. CAC via content/SEO for B2C: $5–$30. Paid acquisition B2C: $20–$80 per signup.',
  '{"conversionMin": 2, "conversionMax": 5, "sector": "saas_b2c"}'),

('mkt-003', 'market_benchmark', '{marketplace}', '{all}', 'market',
  'Marketplace Unit Economics Benchmarks',
  'Marketplace take rates: B2C marketplaces typically 15–30% (e.g., Etsy 6.5% + fees, Airbnb ~15%). B2B marketplaces: 5–15%. Gross Merchandise Volume (GMV) is the key traction metric. Liquidity (% listings that transact in 30 days) above 30% is considered healthy. Repeat purchase rate above 40% is strong. CAC should be recouped within 6–12 months on both supply and demand sides. LTV:CAC of 3:1+ is the minimum for sustainable growth.',
  '{"sector": "marketplace"}'),

('mkt-004', 'market_benchmark', '{fintech}', '{all}', 'market',
  'Fintech Unit Economics Benchmarks',
  'Fintech companies face higher CAC due to regulatory/trust barriers. B2C fintech CAC: $50–$300. B2B fintech CAC: $500–$5,000. LTV:CAC should be 5:1+ to account for compliance and churn costs. Typical gross margin for payments: 40–60% (interchange-based). SaaS fintech: 70–80%. Churn in fintech is often higher (10–20% annually) due to account consolidation. Regulatory capital requirements vary; founders should clearly state their regulatory path.',
  '{"sector": "fintech"}'),

('mkt-005', 'market_benchmark', '{ecommerce}', '{all}', 'market',
  'E-Commerce Unit Economics Benchmarks',
  'E-commerce gross margins: 40–70% (higher for DTC brands with strong pricing power). COGS includes manufacturing, shipping, returns (typically 15–25% return rate for apparel). ROAS (return on ad spend) of 3:1+ is sustainable for paid channels; 2:1 is break-even for many brands. Repeat purchase rate for DTC: 30–40% within 12 months. Email/SMS typically drives 25–40% of revenue. Customer LTV should be 3x+ first-order CAC.',
  '{"sector": "ecommerce"}'),

('mkt-006', 'market_benchmark', '{hardware}', '{all}', 'market',
  'Hardware Startup Unit Economics',
  'Hardware gross margins: 40–60% for consumer hardware (Apple: ~37–45%). IoT/enterprise hardware: 50–70%. BOM (Bill of Materials) should be <25% of retail price for consumer hardware. Manufacturing scale-up costs are non-linear; first 1K units cost 3–5x per unit vs 100K units. Hardware companies should have 12–18 months runway before first production run. Typical hardware seed rounds are larger ($1M–$3M) due to capital intensity. Recurring revenue (SaaS layer) dramatically improves valuation.',
  '{"sector": "hardware"}'),

('mkt-007', 'market_benchmark', '{biotech_deeptech}', '{all}', 'market',
  'Biotech / Deep Tech Market Characteristics',
  'Biotech/deep tech companies have long development cycles: 3–10 years to market. TAM analysis is less predictive early-stage; market definition around a specific patient population or use case is more credible. Team credentials (PhDs, publications, prior company exits) matter disproportionately — investors expect domain expertise. IP (patents, trade secrets) is a critical differentiator. Realistic biotech seed funding: $500K–$3M. Clinical milestones (IND filing, Phase 1 completion) are more relevant traction metrics than revenue.',
  '{"sector": "biotech_deeptech"}'),

('mkt-008', 'market_benchmark', '{consumer}', '{all}', 'market',
  'Consumer App / Brand Benchmarks',
  'Consumer app benchmarks: D1 retention 25–40% is good, D7 retention 15–25%, D30 retention 8–15%. DAU/MAU ratio: 20–25% for typical apps, 50%+ for exceptional (Facebook-level). CAC via paid social: $2–$15 per install for games, $10–$50 for utility apps. Consumer brand CAC via DTC: $30–$100 for lower AOV products. Brand-driven NPS: 40+ is excellent. Organic/viral growth (k-factor > 0.5) significantly changes unit economics. Monthly churn for subscriptions: <3% is strong for consumer.',
  '{"sector": "consumer"}'),

('mkt-009', 'market_benchmark', '{all}', '{all}', 'market',
  'LTV:CAC Ratio Universal Benchmarks',
  'LTV:CAC ratio benchmarks by stage: Pre-seed/seed: >3:1 is the minimum bar. Series A: >4:1. Series B+: >5:1. Best-in-class SaaS companies target 8:1+. LTV:CAC above 20:1 is almost always overstated without strong evidence. Payback period (months to recover CAC): <12 months is healthy for B2C, <18 months for B2B. If CAC is not yet measurable, founders should describe their channel hypothesis with rationale for expected CAC.',
  '{"ltvCacMin": 3, "ltvCacMax": 20}'),

('mkt-010', 'market_benchmark', '{all}', '{all}', 'market',
  'TAM Sizing Realism Benchmarks',
  'TAM sizing credibility: Bottom-up TAM ($X customers × $Y ACV = $Z market) is far more credible than top-down ("the global X market is $500B"). Investors distrust TAM > $100B for early-stage companies as it signals imprecise targeting. More convincing: a $500M–$5B serviceable addressable market (SAM) with a clear go-to-market wedge. Market growth rate should be backed by a named research source. Fastest-growing markets: AI/ML (30%+ CAGR), climate tech (25%+), digital health (18%+), cybersecurity (15%+).',
  '{}'),

-- ── GTM PLAYBOOKS ─────────────────────────────────────────────────────────────
('gtm-001', 'gtm_playbook', '{saas_b2b}', '{pre-seed,seed}', 'goToMarket',
  'B2B SaaS Early-Stage GTM Channels',
  'Proven early-stage B2B SaaS channels: (1) Founder-led cold email — 200+ targeted emails/week, 3–8% reply rate, personalized first line; (2) LinkedIn outreach — 50+ connection requests/day, 10–20% acceptance, follow-up sequence; (3) Content + SEO — 6–12 month lag, but compounds; (4) Warm intros via investors, advisors, YC network — highest conversion (30–60% to meeting); (5) Product Hunt / communities (Slack groups, Indie Hackers) for early traction. Do NOT run paid ads before product-market fit. Prioritize channels where you can do things that don''t scale.',
  '{}'),

('gtm-002', 'gtm_playbook', '{all}', '{all}', 'goToMarket',
  'ICP Definition Template',
  'A high-quality ICP (Ideal Customer Profile) must include: (1) Company firmographics: industry, company size (headcount/revenue), funding stage, geography; (2) Buyer persona: job title, department, decision-making authority (economic buyer, champion, blocker); (3) Trigger events: what recently happened to make them need your product NOW (new regulation, funding round, headcount growth, product launch); (4) Pain point: quantified business impact of the problem ($X lost/wasted, Y hours per week); (5) Exclusion criteria: who is NOT your customer. Weak ICPs say "SMBs in tech." Strong ICPs say "Series A B2B SaaS companies (50–200 employees) with a VP of Sales who recently hired their first SDR team."',
  '{}'),

('gtm-003', 'gtm_playbook', '{saas_b2c}', '{pre-seed,seed}', 'goToMarket',
  'B2C / Consumer Early-Stage GTM Channels',
  'Proven early-stage B2C channels: (1) TikTok/Instagram organic — highest organic reach currently, creator-style content outperforms polished ads; (2) Reddit/community seeding — identify 3–5 subreddits where ICP lives, provide genuine value before promoting; (3) Influencer micro-partnerships — 10K–100K follower creators at $100–$500 per post, track with unique discount codes; (4) Referral programs — offer incentive on both sides (give $10, get $10); (5) App store optimization (ASO) for mobile; (6) PR/launch on Product Hunt. Avoid paid Facebook/Google until ROAS is validated >2:1.',
  '{}'),

('gtm-004', 'gtm_playbook', '{all}', '{all}', 'goToMarket',
  'Messaging Testing Framework',
  'High-quality messaging tests include: (1) Hypothesis: what specific claim are you testing; (2) Method: A/B test on landing page, email subject line, or ad copy with ≥200 impressions per variant; (3) Metric: specific KPI (CTR, trial signup rate, email open rate); (4) Result: exact numbers ("Version A: 3.2% CTR, Version B: 5.8% CTR — benefit headline won"); (5) Action: what changed in messaging based on results. Weak: "We tested different messages and some worked better." Strong: "We tested 4 value props over 2 weeks via cold email — save 5 hours/week had 6.2% reply rate vs 2.1% for reduce errors variant."',
  '{}'),

('gtm-005', 'gtm_playbook', '{marketplace}', '{pre-seed,seed}', 'goToMarket',
  'Marketplace Cold-Start GTM Strategy',
  'Marketplace cold-start strategies: (1) Single-player mode — ensure the product has value for one side before needing the other; (2) Supply-side first — seed 20–50 high-quality suppliers/providers manually, then drive demand; (3) Geographic constraint — launch in one city/vertical to achieve density; (4) Seed supply yourself — act as the supplier initially (Airbnb founders rented their own apartment first); (5) Community leverage — find existing communities where both sides exist. Key metric: time-to-first-transaction for new supply-side onboards (<7 days is strong).',
  '{}'),

('gtm-006', 'gtm_playbook', '{all}', '{all}', 'goToMarket',
  'Sales Cycle Benchmarks by Deal Size',
  'B2B sales cycle benchmarks: SMB (ACV <$5K): 2–4 weeks. Mid-market ($5K–$50K ACV): 1–3 months. Enterprise ($50K+ ACV): 3–12 months. Add 2–4 weeks per additional stakeholder in buying committee. Typical enterprise deal involves 6–8 stakeholders. Procurement adds 2–6 weeks. Security review adds 2–8 weeks. Pipeline conversion benchmarks: qualified lead to proposal 30–40%; proposal to close 20–30% for mid-market; 10–20% enterprise. Accurate pipeline requires 3x pipeline coverage for reliable quarterly forecasting.',
  '{}'),

-- ── TEAM SIGNALS ──────────────────────────────────────────────────────────────
('team-001', 'team_signal', '{all}', '{all}', 'team',
  'High-Quality Founder-Market Fit Signals',
  'Investors evaluate founder-market fit on: (1) Personal pain: did the founder personally experience the problem? (2) Domain depth: years in the industry, roles held, specific companies/teams; (3) Unique insight: what does this founder know that others don''t? (4) Network access: first customers, hiring, partnerships from personal network; (5) Technical credibility: for deep-tech, did they build something similar before? Strong origin stories include specific company names, job titles, quantified pain ("spent 3 years at Goldman as an analyst, spent 20% of my time manually reconciling data"). Weak stories: "I noticed businesses struggle with X" (observer, not insider).',
  '{}'),

('team-002', 'team_signal', '{all}', '{all}', 'team',
  'Strong vs Weak Unfair Advantage Patterns',
  'Strong unfair advantages (hard to copy): (1) Distribution moat: existing relationships with the buyer or distribution channel; (2) Data moat: proprietary data that improves the product over time; (3) Network effects: product becomes more valuable as more people use it; (4) Regulatory advantage: license, patent, or compliance expertise; (5) Technical breakthrough: genuinely novel approach that competitors cannot easily replicate; (6) Community: existing community that becomes the initial market. Weak "advantages" (easily copied): "We move faster than big companies," "Our team is passionate," "No one has done this exact thing before." Investors look for advantages that are structural, not motivational.',
  '{}'),

('team-003', 'team_signal', '{all}', '{all}', 'team',
  'Resilience and Learning Velocity Signals',
  'Strong resilience indicators for investors: (1) Specific failed assumptions with documented learning ("We believed enterprise buyers would pay $50K ACV. After 10 calls, we learned procurement alone requires 6-month cycles — we pivoted to mid-market"); (2) Iteration speed: shipped and learned in ≤2 week cycles; (3) Pivot quality: pivoted based on data, not opinion; (4) Persistence through a specific hard moment (described concretely, not generically); (5) Number of customer conversations (50+ shows dedication). Red flags: no failed assumptions (overconfident), only positive framing, no specific numbers or timelines in resilience story.',
  '{}'),

('team-004', 'team_signal', '{all}', '{all}', 'team',
  'Co-Founder and Team Composition Norms',
  'YC research shows: 2–3 co-founders outperform solo founders by 163% in outcomes. Ideal co-founder split: technical + business (most common), or dual technical for deep tech. Equity split: equal or near-equal (60/40) for co-founders hired at inception signals trust. Large skews (90/10) often cause conflict. Advisors ≠ co-founders; advisor equity is typically 0.1–0.5%. Serial founders raise 3x faster and at 2x valuation on average. Prior work history together is the strongest predictor of founder relationship success.',
  '{}'),

-- ── TRACTION MILESTONES ───────────────────────────────────────────────────────
('traction-001', 'traction_milestone', '{saas_b2b}', '{pre-seed}', 'traction',
  'B2B SaaS Pre-Seed Traction Benchmarks',
  'Pre-seed B2B SaaS traction benchmarks (to raise $500K–$2M): 3–10 paying customers (even at discounted/beta pricing), OR 20+ letters of intent (LOIs), OR $5K–$20K MRR. Customer interviews: 50+ is strong, 20+ is adequate. Pilot programs with Fortune 500 customers count as strong traction even without payment. Key question investors ask: "Would your current customers be very disappointed if your product disappeared tomorrow?" (PMF benchmark: >40% saying yes).',
  '{"sector": "saas_b2b", "stage": "pre-seed"}'),

('traction-002', 'traction_milestone', '{saas_b2b}', '{seed}', 'traction',
  'B2B SaaS Seed Traction Benchmarks',
  'Seed B2B SaaS traction benchmarks (to raise $1M–$4M): $10K–$100K MRR, 10–50 paying customers, net revenue retention >100%, month-over-month growth 15–25%. Logo quality matters: 1 Fortune 500 logo = 10 SMB logos in investor perception. Sales cycle documented. First referenceable customers (willing to take investor calls). Annual contract value (ACV) validated at target price point. Churn <3% monthly.',
  '{"sector": "saas_b2b", "stage": "seed"}'),

('traction-003', 'traction_milestone', '{saas_b2c}', '{pre-seed,seed}', 'traction',
  'B2C / Consumer Traction Benchmarks',
  'B2C traction benchmarks for raising: Pre-seed: 1K–10K active users OR 500+ waitlist signups with strong engagement. Seed: 10K–100K MAU, $10K+ MRR, D30 retention >15%, word-of-mouth growth. Engagement is more important than raw numbers at early stage. NPS >40 is strong. Social proof: press coverage, community engagement, user testimonials. Viral coefficient k > 0.3 is meaningful for growth investors.',
  '{}'),

('traction-004', 'traction_milestone', '{all}', '{all}', 'traction',
  'Customer Commitment Signal Quality',
  'Customer commitment levels from strongest to weakest: (1) Paid invoice — highest signal, especially at full price; (2) Signed contract / LOI — strong, especially if from a recognizable brand; (3) Verbal commitment with timeline — moderate; (4) Pilot/POC in progress — moderate; (5) Waitlist with credit card — moderate; (6) Email waitlist — weak; (7) "Very interested" verbal — very weak. Investors discount uncommitted interest by 80–90%. Ten paying customers > 1,000 people who said "sounds interesting."',
  '{}'),

-- ── SCORING RUBRICS ───────────────────────────────────────────────────────────
('rubric-001', 'scoring_rubric', '{all}', '{all}', 'product',
  'Customer Quote / Evidence Quality Rubric',
  'Score 80–100: Direct quote from a named customer (even anonymized by role) with specific pain expressed, ideally with a number ("I was spending 8 hours a week on this"). Score 60–79: Paraphrased customer feedback with specific pain point, clear problem description. Score 40–59: General positive feedback, vague pain ("they liked it", "said it was useful"). Score 20–39: Generic testimonial language without specific pain or outcome. Score 0–19: No real customer voice, or clearly fabricated/AI-style language.',
  '{"field": "customerQuote"}'),

('rubric-002', 'scoring_rubric', '{all}', '{all}', 'product',
  'Failed Assumption Quality Rubric',
  'Score 80–100: Names a specific assumption that was wrong ("We thought CTOs would be the buyer; turned out it was VP of Engineering"), describes what data changed the view, explains what changed in the product/strategy. Score 60–79: Clear wrong assumption, some evidence of learning and change. Score 40–59: Mentions a challenge without specifying the assumption or what changed. Score 20–39: Vague failure ("we had to adjust our approach") with no specifics. Score 0–19: No failed assumptions shared, or only positive pivots framed as "discoveries."',
  '{"field": "failedBelief"}'),

('rubric-003', 'scoring_rubric', '{all}', '{all}', 'team',
  'Problem Origin Story Quality Rubric',
  'Score 80–100: Personal firsthand experience at a specific company/role, quantified impact of the problem, clear "why me" narrative, timeline and context. Example: "As a logistics manager at Flexport for 4 years, I spent 15 hours/week manually reconciling carrier invoices across 6 different portals. When we missed a $200K billing error because of this, I knew there had to be a better way." Score 60–79: Industry experience with pain point, less quantified. Score 40–59: Observed the problem in others, not personal. Score 20–39: Generic market observation. Score 0–19: No personal connection, purely theoretical.',
  '{"field": "problemStory"}'),

('rubric-004', 'scoring_rubric', '{all}', '{all}', 'team',
  'Unfair Advantage / Moat Quality Rubric',
  'Score 80–100: Names specific structural moat — a named relationship (e.g., "Our co-founder was VP of Procurement at Amazon; first 10 customers are her former colleagues"), proprietary data, patent pending, or a technical breakthrough that took years to build. Score 60–79: Clear domain expertise advantage with specific experience. Score 40–59: General industry experience cited as advantage without specifics. Score 20–39: Team passion or speed cited as advantage (not structural). Score 0–19: No real advantage articulated, or clearly generic language like "we are the only ones solving this."',
  '{"field": "advantageExplanation"}'),

('rubric-005', 'scoring_rubric', '{all}', '{all}', 'goToMarket',
  'ICP Description Quality Rubric',
  'Score 80–100: Includes all of: specific industry vertical, company size range, buyer role/title, department, trigger event that makes them need your product NOW, and exclusion criteria. Example: "Series B+ B2B SaaS companies (100–500 employees), Head of Revenue Operations or VP Sales, who just hired a new CRO and need to overhaul their sales process within 90 days. NOT a fit: companies with <20 person sales teams or those in heavy implementation phases." Score 60–79: Most elements present, clear buyer persona. Score 40–59: Industry and size but no trigger or exclusion. Score 20–39: Just a vertical or size. Score 0–19: "SMBs" or similarly vague.',
  '{"field": "icpDescription"}'),

-- ── BLUFF PATTERNS ────────────────────────────────────────────────────────────
('bluff-001', 'bluff_pattern', '{all}', '{all}', 'all',
  'AI-Generated Narrative Detection Patterns',
  'AI-generated founder narratives tend to: (1) Use abstract nouns without concrete referents ("leveraging synergies," "driving value across the ecosystem"); (2) List features rather than telling a story; (3) Lack specific names, dates, companies, or dollar amounts; (4) Use passive voice for failures ("challenges were encountered") vs active for successes; (5) Have suspiciously complete, well-structured answers that cover every possible angle; (6) Not have a single surprising or counterintuitive detail. Real founder answers are often incomplete, specific to one problem, use informal language, and contain unexpected insights.',
  '{}'),

('bluff-002', 'bluff_pattern', '{all}', '{all}', 'market',
  'Inflated Market Data Patterns',
  'Common signs of inflated market data: (1) All metrics are perfectly round ($1M CAC, $10M LTV, 10% conversion); (2) LTV:CAC > 15:1 without extraordinary unit economics explanation; (3) TAM > $100B cited for an early-stage product with no market segmentation; (4) Conversion rates > 20% for cold outbound at scale; (5) Claiming 100K+ target customers without specifying how they were counted; (6) Revenue projections that assume linear scaling without a clear growth driver. Realistic data has imperfect numbers: "$127K MRR as of last month," "42 customer conversations across 3 segments."',
  '{}'),

-- ── NEW: VC FRAMEWORKS ────────────────────────────────────────────────────────

('yc-001', 'vc_framework', '{all}', '{pre-seed,seed}', 'team',
  'YC: What Gets Founders In — The 3 Core Signals',
  'Y Combinator evaluates applications on three primary signals: (1) TEAM quality — have these people demonstrated they can build something? Prior projects, GitHub contributions, past companies even if failed, domain expertise, co-founder relationship quality, and crucially: do they seem like the kind of people who could recruit and lead a great team? (2) IDEA clarity — is the problem real, the market large, and the insight non-obvious? YC prefers "weird but right" ideas over "safe but crowded." The insight test: what do you know that most people don''t? (3) TRACTION signal — any evidence that people want this. Even 10 paying customers beats 10,000 waitlist signups. Most important: do they have the "make something people want" instinct? YC rejects many technically-impressive teams building things nobody needs.',
  '{"source": "Y Combinator", "year": 2024}'),

('yc-002', 'vc_framework', '{all}', '{pre-seed,seed}', 'financial',
  'YC: Default Alive vs Default Dead — Ramen Profitability Signals',
  'YC''s Paul Graham''s "default alive" test: given your current revenue growth rate and burn rate, will you reach profitability before running out of money without raising? The formula: (current_mrr × growth_rate)^months_of_runway > break_even_mrr. Pre-seed companies should know their default-alive date. Ramen profitable: revenue covers basic team costs (∼$3K/person/month). YC prefers founders who could survive without raising over those who will definitely die without the next round. Default alive founders negotiate from strength. This signal is more important than the absolute burn number.',
  '{"source": "Y Combinator", "author": "Paul Graham", "year": 2024}'),

('yc-003', 'vc_framework', '{all}', '{pre-seed,seed}', 'traction',
  'YC: Do Things That Don''t Scale — Traction Quality Signals',
  'Paul Graham''s "Do Things That Don''t Scale" framework: the best early traction comes from founders who personally recruit every user, do manual customer success, and personally deliver the product. Stripe co-founders physically walked customers through integration. Airbnb founders took professional photos of every NYC listing themselves. The signal investors look for: are you willing to do the hard manual work that only a founder would do? Metrics that signal this: personally knowing the name and story of every customer, direct customer success conversations every week, sub-24h response time to user feedback. This unscalable dedication is the foundation of all great traction stories.',
  '{"source": "Y Combinator", "author": "Paul Graham", "year": 2023}'),

('seq-001', 'vc_framework', '{all}', '{pre-seed,seed}', 'market',
  'Sequoia: Why Now — Market Timing Signal Framework',
  'Sequoia''s "Why Now" framework: every great startup is the product of a specific moment in time. The "Why Now" question tests whether the market is newly unlocked by a change the founder is exploiting. The three most credible "Why Now" triggers: (1) REGULATORY change — new law, policy, or enforcement creates urgent need (e.g., GDPR for privacy tech, HIPAA evolution for healthtech); (2) TECHNOLOGY unlock — a new capability (cheap LLM APIs, affordable lidar, cheap cloud compute) makes a previously impossible product possible; (3) BEHAVIORAL shift — COVID, generational change, or cultural moment created a new behavior that is now sticky. Weak "Why Now": "The market is growing" or "AI is everywhere." Strong: "In the last 18 months, LLM inference costs fell 99x — a product that would have cost $200/user/month in 2022 now costs $2/user/month."',
  '{"source": "Sequoia Capital", "year": 2024}'),

('seq-002', 'vc_framework', '{all}', '{seed,series-a}', 'product',
  'Sequoia: Product-Market Fit Signals for Series A',
  'Sequoia''s PMF signals for evaluating Series A readiness: (1) NPS >40 with verbatim quotes explaining exactly why users love the product; (2) Organic referral rate — are users bringing in other users without being asked? (3) Retention cohorts: D30 retention showing 15%+ for consumer, 50%+ for B2B tools; (4) "Very disappointed" test: >40% of active users would be "very disappointed" if they could no longer use your product (Sean Ellis PMF test); (5) Usage intensity: power users using the product daily/weekly, not just monthly. The best PMF signal: customers who get upset when you''re down. Mediocre PMF: customers who say "we like it" but switch when a competitor offers 10% discount.',
  '{"source": "Sequoia Capital", "year": 2024}'),

('frc-001', 'vc_framework', '{all}', '{pre-seed,seed}', 'team',
  'First Round Capital: The Secret Test for Founder-Market Fit',
  'First Round Capital''s founder-market fit evaluation asks: "Is this founder the most likely person in the world to win in this market?" The 5 factors: (1) UNFAIR ACCESS — does the founder have access to customers, distribution, or data that competitors can''t easily replicate? (2) EARNED INSIGHT — has the founder earned their insight through direct experience, not research? Can they say something non-obvious about the market that a well-informed outsider couldn''t? (3) EXECUTION EVIDENCE — has the founder shown they can execute? Even small past projects count more than credentials. (4) OBSESSION CHECK — is this founder''s identity wrapped up in this problem? Would they work on it even if it didn''t turn into a company? (5) MISSIONARY vs MERCENARY — are they driven by the problem or the outcome? First Round favors missionaries with a compelling story of personal encounter with the problem.',
  '{"source": "First Round Capital", "year": 2024}'),

('bvp-001', 'vc_framework', '{all}', '{seed,series-a}', 'financial',
  'Bessemer: Efficiency Score and What VCs Actually Look For',
  'Bessemer Venture Partners efficiency score (also called "burn multiple"): Net New ARR / Net Burn. This is the most important financial efficiency metric for growth-stage companies. Scores: <1.0 = Outstanding (adding $1 of ARR for every $1 burned). 1–1.5 = Good. 1.5–2.0 = Needs improvement. >2.0 = Concerning. >3.0 = Unsustainable. Why VCs care: burn multiple separates "spending to grow" from "spending to survive." A company growing 100% YoY with burn multiple 0.8 is far more fundable than one growing 50% YoY with burn multiple 3.0. For pre-product-market-fit companies, Bessemer looks instead at: cost per learning (how much do you spend per validated assumption?) and conviction score (how many paying customers would be very upset if you shut down tomorrow?).',
  '{"source": "Bessemer Venture Partners", "year": 2024}'),

('a16z-001', 'vc_framework', '{all}', '{pre-seed,seed}', 'market',
  'a16z: Network Effects — The 5 Types VCs Evaluate',
  'a16z evaluates network effects across 5 types: (1) DIRECT network effects — each new user directly increases value for existing users (phone networks, messaging apps). Strongest type. (2) INDIRECT network effects — more users on one side attract more users on the other side (marketplaces, platforms). (3) DATA network effects — more usage generates more data, which improves the product for everyone (ML-based products). This is the most achievable for B2B SaaS. (4) TECH performance effects — as users add more compute/resources, performance improves (Blockchain, distributed computing). (5) SOCIAL network effects — social proof and community create stickiness. When evaluating, a16z asks: does this product get meaningfully better with each new user? Even weak network effects (data, social) dramatically improve valuations and defensibility. A product with no network effects must compete on features alone.',
  '{"source": "a16z", "year": 2023}'),

('a16z-002', 'vc_framework', '{all}', '{seed,series-a}', 'goToMarket',
  'a16z: Product-Led Growth (PLG) vs Sales-Led — When to Use Each',
  'a16z framework for GTM motion selection: Product-Led Growth works when: (1) the product delivers value in under 5 minutes; (2) the buyer IS the user (no procurement); (3) the product spreads naturally through usage (each document shared, each link sent brings a new potential user); (4) ACV is too low to justify a sales team ($0–$10K per year). Sales-Led works when: (1) there are compliance, security, or custom integration requirements; (2) the buyer is a committee, not an individual; (3) ACV > $25K (justifies a salesperson). Hybrid: start PLG to build organic demand and proof points, then add sales when ACV climbs or enterprise inbound starts coming in. Most dangerous mistake: applying enterprise sales motion to a PLG product (kills growth) or trying PLG on a product that requires hand-holding (kills conversion).',
  '{"source": "a16z", "year": 2024}'),

('india-001', 'vc_framework', '{saas_b2b}', '{pre-seed,seed}', 'market',
  'India SaaS Benchmarks — Blume Ventures & iSPIRT 2024',
  'India SaaS benchmarks (Blume Ventures Indian SaaS Report 2024): ARR at seed: $200K–$2M. Series A: $2M–$8M ARR. Average ACV for Indian SaaS: $3K–$8K (lower than US equivalent). NRR for top-quartile Indian SaaS: >110%. CAC payback: 12–24 months typical. Key India-specific GTM advantage: US customers see Indian SaaS as 40–60% cost-competitive vs US alternatives — lean into this in positioning. India-first vs US-first: India-first companies typically raise pre-seed/seed domestically, then do US expansion at Series A. US-first Indian companies (founders who have US network from IIT/Wharton/YC) can skip India market initially. Top sectors for Indian SaaS globally: developer tools, fintech API infrastructure, SMB ERP, compliance automation.',
  '{"source": "Blume Ventures", "year": 2024, "geography": "India"}'),

('india-002', 'vc_framework', '{all}', '{pre-seed,seed}', 'traction',
  'India Market Traction Signals — PeakXV (Sequoia India) Framework',
  'PeakXV (Sequoia India) evaluates Indian founders with adjusted benchmarks for the Indian market context: (1) DOMESTIC traction: 10 paying customers in India at any price point > 1,000 free users; reference customers from Tier-1 enterprises (Tata, Reliance, Infosys, HCL) carry 5x weight of equivalently-sized US logos for domestic fundraising; (2) INDIA-TO-GLOBAL: founders who have successfully closed 3+ US/EU customers while based in India demonstrate the hardest-to-fake signal in Indian startup ecosystems; (3) UNIT ECONOMICS ADJUSTMENT: gross margins in Indian B2B SaaS are often 75–85% vs 80–90% US benchmark due to lower cloud costs and local talent — investors expect this and it is not a concern; (4) GOVERNMENT as customer: government and PSU contracts are meaningful if they convert to paid and have reference value, but should not be the primary GTM motion in Series A pitch.',
  '{"source": "PeakXV Partners", "year": 2024, "geography": "India"}'),

('pmf-001', 'vc_framework', '{all}', '{pre-seed,seed}', 'product',
  'Sean Ellis PMF Test + Superhuman Playbook',
  'Sean Ellis product-market fit test: Survey active users with "How would you feel if you could no longer use this product?" and measure the percentage who say "Very Disappointed." >40% = strong PMF. 25–40% = weak PMF, optimize before scaling. <25% = no PMF, do not raise a round for growth. The Superhuman refinement (Rahul Vohra): ask who said "Very Disappointed" — identify what they LOVE about your product and what they consider your MAIN BENEFIT. Then redesign the onboarding and positioning to make the "somewhat disappointed" group feel the same way as the power users. Common mistakes: surveying the wrong users (inactive users always say "not disappointed"), not acting on the results, treating it as a one-time test instead of quarterly tracking.',
  '{"source": "Sean Ellis + Rahul Vohra", "year": 2023}'),

('raise-001', 'vc_framework', '{all}', '{pre-seed,seed}', 'financial',
  'Pre-Seed and Seed Round: Revenue Milestones That Matter to Investors',
  'Revenue milestones for raising each round (US market benchmarks, 2024): Pre-seed ($500K–$2M): 3–10 paying customers OR $0–$10K MRR. Product should work and be used by real customers, even at discounted price. Seed ($1M–$4M): $10K–$100K MRR, clear ICP, first referenceable customers, basic unit economics measured. Series A ($5M–$15M): $100K–$500K MRR, >100% NRR, clear sales process with documented conversion rates, 3+ months of consistent MoM growth. All these milestones assume US pricing; India-first companies can raise at 30–40% of these ARR milestones if US expansion is in the plan. Most important non-revenue signal at any stage: the quality of customer references (will your customers take investor calls and say they could not live without you?).',
  '{"source": "Multiple VCs", "year": 2024}'),

('pricing-001', 'vc_framework', '{saas_b2b}', '{pre-seed,seed}', 'financial',
  'Pricing Signals That Tell Investors If You Have Real PMF',
  'Pricing is the most honest signal of product-market fit: (1) Full-price paid without negotiation: customers who pay full price without asking for a discount demonstrate genuine value capture. (2) Price increases tolerated: if you raised prices 20% and <10% churned, you have real pricing power. (3) ACV vs market: your ACV should be in the same range as competitive products; significantly lower ACV signals either the product is not differentiated or customers don''t believe the value claim. (4) No-discount policy: best SaaS companies enforce standard pricing — "we don''t discount" is a strong signal of conviction. (5) Usage-based pricing: if you charge per usage and usage is growing, this is the strongest pricing signal. Common mistake: charging 10x below value because you''re afraid to ask for full price — this underpricing actually hurts fundraising because it signals uncertainty.',
  '{"source": "Multiple VCs", "year": 2024}'),

('consist-001', 'scoring_rubric', '{all}', '{all}', 'all',
  'Cross-Artifact Consistency Rubric',
  'When evaluating a founder across multiple documents and statements, flag these internal inconsistencies: (1) MRR discrepancy: if the assessment form states $X MRR and the financial artifact states $Y MRR, and Y > 3×X, this is a red flag requiring explanation. (2) Customer count inconsistency: customer count in assessment vs artifact vs traction section should agree within 20%. (3) Founding date conflict: if the problem origin story mentions "5 years ago" but the company was founded 18 months ago, this creates timeline inconsistency. (4) Team size contradiction: assessment says 3-person team, hiring plan shows 8 current employees. (5) Market size methodology change: TAM in one section uses bottom-up, another uses top-down, and the numbers differ by 10x. Any single inconsistency reduces credibility by 20–30%. Multiple inconsistencies are a disqualifying signal.',
  '{"field": "consistency_check"}'),

-- ── FINANCIAL BENCHMARKS ──────────────────────────────────────────────────────
('fin-001', 'market_benchmark', '{all}', '{pre-seed,seed,series-a}', 'financial',
  'MRR Growth Rate Norms by Stage',
  'MRR growth rate benchmarks by stage: Pre-seed (0–$10K MRR): any positive growth is valid — 30–100%+ MoM is common but unsustainable; what matters is direction and customer commitment quality, not the rate. Seed ($10K–$100K MRR): 15–25% MoM is considered strong; 10–15% is adequate; below 10% signals slow distribution or product-market fit issues. Series A ($100K–$500K MRR): 8–15% MoM consistent growth over 3+ months is the bar; investors want to see the growth rate stabilising, not declining. Series B+ (>$500K MRR): 5–10% MoM, focus shifts to NRR and efficiency over raw growth. Rule of 40 (ARR growth % + EBITDA margin % ≥ 40) becomes relevant at Series B. Founders claiming >50% MoM growth above $50K MRR without a clear demand spike explanation should be challenged.',
  '{"source": "OpenView, Bessemer", "year": 2024}'),

('fin-002', 'market_benchmark', '{all}', '{pre-seed,seed,series-a}', 'financial',
  'Runway, Burn Rate, and Gross Margin Benchmarks',
  'Runway benchmarks: Minimum viable runway to raise is 6 months; standard expectation before fundraising is 12–18 months; best practice is 18–24 months runway before starting a raise. Monthly burn benchmarks by stage: pre-seed 2-person team: $8K–$20K/month; seed 5–8 person team: $40K–$100K/month; Series A 15–25 person team: $150K–$400K/month. Gross margin floors by sector: B2B SaaS: ≥70% (world-class: 80–85%); B2C SaaS: ≥60%; Marketplace: ≥50% net revenue margin; Fintech: ≥40%; E-commerce DTC: ≥40%; Hardware: ≥40% (often lower early). If gross margin is below sector floor, the business model requires explanation — it is not automatically disqualifying but investors will probe unit economics hard. COGS for SaaS should be primarily hosting, support, and customer success — not sales or marketing (those are opex).',
  '{"source": "Bessemer, a16z", "year": 2024}'),

-- ── RUBRIC CHUNKS FOR MISSING TEXT FIELDS ─────────────────────────────────────
('rubric-006', 'scoring_rubric', '{all}', '{all}', 'market',
  'Competitive Insight Quality Rubric',
  'Score 80–100: Names specific competitors by name, explains the precise functional gap each has, and articulates a structural reason why this startup wins a specific customer segment — not just "we are better" but "we win VP of Engineering at 50–200 person SaaS companies because we integrate natively with GitHub Actions, which Competitor X abandoned in 2023." Includes one surprising or counterintuitive insight about the competitive landscape that a non-expert would not know. Score 60–79: Accurate competitor comparison with clear differentiation on 2+ dimensions, no structural moat explanation. Score 40–59: Names competitors but differentiation is generic ("easier to use," "better UX," "cheaper"). Score 20–39: Only mentions one competitor or uses vague language like "existing solutions are outdated." Score 0–19: No competitor awareness, or claims "we have no competition" without qualification.',
  '{"field": "competitiveInsight"}'),

('rubric-007', 'scoring_rubric', '{all}', '{all}', 'market',
  'Market Timing Quality Rubric',
  'Score 80–100: Identifies a specific, recent, verifiable trigger that makes this the right moment — a regulation passed in the last 24 months, a technology cost curve that crossed a threshold (e.g., "LLM API costs fell 99× between 2022 and 2024"), a behavioral shift with data, or a market structure change (consolidation, incumbent exit). Ties the timing trigger directly to why the product is now viable or customers are now ready to buy. Score 60–79: Clear timing argument with a real trigger, less specific on the mechanism of causation. Score 40–59: Market growth cited as timing rationale ("AI is growing fast") without a specific unlock. Score 20–39: Timing argument is purely aspirational ("the world is ready for this"). Score 0–19: No timing argument, or the rationale could have been written identically 10 years ago.',
  '{"field": "marketTiming"}'),

('rubric-008', 'scoring_rubric', '{all}', '{all}', 'product',
  'Product Vision Quality Rubric',
  'Score 80–100: Describes a specific future state of the world enabled by the product — names who benefits, how their behaviour changes, and what becomes possible that was not before. Vision is grounded in a non-obvious insight (something the founder knows from deep experience) rather than a trend. Roadmap is insight-driven: "We start with X because it is the wedge that gives us access to Y data, which unlocks Z expansion." Demonstrates understanding of where NOT to go. Score 60–79: Clear multi-year vision with a plausible product progression, some insight behind sequencing. Score 40–59: Vision is a list of features to be added over time; no insight into why this sequence. Score 20–39: Vision is the current product described at larger scale ("we want to be the Salesforce of X"). Score 0–19: No product vision beyond immediate problem, or vision is generic disruption language without substance.',
  '{"field": "productVision"}')

on conflict (id) do update set
  content    = excluded.content,
  title      = excluded.title,
  metadata   = excluded.metadata,
  updated_at = now();

-- ============================================================
-- SOURCE: 20260326000003_expand_constraints.sql
-- ============================================================

-- Expand agent_artifacts.artifact_type CHECK to all 14 supported types
ALTER TABLE public.agent_artifacts
  DROP CONSTRAINT IF EXISTS agent_artifacts_artifact_type_check;

ALTER TABLE public.agent_artifacts
  ADD CONSTRAINT agent_artifacts_artifact_type_check CHECK (artifact_type IN (
    'icp_document','outreach_sequence','battle_card','gtm_playbook',
    'financial_summary','competitive_matrix','hiring_plan','pmf_survey',
    'brand_messaging','sales_script','strategic_plan','interview_notes',
    'legal_checklist','legal_documents'
  ));

-- Expand qscore_history.data_source CHECK to all supported source values
ALTER TABLE public.qscore_history
  DROP CONSTRAINT IF EXISTS qscore_history_data_source_check;

ALTER TABLE public.qscore_history
  ADD CONSTRAINT qscore_history_data_source_check CHECK (data_source IN (
    'registration','profile_builder','agent_completion','agent_artifact',
    'manual','onboarding','assessment','combined'
  ));

-- ============================================================
-- SOURCE: 20260326000004_sector_weights_spec_alignment.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Align sector weights with docs/scoring-stages.md spec.
-- The TypeScript fallback (PRD_WEIGHTS) uses goToMarket: 0.17 but the spec
-- says SaaS B2B should be 0.25 — GTM is the primary moat for SaaS companies.
-- All weights within a sector must sum to 1.0.
--
-- Changes:
--   saas_b2b:  goToMarket 0.17 → 0.25, market 0.20 → 0.18, team 0.15 → 0.12
--   saas_b2c:  goToMarket 0.17 → 0.22, traction 0.12 → 0.15
--   biotech_deeptech: product 0.18 → 0.22, goToMarket 0.17 → 0.12
-- ──────────────────────────────────────────────────────────────────────────────

-- SaaS B2B: GTM is the primary competitive signal — raise to 0.25
update qscore_dimension_weights set weight = 0.25 where sector = 'saas_b2b' and dimension = 'goToMarket';
update qscore_dimension_weights set weight = 0.18 where sector = 'saas_b2b' and dimension = 'market';
update qscore_dimension_weights set weight = 0.12 where sector = 'saas_b2b' and dimension = 'team';
-- market(0.18) + product(0.18) + goToMarket(0.25) + financial(0.18) + team(0.12) + traction(0.09) = 1.00
update qscore_dimension_weights set weight = 0.09 where sector = 'saas_b2b' and dimension = 'traction';

-- SaaS B2C: Traction / viral growth matters more; GTM also important
update qscore_dimension_weights set weight = 0.22 where sector = 'saas_b2c' and dimension = 'goToMarket';
update qscore_dimension_weights set weight = 0.15 where sector = 'saas_b2c' and dimension = 'traction';
update qscore_dimension_weights set weight = 0.13 where sector = 'saas_b2c' and dimension = 'team';
-- market(0.20) + product(0.18) + goToMarket(0.22) + financial(0.12) + team(0.13) + traction(0.15) = 1.00
update qscore_dimension_weights set weight = 0.12 where sector = 'saas_b2c' and dimension = 'financial';

-- Biotech/DeepTech: Product/IP and Team credentials dominate; GTM less important pre-commercialization
update qscore_dimension_weights set weight = 0.22 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'product';
update qscore_dimension_weights set weight = 0.22 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'team';
update qscore_dimension_weights set weight = 0.12 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'goToMarket';
update qscore_dimension_weights set weight = 0.20 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'market';
update qscore_dimension_weights set weight = 0.16 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'financial';
update qscore_dimension_weights set weight = 0.08 where sector in ('biotech_deeptech','deeptech','healthtech') and dimension = 'traction';
-- 0.22 + 0.22 + 0.12 + 0.20 + 0.16 + 0.08 = 1.00

-- Invalidate the 1h weight cache so next scoring run picks up new values immediately
-- (The cache is in-process memory — a deploy clears it automatically.
--  For zero-downtime: the cache key includes a hash; updating the DB rows breaks the cache naturally.)

-- ============================================================
-- SOURCE: 20260326000005_relax_stage_constraint.sql
-- ============================================================

-- Drop the legacy stage CHECK constraint so all onboarding stage values are valid.
-- The API maps new values (pre-product, beta, growing) to legacy equivalents,
-- but removing the constraint future-proofs the column.

ALTER TABLE founder_profiles
  DROP CONSTRAINT IF EXISTS founder_profiles_stage_check;

-- ============================================================
-- SOURCE: 20260329000001_relax_funding_constraint.sql
-- ============================================================

-- Drop the legacy funding CHECK constraint.
-- Onboarding form sends values like 'friends-and-family' and 'series-a-plus'
-- which the old constraint rejects. The API maps these to legacy values,
-- but dropping the constraint future-proofs the column.
ALTER TABLE founder_profiles
  DROP CONSTRAINT IF EXISTS founder_profiles_funding_check;
