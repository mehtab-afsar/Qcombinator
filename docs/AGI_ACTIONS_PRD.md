# AGI Actions PRD

**From executives that *describe* work to executives that *do* it.**

*Status: proposal. Nothing here is built. Written 24 Aug 2026. Every current-state number in
Part 1 was verified against source on that date; every external claim in Part 5 carries a
citation.*

---

## 0. The one-line version

We built a genuinely good autonomous work engine and connected it to almost nothing. **58 of our
61 Actions end in a document a human still has to act on.** This PRD is about attaching the hands
— and about the two specific architectural holes that must be closed first, or every integration
we add will be a disconnected island.

---

## 1. Where we actually are

### What is real and good

The engine works. Registry → Prompt Composer → Operating Rhythm → the approval boundary → action
chaining are all built, tested, and sound. That is not faint praise: it is a real autonomous
executive system that runs weekly, maintains versioned knowledge, and produces genuine executive
judgement.

| | Count |
|---|---|
| Executives | 5 (CEO, Growth, Product, Operations, Finance) |
| Seeded Programs | 10 — P001, P002, P003, P005, P006, P008, P009, P015, P016, P023 |
| Seeded Assets | 36 |
| Seeded Actions | **61** |
| Connectors built | 5 — `gmail`, `gmail_read`, `slack`, `stripe`, `posthog` |

### What is not

**Of 61 Actions, exactly 3 touch the outside world:**

| Action | Program | Connector |
|---|---|---|
| `interview_customers` | P001 | gmail |
| `post_team_update` | P001 | slack |
| `generate_personalized_outreach` | P005 | gmail |

**The other 58 — 95% — terminate in prose.** This isn't an accident or an oversight; it's written
into their own docstrings, over and over: *"not a live CRM write," "a human still has to apply,"
*"produces a draft," "not a live session."* We built an executive team that writes excellent memos
about work instead of doing it.

**And three connectors are built, authenticated, and used by zero Actions**: `gmail_read`,
`stripe`, `posthog`. Working sense organs sitting on a shelf.

### The two root causes

Everything else in this document follows from these two findings.

#### Root cause 1 — the Connector contract is email-shaped

`lib/connectors/types.ts:30-48`:

```ts
ConnectorRequest = { idempotencyKey, recipients[], subject, body, channel? }
```

That is the *only* vocabulary a connector has. There is no way to express *"find companies
matching this ICP,"* *"get me a verified email for this person,"* *"book a 30-minute call,"* or
*"publish this page."* **A connector that is not a messaging connector cannot currently exist.**

#### Root cause 2 — there is no entity layer

`founder_contacts` is the only real-world business entity on the Edge Alpha path. It is:

- **standalone** — its only foreign key is to `founder_profiles`; it links to no Program, Action,
  or Asset
- **written by the founder in the UI, never by an Action**
- **consumed as prose**, rendered into a prompt as text

Meanwhile the structured JSON an Action's model produces is parsed, briefly stored in the vault,
read for four email fields, and then **deleted** (`execute.ts:214`). There is no table an Action
can write a record into. Action-to-action chaining (`dependsOn`) passes **prose between prompts**,
not records.

### These two holes are exactly the founder's complaint

While testing Patel's AI SDR:

> *"Who gives a damn about position — I can say go mail the CEO of that company. But I need to get
> the email of that guy, that's more important."*

→ **Root cause 1.** The pipeline can reason about *who* to contact but has no capability to *find*
them, because "find a person" is inexpressible in the connector contract.

> *"The AI SDR will say CEO or CTO of so-and-so company, but my contact list has the number of my
> barber. There is a mismatch."*

→ **Root cause 2.** Research output is prose inside a document. Contacts are a disconnected,
hand-typed table. They can never meet, because nothing an Action produces can *become* a contact
record.

The AI SDR isn't badly built. It's a well-built pipeline with no hands and no memory.

### Also confirmed, worth knowing

- **`ActionDef.kind: 'recurring'` is a field nothing reads.** All 61 Actions are `'oneoff'`.
- **`scheduled_actions` is a dead table** — pre-Edge-Alpha, no cadence column, zero code
  references.
- **There is no scheduler.** The only orchestration is the weekly rhythm, one step per invocation.

---

## 2. This is not a new direction

It is the overdue delivery of a pillar we already committed to. `EDGE_ALPHA_PRD.md` §3, verbatim:

> **"AI executives that generate deliverables" is table stakes.** Position there and we lose a
> breadth war to better-funded incumbents.
> **3. Real execution through Connectors.** It doesn't recommend the email — it sends it (with
> permission). Memo vs. action.

