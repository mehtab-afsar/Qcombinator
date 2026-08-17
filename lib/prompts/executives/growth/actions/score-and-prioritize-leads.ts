/**
 * `score_and_prioritize_leads` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: ranks accounts, spends nothing, commits nothing.
 * Same evidence discipline as P001's prioritize_channels. Runs
 * autonomously (ADR-004).
 */
export const SCORE_AND_PRIORITIZE_LEADS_PROMPT = `# Action Instructions

## Action ID

**score_and_prioritize_leads**

## Action Name

**Score & Prioritize Leads**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# Read the prior step's output first

Company Context includes a section titled **"Output From a Prior Step In This Chain — Research
Account"** — the account briefs already produced. Score and rank from those, not from a fresh
pass over the target list.

---

# Purpose

Take the accounts identified through find_target_companies, find_decision_makers and
research_account, and turn the pile into a **decision**: which accounts get outreach effort first,
and which are explicitly set aside for now.

A ranking that scores everything "medium-high" and pursues all of it has decided nothing — the same
discipline prioritize_channels applies to channels, applied here to accounts.

**Do not confuse this with qualify_leads.** This ranks candidate accounts BEFORE first contact, to
decide who to reach out to first. qualify_leads scores leads AFTER contact/response, against AS015's
Lead Scoring Framework, to decide sales readiness. Different question, different moment in the
funnel.

---

# What to produce

## 1. The shortlist

The accounts to pursue now, ranked, in a sentence each: which one or two matter most this cycle and
why.

## 2. The ranking

| Rank | Account | Why it ranks here | Evidence standing | Effort to first response |

**Evidence standing:** evidenced / inferred / assumed — the same three-tier discipline
prioritize_channels uses. Rank on what is actually known about the account and its fit, not on how
appealing the company name sounds.

**Effort to first response:** how quickly this account is likely to engage, based on what
research_account surfaced (a warm signal vs. a cold, generic-fit account).

## 3. What we are deliberately deprioritizing

Name the accounts being set aside this cycle and why — the explicit complement to §1, so a
deprioritized account doesn't quietly stay on every list forever by default.

## 4. What would change the ranking

The observation that would move an account up or down — stated as a trigger to watch for in
monitor_and_classify_responses or a future cycle.

---

# Output

Readable markdown, table for §2, roughly 300–600 words total depending on batch size.

**Evidence rule:** only facts from find_target_companies, find_decision_makers, research_account and
Company Context. Never invent engagement signals, firmographic data or fit scores not backed by
those inputs. Use **[TO VALIDATE: …]** where a real signal is needed but not yet confirmed.

---

# Success Criteria

* The shortlist is a real decision, not "pursue everything."
* Every rank traces to stated evidence, not vibes.
* Deprioritizing is explicit, not implied by omission.
* generate_personalized_outreach can take §1's shortlist directly as its input.`
