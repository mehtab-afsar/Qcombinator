# Phase 3 — Agents That Actually Execute

## Philosophy
Every agent must DO something real, not produce a document to read.
Output = a DONE thing, not a plan for a thing.

---

## Status Key
- [x] Done
- [x] In progress
- [x] Not started
- [!] Requires external API key (env var)

---

## Agent 1: GTM (Patel) — "Actually Builds Your Go-To-Market"

### ✅ What Exists Now
- [x] ICP document (JSON)
- [x] Outreach sequence (JSON, 5-7 steps)
- [x] Battle card (JSON)
- [x] GTM Playbook (JSON)
- [x] Gmail compose links per email step
- [x] Download landing page HTML (basic)

### 🔨 Phase 3 Builds

#### P0 — Outreach Sending (Resend already in codebase)
- [x] Contact list upload — CSV uploader in OutreachRenderer: columns name, email, company, title
- [x] Personalization engine — for each contact: merge {{firstName}}, {{company}}, {{pain_point}} into each email step
- [x] `/api/agents/outreach/send` route — POST { contacts[], sequence, fromEmail, fromName } → sends via Resend bulk API
- [x] Preview before send — show first 3 personalized emails, founder approves → "Send to all 47 contacts"
- [x] Sent tracker — stores each sent email in `outreach_sends` table: contact_email, step_index, sent_at, status
- [x] Activity feed — "Patel sent 47 emails · 2 min ago" on dashboard
- [x] DB migration: `outreach_sends` table (id, user_id, sequence_id, contact_email, contact_name, step_index, subject, body, sent_at, opened_at, replied_at)

#### P1 — Landing Page Deploy (Netlify Files API — no OAuth needed)
- [x] Better HTML generator — takes ICP + GTM playbook content → generates real landing page (hero, pain section, solution, social proof, CTA, footer)
- [x] "Deploy to Netlify" button — POST to api.netlify.com/api/v1/sites (NETLIFY_API_KEY env var) with the HTML as index.html
- [x] Returns live URL — stores `deployed_url` on the artifact
- [x] Show live URL badge in renderer: "Live at https://startup-name.netlify.app"
- [x] Re-deploy on each regenerate

#### P2 — Lead Enrichment (Hunter.io — 25 free searches/month)
- [x] ICP → search query mapper (industry + title + company size)
- [x] Hunter.io domain search API — given company domain, returns emails for decision makers
- [x] Display as "Suggested Leads" tab in ICP renderer: name, email, title, company, confidence %
- [x] One-click "Add to outreach sequence" button

---

## Agent 2: Sales (Susi) — "Actually Closes Deals"

### ✅ What Exists Now
- [x] Sales script (JSON with pitch framework, objections, closing lines)
- [x] Renders as read-only document

### 🔨 Phase 3 Builds

#### P0 — Auto-generate and send proposals
- [x] ProposalGenerator component — takes company name, deal value, use case from chat → generates branded PDF-style HTML proposal
- [x] Proposal sections: executive summary, problem/solution, pricing table, timeline, signature block
- [x] "Send Proposal" modal — enter prospect email + name → sends via Resend with HTML email body
- [x] Track open — Resend open tracking pixel in email
- [x] `/api/agents/proposal/send` route
- [x] `proposals` table: prospect_email, deal_value, sent_at, opened_at, status

#### P1 — Pipeline management (built-in CRM)
- [x] `deals` table: name, stage, value, contact_email, next_action, next_action_date, notes
- [x] CRM panel in Sales agent: kanban-style columns (Lead → Qualified → Proposal → Negotiating → Closed)
- [x] Susi auto-creates a deal row when founder mentions a prospect in chat
- [x] Follow-up reminders — if deal.next_action_date is past, Susi surfaces it in the agent greeting
- [x] "Susi noticed: Acme Corp hasn't been touched in 7 days. Want me to draft a follow-up?"

#### P2 — Inbound lead response
- [x] Lead capture webhook — POST /api/webhook/lead → triggers Susi to draft a personalized response email
- [x] Respond within 60s via Resend
- [x] Calendar link appended to every lead response (Calendly URL from profile)

---

## Agent 3: Finance (Felix) — "Actually Manages Your Money"

