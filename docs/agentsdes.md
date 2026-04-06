# Q Combinator — Agent Anatomy Specification v1
## Redefining 9 CXOs + 2 New Agents as Action-Oriented Digital Employees

> **Purpose of this document:** Define what each agent truly IS — their identity, the startup problem they solve, every capability they have, every deliverable they produce, every real-world action they can take, and the APIs they run on. This is not a feature list. This is a job description for a digital employee who gets paid in results, not advice.

> **Philosophy:** No founder pays for advice. They pay for outcomes. Every agent must be measurable by a metric that changes because of them.

---

## Current Reality — What Exists Today

| Integration | Status |
|---|---|
| Hunter.io (email lookup) | ✅ Built |
| Tavily (web research) | ✅ Built |
| Stripe (financial verification) | ✅ Built |
| Resend (email sending) | ✅ Built |
| Netlify (landing page deploy) | ✅ Built |
| Buffer (social scheduling) | ✅ Built |
| Linear (OKR sync) | ✅ Built |
| Groq LLM (all agents) | ✅ Built |
| OpenAI (embeddings) | ✅ Built |

**Artifacts already supported:** icp_document, outreach_sequence, gtm_playbook, sales_script, battle_card, brand_messaging, financial_summary, legal_checklist, hiring_plan, pmf_survey, competitive_matrix, strategic_plan

**The Gap:** Every agent today is conversational + document generation. Zero agents take autonomous real-world action. A real CMO does not write a GTM doc and call it done — they run the campaigns.

---

## Agent Roster: 11 Digital Employees

| # | Agent | Role | Owned Metric | New? |
|---|---|---|---|---|
| 1 | Patel | CMO — Go-to-Market | Pipeline generated | Upgrade |
| 2 | Susi | CRO — Revenue & Sales | Deals closed / meetings booked | Upgrade |
| 3 | Maya | Brand Director — Content & Brand | Organic traffic / brand awareness | Upgrade |
| 4 | Felix | CFO — Finance & Fundraising | Runway / fundraising readiness | Upgrade |
| 5 | Leo | GC — Legal & Compliance | Legal risk exposure | Upgrade |
| 6 | Harper | CPO People — Hiring & Org | Time-to-hire / team coverage | Upgrade |
| 7 | Nova | CPO Product — PMF & Product | PMF score / retention | Upgrade |
| 8 | Atlas | CSO — Competitive Intelligence | Win rate / market position | Upgrade |
| 9 | Sage | CEO Advisor — Strategy & Coherence | Investor readiness / OKR health | Upgrade |
| 10 | Carter | CCO — Customer Success | NRR / churn rate | **NEW** |
| 11 | Riley | CGO — Growth & Demand Gen | CAC / growth rate | **NEW** |

---

## 1. PATEL — Chief Marketing Officer

### Identity
Patel is the CMO who builds the go-to-market engine. Not a strategist who writes docs — a demand generation machine who finds the right customers, gets in front of them, and measures what converts. Patel owns pipeline, not PowerPoints.

### The Startup Problem Patel Solves
Most early-stage founders have no idea who to sell to, where to find them, or how to reach them at scale. They spend weeks building ICP docs that sit in Notion. Patel doesn't just build the doc — Patel runs the motion.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Apollo.io** | Lead database: 275M contacts, search by title/industry/headcount/tech stack | Apollo.io REST API |
| **Hunter.io** | Email verification and domain search | Hunter.io API (existing) |
| **Tavily** | Market research, competitor content analysis | Tavily API (existing) |
| **Instantly.ai / Smartlead** | Cold email sequencing at scale (1K+ emails/day, warm-up included) | Instantly API |
| **LinkedIn via PhantomBuster** | Automated LinkedIn connection + message sequences | PhantomBuster API |
| **Google Analytics 4** | Track landing page conversion, traffic sources | GA4 API |
| **Netlify** | Deploy landing pages and A/B test variants | Existing |

### Capabilities

**Conversational:**
- ICP definition workshop (jobs-to-be-done, firmographic targeting, buying triggers)
- Channel strategy recommendation (which channels for which stage)
- Messaging framework development (positioning, value props, objections)
- A/B test design (landing pages, subject lines, CTAs)
- Campaign ROI modelling

**Autonomous Actions:**
- **Lead generation:** Query Apollo.io with ICP criteria → return verified list of 50-500 decision-makers with emails + LinkedIn URLs
- **Email sequence launch:** Push outreach sequence to Instantly.ai → activate warming → begin sending
- **LinkedIn automation:** Push connection requests + follow-up messages via PhantomBuster
- **Landing page deploy:** Build, deploy, and share Netlify URL within 60s of generation
- **Google Alert setup:** Monitor brand + competitor mentions automatically
- **Weekly campaign report:** Auto-pull GA4 + Instantly open/reply rates → email founder summary

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `icp_document` | Buyer persona, firmographics, pain points, buying triggers, qualification criteria, channels ranked | On ICP conversation |
| `outreach_sequence` | 5-7 step email + LinkedIn sequence, subject lines tested, personalization tokens | On sequence request |
| `gtm_playbook` | Channel strategy, 90-day plan, budget allocation, KPIs, launch checklist | On GTM request |
| `lead_list` *(new)* | Apollo-sourced list of 50-500 contacts matching ICP, with emails + LinkedIn URLs | On "find leads" command |
| `campaign_report` *(new)* | Weekly metrics: emails sent/opened/replied, LinkedIn accepts, meetings booked, CAC estimate | Weekly automated |
| `ab_test_result` *(new)* | Landing page variant performance, winning variant declaration | After 200+ visits |

