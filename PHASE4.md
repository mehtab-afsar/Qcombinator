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
- [ ] **Outreach reply tracking** — right now emails go out but there's no way to know what happened. Add Resend webhook listener for opens, clicks, replies. Surface stats inline: "Batch #3: 47 sent, 12 opened, 3 replied"
- [ ] **Outreach reply drafting** — when a reply comes in, Patel should auto-draft a response based on the reply content and the original context
- [ ] **Outreach sequence automation** — right now it's a one-shot blast. Build multi-step: Day 0 intro → Day 3 follow-up → Day 7 value add → Day 14 breakup. Each step auto-sends unless founder pauses
- [ ] **A/B test outreach** — split contacts into groups, send variant A to half, variant B to other half, track which performs better, auto-declare winner
- [ ] **Landing page analytics** — the Netlify deploy works but there are zero analytics. Add a tracking pixel or simple hit counter to deployed pages. Surface visits in chat: "Your landing page got 83 visits this week, 12 from LinkedIn"
- [ ] **Landing page iteration** — founder says "change the headline" → Patel regenerates just that section, re-deploys, preserves URL
- [ ] **Channel-specific content** — GTM playbook says "LinkedIn is your top channel" → Patel should auto-generate 2 weeks of LinkedIn posts ready to copy
- [ ] **Directory/listing submissions** — Patel should generate submission-ready copy for Product Hunt, HackerNews Show, BetaList, relevant directories. Not templates — actual form-fillable text
- [ ] **ICP validation loop** — after outreach runs, Patel should analyze: which ICP segments had highest open/reply rates? Recommend ICP refinement based on real data

### Missing artifacts
- [ ] **Content Calendar** — 4-week social media plan with actual written posts (currently not a deliverable)
- [ ] **Launch Plan** — pre-launch checklist, launch day schedule, post-launch week plan (currently not a deliverable)
- [ ] **Landing Page Copy** — standalone copy artifact separate from the deployed page (for founders who want to use their own hosting)

---

## Susi (Sales) — Gaps & Improvements

### Current state: Has deal pipeline CRM, deal reminders, proposal generation. Decent but disconnected.

### Missing actions
- [ ] **Auto-enrich new deals** — when a deal enters pipeline (from Patel outreach or manual), auto-run Hunter.io to get contact details, company info, LinkedIn URL
- [ ] **Deal scoring** — score each deal by likelihood to close based on: stage, days in stage, engagement signals, company size vs your ICP. Surface as a number on each deal card
- [ ] **Follow-up drafting** — when deal reminder fires, don't just say "follow up" — auto-draft the actual follow-up email based on last interaction and deal context
- [ ] **Auto-move stale deals** — deals stuck in a stage for >14 days should auto-flag as at-risk, deals stuck >30 days auto-suggest moving to lost
- [ ] **Revenue forecasting** — based on pipeline: "You have $45K in qualified pipeline. At your 20% close rate, expected revenue is $9K in 60 days"
- [ ] **Win/loss logging** — when a deal moves to closed_won or closed_lost, Susi should ask why and store the reason. After 10+ deals, pattern detection kicks in
- [ ] **Proposal tracking** — after sending a proposal, track if it was opened (if sent via a trackable link). Alert founder when prospect opens it
- [ ] **Meeting prep** — founder has a call with a prospect tomorrow → Susi should auto-generate a brief: company background, contact's role, deal history, suggested talking points, objections to prepare for
- [ ] **Pipeline analytics dashboard** — conversion rates per stage, average time in each stage, velocity trends. Not a separate page — surface inside the agent chat as a card

### Missing artifacts
- [ ] **Pricing Strategy** — recommended pricing model, price points, tier structure, discounting policy
- [ ] **Qualification Scorecard** — BANT/MEDDIC framework customized to the founder's product
- [ ] **Proposal Template** — reusable proposal structure pre-filled with company info

---

## Felix (Finance) — Gaps & Improvements

### Current state: Has Stripe connect, investor update email, financial summary artifact. The weakest "action" agent.

