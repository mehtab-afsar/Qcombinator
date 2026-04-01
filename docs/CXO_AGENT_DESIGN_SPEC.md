# CXO Agent Design Spec
## UI/UX, Capabilities & Architecture — All 9 Agents

---

## How the CXO Workspace Works

Every agent lives at `/founder/cxo/[agentId]`. The layout is:

```
[Collapsible CXO Sidebar (52px → 260px)] [Chat iframe → /founder/agents/[agentId]]
```

- **Sidebar** collapses to 52px (icons only), expands on hover to 260px (full labels + content)
- **Chat** is an iframe loading the full agent page with `?_embed=1` (suppresses FounderSidebar inside)
- **Artifacts** generated in chat appear as structured rendered panels (DeliverablePanel) inside the iframe

Each agent generates **structured JSON artifacts** stored in `agent_artifacts.content`. When a founder generates a deliverable, a `qscore_history` row is inserted boosting the agent's primary dimension. One boost per artifact type per user, ever.

---

## Agent Overview

| Agent | Role | Pillar | Primary Dimension | Max Pts |
|-------|------|--------|------------------|---------|
| **Patel** | CMO | Sales & Marketing | GTM | 15 pts |
| **Susi** | CRO | Sales & Marketing | Traction | 4 pts |
| **Maya** | Brand Director | Sales & Marketing | GTM | 4 pts |
| **Felix** | CFO | Operations & Finance | Financial | 6 pts |
| **Leo** | General Counsel | Operations & Finance | Team | 3 pts |
| **Harper** | Chief People Officer | Operations & Finance | Team | 5 pts |
| **Nova** | CPO | Product & Strategy | Product | 8 pts |
| **Atlas** | Chief Strategy Officer | Product & Strategy | Market | 9 pts |
| **Sage** | CEO Advisor | Product & Strategy | Market | 4 pts |

---

## 1. Patel — CMO (Go-to-Market Strategy)

**What it does:** Defines who to sell to, how to reach them, and what to say. Builds the entire outbound engine from ICP through to a full GTM Playbook.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| ICP Document | +5 pts | Firmographics, buyer persona (title/goals/frustrations), pain points with severity, buying triggers, recommended channels, qualification criteria |
| Outreach Sequence | +4 pts | 5-email cold drip with timing, subject line, body, goal, and personalisation tips per step |
| GTM Playbook | +6 pts | Company context, ICP, positioning, channel grid (budget/CAC per channel), messaging, KPI targets, 90-day execution plan |

**What the rendered artifacts look like:**

*ICP Document* — Cards showing buyer persona (day-in-life, goals, frustrations), firmographic badges (company size/industry/tech stack), pain point accordion with severity labels, buying triggers as numbered list, channel priority badges, qualification checklist. "Find Leads" button triggers Hunter.io enrichment → shows contact list → CSV export.

*Outreach Sequence* — Step selector tabs (Step 1–5). Each step: From/Subject/Body editor, timing chip ("Send on Day 3"), personalisation variables ({{firstName}}, {{company}}). "Send in Gmail" pre-fills a Gmail compose window. CSV upload for contact list with auto-header detection. Sends batch via `/api/agents/outreach/send`.

*GTM Playbook* — Dense multi-section view: positioning statement card, channel grid (priority/budget/estimated CAC per channel), messaging pillars, 90-day accordion (Phase 1/2/3 with objectives and key actions). "Deploy Landing Page" button → Netlify deploy → returns live URL. Additional buttons: Launch Copy generator, Content Calendar, A/B Test Designer, ABM Strategy, Referral Program, Partnership Strategy.

**Connected agents:** Atlas (competitive intel), Maya (brand messaging) — high relevance. Felix (CAC/LTV), Susi (sales scripts) — medium.

---

## 2. Susi — CRO (Sales & Lead Generation)

**What it does:** Builds the sales process. Qualification frameworks, objection handling, pricing strategy, and pipeline management. Creates the script a founder uses on every sales call.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| Sales Script | +4 pts | Discovery call framework, pitch structure (opener/problem/solution/social proof/CTA), objection handling accordion, closing lines, next steps |

