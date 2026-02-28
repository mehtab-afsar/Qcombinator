# Edge Alpha — Agent & Action Improvement TODO

---

## What's Missing: The Agents Don't Talk to Each Other in Real-Time

Right now agents share context via artifact reads. That's passive. They need to actively trigger each other.

---

## Cross-Agent Orchestration

- [ ] Build an **event bus** — when any agent completes an action, it emits an event that other agents can subscribe to
- [ ] Patel completes ICP document → auto-trigger Susi to create deal pipeline stage filters matching that ICP
- [ ] Patel sends outreach → when a reply comes in (webhook on Resend), auto-notify Susi with "New inbound lead, draft a response?"
- [ ] Maya completes brand messaging → auto-update Patel's outreach templates to use the new positioning/tone
- [ ] Felix connects Stripe and pulls MRR → auto-update the Q-Score traction dimension, auto-update Sage's investor update draft, auto-update the pitch deck financial slide
- [ ] Harper posts a job → Atlas should auto-research whether competitors are hiring for the same role and surface a competitive hiring insight
- [ ] Nova gets survey responses back → auto-trigger PMF agent to re-score product dimension, alert Strategy agent if NPS drops below threshold
- [ ] Atlas detects competitor pricing change → alert Patel to revise positioning, alert Susi to update battle card talk track
- [ ] Sage sets a fundraising milestone → auto-create a countdown in the dashboard, alert Felix to prepare financials 2 weeks before
- [ ] Leo generates SAFE → auto-notify Felix to model the dilution, auto-notify Sage to add it to investor update

---

## Patel (GTM) — Gaps & Improvements

### Current state: Has lead enrichment, outreach send, landing page deploy, web research. Solid.

### Missing actions
- [x] **Outreach reply tracking** — `app/api/webhook/resend/route.ts` — Resend webhook listener for opens, clicks, replies. Inline stats: "Batch #3: 47 sent, 12 opened, 3 replied"
- [ ] **Outreach reply drafting** — when a reply comes in, Patel should auto-draft a response based on the reply content and the original context
- [ ] **Outreach sequence automation** — multi-step: Day 0 intro → Day 3 follow-up → Day 7 value add → Day 14 breakup
- [ ] **A/B test outreach** — split contacts into groups, send variant A to half, variant B to other half, track which performs better
- [ ] **Landing page analytics** — surface visits in chat: "Your landing page got 83 visits this week, 12 from LinkedIn"
- [ ] **Landing page iteration** — founder says "change the headline" → Patel regenerates just that section, re-deploys, preserves URL
- [x] **Channel-specific content** — `app/api/agents/patel/content-calendar/route.ts` — 4-week social media plan with actual written posts
- [x] **Directory/listing submissions** — `app/api/agents/patel/directories/route.ts` — Product Hunt, HackerNews, BetaList, vertical directories with submission-ready copy
- [x] **ICP validation loop** — `app/api/agents/patel/icp-validation/route.ts` — analyzes outreach_sends by ICP segment, recommends refinements based on real open/reply data

### Missing artifacts
- [x] **Content Calendar** — 4-week social media plan with actual written posts
- [ ] **Launch Plan** — pre-launch checklist, launch day schedule, post-launch week plan
- [ ] **Landing Page Copy** — standalone copy artifact separate from the deployed page

---

## Susi (Sales) — Gaps & Improvements

### Current state: Has deal pipeline CRM, deal reminders, proposal generation. Decent but disconnected.

### Missing actions
- [ ] **Auto-enrich new deals** — when a deal enters pipeline, auto-run Hunter.io to get contact details, company info, LinkedIn URL
- [ ] **Deal scoring** — score each deal by likelihood to close based on: stage, days in stage, engagement signals, company size vs ICP
- [x] **Follow-up drafting** — `app/api/agents/susi/followup/route.ts` — auto-draft follow-up email based on last interaction and deal context
- [ ] **Auto-move stale deals** — deals stuck >14 days auto-flag as at-risk, >30 days auto-suggest moving to lost
- [x] **Revenue forecasting** — `app/api/agents/susi/forecast/route.ts` — stage-weighted pipeline forecast: "You have $45K in qualified pipeline. Expected revenue: $9K in 60 days"
- [x] **Win/loss logging** — win/loss modal in SalesScriptRenderer; win_reason + loss_reason columns in `deals` table
- [ ] **Proposal tracking** — track if proposal was opened (trackable link). Alert founder when prospect opens it
- [x] **Meeting prep** — `app/api/agents/susi/meeting-prep/route.ts` — company background, contact's role, deal history, talking points, objections
- [ ] **Pipeline analytics dashboard** — conversion rates per stage, average time in each stage, velocity trends