### Missing actions
- [ ] **Auto-refresh Stripe data** — right now it's a one-time pull. Build a scheduled job that pulls MRR weekly and updates the financial summary artifact automatically
- [ ] **Runway alarm** — when runway calculation drops below 6 months, auto-alert founder. Below 3 months, escalate to Strategy agent
- [ ] **Actuals vs projections tracking** — Felix builds a model with projections. Each week, compare against actuals from Stripe. "You projected $32K MRR by March. You're at $28K. You're 12% behind plan."
- [ ] **Bank connect** — Mercury API integration to pull real burn rate and cash position (not just revenue from Stripe)
- [ ] **Invoice generation** — founder says "invoice Acme Corp $5,000 for March" → Felix generates a PDF invoice with company details pre-filled
- [ ] **Expense categorization** — founder lists expenses → Felix categorizes (payroll, infra, marketing, legal) and surfaces burn breakdown
- [ ] **Scenario modeling** — "What if I hire 2 engineers?" or "What if churn doubles?" → Felix recalculates runway, burn, break-even in real-time
- [ ] **Board deck financials** — auto-generate the financial slides for a board deck from current Stripe + expense data

### Missing artifacts
- [ ] **Financial Model** — 24-month projection with assumptions, 3 scenarios, exportable CSV
- [ ] **Fundraising Calculator** — how much to raise, use of funds, dilution scenarios
- [ ] **Cap Table** — current ownership, post-round modeling, SAFE conversion scenarios
- [ ] **Board Update** — monthly metrics email (different from investor update — internal board facing)

---

## Maya (Brand) — Gaps & Improvements

### Current state: Has brand messaging artifact, blog post generation, landing page deploy, social templates. Good content generation.

### Missing actions
- [ ] **Blog post SEO optimization** — Maya generates a blog post but doesn't optimize it. Add keyword research via Tavily, optimize title/meta/headers, suggest internal/external links
- [ ] **Content repurposing engine** — founder writes one blog post → Maya auto-generates a Twitter thread, LinkedIn post, email newsletter excerpt, and social graphic description from it
- [ ] **Social media post scheduling** — right now Maya generates posts but founder has to manually copy them. Add Buffer/Typefully integration to actually schedule them
- [ ] **Email newsletter builder** — not just investor updates. Actual product newsletter: subject line, body, CTA, segment targeting, send via Resend to a subscriber list
- [ ] **Brand consistency checker** — founder pastes any copy (website, email, deck) → Maya scores it against the brand messaging artifact for tone, voice, positioning consistency
- [ ] **Pitch deck narrative** — Maya should generate the narrative flow of the deck, not just copy. "Open with the patient story, then pivot to the market failure, then reveal the product as inevitable"
- [ ] **Press kit generation** — company boilerplate, founder bio, logo usage guidelines, key stats, media contact — downloadable as one package

### Missing artifacts
- [ ] **Investor Narrative** — the story arc specifically for fundraising conversations
- [ ] **Content Playbook** — content pillars, content types, distribution strategy, founder personal brand plan
- [ ] **One-Pager / Tear Sheet** — formatted single-page company summary for cold investor outreach

---

## Harper (HR) — Gaps & Improvements

### Current state: Has hiring plan artifact, public job application page, resume screener. The application flow is strong.

### Missing actions
- [ ] **Candidate sourcing** — Harper should actively search for candidates. Use Tavily to search LinkedIn/GitHub/AngelList for profiles matching the job description. Surface top 10 candidates with reasoning
- [ ] **Candidate outreach** — found a great candidate → Harper drafts a personalized recruiting message, sends via Resend or generates LinkedIn DM copy
- [ ] **Interview scheduling** — candidate passes screening → Harper generates a Calendly link or suggests available times
- [ ] **Interview scorecard** — after founder interviews a candidate, Harper presents a structured evaluation form. Scores stored against the application
- [ ] **Offer letter generation** — candidate accepted? Harper generates an offer letter with compensation details from the hiring plan artifact
- [ ] **Pipeline analytics** — sourced → applied → screened → interviewed → offered → hired funnel. Conversion rates, time-in-stage, bottleneck detection
- [ ] **Reference check kit** — Harper generates reference check questions specific to the role and the candidate's claimed experience
- [ ] **Rejection emails** — auto-draft personalized, respectful rejection emails for candidates who don't pass screening

