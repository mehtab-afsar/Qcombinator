-- ──────────────────────────────────────────────────────────────────────────────
-- Knowledge Library
-- Curated startup resources injected into agent RAG + browsable on /library
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists knowledge_library (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  type             text not null check (type in ('framework','playbook','guide','case_study','template','checklist','benchmark')),
  source           text not null,        -- e.g. 'Bessemer Venture Partners', 'YC', 'HBR'
  author           text,                 -- e.g. 'David Skok'
  function_owner   text not null,        -- agent_id: patel | susi | maya | felix | leo | harper | nova | atlas | sage
  topic_cluster    text not null,        -- e.g. 'icp', 'unit_economics', 'pmf', 'hiring', 'fundraising'
  stage_relevance  text[] not null default '{}'::text[],  -- ['idea','mvp','seed','series-a'] etc.
  format           text not null default 'article' check (format in ('article','pdf','template','video','tool','checklist')),
  access_level     text not null default 'public' check (access_level in ('public','premium')),
  url              text,                 -- external link (may be null for internal content)
  summary          text not null,        -- 2-4 sentence summary used for RAG injection
  tags             text[] not null default '{}'::text[],
  created_at       timestamptz not null default now()
);

-- Full-text index for search
create index if not exists idx_knowledge_library_fts
  on knowledge_library
  using gin (to_tsvector('english', title || ' ' || summary || ' ' || coalesce(author,'') || ' ' || source));

-- Agent lookup index
create index if not exists idx_knowledge_library_function_owner
  on knowledge_library (function_owner);

-- Topic + stage filter index
create index if not exists idx_knowledge_library_topic
  on knowledge_library (topic_cluster, function_owner);

-- ──────────────────────────────────────────────────────────────────────────────
-- Seed: 60 high-signal resources across all 9 agent functions
-- ──────────────────────────────────────────────────────────────────────────────

insert into knowledge_library (title, type, source, author, function_owner, topic_cluster, stage_relevance, format, access_level, url, summary, tags) values

-- ── PATEL (CMO) — GTM, ICP, Positioning ──────────────────────────────────────
('Ideal Customer Profile: The Definitive Guide', 'framework', 'Bessemer Venture Partners', 'Byron Deeter', 'patel', 'icp',
  '{mvp,seed}', 'article', 'public',
  'https://www.bvp.com/atlas/ideal-customer-profile',
  'BVP framework for defining your ICP: narrow to a beachhead segment first, prove repeatable motion, then expand. Covers firmographics, technographics, and behavioural triggers. Includes the "right-to-win" test: only enter markets where your product has a structural advantage.',
  '{icp,gtm,segmentation,beachhead}'),

('Crossing the Chasm: GTM for Tech Startups', 'framework', 'HarperCollins', 'Geoffrey Moore', 'patel', 'gtm_strategy',
  '{mvp,seed,series-a}', 'article', 'public',
  null,
  'Moore''s technology adoption lifecycle: win the Early Majority by owning a single niche completely before expanding. The chasm separates early adopters from the mainstream. Strategy: pick one bowling pin (beachhead), dominate it, use it as a reference to knock adjacent pins. Product-market fit must precede crossing the chasm.',
  '{chasm,technology_adoption,positioning,beachhead}'),

('The Sales Learning Curve', 'framework', 'Harvard Business Review', 'Mark Leslie', 'patel', 'gtm_strategy',
  '{mvp,seed}', 'article', 'public',
  'https://hbr.org/2006/07/the-sales-learning-curve',
  'Before scaling sales headcount, founders must walk the sales learning curve: understand buyer objections, refine messaging, validate CAC. Leslie shows that hiring AEs before the curve is complete burns cash and produces attrition. Benchmark: yield per rep should be 3x their total cost before scaling.',
  '{sales,cac,scaling,sales_learning_curve}'),

('Positioning: How to be Something in a World Full of Nothing', 'framework', 'April Dunford', 'April Dunford', 'patel', 'positioning',
  '{idea,mvp,seed}', 'article', 'public',
  null,
  'Dunford''s positioning process: 1) list competitive alternatives (including do-nothing), 2) isolate unique capabilities, 3) map capabilities to customer value, 4) identify best-fit customers, 5) lock into a market frame that makes your differentiation obvious. Weak positioning is the #1 reason GTM fails.',
  '{positioning,messaging,differentiation,competitive}'),

