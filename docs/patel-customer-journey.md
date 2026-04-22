# Patel — Founder Customer Journey
**How a founder goes from Q-Score to 4 GTM deliverables**

---

## The Setup

A founder completes the IQ Score assessment. Market Readiness (P1) comes back **19/100**.

They don't know what that means or what to fix. They click "Talk to Patel" from the improve-score page.

---

## Act 1 — Patel Opens Informed, Not Blank

The founder hasn't typed anything yet.

Patel reads their data server-side:
- Overall IQ Score: 26/100
- P1 Market Readiness: 19/100
- P1.1 ICP Clarity: 12/100 ← lowest sub-score
- P1.2 Customer Insight: 18/100
- P1.3 Channel Focus: 28/100
- P1.4 Message Clarity: 20/100
- Profile: B2B SaaS, pre-seed, 3 customer conversations, no paying customers, industry: "founders"
- Deliverables built: none

Patel opens:

> **Patel:** Your Market Readiness is 19/100. The most upstream issue is ICP clarity — right now you have "founders" as your target customer, which is a category, not a customer. That single vagueness is likely why your conversations haven't converted and your messaging isn't landing — there's no specific person to aim at.
>
> Before I draft anything, I need three things:
>
> 1. Who specifically did you build this for — can you name one or two actual people or companies, not a type?
> 2. Of the three conversations you've had, who was the most interested and what was different about them?
> 3. What would have to be true about someone's situation for them to pay for this in the next 30 days?

---

**What just happened technically:**
- No user input yet
- Patel's system prompt received the founder's full data context
- Patel identified P1.1 as the weakest sub-score → ICP-first default triggered
- 3 compound questions designed to pull: ICP specificity, commercial signal, urgency trigger

---

## Act 2 — Founder Answers

> **Founder:** Okay so honestly I've been talking to anyone who'd listen. But the one person who got it immediately was a guy called Sandeep — Series A SaaS company, about 40 people, he's the CEO. He just raised and has no idea how to build a GTM team. The others were earlier stage and just curious. As for 30 days — I think someone who just raised and is under pressure to show revenue growth in the next quarter would move fast.

Patel now has:
- **Specific person:** Sandeep — Series A SaaS, 40 employees, CEO
- **Commercial signal:** post-raise, no GTM function, revenue pressure
- **Trigger:** recently raised + board pressure on revenue
- **Contrast:** pre-seed founders were curious but didn't buy

Patel responds:

> **Patel:** Got it. Sandeep is your ICP — not "founders" broadly. The signal is Series A, post-raise, 20–80 people, CEO or founder who just became accountable to a board for revenue but hasn't built a GTM motion yet. That's a specific, findable, pressured person.
>
> One more thing before I build the ICP card: what does Sandeep currently do instead of working with you? What's his workaround right now — even if it's bad?

---

**What just happened:**
- Patel extracted 4 structured fields from one answer
- Identified the contrast (pre-seed = low intent, Series A post-raise = high intent)
- Asked one more targeted question to get the "current workaround" field for D1

---

## Act 3 — ICP Definition Built (D1)

Founder answers the workaround question. Patel now has enough.

> **Patel:** I have what I need. Building your ICP card now.

**D1 — ICP Definition card slides into the right panel:**

```
┌─────────────────────────────────────────────────────────────────┐
│  D1: ICP Definition                                             │
│  Confidence: Inferred (2 validated conversations)              │
├─────────────────────────────────────────────────────────────────┤
│  Segment Name       │ Post-raise Series A B2B SaaS CEOs        │
│  Firmographics      │ B2B SaaS · 20–80 employees · India/SEA   │
│                     │ Series A raised in last 6 months          │
│  Buyer Role         │ CEO / Founder                             │
│  Core Pain          │ No GTM structure; board pressure on rev   │
│                     │ No ICP, no outbound, no playbook          │
│  Trigger Event      │ Post-raise board accountability;          │
│                     │ missed or flat Q1/Q2 revenue              │
│  Buying Context     │ CEO decides; no procurement; fast cycle   │
│  Why This ICP Now   │ They just got money + immediate pressure  │
│                     │ to deploy it on growth. Urgency is high.  │
│  Exclusions         │ Pre-seed (no urgency, no budget)          │
│                     │ Series B+ (already have GTM team)         │
│  Confidence         │ Inferred — validated by 1 strong signal   │
│  Open Assumptions   │ Geography: India assumed, not confirmed   │
│                     │ Deal size: unknown — needs one paid deal  │
└─────────────────────────────────────────────────────────────────┘
```