### Missing artifacts
- [ ] **Job Descriptions** — individual JDs per role (currently only hiring_plan which lists roles)
- [ ] **Interview Kit** — per-role structured interview plan with questions and scoring rubric
- [ ] **Compensation Framework** — salary bands, equity ranges, negotiation playbook
- [ ] **Onboarding Checklist** — week 1 plan, tools, people to meet, 30/60/90 goals

---

## Atlas (Competitive Intel) — Gaps & Improvements

### Current state: Has competitive matrix artifact, live Tavily research, competitor tracking, Google Alerts links. Good foundation.

### Missing actions
- [ ] **Automated periodic monitoring** — right now tracking is manual. Build a weekly cron job that re-scrapes each tracked competitor and diffs against last snapshot. Auto-generate a "Competitive Weekly Digest"
- [ ] **Tech stack detection** — use BuiltWith or Wappalyzer API to detect competitor tech stacks. "Competitor X switched from React to Next.js" or "They added Stripe, likely launching paid plans"
- [ ] **Job posting monitoring** — scrape competitor careers pages. "Competitor Y posted 3 ML engineer roles this week — likely building AI features"
- [ ] **App store review monitoring** — for competitors with mobile apps, scrape reviews weekly. Summarize sentiment trends, surface complaints founder can exploit
- [ ] **Social listening** — search Twitter/Reddit/HN for competitor mentions weekly. Sentiment analysis, trending complaints, praise patterns
- [ ] **Pricing change detection** — snapshot competitor pricing pages weekly. Alert on any change with a diff
- [ ] **Market sizing from competitive data** — "Based on competitor headcount, funding, and pricing, estimated combined market revenue is $X. Your addressable share is Y"
- [ ] **Competitive deal alert** — when Susi logs a lost deal to a specific competitor, Atlas auto-updates that competitor's battle card with the loss reason

### Missing artifacts
- [ ] **Battle Cards** — individual per-competitor cards (currently bundled in competitive_matrix)
- [ ] **Market Map** — visual categorization of the landscape
- [ ] **Win/Loss Framework** — template + pattern detection after enough data

---

## Sage (Strategy) — Gaps & Improvements

### Current state: Has strategic plan artifact, investor update email, investor contacts CRM. The least "active" agent.

### Missing actions
- [ ] **Goal tracking with accountability** — Sage sets OKRs → tracks progress weekly → sends Monday morning "This week's priorities" and Friday "How did you do?" check-ins via in-app notification or email
- [ ] **Milestone countdown** — Sage knows fundraising timeline → shows "47 days until target raise date. You've hit 2/5 milestones. Behind on: revenue target, hire #2"
- [ ] **Cross-agent weekly briefing** — every Monday, Sage auto-generates a briefing pulling data from all agents: sales pipeline status (Susi), competitive moves (Atlas), financial position (Felix), brand activity (Maya), hiring pipeline (Harper), PMF signals (Nova)
- [ ] **Decision journal** — founder logs key decisions with reasoning. Sage stores them, periodically reviews outcomes vs expectations, surfaces "Your decision to focus on enterprise 8 weeks ago has resulted in +$12K MRR but +40% longer sales cycle"
- [ ] **Strategic contradiction detection** — Sage reads across all agent artifacts and flags contradictions: "Your GTM playbook targets SMBs but your hiring plan has 2 enterprise sales reps. Misalignment?"
- [ ] **Pivot signal monitoring** — Sage continuously evaluates: retention rate, revenue growth, PMF score, competitive pressure, burn rate. When multiple signals turn negative, proactively asks "Should we discuss a pivot?"
- [ ] **Board meeting prep** — generates a full board deck by pulling from all agents: Felix financials + Atlas competitive + Harper team + Nova PMF + Susi pipeline + Sage strategy
- [ ] **Investor outreach execution** — Sage has investor contacts table. Should be able to actually send warm intro request emails, track responses, schedule meetings

### Missing artifacts
- [ ] **OKRs** — quarterly objectives and key results
- [ ] **Weekly Briefing** — auto-generated founder summary
- [ ] **Pivot/Persevere Analysis** — evidence-based framework when things aren't working

---

## Nova (PMF) — Gaps & Improvements

