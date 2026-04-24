// ─── artifact generation prompts ──────────────────────────────────────────────
// Each prompt produces a structured JSON deliverable from gathered conversation context.
// Called as a second-pass generation after Patel triggers a <tool_call>.

export function getArtifactPrompt(
  type: string,
  context: Record<string, unknown>,
  researchData?: Record<string, unknown> | null
): string {
  const ctx = JSON.stringify(context, null, 2);

  const prompts: Record<string, string> = {
    // ── D1: ICP Definition ─────────────────────────────────────────────────
    // Primary targeting interface — consumed by D2, D3, D4, Apollo, outbound agent
    icp_document: `You are generating a structured ICP (Ideal Customer Profile) — the targeting interface for this startup's GTM system.
This is D1 in the Patel delivery chain. It will be consumed by downstream deliverables (D2 Pains, D3 Journey, D4 Messaging) and execution agents (lead generation, outbound).

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "ICP: [descriptive title based on their product/market]",
  "summary": "2-3 sentence executive summary of who they should target and why",
  "confidence": 0.75,
  "evidence_type": "validated",
  "buyerPersona": {
    "title": "Primary buyer's job title",
    "role": "Their functional role and responsibilities",
    "seniority": "C-level / VP / Director / Manager / IC",
    "dayInLife": "What their typical workday looks like — 2-3 sentences",
    "goals": ["goal1", "goal2", "goal3"],
    "frustrations": ["frustration1", "frustration2", "frustration3"]
  },
  "firmographics": {
    "companySize": "e.g. 50-200 employees",
    "industry": ["industry1", "industry2"],
    "revenue": "e.g. $5M-$50M ARR",
    "geography": ["region1", "region2"],
    "techStack": ["tool1", "tool2"]
  },
  "painPoints": [
    { "pain": "description of the pain point", "severity": "high", "currentSolution": "how they solve it today", "evidence": "validated|inferred|assumed" }
  ],
  "buyingTriggers": ["trigger1", "trigger2", "trigger3"],
  "channels": [
    { "channel": "channel name", "priority": "primary", "rationale": "why this channel works for this ICP" }
  ],
  "qualificationCriteria": ["criterion1", "criterion2", "criterion3"],
  "execution_path": {
    "consumed_by": ["pains_gains_triggers", "buyer_journey", "positioning_messaging", "lead_list", "outbound-agent"],
    "enables": "Build targeted lead list from firmographics; ground D2 pain map in specific buyer context",
    "downstream_dependency": "D2 Pains & Gains cannot be built without this ICP definition",
    "next_step_for_founder": "Confirm the ICP is accurate — especially the firmographics and buyer title. Then Patel will map the pain triggers that drive purchase decisions."
  }
}

RULES:
- Be specific to THEIR product and market. No generic placeholders.
- confidence: 0.0–1.0 (reflect how strongly evidence supports the ICP — lower if based on assumptions)
- evidence_type: "validated" (founder confirmed with customers) / "inferred" (reasonable from data) / "assumed" (hypothesis only)
- Include 3-5 pain points, 3-5 buying triggers, 2-4 channels, 3-5 qualification criteria.
- Severity must be "high", "medium", or "low". Channel priority must be "primary" or "secondary".
- execution_path is MANDATORY. Never omit it.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── D2: Pains, Gains & Triggers ────────────────────────────────────────
    // Demand model — maps what drives purchase decisions for the ICP
    // Requires D1. Consumed by D3 (Buyer Journey) and D4 (Messaging).
    pains_gains_triggers: `You are generating a Pains, Gains & Triggers structured interface for an early-stage startup.
This is D2 in the Patel delivery chain. It requires a completed ICP (D1). It will be consumed by the Buyer Journey (D3) and Positioning/Messaging (D4) deliverables, and by the outbound agent for personalization.

Context gathered from the conversation (includes ICP from D1):
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Pains, Gains & Triggers: [ICP buyer title from D1]",
  "target_context": "One sentence describing the specific ICP this applies to (from D1)",
  "confidence": 0.70,
  "evidence_type": "validated",
  "core_pains": [
    {
      "pain": "Specific pain point — be concrete, not generic",
      "severity": 5,
      "current_workaround": "How they solve it today (even if badly)",
      "cost_of_pain": "What this costs them in time/money/risk",
      "evidence": "validated|inferred|assumed"
    }
  ],
  "desired_gains": [
    "What the buyer actually wants as an outcome (not your product features)"
  ],
  "trigger_events": [
    {
      "trigger": "The specific event that makes them actively look for a solution",
      "urgency": "high|medium|low",
      "example": "e.g. missed a quarterly target, hired a new VP Sales, raised a Series A"
    }
  ],
  "proof_expectations": [
    "What evidence they need to see before buying (case studies, ROI data, trial, etc.)"
  ],
  "common_objections": [
    {
      "objection": "The specific objection",
      "root_cause": "Why they have this objection",
      "handle": "How to address it"
    }
  ],
  "execution_path": {
    "consumed_by": ["buyer_journey", "positioning_messaging", "outbound-agent", "content-agent"],
    "enables": "Ground messaging in real pain triggers; identify the right moment to reach buyers; personalize outbound with specific pain context",
    "downstream_dependency": "D3 Buyer Journey uses trigger events to map the entry point. D4 Messaging uses core pains as the foundation of value proposition.",
    "next_step_for_founder": "Confirm the trigger events are accurate — these determine when to reach buyers and what to say first. Then Patel will map the full buyer journey from awareness to decision."
  }
}

RULES:
- core_pains: 3-5 pains, severity 1-5 (5 = business-critical), be specific not generic
- desired_gains: 3-4 outcomes the buyer wants (outcomes, not features)
- trigger_events: 3-4 real events that create urgency — be specific to their market
- proof_expectations: 2-3 types of evidence the buyer needs before committing
- common_objections: 2-4 objections with handles
- confidence: 0.0–1.0 based on how much real customer evidence backs this up
- evidence_type: "validated" / "inferred" / "assumed"
- execution_path is MANDATORY. Never omit it.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── D3: Buyer Journey ───────────────────────────────────────────────────
    // Conversion system — maps how buyers move from unaware to committed
    // Requires D1 + D2. Consumed by D4 (Messaging) and execution agents.
    buyer_journey: `You are generating a Buyer Journey structured interface for an early-stage startup.
This is D3 in the Patel delivery chain. It requires ICP (D1) and Pains/Triggers (D2). It defines the conversion system — how buyers move from unaware to committed — and will be consumed by D4 Positioning/Messaging and by sales and content execution agents.

Context gathered from the conversation (includes ICP from D1 and Pains from D2):
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Buyer Journey: [ICP buyer title] → [product/outcome]",
  "entry_condition": "What must be true for a buyer to enter the funnel (specific trigger from D2)",
  "confidence": 0.65,
  "evidence_type": "inferred",
  "stages": [
    {
      "name": "Unaware",
      "buyer_state": "What the buyer believes and feels at this stage",
      "buyer_action": "What they are doing (or not doing) at this stage",
      "gtm_touchpoint": "What we do to reach them and move them forward",
      "friction": "What stops them from moving to the next stage",
      "trust_signal": "What would reduce friction and build trust here"
    },
    {
      "name": "Problem Aware",
      "buyer_state": "...",
      "buyer_action": "...",
      "gtm_touchpoint": "...",
      "friction": "...",
      "trust_signal": "..."
    },
    {
      "name": "Solution Aware",
      "buyer_state": "...",
      "buyer_action": "...",
      "gtm_touchpoint": "...",
      "friction": "...",
      "trust_signal": "..."
    },
    {
      "name": "Evaluation",
      "buyer_state": "...",
      "buyer_action": "...",
      "gtm_touchpoint": "...",
      "friction": "...",
      "trust_signal": "..."
    },
    {
      "name": "Decision",
      "buyer_state": "...",
      "buyer_action": "...",
      "gtm_touchpoint": "...",
      "friction": "...",
      "trust_signal": "..."
    }
  ],
  "buyer_roles": [
    { "role": "Champion", "description": "Who advocates internally for the purchase" },
    { "role": "Decision Maker", "description": "Who has final budget authority" },
    { "role": "Blocker", "description": "Who might kill the deal" }
  ],
  "decision_criteria": [
    "What criteria they use to choose — ordered by importance"
  ],
  "pilot_path": "How a typical pilot/POC is structured — timeline, success criteria, stakeholders",
  "drop_off_risks": [
    { "stage": "Evaluation", "risk": "What causes deals to stall or die here", "mitigation": "How to prevent it" }
  ],
  "execution_path": {
    "consumed_by": ["positioning_messaging", "outbound-agent", "content-agent", "sales-agent"],
    "enables": "Build channel strategy aligned to where buyers are at each stage; create content for each stage; train outbound agent on timing and messaging by stage",
    "downstream_dependency": "D4 Positioning & Messaging uses stage-specific GTM touchpoints to define what to say at each point in the journey",
    "next_step_for_founder": "Confirm which stage your current pipeline is stuck at — that's where messaging needs to be sharpest. Then Patel will build the full positioning system."
  }
}

RULES:
- 5 stages: Unaware → Problem Aware → Solution Aware → Evaluation → Decision (adjust names to fit their context)
- buyer_roles: at minimum Champion and Decision Maker; add Blocker if relevant
- decision_criteria: 3-5 criteria in priority order
- drop_off_risks: 2-3 highest-risk stages with specific mitigations
- confidence: 0.0–1.0; evidence_type: "validated" / "inferred" / "assumed"
- execution_path is MANDATORY. Never omit it.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── D4: Positioning & Messaging ─────────────────────────────────────────
    // Communication engine — the complete message architecture
    // Requires D1 + D2 + D3. Consumed by all execution agents.
    positioning_messaging: `You are generating a Positioning & Messaging structured interface for an early-stage startup.
This is D4 — the final deliverable in the Patel chain. It requires ICP (D1), Pains/Triggers (D2), and Buyer Journey (D3). This is the communication engine: every message, script, and channel touchpoint the startup uses flows from this output. It will be consumed by outbound, content, sales, and marketing agents.

Context gathered from the conversation (includes D1 ICP, D2 Pains, D3 Journey):
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Positioning & Messaging: [startup name / product name]",
  "confidence": 0.72,
  "evidence_type": "inferred",
  "foundation": {
    "positioning_statement": "For [ICP], who [problem], [product name] is the [category] that [key benefit], unlike [alternative] which [weakness of alternative].",
    "value_proposition": "One sentence — the specific, measurable outcome we deliver for the ICP",
    "elevator_pitch": "2-3 sentences — what we do, who for, and why it matters right now"
  },
  "message_pillars": [
    {
      "pillar": "Pillar name (3-5 words)",
      "claim": "The specific claim we make",
      "proof": "Specific evidence or example that supports this claim",
      "objection_handle": "The objection this pillar preemptively addresses"
    }
  ],
  "icp_variants": {
    "hero_headline": "Website H1 — 8-12 words, outcome-focused",
    "sub_headline": "Website subheadline — 15-25 words, specific and credible",
    "outbound_hook": "First sentence of cold email/LinkedIn — creates curiosity or surfaces pain",
    "voicemail_script": "15-second voicemail if leaving a message",
    "cta": "Primary call to action — specific action, not 'Learn More'"
  },
  "channel_messages": [
    {
      "channel": "Cold email",
      "tone": "conversational",
      "opening": "Subject line + first line",
      "body_structure": "Pain → Trigger → Result → CTA in 4-5 sentences",
      "example": "Full example message"
    },
    {
      "channel": "LinkedIn outreach",
      "tone": "professional-casual",
      "opening": "Connection request note (< 300 chars)",
      "body_structure": "...",
      "example": "Full example message"
    }
  ],
  "forbidden_claims": [
    "Claims that are generic, unverifiable, or that every competitor also makes"
  ],
  "competitive_differentiation": "One paragraph on what makes this positioning defensible and hard to copy",
  "execution_path": {
    "consumed_by": ["outbound-agent", "content-agent", "sales-agent", "website-copy", "campaign-agent"],
    "enables": "All GTM execution — every channel, message, and touchpoint flows from this positioning. Outbound agent uses channel_messages directly. Content agent uses message_pillars for topic selection and tone.",
    "downstream_dependency": "No further Patel deliverables required. Next phase: execution and iteration based on market response.",
    "next_step_for_founder": "Test the outbound hook in 20 cold contacts this week. Report back on reply rate. Patel will refine based on what resonates vs. what falls flat."
  }
}

