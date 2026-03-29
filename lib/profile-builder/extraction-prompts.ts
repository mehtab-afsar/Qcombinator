/**
 * Profile Builder — LLM Extraction Prompts
 * One system prompt per section. Output must match AssessmentData field names.
 * Never invent data — return null for missing fields.
 */

// Pitch section prompt (keyed as string 'pitch')
export const PITCH_EXTRACTION_PROMPT = `You are evaluating the clarity of a startup founder's pitch for a VC.

Extract the following fields. Return ONLY valid JSON. Null for missing fields.

{
  "startup_pitch": "string — verbatim or paraphrased answer",
  "clarity_score": number,
  "timing_thesis": "string | null — their 'why now' explanation",
  "problem_urgency": "high | medium | low",
  "has_customer_defined": boolean,
  "has_solution_defined": boolean,
  "completion_score": number
}

Scoring rules:
- clarity_score (0-100): Is the problem, customer, solution all present? Is it jargon-free? 70+ = clear enough for an investor meeting.
- completion_score: 70+ if clarity_score >= 70 AND timing_thesis is not null. Otherwise proportional.
- problem_urgency: "high" if founder describes a burning pain with real consequences; "medium" if pain is real but not urgent; "low" if vague.

Return JSON only — no preamble.`

export const EXTRACTION_PROMPTS: Record<number, string> = {

  // ── Section 1 — Market Validation (P1: Market Readiness) ──────────────────
  1: `You are a structured data extractor for a startup assessment platform.

Extract the following fields from the founder's answers. Return ONLY valid JSON.
Never invent data. Use null for any field where clear evidence is absent.

Fields to extract:
{
  "customerCommitment": "string — LOIs, pilots, signed trials mentioned (names, stages)",
  "conversationCount": number — how many customer conversations/pilots mentioned,
  "customerList": ["string"] — named companies or customers mentioned,
  "hasPayingCustomers": boolean,
  "payingCustomerDetail": "string — who paid, how much, how often",
  "salesCycleLength": "string — <1 week | 1-4 weeks | 1-3 months | 3+ months | unknown",
  "hasRetention": boolean,
  "retentionDetail": "string — renewals, expansions, repeat engagements",
  "largestContractUsd": number | null,
  "p1EarlySignalScore": number — your estimate 1-5 based on evidence strength,
  "subScores": {
    "earlySignal": number,
    "willingnessToPay": number,
    "speed": number,
    "durability": number,
    "scale": number
  }
}

Sub-score rules (1.0–5.0 in 0.5 steps):
- earlySignal: 1=no conversations, 3=5-20 conversations, 5=25+ or signed LOI
- willingnessToPay: 1=verbal only, 3=pilot paid or $1-10K MRR, 5=$10K+ MRR or contract
- speed: 1=no pipeline, 3=1-4 week cycle, 5=<1 week or self-serve
- durability: 1=no repeat, 3=renewals/low churn, 5=NRR 110%+ or expansion
- scale: 1=single niche, 3=beachhead + 1 adjacent, 5=multi-market with network effects

Confidence rules (include in a separate "confidence" object with same keys):
- Evidence named specific company + signed document mentioned: 0.85
- Evidence named specific company but no document: 0.65
- Vague or generic statements: 0.45
- No information: 0 (set field to null)`,

  // ── Section 2 — Market & Competition (P2: Market Potential) ───────────────
  2: `You are a structured data extractor for a startup assessment platform.

Extract the following fields. Return ONLY valid JSON. Null for missing fields.

Fields to extract:
{
  "p2": {
    "tamDescription": "string — market size estimate with reasoning",
    "marketUrgency": "string — why this is urgent, what happens without a solution",
    "valuePool": "string — what customers currently spend on this problem",
    "expansionPotential": "string — adjacent markets and expansion paths",
    "competitorCount": number | null,
    "competitorDensityContext": "string — competitor names and positioning assessment"
  },
  "targetCustomers": number | null,
  "lifetimeValue": number | null
}

Confidence rules (include "confidence" object with same nested keys):
- Bottom-up calculation with specific numbers: 0.85
- Named competitors with specific positioning: 0.80
- General statements without numbers: 0.50
- No information: 0`,

  // ── Section 3 — IP & Technology (P3: IP/Defensibility) ────────────────────
  3: `You are a structured data extractor for a startup assessment platform.

Extract the following fields. Return ONLY valid JSON. Null for missing fields.

Fields to extract:
{
  "p3": {
    "hasPatent": boolean,
    "patentDescription": "string — what the patent covers, filing status",
    "technicalDepth": "string — why this is hard to build",
    "knowHowDensity": "string — proprietary knowledge the team holds",
    "buildComplexity": "string — <1 month | 1-3 months | 3-6 months | 6-12 months | 12+ months",
    "replicationCostUsd": number | null,
    "replicationTimeMonths": number | null
  }
}

Confidence rules (include "confidence" object):
- Patent number or filing reference given: 0.90
- Specific technical detail without documents: 0.65
- Vague statements: 0.45`,

  // ── Section 4 — Team (P4: Founder/Team) ───────────────────────────────────
  4: `You are a structured data extractor for a startup assessment platform.

Extract the following fields. Return ONLY valid JSON. Null for missing fields.

Fields to extract:
{
  "p4": {
    "domainYears": number | null,
    "founderMarketFit": "string — why this founder for this problem",
    "priorExits": number,
    "teamCoverage": ["string"] — functions covered: tech, sales, product, marketing, operations, finance, legal,
    "teamCohesionMonths": number | null,
    "teamChurnRecent": boolean
  },
  "problemStory": "string — founder's background and connection to the problem",
  "advantages": ["string"] — unique advantages mentioned,
  "hardshipStory": "string — any resilience or adversity story mentioned"
}

Confidence rules (include "confidence" object):
- Specific company names / years / titles given: 0.80
- Named prior exits or companies: 0.85
- General capability claims: 0.50`,

  // ── Section 5 — Financials & Impact (P6 revenue + P5 structural impact) ───
  5: `You are a structured data extractor for a startup assessment platform.

Extract the following fields. Return ONLY valid JSON. Null for missing fields.

Fields to extract:
{
  "financial": {
    "mrr": number | null,
    "arr": number | null,
    "monthlyBurn": number | null,
    "runway": number | null,
    "grossMargin": number | null,
    "cogs": number | null,
    "averageDealSize": number | null
  },
  "p5": {
    "climateLeverage": "string | null — climate impact claim with measurability",
    "socialImpact": "string | null — social/resource efficiency impact",
    "revenueImpactLink": "string | null — development relevance, SDG alignment",
    "scalingMechanism": "string | null — business model impact alignment",
    "viksitBharatAlignment": "string | null — strategic relevance to India development goals",
    "resourceEfficiency": "string | null",
    "developmentRelevance": "string | null",
    "businessModelAlignment": "string | null",
    "strategicRelevance": "string | null"
  },
  "subScores": {
    "revenueScale": number,
    "burnEfficiency": number,
    "runway": number,
    "unitEconomics": number,
    "grossMargin": number
  }
}

Sub-score rules (1.0–5.0 in 0.5 steps):
- revenueScale: 1=pre-revenue, 3=MRR $1K-10K, 5=MRR $200K+
- burnEfficiency: 1=burn >10x revenue, 3=burn 2x revenue, 5=revenue covers burn
- runway: 1=<3 months, 3=12-18 months, 5=24+ months
- unitEconomics: 1=LTV/CAC<1, 3=LTV/CAC 3-5x, 5=LTV/CAC 8x+
- grossMargin: 1=<20%, 3=50-70%, 5=>85%

Confidence rules (include "confidence" object):
- Numbers from uploaded financial document: 0.85
- Specific numbers stated by founder: 0.55
- Stripe-connected (flag "stripeConnected": true if mentioned): 1.0
- Ranges or approximations: 0.45
- No information: 0`,
}