### Missing artifacts
- [ ] **Pricing Strategy** — recommended pricing model, price points, tier structure, discounting policy
- [ ] **Qualification Scorecard** — BANT/MEDDIC framework customized to the founder's product
- [ ] **Proposal Template** — reusable proposal structure pre-filled with company info

---

## Felix (Finance) — Gaps & Improvements

### Current state: Has Stripe connect, investor update email, financial summary artifact. The weakest "action" agent.

### Missing actions
- [ ] **Auto-refresh Stripe data** — scheduled job that pulls MRR weekly and updates the financial summary artifact automatically
- [x] **Runway alarm** — `app/api/agents/felix/runway-alert/route.ts` — when runway drops below threshold, sends email alert via Resend
- [x] **Actuals vs projections tracking** — `app/api/agents/felix/actuals/route.ts` — compares actual MRR vs projected, LLM variance analysis with drivers and actions
- [ ] **Bank connect** — Mercury API integration to pull real burn rate and cash position
- [x] **Invoice generation** — `app/api/agents/felix/invoice/route.ts` — generates styled HTML invoice with company details pre-filled, downloads as file
- [x] **Expense categorization** — `app/api/agents/felix/expenses/route.ts` — categorizes expenses (payroll, infra, marketing, legal), surfaces burn breakdown
- [x] **Scenario modeling** — `app/api/agents/felix/scenario/route.ts` — "What if I hire 2 engineers?" → recalculates runway, burn, break-even in real-time
- [x] **Board deck financials** — `app/api/agents/felix/board-deck/route.ts` — auto-generates financial slides from Stripe + expense data, downloadable HTML

### Missing artifacts
- [ ] **Financial Model** — 24-month projection with assumptions, 3 scenarios, exportable CSV
- [x] **Fundraising Calculator** — `app/api/agents/felix/fundraising/route.ts` — dilution calc, post-money valuation, use-of-funds breakdown, AI recommendation
- [x] **Cap Table** — `app/api/agents/leo/cap-table/route.ts` — health score, dilution analysis, issues panel (built under Leo)
- [ ] **Board Update** — monthly metrics email (internal board-facing, different from investor update)

---

## Maya (Brand) — Gaps & Improvements

### Current state: Has brand messaging artifact, blog post generation, landing page deploy, social templates. Good content generation.

### Missing actions
- [ ] **Blog post SEO optimization** — keyword research via Tavily, optimize title/meta/headers, suggest internal/external links
- [x] **Content repurposing engine** — `app/api/agents/maya/repurpose/route.ts` — Twitter thread, LinkedIn post, newsletter excerpt, social graphic from one blog post
- [ ] **Social media post scheduling** — Buffer/Typefully integration to actually schedule posts
- [x] **Email newsletter builder** — `app/api/agents/maya/newsletter/route.ts` — subject line, body, CTA, send via Resend, downloads as HTML
- [x] **Brand consistency checker** — `app/api/agents/maya/brand-check/route.ts` — scores copy against brand messaging for tone, voice, positioning consistency
- [x] **Pitch deck narrative** — `app/founder/pitch-deck/page.tsx` — 10-slide deck generator pulling real agent artifacts, downloadable HTML presentation
- [x] **Press kit generation** — `app/api/agents/maya/press-kit/route.ts` — company boilerplate, founder bio, key stats, logo guidelines, media contact — HTML download

### Missing artifacts
- [ ] **Investor Narrative** — the story arc specifically for fundraising conversations
- [ ] **Content Playbook** — content pillars, content types, distribution strategy, founder personal brand plan
- [ ] **One-Pager / Tear Sheet** — formatted single-page company summary for cold investor outreach

---

## Harper (HR) — Gaps & Improvements

### Current state: Has hiring plan artifact, public job application page, resume screener. The application flow is strong.