RULES:
- foundation: all three fields are mandatory — positioning_statement follows the classic format exactly
- message_pillars: 3-4 pillars, each with claim + proof + objection_handle
- icp_variants: all 5 fields mandatory — be specific, not generic
- channel_messages: minimum cold email + LinkedIn; add others if relevant
- forbidden_claims: list 3-5 phrases the startup must never use because they are generic
- competitive_differentiation: 1 paragraph, specific and honest about what makes this defensible
- execution_path is MANDATORY. Never omit it.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Outreach Sequence ───────────────────────────────────────────────────
    outreach_sequence: `You are generating a multi-channel cold outreach sequence for a startup founder.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Outreach Sequence: [target persona description]",
  "targetICP": "Brief description of who this sequence targets",
  "sequence": [
    {
      "step": 1,
      "channel": "email",
      "timing": "Day 0",
      "subject": "Subject line for the email",
      "body": "Full message body. Use {{firstName}}, {{company}}, {{painPoint}} as personalization tokens where appropriate.",
      "goal": "What this touchpoint aims to achieve",
      "tips": ["one tactical tip for maximizing this step's effectiveness"]
    },
    {
      "step": 2,
      "channel": "linkedin",
      "timing": "Day 2",
      "subject": null,
      "body": "LinkedIn connection request or message text",
      "goal": "Build familiarity before next email",
      "tips": ["tip for LinkedIn outreach"]
    }
  ]
}

RULES:
- Create 5-7 steps mixing email and LinkedIn (maybe one call step).
- Space realistically: Day 0, 2, 5, 8, 12, 17, 21.
- Make copy sharp, personal, and non-salesy. Sound human, not automated.
- Each email needs a compelling subject line. LinkedIn messages don't need subjects (set to null).
- Channel must be "email", "linkedin", or "call".
- 1-2 tips per step.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Battle Card ─────────────────────────────────────────────────────────
    battle_card: `You are generating a competitive battle card for a startup positioning against a specific competitor.

Context gathered from the conversation:
${ctx}

${researchData ? `Web research data on the competitor:\n${JSON.stringify(researchData, null, 2)}` : "No web research data available — use what you know about the competitor."}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Battle Card: [Our Product] vs [Competitor Name]",
  "competitor": "Competitor name",
  "overview": "2-3 sentence summary of who the competitor is, what they do, and their position in the market",
  "positioningMatrix": [
    { "dimension": "Pricing", "us": "Our approach to pricing", "them": "Their pricing approach", "verdict": "advantage" },
    { "dimension": "Ease of Use", "us": "Our UX approach", "them": "Their UX approach", "verdict": "parity" },
    { "dimension": "Feature X", "us": "What we offer", "them": "What they offer", "verdict": "disadvantage" }
  ],
  "objectionHandling": [
    {
      "objection": "What a prospect might say: 'But [Competitor] has more features...'",
      "response": "How to respond to this objection effectively",
      "proofPoint": "Evidence or data point that backs up the response"
    }
  ],
  "strengths": ["Their genuine strength 1", "Their genuine strength 2", "Their genuine strength 3"],
  "weaknesses": ["Their weakness 1", "Their weakness 2", "Their weakness 3"],
  "winStrategy": "2-3 sentence overall strategy for winning deals against this competitor",
  "sources": [{"title": "Source title", "url": "https://example.com"}]
}