We are currently positioned exactly where our own strategy document says we lose.

---

## 3. The spine

The ask is for leaves: lead gen, LinkedIn, booking, scheduling, publishing. The honest engineering
answer is that leaves without a spine produce twenty disconnected integrations *and the exact same
mismatch problem*, at twenty times the cost.

Three primitives, in dependency order.

### 3.1 A Capability contract

Generalise `ConnectorRequest` from "a message" into a typed capability invocation. Keep
`send`/`reconcile`/`revoke`, the `connector_grants` table, the Vault token handling, and the
generic OAuth routes exactly as they are — all of that is good and none of it needs to change.

Six capability classes, which is also the map of everything we'd ever build:

| Class | Direction | Examples |
|---|---|---|
| **FIND** | data in, on demand | lead search, email enrichment, company data, web research |
| **REACH** | comms out | email, LinkedIn (drafted), SMS, WhatsApp |
| **SCHEDULE** | both | calendar, booking links, reminders |
| **PUBLISH** | out | website, blog, social, docs |
| **TRANSACT** | out | invoices, payments, contracts, e-sign |
| **OBSERVE** | data in, continuous | analytics, inbox, CRM, bank, accounting |

### 3.2 An Entity layer

Real records that Actions read **and write**, that the founder can see and edit, RLS'd per founder:
`leads`, `meetings`, `candidates`, `invoices`, `investors`.

The critical reconciliation: a researched **Lead**, once enriched with a verified email, *becomes*
a contact. That single link is what closes the mismatch. "CEO of Acme" stops being a sentence in a
document and becomes a row with a status, a history, and a next action.

### 3.3 Structured Action results

The typed JSON the model already emits must survive into entities instead of being discarded.
`dependsOn` should pass **records**, not paragraphs.

**Everything else hangs off these three.** Build leaves first and we build the spine twice.

---

## 4. Per-executive — what we have, and what becomes possible

### Growth — Patel, Chief Growth Officer

*"I exist to create growth."* — 6 Programs, 17 Assets, **41 Actions**. Our most built executive,
and the one with the live complaint.

**Today:** P001 GTM (ICP, positioning, messaging, pricing) · P002 Brand · P003 Demand Generation ·
P005 Customer Acquisition & Sales Enablement — the 13-action AI SDR · P006 Customer Success ·
P008 Market Intelligence. Two of our three real-world Actions live here.

**What becomes possible:**

- **Real lead acquisition** — search → verified email → a `Lead` record. Closes the complaint.
- **Sending infrastructure that doesn't burn his domain** — dedicated subdomain, warmup, daily
  caps, verify-before-send. See §5.
- **Real reply handling** — `gmail_read` is *already built*. Monitor and classify replies for
  real instead of reasoning about hypothetical ones.
- **Booking that produces a `Meeting`** — outreach carries a real booking link; a booked call
  becomes a record, not a sentence.
- **Real market intelligence** — P008 currently monitors competitors from model recall. It should
  read the actual web.
- **Publishing** — P002/P003 produce brand and content assets that then sit in a document. They
  should reach the actual site.

### Product — Chief Technology Officer

*"I build what the market will pay for."* — 2 Programs of 8, 11 Assets, 10 Actions.

**Today:** P015 Validate (customer interviews, PMF scorecard, problem validation, feature
prioritisation) · P016 Product (vision → roadmap → backlog → PRD, newly built). P017–P022 (Build,
AI, Platform, Quality, Security, Innovate) are named in the workbook, unseeded.

**What becomes possible:**

- **The customer-interview engine** — schedule → transcribe → auto-synthesise into AS043/AS045/
  AS046. This is the single highest-leverage pre-PMF activity and it is 100% manual today. Nobody
  does this well.
- **PMF scored from real usage** — the `posthog` connector exists and is unused. AS044 should read
  actual retention and activation, not vibes.
- **Backlog and PRDs as real tickets** — GitHub/Linear, so P016's output reaches engineering
  instead of a document.

### Operations — Chief Operations Officer

*"I make the company run."* — 1 Program of 6, 3 Assets, 5 Actions.

**Today:** P009 Review only. P010 Plan · P011 Execute · P012 People · P013 Govern · P014 Improve
are named and unseeded — and uniquely, they are the only unseeded set for which the workbook also
supplies action names.

**What becomes possible:**

- **KPI dashboards from real numbers** — AS019/AS020 currently *describe* dashboards. Stripe +
  PostHog + bank makes them actual.
