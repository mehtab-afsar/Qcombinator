# Edge Alpha — App Overview

> Complete map of the platform: sidebar navigation and what lives inside each section.

---

## Sidebar Structure

5 items. Collapsible icon rail (52px collapsed → 220px expanded on hover).

| # | Nav Item | Badge | Route |
|---|----------|-------|-------|
| — | 🔔 Notifications | Red unread count | Slide-out panel |
| 1 | Dashboard | — | `/founder/dashboard` |
| 2 | CXO Suite | `9` (agents) | `/founder/cxo` → `/founder/agents` |
| 3 | Investor Matching | `Smart` | `/founder/matching` |
| 4 | Academy | `NEW` | `/founder/academy` |
| 5 | Messages | Red count (pending connections) | `/founder/messages` |

**Bottom of sidebar:** User avatar → dropdown with Profile, Settings, Sign out.

---

## Onboarding Flow (New Users)

```
/founder/onboarding  →  /founder/profile-builder  →  /founder/dashboard
   (3-page registration)    (5-section evidence)        (Q-Score revealed)
```

See [profile-builder-flow.md](./profile-builder-flow.md) for the full breakdown.

---

## 1. Dashboard `/founder/dashboard`

The founder's home base after login.

- **Profile Builder CTA banner** — shown when `profile_builder_completed = false`; Q-Score ring shows 0
- **Q-Score ring** — current overall score (0–100), grade (A+→F), percentile vs cohort
- **Score trajectory chart** — line chart of all past Q-Score submissions
- **Staleness banner** — shown if no score update in 90+ days
- **Live metrics strip** — 5 cells: MRR · Burn · Runway · Customers · LTV:CAC (pulls from Felix artifact)
- **3 Score Challenges** — cards for the 3 weakest dimensions, each linking to the relevant agent
- **Workspace card** — quick view of recent deliverables
- **Recent activity** — last agent events with "Full log →" link

---

## 2. CXO Suite `/founder/cxo` → `/founder/agents`

Hub showing all 9 AI agents with progress tracker and recommendations.

### Agents Hub (`/founder/agents`)
- Progress tracker: how many artifacts completed across all agents
- Recommendation cards: which agent to open next based on lowest Q-Score dimension
- Grid of all 9 agent cards with status

### Individual Agent Pages (`/founder/agents/[agentId]`)

Each agent has:
- **Template gallery** — 3–4 quick-start templates shown before chat begins
- **Chat interface** — conversational AI with file upload support
- **Quick Generate** — 5-question modal → synthetic conversation → instant artifact
- **Deliverable Panel** — structured artifact output with quality score, version history, Revise mode, Share modal
- **Score boost toast** — animated notification when artifact boosts Q-Score

#### The 9 Agents

| Agent | Focus | Artifacts Produced | Execute Action |
|-------|-------|--------------------|----------------|
| **Patel** | GTM, ICP, Outreach | ICP Document, Outreach Sequence, Battle Card, GTM Playbook | Gmail compose / Deploy to Netlify |
| **Susi** | Sales & Pipeline | Sales Script, Deal tracking | Stale deal reminders, Follow-up injection |
| **Maya** | Brand & Content | Brand Messaging, Blog Post | Deploy to Netlify, Download blog HTML |
| **Felix** | Finance & Metrics | Financial Summary, Financial Model | Connect Stripe, Send investor update |
| **Leo** | Legal | Legal Checklist, NDA | Open Clerky / Stripe Atlas, Download NDA |
| **Harper** | Hiring | Hiring Plan, Job Postings | Post to Wellfound, AI resume screener |
| **Nova** | Product & PMF | PMF Survey, Interview Notes, Fake Door | Publish hosted survey, collect responses |
| **Atlas** | Competitive Intel | Competitive Matrix, Tracker | Google Alert chips, weekly scans |
| **Sage** | Strategy & OKRs | Strategic Plan | Export OKRs → Linear / Notion |

---

## 3. Investor Matching `/founder/matching`

Real match scoring against investor database.