RULES:
- Include 5-8 positioning dimensions.
- Verdict must be "advantage", "parity", or "disadvantage".
- Include 4-6 objections with realistic prospect language.
- Be honest about both strengths and weaknesses — credible battle cards acknowledge competitor strengths.
- Include 3-5 strengths and 3-5 weaknesses.
- If research data is available, use it for factual claims and populate sources. If not, note "Based on public information" in sources.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── GTM Playbook ────────────────────────────────────────────────────────
    gtm_playbook: `You are generating a comprehensive Go-to-Market playbook for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "GTM Playbook: [Company/Product Name]",
  "companyContext": "2-3 sentence description of the company, product, stage, and market",
  "icp": {
    "summary": "One-paragraph ICP summary",
    "segments": ["Primary segment", "Secondary segment", "Tertiary segment"]
  },
  "positioning": {
    "statement": "For [target customer] who [need], [product] is a [category] that [key benefit]. Unlike [competitor], we [differentiator].",
    "differentiators": ["differentiator1", "differentiator2", "differentiator3"]
  },
  "channels": [
    { "channel": "Channel name", "priority": "primary", "budget": "$X/mo or N/A", "expectedCAC": "$X" },
    { "channel": "Another channel", "priority": "secondary", "budget": "$X/mo", "expectedCAC": "$X" }
  ],
  "messaging": [
    {
      "audience": "Segment name",
      "headline": "Core message for this audience",
      "valueProps": ["value prop 1", "value prop 2", "value prop 3"]
    }
  ],
  "metrics": [
    { "metric": "MQLs / month", "target": "200", "currentBaseline": "50" },
    { "metric": "CAC", "target": "$80", "currentBaseline": "$120" }
  ],
  "ninetyDayPlan": [
    {
      "phase": "Phase 1: Foundation",
      "weeks": "Weeks 1-4",
      "objectives": ["objective1", "objective2"],
      "keyActions": ["action1", "action2", "action3"],
      "successCriteria": "How to know this phase succeeded"
    },
    {
      "phase": "Phase 2: Traction",
      "weeks": "Weeks 5-8",
      "objectives": ["objective1", "objective2"],
      "keyActions": ["action1", "action2", "action3"],
      "successCriteria": "How to know this phase succeeded"
    },
    {
      "phase": "Phase 3: Scale",
      "weeks": "Weeks 9-12",
      "objectives": ["objective1", "objective2"],
      "keyActions": ["action1", "action2", "action3"],
      "successCriteria": "How to know this phase succeeded"
    }
  ]
}

RULES:
- Exactly 3 phases in the 90-day plan.
- Be concrete about budgets, CAC targets, and timelines — avoid vague language.
- Channel priority must be "primary", "secondary", or "experimental".
- Include 3-5 channels, 1-3 messaging segments, 5-8 metrics.
- Tailor everything to their specific product, market, and stage. No generic advice.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Sales Script (Susi) ──────────────────────────────────────────────────
    sales_script: `You are generating a structured sales script for an early-stage startup founder.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Sales Script: [product/market description]",
  "targetPersona": "Brief description of who this script is for",
  "discoveryQuestions": [
    { "question": "Open-ended discovery question", "purpose": "What this uncovers", "probe": "Follow-up if they give a vague answer" }
  ],
  "pitchFramework": {
    "opener": "How to open the call — build rapport, confirm agenda",
    "problemStatement": "How to articulate the problem they likely have",
    "solutionBridge": "Transition from problem to solution",
    "valueProposition": "Core value prop in 2 sentences max",
    "socialProof": "Quick proof point — customer, metric, or story",
    "cta": "Specific call to action — what you're asking them to do next"
  },
  "objections": [
    { "objection": "Exact words a prospect might say", "response": "Your response", "pivot": "How to turn this into forward motion" }
  ],
  "closingLines": ["Direct closing line", "Alternative closing line", "Soft close option"],
  "nextSteps": ["What to do immediately after the call", "What to send within 24 hours", "When and how to follow up if no reply"]
}

RULES:
- Include 5-7 discovery questions tailored to their specific market.
- Include 5-7 realistic objections with specific responses — not generic ones.
- Closing lines should be direct but non-pushy.
- Everything must be specific to THEIR product and market — no generic placeholders.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Brand Messaging Framework (Maya) ─────────────────────────────────────
    brand_messaging: `You are generating a brand messaging framework for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Brand Messaging: [company/product name]",
  "positioningStatement": "For [target customer] who [unmet need], [product name] is a [category] that [key benefit]. Unlike [main alternative], we [primary differentiator].",
  "taglines": [
    { "tagline": "Short punchy tagline", "reasoning": "Why this works and when to use it" },
    { "tagline": "Second option", "reasoning": "Reasoning" },
    { "tagline": "Third option", "reasoning": "Reasoning" },
    { "tagline": "Fourth option", "reasoning": "Reasoning" },
    { "tagline": "Fifth option", "reasoning": "Reasoning" }
  ],
  "elevatorPitch": {
    "oneLiner": "One sentence — what you do for whom",
    "thirtySecond": "2-3 sentences, conversational — for when someone asks what you do",
    "twoMinute": "4-6 sentences — problem, solution, traction, ask"
  },
  "valueProps": [
    { "headline": "Short value prop headline", "description": "1-2 sentence expansion", "proof": "Specific proof point or example" }
  ],
  "voiceGuide": {
    "personality": ["Personality trait 1", "Personality trait 2", "Personality trait 3"],
    "doSay": ["Phrase or style we actively use", "Another example"],
    "dontSay": ["What we avoid saying", "Another thing to avoid"],
    "examplePhrases": ["Example of our voice in action", "Another example"]
  },
  "investorNarrative": "2-3 sentence story arc for investor conversations — problem, why now, why us"
}

RULES:
- Positioning statement must follow the exact For/who/is a/that/Unlike/we template.
- Exactly 5 tagline options, genuinely different in tone and angle.
- Value props: 3-5 props with real proof points, not vague claims.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Financial Summary (Felix) ────────────────────────────────────────────
    financial_summary: `You are generating an investor-ready financial summary for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Financial Summary: [company name]",
  "snapshot": {
    "mrr": "Value or 'Pre-revenue'",
    "arr": "Value or 'Pre-revenue'",
    "monthlyBurn": "Value",
    "runway": "X months",
    "grossMargin": "X%",
    "cac": "Value or 'Untracked'",
    "ltv": "Value or 'Untracked'",
    "ltvCacRatio": "X:1 or 'N/A'"
  },
  "unitEconomicsVerdict": "healthy",
  "keyInsights": ["Strongest financial signal", "Risk or gap to address", "What the numbers imply about the model"],
  "fundraisingRecommendation": {
    "amount": "$X",
    "rationale": "Why this amount based on burn and milestones",
    "timeline": "When to raise and target runway"
  },
  "useOfFunds": [
    { "category": "Engineering / Product", "percentage": 40, "rationale": "What this buys" },
    { "category": "Sales & Marketing", "percentage": 30, "rationale": "What this buys" },
    { "category": "Operations", "percentage": 20, "rationale": "What this buys" },
    { "category": "Buffer / G&A", "percentage": 10, "rationale": "Why" }
  ],
  "risks": [
    { "risk": "Financial risk description", "severity": "high", "mitigation": "What to do about it" }
  ]
}

RULES:
- unitEconomicsVerdict must be "healthy", "needs-work", or "critical".
- Use actual numbers from context; use "Not provided" where unavailable.
- useOfFunds percentages must add up to 100.
- 3-5 keyInsights, 2-4 risks. severity must be "high", "medium", or "low".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Legal Checklist (Leo) ────────────────────────────────────────────────
    legal_checklist: `You are generating a legal checklist for an early-stage startup founder.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Legal Checklist: [company name]",
  "companyStage": "pre-launch",
  "priorityActions": ["Most urgent action 1", "Most urgent action 2", "Most urgent action 3"],
  "incorporationItems": [
    { "item": "Incorporate as Delaware C-Corp", "status": "required", "description": "Why this matters and how", "urgency": "now" },
    { "item": "83(b) election", "status": "required", "description": "Must file within 30 days of stock grant", "urgency": "now" }
  ],
  "ipItems": [
    { "item": "IP assignment agreements", "status": "required", "description": "All founders assign IP to the company" },
    { "item": "Trademark search + filing", "status": "recommended", "description": "Protect the brand name" }
  ],
  "fundraisingDocs": [
    { "document": "SAFE (YC Standard)", "description": "Preferred for pre-seed", "recommendation": "Use with MFN clause if raising under $500K" }
  ],
  "contractTemplates": ["Customer MSA template", "NDA template", "Contractor agreement"],
  "redFlags": ["Specific red flag based on their situation"]
}

RULES:
- companyStage must be one of: "pre-launch", "incorporated", "fundraising", "scaling".
- status values: "required", "recommended", or "optional". urgency: "now", "soon", or "later".
- 5-8 incorporation items, 3-5 IP items, 2-3 fundraising docs.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Hiring Plan (Harper) ─────────────────────────────────────────────────
    hiring_plan: `You are generating a hiring plan for an early-stage startup founder.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Hiring Plan: [company name]",
  "currentGaps": ["Skill or function currently missing", "Another gap"],
  "nextHires": [
    {
      "role": "Full role title",
      "priority": "critical",
      "timing": "e.g. Next 30 days",
      "whyNow": "Specific reason this hire unlocks growth",
      "responsibilities": ["Core responsibility 1", "Core responsibility 2"],
      "requirements": ["Must-have 1", "Must-have 2"],
      "niceToHave": ["Bonus skill or experience"],
      "salaryRange": "$X - $Y",
      "equity": "0.X - 0.X%"
    }
  ],
  "orgRoadmap": [
    { "milestone": "Today", "teamSize": 2, "newRoles": ["Founder 1", "Founder 2"] },
    { "milestone": "$500K ARR", "teamSize": 5, "newRoles": ["Engineer", "Sales"] },
    { "milestone": "$2M ARR", "teamSize": 12, "newRoles": ["Head of Sales", "2x Engineers"] }
  ],
  "compensationBands": [
    { "role": "Early Engineer", "salary": "$120K-$160K", "equity": "0.5-1.5%", "stage": "Pre-seed" },
    { "role": "Head of Sales", "salary": "$150K-$180K + commission", "equity": "0.5-1.0%", "stage": "Seed" }
  ],
  "interviewProcess": ["30-min intro call", "Take-home challenge or work sample", "Panel interview", "Reference checks"],
  "cultureValues": ["Value to hire for", "Another culture value", "A third value"]
}

