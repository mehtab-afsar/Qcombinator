/**
 * Q-Score RAG Knowledge Base
 *
 * Structured corpus of startup benchmarks, GTM playbooks, team signal rubrics,
 * and scoring guidance. Used as retrieval context for:
 *  1. Market claim validation (conversion rates, LTV:CAC, TAM thresholds)
 *  2. Grounding AI action recommendations with real frameworks
 *  3. Providing LLM evaluator with benchmark context per sector/stage
 */

export type KnowledgeCategory =
  | 'market_benchmark'
  | 'gtm_playbook'
  | 'team_signal'
  | 'traction_milestone'
  | 'scoring_rubric'
  | 'bluff_pattern';

export type Sector =
  | 'saas_b2b'
  | 'saas_b2c'
  | 'marketplace'
  | 'biotech_deeptech'
  | 'consumer'
  | 'fintech'
  | 'hardware'
  | 'ecommerce'
  | 'all';

export type Stage = 'pre-seed' | 'seed' | 'series-a' | 'all';

export interface KnowledgeChunk {
  id: string;
  category: KnowledgeCategory;
  sector: Sector | Sector[];
  stage: Stage | Stage[];
  dimension: string;
  title: string;
  /** The retrieved context injected into LLM prompts */
  content: string;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET BENCHMARKS
// ─────────────────────────────────────────────────────────────────────────────

const MARKET_BENCHMARKS: KnowledgeChunk[] = [
  {
    id: 'mkt-001',
    category: 'market_benchmark',
    sector: 'saas_b2b',
    stage: 'all',
    dimension: 'market',
    title: 'SaaS B2B Conversion Rate Norms',
    content:
      'For B2B SaaS, realistic free-trial-to-paid conversion is 2–5% (self-serve) and 15–30% (sales-assisted). Cold outreach to booked demo: 2–8%. Demo to close: 15–30%. Website visitor to trial: 1–3%. Founders claiming >10% cold-to-paid without a proven sales motion are overstating. SMB ACV: $500–$2K. Mid-market: $5K–$50K. Enterprise: $50K+. Healthy net revenue retention (NRR) for early-stage B2B SaaS: >100%.',
    metadata: { conversionMin: 2, conversionMax: 5, sector: 'saas_b2b' },
  },
  {
    id: 'mkt-002',
    category: 'market_benchmark',
    sector: 'saas_b2c',
    stage: 'all',
    dimension: 'market',
    title: 'SaaS B2C / PLG Conversion Rate Norms',
    content:
      'For B2C SaaS and PLG products, freemium-to-paid conversion is typically 2–5%. Best-in-class PLG (Slack, Dropbox early-stage) saw 20–30% team conversion after individual activation. Viral coefficient >1.0 is exceptional and rare. Typical DAU/MAU ratio for a sticky app: 20–50%. Churn: <2% monthly for paid tiers is strong. CAC via content/SEO for B2C: $5–$30. Paid acquisition B2C: $20–$80 per signup.',
    metadata: { conversionMin: 2, conversionMax: 5, sector: 'saas_b2c' },
  },
  {
    id: 'mkt-003',
    category: 'market_benchmark',
    sector: 'marketplace',
    stage: 'all',
    dimension: 'market',
    title: 'Marketplace Unit Economics Benchmarks',
    content:
      'Marketplace take rates: B2C marketplaces typically 15–30% (e.g., Etsy 6.5% + fees, Airbnb ~15%). B2B marketplaces: 5–15%. Gross Merchandise Volume (GMV) is the key traction metric. Liquidity (% listings that transact in 30 days) above 30% is considered healthy. Repeat purchase rate above 40% is strong. CAC should be recouped within 6–12 months on both supply and demand sides. LTV:CAC of 3:1+ is the minimum for sustainable growth.',
    metadata: { sector: 'marketplace' },
  },
  {
    id: 'mkt-004',
    category: 'market_benchmark',
    sector: 'fintech',
    stage: 'all',
    dimension: 'market',
    title: 'Fintech Unit Economics Benchmarks',
    content:
      'Fintech companies face higher CAC due to regulatory/trust barriers. B2C fintech CAC: $50–$300. B2B fintech CAC: $500–$5,000. LTV:CAC should be 5:1+ to account for compliance and churn costs. Typical gross margin for payments: 40–60% (interchange-based). SaaS fintech: 70–80%. Churn in fintech is often higher (10–20% annually) due to account consolidation. Regulatory capital requirements vary; founders should clearly state their regulatory path.',
    metadata: { sector: 'fintech' },
  },
  {
    id: 'mkt-005',
    category: 'market_benchmark',
    sector: 'ecommerce',
    stage: 'all',
    dimension: 'market',
    title: 'E-Commerce Unit Economics Benchmarks',
    content:
      'E-commerce gross margins: 40–70% (higher for DTC brands with strong pricing power). COGS includes manufacturing, shipping, returns (typically 15–25% return rate for apparel). ROAS (return on ad spend) of 3:1+ is sustainable for paid channels; 2:1 is break-even for many brands. Repeat purchase rate for DTC: 30–40% within 12 months. Email/SMS typically drives 25–40% of revenue. Customer LTV should be 3x+ first-order CAC.',
    metadata: { sector: 'ecommerce' },
  },
  {
    id: 'mkt-006',
    category: 'market_benchmark',
    sector: 'hardware',
    stage: 'all',
    dimension: 'market',
    title: 'Hardware Startup Unit Economics',
    content:
      'Hardware gross margins: 40–60% for consumer hardware (Apple: ~37–45%). IoT/enterprise hardware: 50–70%. BOM (Bill of Materials) should be <25% of retail price for consumer hardware. Manufacturing scale-up costs are non-linear; first 1K units cost 3–5x per unit vs 100K units. Hardware companies should have 12–18 months runway before first production run. Typical hardware seed rounds are larger ($1M–$3M) due to capital intensity. Recurring revenue (SaaS layer) dramatically improves valuation.',
    metadata: { sector: 'hardware' },
  },
  {
    id: 'mkt-007',
    category: 'market_benchmark',
    sector: 'biotech_deeptech',
    stage: 'all',
    dimension: 'market',
    title: 'Biotech / Deep Tech Market Characteristics',
    content:
      'Biotech/deep tech companies have long development cycles: 3–10 years to market. TAM analysis is less predictive early-stage; market definition around a specific patient population or use case is more credible. Team credentials (PhDs, publications, prior company exits) matter disproportionately — investors expect domain expertise. IP (patents, trade secrets) is a critical differentiator. Realistic biotech seed funding: $500K–$3M. Clinical milestones (IND filing, Phase 1 completion) are more relevant traction metrics than revenue.',
    metadata: { sector: 'biotech_deeptech' },
  },
  {
    id: 'mkt-008',
    category: 'market_benchmark',
    sector: 'consumer',
    stage: 'all',
    dimension: 'market',
    title: 'Consumer App / Brand Benchmarks',
    content:
      'Consumer app benchmarks: D1 retention 25–40% is good, D7 retention 15–25%, D30 retention 8–15%. DAU/MAU ratio: 20–25% for typical apps, 50%+ for exceptional (Facebook-level). CAC via paid social: $2–$15 per install for games, $10–$50 for utility apps. Consumer brand CAC via DTC: $30–$100 for lower AOV products. Brand-driven NPS: 40+ is excellent. Organic/viral growth (k-factor > 0.5) significantly changes unit economics. Monthly churn for subscriptions: <3% is strong for consumer.',
    metadata: { sector: 'consumer' },
  },
  {
    id: 'mkt-009',
    category: 'market_benchmark',
    sector: 'all',
    stage: 'all',
    dimension: 'market',
    title: 'LTV:CAC Ratio Universal Benchmarks',
    content:
      'LTV:CAC ratio benchmarks by stage: Pre-seed/seed: >3:1 is the minimum bar. Series A: >4:1. Series B+: >5:1. Best-in-class SaaS companies target 8:1+. LTV:CAC above 20:1 is almost always overstated without strong evidence. Payback period (months to recover CAC): <12 months is healthy for B2C, <18 months for B2B. If CAC is not yet measurable, founders should describe their channel hypothesis with rationale for expected CAC.',
    metadata: { ltvCacMin: 3, ltvCacMax: 20 },
  },
  {
    id: 'mkt-010',
    category: 'market_benchmark',
    sector: 'all',
    stage: 'all',
    dimension: 'market',
    title: 'TAM Sizing Realism Benchmarks',
    content:
      'TAM sizing credibility: Bottom-up TAM ($X customers × $Y ACV = $Z market) is far more credible than top-down ("the global X market is $500B"). Investors distrust TAM > $100B for early-stage companies as it signals imprecise targeting. More convincing: a $500M–$5B serviceable addressable market (SAM) with a clear go-to-market wedge. Market growth rate should be backed by a named research source. Fastest-growing markets: AI/ML (30%+ CAGR), climate tech (25%+), digital health (18%+), cybersecurity (15%+).',
    metadata: {},
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GTM PLAYBOOKS
// ─────────────────────────────────────────────────────────────────────────────

const GTM_PLAYBOOKS: KnowledgeChunk[] = [
  {
    id: 'gtm-001',
    category: 'gtm_playbook',
    sector: 'saas_b2b',
    stage: ['pre-seed', 'seed'],
    dimension: 'goToMarket',
    title: 'B2B SaaS Early-Stage GTM Channels',
    content:
      'Proven early-stage B2B SaaS channels: (1) Founder-led cold email — 200+ targeted emails/week, 3–8% reply rate, personalized first line; (2) LinkedIn outreach — 50+ connection requests/day, 10–20% acceptance, follow-up sequence; (3) Content + SEO — 6–12 month lag, but compounds; (4) Warm intros via investors, advisors, YC network — highest conversion (30–60% to meeting); (5) Product Hunt / communities (Slack groups, Indie Hackers) for early traction. Do NOT run paid ads before product-market fit. Prioritize channels where you can do things that don\'t scale.',
    metadata: {},
  },
  {
    id: 'gtm-002',
    category: 'gtm_playbook',
    sector: 'all',
    stage: 'all',
    dimension: 'goToMarket',
    title: 'ICP Definition Template',
    content:
      'A high-quality ICP (Ideal Customer Profile) must include: (1) Company firmographics: industry, company size (headcount/revenue), funding stage, geography; (2) Buyer persona: job title, department, decision-making authority (economic buyer, champion, blocker); (3) Trigger events: what recently happened to make them need your product NOW (new regulation, funding round, headcount growth, product launch); (4) Pain point: quantified business impact of the problem ($X lost/wasted, Y hours per week); (5) Exclusion criteria: who is NOT your customer. Weak ICPs say "SMBs in tech." Strong ICPs say "Series A B2B SaaS companies (50–200 employees) with a VP of Sales who recently hired their first SDR team."',
    metadata: {},
  },
  {
    id: 'gtm-003',
    category: 'gtm_playbook',
    sector: 'saas_b2c',
    stage: ['pre-seed', 'seed'],
    dimension: 'goToMarket',
    title: 'B2C / Consumer Early-Stage GTM Channels',
    content:
      'Proven early-stage B2C channels: (1) TikTok/Instagram organic — highest organic reach currently, creator-style content outperforms polished ads; (2) Reddit/community seeding — identify 3–5 subreddits where ICP lives, provide genuine value before promoting; (3) Influencer micro-partnerships — 10K–100K follower creators at $100–$500 per post, track with unique discount codes; (4) Referral programs — offer incentive on both sides (give $10, get $10); (5) App store optimization (ASO) for mobile; (6) PR/launch on Product Hunt. Avoid paid Facebook/Google until ROAS is validated >2:1.',
    metadata: {},
  },
  {
    id: 'gtm-004',
    category: 'gtm_playbook',
    sector: 'all',
    stage: 'all',
    dimension: 'goToMarket',
    title: 'Messaging Testing Framework',
    content:
      'High-quality messaging tests include: (1) Hypothesis: what specific claim are you testing ("Pain-focused headline drives 2x more CTR than benefit-focused"); (2) Method: A/B test on landing page, email subject line, or ad copy with ≥200 impressions per variant; (3) Metric: specific KPI (CTR, trial signup rate, email open rate); (4) Result: exact numbers ("Version A: 3.2% CTR, Version B: 5.8% CTR — benefit headline won"); (5) Action: what changed in messaging based on results. Weak: "We tested different messages and some worked better." Strong: "We tested 4 value props over 2 weeks via cold email — \'save 5 hours/week\' had 6.2% reply rate vs 2.1% for \'reduce errors\' variant."',
    metadata: {},
  },
  {
    id: 'gtm-005',
    category: 'gtm_playbook',
    sector: 'marketplace',
    stage: ['pre-seed', 'seed'],
    dimension: 'goToMarket',
    title: 'Marketplace Cold-Start GTM Strategy',
    content:
      'Marketplace cold-start strategies: (1) Single-player mode — ensure the product has value for one side before needing the other (e.g., portfolio tool for freelancers before adding clients); (2) Supply-side first — seed 20–50 high-quality suppliers/providers manually, then drive demand; (3) Geographic constraint — launch in one city/vertical to achieve density; (4) Seed supply yourself — act as the supplier initially (Airbnb founders rented their own apartment first); (5) Community leverage — find existing communities where both sides exist (Etsy launched at craft fairs). Key metric: time-to-first-transaction for new supply-side onboards (<7 days is strong).',
    metadata: {},
  },
  {
    id: 'gtm-006',
    category: 'gtm_playbook',
    sector: 'all',
    stage: 'all',
    dimension: 'goToMarket',
    title: 'Sales Cycle Benchmarks by Deal Size',
    content:
      'B2B sales cycle benchmarks: SMB (ACV <$5K): 2–4 weeks. Mid-market ($5K–$50K ACV): 1–3 months. Enterprise ($50K+ ACV): 3–12 months. Add 2–4 weeks per additional stakeholder in buying committee. Typical enterprise deal involves 6–8 stakeholders. Procurement adds 2–6 weeks. Security review adds 2–8 weeks. Pipeline conversion benchmarks: qualified lead to proposal 30–40%; proposal to close 20–30% for mid-market; 10–20% enterprise. Accurate pipeline requires 3x pipeline coverage for reliable quarterly forecasting.',
    metadata: {},
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEAM SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_SIGNALS: KnowledgeChunk[] = [
  {
    id: 'team-001',
    category: 'team_signal',
    sector: 'all',
    stage: 'all',
    dimension: 'team',
    title: 'High-Quality Founder-Market Fit Signals',
    content:
      'Investors evaluate founder-market fit on: (1) Personal pain: did the founder personally experience the problem? (2) Domain depth: years in the industry, roles held, specific companies/teams; (3) Unique insight: what does this founder know that others don\'t? (4) Network access: first customers, hiring, partnerships from personal network; (5) Technical credibility: for deep-tech, did they build something similar before? Strong origin stories include specific company names, job titles, quantified pain ("spent 3 years at Goldman as an analyst, spent 20% of my time manually reconciling data across 4 spreadsheets"). Weak stories: "I noticed businesses struggle with X" (observer, not insider).',
    metadata: {},
  },
  {
    id: 'team-002',
    category: 'team_signal',
    sector: 'all',
    stage: 'all',
    dimension: 'team',
    title: 'Strong vs Weak Unfair Advantage Patterns',
    content:
      'Strong unfair advantages (hard to copy): (1) Distribution moat: existing relationships with the buyer or distribution channel; (2) Data moat: proprietary data that improves the product over time; (3) Network effects: product becomes more valuable as more people use it; (4) Regulatory advantage: license, patent, or compliance expertise; (5) Technical breakthrough: genuinely novel approach that competitors cannot easily replicate; (6) Community: existing community that becomes the initial market. Weak "advantages" (easily copied): "We move faster than big companies," "Our team is passionate," "No one has done this exact thing before." Investors look for advantages that are structural, not motivational.',
    metadata: {},
  },
  {
    id: 'team-003',
    category: 'team_signal',
    sector: 'all',
    stage: 'all',
    dimension: 'team',
    title: 'Resilience and Learning Velocity Signals',
    content:
      'Strong resilience indicators for investors: (1) Specific failed assumptions with documented learning ("We believed enterprise buyers would pay $50K ACV. After 10 calls, we learned procurement alone requires 6-month cycles — we pivoted to mid-market"); (2) Iteration speed: shipped and learned in ≤2 week cycles; (3) Pivot quality: pivoted based on data, not opinion; (4) Persistence through a specific hard moment (described concretely, not generically); (5) Number of customer conversations (50+ shows dedication). Red flags: no failed assumptions (overconfident), only positive framing, no specific numbers or timelines in resilience story.',
    metadata: {},
  },
  {
    id: 'team-004',
    category: 'team_signal',
    sector: 'all',
    stage: 'all',
    dimension: 'team',
    title: 'Co-Founder and Team Composition Norms',
    content:
      'YC research shows: 2–3 co-founders outperform solo founders by 163% in outcomes. Ideal co-founder split: technical + business (most common), or dual technical for deep tech. Equity split: equal or near-equal (60/40) for co-founders hired at inception signals trust. Large skews (90/10) often cause conflict. Advisors ≠ co-founders; advisor equity is typically 0.1–0.5%. Serial founders raise 3x faster and at 2x valuation on average. Prior work history together is the strongest predictor of founder relationship success.',
    metadata: {},
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRACTION MILESTONES
// ─────────────────────────────────────────────────────────────────────────────

const TRACTION_MILESTONES: KnowledgeChunk[] = [
  {
    id: 'traction-001',
    category: 'traction_milestone',
    sector: 'saas_b2b',
    stage: 'pre-seed',
    dimension: 'traction',
    title: 'B2B SaaS Pre-Seed Traction Benchmarks',
    content:
      'Pre-seed B2B SaaS traction benchmarks (to raise $500K–$2M): 3–10 paying customers (even at discounted/beta pricing), OR 20+ letters of intent (LOIs), OR $5K–$20K MRR. Customer interviews: 50+ is strong, 20+ is adequate. Pilot programs with Fortune 500 customers count as strong traction even without payment. Key question investors ask: "Would your current customers be very disappointed if your product disappeared tomorrow?" (PMF benchmark: >40% saying yes).',
    metadata: { sector: 'saas_b2b', stage: 'pre-seed' },
  },
  {
    id: 'traction-002',
    category: 'traction_milestone',
    sector: 'saas_b2b',
    stage: 'seed',
    dimension: 'traction',
    title: 'B2B SaaS Seed Traction Benchmarks',
    content:
      'Seed B2B SaaS traction benchmarks (to raise $1M–$4M): $10K–$100K MRR, 10–50 paying customers, net revenue retention >100%, month-over-month growth 15–25%. Logo quality matters: 1 Fortune 500 logo = 10 SMB logos in investor perception. Sales cycle documented. First referenceable customers (willing to take investor calls). Annual contract value (ACV) validated at target price point. Churn <3% monthly.',
    metadata: { sector: 'saas_b2b', stage: 'seed' },
  },
  {
    id: 'traction-003',
    category: 'traction_milestone',
    sector: 'saas_b2c',
    stage: ['pre-seed', 'seed'],
    dimension: 'traction',
    title: 'B2C / Consumer Traction Benchmarks',
    content:
      'B2C traction benchmarks for raising: Pre-seed: 1K–10K active users OR 500+ waitlist signups with strong engagement. Seed: 10K–100K MAU, $10K+ MRR, D30 retention >15%, word-of-mouth growth. Engagement is more important than raw numbers at early stage. NPS >40 is strong. Social proof: press coverage, community engagement, user testimonials. Viral coefficient k > 0.3 is meaningful for growth investors.',
    metadata: {},
  },
  {
    id: 'traction-004',
    category: 'traction_milestone',
    sector: 'all',
    stage: 'all',
    dimension: 'traction',
    title: 'Customer Commitment Signal Quality',
    content:
      'Customer commitment levels from strongest to weakest: (1) Paid invoice — highest signal, especially at full price; (2) Signed contract / LOI — strong, especially if from a recognizable brand; (3) Verbal commitment with timeline — moderate; (4) Pilot/POC in progress — moderate; (5) Waitlist with credit card — moderate; (6) Email waitlist — weak; (7) "Very interested" verbal — very weak. Investors discount uncommitted interest by 80–90%. Ten paying customers > 1,000 people who said "sounds interesting."',
    metadata: {},
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCORING RUBRICS (for LLM answer evaluator)
// ─────────────────────────────────────────────────────────────────────────────

const SCORING_RUBRICS: KnowledgeChunk[] = [
  {
    id: 'rubric-001',
    category: 'scoring_rubric',
    sector: 'all',
    stage: 'all',
    dimension: 'product',
    title: 'Customer Quote / Evidence Quality Rubric',
    content:
      'Score 80–100: Direct quote from a named customer (even anonymized by role) with specific pain expressed, ideally with a number ("I was spending 8 hours a week on this"). Score 60–79: Paraphrased customer feedback with specific pain point, clear problem description. Score 40–59: General positive feedback, vague pain ("they liked it", "said it was useful"). Score 20–39: Generic testimonial language without specific pain or outcome. Score 0–19: No real customer voice, or clearly fabricated/AI-style language.',
    metadata: { field: 'customerQuote' },
  },
  {
    id: 'rubric-002',
    category: 'scoring_rubric',
    sector: 'all',
    stage: 'all',
    dimension: 'product',
    title: 'Failed Assumption Quality Rubric',
    content:
      'Score 80–100: Names a specific assumption that was wrong ("We thought CTOs would be the buyer; turned out it was VP of Engineering"), describes what data changed the view, explains what changed in the product/strategy. Score 60–79: Clear wrong assumption, some evidence of learning and change. Score 40–59: Mentions a challenge without specifying the assumption or what changed. Score 20–39: Vague failure ("we had to adjust our approach") with no specifics. Score 0–19: No failed assumptions shared, or only positive pivots framed as "discoveries."',
    metadata: { field: 'failedBelief' },
  },
  {
    id: 'rubric-003',
    category: 'scoring_rubric',
    sector: 'all',
    stage: 'all',
    dimension: 'team',
    title: 'Problem Origin Story Quality Rubric',
    content:
      'Score 80–100: Personal firsthand experience at a specific company/role, quantified impact of the problem, clear "why me" narrative, timeline and context. Example: "As a logistics manager at Flexport for 4 years, I spent 15 hours/week manually reconciling carrier invoices across 6 different portals. When we missed a $200K billing error because of this, I knew there had to be a better way." Score 60–79: Industry experience with pain point, less quantified. Score 40–59: Observed the problem in others, not personal. Score 20–39: Generic market observation. Score 0–19: No personal connection, purely theoretical.',
    metadata: { field: 'problemStory' },
  },
  {
    id: 'rubric-004',
    category: 'scoring_rubric',
    sector: 'all',
    stage: 'all',
    dimension: 'team',
    title: 'Unfair Advantage / Moat Quality Rubric',
    content:
      'Score 80–100: Names specific structural moat — a named relationship (e.g., "Our co-founder was VP of Procurement at Amazon; first 10 customers are her former colleagues"), proprietary data, patent pending, or a technical breakthrough that took years to build. Score 60–79: Clear domain expertise advantage with specific experience. Score 40–59: General industry experience cited as advantage without specifics. Score 20–39: Team passion or speed cited as advantage (not structural). Score 0–19: No real advantage articulated, or clearly generic language like "we are the only ones solving this."',
    metadata: { field: 'advantageExplanation' },
  },
  {
    id: 'rubric-005',
    category: 'scoring_rubric',
    sector: 'all',
    stage: 'all',
    dimension: 'goToMarket',
    title: 'ICP Description Quality Rubric',
    content:
      'Score 80–100: Includes all of: specific industry vertical, company size range, buyer role/title, department, trigger event that makes them need your product NOW, and exclusion criteria. Example: "Series B+ B2B SaaS companies (100–500 employees), Head of Revenue Operations or VP Sales, who just hired a new CRO and need to overhaul their sales process within 90 days. NOT a fit: companies with <20 person sales teams or those in heavy implementation phases." Score 60–79: Most elements present, clear buyer persona. Score 40–59: Industry and size but no trigger or exclusion. Score 20–39: Just a vertical or size. Score 0–19: "SMBs" or similarly vague.',
    metadata: { field: 'icpDescription' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BLUFF PATTERNS (enhanced detection context)
// ─────────────────────────────────────────────────────────────────────────────

const BLUFF_PATTERNS: KnowledgeChunk[] = [
  {
    id: 'bluff-001',
    category: 'bluff_pattern',
    sector: 'all',
    stage: 'all',
    dimension: 'all',
    title: 'AI-Generated Narrative Detection Patterns',
    content:
      'AI-generated founder narratives tend to: (1) Use abstract nouns without concrete referents ("leveraging synergies," "driving value across the ecosystem"); (2) List features rather than telling a story; (3) Lack specific names, dates, companies, or dollar amounts; (4) Use passive voice for failures ("challenges were encountered") vs active for successes; (5) Have suspiciously complete, well-structured answers that cover every possible angle; (6) Not have a single surprising or counterintuitive detail. Real founder answers are often incomplete, specific to one problem, use informal language, and contain unexpected insights.',
    metadata: {},
  },
  {
    id: 'bluff-002',
    category: 'bluff_pattern',
    sector: 'all',
    stage: 'all',
    dimension: 'market',
    title: 'Inflated Market Data Patterns',
    content:
      'Common signs of inflated market data: (1) All metrics are perfectly round ($1M CAC, $10M LTV, 10% conversion); (2) LTV:CAC > 15:1 without extraordinary unit economics explanation; (3) TAM > $100B cited for an early-stage product with no market segmentation; (4) Conversion rates > 20% for cold outbound at scale; (5) Claiming 100K+ target customers without specifying how they were counted; (6) Revenue projections that assume linear scaling without a clear growth driver. Realistic data has imperfect numbers: "$127K MRR as of last month," "42 customer conversations across 3 segments."',
    metadata: {},
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  ...MARKET_BENCHMARKS,
  ...GTM_PLAYBOOKS,
  ...TEAM_SIGNALS,
  ...TRACTION_MILESTONES,
  ...SCORING_RUBRICS,
  ...BLUFF_PATTERNS,
];

/** Quick lookup by chunk ID */
export const KNOWLEDGE_BY_ID = new Map<string, KnowledgeChunk>(
  KNOWLEDGE_BASE.map(chunk => [chunk.id, chunk])
);