Patel follows up:

> **Patel:** ICP card saved. The open assumptions in amber — geography and deal size — need one real paid deal to validate. Don't try to answer those now, just note them.
>
> ──────────────────────────────────────
> **Bottleneck identified:** ICP Clarity (P1.1)
> **D1 complete.** +5 pts applied to your Market Readiness score.
>
> **Next:** D2 — Pains, Gains & Triggers Card
> Now that we know *who* the customer is, we need to map what they're feeling — their actual pain, what they want instead, and what makes them act now. This directly feeds your outbound messaging and will tell you exactly what to say in a cold email opener.
>
> [Build D2 →]
> ──────────────────────────────────────

---

**What just happened technically:**
- Pass 1: conversation text → structured fields extracted (ICP object)
- Pass 2: fields → rendered D1 artifact card
- Saved to `agent_artifacts` table (artifact_type: `icp_document`)
- Score signal fired: +5 pts to P1 in `qscore_history`
- Profile patched: `customerType` field updated to "Series A B2B SaaS CEO" (confidence: 0.55)
- Closing recommendation card shown with bottleneck + next step

---

## Act 4 — Next Session: D2 Pains, Gains & Triggers

Founder comes back the next day. Clicks "Build D2."

Patel already has D1 in context. It doesn't re-ask ICP questions.

> **Patel:** We have your ICP — post-raise Series A SaaS CEOs with no GTM structure.
>
> For the Pains & Gains card I need to go deeper on what Sandeep is actually feeling day-to-day. Two questions:
>
> 1. When this problem is at its worst for him — what does a bad week look like? What's he staring at that's broken?
> 2. When he imagines solving this — what does he tell his board? What's the outcome he's promising?

Founder answers. Patel has enough.

D2 card generated:

```
┌─────────────────────────────────────────────────────────────────┐
│  D2: Pains, Gains & Triggers Card                              │
│  ICP: Post-raise Series A SaaS CEO (from D1)                   │
├─────────────────────────────────────────────────────────────────┤
│  CORE PAINS                                                     │
│  • No ICP → salespeople call everyone, close no one            │
│  • Board asks for pipeline visibility; there's no system        │
│  • Founder is still doing most sales personally (not scalable)  │
│  • Hired a VP Sales too early, wrong fit, now a liability       │
│  • Messaging varies by rep; no consistent narrative             │
│                                                                 │
│  DESIRED GAINS                                                  │
│  • A GTM playbook they can hand to a hire and it works          │
│  • Clear ICP so outbound can be delegated and measured          │
│  • Board-ready pipeline metrics and a forecast they trust       │
│  • First €50K+ ARR from non-founder-led sales                   │
│                                                                 │
│  CURRENT WORKAROUNDS                                            │
│  • Founder does all sales personally                            │
│  • Using generic sales frameworks (MEDDIC, Sandler) badly       │
│  • Hired a RevOps consultant — cost €15K, got a spreadsheet     │
│                                                                 │
│  TRIGGER EVENTS                                                 │
│  • Board meeting in 6 weeks, expected to show pipeline          │
│  • Just hired 2 SDRs with no playbook to give them             │
│  • Q2 missed; board has asked "what's the GTM plan?"            │
│                                                                 │
│  PROOF EXPECTATIONS                                             │
│  • Another Series A SaaS founder who used this and closed deals │
│  • A sample ICP document or GTM plan they can see before paying │
│  • Founder-to-founder intro (not vendor pitch)                  │
│                                                                 │
│  KEY OBJECTIONS                                                 │
│  • "I just need to hire the right VP Sales"                     │
│  • "We've tried consultants, they don't understand our product" │
│  • "I don't have time to go through a process right now"        │
│                                                                 │
│  CONFIDENCE                                                     │
│  Validated: pain points (1 deep conversation)                  │
│  Inferred: trigger events (pattern from stage, not confirmed)  │
│  Assumed: proof expectations (typical for B2B SaaS segment)    │
└─────────────────────────────────────────────────────────────────┘
```

> **Patel:** D2 done. +5 pts applied to Market Readiness.
>
> The "Proof Expectations" section is the most important thing to read before you do any outbound. Sandeep doesn't want a pitch — he wants a peer intro and a sample he can look at before committing. Your first cold email should lead with a case study or a sample, not your product description.
>
> **Next:** D3 — Buyer Journey
> Now we map how Sandeep actually buys. Where does he hear about solutions, who does he involve, where does the deal stall, and what's needed to close.
>
> [Build D3 →]

