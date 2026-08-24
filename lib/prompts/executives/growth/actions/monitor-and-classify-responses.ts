/**
 * `monitor_and_classify_responses` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: classifies interest from reply information
 * already captured. No live inbox connector is wired to this Action —
 * gmail_read exists in the Connector registry for other purposes but is
 * not granted here — so this works from whatever Company Context / prior
 * cycle results already contain, never a live feed. Runs autonomously
 * (ADR-004).
 */
export const MONITOR_AND_CLASSIFY_RESPONSES_PROMPT = `# Action Instructions

## Action ID

**monitor_and_classify_responses**

## Action Name

**Monitor & Classify Responses**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# ⚠️ This works from captured information, not a live inbox

This Action has no live email connector and cannot check an inbox itself. It reviews whatever reply
information has already been captured in Company Context or prior cycle results — a reply pasted in,
a status noted from a previous run, a CRM note. If nothing has been captured for a given lead, the
honest answer is "no response information available yet," not a guess at what might have happened.

---

# Read your live pipeline first

Company Context includes **"Your Lead Pipeline"** — the founder's real lead records as they stand
right now: company, role, contact name where one is known, current status, fit score, and whether a
verified email is on file. That is the live table, including any status the founder changed by
hand since the last cycle.

Work from those records. Where an earlier step in this chain also appears in Company Context, treat
it as that step's reasoning — the pipeline is the current state of the world.

Addresses are deliberately not listed there. If a lead shows no email yet, say what would be needed
rather than inventing one.

---

# Purpose

Turn scattered reply information into a clear per-lead classification and a next step, so leads that
went quiet don't stall silently and leads that showed interest don't wait for someone to notice.

---

# What to produce

## 1. Batch summary

| Field | Detail |
|---|---|
| Leads reviewed (from generate_personalized_outreach / follow_up_prospects) | … |
| Leads with any captured reply information | … |
| Leads with no captured information | … |

## 2. Classification

| Lead / account | Interest level | Signal it's based on | Recommended next step |

**Interest level:** interested / maybe / not interested / no response yet. Never infer "interested"
from silence — silence is "no response yet," a distinct and common category, not a soft no.

**Recommended next step:** one of — hand to qualify_leads (clear interest, ready to score for sales
readiness), hand to follow_up_prospects (engaged but needs another touch), or stop (explicit
disinterest, or account has been set aside per score_and_prioritize_leads).

## 3. What needs a human check

Any ambiguous reply (mixed signal, unclear intent) flagged for a founder to read directly rather than
force-classified.

---

# Output

Readable markdown, one table plus the summary and human-check flags. Length follows batch size.

**Evidence rule:** every classification traces to captured reply information or an explicit
"no response yet." Never invent a reply's content or tone. Use **[TO VALIDATE: …]** for anything
ambiguous enough to need a founder's read.

**Stay in scope:** this classifies and routes; it does not draft the next message itself — that is
follow_up_prospects's or qualify_leads's job — and it never sends or reads email directly.

---

# Success Criteria

* Every lead lands in exactly one interest level, with a stated reason.
* "No response yet" is never quietly treated as "not interested."
* The recommended next step is specific enough that the next Action can act on it immediately.
* Ambiguous replies are flagged for a human, not force-classified.`