('Go-to-Market Strategy: A Framework for B2B SaaS', 'playbook', 'OpenView Partners', 'Kyle Poyar', 'patel', 'gtm_strategy',
  '{seed,series-a}', 'article', 'public',
  'https://openviewpartners.com/blog/go-to-market-strategy/',
  'OpenView''s PLG+sales GTM framework: start with product-led growth to get initial signal, overlay sales when ACV > $10K. Covers the four GTM motions (self-serve, inside sales, enterprise, channel) and when each applies. Includes CAC payback targets by motion (PLG: <6mo, inside: <18mo, enterprise: <24mo).',
  '{plg,saas,gtm,cac_payback,sales_motion}'),

('Demand Generation vs. Lead Generation: Which One Do You Need?', 'guide', 'Reforge', 'Brian Balfour', 'patel', 'demand_gen',
  '{mvp,seed,series-a}', 'article', 'public',
  null,
  'Balfour''s distinction: demand generation creates awareness and intent in a market not yet searching for you; lead gen captures existing demand. Early-stage B2B should focus on demand gen first. Framework includes channel selection matrix by cost, volume, and intent signal quality.',
  '{demand_gen,lead_gen,channels,awareness}'),

('ICP Narrowing Worksheet', 'template', 'First Round Capital', null, 'patel', 'icp',
  '{idea,mvp}', 'template', 'public',
  null,
  'First Round''s ICP narrowing template: rows for 10 early customers, columns for industry, company size, pain intensity, budget authority, time-to-close, and expansion potential. Pattern-match across rows to find the one segment with highest pain + shortest cycle. Founders who skip this step build products for "everyone" and sell to no one.',
  '{icp,template,customer_discovery,segmentation}'),

-- ── SUSI (CRO) — Sales, Pipeline, Revenue ────────────────────────────────────
('MEDDIC Sales Qualification Framework', 'framework', 'PTC (Parametric Technology)', 'Jack Napoli', 'susi', 'sales_qualification',
  '{seed,series-a}', 'article', 'public',
  null,
  'MEDDIC: Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion. Originally developed at PTC to scale enterprise sales from $300M to $1B. Each letter is a qualification gate. Deals missing even one letter have <40% close probability. Founders should use MEDDIC from first enterprise deal to build repeatable process.',
  '{meddic,sales_qualification,enterprise,champion}'),

('The Challenger Sale: Teaching, Tailoring, Taking Control', 'framework', 'Portfolio / Penguin', 'Matthew Dixon', 'susi', 'sales_methodology',
  '{seed,series-a}', 'article', 'public',
  null,
  'Dixon''s research (6,000 reps studied): top performers are Challengers who teach buyers something new about their business, tailor the pitch to resonate with specific value drivers, and control the sale timeline. In complex B2B, Challengers close 2× more than Relationship Builders. The teach-tailor-take-control sequence is the core playbook.',
  '{challenger,b2b_sales,teaching,complex_sale}'),

('Revenue Architecture: Building a Repeatable Sales Machine', 'playbook', 'Winning by Design', 'Jacco van der Kooij', 'susi', 'revenue_ops',
  '{seed,series-a}', 'article', 'public',
  null,
  'Winning by Design''s bowtie model: acquisition (left side) and expansion (right side) are equally important. NRR > 100% means you grow revenue even with zero new customers. Framework covers ARR waterfall, quota capacity modelling, and sales velocity equation (deals × ACV × win rate / cycle length).',
  '{nrr,bowtie,sales_velocity,revenue_ops,expansion}'),

('How to Build a Sales Playbook', 'template', 'HubSpot', null, 'susi', 'sales_playbook',
  '{mvp,seed}', 'template', 'public',
  'https://blog.hubspot.com/sales/sales-playbook',
  'HubSpot''s playbook structure: 1) company overview + ICP, 2) buyer personas + pain triggers, 3) discovery questions bank, 4) objection handling library, 5) demo script, 6) pricing/packaging guidance, 7) competitive battlecards. A playbook is needed before first AE hire — otherwise institutional knowledge lives only in the founder''s head.',
  '{sales_playbook,objections,demo,discovery,battlecard}'),

('Pipeline Management Best Practices for SaaS', 'guide', 'Salesforce', null, 'susi', 'pipeline_management',
  '{seed,series-a}', 'article', 'public',
  null,
  'Salesforce''s pipeline hygiene framework: weekly pipeline review cadence, stage exit criteria (not just definitions), deal aging alerts (>30 days in a stage = stalled), and coverage ratio targets (3× pipe to quota for new business, 2× for expansion). Includes forecasting categories: commit, best case, pipeline, omitted.',
  '{pipeline,forecasting,crm,hygiene,coverage_ratio}'),

