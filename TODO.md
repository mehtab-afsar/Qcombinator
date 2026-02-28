# TODO: Actionable Agents & Q-Score Overhaul

---

## Q-Score Improvements

- [x] Let founders attach proof (Stripe screenshots, LOIs, contracts, analytics) — verified evidence bumps dimension scores
- [x] Add "What gets me to 80?" — auto-generate 5 specific actions after every interview
- [x] Build score simulation — "If you close 3 pilots, your Traction score jumps from 55 to 72"
- [x] Add peer benchmarks — "Your GTM is top 30% among seed-stage B2B founders"
- [x] Score decay after 90 days — force re-interview to keep it fresh
- [x] Sector-specific scoring rubrics — biotech ≠ SaaS ≠ marketplace
- [x] Connect agent completions to score — finishing a GTM plan in the agent should nudge your GTM dimension up
- [x] Show score trajectory graph over time, not just current number
- [x] Add "Score Unlock Challenges" — complete specific tasks to boost specific dimensions

---

## Agent Architecture: Chat → Actionable

### Core Shift
- [x] Every agent session ends with a **generated document**, not just a conversation
- [x] Add an **artifact panel** (side-by-side with chat) — agent writes a real deliverable in real-time as you talk
- [x] Build **agent workspace** — each agent has a folder where all generated docs live
- [x] Add **export everywhere** — PDF, Google Docs, Notion, copy-to-clipboard for every output
- [x] Build **agent memory** — agents remember past sessions, reference previous outputs, build on them
- [x] Add **cross-agent context** — Finance agent knows what GTM agent already planned

---

## Agent-by-Agent: What They Actually Produce

### GTM Agent (Patel)
- [x] Generates a full **GTM Plan document** (ICP, channels, timeline, budget, KPIs)
- [x] Builds a **channel prioritization matrix** — scores each channel by effort/impact for YOUR specific product
- [x] Creates **30/60/90 day launch plan** with actual weekly tasks
- [x] Outputs a **landing page copy draft** — headline, subhead, CTA, feature blocks, FAQ
- [x] Generates **outreach email sequences** (5-email drip) tailored to your ICP

### Sales Agent (Susi)
- [x] Writes **cold outreach templates** — email, LinkedIn DM, Twitter DM — personalized to your product
- [x] Builds a **prospect list criteria doc** — who to target, where to find them, what to say
- [x] Generates a **sales script** — discovery call framework with questions, objection handling, close
- [x] Creates a **pricing page recommendation** — tiers, anchoring, what to include at each level
- [x] Outputs a **proposal/SOW template** you can actually send to prospects
- [x] Builds an **objection handling cheat sheet** — top 10 objections with responses

### Brand Agent (Maya)
- [x] Generates **positioning statement** (category, audience, differentiation, proof)
- [x] Creates **5 tagline options** with reasoning
- [x] Builds a **messaging framework doc** — elevator pitch, 1-liner, boilerplate, value props
- [x] Outputs **social media bio + content calendar** (4 weeks of post ideas with hooks)
- [x] Generates a **brand voice guide** — tone, do/don't, example sentences
- [x] Creates **investor-facing narrative** — the story arc for your pitch

### Finance Agent (Felix)
- [x] Builds a **financial model spreadsheet** (revenue, costs, runway, break-even) — exportable CSV/Google Sheets link
- [x] Generates a **fundraising ask calculator** — how much to raise based on burn, milestones, timeline
- [x] Creates a **cap table snapshot** with dilution scenarios (pre-seed, seed, Series A)
- [x] Outputs a **unit economics breakdown** — CAC, LTV, payback period, gross margin
- [x] Builds a **use of funds slide** — exactly how to allocate the raise
- [x] Generates **investor-ready financial summary** — 1-pager with key metrics

### Legal Agent (Leo)
- [x] Generates a **SAFE/convertible note comparison doc** with recommendations
- [x] Creates a **term sheet red flags checklist** — what to watch for
- [x] Outputs a **privacy policy draft** and **terms of service draft** based on your product
- [x] Builds an **incorporation checklist** — step-by-step for Delaware C-Corp
- [x] Generates a **co-founder agreement template** with vesting schedules
- [x] Creates an **IP assignment checklist** — what you need before raising

### HR Agent (Harper)
- [x] Writes **job descriptions** for your first 3-5 hires based on your stage and gaps
- [x] Builds an **org chart roadmap** — who to hire at $0, $500K, $1M, $5M ARR
- [x] Generates a **compensation framework** — salary bands, equity ranges by role and stage
- [x] Creates **interview question banks** per role
- [x] Outputs a **culture doc template** — values, operating principles, ways of working
- [x] Builds a **hiring scorecard** for evaluating candidates

### PMF Agent (Nova)
- [x] Generates a **customer interview script** (20 questions, sequenced properly)
- [x] Builds an **experiment tracker** — hypothesis, test, metric, result — prefilled with suggestions
- [x] Creates a **PMF survey** (Sean Ellis test + custom questions) ready to deploy
- [x] Outputs a **customer segment analysis** — which segment loves you most and why
- [x] Generates a **feature prioritization matrix** — impact vs effort based on customer signals
- [x] Builds a **"Signs of PMF" dashboard checklist** — where you stand on each indicator

### Competitive Intel Agent (Atlas)
- [x] Generates a **competitive matrix** — feature-by-feature comparison table
- [x] Creates **battle cards** — 1-pager per competitor with strengths, weaknesses, how to sell against
- [x] Builds a **market map visual** — categories, players, white space
- [x] Outputs a **SWOT analysis doc**
- [x] Generates **win/loss analysis framework** — template to track why you win or lose deals
- [x] Creates a **competitive positioning statement** — your wedge, their weakness

### Strategy Agent (Sage)
- [x] Builds a **1-page strategic plan** — vision, bets, milestones, risks
- [x] Generates **OKRs** for current quarter based on your stage and goals
- [x] Creates a **product roadmap** — now, next, later — aligned with fundraising milestones
- [x] Outputs a **board deck template** with pre-filled structure
- [x] Generates a **"What could kill us" risk register** with mitigation plans
- [x] Builds a **pivot evaluation framework** — should you pivot, double down, or expand?

---

## Agent UX Upgrades

- [x] Add **template gallery** per agent — founder picks what they want built, agent asks clarifying questions, then generates
- [x] Build **progress tracker** — "You've completed 4/9 agent deliverables. 5 remaining."
- [x] Add **"Quick Generate" mode** — skip the chat, agent asks 5 rapid questions then produces the doc
- [x] Build **revision workflow** — founder highlights a section, says "make this more aggressive," agent rewrites just that part
- [x] Add **version history** on every deliverable — v1, v2, v3 with diffs
- [x] Build **agent recommendations engine** — after Q-Score interview, auto-suggest which 3 agents to use first based on weakest dimensions
- [x] Add **deliverable quality score** — agent rates the completeness of what it produced: "This GTM plan is 70% complete — you still need to define pricing"
- [x] Build **"Share with co-founder" flow** — send any deliverable to a teammate for review/edit

---

## Connecting Agents to Q-Score

- [x] Completing an agent deliverable flags that dimension as "actively improving"
- [x] Investor profiles show which agents a founder has used — signals coachability
- [x] Build **"Score Challenge" flows**: Q-Score says "GTM is 52" → prompts GTM agent → founder builds plan → re-score that dimension based on plan quality
- [x] Add **agent-generated evidence** to score: Finance agent model counts as financial preparedness proof
- [x] Show investors a **"Founder Activity" heatmap** — which agents they used, how often, what they built