RULES:
- priority must be "critical", "high", or "nice-to-have".
- 2-4 next hires in priority order.
- Org roadmap: 3-4 milestones from today to Series A.
- Tailor to their stage, industry, and specific team gaps.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── PMF Research Kit (Nova) ──────────────────────────────────────────────
    pmf_survey: `You are generating a PMF (Product-Market Fit) research kit for an early-stage startup founder.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "PMF Research Kit: [product name]",
  "targetSegment": "Who to interview — specific description",
  "interviewScript": [
    { "phase": "Opening (5 min)", "duration": "5 min", "questions": ["Question to build rapport", "Question about their background and role"] },
    { "phase": "Problem Discovery (15 min)", "duration": "15 min", "questions": ["Tell me about the last time you dealt with [problem]...", "How do you currently handle this? Walk me through it."] },
    { "phase": "Current Solutions (10 min)", "duration": "10 min", "questions": ["What tools or processes do you use today?", "What's missing or frustrating about those?"] },
    { "phase": "Product Fit (10 min)", "duration": "10 min", "questions": ["[Describe product] — does this resonate with the problem you described?", "What would need to be true for you to switch to this?"] },
    { "phase": "Willingness to Pay (5 min)", "duration": "5 min", "questions": ["If this solved your problem completely, what would it be worth per month?", "What would make you commit to this today?"] }
  ],
  "ellisTest": {
    "primaryQuestion": "How would you feel if you could no longer use [product]?",
    "options": ["Very disappointed", "Somewhat disappointed", "Not disappointed"],
    "benchmark": "40%+ 'Very disappointed' = strong PMF signal",
    "followUps": ["What is the main benefit you get from [product]?", "Who do you think would benefit most?", "How can we improve [product] for you?"]
  },
  "experiments": [
    { "hypothesis": "If we [action], [segment] will [measurable behavior]", "test": "How to run the experiment", "metric": "What to measure", "successCriteria": "What result proves it", "timeframe": "e.g. 2 weeks" }
  ],
  "segmentAnalysis": [
    { "segment": "Customer segment description", "painLevel": "high", "willingness": "High — actively seeking solutions", "priority": 1 },
    { "segment": "Secondary segment", "painLevel": "medium", "willingness": "Medium — would consider switching", "priority": 2 }
  ]
}

RULES:
- Interview script: exactly 5 phases with 2-4 open-ended questions each.
- Experiments: 3-5, specific to their PMF gaps.
- segmentAnalysis: 2-4 segments; painLevel must be "high", "medium", or "low".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Competitive Matrix (Atlas) ───────────────────────────────────────────
    competitive_matrix: `You are generating a competitive analysis for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Competitive Analysis: [product name]",
  "ourProduct": "Brief description of our product and positioning",
  "marketOverview": "2-3 sentence competitive landscape overview",
  "competitors": [
    {
      "name": "Competitor name",
      "positioning": "How they position themselves",
      "pricing": "Their pricing model and range",
      "targetCustomer": "Who they primarily serve",
      "strengths": ["Genuine strength 1", "Genuine strength 2"],
      "weaknesses": ["Real weakness we can exploit", "Another weakness"]
    }
  ],
  "featureComparison": {
    "features": ["Feature A", "Feature B", "Feature C", "Feature D", "Feature E"],
    "rows": [
      { "name": "Us", "scores": { "Feature A": "yes", "Feature B": "partial", "Feature C": "no", "Feature D": "yes", "Feature E": "yes" } },
      { "name": "Competitor 1", "scores": { "Feature A": "yes", "Feature B": "yes", "Feature C": "yes", "Feature D": "partial", "Feature E": "no" } }
    ]
  },
  "swot": {
    "strengths": ["Our genuine strength vs the market", "Another strength"],
    "weaknesses": ["Our honest weakness", "Another to address"],
    "opportunities": ["Market opportunity we can capture", "Another opportunity"],
    "threats": ["Competitive threat", "Another threat"]
  },
  "positioningStatement": "Our clear differentiator and why we win in our specific wedge",
  "whiteSpace": ["Gap the market isn't addressing well", "Another untapped opportunity"]
}

RULES:
- Include 3-5 real competitors (not invented).
- featureComparison: exactly 5 features; rows include "Us" + each competitor.
- Feature scores must be "yes", "no", or "partial".
- SWOT: 2-4 points per quadrant; be honest about weaknesses.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Strategic Plan (Sage) ────────────────────────────────────────────────
    strategic_plan: `You are generating a 1-page strategic plan for an early-stage startup founder.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Strategic Plan: [company name]",
  "vision": "Where this company is in 3-5 years — specific and ambitious",
  "currentPosition": "Honest 1-2 sentence snapshot of where the company is today",
  "coreBets": ["The primary strategic bet the company is making", "Second key bet", "Third bet if applicable"],
  "okrs": [
    {
      "objective": "Qualitative objective for this quarter",
      "keyResults": [
        { "kr": "Specific measurable result", "target": "Specific number or milestone", "metric": "How to measure" },
        { "kr": "Second key result", "target": "Target", "metric": "Metric" },
        { "kr": "Third key result", "target": "Target", "metric": "Metric" }
      ]
    },
    {
      "objective": "Second objective",
      "keyResults": [
        { "kr": "Key result", "target": "Target", "metric": "Metric" },
        { "kr": "Second key result", "target": "Target", "metric": "Metric" }
      ]
    }
  ],
  "roadmap": {
    "now": [{ "initiative": "What to build or do right now", "rationale": "Why this is the priority" }],
    "next": [{ "initiative": "Next quarter initiative", "rationale": "Why this follows" }],
    "later": [{ "initiative": "Longer-term initiative", "rationale": "Why this is later" }]
  },
  "risks": [
    { "risk": "Specific risk description", "probability": "high", "impact": "high", "mitigation": "How to reduce it" }
  ],
  "fundraisingMilestones": ["Milestone that justifies seed round", "Milestone for Series A"]
}

RULES:
- Exactly 2-3 OKR objectives, each with 2-4 measurable key results.
- Roadmap: 2-4 initiatives in now/next/later.
- Risks: 3-5; probability/impact must be "high", "medium", or "low".
- Core bets: 2-3 specific strategic choices, not platitudes.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Pipeline Report (Susi) ───────────────────────────────────────────────
    pipeline_report: `You are generating a sales pipeline health report for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Pipeline Report: [date range or current date]",
  "summary": "1-2 sentence executive summary of pipeline health",
  "metrics": {
    "totalDeals": 0,
    "totalValue": "$0",
    "weightedValue": "$0",
    "averageDealSize": "$0",
    "averageSalesCycle": "X days",
    "closeRate": "X%",
    "monthlyTarget": "$0",
    "forecastVsTarget": "on track | at risk | behind"
  },
  "stageBreakdown": [
    { "stage": "lead", "count": 0, "value": "$0", "avgDaysInStage": 0 },
    { "stage": "qualified", "count": 0, "value": "$0", "avgDaysInStage": 0 },
    { "stage": "proposal", "count": 0, "value": "$0", "avgDaysInStage": 0 },
    { "stage": "negotiating", "count": 0, "value": "$0", "avgDaysInStage": 0 }
  ],
  "staleDeals": [
    { "company": "Company name", "stage": "current stage", "daysStale": 0, "recommendedAction": "What to do" }
  ],
  "topOpportunities": [
    { "company": "Company name", "value": "$0", "stage": "stage", "nextAction": "What to do next", "closeDate": "estimated date" }
  ],
  "recommendations": ["Specific action item 1", "Specific action item 2", "Specific action item 3"]
}