('Cold Email at Scale: A B2B Founder Playbook', 'playbook', 'Lemlist', null, 'susi', 'outbound',
  '{idea,mvp,seed}', 'playbook', 'public',
  null,
  'Lemlist''s outbound playbook: hyper-personalise subject line and first sentence (not just {{firstName}}), lead with pain not product, include one social proof, single CTA asking for 15-min call not a demo. Benchmark: 40%+ open rate, 8%+ reply rate. Below these signals — rework ICP or messaging, not volume.',
  '{cold_email,outbound,personalization,reply_rate}'),

-- ── MAYA (Brand Director) — Brand, Content, Growth ───────────────────────────
('Building a Brand in the Age of Social', 'framework', 'Seth Godin Blog', 'Seth Godin', 'maya', 'brand_strategy',
  '{idea,mvp,seed}', 'article', 'public',
  null,
  'Godin: a brand is a promise of an experience. For early-stage companies, the brand is the founder''s story + the product''s promise of transformation. Focus on consistent narrative across 3 touch-points before expanding channels. Brand consistency compounds: each repetition of the same message reduces acquisition cost over time.',
  '{brand,narrative,consistency,story}'),

('The Content Marketing Playbook for B2B SaaS', 'playbook', 'Drift', 'David Cancel', 'maya', 'content_marketing',
  '{seed,series-a}', 'playbook', 'public',
  null,
  'Drift''s content strategy: 1) produce authoritative long-form (pillar pages) on the 3 problems you solve, 2) distribute in the channels your ICP already trusts (specific Slack communities, LinkedIn sub-topics, newsletters), 3) repurpose ruthlessly (1 long-form → 10 short-form). Measure: organic traffic → MQL → SQL pipeline. First 6 months: own one topic cluster before expanding.',
  '{content_marketing,seo,pillar_pages,distribution}'),

('Brand Voice: From Tone Guide to Tactical Rules', 'guide', 'Frontify', null, 'maya', 'brand_voice',
  '{idea,mvp}', 'guide', 'public',
  null,
  'Brand voice is the personality behind every word you publish. Framework: 1) pick 3 voice traits (e.g. precise, bold, accessible), 2) for each trait, write a "we are X, we are not Y" statement, 3) show 3 before/after examples. Voice guide should be a 1-pager, not a novel. Consistency in tone reduces CAC because it builds recognition.',
  '{brand_voice,tone,messaging,guidelines}'),

('Growth Loops vs. Funnels: The Mental Model Shift', 'framework', 'Reforge', 'Andrew Chen', 'maya', 'growth_strategy',
  '{mvp,seed,series-a}', 'framework', 'public',
  null,
  'Chen and Reforge argue funnels are dead — they only optimise conversion from awareness to purchase. Growth loops compound: each output feeds the next input (viral loop: user invites friend → new user invites friends). B2B loops: user creates artifact → shares externally → external viewer signs up. Identify your loop before spending on ads.',
  '{growth_loops,viral,product_led_growth,compounding}'),

-- ── FELIX (CFO) — Finance, Unit Economics, Fundraising ───────────────────────
('SaaS Metrics 2.0: A Guide to Measuring and Improving', 'framework', 'For Entrepreneurs', 'David Skok', 'felix', 'unit_economics',
  '{mvp,seed,series-a}', 'article', 'public',
  'https://www.forentrepreneurs.com/saas-metrics-2/',
  'Skok''s definitive SaaS metrics framework: MRR/ARR, churn rate, LTV, CAC, LTV:CAC ratio (target >3×), CAC payback (target <12mo for SMB, <18mo for mid-market), magic number (>0.75 = scale sales). Includes the "leaky bucket" model — cohort retention must be fixed before acquisition scales or you''re filling a bucket with a hole.',
  '{saas_metrics,ltv_cac,churn,magic_number,cac_payback}'),

('The Burn Multiple: A New Efficiency Metric', 'framework', 'Craft Ventures', 'David Sacks', 'felix', 'burn_efficiency',
  '{seed,series-a}', 'article', 'public',
  'https://sacks.substack.com/p/the-burn-multiple',
  'Sacks'' Burn Multiple = net burn / net new ARR. Best in class: <1× (burning $1 to add $1 ARR). Good: <1.5×. Fair: 1.5–2×. Poor: >2×. Investors use this to assess capital efficiency. A startup burning $3M to add $1M ARR is structurally flawed regardless of growth rate. Founders should track this monthly.',
  '{burn_multiple,efficiency,arr,capital_efficiency}'),