### Missing actions
- [x] **Candidate sourcing** — `app/api/agents/harper/source/route.ts` — searches GitHub, LinkedIn, AngelList for profiles matching JD via Tavily, surfaces top candidates
- [x] **Candidate outreach** — `app/api/agents/harper/outreach/route.ts` — drafts personalized recruiting message for email/LinkedIn/Twitter with "Open in Gmail" link
- [ ] **Interview scheduling** — candidate passes screening → generate Calendly link or suggest available times
- [x] **Interview scorecard** — `app/api/agents/harper/scorecard/route.ts` — structured evaluation form per application, scores stored in DB
- [x] **Offer letter generation** — `app/api/agents/harper/offer-letter/route.ts` — styled HTML offer letter with compensation details, optional Resend delivery
- [x] **Pipeline analytics** — `app/api/agents/harper/pipeline/route.ts` — sourced → applied → screened → interviewed → offered → hired funnel with conversion rates, time-in-stage
- [x] **Reference check kit** — `app/api/agents/harper/reference/route.ts` — role-specific reference questions with red-flag probes and signal questions
- [x] **Rejection emails** — `app/api/agents/harper/reject/route.ts` — personalized rejection email via Resend, marks application rejected in DB

### Missing artifacts
- [ ] **Job Descriptions** — individual JDs per role (currently only hiring_plan which lists roles)
- [ ] **Interview Kit** — per-role structured interview plan with questions and scoring rubric
- [ ] **Compensation Framework** — salary bands, equity ranges, negotiation playbook
- [x] **Onboarding Checklist** — `app/api/agents/harper/onboarding/route.ts` — week-1 plan, tools, people to meet, 30-day goals; downloads as print-ready HTML

---

## Atlas (Competitive Intel) — Gaps & Improvements

### Current state: Has competitive matrix artifact, live Tavily research, competitor tracking, Google Alerts links. Good foundation.

### Missing actions
- [ ] **Automated periodic monitoring** — weekly cron job that re-scrapes each tracked competitor and diffs against last snapshot
- [x] **Tech stack detection** — `app/api/agents/atlas/techstack/route.ts` — detects competitor tech stacks via Tavily research
- [x] **Job posting monitoring** — `app/api/agents/atlas/job-postings/route.ts` — scrapes competitor careers pages, surfaces hiring signals and role patterns
- [x] **App store review monitoring** — `app/api/agents/atlas/review-analysis/route.ts` — scrapes reviews weekly, summarizes sentiment trends, surfaces exploitable complaints
- [x] **Social listening** — `app/api/agents/atlas/social/route.ts` — searches Twitter/Reddit/HN for competitor mentions, sentiment analysis, trending complaints
- [ ] **Pricing change detection** — snapshot competitor pricing pages weekly, alert on any change with a diff
- [ ] **Market sizing from competitive data** — estimate combined market revenue from headcount, funding, and pricing
- [ ] **Competitive deal alert** — when Susi logs a lost deal to a specific competitor, Atlas auto-updates that competitor's battle card

### Missing artifacts
- [ ] **Battle Cards** — individual per-competitor cards (currently bundled in competitive_matrix)
- [ ] **Market Map** — visual categorization of the landscape
- [ ] **Win/Loss Framework** — template + pattern detection after enough data

---

## Sage (Strategy) — Gaps & Improvements

### Current state: Has strategic plan artifact, investor update email, investor contacts CRM. The least "active" agent.

### Missing actions
- [x] **Goal tracking with accountability** — `app/api/agents/sage/goals/route.ts` — OKR progress sliders, weekly check-ins, LLM accountability feedback, momentum badges
- [x] **Milestone countdown** — `app/api/agents/sage/milestone/route.ts` — fundraising milestones with countdown, completion tracking, LLM assessment
- [x] **Cross-agent weekly briefing** — `app/api/agents/sage/briefing/route.ts` — Monday briefing pulling from all 9 agents: pipeline, competitive, financial, brand, hiring, PMF signals
- [x] **Decision journal** — `app/api/agents/sage/decisions/route.ts` — logs decisions with LLM confidence/reversibility/watchFor assessment, stored in agent_activity
- [x] **Strategic contradiction detection** — `app/api/agents/sage/contradictions/route.ts` — reads across all 12 artifact types, flags misalignments with alignment score
- [x] **Pivot signal monitoring** — `app/api/agents/sage/pivot/route.ts` — evaluates Q-Score, pipeline win rate, NPS, MRR, runway; returns pivotScore 0-100 with pivot options
- [x] **Board meeting prep** — `app/api/agents/sage/board-prep/route.ts` — full board packet from all agents: Felix financials + Atlas + Harper + Nova + Susi + Sage strategy
- [x] **Investor outreach execution** — `app/api/agents/sage/investor-update/route.ts` + `app/api/agents/investor/contacts/route.ts` — sends warm intro emails, tracks contacts

