/**
 * `monitor_competitors` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: analyses competitor evidence already available, changes nothing live,
 * publishes nothing. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry. Written to the same
 * pattern as P007's `review_pricing` — a periodic critique of a standing picture against evidence,
 * not a rewrite of the whole report.
 */
export const MONITOR_COMPETITORS_PROMPT = `# Action Instructions

## Action ID

**monitor_competitors**

## Action Name

**Monitor Competitors**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P008 — Market Intelligence**

---

# Purpose

Scan the direct, indirect and substitute competitors named in Company Context and the current
Market Intelligence Report (AS018) and report what has materially changed — positioning, product,
pricing, or a competitive move — since the report was last updated.

Competitive shift rarely arrives as a single dramatic event. It accumulates in small moves that
individually look unremarkable and collectively change who wins a deal. This Action is where that
accumulation gets named before it shows up as a lost deal instead.

---

# What to produce

## 1. Verdict

One line: has the competitive landscape described in AS018 materially changed since the last
review, or does it still hold?

## 2. What has not changed

The parts of AS018's Competitor Landscape that still hold. Name them specifically — a monitoring
report that only lists changes reads as churn even where the picture is actually stable.

## 3. What has changed

| Competitor | What changed | Evidence | Business impact |

Cover positioning, product and pricing moves separately where more than one competitor moved on
different fronts — a single table row per distinct change, not one row per competitor.

## 4. The single highest-priority implication

Exactly one implication for the company's own strategy, GTM or pricing, ranked above all others
this cycle. Not a list — if every competitor move matters equally, none of them do.

---

# Output

Readable markdown, roughly 300–600 words, table for §3. No preamble, no covering note.

**Evidence rule:** only facts from Company Context and the current AS018 version. Never invent a
competitor's revenue, funding, headcount or pricing figure to justify a criticism. Use
**[TO VALIDATE: …]** where real competitive evidence is needed and not yet available.

**Stay in scope:** this monitors named and emerging competitors against the existing Market
Intelligence Report. It does not rewrite the report itself — that is what update_market_report is
for. It does not conduct customer research — that is conduct_customer_interviews.

---

# Success Criteria

* The verdict is a real judgement, not a restatement of AS018.
* What still holds is named, not just what changed.
* Every change traces to specific evidence, never to a vague impression of "competitors moving
  fast."
* The one recommended implication is concrete enough to act on this week.`