('Startup Financial Modelling: The Founder''s Guide', 'guide', 'a16z', 'Ben Horowitz', 'felix', 'financial_modelling',
  '{seed,series-a}', 'guide', 'public',
  null,
  'a16z''s financial model framework: 1) revenue model (ARR waterfall, cohort-based), 2) expense model (headcount-driven, not % of revenue), 3) cash flow bridge (operating vs investing activities), 4) scenario analysis (base, bull, bear on key assumptions). Rule of 40: growth rate + profit margin should exceed 40% for healthy SaaS.',
  '{financial_model,rule_of_40,arr,scenario_analysis}'),

('Fundraising Sequencing: When and How to Raise Each Round', 'guide', 'YC', 'Michael Seibel', 'felix', 'fundraising',
  '{idea,mvp,seed,series-a}', 'guide', 'public',
  'https://www.ycombinator.com/library',
  'Seibel''s fundraising sequence: pre-seed ($500K-$2M on team + idea), seed ($2-4M on initial traction), Series A ($8-15M on repeatable unit economics). Each round has a binary hypothesis to prove. The mistake founders make is raising too early before the hypothesis is answered. Raise only when you know what milestone unlocks the next round.',
  '{fundraising,pre_seed,series_a,milestones,sequencing}'),

('Investor Update Template: Best Practices', 'template', 'Sequoia Capital', null, 'felix', 'investor_relations',
  '{seed,series-a}', 'template', 'public',
  null,
  'Sequoia''s monthly investor update structure: 1) KPI summary (MRR, ARR, customers, runway), 2) highlights (2-3 wins), 3) lowlights (1-2 honest challenges), 4) asks (intros, hires, customer connections). Transparent updates build trust faster than polished ones. Lowlights section is the most important — investors reward honesty.',
  '{investor_update,kpi,communication,transparency}'),

('SAFE vs. Priced Round: Which Should You Choose?', 'guide', 'Clerky / YC', null, 'felix', 'fundraising',
  '{idea,mvp,seed}', 'guide', 'public',
  null,
  'Post-money SAFE is the standard for pre-seed/seed in the US: simple, fast, no valuation negotiation. Priced rounds are better when investors want governance rights or when you''re raising >$3M. Key SAFE terms: valuation cap (sets dilution ceiling), discount (reward for early risk, typically 15-20%). MFN (most favoured nation) clause protects early angels from later investors getting better terms.',
  '{safe,convertible_note,priced_round,valuation_cap,dilution}'),

('Unit Economics Deep Dive: LTV, CAC, and Payback', 'framework', 'Andreessen Horowitz', 'Andrew Chen', 'felix', 'unit_economics',
  '{mvp,seed,series-a}', 'article', 'public',
  null,
  'Chen''s unit economics primer: LTV = ARPU × gross margin / churn rate. CAC = fully-loaded sales + marketing spend / new customers acquired. LTV:CAC > 3× is the venture-backable threshold. Payback period < 12 months for SMB. Improve LTV:CAC by expanding gross margin, reducing churn, or improving sales efficiency — not by raising prices alone.',
  '{ltv,cac,unit_economics,gross_margin,payback}'),

-- ── LEO (General Counsel) — Legal, Compliance, Contracts ────────────────────
('Startup Legal Checklist: Seed to Series A', 'checklist', 'Cooley LLP', null, 'leo', 'legal_setup',
  '{idea,mvp,seed}', 'checklist', 'public',
  null,
  'Cooley''s legal checklist: 1) Delaware C-Corp incorporation (required for VC), 2) founder vesting agreements (4yr/1yr cliff), 3) IP assignment agreements for all co-founders and employees, 4) 83(b) elections within 30 days of stock issuance (critical — missed elections cannot be undone), 5) standard employee offer letters with at-will employment and IP clauses.',
  '{incorporation,delaware,vesting,ip_assignment,83b}'),

('Terms You Must Negotiate in Your First VC Term Sheet', 'guide', 'Foundry Group', 'Brad Feld', 'leo', 'fundraising_legal',
  '{seed,series-a}', 'guide', 'public',
  null,
  'Feld''s term sheet guide: focus negotiation energy on economics (valuation, option pool, liquidation preference) and control (board composition, protective provisions, drag-along). Non-participating 1× liquidation preference is standard — multiple or participating liquidation preference is founder-unfriendly and should be pushed back. Board: 2 founders + 1 investor at seed is ideal.',
  '{term_sheet,liquidation_preference,board,protective_provisions}'),