### Current state: Has PMF survey artifact, hosted survey page, survey results aggregation. Solid survey flow.

### Missing actions
- [ ] **Survey distribution** — Nova creates the survey but founder has to share the link manually. Nova should send the survey via Resend to a customer list (paste emails or pull from Susi's pipeline closed_won deals)
- [ ] **Continuous response monitoring** — as responses come in, Nova should auto-analyze and update the PMF assessment in real-time. "3 new responses today. NPS moved from 42 to 47. Key theme: users love feature X but struggle with onboarding"
- [ ] **Reddit/Twitter/forum scraping for problem validation** — search for people discussing the problem you solve. Surface real quotes, links, and potential early adopters
- [ ] **Churn prediction signals** — if connected to product analytics or Stripe, identify users showing churn signals (decreased usage, failed payments, support tickets). Alert founder with save playbook
- [ ] **Feature request aggregation** — pull from survey responses, support tickets, social mentions. Cluster into themes, rank by frequency, map to product roadmap
- [ ] **User interview scheduling** — identify power users from survey responses (high NPS respondents), auto-draft interview request email, provide Calendly link
- [ ] **Cohort analysis** — segment survey respondents by signup date, plan, usage level. "Users who signed up in January have 2x higher NPS than February cohort. What changed?"
- [ ] **PMF score calculation** — beyond Sean Ellis "very disappointed" metric. Composite score from: retention, NPS, organic referrals, usage frequency, expansion revenue. Track over time

### Missing artifacts
- [ ] **Customer Insight Report** — synthesis of all customer data into themes, personas, opportunities
- [ ] **Experiment Tracker** — hypothesis, test, metric, result log with suggested experiments
- [ ] **User Personas** — data-driven personas from real survey/usage data
- [ ] **Feature Prioritization Matrix** — ICE/RICE scored feature list

---

## Leo (Legal) — Gaps & Improvements

### Current state: Has legal checklist artifact, NDA generator, term sheet analyzer. Functional but limited.

### Missing actions
- [ ] **Document version tracking** — Leo generates a SAFE, founder negotiates, pastes revised version → Leo diffs the two, highlights every change, explains implications
- [ ] **Compliance monitoring** — Leo should periodically scan the founder's product (privacy policy page, data practices described in onboarding) and flag gaps: "You collect email addresses but your privacy policy doesn't mention email marketing consent"
- [ ] **Contract clause library** — founder is drafting any agreement → can ask Leo for standard clauses: non-compete, non-solicitation, indemnification, limitation of liability. Customized to their jurisdiction
- [ ] **IP audit** — Leo should ask: who wrote the code? Any prior employers with IP claims? Open source licenses in your stack? Contractor IP assignments signed? Generate a risk assessment
- [ ] **Regulatory research** — founder enters their industry → Leo researches industry-specific regulations (HIPAA for health, SOX for finance, COPPA for kids) and generates a compliance checklist
- [ ] **Cap table validation** — Leo reviews the cap table (from Felix) for legal issues: missing option pool, vesting not started, advisor shares without agreements, founder shares not restricted

### Missing artifacts
- [ ] **SAFE Agreement Draft** — pre-filled, ready to use (currently only legal_checklist exists)
- [ ] **Privacy Policy + ToS** — actual drafted documents, not just a checklist item
- [ ] **Contractor Agreement** — ready-to-sign IC agreement
- [ ] **Co-Founder Agreement** — vesting, roles, IP, exit provisions

---

## Agent UX Improvements (All Agents)

### Chat experience
- [ ] **Structured intake mode** — when building an artifact, don't open-ended chat. Show a step-by-step form: "Step 1 of 5: Tell me about your target customer" with a text area. More focused, faster, better output
- [ ] **Inline action cards** — when an agent suggests an action ("Want me to send these emails?"), render it as a card with approve/reject buttons, not just text
- [ ] **Progress indicators during actions** — "Enriching 47 contacts..." with a progress bar, not just a spinner
- [ ] **Action preview before execution** — before Patel sends emails, show a preview panel: subject line, body, recipient list. Founder reviews and clicks "Send All" or edits individual ones
- [ ] **Artifact diff on regeneration** — when regenerating an artifact, show what changed from the previous version, not just replace it
- [ ] **Artifact section editing** — highlight a section of an artifact → "Revise this section" → agent rewrites just that part while keeping everything else

### Agent workspace
- [ ] **Unified inbox for all agent actions** — one place to see: Patel's outreach replies, Harper's new applications, Susi's deal reminders, Nova's survey responses, Atlas's competitive alerts. Currently scattered across agent chats
- [ ] **Agent scheduling** — "Patel, send follow-ups every Tuesday at 9am" or "Atlas, run competitive scan every Monday" — agent remembers and executes on schedule
- [ ] **Undo/rollback** — agent sent bad emails? Revert a deal stage change? Undo last artifact regeneration? Every action should be reversible within a window
- [ ] **Agent delegation** — founder in Strategy chat says "Get me a financial model" → Sage delegates to Felix, Felix builds it, result surfaces back in Sage's chat

---

## Data Connections That Would Transform Agents

### High impact integrations
- [ ] **Stripe** (already started) — expand beyond MRR. Pull churn events, failed charges, plan changes, customer count over time. Feed to Felix, Nova, and Q-Score automatically
- [ ] **Google Analytics / Plausible / PostHog** — pull real traffic data. Feed to Patel for GTM performance, Maya for content performance, Nova for activation funnel analysis
- [ ] **Intercom / Crisp / support tool** — pull support tickets. Feed to Nova for churn signals and feature requests. Feed to Atlas for competitive mentions in support convos
- [ ] **GitHub** — pull commit frequency, contributors, deployment frequency. Feed to Q-Score product dimension. Feed to Harper for engineering team capacity assessment
- [ ] **Calendly / Cal.com** — real meeting data. Feed to Susi for sales velocity. Feed to Sage for investor meeting tracking
- [ ] **Google Sheets / Airtable** — let founders connect existing data sources. Pull whatever metrics they're already tracking

---

## Q-Score ← Agent Feedback Loop (Currently Weak)

### What exists: Agent artifact completion gives a one-time dimension boost. That's it.

### What should exist
- [ ] **Action-based scoring** — not just "built artifact" but "sent 200 outreach emails, got 12 replies, booked 3 calls" should boost GTM score more than just having a GTM playbook document
- [ ] **Outcome-based scoring** — Stripe MRR goes up after GTM actions → traction dimension auto-increases. Hire made through Harper → team dimension auto-increases
- [ ] **Engagement quality scoring** — founders who use agents daily and iterate on artifacts should score higher on "coachability" (visible to investors) than founders who generated one artifact and never returned
- [ ] **Score challenge completion** — dashboard shows "GTM is 52, complete these 3 actions to reach 65": (1) Build ICP document, (2) Send first outreach batch, (3) Get 5+ replies. Each completed action is verified by agent data, not self-reported
- [ ] **Investor-visible agent activity** — on the investor deal flow page, show not just Q-Score but: "Active agents: 7/9. Actions this week: 23. Deliverables: 8/12. Last active: 2 hours ago." Investors can see who's actually executing
- [ ] **Decay tied to agent activity** — Q-Score decays faster if agents are inactive. Stays fresh if founder is actively using agents and executing. Incentivizes continuous usage

---

## Missing Entirely: The Founder Operating System Layer

### Right now agents are 9 separate tools. They should feel like ONE system running your startup.

- [ ] **Morning briefing** — every day at 8am, generate a single digest: overnight outreach replies, new applications, competitive alerts, financial position, today's priorities, upcoming deadlines. Email + in-app
- [ ] **Weekly scorecard** — auto-generated every Sunday night: metrics this week vs last week, agent activity summary, Q-Score movement, top wins, biggest risks, next week's focus
- [ ] **Task extraction** — every agent conversation should extract action items. "You mentioned you'd follow up with Acme" → task created, reminder set, tracked to completion
- [ ] **Unified timeline** — single chronological feed of everything: emails sent, deals moved, applications received, competitors tracked, surveys completed, documents generated, score changes. The founder's startup story in real-time
- [ ] **"What should I work on right now?"** — AI looks at all agent data, deadline proximity, pipeline health, score gaps, runway, and recommends the single most important thing to do TODAY