### Automated (Proactive) Actions
- If `openDeals < 3` and ICP is locked → auto-generate fresh lead list from Apollo
- If campaign reply rate < 3% after 100 sends → flag subject lines + body for rewrite
- When Atlas updates competitive matrix → re-evaluate positioning in GTM playbook
- Weekly: pull Instantly.ai stats → generate campaign performance digest

### Metric Patel Owns
**Pipeline Created** — MQLs generated, meetings booked upstream of Susi

---

## 2. SUSI — Chief Revenue Officer

### Identity
Susi is the CRO who closes deals. Not a coach who gives sales advice — an operator who manages the pipeline, works stale deals, books meetings, and generates follow-up sequences automatically. Susi's job is to make revenue happen.

### The Startup Problem Susi Solves
Founders are terrible at following up. Deals die in email threads. There's no system. Susi builds the system AND runs it — the CRM is always clean, deals always move, and no prospect goes cold without a follow-up.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Vapi.ai / Bland.ai** | AI voice calling — call leads, qualify, book meetings | Vapi REST API |
| **Calendly** | Meeting scheduling — embed booking link, sync with founder calendar | Calendly v2 API |
| **Apollo.io** | Lead data enrichment, contact lookups | Apollo.io API |
| **Fireflies.ai** | Call recording + AI transcript + action item extraction | Fireflies GraphQL API |
| **Resend** | Automated follow-up emails | Existing |
| **Supabase `deals` table** | Proprietary CRM | Existing |
| **Gong (optional)** | Advanced call intelligence | Gong API |

### Capabilities

**Conversational:**
- Qualification framework (BANT, MEDDIC, SPICED) coaching
- Objection handling roleplay and coaching
- Deal strategy for specific prospects
- Pricing negotiation coaching
- Win/loss analysis

**Autonomous Actions:**
- **AI phone calling:** Initiate Vapi.ai call to a lead → qualify them → if qualified, book meeting via Calendly → log outcome to deals table
- **Stale deal follow-up:** Detect deals with no activity 7+ days → auto-draft personalized follow-up via Resend → send on founder approval (or auto-send if permission granted)
- **Meeting booking:** When lead replies positively → auto-send Calendly link + deal note
- **Call transcription:** After every sales call → Fireflies transcript → extract objections, next steps, key signals → update deal record
- **Pipeline health scan:** Weekly → flag stuck deals, ghost deals, close date slippage → generate priority action list
- **Proposal generation:** Structured proposal PDF with pricing and value prop (auto-branded)

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `sales_script` | Discovery questions, pitch structure, objection map, closing language | On script request |
| `call_playbook` *(new)* | Per-deal: research summary, likely objections, recommended opener, target outcome | Before each sales call |
| `pipeline_report` *(new)* | Deal stage distribution, velocity, forecast, stale deal list, recommended actions | Weekly automated |
| `proposal` *(new)* | Branded proposal: problem, solution, pricing tiers, ROI estimate, next steps | On "create proposal" command |
| `win_loss_analysis` *(new)* | Pattern analysis across closed won/lost: common objections, winning factors, deal size patterns | Monthly automated |

### Automated (Proactive) Actions
- Daily: scan `deals` table → if `last_activity > 7 days` → trigger follow-up sequence
- When Patel creates new outreach sequence → auto-create deal record for each contact
- When Fireflies call finishes → extract action items → update deal record → set next action date
- When deal moves to `proposal` stage → auto-generate proposal document
- Weekly: pipeline velocity report → email founder summary

### Metric Susi Owns
**Revenue Closed + Meetings Booked** — pipeline converted to cash

---

## 3. MAYA — Brand Director

### Identity
Maya is the brand and content engine. Not a writer who produces one-off docs — a content machine that publishes consistently, monitors brand health, distributes content across channels, and tracks what actually drives traffic and leads.

### The Startup Problem Maya Solves
Founders know they need content but can't produce it consistently. Their brand voice is inconsistent. Their blog has 3 posts from 2 years ago. Maya makes content happen — systematically, on schedule, across channels.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Buffer** | Social scheduling (LinkedIn, Twitter, Instagram) | Existing |
| **Beehiiv / Substack** | Newsletter publishing and subscriber management | Beehiiv API |
| **Netlify** | Blog post deployment | Existing |
| **Ahrefs / SEMrush** | Keyword research, rank tracking, content gap analysis | Ahrefs API |
| **Mention.com / Brand24** | Brand mention monitoring, sentiment analysis | Mention API |
| **Resend** | Newsletter sending (if not using Beehiiv) | Existing |
| **Loom API** | Auto-transcribe founder video → repurpose as blog/LinkedIn | Loom API |

### Capabilities

**Conversational:**
- Brand positioning workshop
- Content strategy and editorial calendar planning
- Voice and tone guide development
- SEO content brief writing
- PR narrative development

**Autonomous Actions:**
- **SEO content pipeline:** Pull Ahrefs keyword data for target topics → generate SEO-optimized blog post → deploy to Netlify → submit to Google Search Console
- **30-day social calendar:** Generate platform-specific posts (LinkedIn long-form, Twitter threads, Instagram captions) → schedule via Buffer
- **Newsletter publishing:** Generate bi-weekly newsletter with product updates + founder insight → publish via Beehiiv
- **Brand monitoring:** Mention.com alerts → summarize weekly brand sentiment report
- **Content repurposing:** Founder records Loom → Maya transcribes + rewrites as blog post + LinkedIn post + Twitter thread
- **PR outreach:** Research relevant journalists → draft pitch emails → send via Resend
- **Competitor content gap analysis:** What topics do competitors rank for that startup doesn't? → generate content briefs

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `brand_messaging` | Positioning, taglines, voice guide, messaging hierarchy | On brand request |
| `content_calendar` *(new)* | 30-day editorial calendar: blog, LinkedIn, Twitter, newsletter, with briefs per post | Monthly automated |
| `seo_audit` *(new)* | Target keywords, current rankings, content gaps, competitor rankings, priority list | On SEO request |
| `press_kit` *(new)* | Company overview, founder bios, product screenshots, boilerplate, media contact | On PR request |
| `newsletter_issue` *(new)* | Full newsletter issue: hook, main story, product update, CTA, subject line variants | Bi-weekly automated |
| `brand_health_report` *(new)* | Monthly: mentions, sentiment, reach, top performing content, share of voice | Monthly automated |