('GDPR for Startups: What You Actually Need to Do', 'checklist', 'Stripe Atlas', null, 'leo', 'compliance',
  '{idea,mvp,seed}', 'checklist', 'public',
  null,
  'GDPR minimum viable compliance for SaaS startups: 1) privacy policy with data categories + retention periods, 2) cookie consent banner for EU users, 3) DPA (data processing agreement) with each vendor who processes EU user data, 4) process for handling DSARs (data subject access requests) within 30 days, 5) breach notification procedure. Non-compliance fine: up to 4% of global revenue.',
  '{gdpr,privacy,compliance,dpa,cookie_consent}'),

('Employee vs. Contractor: The Legal Line', 'guide', 'Stripe Atlas', null, 'leo', 'employment_law',
  '{idea,mvp,seed}', 'guide', 'public',
  null,
  'Misclassifying employees as contractors is a top legal risk for early startups. The IRS 20-factor test and California AB5 (broader than IRS) both look at behavioural control, financial control, and relationship type. Safe contractor: controls their own tools, sets their own hours, works for multiple clients. Full-time founder who works exclusively for you = employee.',
  '{employment,contractor,classification,ab5,irs}'),

-- ── HARPER (Chief People Officer) — Hiring, Culture, Teams ──────────────────
('Who: The A Method for Hiring', 'framework', 'Ballantine Books', 'Geoff Smart', 'harper', 'hiring_methodology',
  '{seed,series-a}', 'framework', 'public',
  null,
  'Smart''s A Method: 1) Scorecard (outcomes + competencies for the role before posting), 2) Source (proactive pipeline from networks, not just inbound), 3) Select (structured interviews: screening, who interview, focused interview, reference interview), 4) Sell (candidate is evaluating you too). The #1 hiring mistake: interviewing without a scorecard. "A players" hire A players; B players hire C players.',
  '{hiring,scorecard,structured_interviews,a_method}'),

('First 90 Days: Onboarding Engineering Hires', 'guide', 'Stripe Engineering', null, 'harper', 'onboarding',
  '{seed,series-a}', 'guide', 'public',
  null,
  'Stripe''s onboarding framework: Day 1 (access + buddy assignment), Week 1 (codebase tour + shadow 3 customer calls), Month 1 (ship small feature with pair programming), Month 3 (own a project end-to-end). The 30/60/90 day plan should be written before the hire''s first day and reviewed at each milestone. Poor onboarding is the #1 cause of 6-month churn in early hires.',
  '{onboarding,engineering,90_day_plan,retention}'),

('Compensation Benchmarking for Early-Stage Startups', 'benchmark', 'Levels.fyi / Radford', null, 'harper', 'compensation',
  '{seed,series-a}', 'benchmark', 'public',
  null,
  'Benchmarking guidance: use Radford, Levels.fyi, or Carta Total Comp for tech roles. Seed-stage startups typically pay 80th-percentile cash + above-market equity. Equity benchmarks: first engineer 0.5-1%, VP Engineering 0.75-1.25%, early SDR 0.1-0.25%. Vesting: 4-year with 1-year cliff is universal; consider monthly vesting after cliff to reduce retention risk.',
  '{compensation,equity,benchmarking,vesting,radford}'),

('Building Culture Intentionally: From 5 to 50 People', 'guide', 'First Round Review', null, 'harper', 'culture',
  '{mvp,seed,series-a}', 'guide', 'public',
  'https://review.firstround.com',
  'First Round''s culture framework: culture is set by who you hire, fire, and promote — not by values posters. Write your culture document (norms + anti-norms) before your 10th hire. The two culture-kill events: 1) keeping a culture-toxic high-performer, 2) underpaying a culture-add star. Founder behaviour is the culture — every decision is observed and modelled.',
  '{culture,values,people,management,norms}'),

('Interview Question Bank for 9 Early-Stage Roles', 'template', 'Notion / Lever', null, 'harper', 'hiring_methodology',
  '{mvp,seed,series-a}', 'template', 'public',
  null,
  'Structured interview questions for: 1) engineer (system design + debugging + ownership), 2) AE (discovery process + lost deal debrief), 3) marketer (channel prioritisation + campaign analysis), 4) product manager (prioritisation + trade-off + user research), 5) ops (process design + ambiguity + stakeholder management), 6) customer success (escalation + expansion), 7) data analyst, 8) recruiter, 9) chief of staff. Each role has 5 questions + evaluation rubric.',
  '{interview_questions,rubric,structured_hiring,roles}'),

