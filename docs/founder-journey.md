# Founder Journey on Edge Alpha

> From first login to investor match — the complete path.

---

## Stage 1 — Sign Up & Onboarding

**Page:** `/founder/onboarding`

The founder creates an account and fills in the basics:
- Company name, stage (idea / MVP / seed / series-A)
- Industry / sector
- Team size, location
- One-line description of what they're building

This populates `founder_profiles` and unlocks the rest of the platform.

---

## Stage 2 — First Assessment

**Page:** `/founder/assessment`

The founder completes a structured diagnostic across six areas: market, product, GTM, financials, team, and traction.

What happens behind the scenes:
- Inputs are evaluated by an LLM against retrieved playbooks and benchmarks (RAG)
- Bluff detection runs — inflated or AI-generated answers are penalised
- Sector-specific weights are applied (e.g. GTM matters more for SaaS, Product more for Biotech)
- A **Q-Score (0–100)** is produced and saved to history
- IQ Score calculation fires async (investment readiness across 25 indicators)
- GTM Diagnostics (D1/D2/D3) run and are stored alongside the score

This is the baseline. Everything else on the platform is about improving it.

---

## Stage 3 — Dashboard

**Page:** `/founder/dashboard`

The founder's home base. Shows:
- **Q-Score** with a trajectory chart across all submissions
- **Three weakest dimensions** as action cards — each links directly to the relevant AI agent with a challenge banner
- **Momentum badge** — whether the score is rising, steady, or falling vs. cohort
- **Live metrics strip** — MRR, burn, runway, customers, LTV:CAC (clickable, links to Metrics)
- **Recent activity** — last agent outputs and events, with a "Full log" link

---

## Stage 4 — AI Agents (The Core Loop)

**Page:** `/founder/agents` → `/founder/agents/[agentId]`

Nine specialist AI advisors, each focused on one area of the business:

| Agent | Focus | Key Output |
|-------|-------|-----------|
| **Patel** | GTM, ICP, outreach | ICP doc, outreach sequence, battle card, GTM playbook |
| **Susi** | Sales, pipeline | Sales script, deal tracking, stale deal reminders |
| **Maya** | Brand, content | Brand messaging, landing page (deploys to Netlify), blog post |
| **Felix** | Finance, metrics | Financial model, Stripe live metrics, investor update email |
| **Leo** | Legal | Legal checklist, NDA generator, Clerky/Stripe Atlas links |
| **Harper** | Hiring | Hiring plan, job postings (Wellfound), resume screener |
| **Nova** | Product, PMF | PMF survey (hosted), interview notes analyser, fake door test |
| **Atlas** | Competitive intel | Competitive matrix, competitor tracker, Google Alert chips |
| **Sage** | Strategy, OKRs | Strategic plan, OKR export (Linear/Notion), investor updates |

**How a session works:**
1. Founder opens an agent — sees a template gallery (3–4 starting points)
2. Chats naturally or picks a quick-generate template (5 questions → artifact)
3. Agent produces a **structured artifact** (not just text — rendered as a visual deliverable)
4. Artifact is saved to the Workspace with version history
5. **Q-Score boost fires** — one-time dimension boost per artifact type, quality-adjusted

**What each artifact can do after creation:**
- **Revise** — select any text in the output → ask the agent to rewrite just that section
- **Share** — copy text, export PDF, copy Markdown (Notion/Obsidian), email co-founder
- **Execute** — most artifacts have a live execution button:
  - GTM Playbook → downloads deployable landing page HTML
  - Outreach Sequence → opens Gmail compose with pre-filled subject + body
  - Financial Summary → connects Stripe (live MRR/ARR), sends YC-style investor update via Resend
  - Hiring Plan → posts role to Wellfound, opens public apply page, screens resumes with AI
  - PMF Survey → publishes a hosted survey at `/s/[surveyId]`, collects and analyses responses
  - Competitive Matrix → sets Google Alerts per competitor, runs weekly scans
  - Strategic Plan → exports OKRs as Markdown, opens Linear project
  - Brand Messaging → downloads SVG social templates (Instagram, Twitter, LinkedIn)
  - Legal Checklist → opens Clerky or Stripe Atlas with pre-filled details

---

## Stage 5 — Workspace

**Page:** `/founder/workspace`