### Automated (Proactive) Actions
- When Nova updates PMF survey → Maya re-evaluates brand messaging against new customer language
- When Atlas generates competitive matrix → Maya identifies messaging gaps vs competitors
- Weekly: publish 1 SEO blog post from content calendar
- Bi-weekly: send newsletter issue
- Daily: schedule 1 social post across all connected channels
- Monthly: brand health report with sentiment + reach data

### Metric Maya Owns
**Organic Traffic + Brand Awareness** — inbound leads from content

---

## 4. FELIX — Chief Financial Officer

### Identity
Felix is the CFO who keeps the company alive. Not a spreadsheet reviewer — a financial intelligence system that syncs real data from every money source, models scenarios, tracks runway in real time, and prepares the fundraising narrative before the founder even asks.

### The Startup Problem Felix Solves
Founders don't know their numbers. They know MRR but not net revenue retention. They know burn but not burn multiple. Felix makes the numbers real, accurate, and actionable — connecting directly to every financial system the company uses.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Stripe** | MRR, ARR, customer count, churn, refunds | Existing |
| **QuickBooks / Xero** | Actual P&L, expense categorization, balance sheet | QuickBooks API / Xero API |
| **Mercury / Brex / Ramp** | Bank account balance, runway calculation, spend categories | Mercury API / Brex API |
| **Carta** | Cap table, option pool, dilution scenarios | Carta API |
| **DocSend** | Pitch deck tracking — who viewed, time-per-slide | DocSend API |
| **Resend** | Automated investor updates | Existing |
| **Notion / Google Slides** | Board deck generation | Notion API |

### Capabilities

**Conversational:**
- Unit economics education (CAC, LTV, payback, burn multiple)
- Fundraising strategy (when, how much, which investors)
- Revenue model design (pricing tiers, expansion revenue)
- Scenario modelling (what if we hire 2 engineers next month?)
- Term sheet review coaching

**Autonomous Actions:**
- **Multi-source financial sync:** Pull Stripe + QuickBooks + Mercury in parallel → reconcile → compute single source of truth for MRR, burn, runway
- **Automated investor update:** Monthly → pull all financial metrics → generate narrative investor update → send via Resend to investor list
- **Runway alert:** If runway drops below threshold → immediate notification + emergency scenario model
- **Cap table scenarios:** Pull Carta data → model dilution under different raise scenarios
- **DocSend pitch tracking:** When investor opens deck → notify founder with per-slide engagement data
- **Expense anomaly detection:** Week-over-week expense spike → flag + request explanation
- **Board deck generation:** Pull actuals → populate board deck template → share with team

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `financial_summary` | MRR/ARR/burn/runway + unit economics + fundraising recommendation | On request / monthly |
| `financial_model` *(new)* | 18-month P&L forecast with 3 scenarios (base/bull/bear), linked to real data | On model request |
| `investor_update` *(new)* | Formatted monthly update: metrics, milestones, asks, narrative | Monthly automated |
| `board_deck` *(new)* | Slide-by-slide board deck with real metrics, OKR progress, financials | On board prep |
| `cap_table_summary` *(new)* | Current ownership, option pool, dilution scenarios for next raise | On cap table request |
| `fundraising_narrative` *(new)* | Investment thesis, traction story, use of funds, target investor list | Before fundraising |

### Automated (Proactive) Actions
- Daily: sync Stripe → update `startup_state.mrr`, `startup_state.runway`
- If `runway < 12 months` → alert founder + delegate to Harper to revise hiring plan
- Monthly: auto-generate investor update → send to investor list via Resend
- When Susi closes deal → update revenue projection → recalculate runway
- When term sheet received → flag critical terms → coach founder through negotiation

### Metric Felix Owns
**Runway + Fundraising Readiness** — months of runway, investor pipeline quality

---

## 5. LEO — General Counsel

### Identity
Leo is the startup lawyer who never sleeps. Not an advice machine — a document generator, contract reviewer, IP guardian, and compliance monitor. Leo makes legal work happen without the $500/hour bill.

### The Startup Problem Leo Solves
Legal work gets skipped because it's expensive and slow. Startups sign bad contracts, skip IP protection, have improper equity structures, and get blindsided by compliance requirements. Leo makes legal hygiene automatic.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **DocuSign / HelloSign** | E-signature for generated contracts | DocuSign API / Dropbox Sign API |
| **USPTO API** | Patent and trademark search | USPTO Open Data API |
| **GitHub API** | Open source license scanning in code repos | GitHub REST API |
| **EDGAR (SEC)** | Regulatory filing research for founders sector | SEC EDGAR API |
| **Clerky** | Incorporation workflow | Link handoff (existing) |
| **Stripe Atlas** | International incorporation | Link handoff (existing) |
| **Carta** | Cap table legal docs | Via Felix delegation |

### Capabilities

**Conversational:**
- Entity structure advice (C-Corp vs LLC, Delaware rationale)
- Founder agreement coaching (IP assignment, vesting, buyback rights)
- SAFE / convertible note review
- Term sheet red-lining guidance
- GDPR / CCPA compliance walkthrough
- Employment law basics (contractor vs employee classification)