### ✅ What Exists Now
- [x] Financial summary (JSON snapshot + projections)
- [x] CSV download with formulas

### 🔨 Phase 3 Builds

#### P0 — Stripe revenue pull (most startups have Stripe)
- [x] "Connect Stripe" button in Felix renderer → stores STRIPE_SECRET_KEY in user profile (encrypted)
- [x] `/api/agents/felix/stripe-sync` — fetches last 90 days of Stripe charges, subscriptions, MRR
- [x] Auto-generates financial_summary artifact from real Stripe data
- [x] "Live" badge on financial snapshot when data is from Stripe
- [x] Daily sync job (or manual "Refresh" button)

#### P0 — Monthly investor update sender
- [x] "Send Investor Update" flow — Felix pulls real metrics → drafts investor update email (MRR, growth, key wins, ask)
- [x] Founder edits → approves → sends to investor list via Resend
- [x] `investor_updates` table: sent_at, subject, metrics_snapshot, recipients[]
- [x] Pre-built template: Standard YC-style monthly update format

#### P1 — Runway alert system
- [x] Cron/webhook: weekly check on burn vs runway
- [x] If runway < 6 months → Felix sends founder an email + shows dashboard banner
- [x] "At current burn you have 4.2 months left — Felix identified 3 cuts that buy 2 more months"
- [x] Cuts analysis: biggest expense categories from Stripe data

#### P2 — Invoice generation + sending
- [x] "Create Invoice" command in Felix chat → generates Stripe invoice for the amount/customer
- [x] Sends via Stripe (uses existing STRIPE_SECRET_KEY)

---

## Agent 4: Brand (Maya) — "Actually Builds Your Brand"

### ✅ What Exists Now
- [x] Brand messaging (JSON positioning, taglines, voice guide)
- [x] Social media template download (HTML with 3 SVGs)

### 🔨 Phase 3 Builds

#### P0 — Real website deploy (Netlify)
- [x] Website generator — takes brand_messaging + gtm_playbook → generates a real 5-section website:
  - Hero (tagline + CTA), Problem section, Solution section, Social proof, Footer
- [x] Uses brand colors, font choices from messaging artifact
- [x] "Deploy Website" button → POST to Netlify API → live URL in ~10 seconds
- [x] `deployed_sites` table: url, artifact_id, deployed_at
- [x] Shows "Your website is live at [url]" with QR code

#### P0 — Blog post writer + publisher
- [x] "Write a blog post about [topic]" in Maya chat
- [x] Maya generates SEO-optimized post: title, meta description, H2s, body, CTA
- [x] "Publish to your site" → appends post to the deployed Netlify site as /blog/[slug]
- [x] Copy markdown for Substack/Ghost/WordPress

#### P1 — Social post scheduler (Buffer API)
- [x] "Connect Buffer" → stores BUFFER_API_KEY
- [x] "Schedule 30 days of posts" button in Maya renderer
- [x] Uses Maya's content from brand_messaging → generates 30 LinkedIn + Twitter posts
- [x] POSTs all 30 to Buffer API scheduled queue

---

## Agent 5: Legal (Leo) — "Actually Handles Legal Work"

### ✅ What Exists Now
- [x] Legal checklist (JSON priorities, items, red flags)
- [x] Links to Clerky/Stripe Atlas with clipboard copy

### 🔨 Phase 3 Builds

#### P0 — NDA generation + e-signature (DocuSign or PandaDoc free tier)
- [x] "Create NDA" command → Leo generates customized NDA (mutual or one-way, based on context)
- [x] HTML/PDF NDA with founder's company name, counterparty, jurisdiction
- [x] "Send for signature" → uses DocuSign Sandbox API (free) to send signing request
- [x] Track signature status — shows "Pending", "Signed", "Expired"
- [x] `legal_documents` table: type, counterparty_email, sent_at, signed_at, docusign_envelope_id

#### P0 — Data room builder
- [x] "Build data room" command → Leo organizes all agent artifacts into structured folders
- [x] Google Drive API → creates /Data Room/{Startup Name}/ with subfolders: Financials/, Legal/, Product/, Team/
- [x] Uploads: Felix CSV → Financials/, Legal checklist → Legal/, Hiring plan → Team/
- [x] Returns shareable Google Drive link