### Missing artifacts
- [x] **OKRs** — covered by strategic_plan artifact + sage/goals check-in system
- [x] **Weekly Briefing** — sage/briefing generates and stores as agent artifact
- [x] **Pivot/Persevere Analysis** — sage/pivot generates full evaluation with pivot options, red flags, green lights

---

## Nova (PMF) — Gaps & Improvements

### Current state: Has PMF survey artifact, hosted survey page, survey results aggregation. Solid survey flow.

### Missing actions
- [x] **Survey distribution** — `app/api/agents/nova/distribute/route.ts` — sends survey via Resend to customer list, batched delivery
- [x] **Continuous response monitoring** — `app/api/survey/analyze/route.ts` — auto-analyzes responses as they come in, updates PMF assessment in real-time
- [x] **Reddit/Twitter/forum scraping for problem validation** — `app/api/agents/nova/validate-problem/route.ts` — surfaces real quotes, links, and potential early adopters
- [x] **Churn prediction signals** — `app/api/agents/nova/churn/route.ts` — churn risk score, at-risk segments, churn predictors, save playbook, early warning metrics
- [x] **Feature request aggregation** — `app/api/agents/nova/features/route.ts` — clusters feedback into themes, ranks by frequency, maps to product roadmap
- [x] **User interview scheduling** — `app/api/agents/nova/interview-schedule/route.ts` + `app/api/agents/nova/interview-notes/route.ts` — identifies power users, drafts interview request, structures notes
- [x] **Cohort analysis** — `app/api/agents/nova/cohort/route.ts` — segments respondents by signup date/plan/usage, NPS by cohort, trend analysis
- [ ] **PMF score calculation** — composite score from: retention, NPS, organic referrals, usage frequency, expansion revenue. Track over time

### Missing artifacts
- [ ] **Customer Insight Report** — synthesis of all customer data into themes, personas, opportunities
- [ ] **Experiment Tracker** — hypothesis, test, metric, result log with suggested experiments
- [ ] **User Personas** — data-driven personas from real survey/usage data
- [ ] **Feature Prioritization Matrix** — ICE/RICE scored feature list

---

## Leo (Legal) — Gaps & Improvements

### Current state: Has legal checklist artifact, NDA generator, term sheet analyzer. Functional but limited.

### Missing actions
- [x] **Document version tracking** — `app/api/agents/leo/diff/route.ts` — diffs two contract versions, highlights every change, severity rating, founder vs investor impact
- [ ] **Compliance monitoring** — periodically scan privacy policy page and data practices, flag gaps (GDPR, email consent, etc.)
- [x] **Contract clause library** — `app/api/agents/leo/clauses/route.ts` — 10 clause types, 3 risk-level variants each, key terms to negotiate
- [x] **IP audit** — `app/api/agents/leo/ip-audit/route.ts` — code authors, prior employer claims, OSS licenses, contractor IP assignments; risk score + recommendations
- [x] **Regulatory research** — `app/api/agents/leo/regulatory/route.ts` — industry-specific regulations (HIPAA, SOX, COPPA), compliance checklist
- [x] **Cap table validation** — `app/api/agents/leo/cap-table/route.ts` — health score, legal issues (missing option pool, unvested shares, advisor agreements)