**Autonomous Actions:**
- **NDA generation + e-signature:** Generate NDA from template → customize for counterparty → send for DocuSign → track signature status
- **IP audit:** Scan GitHub repo for open source license conflicts → flag GPL/AGPL in commercial product
- **Patent/trademark search:** USPTO database search → return existing filings in founder's space
- **Privacy policy generation:** Based on data flows described → generate GDPR/CCPA-compliant policy → deploy to website
- **Contract review:** Upload PDF → extract key terms → flag risky clauses → recommend redlines
- **SAFE generation:** Fill SAFE template (YC standard) with agreed terms → send for e-signature
- **Regulatory watch:** Sector-specific regulation alerts → weekly digest to founder

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `legal_checklist` | Incorporation, IP, fundraising, compliance items with risk ratings | On request |
| `nda` *(new)* | Full NDA document (mutual or one-way) with e-signature ready | On NDA request |
| `safe_note` *(new)* | YC-standard SAFE with filled terms, ready for signature | On SAFE request |
| `contractor_agreement` *(new)* | Contractor/consultant agreement with IP assignment clause | On contractor hire |
| `privacy_policy` *(new)* | GDPR/CCPA-compliant privacy policy for their specific data flows | On compliance request |
| `ip_audit_report` *(new)* | Open source license conflicts, IP ownership gaps, filing recommendations | On IP audit request |
| `term_sheet_redline` *(new)* | Uploaded term sheet → extracted terms → flagged risks → recommended changes | On term sheet upload |

### Automated (Proactive) Actions
- When Harper hires contractor → Leo auto-generates contractor agreement + IP assignment → send for signature
- When Felix detects fundraising activity → Leo generates SAFE template + due diligence checklist
- When stage changes (seed → Series A) → Leo generates updated legal checklist for new requirements
- Quarterly: IP audit reminder → scan GitHub for new open source dependencies
- GDPR/CCPA compliance review when new user data collected

### Metric Leo Owns
**Legal Risk Exposure** — outstanding legal risks flagged vs resolved

---

## 6. HARPER — Chief People Officer

### Identity
Harper is the people operations engine. Not an HR consultant — a recruiter, compensation analyst, and culture builder who posts jobs, sources candidates, screens resumes, books interviews, and generates offer letters without the founder lifting a finger.

### The Startup Problem Harper Solves
Hiring is the #1 bottleneck for early-stage startups. Founders spend 40% of their time on recruiting but have no system. Harper builds and runs the hiring machine — from job post to signed offer.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Wellfound (AngelList)** | Job posting for startup talent | Existing link / Wellfound API |
| **LinkedIn Recruiter / PhantomBuster** | Outbound candidate sourcing | PhantomBuster API |
| **Greenhouse / Lever** | ATS — application tracking, interview scheduling | Greenhouse API |
| **Checkr** | Background check initiation | Checkr API |
| **Levels.fyi API / Glassdoor API** | Salary and equity benchmarking | Levels.fyi / Glassdoor |
| **Calendly** | Interview scheduling | Calendly API |
| **Rippling / Gusto** | Payroll + benefits setup for new hires | Rippling API |
| **Resend** | Candidate communication | Existing |

### Capabilities

**Conversational:**
- Hiring prioritization (which role unblocks growth first)
- Compensation band design (salary + equity at pre-seed, seed, Series A)
- Interview design and scorecard building
- Culture and values definition
- Performance management framework
- Difficult people decision coaching (firing, PIP)

**Autonomous Actions:**
- **Multi-channel job posting:** Generate job description → post to Wellfound + LinkedIn simultaneously
- **Outbound sourcing:** PhantomBuster → search LinkedIn by title/location/skills → send connection requests + recruiter messages
- **Resume screening:** Inbound applications → score against criteria → rank top 10 → surface to founder with recommendation
- **Interview scheduling:** Candidate accepts → Calendly link sent → calendar event created → interview prep doc generated
- **Offer letter generation:** Agreed terms → generate personalized offer letter with equity model → DocuSign for signature
- **Salary benchmarking:** Pull Levels.fyi + Glassdoor data → generate comp band recommendation for role + location + stage
- **Background check:** Trigger Checkr for final candidate → track status → notify when clear

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `hiring_plan` | Org structure, priority roles, comp bands, timeline, budget | On hiring strategy request |
| `job_description` *(new)* | Full JD: role overview, responsibilities, requirements, comp range, equity, culture | Per role |
| `interview_scorecard` *(new)* | Role-specific scoring rubric, structured questions per competency, pass/fail criteria | Before each interview |
| `offer_letter` *(new)* | Personalized offer: salary, equity %, vesting schedule, start date, benefits | When ready to extend offer |
| `onboarding_plan` *(new)* | 30/60/90 day plan, tool access checklist, key stakeholder intro schedule | On first day |
| `comp_benchmark_report` *(new)* | Market data for role + location + stage, recommended band, peer comparables | On comp question |

### Automated (Proactive) Actions
- When Felix detects runway change → Harper re-models hiring plan against new budget constraint
- When role posted → daily: scan Wellfound/LinkedIn applications → screen + rank → morning digest
- When candidate goes 5 days without response → auto-send follow-up
- When offer signed → generate onboarding plan + set 30/60/90 day calendar reminders
- Weekly: hiring pipeline report (applications, screens, interviews, offers, declines)

### Metric Harper Owns
**Time-to-Hire + Team Coverage** — open roles filled on timeline and within budget

---

## 7. NOVA — Chief Product Officer

### Identity
Nova is the product intelligence engine. Not a framework teacher — a real product analyst who connects to actual user data, runs experiments, measures retention, and tells founders precisely what to build next based on what users actually do (not what they say).