RULES:
- Stale deals: 7+ days with no activity in non-terminal stages.
- All dollar values must be formatted as "$X,XXX".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Call Playbook (Susi) ─────────────────────────────────────────────────
    call_playbook: `You are generating a pre-call playbook for a specific sales conversation.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Call Playbook: [contact name] at [company]",
  "contact": {
    "name": "Contact full name",
    "title": "Job title",
    "company": "Company name",
    "linkedinUrl": "URL or null"
  },
  "dealContext": {
    "stage": "Current pipeline stage",
    "value": "Estimated deal value",
    "lastInteraction": "What happened last / when"
  },
  "companyResearch": ["Key fact about the company 1", "Key fact 2", "Recent news or trigger"],
  "callObjective": "Specific outcome you want from this call (e.g., 'Get verbal commitment to pilot at $2K/mo')",
  "opener": "Recommended opening line — specific and conversational, not generic",
  "discoveryQuestions": [
    "Question 1 — what you most need to learn on this call",
    "Question 2",
    "Question 3"
  ],
  "expectedObjections": [
    { "objection": "Most likely pushback", "response": "How to handle it specifically" },
    { "objection": "Second likely objection", "response": "Handling approach" }
  ],
  "talkTrack": "2-3 sentence pitch for this specific call context — not generic",
  "closingAsk": "The specific ask at the end of the call",
  "nextSteps": ["What you'll send after the call", "When you'll follow up"]
}

RULES:
- Specific to this deal and contact — no generic sales advice.
- Objection responses must be concrete, not "acknowledge and redirect".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Proposal (Susi) ──────────────────────────────────────────────────────
    proposal: `You are generating a sales proposal for a specific prospect.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Proposal: [solution] for [company]",
  "prospectName": "Company name",
  "contactName": "Primary contact",
  "date": "Proposal date",
  "executiveSummary": "2-3 sentence summary of what you're proposing and why",
  "problemStatement": "Specific problem this prospect has, in their language",
  "proposedSolution": "How your product solves it — specific to their use case",
  "deliverables": ["Specific deliverable 1", "Specific deliverable 2", "Specific deliverable 3"],
  "pricingTiers": [
    { "name": "Tier name", "price": "$X/mo", "description": "What's included", "recommended": true },
    { "name": "Second tier", "price": "$X/mo", "description": "What's included", "recommended": false }
  ],
  "roi": {
    "timeToValue": "How long until they see results",
    "expectedOutcome": "Specific measurable outcome for them",
    "roiEstimate": "ROI framing — e.g. 3x in 6 months based on [assumption]"
  },
  "socialProof": ["Relevant customer result or case study", "Second proof point"],
  "nextSteps": [
    { "step": 1, "action": "What happens next", "owner": "Who does it", "timing": "When" },
    { "step": 2, "action": "Second step", "owner": "Owner", "timing": "Timing" }
  ],
  "validUntil": "Proposal valid until date"
}

RULES:
- All pricing and ROI must be based on context provided — no made-up numbers.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Win/Loss Analysis (Susi) ─────────────────────────────────────────────
    win_loss_analysis: `You are generating a win/loss analysis from sales deal patterns.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Win/Loss Analysis: [date range]",
  "summary": "1-2 sentence headline finding",
  "winRate": "X%",
  "dealsAnalyzed": { "won": 0, "lost": 0, "total": 0 },
  "winPatterns": [
    { "pattern": "What winning deals have in common", "frequency": "X of X won deals", "implication": "What to replicate" }
  ],
  "lossPatterns": [
    { "pattern": "What losing deals have in common", "frequency": "X of X lost deals", "implication": "What to fix" }
  ],
  "competitorAnalysis": [
    { "competitor": "Who you lose to most", "lossCount": 0, "mainReason": "Why you lose", "response": "How to win next time" }
  ],
  "commonObjections": [
    { "objection": "Most frequent objection", "frequency": "X times", "currentHandling": "How reps respond now", "betterResponse": "Improved response" }
  ],
  "dealSizeInsight": "Pattern between deal size and win rate",
  "stageLossAnalysis": [
    { "stage": "Where deals die most", "lossRate": "X%", "reason": "Why they die here", "fix": "What to change" }
  ],
  "recommendations": ["Specific change to improve win rate 1", "Change 2", "Change 3"]
}

RULES:
- Be specific — draw from actual deal data in context.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Retention Report (Nova) ──────────────────────────────────────────────
    retention_report: `You are generating a product retention analysis for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Retention Report: [date range]",
  "summary": "1-2 sentence headline finding about retention health",
  "retentionCurve": {
    "day1": 0,
    "day7": 0,
    "day14": 0,
    "day30": 0,
    "day90": 0
  },
  "benchmarks": {
    "industry": "Sector name",
    "day7Benchmark": 0,
    "day30Benchmark": 0,
    "vsIndustry": "above | at | below"
  },
  "cohortAnalysis": [
    { "cohort": "Month/cohort label", "size": 0, "day30Retention": 0, "trend": "improving | stable | declining" }
  ],
  "churnReasons": [
    { "reason": "Why users churn", "frequency": "X% of churned users", "fixable": true }
  ],
  "highRetentionSegment": {
    "description": "Who retains best",
    "commonTraits": ["Trait 1", "Trait 2"],
    "retentionRate": 0
  },
  "activationMetric": "The specific action that predicts long-term retention",
  "retentionHealthScore": "green | yellow | red",
  "recommendations": [
    { "action": "Specific intervention", "expectedImpact": "What it changes", "effort": "low | medium | high" }
  ]
}

RULES:
- All retention rates as percentages (0-100).
- If specific data is not in context, use realistic estimates based on stage and industry.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Customer Health Report (Carter) ──────────────────────────────────────
    customer_health_report: `You are generating a customer health report for a startup's account base.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Customer Health Report: [date]",
  "summary": "1-2 sentence overall health assessment",
  "overallHealthScore": "green | yellow | red",
  "metrics": {
    "totalAccounts": 0,
    "greenAccounts": 0,
    "yellowAccounts": 0,
    "redAccounts": 0,
    "averageNps": 0,
    "currentChurnRate": "X%",
    "nrr": "X%"
  },
  "atRiskAccounts": [
    {
      "company": "Account name",
      "healthScore": "yellow | red",
      "riskSignals": ["Login frequency dropped", "Support ticket spike", "Upcoming renewal"],
      "urgency": "high | medium",
      "recommendedIntervention": "Specific action to take this week",
      "owner": "CS | Susi | Founder"
    }
  ],
  "expansionOpportunities": [
    {
      "company": "Account name",
      "signal": "Why they're ripe for expansion",
      "recommendedUpgrade": "Specific tier or add-on",
      "talkTrack": "1 sentence pitch for Susi"
    }
  ],
  "npsThemes": {
    "promoters": ["What promoters love — theme 1", "Theme 2"],
    "detractors": ["What detractors dislike — theme 1", "Theme 2"]
  },
  "weeklyActions": ["Specific action 1 to take this week", "Action 2", "Action 3"]
}

RULES:
- At-risk accounts must have specific, observable signals — not "low engagement".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Churn Analysis (Carter) ──────────────────────────────────────────────
    churn_analysis: `You are generating a churn analysis for a startup's customer base.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Churn Analysis: [date range]",
  "summary": "1-2 sentence headline finding",
  "churnRate": {
    "current": "X%",
    "lastMonth": "X%",
    "trend": "improving | stable | worsening",
    "benchmark": "X% for this stage/sector"
  },
  "churnBySegment": [
    { "segment": "Segment name (e.g. SMB, Enterprise, Freemium)", "churnRate": "X%", "accountsLost": 0, "revenueImpact": "$0" }
  ],
  "churnTiming": {
    "day30": "X% of churn happens before Day 30",
    "day90": "X% by Day 90",
    "year1": "X% within Year 1",
    "insight": "When customers are most at risk and why"
  },
  "topChurnReasons": [
    { "reason": "Specific churn reason", "frequency": "X% of churned accounts", "isFixable": true, "fix": "What to change" }
  ],
  "reactivationOpportunities": [
    { "company": "Churned account", "churnReason": "Why they left", "reactivationAngle": "Why they might come back", "outreachTiming": "When to reach out" }
  ],
  "preventionPlaybook": [
    { "trigger": "Warning signal", "intervention": "What to do when you see this", "timing": "How quickly to act" }
  ],
  "recommendations": ["High-impact action 1", "Action 2", "Action 3"]
}