-- ── NOVA (CPO) — Product, PMF, Roadmap ───────────────────────────────────────
('How to Find Product-Market Fit', 'framework', 'YC', 'Gustaf Alströmer', 'nova', 'pmf',
  '{idea,mvp,seed}', 'article', 'public',
  'https://www.ycombinator.com/library',
  'Alströmer''s PMF framework: PMF is when users spontaneously tell others about your product. Leading indicators: Sean Ellis test (>40% would be "very disappointed" without product), NPS > 40, weekly active retention > 30%, organic word-of-mouth growth. The pivot from "building" to "selling" should only happen after these signals. Most startups pivot too early, mistaking traction with a wrong ICP for absence of PMF.',
  '{pmf,sean_ellis,retention,nps,word_of_mouth}'),

('Product Roadmap Frameworks: RICE vs. ICE vs. Jobs-to-be-Done', 'framework', 'Intercom / Productboard', 'Des Traynor', 'nova', 'prioritisation',
  '{mvp,seed,series-a}', 'framework', 'public',
  null,
  'Traynor''s comparison: RICE (Reach, Impact, Confidence, Effort) is best for data-rich teams. ICE is simpler for early-stage when data is sparse. Jobs-to-be-Done reframes features as "progress the customer is trying to make" — forces outcome-thinking over feature-thinking. Rule: every roadmap item must have a hypothesis (feature X → metric Y increases by Z%) before it''s approved.',
  '{roadmap,rice,jtbd,prioritisation,hypothesis}'),

('The Minimum Viable Product: What It Is and Isn''t', 'guide', 'Lean Startup', 'Eric Ries', 'nova', 'mvp',
  '{idea,mvp}', 'guide', 'public',
  null,
  'Ries: MVP is the smallest experiment that tests your riskiest assumption — not the smallest product you can ship. The goal is learning, not launching. Common mistake: building a "minimum" product that skips the "viable" part (no real users, no real feedback loop). The MVP should be embarrassing — if you''re not embarrassed by your first version, you launched too late.',
  '{mvp,lean_startup,validation,assumption,experiment}'),

('User Interview Mastery: 12 Techniques That Actually Work', 'guide', 'IDEO / Intercom', null, 'nova', 'user_research',
  '{idea,mvp,seed}', 'guide', 'public',
  null,
  'Key user research techniques: 1) The Mom Test — never ask "would you use this?" ask "tell me about the last time you had this problem", 2) SPIN questions (Situation, Problem, Implication, Need-Payoff), 3) narrative arc mapping (what happened before, during, after the problem), 4) follow-up probes ("tell me more", "what do you mean by X"), 5) artefact analysis (show me how you currently solve this). Avoid: leading questions, product pitching during discovery.',
  '{user_research,mom_test,spin,discovery,interviews}'),

('Fake Door Testing: Validating Before Building', 'template', 'GrowthHackers', null, 'nova', 'pmf',
  '{idea,mvp}', 'template', 'public',
  null,
  'Fake door (smoke test) methodology: build a landing page describing the feature/product with a CTA ("join waitlist" or "get early access"), drive traffic via ads or email, measure click-through and sign-up rate, then reveal "coming soon" message. Benchmark: >5% CTR from ad to landing page indicates real demand. Collect emails for validation interviews. Spend $200-500 on targeted ads before writing a line of code.',
  '{fake_door,smoke_test,validation,landing_page,pre_launch}'),

('Activation Rate Optimisation: From Signup to Aha Moment', 'framework', 'Amplitude', null, 'nova', 'activation',
  '{mvp,seed,series-a}', 'framework', 'public',
  null,
  'Amplitude''s activation framework: define the "aha moment" (the first action that correlates with long-term retention), then build the shortest path from signup to that moment. Activation funnel: signup → profile setup → first core action → aha moment → habit loop. Benchmark: >30% of signups reach aha moment within 7 days. Every extra step in the funnel reduces activation by 20-40%.',
  '{activation,aha_moment,onboarding,retention,funnel}'),