### The Startup Problem Nova Solves
Founders build by gut. They confuse user feedback with user behavior. They don't know their Day 7 retention. They run no experiments. Nova connects to real analytics, measures what matters, and drives product decisions with data.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **PostHog / Mixpanel / Amplitude** | Product analytics: retention, funnels, feature usage, cohorts | PostHog API |
| **Intercom / Zendesk** | User feedback aggregation, support ticket themes | Intercom API |
| **Typeform / Tally** | Survey creation and distribution to users | Typeform API |
| **LaunchDarkly** | Feature flag management for A/B testing | LaunchDarkly API |
| **Hotjar / FullStory** | Session recordings, heatmaps, user behavior | Hotjar API |
| **Linear / Jira** | Roadmap sync — product insights → feature tickets | Linear API (existing) |
| **Loom** | User interview recording + transcription | Loom API |

### Capabilities

**Conversational:**
- PMF assessment and validation framework
- Feature prioritization (RICE, ICE, opportunity scoring)
- Retention curve interpretation
- User segmentation strategy
- Pivot vs persevere decision framework
- Jobs-to-be-done mapping

**Autonomous Actions:**
- **Live retention analysis:** Pull PostHog data → calculate Day 1/7/30 retention → benchmark vs sector → flag if below threshold
- **Churn prediction:** Identify accounts with declining usage → alert Susi with at-risk accounts for proactive outreach
- **Automated NPS survey:** Send NPS survey at Day 30 for every new user → aggregate responses → surface top themes
- **Feature flag experiment:** Set up A/B test in LaunchDarkly → track conversion → declare winner after statistical significance
- **User feedback synthesis:** Pull last 30 days of Intercom tickets → cluster themes → generate product insight report
- **Interview recruitment:** Find users who match criteria → Typeform → book Calendly slot for user interview
- **Session recording analysis:** Hotjar recordings → identify friction points → generate UX improvement recommendations

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `pmf_survey` | Research kit: survey questions, distribution plan, analysis framework | On PMF request |
| `retention_report` *(new)* | Day 1/7/30/90 retention, cohort curves, benchmark comparison, actions | Weekly automated |
| `product_insight_report` *(new)* | Top user feedback themes, usage patterns, friction points, recommended priorities | Monthly automated |
| `experiment_design` *(new)* | Hypothesis, variant design, success metric, sample size, timeline | On experiment request |
| `roadmap` *(new)* | Now/Next/Later with RICE scores, business case per item, dependency map | On roadmap request |
| `user_persona` *(new)* | Data-driven persona: usage patterns, feedback themes, job-to-be-done, segment size | On persona request |

### Automated (Proactive) Actions
- Weekly: pull retention data → compare to previous week → alert if >5% drop
- When PMF survey results come in → update `startup_state.pmfScore` → delegate to Maya if customer language changed
- When churn rate rises → identify churned accounts → give list to Susi for win-back campaign
- Monthly: product insight report from Intercom tickets
- When experiment reaches statistical significance → notify founder + recommend shipping winner

### Metric Nova Owns
**PMF Score + Day-30 Retention** — product is solving a real problem for real users

---

## 8. ATLAS — Chief Strategy Officer (Competitive Intelligence)

### Identity
Atlas is the competitive intelligence operation. Not a one-time analyst — a continuous monitoring system that watches every competitor every week, alerts the team when something changes, and ensures the startup always knows where it stands in the market.

### The Startup Problem Atlas Solves
Founders don't watch their competitors systematically. A competitor drops price, raises a round, or launches a key feature — and the founder hears about it three weeks later from a customer. Atlas watches everything, always.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Tavily** | Web research, competitor news, pricing page monitoring | Existing |
| **Crunchbase API** | Funding rounds, investor activity, headcount changes | Crunchbase API |
| **G2 / Capterra API** | Competitor review mining — find weaknesses in competitor products | G2 API |
| **SimilarWeb API** | Competitor web traffic, growth trends, acquisition channels | SimilarWeb API |
| **GitHub API** | Competitor open source activity, hiring signals from repos | GitHub API |
| **LinkedIn** | Competitor job postings (hiring = roadmap signals) | Via Tavily scraping |
| **Google Alerts / RSS** | Real-time news monitoring for competitor mentions | Google Alerts API |
| **Ahrefs / SEMrush** | Competitor SEO — keywords they rank for, backlinks, content strategy | Ahrefs API |

### Capabilities

**Conversational:**
- Competitive landscape mapping
- Positioning strategy (where to win, where not to compete)
- SWOT analysis and white space identification
- Market timing and category creation analysis
- Win/loss pattern analysis

**Autonomous Actions:**
- **Weekly competitor scan:** For each tracked competitor → Tavily + Crunchbase + SimilarWeb → generate change summary → email digest
- **Review intelligence:** G2/Capterra → scrape competitor reviews → extract top complaints → surface as product opportunities
- **Pricing page monitor:** Detect when competitor changes pricing → instant alert to founder
- **Job posting intelligence:** Competitor LinkedIn job postings → infer roadmap priorities → weekly signal report
- **Funding alert:** Crunchbase webhook → competitor raises → immediate notification + strategic implication note
- **SEO gap analysis:** Ahrefs → keywords competitors rank for that startup doesn't → give to Maya for content briefs
- **Battle card generation:** Per competitor → automatically update when new signals detected

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `competitive_matrix` | Feature comparison, positioning map, SWOT, white space, win themes | On request |
| `battle_card` | Per-competitor: strengths, weaknesses, how to beat them, handling objections | Per competitor |
| `competitor_weekly` *(new)* | Weekly changes: pricing, features, funding, hiring, reviews, social | Weekly automated |
| `market_map` *(new)* | Visual market map of all players by positioning axes | On market request |
| `win_loss_analysis` *(new)* | Analysis of why startup wins/loses vs each competitor | Monthly automated |
| `review_intelligence_report` *(new)* | Competitor G2/Capterra weaknesses mapped to startup's strengths | Monthly automated |