RULES:
- Churn reasons must be specific, not "product issues" — name the actual problems.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── QBR Deck (Carter) ────────────────────────────────────────────────────
    qbr_deck: `You are generating a Quarterly Business Review deck for a key customer account.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "QBR: [company] — Q[X] [Year]",
  "account": {
    "company": "Account name",
    "contact": "Primary stakeholder name",
    "tier": "Enterprise | Mid-Market | SMB",
    "renewalDate": "Date",
    "arr": "$0"
  },
  "quarterSummary": "2-3 sentence narrative of what happened this quarter",
  "goalsVsOutcomes": [
    { "goal": "Goal set at start of quarter", "outcome": "What actually happened", "status": "achieved | partial | missed" }
  ],
  "usageHighlights": {
    "activeUsers": 0,
    "topFeatures": ["Most used feature 1", "Feature 2"],
    "engagementTrend": "increasing | stable | declining",
    "keyMoments": ["Notable usage milestone or success moment"]
  },
  "roiDelivered": {
    "metric": "How ROI is measured for this account",
    "baseline": "Where they started",
    "current": "Where they are now",
    "roiStatement": "Specific ROI claim — e.g. 40% reduction in time spent on X"
  },
  "nextQuarterPlan": {
    "goals": ["Goal 1 for next quarter", "Goal 2"],
    "milestones": ["30-day milestone", "60-day milestone", "90-day milestone"],
    "successMetric": "How we'll know next quarter was a success"
  },
  "expansionOpportunity": {
    "signal": "Why they're ready for expansion",
    "recommendation": "What to propose",
    "timing": "When to have the expansion conversation"
  },
  "risksAndMitigations": [
    { "risk": "Any risk to renewal or success", "mitigation": "How to address it" }
  ]
}

RULES:
- ROI must be quantified — not "significant improvement".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Expansion Playbook (Carter) ──────────────────────────────────────────
    expansion_playbook: `You are generating an expansion playbook for a specific customer account.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Expansion Playbook: [company]",
  "account": {
    "company": "Account name",
    "currentPlan": "Current tier or plan",
    "currentArr": "$0",
    "expansionTarget": "$0 ARR"
  },
  "expansionSignals": [
    "Specific observed signal that indicates expansion readiness (e.g. 'All 5 seats at 95% capacity')"
  ],
  "recommendedExpansion": {
    "type": "seat expansion | tier upgrade | add-on | new use case",
    "recommendation": "Specific upgrade to propose",
    "price": "$X/mo additional",
    "justification": "Why this makes sense for them right now"
  },
  "talkTrack": {
    "opener": "How to start the expansion conversation — specific, not 'I noticed you're getting value'",
    "valueFrame": "How to frame the upgrade in their language",
    "objectionHandler": "Most likely pushback and how to respond"
  },
  "timing": {
    "idealMoment": "When to have this conversation — e.g. 'After their Day 45 onboarding call'",
    "urgencyDriver": "Why now is the right time"
  },
  "successCriteria": "How you'll know the expansion was successful",
  "nextSteps": ["Step 1 — who does what by when", "Step 2"]
}

RULES:
- Expansion signals must be specific and observable, not vague.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── CS Playbook (Carter) ─────────────────────────────────────────────────
    cs_playbook: `You are generating a customer success playbook for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Customer Success Playbook: [company name]",
  "summary": "1-2 sentence philosophy — what CS means at this company",
  "healthScoreDefinition": {
    "green": "What a healthy account looks like — specific signals",
    "yellow": "Warning signals — be specific",
    "red": "At-risk signals — be specific",
    "reviewCadence": "How often to score accounts"
  },
  "onboardingPlaybook": {
    "day1": "What happens on Day 1 — specific actions",
    "day3": "Day 3 check-in content",
    "day7": "Day 7 milestone and check-in",
    "day14": "Day 14 check-in",
    "day30": "Day 30 first outcome review",
    "ahamoment": "The specific moment the customer realizes value"
  },
  "qbrCadence": {
    "threshold": "Which accounts get QBRs (e.g. >$10K ARR)",
    "frequency": "How often",
    "agenda": ["QBR agenda item 1", "Item 2", "Item 3", "Item 4"]
  },
  "churnInterventionProtocol": [
    { "signal": "Churn warning signal", "response": "Specific intervention", "owner": "CS | Founder | Susi", "sla": "Within X hours/days" }
  ],
  "escalationProtocol": {
    "level1": "What CS handles directly",
    "level2": "What escalates to founder",
    "level3": "What requires executive involvement"
  },
  "expansionTriggers": ["Signal 1 that triggers expansion conversation", "Signal 2"],
  "metrics": ["KPI 1 to track", "KPI 2", "KPI 3"]
}

RULES:
- Onboarding must have specific content/actions, not "check in with them".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Onboarding Plan (Carter / Harper) ────────────────────────────────────
    onboarding_plan: `You are generating an onboarding plan (either customer or employee onboarding, based on context).

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Onboarding Plan: [name/role or customer company]",
  "type": "customer | employee",
  "goal": "What success looks like at Day 30",
  "week1": {
    "theme": "Week 1 focus area",
    "milestones": ["Specific milestone 1", "Milestone 2", "Milestone 3"],
    "actions": ["Specific action to complete", "Action 2"],
    "checkIn": "What to review at end of week 1"
  },
  "week2": {
    "theme": "Week 2 focus area",
    "milestones": ["Milestone 1", "Milestone 2"],
    "actions": ["Action 1", "Action 2"],
    "checkIn": "Week 2 check-in content"
  },
  "week3": {
    "theme": "Week 3 focus area",
    "milestones": ["Milestone 1", "Milestone 2"],
    "actions": ["Action 1", "Action 2"],
    "checkIn": "Week 3 check-in content"
  },
  "week4": {
    "theme": "Week 4 — first outcome review",
    "milestones": ["30-day milestone 1", "30-day milestone 2"],
    "actions": ["Action 1"],
    "checkIn": "30-day review agenda"
  },
  "day60Milestone": "What they should have achieved by Day 60",
  "day90Milestone": "What they should have achieved by Day 90",
  "escalationTriggers": ["If this happens, escalate: situation 1", "Situation 2"],
  "toolsAndAccess": ["Tool or system they need access to", "Tool 2"],
  "keyStakeholders": ["Who they need to meet or connect with"]
}