- **Hiring pipeline** — sourcing → screening → scheduling, with `candidates` as entities.
  Recruiting is a second full-time job for a founder.
- **Vendor and tool spend** — what you pay for, what's unused.

### Finance — Chief Financial Officer

*"I keep the company alive and fundable."* — 1 Program of 7, 5 Assets, 5 Actions.

**Today:** P023 Model only. P024 Capital · P025 Raise · P026 Cash · P027 Metrics · P028 Risk ·
P029 Value exist only in the workbook.

**What becomes possible — and this is arguably the highest-value integration in the entire
product:**

- **Live runway.** Bank + Stripe → real cash position, real burn, real runway, and an alert when
  it moves materially. **Founders die of cash surprise.** Note the precedent: Stripe's
  `onConnected` hook already writes structured columns (`stripe_mrr`, `arr`, `customers`) to
  `founder_profiles` — the *only* place in the codebase where a connector writes real business
  data. The pattern exists; it has one user.
- **Investor-update autopilot** — real metrics → monthly update → sent to the real cap table.
  Universally hated, universally skipped.
- **Fundraise pipeline** — P024/P025 with investors as entities, not prose.

### CEO — Chief of Staff

*"I turn the score into a mandate."* — `programs: []`, by design. Owns S001 (Strategy) and S002
(Contract).

**What becomes possible:** the **Learn** arc. Today the loop is Sense (Q-Score) → Decide (Mandate)
→ *describe acting*. With real execution, the CEO can read genuine outcomes across every executive
and re-cut the mandate against what actually happened. That closes the loop — and it is the thing
no standalone tool can do.

### The cheapest big win

`gmail_read`, `stripe`, and `posthog` are built, connected, and used by nothing. Wiring them as
**inputs** requires no new vendor, no new connector, no new approval flow — every read is internal
and reversible under ADR-004. The CFO reads Stripe. The CTO reads PostHog. Everyone reads the
inbox. **Do this before building anything new.**

---

## 5. Hard truths

Researched, not assumed. These change the design.

### LinkedIn automation: do not build it

There is no sanctioned path. The official partner API cannot send connection requests, cannot
DM, and cannot scrape profiles. None of the consumer outreach tools (Waalaxy, Expandi, HeyReach,
Dripify, Phantombuster) are approved partners. 2026 enforcement escalated sharply: suspicious
sessions flagged within 48 hours, suspensions instead of warnings, and in **March 2026 HeyReach's
own company page and founder profile were banned.** The risk gap between browser automation and
sanctioned APIs is widening, not closing.

**Recommendation: draft-and-queue only.** The AI decides who and writes what; the founder clicks
send inside LinkedIn. That captures most of the value at zero ban risk. Anything headless puts the
founder's account — and potentially ours — at risk.

### Cold email will burn his domain if done naively

2026 reality: the practical ceiling is **20–50 sends per mailbox per day**, not Gmail's technical
2,000. DMARC `p=reject` is the effective default at Gmail and Outlook, the spam-complaint ceiling
is 0.10%, RFC 8058 one-click unsubscribe is mandatory for bulk senders, and sending to unverified
lists now actively trips bounce-rate compliance gates.

**Never send SDR volume from the founder's primary inbox.** This needs a dedicated sending
subdomain, a warmup ramp, hard daily caps, and verification before every send. That is
infrastructure, not a connector — and it must be designed in from the start, not bolted on.

### ADR-004 is a wall, and it is load-bearing

Every irreversible act requires per-payload, just-in-time founder approval, and **ADR-020
deliberately closes the recurring-action loophole** (a sequence is N Actions, each individually
gated). Fifty outreach emails means fifty approvals. That is unusable.

**Recommended amendment: batch-payload approval.** The founder reviews N prepared payloads and
approves once, with the hash binding that exact set — change any byte and the approval is void.
This preserves ADR-004's actual principle (*the founder saw the exact content before it left*)
while making volume viable. **This is a decision for the founder, flagged explicitly — not
something to slip through.** ADR-004's reasoning is sound and its rejection of "unattended
irreversible actions" should survive intact.

### The category has a credibility problem, not a capability gap

11x was publicly reported claiming customers it did not have, and ZoomInfo said it "performed
significantly worse than our SDR employees." Artisan has documented reviews describing output as
"obviously AI" and one campaign of 1,400 emails with zero responses.

**Being another AI SDR is not a differentiator.** The differentiator is that ours operates under a
mandate, derived from a Q-Score, with outcomes that feed back. Apollo does not know your strategy.
Calendly does not know your runway. That coherence is the moat — not the integrations themselves.