**What the rendered artifact looks like:**

*Sales Script* — Target persona header. Discovery questions accordion (question / purpose / follow-up probe). Pitch framework sections. Objections tab — each objection expands to show the scripted response + pivot. Closing lines + next steps.

Inline tabs beyond the script:
- **Pipeline board** — Deals in columns by stage (Lead / Qualified / Proposal / Negotiating / Won / Lost). Win/loss reason modal on move. "Create Deal" button adds a new prospect.
- **Revenue Forecast** — 30/60/90d expected / optimistic / pessimistic. Close rate, pipeline health score, risk deals, AI recommendation.
- **Meeting Prep** — Select a deal → get company snapshot, talking points, likely objections, opening question.
- **Deal Scoring** — AI scores each deal 0–100 with grade + reasoning + urgency.
- **Pricing Strategy** — Recommended model, tiered pricing, free tier advice, enterprise packaging, discounting policy.
- **Pipeline Health Check** — Stage conversion rates, stale deals, bottleneck detection.

**Connected agents:** Patel (ICP context), Atlas (competitive intel) — high. Felix (pricing) — medium.

---

## 3. Maya — Brand Director (Brand & Content Marketing)

**What it does:** Builds the brand voice and story. Positioning statement, taglines, elevator pitches at every length, investor narrative, and content strategy.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| Brand Messaging | +4 pts | Positioning statement, taglines (3 variants with reasoning), elevator pitches (1-line / 30-sec / 2-min), value props, voice guide (personality/dos/don'ts/example phrases), investor narrative |

**What the rendered artifact looks like:**

*Brand Messaging* — Positioning card at top. Tagline variants as swappable cards (click to copy). Elevator pitch tab selector (1-line / 30-sec / 2-min). Value props as 3-column cards (headline / description / proof point). Voice guide panel (tone personality pills, do-say / don't-say columns, 5 example phrases). Investor narrative section for pitch context.

Interactive features in the panel:
- **Generate Blog Post** — Topic input → LLM generates blog post in brand voice → HTML download
- **Content Repurposing** — Paste any content → returns Twitter thread, LinkedIn post, newsletter excerpt, social graphic copy (tabbed, copy buttons)
- **Brand Consistency Checker** — Paste copy → scores it against brand voice across dimensions, flags issues
- **Investor Narrative Generator** — Full pitch narrative: hook, problem, solution, traction, market, business model, competitive advantage, team, ask, vision
- **Social Templates Download** — Downloads SVG bundle (Instagram 1080×1080, Twitter 1200×628, LinkedIn 1584×396) as single HTML file
- **Deploy Landing Page** — Builds and deploys brand-voice landing page to Netlify
- **SEO Optimizer** — Input blog post + target keyword → primary/secondary keywords, H1/H2 suggestions, meta description, content gaps

**Connected agents:** Patel (positioning alignment) — high. Atlas (competitive positioning), Nova (product story) — medium.

---

## 4. Felix — CFO (Financial Modeling & Metrics)

**What it does:** Builds financial clarity. Unit economics, burn analysis, scenario modeling, fundraising strategy. The agent to talk to before any investor conversation.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| Financial Summary | +6 pts | Snapshot (MRR/ARR/burn/runway/customers), unit economics verdict (LTV:CAC, payback), key insights, fundraising recommendation, use of funds breakdown, risks with mitigation |

**What the rendered artifact looks like:**

*Financial Summary* — Metrics strip at top (MRR / ARR / Burn / Runway / Customers) with trend direction. Unit economics verdict card (green/amber/red). Key insights as bullet list. Fundraising recommendation (amount / rationale / timeline). Use of funds donut or bar breakdown (%). Risks table (severity / mitigation).

Interactive features:
- **Connect Stripe** — Restricted key input → live MRR/ARR/subscription count injected into the artifact
- **Financial Model** — 24-month projection (Base/Bear/Bull scenarios), month-by-month revenue/expenses/net burn, break-even month, milestones → CSV download (Google Sheets compatible with formulas)
- **Scenario Modeling** — Describe a scenario (e.g. "lose top customer") → impact table, runway change, break-even shift
- **Fundraising Calculator** — Raise amount / pre-money / instrument → post-money, investor %, runway extension, dilution comment
- **Send Investor Update** — Recipients list, top win, challenge, ask → sends YC-style investor update email via Resend
- **Unit Economics Deep Dive** — CAC, LTV, payback period, gross margin, logo retention, expansion revenue
- **Actuals vs Projections** — Enter actual MRR → variance analysis, status, drivers, risks

**Connected agents:** Sage (strategic planning) — high. Patel (CAC/LTV), Nova (growth targets), Susi (pipeline value) — medium.

---

## 5. Leo — General Counsel (Legal & Compliance)

**What it does:** Makes sure the company doesn't have legal gaps that kill fundraising or hiring. Incorporation, IP, contracts, SAFE notes, equity plans.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| Legal Checklist | +3 pts | Incorporation items with status/urgency, IP protection items, fundraising documents needed, contract templates, red flags by stage |

**What the rendered artifact looks like:**

*Legal Checklist* — Company stage chip at top. Priority actions (red-bordered, immediate). Accordion sections: Incorporation items (status badge: done/pending/at-risk + urgency label), IP items (trademark/patent/trade-secret), Fundraising docs (document name / recommendation), Contract templates list. Red flags section (amber warning cards).

Interactive features:
- **Generate NDA** — Counterparty / type (mutual or one-way) / purpose → HTML NDA download
- **Generate SAFE** — Post/pre-money, investor name, amount, valuation cap, discount → SAFE document HTML download
- **Co-Founder Agreement** — Names, roles, equity splits, vesting → HTML download
- **Contractor Agreement** — Name, role, rate, scope → HTML download
- **Data Room Builder** — Generates HTML data room with folder structure + artifact index + missing document checklist
- **IP Strategy Generator** — Trademark / patent / trade secret recommendations
- **Term Sheet Analyzer** — Paste terms → red flags, friendly interpretation, negotiation playbook
- **Equity Plan Generator** — Option pool %, vesting years, cliff → grant templates, vesting schedule
- **Compliance Audit** — Risk assessment across incorporation, tax, employment, data privacy

**Connected agents:** Harper (hiring legal), Felix (fundraising docs) — medium.

---

## 6. Harper — Chief People Officer (HR & Team Building)

**What it does:** Builds the hiring machine. Defines what roles to hire, when, at what comp, and how to screen. Runs the entire candidate pipeline from JD to offer.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| Hiring Plan | +5 pts | Current gaps, next hires (role / priority / timing / responsibilities / requirements / salary range / equity), org roadmap by revenue milestone, compensation bands, interview process, culture values |

**What the rendered artifact looks like:**

*Hiring Plan* — Current gaps summary card. Next hires as accordion (each role: priority chip / timing / why-now paragraph / responsibilities list / requirements / nice-to-have / salary range / equity). Org roadmap: timeline by milestone ($500K ARR → hire X, $2M ARR → hire Y). Compensation bands table (role / salary / equity / stage). Interview process steps. Culture values card.

Interactive features:
- **Applications Inbox** — Loads from `/api/agents/harper/apply`, shows candidates with LLM score (0–100) + reasoning + reject button (sends rejection email via Resend)
- **Interview Scorecard** — Select candidate → notes → AI generates dimensional scorecard (technical, cultural, leadership) with recommendation
- **Offer Letter Generator** — Name / role / salary / equity / start date → HTML offer letter + option to email via Resend
- **Job Description Generator** — Role / level / department → full JD with responsibilities, requirements, nice-to-have, culture note → HTML download
- **Reference Check Kit** — Candidate profile + concerns → scripted reference questions by category (technical, cultural, red flags) + interpretation guide
- **Compensation Framework** — Salary bands by level / department, equity bands, benefits stack, negotiation playbook
- **Hiring Funnel Analytics** — Sourced / applied / screened / interviewed / offered / hired counts, conversion rates by stage, avg days to offer

**Connected agents:** Patel (hire sales/marketing) — high. Atlas (competitive hiring intel), Felix (comp budgeting) — medium.

---

## 7. Nova — CPO (Product-Market Fit)

**What it does:** Validates whether the product actually solves the problem people will pay for. Customer discovery, PMF testing, feature prioritisation, retention analysis.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| PMF Survey | +5 pts | Sean Ellis test setup, custom discovery questions, interview script by phase, experiment tracker (hypothesis / test / metric / success criteria), segment analysis |
| Interview Notes | +3 pts | 20-question customer interview script with phase structure and follow-up probes |

**What the rendered artifacts look like:**

*PMF Survey* — Target segment header. Interview script accordion (phases: intro / problem / solution / product / close, each with duration + questions). Sean Ellis section: primary question, 4 response options, the 40% benchmark benchmark. Experiments table (hypothesis / test method / success metric / status). Segment pain-level analysis.

Interactive features:
- **Host Survey** — Generates shareable survey at `/s/[surveyId]` — respondents answer directly in browser, responses saved to DB
- **Survey Analytics** — PMF score (% "very disappointed"), distribution chart, verbatim answers, early adopter segment
- **Analyze Survey** — AI analysis of all responses → top themes, key quotes, actionable insights, alerts, next steps
- **Survey Distribution** — Email list + subject + message → sends survey links via Resend
- **Churn Prediction** — Manual data or survey responses → churn score, at-risk segments, predictors, early warning metrics
- **Feature Request Aggregation** — Paste raw feedback → clustered themes with RICE scores, quick wins vs strategic bets
- **Cohort Analysis** — Breaks responses by cohort (NPS, sentiment, retention signal, best/worst cohort profiles)
- **PMF Score Calculator** — Composite PMF score with weighted dimensions, verdict, top signals, risks, next steps

**Connected agents:** Patel (ICP validation), Atlas (competitive context) — high. Susi (sales signal), Sage (roadmap alignment) — medium.

---

## 8. Atlas — Chief Strategy Officer (Competitive Intelligence)

**What it does:** Maps the competitive landscape with real web research. Builds competitive matrices, battle cards, and ongoing competitor monitoring. Uses Tavily live web search — the only agent that pulls real-time external data by default.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| Competitive Matrix | +5 pts | Market overview, competitor cards (positioning/pricing/target/strengths/weaknesses), feature comparison grid, SWOT, positioning statement, white-space opportunities |
| Battle Card | +4 pts | Per-competitor: where we win/lose, objection handlers, talk track, disqualifiers, win signals |

**What the rendered artifacts look like:**

*Competitive Matrix* — Market overview card. Competitor grid: each competitor as a card (positioning blurb, pricing tag, target customer, strengths/weaknesses lists). Feature comparison table (rows = features, columns = products, cells = ✅/❌/🟡). SWOT 2×2 grid. Positioning statement. White-space opportunities as highlighted cards.

*Battle Card* — Per-competitor view with tab selector. For each competitor: positioning matrix (dimension / us / them / verdict with colour badges), objection handling accordion (objection → scripted response + proof point), where-we-win / where-we-lose columns, win strategy paragraph, disqualifiers list.

Interactive features:
- **Track Competitor** — Name + URL → adds to tracker in `agent_activity`, enables monitoring
- **Monitor Competitors** — Per-competitor signals (price changes, job postings, feature launches), urgency scoring, recommended response
- **Pricing Monitor** — Competitor pricing tiers, free/enterprise options, pricing gap analysis, positioning opportunity
- **Battle Cards Generator** — Per-competitor cards with talk tracks and disqualifiers
- **Review Analysis** — Paste competitor reviews → top complaints (with quotes + sales angles), top praise, feature gaps
- **Job Posting Analysis** — Competitor job listings → hiring signals (new team, expansion, strategic pivots)
- **Market Size Estimation** — TAM/SAM/SOM breakdown, competitor revenue estimates, market growth rate, confidence level
- **Social Listening** — Competitor mentions → sentiment analysis, top complaints/praise, emerging themes, early warnings

**Connected agents:** Patel (positioning), Nova (competitive context) — high. Sage (strategic bets), Susi (sales positioning) — medium.

---

## 9. Sage — CEO Advisor (Strategic Planning)

**What it does:** The synthesiser. Sage reads every other agent's artifacts and helps the founder think at the 3–5 year horizon while staying grounded in quarterly execution. OKRs, strategic bets, board prep, fundraising milestones, pivot signals.

**Deliverables:**
| Artifact | Boost | What it contains |
|----------|-------|-----------------|
| Strategic Plan | +4 pts | Vision statement, current position assessment, 3 core strategic bets, quarterly OKRs (objective + key results with targets), roadmap (Now/Next/Later), risks (probability/impact/mitigation), fundraising milestones |

**What the rendered artifact looks like:**

*Strategic Plan* — Vision card at top. Current position assessment paragraph. 3 Core Bets as bold numbered cards (bet / rationale / what it requires / what it risks). OKRs accordion by quarter (objective → key results each with target metric, current, status). Roadmap in 3 columns: Now / Next / Later (initiative cards with rationale). Risks table (risk / probability / impact / mitigation). Fundraising milestones timeline.

Interactive features:
- **Send Investor Update** — Recipients + strategic summary → email via Resend
- **Export OKRs to Linear** — Copies OKRs as markdown + opens linear.app/new
- **Strategic Contradiction Detector** — Compares all artifacts across agents (ICP vs hiring plan, GTM vs product roadmap) → flags misalignments with severity
- **Board Meeting Prep** — Executive summary, financials snapshot, pipeline, product/PMF status, team, competitive landscape, strategy, risk register, anticipated board questions
- **Decision Journal** — Log decision + reasoning + alternatives → AI assessment (reversible? confidence level?), watch-for signals, reminder date
- **Goal Check-in** — OKR progress tracking → momentum score, wins, risks, focus recommendations
- **Pivot Signal Monitoring** — Pivot score, red flags + green lights, 3 pivot options with risk/rationale, persevere case, urgency
- **Exit Strategy Planning** — Exit paths (acquisition/IPO/secondary), potential acquirers list, readiness assessment, milestones to maximise valuation
- **Focus Today** — Top priority action (why now, urgency, impact) + what to avoid today
- **Weekly Standup Generator** — Team standup email from current status

Sage is the only agent with all 8 other agents as connected sources (high relevance). Every artifact the founder has built feeds into Sage's context.

---

## Shared Architecture

### How every artifact is built
1. Founder types in chat → agent responds with conversation
2. When ready, agent generates a `tool_call` in its response (non-streaming JSON path)
3. The page detects the tool_call, calls `/api/agents/generate` with the context
4. Generate route: extracts structured context → calls LLM to produce the artifact JSON → saves to `agent_artifacts` → calls `applyAgentScoreSignal()` → creates `score_evidence` row
5. `DeliverablePanel` renders the JSON using the agent's specific renderer component

### How rendered artifacts work
All deliverables render inside `DeliverablePanel` which wraps every renderer with:
- **Version tabs** — shows all versions of this artifact type, newest first
- **Quality score bar** — LLM-evaluated completeness/specificity/actionability (0–100)
- **Revise mode** — select text → right-click → rewrite instruction → LLM updates that section only
- **Share modal** — Copy text / Export PDF (window.print) / Copy Markdown (Notion/Obsidian) / Email co-founder (mailto)

### Cross-agent memory
Every agent chat gets injected with:
- Its own recent artifacts ("What you've built together")
- High-relevance agents' latest artifacts ("What other advisors built")
- Recent `agent_activity` events (what other agents have been doing)

This means Sage knows Felix's financials, Patel knows Atlas's competitive matrix, Harper knows Patel's ICP.

### Q-Score dimension mapping
| Artifact | Dimension boosted | Points |
|----------|------------------|--------|
| ICP Document | GTM | +5 |
| Outreach Sequence | GTM | +4 |
| GTM Playbook | GTM | +6 |
| Sales Script | Traction | +4 |
| Brand Messaging | Product | +4 |
| Financial Summary | Financial | +6 |
| Legal Checklist | Team | +3 |
| Hiring Plan | Team | +5 |
| PMF Survey | Traction | +5 |
| Interview Notes | Product | +3 |
| Competitive Matrix | Market | +5 |
| Battle Card | Market | +4 |
| Strategic Plan | Market | +4 |
