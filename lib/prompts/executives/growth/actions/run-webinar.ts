/**
 * `run_webinar` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PLANS, DOES NOT HOST OR SEND INVITES. See run-webinar.ts in the Registry
 * (the ActionDef) for the full reasoning: no webinar/events Connector exists
 * yet, and despite the name this Action produces a plan for the founder to
 * actually schedule and run — it never claims a webinar has been hosted or
 * that invitations have gone out.
 *
 * Internal and reversible: produces a document, sends nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name and one-line purpose came from the
 * Program Registry.
 */
export const RUN_WEBINAR_PROMPT = `# Action Instructions

## Action ID

**run_webinar**

## Action Name

**Run Webinar**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P003 — Demand Generation**

---

# ⚠️ This is a plan, not a hosted event

Produce a complete webinar plan the founder can actually schedule and run. This Action does not
host an event, send invitations or register attendees, and never claims to have. Frame the output
as a plan ready to execute, not as a confirmation that a webinar has taken place.

---

# Purpose

Design one webinar as a Hub content asset and lead magnet — drawing on the Content Strategy's
(AS010) Hub-and-Spoke model and the Campaign Strategy's (AS012) Lead Magnet Strategy — so
thought-leadership content converts into qualified pipeline rather than staying a one-off event
idea.

---

# What to produce

## 1. Webinar brief

| Field | Detail |
|---|---|
| Topic | … |
| Target audience | … |
| Content pillar (AS010) | … |
| Funnel stage | … |
| Format (panel, solo, demo, …) | … |
| Primary CTA | … |

## 2. Promotion plan

The Spoke content that should promote this Hub asset before and after the event (e.g. social
posts, email, landing page copy), drawn from AS010's Hub-and-Spoke model, and the channels from
AS012's Campaign Funnel best suited to reach the target audience.

## 3. Follow-up plan

How attendees and no-shows should be nurtured afterward, and what the webinar recording becomes
next (e.g. a Spoke asset, gated resource).

## 4. Success metrics

The KPIs this webinar should be measured against, drawn from AS012's Success Metrics (e.g.
registrations, attendance rate, qualified leads generated).

---

# Output

Readable markdown, roughly 300–500 words plus the brief table. A plan someone could hand to
whoever schedules and runs the event — not a strategy document.

**Evidence rule:** every claim traces to AS010, AS012 or Company Context. Never invent attendance
figures, past results or speaker commitments. Use **[TO VALIDATE: …]** for anything requiring
confirmation not yet available.

**Stay in scope:** this plans one webinar against the existing Content and Campaign Strategies. It
does not redesign either Strategy — that is what re-running AS010 or AS012 is for.

---

# Success Criteria

* The brief is specific enough to schedule without further clarification.
* Promotion and follow-up both trace to the Hub-and-Spoke and Lead Magnet models.
* Success metrics are measurable and drawn from AS012.
* Nothing in it implies the webinar has already been hosted.`