### Automated (Proactive) Actions
- Weekly: full competitor scan for all tracked competitors → digest email
- Immediate: funding alert → notify founder + recommend response (double down on differentiation, accelerate specific feature)
- When competitor changes pricing → alert Susi + Patel immediately
- Monthly: delegate updated competitive context to Patel for GTM playbook refresh
- When startup gets a lost deal → log competitor who won → update win/loss patterns

### Metric Atlas Owns
**Win Rate + Competitive Positioning** — how often startup wins head-to-head vs competitors

---

## 9. SAGE — CEO Advisor & Strategic Coordinator

### Identity
Sage is the CEO's chief of staff and strategic mind. Not a strategic planning consultant — the coherence engine that synthesises all 10 other agents, detects when plans conflict, evaluates investor readiness in real time, and runs the full multi-agent coordination workflows.

### The Startup Problem Sage Solves
A startup is an ecosystem. When Felix changes the financial model, Harper's hiring plan breaks. When Patel changes the ICP, Susi's sales script is wrong. No one catches these contradictions. Sage catches them all — and ensures the company is moving as one coherent unit, not 10 disconnected decisions.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **All 10 other agents** | Full read access to all artifact data | Internal |
| **Linear** | OKR sync — strategic plan → engineering tickets | Existing |
| **Notion API** | Board meeting docs, strategy docs | Notion API |
| **Google Slides API** | Board deck generation | Google Slides API |
| **Resend** | Investor updates, board communications | Existing |
| **Startup State DB** | Shared world model (planned in agent2 spec) | Supabase |

### Capabilities

**Conversational:**
- Strategic roadmap design (1-year, 3-year, 5-year)
- OKR framework coaching
- Series A/B readiness assessment
- Build vs buy vs partner decision framework
- Pivot vs persevere framework
- Board communication coaching
- Crisis response planning

**Autonomous Actions:**
- **Contradiction detection:** On every artifact creation → scan all artifacts for logical conflicts → flag critical ones → generate resolution recommendations
- **Investor readiness score:** Continuous → composite score across all 11 dimensions → update `startup_state.investorReadinessScore`
- **Multi-agent workflow coordination:** Trigger Investor Readiness Report → coordinate Atlas + Felix + Nova (parallel) → Patel + Harper (handoffs) → synthesise
- **OKR progress tracking:** Weekly → pull actual metrics from all agents → compare to OKR targets → generate standup report
- **Board deck auto-generation:** Before board meeting → pull all agent outputs → populate board deck template → share
- **Strategic contradiction alert:** When contradiction detected → notify founder → propose resolution path

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `strategic_plan` | Vision, core bets, OKRs, 90-day milestones, risk register | On strategy request |
| `investor_readiness_report` *(new)* | Cross-agent synthesis: market, finance, product, team, GTM — investor Q&A prepared | On workflow trigger |
| `board_deck` *(new)* | Full board presentation with real metrics from all agents | Before board meeting |
| `contradiction_report` *(new)* | All detected conflicts between agent outputs, severity ratings, resolution paths | On contradiction scan |
| `okr_health_report` *(new)* | Current OKR progress, at-risk objectives, recommended re-prioritisation | Weekly automated |
| `crisis_playbook` *(new)* | Step-by-step response protocol for specific scenarios (PR crisis, funding fall-through, key hire departure) | On crisis request |

### Automated (Proactive) Actions
- On every artifact creation → run contradiction scan
- Weekly → OKR standup report → email founder
- When `investorReadinessScore >= 70` → trigger full Investor Readiness workflow
- When runway drops below 12 months → trigger emergency strategy session across Felix + Harper + Sage
- Monthly → board deck generation + distribution

### Metric Sage Owns
**Investor Readiness Score + Strategic Coherence** — all plans aligned, all contradictions resolved

---

## 10. CARTER — Chief Customer Officer *(NEW AGENT)*

### Identity
Carter is the post-sale customer success engine. The agent that turns customers into advocates, catches churn before it happens, drives expansion revenue, and makes every customer successful — without the founder having to manage it.

### The Startup Problem Carter Solves
Most early-stage startups have zero customer success infrastructure. Customers sign up and get lost. Churn happens silently. Expansion revenue is left on the table. The founder only hears from customers when they're about to cancel. Carter fixes this.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Intercom / HubSpot** | Customer communication, health scores, usage alerts | Intercom API |
| **PostHog / Mixpanel** | Product usage — identify at-risk accounts by activity | PostHog API |
| **Stripe** | Subscription status, expansion revenue, downgrades | Existing |
| **Calendly** | QBR scheduling, onboarding calls | Calendly API |
| **Resend** | Automated check-ins, NPS surveys, renewal alerts | Existing |
| **Typeform** | NPS and CSAT surveys | Typeform API |
| **Loom** | Tutorial video creation for onboarding | Loom API |
| **Notion** | Customer success playbooks, QBR templates | Notion API |

### Capabilities

**Conversational:**
- Customer onboarding strategy design
- NPS and CSAT interpretation
- Churn prevention playbook coaching
- Expansion revenue strategy (land and expand)
- Customer health score design
- QBR preparation coaching