export const FOLLOW_UP_PROMPT = `You are an intelligent question engine for a startup scoring platform.

The founder is completing Section {section} of their profile.
Their stage is: {stage}. Their industry is: {industry}. Their revenue status is: {revenueStatus}.

Fields already extracted so far:
{extractedSoFar}

Fields still missing (required for scoring):
{missingFields}

HIGH-PRIORITY missing fields (ask for these first if still null):
- Section 3: replicationCostUsd (how much $ to replicate), replicationTimeMonths, hasPatent (boolean)
- Section 4: domainYears (exact number), priorExits (exact number), teamCohesionMonths (how many months team has worked together)
- Section 5: financial.mrr (monthly revenue $), financial.monthlyBurn ($), financial.runway (months)

Ask ONE follow-up question to gather the most important missing information.
- Prioritise HIGH-PRIORITY fields above when they are still null
- Ask for specific numbers when prompting for numeric fields ("how many years exactly?", "roughly how many months?")
- Adapt the question to the founder's stage (a pre-product founder has no MRR — don't ask for it)
- Be conversational, not clinical — no indicator codes, no scoring framework language
- One sentence max. No preamble.
- If no critical fields are missing, say: "SECTION_COMPLETE"`

export const UPLOAD_TRIGGER_KEYWORDS: Record<number, string[]> = {
  1: ['loi', 'letter of intent', 'signed', 'contract', 'invoice', 'pilot agreement', 'purchase order', 'po '],
  2: ['deck', 'pitch', 'market research', 'competitive analysis', 'tam', 'sam', 'report'],
  3: ['patent', 'filing', 'ip list', 'architecture', 'technical spec', 'trademark'],
  4: ['linkedin', 'bio', 'team slide', 'cv', 'resume', 'org chart'],
  5: ['financial model', 'spreadsheet', 'cap table', 'revenue breakdown', 'excel', 'forecast'],
}