### Missing artifacts
- [x] **SAFE Agreement Draft** — `app/api/agents/leo/safe/route.ts` — pre-filled SAFE (post-money or pre-money), downloads as print-ready HTML
- [x] **Privacy Policy + ToS** — `app/api/agents/leo/privacy-policy/route.ts` — actual drafted documents, downloads as HTML
- [ ] **Contractor Agreement** — ready-to-sign IC agreement
- [x] **Co-Founder Agreement** — `app/api/agents/leo/cofounder/route.ts` — equity split, vesting, IP assignment, dispute resolution, exit provisions; print-ready HTML

---

## Agent UX Improvements (All Agents)

### Chat experience
- [ ] **Structured intake mode** — step-by-step form for artifact building: "Step 1 of 5: Tell me about your target customer"
- [ ] **Inline action cards** — when agent suggests an action, render as approve/reject card, not just text
- [ ] **Progress indicators during actions** — "Enriching 47 contacts..." with a progress bar
- [ ] **Action preview before execution** — before Patel sends emails, show preview panel with approve/edit per recipient
- [ ] **Artifact diff on regeneration** — show what changed from previous version, not just replace it
- [x] **Artifact section editing** — Revise mode in DeliverablePanel: highlight section → "Revise this section" → agent rewrites just that part

### Agent workspace
- [ ] **Unified inbox for all agent actions** — one place for: Patel's replies, Harper's applications, Susi's reminders, Nova's responses, Atlas's alerts
- [ ] **Agent scheduling** — "Patel, send follow-ups every Tuesday at 9am" — agent remembers and executes on schedule
- [ ] **Undo/rollback** — every action reversible within a window
- [ ] **Agent delegation** — founder in Strategy chat says "Get me a financial model" → Sage delegates to Felix, result surfaces back

---

## Data Connections That Would Transform Agents

### High impact integrations
- [x] **Stripe** — `app/api/agents/felix/stripe/route.ts` — restricted key, pulls real MRR/ARR/active subscriptions/last 30d revenue
- [ ] **Google Analytics / Plausible / PostHog** — pull real traffic data for Patel GTM performance, Maya content performance, Nova activation funnel
- [ ] **Intercom / Crisp / support tool** — pull support tickets for Nova churn signals and Atlas competitive mentions
- [ ] **GitHub** — commit frequency, contributors, deployment frequency → Q-Score product dimension
- [ ] **Calendly / Cal.com** — real meeting data for Susi sales velocity and Sage investor meeting tracking
- [ ] **Google Sheets / Airtable** — let founders connect existing data sources

---

## Q-Score ← Agent Feedback Loop (Currently Weak)

### What exists: Agent artifact completion gives a one-time dimension boost. That's it.

### What should exist
- [ ] **Action-based scoring** — "sent 200 outreach emails, got 12 replies, booked 3 calls" should boost GTM score more than just having a GTM playbook
- [ ] **Outcome-based scoring** — Stripe MRR goes up after GTM actions → traction dimension auto-increases
- [ ] **Engagement quality scoring** — founders who use agents daily and iterate should score higher on "coachability"
- [x] **Score challenge completion** — `app/founder/improve-qscore/page.tsx` — 12 artifact challenges with completion status, evidence attachment, each verified by agent data
- [x] **Investor-visible agent activity** — deal flow page shows `agentActionsThisWeek` badge + "Active agents" count + deliverables count
- [ ] **Decay tied to agent activity** — Q-Score decays faster if agents are inactive, stays fresh with active execution

---

## Missing Entirely: The Founder Operating System Layer

### Right now agents are 9 separate tools. They should feel like ONE system running your startup.

- [x] **Morning briefing** — `app/api/digest/daily/route.ts` — daily digest: overnight replies, new applications, competitive alerts, financial position, today's priorities; email via Resend
- [x] **Weekly scorecard** — `app/api/digest/weekly/route.ts` — Sunday night digest: metrics vs last week, agent activity summary, Q-Score movement, wins, risks, next week's focus; email via Resend
- [ ] **Task extraction** — every agent conversation extracts action items → task created, reminder set, tracked to completion
- [x] **Unified timeline** — `app/founder/activity/page.tsx` — chronological feed of everything: emails sent, deals moved, applications, competitors tracked, surveys, documents generated, score changes
- [x] **"What should I work on right now?"** — `app/api/qscore/priority/route.ts` + Dashboard "Today's Focus" widget — AI looks at all agent data, deadline proximity, pipeline health, score gaps, runway → recommends top 3 priorities