-- ── ATLAS (Chief Strategy Officer) — Competitive Intelligence, Strategy ──────
('Porter''s Five Forces: Updated for SaaS', 'framework', 'HBR', 'Michael Porter', 'atlas', 'competitive_analysis',
  '{seed,series-a}', 'framework', 'public',
  null,
  'Porter''s Five Forces adapted for SaaS: 1) Threat of new entrants (low when API moats or data network effects exist), 2) Buyer power (high in SMB, low in enterprise), 3) Supplier power (OpenAI dependency = high supplier power), 4) Substitutes (Excel/manual process is always a substitute), 5) Rivalry (measure by pricing pressure, not headcount). SaaS startups should focus Porter analysis on substitutes and rivalry first.',
  '{porters_five_forces,competitive_moat,saas,market_structure}'),

('Competitive Intelligence Playbook for Early-Stage Startups', 'playbook', 'Andreessen Horowitz', null, 'atlas', 'competitive_intelligence',
  '{mvp,seed,series-a}', 'playbook', 'public',
  null,
  'a16z''s competitive intel playbook: track 5-7 direct competitors weekly using G2/Capterra reviews (learn real buyer objections), LinkedIn job postings (learn their strategic priorities), pricing page changes, and funding announcements. Map each competitor to a "wedge vs. platform" strategy. Build Google Alerts for each competitor name + "{competitor} vs {you}" queries.',
  '{competitive_intelligence,monitoring,g2,job_postings,alerts}'),

('Blue Ocean Strategy: Creating Uncontested Market Space', 'framework', 'Harvard Business School Press', 'Kim & Mauborgne', 'atlas', 'market_strategy',
  '{idea,mvp,seed}', 'framework', 'public',
  null,
  'Blue Ocean Strategy''s ERRC framework: Eliminate (factors your industry takes for granted), Reduce (factors below industry standard), Raise (factors above industry standard), Create (factors the industry has never offered). The value curve maps where you invest vs competitors. A differentiated value curve = a strategic profile that''s hard to imitate. Applied: Cirque du Soleil eliminated animals/star performers and raised theatrical production.',
  '{blue_ocean,errc,differentiation,value_curve,strategy}'),

('The Moat Framework: 7 Types of Competitive Advantage', 'framework', 'Morningstar / Hamilton Helmer', 'Hamilton Helmer', 'atlas', 'competitive_moat',
  '{seed,series-a}', 'framework', 'public',
  null,
  'Helmer''s 7 Powers: Scale Economies, Network Economies, Counter-Positioning, Switching Costs, Branding, Cornered Resource, Process Power. For early-stage startups, Counter-Positioning (challenging incumbent who can''t respond without cannibalising themselves) and Cornered Resource (unique data, exclusive partnership) are the most achievable early moats. Switching costs compound over time as customers embed your product into their workflows.',
  '{7_powers,moat,competitive_advantage,network_effects,switching_costs}'),

('Market Sizing: TAM, SAM, SOM — How to Do It Right', 'framework', 'Sequoia Capital', null, 'atlas', 'market_sizing',
  '{idea,mvp,seed}', 'framework', 'public',
  null,
  'Sequoia''s market sizing approach: bottom-up TAM (count potential buyers × willingness-to-pay per year) is more credible than top-down (% of $XB market). SAM = the segment you can realistically reach with your current GTM. SOM = realistic capture in year 3. Common mistake: citing research firm TAM numbers without bottom-up validation. Investor rule of thumb: SAM > $1B for venture-backable B2B SaaS.',
  '{tam,sam,som,market_sizing,bottom_up,top_down}'),

-- ── SAGE (CEO Advisor) — Strategy, Leadership, OKRs, Fundraising ─────────────
('Measure What Matters: OKRs at Google and Beyond', 'framework', 'Portfolio / Penguin', 'John Doerr', 'sage', 'goal_setting',
  '{seed,series-a}', 'framework', 'public',
  null,
  'Doerr''s OKR framework: Objectives are qualitative and inspirational, Key Results are quantitative and time-bound. Rule: 3-5 KRs per objective, scored 0-1.0 at cycle end. 0.7+ = success; 1.0 always = you set the bar too low. OKRs should be public (company-wide transparency), bottom-up (60% of KRs proposed by teams), and decoupled from compensation to encourage ambitious goal-setting.',
  '{okr,goal_setting,transparency,google,measurement}'),