**Autonomous Actions:**
- **Churn risk detection:** Pull PostHog usage data → accounts with declining activity → generate risk score → alert Susi for proactive outreach
- **Automated onboarding sequence:** New customer signs up → 5-step email onboarding → check completion at each stage → intervention if stuck
- **NPS survey automation:** Day 30 and Day 90 → send NPS survey → collect → analyse → surface to Nova
- **Health score monitoring:** Composite health score per account → weekly scan → flag accounts moving from green to yellow
- **QBR preparation:** For key accounts → pull usage data + outcomes achieved → generate QBR deck → schedule via Calendly
- **Expansion triggers:** Account hits usage limit or milestones → auto-generate upsell playbook → send to Susi
- **Renewal alerts:** 90 days before renewal → health score check → if yellow/red → trigger intervention playbook

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `onboarding_plan` | Step-by-step customer onboarding checklist with milestones and timing | On new customer |
| `customer_health_report` | Health scores per account, at-risk list, recommended interventions | Weekly automated |
| `churn_analysis` | Why customers churn: themes, timing, segments, prevention recommendations | Monthly automated |
| `qbr_deck` | Quarterly business review: goals vs outcomes, usage, value delivered, next quarter plan | Per QBR |
| `expansion_playbook` | Per account: upsell trigger, recommended upgrade, talk track, timing | On expansion signal |
| `cs_playbook` | Onboarding, QBR, renewal, churn prevention protocols for the company | On CS strategy request |

### Automated (Proactive) Actions
- Daily: usage monitoring → flag accounts with 3+ days of no login
- When churn signal detected → alert Susi to run win-back outreach
- Monthly: aggregate NPS + CSAT → update `startup_state.pmfScore` → pass to Nova
- When new customer signs → trigger automated onboarding sequence
- Quarterly: QBR prep for accounts > $X ARR

### Metric Carter Owns
**Net Revenue Retention (NRR) + Churn Rate** — customers stay, grow, and advocate

---

## 11. RILEY — Chief Growth Officer *(NEW AGENT)*

### Identity
Riley is the growth and demand generation engine. Not a marketer — a pure growth hacker who runs paid acquisition, builds viral loops, manages referral programs, and identifies the highest-leverage growth levers at every stage.

### The Startup Problem Riley Solves
Patel builds the GTM strategy. Maya creates the content. But who actually runs the paid acquisition? Who builds the referral program? Who runs the growth experiments? Riley. Riley is the operator who takes Patel's strategy and turns it into compounding growth.

### Data Sources & Integrations
| Integration | Purpose | API |
|---|---|---|
| **Google Ads API** | Paid search campaign creation and management | Google Ads API |
| **Meta Ads API** | Paid social (Facebook/Instagram) campaigns | Meta Marketing API |
| **LinkedIn Ads API** | B2B paid acquisition (for B2B startups) | LinkedIn Marketing API |
| **Google Analytics 4** | Attribution, conversion tracking, ROAS | GA4 API |
| **Viral Loops / Referral Hero** | Referral program creation and management | Viral Loops API |
| **Product Hunt** | Launch planning and execution | Product Hunt API |
| **AppSumo** | Lifetime deal launch management | AppSumo partner API |
| **Ahrefs** | SEO growth tracking | Ahrefs API |
| **Hotjar** | Conversion optimisation insights | Hotjar API |

### Capabilities

**Conversational:**
- Growth model design (viral, paid, organic — right mix for stage)
- CAC payback period modelling
- Referral program design
- Product-led growth strategy
- Community building strategy
- Launch strategy (Product Hunt, AppSumo, Betalist)

**Autonomous Actions:**
- **Paid campaign launch:** Based on ICP from Patel → build Google/Meta/LinkedIn ad campaign → launch with initial budget → daily performance monitoring
- **Referral program setup:** Design program → set up via Viral Loops → generate referral assets → embed in product
- **A/B test management:** Landing page, ad creative, pricing page → run variants → measure → declare winner
- **ROAS monitoring:** Pull ad spend + revenue → calculate ROAS per channel → flag underperforming channels → recommend budget reallocation
- **Product Hunt launch prep:** Schedule launch → build hunter network → draft product description → coordinate team upvotes
- **Growth experiment queue:** Systematic backlog of growth experiments with expected impact + effort → run one per week
- **Attribution reporting:** Which channels drive which customer segments → update Patel + Sage on channel performance

### Deliverables / Artifacts
| Artifact | What It Contains | Triggers |
|---|---|---|
| `growth_model` | Current growth levers, growth rate by channel, 90-day experiment plan, CAC by channel | On growth request |
| `paid_campaign` *(new)* | Ad copy variants, targeting parameters, budget allocation, KPIs per campaign | On paid acquisition request |
| `referral_program` *(new)* | Program mechanics, reward structure, copy, implementation guide, tracking setup | On referral request |
| `launch_playbook` *(new)* | Product Hunt / AppSumo launch plan: timeline, assets, community outreach, day-of execution | On launch request |
| `growth_report` *(new)* | Weekly: CAC by channel, ROAS, MQLs generated, viral coefficient, conversion rates | Weekly automated |
| `experiment_results` *(new)* | A/B test outcome, statistical significance, recommendation | Post-experiment |

### Automated (Proactive) Actions
- Weekly: performance report across all paid channels → flag if ROAS < 2x → recommend pause/adjust
- When Patel updates ICP → Riley refreshes targeting criteria in all active ad campaigns
- When Nova detects high-PMF signal → Riley scales successful acquisition channel
- Monthly: growth experiment from backlog → design, launch, measure, report
- When Carter detects high NRR → Riley scales acquisition (signal that retention is solved)

### Metric Riley Owns
**Customer Acquisition Cost (CAC) + Month-over-Month Growth Rate** — finding the most efficient path to more customers

---

## Integration Priority Stack

### Tier 1: Highest Impact (Build First)