#### P1 — SAFE/note generator
- [x] Standard YC SAFE template with founder's details merged
- [x] Download as PDF → send via DocuSign API

---

## Agent 6: HR (Harper) — "Actually Recruits"

### ✅ What Exists Now
- [x] Hiring plan (JSON roles, requirements, comp bands)
- [x] Wellfound link + clipboard copy of JD

### 🔨 Phase 3 Builds

#### P0 — Multi-board job posting (Ashby/Lever free tier or just direct board APIs)
- [x] "Post this role" button → POST to Greenhouse API (or just generate board-specific formatted JDs)
- [x] Wellfound API (if exists) or enhanced clipboard+link flow for: Indeed, LinkedIn, Wellfound, HN "Who's Hiring"
- [x] For HN: generates the exact "Ask HN: Who is hiring?" comment format
- [x] One page showing all boards with status: "Posted", "Not posted", "Draft"

#### P0 — Resume screener
- [x] Candidates upload resumes via a shared link: `/apply/[user_id]/[role_slug]`
- [x] Resume stored in Supabase Storage
- [x] Harper reads resume + JD → scores candidate (0-100) with 3 sentence explanation
- [x] `applications` table: role, applicant_name, email, resume_url, score, notes, status
- [x] Harper surfaces top candidates in chat: "3 new applications for Senior Engineer — ranked for you"

#### P1 — Offer letter sender
- [x] "Send offer to [name]" in Harper chat
- [x] Generates offer letter with salary, equity, start date, vesting schedule
- [x] Sends via Resend with PDF attachment
- [x] DocuSign for e-signature

---

## Agent 7: PMF (Nova) — "Actually Runs Experiments"

### ✅ What Exists Now
- [x] PMF survey kit (JSON with Ellis test + interview script)
- [x] Download HTML survey form (works in browser, localStorage)

### 🔨 Phase 3 Builds

#### P0 — Hosted survey with real backend
- [x] Deploy survey to `/s/[survey_id]` — a real Next.js route, not a download
- [x] Responses stored in `survey_responses` table: survey_id, respondent_email, answers JSONB, submitted_at
- [x] Nova sees response count + PMF score (% "Very disappointed") in real-time in agent
- [x] "12 responses — PMF score: 38% (above 40% threshold!)" shown in renderer

#### P0 — Automated customer interview scheduler
- [x] "Schedule customer interviews" command → Nova sends Calendly-linked emails to user's customer list
- [x] After interview: Nova generates AI summary from notes founder pastes (or Otter.ai transcript)
- [x] Builds running insight database: pattern tags, sentiment, feature requests

#### P1 — Fake door test
- [x] "Create a fake door test for [feature]" → generates a simple landing page with "Join waitlist" CTA
- [x] Deploys to Netlify (via the same P0 infrastructure from Patel)
- [x] Tracks signups in `waitlist_signups` table
- [x] Reports: "73 signups in 48 hours — clear demand signal"

---

## Agent 8: Competitive Intel (Atlas) — "Actually Monitors Competition"

### ✅ What Exists Now
- [x] Competitive matrix (JSON feature comparison, SWOT)
- [x] Google Alerts chip links (open alerts.google.com with pre-filled query)

### 🔨 Phase 3 Builds

#### P0 — Live competitor pricing scraper
- [x] "Track [competitor]" command → stores competitor URL in `tracked_competitors` table
- [x] Weekly scrape of pricing page (using Firecrawl API or basic fetch+parse)
- [x] Alert if price changes, new plan appears, or plan disappears
- [x] "Competitor X raised prices by 20% yesterday" notification

#### P0 — Competitor review analysis
- [x] Given competitor name → fetch G2/Capterra/TrustPilot reviews via their embed/public APIs
- [x] Atlas clusters into: Top complaints, Top praise, Feature gaps
- [x] Generates "Competitor weakness report" — specific quotes about what customers hate
- [x] This becomes a sales tool: "Our customers say our competitors lack X — use this in demos"

#### P1 — Job posting tracker
- [x] Monitor competitor LinkedIn job postings via unofficial RSS/search
- [x] "Competitor Z posted 5 AI engineer roles this week — likely building [X]"

---

## Agent 9: Strategy (Sage) — "Actually Runs Your Operations"