---

## Act 5 — D3 Buyer Journey

Two questions from Patel. Founder describes how the Sandeep deal actually progressed — the WhatsApp intro, the demo, the week of silence, the pricing conversation.

D3 generated as a stage table:

```
Stage          | Objective           | Stakeholder    | Key Question              | Proof Needed            | Friction                     | Touchpoint
---------------|---------------------|----------------|---------------------------|-------------------------|------------------------------|------------------------
Trigger        | Recognise the gap   | CEO            | "Is this fixable?"        | Nothing yet             | None — internal realization  | —
Awareness      | Find options        | CEO            | "Who has solved this?"    | Peer recommendation     | Doesn't trust vendors        | Founder-to-founder intro
Consideration  | Evaluate fit        | CEO + 1 advisor| "Will this work for us?"  | Sample GTM plan/ICP doc | Time pressure, scepticism    | Free sample or short call
Decision       | Commit              | CEO            | "Is the price justified?" | One reference CEO       | Price anchored vs consultant | Reference call + pilot offer
Pilot          | Prove value fast    | CEO + VP Sales | "Is this actually working?"| First deliverable done | Bandwidth, distractions      | Weekly check-in, fast delivery
Paid           | Expand or renew     | CEO            | "What's the ROI?"         | Pipeline impact         | Competing priorities         | Metric review + next deliverable
```

---

## Act 6 — D4 Positioning & Messaging System

All three prior deliverables are loaded as context. Patel generates website copy, outbound hooks, sales scripts, and internal pitches — all written for Sandeep, not a generic audience.

Sample output (one section):

```
OUTBOUND EMAIL — Problem-Led Hook

Subject: GTM after raise — quick question

[First name], most Series A founders I speak with hit the same wall 3–4 months post-raise: you have
capital, 2 new SDRs, and no playbook to give them. The board wants pipeline visibility by Q2. The
VP Sales hire feels premature.

We work with Series A B2B SaaS founders to build the GTM foundation — ICP, playbook, outbound
system — in 3 weeks. [Reference founder] went from founder-led chaos to structured outbound in
one month and closed their first €80K ARR from non-founder sales.

Worth 20 minutes?

[Founder name]
```

This email was not written by a template. It was written from D1 (ICP), D2 (pain: no playbook, board pressure), D3 (proof: reference CEO), and the founder's actual context.

---

## Full Journey Summary

```
IQ Score completed
        ↓
P1 = 19/100 → Talk to Patel
        ↓
Patel reads score + profile data before first message
        ↓
3 sharp questions → founder answers → ICP extracted
        ↓
D1 built: ICP Definition card  (+5 pts · P1 score → 24/100)
        ↓
Closing recommendation shown: "D2 is next. Here's why."
        ↓
New session: 2 questions on pains + context
        ↓
D2 built: Pains, Gains & Triggers Card  (+5 pts · P1 → 29/100)
        ↓
New session: 2 questions on buying process
        ↓
D3 built: Buyer Journey stage table  (+5 pts · P1 → 34/100)
        ↓
D4 generated from D1+D2+D3: Messaging System  (+6 pts · P1 → 40/100)
        ↓
Total: P1 went from 19 → ~40 across 4 focused sessions
Each session: 15–25 minutes, 2–3 questions, 1 deliverable
```

---

## Why This Adds Real Value

**Without Patel:** Founder Googles "how to define ICP," finds a template, fills it with aspirations, writes messaging to a hypothetical person, gets no replies.

**With Patel:** The ICP is built from their actual best conversation (Sandeep). The pains are Sandeep's actual words. The email hook leads with the trigger Sandeep would recognise. The proof expectation (peer intro + sample) shapes the entire outbound approach.

The difference is specificity. Patel forces the founder to anchor every output to real evidence — a real person, a real conversation, a real deal. When that's missing, Patel labels it as an assumption, not a fact.

---

## What Patel Cannot Do

- It cannot validate assumptions itself — it can only flag them
- It cannot replace talking to customers — it processes what you've already learned
- D2–D4 without real customer evidence will produce inferred outputs, clearly labelled
- The score boost happens on completion — quality of the document is not auto-validated

The founder still has to do the conversations. Patel turns those conversations into executive-grade documents that can be handed to a sales hire, used for outbound, or shown to an investor.