RULES:
- Milestones must be specific and verifiable — not "getting comfortable".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Growth Model (Riley) ─────────────────────────────────────────────────
    growth_model: `You are generating a growth model for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Growth Model: [company name]",
  "summary": "1-2 sentence current growth situation and headline recommendation",
  "currentState": {
    "momGrowthRate": "X%",
    "primaryGrowthChannel": "Channel driving most customers today",
    "cac": "$0",
    "ltv": "$0",
    "ltvCacRatio": "X:1",
    "viralCoefficient": "0 (estimate if unknown)"
  },
  "growthBottleneck": {
    "bottleneck": "traffic | activation | retention | referral | monetization",
    "evidence": "Why you identified this as the bottleneck",
    "impact": "What fixing this unlocks"
  },
  "channelAnalysis": [
    {
      "channel": "Channel name",
      "status": "active | untested | paused",
      "cac": "$0",
      "volume": "X leads/month",
      "assessment": "Why this channel is or isn't working",
      "recommendation": "Scale | Optimize | Pause | Test"
    }
  ],
  "experimentRoadmap": [
    {
      "experiment": "What to test",
      "hypothesis": "We believe [X] will increase [metric] by [Y%] because [reason]",
      "channel": "Where this runs",
      "duration": "X weeks",
      "successMetric": "Specific measurable outcome",
      "effort": "low | medium | high",
      "priority": 1
    }
  ],
  "ninetyDayPlan": {
    "month1": "Focus and target",
    "month2": "Build on month 1",
    "month3": "Scale or pivot based on data"
  },
  "recommendation": "The single highest-leverage thing to do this week"
}

RULES:
- Bottleneck identification must be data-driven, not assumed.
- Experiments must have specific hypotheses — not "try LinkedIn ads".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Paid Campaign (Riley) ────────────────────────────────────────────────
    paid_campaign: `You are generating a paid acquisition campaign structure for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Paid Campaign: [channel] for [product/ICP]",
  "platform": "Google Ads | LinkedIn Ads | Meta Ads | Reddit Ads",
  "objective": "Campaign objective (e.g. Conversions, Lead Generation)",
  "budget": {
    "monthly": "$0",
    "dailyCap": "$0",
    "cpaTarget": "$0"
  },
  "targeting": {
    "audience": "Description of who you're targeting",
    "jobTitles": ["Target job title 1", "Title 2"],
    "industries": ["Industry 1", "Industry 2"],
    "companySize": "X-Y employees",
    "geography": ["Location 1", "Location 2"],
    "exclusions": ["Who to exclude"]
  },
  "adGroups": [
    {
      "name": "Ad group name (intent cluster)",
      "keywords": ["keyword 1", "keyword 2", "keyword 3"],
      "matchType": "Exact | Phrase | Broad",
      "ads": [
        {
          "headline1": "Headline variant A",
          "headline2": "Supporting headline",
          "description": "Ad description — specific value prop",
          "cta": "Call to action text"
        },
        {
          "headline1": "Headline variant B",
          "headline2": "Supporting headline",
          "description": "Alternative angle",
          "cta": "CTA"
        }
      ]
    }
  ],
  "landingPage": {
    "url": "Where clicks land",
    "conversionGoal": "What constitutes a conversion",
    "abVariants": ["Variant A hypothesis", "Variant B hypothesis"]
  },
  "trackingSetup": ["Conversion event 1 to track", "Event 2"],
  "weeklyOptimization": ["What to review weekly", "Optimization lever 1", "Lever 2"],
  "kpis": { "impressions": "Target", "ctr": "X%", "cpc": "$0", "conversions": "X/mo", "roas": "X:1" }
}

RULES:
- Ad copy must be specific to their product — no generic placeholders.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Referral Program (Riley) ─────────────────────────────────────────────
    referral_program: `You are generating a referral program design for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Referral Program: [company]",
  "programName": "Catchy name for the program",
  "mechanic": {
    "type": "double-sided | single-sided | viral loop",
    "referrerIncentive": "What the person referring gets — be specific",
    "refereeIncentive": "What the new user gets — be specific",
    "trigger": "When the reward is granted (e.g. when referee completes first paid month)"
  },
  "viralCoefficient": {
    "current": "Estimated current k-value",
    "target": "Target k-value",
    "explanation": "What k>1 means for this product"
  },
  "integrationPoints": [
    { "location": "Where in product to place referral trigger", "reasoning": "Why this is the highest-delight moment" }
  ],
  "copyTemplates": {
    "referralEmailSubject": "Subject line for the referral email",
    "referralEmailBody": "Full email template with personalization tokens",
    "inAppMessage": "Short in-app prompt copy",
    "socialShareText": "Pre-written tweet/LinkedIn post for sharing"
  },
  "trackingSetup": {
    "uniqueLinks": "How unique referral links are generated",
    "attribution": "How referrals are attributed",
    "dashboardMetrics": ["Metric 1 to track", "Metric 2"]
  },
  "launchPlan": ["Step 1 to launch", "Step 2", "Step 3"],
  "successMetrics": { "week4Target": "X referrals", "month3Target": "X referrals", "kTarget": "k > X" }
}

RULES:
- Incentives must be specific and compelling enough to overcome social friction.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Launch Playbook (Riley) ──────────────────────────────────────────────
    launch_playbook: `You are generating a product/feature launch playbook.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Launch Playbook: [product/feature] on [platform]",
  "platform": "Product Hunt | AppSumo | Feature Launch | Betalist",
  "launchDate": "Target launch date",
  "timeline": [
    { "phase": "T-30 days", "actions": ["Action 1", "Action 2", "Action 3"] },
    { "phase": "T-14 days", "actions": ["Action 1", "Action 2"] },
    { "phase": "T-7 days", "actions": ["Action 1", "Action 2", "Action 3"] },
    { "phase": "T-2 days", "actions": ["Final prep action 1", "Action 2"] },
    { "phase": "Launch Day", "actions": ["8am: post live", "Action 2", "Action 3", "Ongoing: respond to comments"] },
    { "phase": "T+7 days", "actions": ["Follow-up action 1", "Action 2"] }
  ],
  "assetChecklist": ["Asset 1 needed", "Asset 2", "Asset 3", "Asset 4"],
  "communityStrategy": {
    "communities": ["Community 1 to activate", "Community 2"],
    "prelaunchOutreach": "How to prime community before launch",
    "launchDayPlan": "What to post and when"
  },
  "productHuntSpecific": {
    "hunter": "Who should hunt the product",
    "tagline": "60-character tagline",
    "firstComment": "The founder's first comment — specific and compelling",
    "upvoteTarget": "X upvotes in first hour"
  },
  "pressOutreach": ["Journalist/newsletter 1 to pitch", "Journalist 2", "Newsletter 3"],
  "successMetrics": {
    "day1": "Target metric by end of Day 1",
    "week1": "Target by end of Week 1",
    "month1": "30-day target"
  },
  "contingency": "What to do if launch underperforms"
}

RULES:
- Timeline actions must be specific tasks, not generic guidance.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Growth Report (Riley) ────────────────────────────────────────────────
    growth_report: `You are generating a weekly growth report for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Growth Report: Week of [date]",
  "headline": "The biggest growth development this week in one sentence",
  "metrics": {
    "momGrowthRate": "X%",
    "newCustomers": 0,
    "totalCustomers": 0,
    "cac": "$0",
    "cacByChannel": [
      { "channel": "Channel name", "cac": "$0", "customers": 0, "spend": "$0", "roas": "X:1" }
    ],
    "viralCoefficient": "X",
    "topFunnelVolume": "X visitors/leads",
    "activationRate": "X%",
    "funnelConversion": [
      { "stage": "Visitor → Trial", "rate": "X%" },
      { "stage": "Trial → Paid", "rate": "X%" }
    ]
  },
  "channelPerformance": [
    { "channel": "Channel name", "trend": "up | flat | down", "insight": "What changed and why", "action": "What to do" }
  ],
  "experimentsRunning": [
    { "experiment": "Name", "hypothesis": "What you're testing", "currentResult": "Early signal", "status": "running | concluded" }
  ],
  "lastWeekExperiment": {
    "experiment": "What you tested last week",
    "result": "What happened",
    "decision": "ship | kill | iterate"
  },
  "nextWeekFocus": "The single most important growth lever to pull next week",
  "alerts": ["Any metric that needs immediate attention"]
}

RULES:
- All numbers should be real from context or clearly marked as estimates.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Experiment Results (Riley / Nova) ────────────────────────────────────
    experiment_results: `You are documenting the results of a growth or product experiment.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Experiment Results: [experiment name]",
  "hypothesis": "We believed [X] would increase [metric] by [Y%] because [reason]",
  "variants": [
    { "name": "Control", "description": "What the control looked like", "sampleSize": 0, "result": "X conversion" },
    { "name": "Variant A", "description": "What was changed", "sampleSize": 0, "result": "Y conversion" }
  ],
  "results": {
    "winner": "Control | Variant A | Inconclusive",
    "lift": "X% improvement",
    "pValue": "X (statistically significant: true/false)",
    "confidenceLevel": "X%",
    "revenueImpact": "$X/mo if shipped"
  },
  "whatWelearned": "The insight this experiment produced — be specific",
  "decision": {
    "verdict": "ship | kill | iterate",
    "rationale": "Why you made this decision",
    "nextExperiment": "What to test next based on this learning"
  },
  "implementationNotes": "If shipping: what needs to happen to roll out to 100%"
}