| Integration | Agents | Why Now |
|---|---|---|
| **Apollo.io** | Patel, Susi, Riley | Replaces Hunter.io for full lead database — 10x more powerful |
| **Vapi.ai / Bland.ai** | Susi | AI voice calling — books meetings automatically — zero competitor has this |
| **PostHog** | Nova, Carter | Real product analytics — every startup needs this, currently no product data |
| **Calendly** | Susi, Harper, Carter | Meeting scheduling glue — connects every agent that needs to book time |

### Tier 2: High Impact (Next Sprint)

| Integration | Agents | Why |
|---|---|---|
| **QuickBooks / Xero** | Felix | Real P&L — Stripe-only is incomplete |
| **Fireflies.ai** | Susi | Call intelligence — extracts action items without founder doing anything |
| **Beehiiv** | Maya | Newsletter → subscriber list → owned distribution |
| **DocuSign / HelloSign** | Leo, Harper | Close the loop on document generation — currently generates but can't sign |
| **Intercom** | Carter, Nova | User feedback + CS management — foundation for post-sale |

### Tier 3: Power Features (After Foundation)

| Integration | Agents | Why |
|---|---|---|
| **Crunchbase** | Atlas | Funding intelligence for competitor tracking |
| **Google Ads / Meta Ads** | Riley | Paid acquisition automation |
| **Carta** | Felix, Leo | Cap table + equity management |
| **Checkr** | Harper | Background checks close the hiring loop |
| **G2 / Capterra** | Atlas | Review intelligence = competitor weakness mining |
| **LaunchDarkly** | Nova | Feature flag A/B testing |

---

## New Artifact Types to Build

| New Artifact | Owner | Priority |
|---|---|---|
| `lead_list` | Patel | P1 |
| `call_playbook` | Susi | P1 |
| `pipeline_report` | Susi | P1 |
| `retention_report` | Nova | P1 |
| `customer_health_report` | Carter | P1 |
| `onboarding_plan` | Carter, Harper | P1 |
| `job_description` | Harper | P2 |
| `offer_letter` | Harper | P2 |
| `content_calendar` | Maya | P2 |
| `investor_update` | Felix | P2 |
| `competitor_weekly` | Atlas | P2 |
| `growth_model` | Riley | P2 |
| `nda` | Leo | P2 |
| `safe_note` | Leo | P2 |
| `financial_model` | Felix | P3 |
| `board_deck` | Sage, Felix | P3 |
| `paid_campaign` | Riley | P3 |
| `referral_program` | Riley | P3 |

---

## Implementation Sequence

### Phase 1: Wire the Real Data (Weeks 1-2)
**Goal:** Agents that talk to real data sources, not just the founder

1. Apollo.io integration (replaces Hunter.io) → Patel + Susi get real lead database
2. PostHog integration → Nova + Carter get real product analytics
3. Calendly integration → Susi + Harper + Carter can book meetings
4. QuickBooks/Xero → Felix gets real P&L beyond Stripe

### Phase 2: Real Actions (Weeks 3-4)
**Goal:** Agents that take actions, not just generate documents

1. Vapi.ai AI calling → Susi can call leads and book meetings
2. DocuSign → Leo + Harper can generate AND sign documents
3. Fireflies.ai → Susi auto-processes every sales call
4. Multi-channel job posting (Wellfound + LinkedIn simultaneously) → Harper

### Phase 3: Automation (Weeks 5-6)
**Goal:** Agents that act without being asked

1. Stale deal auto-follow-up → Susi acts when deals go quiet
2. Churn risk detection + alert → Carter + Susi coordinate
3. Weekly competitor scan → Atlas monitors continuously
4. Automated investor updates → Felix sends monthly without founder asking
5. Content publishing → Maya publishes on schedule

### Phase 4: New Agents (Week 7-8)
**Goal:** Close the two biggest gaps in the current roster

1. Carter (Customer Success) — full implementation
2. Riley (Growth) — full implementation
3. Connect Carter ↔ Nova (NPS feeds product insights)
4. Connect Riley ↔ Patel (growth experiments feed GTM strategy)

### Phase 5: Shared World Model (Weeks 9-10)
**Goal:** Agents that know about each other's work without being told

(Per agent2 MD spec: startup_state table, persistent goals, delegation tasks)

---

## The Agent Interaction Map

```
RILEY (Growth)        PATEL (CMO)        ATLAS (Competitive)
     │                    │                      │
     └──── leads ─────────┤                      │
                          │ ◄─── comp intel ─────┘
                          │
                     SUSI (CRO) ◄──── call AI (Vapi) ──── [leads]
                          │
                     [deals close] ──── FELIX (CFO)
                          │                   │
                    CARTER (CS) ──────────────┤
                          │                   │
                     NOVA (CPO) ◄── NPS data ─┘
                          │
                    MAYA (Brand) ◄── customer language ─── NOVA
                          │
                    HARPER (People) ◄── budget ──── FELIX
                          │
                     LEO (Legal) ◄── contracts ─── HARPER
                          │
                    SAGE (Strategy) ◄── everything ─── ALL
```

---

## Success Definition per Agent

| Agent | They're working if... |
|---|---|
| Patel | Pipeline is growing without founder doing outreach |
| Susi | Meetings are booked, deals are moving, nothing is stale |
| Maya | Blog publishes weekly, newsletter goes out bi-weekly, social is active |
| Felix | Runway is always known, investors get monthly updates automatically |
| Leo | No unsigned contracts, no open legal risks |
| Harper | Open roles are posted, candidates are flowing, offers go out fast |
| Nova | Retention is tracked, PMF score is current, experiments are running |
| Atlas | Competitive matrix is updated weekly, win rate is tracked |
| Sage | No unresolved contradictions, OKRs are healthy, board is prepared |
| Carter | Churn is below 5%, NPS is tracked, no silent cancellations |
| Riley | CAC is decreasing, growth rate is compounding, experiments are running |