All artifacts from all agents in one place. Organised by agent, with:
- Expandable version history per artifact type
- "View" link per version — opens the exact artifact on the agent page (`?artifact=<id>`)
- Shows artifact title, creation date, quality score

The workspace is the founder's living strategy document.

---

## Stage 6 — Improve Q-Score

**Page:** `/founder/improve-qscore`

When the founder wants to understand their score and close gaps:

- **"What gets me to 80?"** — 5 AI-generated personalised actions (cached, regeneratable), each with a starter prompt that opens the right agent
- **Score Simulator** — adjust dimension values and see the projected overall score before doing the work
- **GTM Diagnostics panel** — shown when `goToMarket < 70`:
  - D1: ICP Clarity (5 indicators)
  - D2: Customer Insight (5 indicators)
  - D3: Channel Focus (5 indicators)
  - "Fix with Patel →" CTA per failing diagnostic
- **12 Unlock Challenges** — one per artifact type; shows completion status; each is a link to the relevant agent
- **Evidence attachment** — founder can attach supporting proof (links, numbers) to any dimension; verified evidence awards bonus points
- **Peer benchmarks** — percentile rank per dimension vs. cohort (activates at 100+ founders)

---

## Stage 7 — Metrics

**Page:** `/founder/metrics`

Live KPI dashboard showing MRR, ARR, customers, runway, LTV/CAC, and unit economics.

- Data pulled from the latest Felix (`financial_summary`) artifact
- "Update metrics" button → inline form (10 fields) → saves as a new Felix artifact
- Stripe can be connected (restricted key) for live MRR/ARR pull
- Changes here propagate back to the Dashboard metrics strip

---

## Stage 8 — Pitch Materials

**Page:** `/founder/pitch-deck`

Auto-generates a 10-slide pitch deck from real agent data:
- Pulls from: GTM Playbook, Brand Messaging, Financial Summary, Competitive Matrix, Hiring Plan
- Each slide shows a **data confidence indicator** (high / medium / low / none)
- Slides with no data show a CTA to complete the relevant agent
- Fully editable company name
- "Download HTML" → self-contained presentation navigable with arrow keys

**Page:** `/founder/pitch-analyzer`

Upload or paste a pitch deck → AI analysis returns:
- Score per section
- Missing elements
- Red flags
- Investor perspective narrative

---

## Stage 9 — Portfolio (Investor-Facing View)

**Page:** `/founder/portfolio`

What investors see when the founder shares their profile:
- Q-Score ring with dimension breakdown
- Verified proof section (evidence attached to dimensions)
- Deliverables grid (all completed artifacts)
- Founder Activity Heatmap (visible signal of consistency)
- PDF export of the full portfolio

---

## Stage 10 — Investor Matching

**Page:** `/founder/matching`

Real match scoring against a database of investors:

```
Base 40
+ Sector alignment     +30
+ Stage alignment      +20
+ Q-Score bonus        +10
+ Response rate bonus  +5
─────────────────────────
Max 100
```

- Sorted by match score descending
- Each card shows: investor name, firm, thesis, sectors, stages, typical check size, response rate
- "Connect" → personalised message → saved as a connection request with Q-Score attached

---

## Stage 11 — Messages

**Page:** `/founder/messages`

Conversations with investors who accepted connection requests. Pending requests appear as system messages ("request sent"). Founder can follow up within the thread.

---

## Stage 12 — Activity Feed & Notifications

**Page:** `/founder/activity`

Full log of everything every agent has done, grouped by date. Includes:
- Artifact created / revised
- Score boosts applied
- Execution events (emails sent, surveys published, etc.)
- "Send Weekly Digest" button → HTML email via Resend summarising the last 7 days by agent + Q-Score delta

**Notification bell** (sidebar) — shows unread count; slide-out panel with recent notable events.

---

## The Flywheel

```
Onboard → Assess → Get Q-Score
              ↓
         Dashboard shows weakest dimensions
              ↓
         Open relevant agent → produce artifact
              ↓
         Q-Score boosts → repeat for next artifact
              ↓
         Workspace fills up → Portfolio looks strong
              ↓
         Investor Matching → Connection requests
              ↓
         Investor reviews Portfolio + Score
              ↓
         Meeting booked
```

Each loop through the agents raises the score, adds proof to the portfolio, and increases the quality of investor matches. The platform is designed so that doing the actual work of building the company — defining ICP, building financial models, hiring, surveying customers — is exactly what raises the score.
