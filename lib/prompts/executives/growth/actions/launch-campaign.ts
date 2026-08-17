/**
 * `launch_campaign` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PLANS, DOES NOT SPEND OR PUSH LIVE. See launch-campaign.ts in the
 * Registry (the ActionDef) for the full reasoning: no paid media/ads
 * Connector exists yet, and despite the name this Action produces a
 * launch-ready plan for the founder to actually run — it never claims a
 * campaign is live or that budget has been committed.
 *
 * Internal and reversible: produces a document, spends nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name and one-line purpose came from the
 * Program Registry.
 */
export const LAUNCH_CAMPAIGN_PROMPT = `# Action Instructions

## Action ID

**launch_campaign**

## Action Name

**Launch Campaign**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P003 — Demand Generation**

---

# ⚠️ This is a plan, not a live campaign

Produce a launch-ready campaign plan the founder can actually run. This Action does not spend
budget, place ads or push anything live, and never claims to have. Frame the output as a plan
ready to execute, not as a confirmation that a campaign is running.

---

# Purpose

Turn the Campaign Strategy (AS012) into one specific, launch-ready campaign — objective, audience,
channel, creative direction, budget guidance and KPI — so the strategy produces an actual campaign
rather than staying architecture.

---

# What to produce

## 1. Campaign brief

| Field | Detail |
|---|---|
| Objective | … |
| Audience | … |
| Channel(s) | … |
| Offer / CTA | … |
| Funnel stage (AARRR / RACE) | … |
| KPI | … |

Every field traces to AS012's Campaign Architecture, Customer Journey or Paid Media Strategy — not
invented here.

## 2. Creative direction

The core message and proof points the campaign should lead with, drawn from AS004/AS009 where
those Assets exist, plus one to two supporting angles.

## 3. Budget guidance

A directional budget range and how it should be allocated, framed as a recommendation for the
founder to approve — not a spend that has already happened. Use **[TO VALIDATE: …]** where a real
number depends on information not yet available.

## 4. Measurement plan

How this campaign will be measured against AS012's attribution methodology, and the point at which
performance should be reviewed.

---

# Output

Readable markdown, roughly 300–500 words plus the brief table. This is a plan someone could hand
to whoever runs paid media or owns the channel — not a strategy document.

**Evidence rule:** every claim traces to AS012, other existing Assets, or Company Context. Never
invent audience sizes, cost benchmarks or results. Use **[TO VALIDATE: …]** for anything requiring
real market or platform data.

**Stay in scope:** this launches one campaign against the existing Campaign Strategy. It does not
redesign the Campaign Strategy itself — that is what re-running AS012 is for. Material budget
increases or strategic campaign changes require Founder approval per the Program Prompt — flag
those explicitly rather than deciding them here.

---

# Success Criteria

* The brief is specific enough to execute without further clarification.
* Every field traces to AS012 or another named Asset.
* Budget guidance is framed as a recommendation, never a completed spend.
* Nothing in it implies the campaign is already live.`