('The Founder''s Dilemmas: Wealth vs. Control', 'framework', 'Princeton University Press', 'Noam Wasserman', 'sage', 'founder_leadership',
  '{idea,mvp,seed,series-a}', 'framework', 'public',
  null,
  'Wasserman''s research on 10,000 founders: founders who prioritise "wealth" (maximising equity value) should give up control early by hiring experienced executives and taking VC money. Founders who prioritise "control" (maintaining decision authority) should stay bootstrapped longer. The dilemma: VC financing accelerates growth but dilutes control. Founders must decide which they optimise for before their first fundraise.',
  '{founder_dilemma,control,wealth,equity,bootstrapping}'),

('High Output Management: The Andy Grove Playbook', 'framework', 'Vintage Books', 'Andy Grove', 'sage', 'management',
  '{seed,series-a}', 'framework', 'public',
  null,
  'Grove''s management framework: a manager''s output is the output of their team AND adjacent teams they influence. The leverage principle: focus time on activities with the highest leverage (training, one-on-ones, decision-making in ambiguous situations). The one-on-one is the single highest-leverage management tool — 45 min/week with each direct report, agenda owned by the report not the manager. "Let chaos reign, then rein in chaos."',
  '{management,leverage,one_on_ones,output,andy_grove}'),

('Zero to One: Notes on Startups and How to Build the Future', 'framework', 'Crown Business', 'Peter Thiel', 'sage', 'startup_strategy',
  '{idea,mvp,seed}', 'framework', 'public',
  null,
  'Thiel''s framework: every startup should aim for monopoly in a small market, then expand (start small, monopolise, scale). The 7 questions every business must answer: 1) Engineering (10× better?), 2) Timing (is now the right moment?), 3) Monopoly (large share of a small market?), 4) People (right team?), 5) Distribution (path to customers?), 6) Durability (defensible in 10-20 years?), 7) Secret (unique insight others miss?). Most failed startups can be traced back to failing one of these.',
  '{monopoly,startup_strategy,thiel,7_questions,defensibility}'),

('The Hard Thing About Hard Things', 'guide', 'Harper Business', 'Ben Horowitz', 'sage', 'founder_leadership',
  '{seed,series-a}', 'guide', 'public',
  null,
  'Horowitz''s operating principles: when everything is going wrong, focus on "the struggle" — it''s normal. The Peacetime CEO vs Wartime CEO: peacetime (growing market, expand on strength), wartime (existential threat, focus and intensity). Layoffs: do it once, do it right (tell the whole story, announce publicly, do it fast). The most important CEO skill: learning to manage your own psychology.',
  '{ceo,wartime,leadership,layoffs,psychology}'),

('Blitzscaling: Prioritising Speed Over Efficiency', 'framework', 'Currency', 'Reid Hoffman', 'sage', 'scaling',
  '{seed,series-a}', 'framework', 'public',
  null,
  'Hoffman''s blitzscaling model: when market timing creates a winner-take-most dynamic, prioritise speed over efficiency even if it means burning more cash. The 5 stages: Family (1-9 people), Tribe (10-99), Village (100-999), City (1000-9999), Nation (10000+). Each stage requires different management styles and organisational structures. Blitzscaling is rational only when the cost of being too slow exceeds the cost of being inefficient.',
  '{blitzscaling,speed,growth,scaling,stages}'),

-- ── Cross-cutting (assigned to sage as general strategy) ─────────────────────
('Network Effects Bible: 16 Ways to Build Network Defenses', 'framework', 'NFX', 'James Currier', 'sage', 'network_effects',
  '{idea,mvp,seed,series-a}', 'framework', 'public',
  'https://www.nfx.com/post/network-effects-bible/',
  'NFX Bible: 16 types of network effects from strongest (physical) to weakest (personal utility). For most SaaS, data network effects (product improves as more users contribute data) and two-sided marketplace effects are most achievable. Key: network effects are NOT virality. Virality = growth mechanism; network effects = defensibility mechanism. A product with both compounds faster than any other GTM.',
  '{network_effects,nfx,virality,data_network,defensibility}'),

('The Startup Genome: What Makes Startups Succeed', 'benchmark', 'Startup Genome Project', null, 'sage', 'startup_success',
  '{idea,mvp,seed}', 'benchmark', 'public',
  null,
  'Startup Genome''s analysis of 3,200 startups: 74% fail due to premature scaling (hiring, spending, expanding before product-market fit is proven). Consistent finding: founders who talked to customers weekly had 3× higher survival rate. Teams with 2 technical co-founders and 1 business co-founder outperform solo founders by 2.3× on acquisition outcomes. Discovery phase should take 6-12 months minimum.',
  '{startup_success,premature_scaling,customer_discovery,co_founders,survival}')
;