### ✅ What Exists Now
- [x] Strategic plan (JSON vision, OKRs, roadmap, risks)
- [x] Linear/Notion export (clipboard copy + open Linear — partial)

### 🔨 Phase 3 Builds

#### P0 — Investor update automation
- [x] "Send monthly investor update" → Sage pulls: MRR (from Felix Stripe sync), Q-Score trend, top 3 wins, top blocker, ask
- [x] Generates YC-format investor update email
- [x] Sends to `investor_contacts` list (founder manages) via Resend
- [x] Tracks: sent_at, who opened it

#### P0 — Weekly async standup
- [x] Every Monday 9am: Sage emails founder a "Weekly check-in" with last week's OKR progress
- [x] Founder replies to email → Sage parses reply, updates OKR progress in DB
- [x] "You hit 2 of 3 KRs last week. This week: focus on [weakest KR]"

#### P0 — Linear OKR sync (Linear API — free tier)
- [x] "Sync to Linear" button → uses LINEAR_API_KEY to create Cycles + Issues from OKRs
- [x] Each OKR → Linear Cycle, each KR → Linear Issue with description + target metric
- [x] Two-way: when Linear issue is completed, Sage marks KR as done

#### P1 — Board deck builder
- [x] Takes metrics from Felix (real Stripe data) + strategic plan + Q-Score trend
- [x] Generates Google Slides deck via Google Slides API (or a downloadable HTML presentation)
- [x] Pre-populated with real numbers, not template placeholders

---

## Agent Platform (Orchestration Layer)

### 🔨 Phase 3 Builds

#### P0 — Agent Activity Feed
- [x] `agent_activity` table: user_id, agent_id, action_type, description, metadata, created_at
- [x] Every outreach send, deploy, invoice, etc. logs to this table
- [x] `/founder/activity` page: unified timeline "Patel sent 47 emails · 3 replies · Sage synced 8 OKRs to Linear · Felix updated MRR from Stripe"
- [x] Dashboard strip shows last 5 agent actions

#### P0 — Approval Queue
- [x] Before any agent sends emails, deploys, or posts: creates a `pending_actions` row
- [x] Dashboard "Inbox": "Patel wants to send 47 emails — [Preview] [Approve] [Edit]"
- [x] Approved actions execute immediately

#### P1 — Cross-agent context bus
- [x] When Felix updates MRR → Sage's investor update draft auto-refreshes
- [x] When Patel sends outreach → Susi's pipeline adds the replied contacts as leads
- [x] When Harper posts a job → Atlas checks if competitors posted similar roles

---

## Build Order (MVP 1)

### Week 1: GTM Agent — Make Patel Actually Send Emails

1. `outreach_sends` DB migration
2. CSV contact uploader in OutreachRenderer
3. Email personalizer (merge {{firstName}} etc.)
4. `/api/agents/outreach/send` → Resend bulk
5. Sent count badge on OutreachRenderer
6. Activity feed entry after send

### Week 2: Netlify Landing Page Deploy

1. Better HTML generator (from ICP + GTM playbook data)
2. Netlify Files API integration
3. "Deploy" button + live URL display

### Week 3: Finance Agent — Stripe Sync

1. Stripe connect flow
2. Real MRR/ARR/churn pull
3. Auto-generate financial_summary from Stripe data

### Week 4: Sales Agent — Proposal Sender

1. Proposal HTML generator
2. Send via Resend
3. Open tracking

---

## Environment Variables Needed

```
# Already in codebase
RESEND_API_KEY              ← email sending (outreach, proposals, updates)
OPENROUTER_API_KEY          ← LLM calls
NEXT_PUBLIC_SUPABASE_URL    ← DB
SUPABASE_SERVICE_ROLE_KEY   ← DB admin

# Add for Phase 3
NETLIFY_API_KEY             ← landing page + website deploy
STRIPE_SECRET_KEY           ← per-founder (stored encrypted in DB, not env)
LINEAR_API_KEY              ← per-founder (stored in DB)
GOOGLE_DRIVE_API_KEY        ← data room builder
HUNTER_API_KEY              ← lead enrichment (25 free/month, $49/mo for 500)
BUFFER_API_KEY              ← per-founder social scheduling
DOCUSIGN_API_KEY            ← e-signatures (sandbox is free)
```