RULES:
- Statistical significance must be addressed — state if you have it or not.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Financial Model (Felix) ──────────────────────────────────────────────
    financial_model: `You are generating an 18-month financial model for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Financial Model: [company name]",
  "assumptions": {
    "currentMrr": "$0",
    "currentBurn": "$0/mo",
    "currentHeadcount": 0,
    "avgDealSize": "$0",
    "salesCycleMonths": 0,
    "grossMargin": "X%"
  },
  "scenarios": {
    "base": {
      "description": "Most likely outcome based on current trajectory",
      "month6Mrr": "$0",
      "month12Mrr": "$0",
      "month18Mrr": "$0",
      "burnAtMonth12": "$0/mo",
      "runway": "X months",
      "breakeven": "Month X or 'beyond 18mo'"
    },
    "bull": {
      "description": "Upside scenario — key assumptions that change",
      "month12Mrr": "$0",
      "month18Mrr": "$0",
      "runway": "X months"
    },
    "bear": {
      "description": "Downside scenario — what could go wrong",
      "month12Mrr": "$0",
      "runway": "X months",
      "requiredAction": "What to do if this scenario unfolds"
    }
  },
  "keyMilestones": [
    { "month": 0, "milestone": "Today — starting point", "mrr": "$0", "headcount": 0 },
    { "month": 6, "milestone": "6-month target", "mrr": "$0", "headcount": 0 },
    { "month": 12, "milestone": "12-month target", "mrr": "$0", "headcount": 0 },
    { "month": 18, "milestone": "18-month target", "mrr": "$0", "headcount": 0 }
  ],
  "hiringPlan": [
    { "role": "Next hire", "month": 0, "cost": "$0/mo", "rationale": "What this hire unblocks" }
  ],
  "fundraisingRecommendation": {
    "shouldRaise": true,
    "timing": "When to start raising",
    "amount": "$0",
    "rationale": "Why this amount at this time"
  }
}

RULES:
- All projections grounded in context provided — no fantasy numbers.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Investor Update (Felix) ──────────────────────────────────────────────
    investor_update: `You are generating a monthly investor update email for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Investor Update — [Month Year]",
  "subject": "Email subject line — concise and metric-leading",
  "headline": "The most important thing that happened this month in one sentence",
  "metrics": {
    "mrr": "$0",
    "mrrGrowth": "X% MoM",
    "arr": "$0",
    "customers": 0,
    "burn": "$0/mo",
    "runway": "X months",
    "highlights": ["Metric highlight 1", "Highlight 2"]
  },
  "wins": ["Biggest win this month — specific", "Win 2", "Win 3"],
  "challenges": ["Honest challenge — don't hide problems", "Challenge 2"],
  "asks": [
    { "ask": "Specific thing you need from investors", "context": "Why you need it" }
  ],
  "nextMonthFocus": ["Priority 1 for next month", "Priority 2", "Priority 3"],
  "narrative": "3-4 sentence narrative summary of the month — the story, not just the numbers",
  "teamUpdates": "Any hiring, departure, or org changes (or 'None this month')"
}

RULES:
- Be honest about challenges — investors prefer truth to spin.
- Asks must be specific and actionable.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Job Description (Harper) ─────────────────────────────────────────────
    job_description: `You are generating a job description for an early-stage startup hire.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Job Description: [Role Title]",
  "role": "Role title",
  "department": "Team/function",
  "location": "Remote | Hybrid | On-site — location",
  "level": "IC | Lead | Manager | Director",
  "overview": "2-3 sentence description of why this role exists and what impact they'll have",
  "responsibilities": [
    "Core responsibility 1 — be specific",
    "Responsibility 2",
    "Responsibility 3",
    "Responsibility 4",
    "Responsibility 5"
  ],
  "mustHaves": [
    "Non-negotiable requirement 1",
    "Requirement 2",
    "Requirement 3"
  ],
  "niceToHaves": [
    "Nice to have skill 1",
    "Nice to have 2"
  ],
  "compensation": {
    "salaryRange": "$X - $Y",
    "equity": "X - Y% or X,000 - Y,000 options",
    "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"]
  },
  "cultureSell": "2-3 sentences on what makes this role and company exciting — genuine, not generic",
  "interviewProcess": ["Step 1 — what it involves", "Step 2", "Step 3"]
}

RULES:
- Must-haves must be genuinely non-negotiable, not an aspirational wishlist.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Content Calendar (Maya) ──────────────────────────────────────────────
    content_calendar: `You are generating a 30-day content calendar for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Content Calendar: [Month Year]",
  "theme": "Monthly content theme or focus",
  "channels": ["Channel 1", "Channel 2"],
  "frequency": "X posts per week",
  "contentMix": {
    "thoughtLeadership": "X%",
    "productContent": "X%",
    "socialProof": "X%",
    "educational": "X%"
  },
  "posts": [
    {
      "week": 1,
      "platform": "LinkedIn | Twitter | Newsletter | Blog",
      "type": "thought leadership | product | educational | social proof",
      "topic": "Specific topic or angle",
      "hook": "Opening line or hook for the post",
      "cta": "Call to action",
      "publishDate": "Day/Date"
    }
  ],
  "seoTargets": ["Keyword 1 to target this month", "Keyword 2"],
  "distribution": ["Where each piece gets repurposed after publishing"],
  "kpis": ["What to measure — specific metric"]
}

RULES:
- Include at least 8-12 posts across the month.
- All hooks must be specific, not "have you ever wondered...".
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── Competitor Weekly (Atlas) ─────────────────────────────────────────────
    competitor_weekly: `You are generating a weekly competitive intelligence digest.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "Competitor Weekly: Week of [date]",
  "headline": "Biggest competitive development this week in one sentence",
  "topMoves": [
    {
      "competitor": "Competitor name",
      "move": "What they did — be specific",
      "implication": "What it means for you — be specific",
      "urgency": "high | medium | low"
    }
  ],
  "pricingAlerts": ["Any pricing change detected, or empty array"],
  "hiringSignals": ["Job postings that signal their roadmap direction"],
  "fundingActivity": ["Any new funding, or empty array"],
  "reviewIntelligence": ["What customers are saying about competitors in reviews"],
  "opportunities": ["Specific opportunity to exploit from this week's intel 1", "Opportunity 2"],
  "recommendedActions": [
    { "action": "Specific thing to do this week in response", "owner": "Who does it", "deadline": "By when" }
  ],
  "quietCompetitors": ["Competitors with no notable activity this week"],
  "watchList": ["Something to monitor next week"]
}

RULES:
- Implications must be specific to YOUR product and strategy.
- Return ONLY valid JSON. No markdown, no explanation.`,

    // ── OKR Health Report (Sage) ─────────────────────────────────────────────
    okr_health_report: `You are generating an OKR health report for a startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "OKR Health Report: Q[X] [Year] — Week [X]",
  "overallHealth": "green | yellow | red",
  "weekInQuarter": 0,
  "summary": "1-2 sentence honest assessment of OKR progress",
  "objectives": [
    {
      "objective": "Objective statement",
      "health": "green | yellow | red",
      "confidence": "X% chance of hitting by quarter end",
      "keyResults": [
        {
          "kr": "Key result statement",
          "target": "Target value",
          "current": "Current value",
          "progress": "X%",
          "status": "on track | at risk | behind | achieved"
        }
      ],
      "blockers": ["What's blocking progress if any"],
      "weeklyWin": "What moved forward this week"
    }
  ],
  "topBlockers": ["Company-level blocker 1", "Blocker 2"],
  "atRiskObjectives": ["Objective most at risk of missing"],
  "recommendations": [
    { "action": "Specific thing to do this week", "objective": "Which OKR it unblocks", "owner": "Who" }
  ],
  "nextWeekFocus": "The single most important thing to accomplish next week"
}

RULES:
- Health must be data-driven — no "we're feeling good about this".
- Return ONLY valid JSON. No markdown, no explanation.`,
  };

  return prompts[type] || prompts["icp_document"];
}