**Match Score Formula:** Base 40 + Sector +30 + Stage +20 + Q-Score bonus +10 + Response rate +5 = max 100

- Results sorted by match score descending
- Each investor card: name, firm, title, thesis, sectors, stages, check sizes, response rate
- **"Connect" button** → personalised message → saved to DB with Q-Score attached

---

## 4. Academy `/founder/academy`

Learning resources and AI enhancement tools.

- **AI Enhancement** — Q-Score dimension bars, practice mode, improvement recommendations
- **Pitch Analyzer** — upload/paste deck → AI scores sections, flags missing elements and red flags
- Materials tab links to actual agent pages

---

## 5. Messages `/founder/messages`

Investor conversation threads.

- Populates from accepted + pending connection requests
- Pending requests show as "request sent" system message
- **Network tab** — mock social posts

---

## Additional Pages (not in sidebar)

| Page | Route | Purpose |
|------|-------|---------|
| Registration | `/founder/onboarding` | 3-page account creation (company → stage → founder + auth) |
| Profile Builder | `/founder/profile-builder` | 5-section conversational Q-Score evidence collection |
| Workspace | `/founder/workspace` | All artifacts from all agents in one portfolio view |
| Portfolio | `/founder/portfolio` | Investor-facing view: Q-Score ring, deliverables, heatmap, PDF export |
| Pitch Deck | `/founder/pitch-deck` | Auto-generated 10-slide deck from real agent data |
| Library | `/founder/library` | 52 curated resources filtered by function, stage, type |
| Metrics | `/founder/metrics` | Live KPI dashboard: MRR, ARR, burn, runway, LTV:CAC |
| Improve Q-Score | `/founder/improve-qscore` | AI actions, score simulator, 12 unlock challenges, evidence upload |
| Activity Feed | `/founder/activity` | Full log of all agent actions grouped by date |
| Settings | `/founder/settings` | Account settings, notifications, integrations |

---

## Notifications (Sidebar Bell)

Slide-out panel from the bell icon.

- Pulls notable events from `agent_activity` table
- Red unread badge on bell icon
- Marks all read on open (persisted in localStorage)
- **"View all activity →"** footer link → Activity Feed

---

## Q-Score (Single Scoring System)

The only score powering the entire platform — 0 to 100.

| Dimension | Default Weight | What It Measures |
|-----------|---------------|-----------------|
| Market | 20% | TAM, conversion realism, LTV:CAC |
| Financial | 18% | Margin, ARR, runway, growth |
| Product | 18% | Customer validation, learning velocity |
| GTM | 17% | ICP clarity, channel testing, messaging |
| Team | 15% | Domain expertise, completeness, resilience |
| Traction | 12% | Conversations, commitments, revenue |

- **Entry point:** Registration inserts `overall_score = 0` (`data_source = 'registration'`)
- **Real score:** Profile Builder runs the full pipeline → `data_source = 'profile_builder'`
- **Boosted by:** Agent artifacts (+3 to +6 pts per type, one-time per user)
- **Stored in:** `qscore_history` — immutable audit chain, always appended never updated
- **Confidence wiring:** `dataSourceMap` maps fields to Stripe (1.0×) / Document (0.85×) / Self-reported (0.55×)
- **Sector weights:** 8 sectors each shift dimension weights
- **Grades:** A+ (95–100) · A (90–94) · B+ (85–89) · B (80–84) · C+ (75–79) · C (70–74) · D (60–69) · F (0–59)

---

## Database Tables (key)

| Table | Purpose |
|-------|---------|
| `founder_profiles` | Registration data + `profile_builder_completed` flag |
| `profile_builder_data` | Per-section evidence (1–5), upserted on each save |
| `profile_builder_uploads` | Document upload records with extracted text |
| `qscore_history` | Immutable score chain |
| `agent_artifacts` | All deliverables from all 9 agents |
| `agent_conversations`, `agent_messages` | Chat history per agent |
| `connection_requests` | Founder → investor connection state |
| `demo_investors` | Investor database for matching |
| `score_evidence` | Manually attached proof for dimensions |