### The sequencing tension, stated honestly

`FOLLOWUPS.md` FU-009 and `EDGE_ALPHA_PRD.md` §13.7 both pre-label connector breadth as *the* named
scope-creep risk, gated behind ADR-016's week-4 retention gate.

**Counter-hypothesis worth taking seriously: documents nobody acts on may *be* the retention
problem.** If so, this work is what passes the gate, not what waits behind it. That reframing
deserves a deliberate decision rather than a default.

---

## 6. Provider recommendations

| Need | Recommendation | Why |
|---|---|---|
| **Lead data** | **Apollo.io** | 275M contacts; $49–119/user/mo + credits ($25 per extra 1k). Note the shape: *People Search* finds prospects but **returns no emails** — *People Enrichment* does (1 credit/email, 8/phone), with waterfall enrichment for coverage. Plan for two calls, not one. |
| | *Hunter.io* — rejected | Cleaner API, but $6.50 per search credit is the wrong cost shape for volume. Good verification though ($0.03/verify) — worth considering as a verify-before-send layer. |
| | *Clearbit* — rejected | Absorbed into HubSpot, no public API pricing, enrichment-only (it deepens records you already have; it doesn't find people). |
| **Scheduling** | **Cal.com** | ~$0.10/booking vs Calendly's $1,500–3,000/mo per-seat at embedded scale. Open-source, white-label, API-first. |

### Commercial model: BYOK

Founders connect **their own** Apollo and Cal.com accounts through the `connector_grants` + Vault
OAuth pattern we already have. This gives us zero COGS per founder, keeps ToS liability with the
account holder, lets founders use tools they already pay for, and requires no new architecture.
Managed keys can come later, if ever.

---

## 7. Sequencing

**A — Spine.** Capability contract, entity layer, structured results. Plus wire the three idle
connectors as sense organs — near-free, immediate value.

**B — One vertical slice, all the way through.** Growth: find → verified email → `Lead` →
batch-approved outreach → reply detection → booked `Meeting`. This proves the entire pattern on
the exact case that triggered this document.

**C — Repeat the pattern.** Finance live-runway. Product interview-engine.

**D — Breadth.** Everything else, now cheap, because the spine exists.

---

## 8. Three decisions needed before building

These are the founder's to make. This document deliberately does not pre-empt them.

1. **Amend ADR-004 to allow batch-payload approval?** Without it, volume outbound is impossible.
   With it, we knowingly relax a locked safety decision — in spirit-preserving fashion, but
   knowingly.
2. **BYOK or managed keys?** Recommendation is BYOK. It's a business-model decision, not a
   technical one.
3. **Spine-first, or a fast Apollo win first?** Spine-first is correct and slower. A quick Apollo
   integration would demo well next week and be rebuilt within a quarter. Both are defensible;
   they should be chosen, not drifted into.

---

## Appendix — sources

- [Apollo.io People Search API](https://docs.apollo.io/reference/people-api-search) ·
  [People Enrichment](https://docs.apollo.io/reference/people-enrichment) ·
  [Apollo pricing breakdown](https://www.smarte.pro/blog/apollo-io-pricing)
- [Hunter vs Clearbit vs Apollo comparison](https://mailsfinder.com/compare/hunter-vs-clearbit-vs-apollo) ·
  [Clearbit vs Hunter 2026](https://abmatic.ai/blog/clearbit-vs-hunter-io-2026)
- [LinkedIn automation rules 2026](https://northlight.ai/blog/is-linkedin-automation-against-the-rules) ·
  [2026 crackdown](https://linkedinsider.blog/linkedin-automation-crackdown-2026) ·
  [HeyReach ban](https://www.wonda.sh/blog/linkedin-automation-safety-heyreach-ban)
- [Cold email deliverability 2026](https://growthengineer.ai/blog/cold-email-deliverability-2026) ·
  [Gmail sending limits](https://www.primeforge.ai/blog/gmail-sending-limit) ·
  [GDPR vs CAN-SPAM](https://www.mailforge.ai/blog/gdpr-vs-can-spam-email-compliance-compared)
- [Cal.com vs Calendly scheduling APIs](https://apiscout.dev/guides/cal-com-vs-calendly-vs-savvycal-scheduling-api-2026)
- [11x customer claims reporting](https://techcrunch.com/2025/03/24/a16z-and-benchmark-backed-11x-has-been-claiming-customers-it-doesnt-have) ·
  [AI SDR landscape](https://gtmlens.com/state-of-ai-gtm-q2-2026/)
