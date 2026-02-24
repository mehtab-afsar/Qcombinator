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
    // ── ICP Document ────────────────────────────────────────────────────────
    icp_document: `You are generating a structured ICP (Ideal Customer Profile) document for an early-stage startup.

Context gathered from the conversation:
${ctx}

Return a JSON object with this EXACT structure (no markdown fences, no extra text):
{
  "title": "ICP: [descriptive title based on their product/market]",
  "summary": "2-3 sentence executive summary of who they should target and why",
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
    { "pain": "description of the pain point", "severity": "high", "currentSolution": "how they solve it today" },
    { "pain": "another pain point", "severity": "medium", "currentSolution": "current workaround" }
  ],
  "buyingTriggers": ["trigger1", "trigger2", "trigger3", "trigger4"],
  "channels": [
    { "channel": "channel name", "priority": "primary", "rationale": "why this channel works for this ICP" },
    { "channel": "another channel", "priority": "secondary", "rationale": "supporting rationale" }
  ],
  "qualificationCriteria": ["criterion1", "criterion2", "criterion3", "criterion4"]
}

RULES:
- Be specific to THEIR product and market. No generic placeholders.
- Include 3-5 pain points, 3-5 buying triggers, 2-4 channels, 3-5 qualification criteria.
- Severity must be "high", "medium", or "low".
- Channel priority must be "primary" or "secondary".
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
  };

  return prompts[type] || prompts["icp_document"];
}
