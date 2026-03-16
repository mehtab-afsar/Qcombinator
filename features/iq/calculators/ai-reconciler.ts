/**
 * AI Reconciler — Anti-Hallucination Consensus Scoring
 *
 * For the 4 AI-reconciled indicators (2.1, 2.5, 3.5, 5.3, 5.5):
 *
 * 1. GROUND the prompt with real injected data (Tavily / artifact content)
 *    — never ask LLM to estimate from memory
 * 2. CONSENSUS: run 2 independent LLM calls with different system prompts
 *    — if |A - B| > 1.0, trigger tiebreaker Call C
 * 3. VALIDATE: require evidence_quotes that are verbatim substrings of injected context
 *    — hallucinated citations → indicator excluded
 * 4. ASSIGN confidence based on consensus deviation
 */

import { callOpenRouter } from '@/lib/openrouter';
import { AIReconcilerResult, DataSource, ResolvedIndicatorData } from '../types/iq.types';

// ─── System Prompt Variants ──────────────────────────────────────────────────

const SYSTEM_A = `You are a rigorous investment analyst. Score the indicator strictly based on the evidence provided.
Be conservative — when evidence is ambiguous, score lower rather than higher.
Respond ONLY with valid JSON matching the exact schema provided. No additional text.`;

const SYSTEM_B = `You are a critical due-diligence expert. Score the indicator based solely on verifiable facts in the provided data.
Challenge any claims that seem exaggerated. Default to a neutral score (3) when evidence is insufficient.
Respond ONLY with valid JSON matching the exact schema provided. No additional text.`;

const SYSTEM_TIE = `You are an independent arbitrator reviewing two conflicting analyst scores.
Base your score purely on the concrete evidence provided. Ignore any prior scores.
Respond ONLY with valid JSON matching the exact schema provided. No additional text.`;

// ─── Per-Indicator Prompt Builders ───────────────────────────────────────────

interface ReconcilerInput {
  indicatorCode: string;
  indicatorName: string;
  unit: string;
  score1Description: string;
  score3Description: string;
  score5Description: string;
  groundingData: Record<string, unknown>;
  injectedContext: string;  // text that evidence_quotes must come from
}

function buildUserPrompt(input: ReconcilerInput, callLabel: string): string {
  return `## Indicator: ${input.indicatorCode} — ${input.indicatorName}

## Scoring Scale
- Score 1 (worst): ${input.score1Description}
- Score 3 (average): ${input.score3Description}
- Score 5 (best): ${input.score5Description}

## Evidence Provided (your score must reference this data)
${input.injectedContext}

## Raw Input Data
${JSON.stringify(input.groundingData, null, 2)}

## Required Response Format (JSON only, no markdown):
{
  "score": <number between 1 and 5, one decimal allowed>,
  "reasoning": "<3-5 sentences explaining the score, citing specific data points from the evidence>",
  "evidence_quotes": ["<exact verbatim substring from Evidence Provided section>"],
  "confidence": <number between 0 and 1>
}

Call: ${callLabel}`;
}

// ─── Grounding Context Builders ───────────────────────────────────────────────

interface GroundingContext {
  injectedContext: string;
  liveData?: string;  // Tavily results (injected externally before call)
}

export function buildGroundingContext(
  indicatorCode: string,
  rawData: Record<string, unknown>,
  tavilyResults?: string
): GroundingContext {
  const parts: string[] = [];

  switch (indicatorCode) {
    case '2.1': // SAM
      if (tavilyResults) parts.push(`## Market Research (Live Web Data)\n${tavilyResults}`);
      if (rawData.tam) parts.push(`## Founder's Stated TAM\n$${Number(rawData.tam).toLocaleString()}`);
      if (rawData.sector) parts.push(`## Sector\n${rawData.sector}`);
      break;

    case '2.5': // Competitive Density
      if (rawData.count != null) parts.push(`## Competitor Count (from Atlas artifact)\n${rawData.count} direct competitors identified`);
      if (tavilyResults) parts.push(`## Market Competition (Live Web Data)\n${tavilyResults}`);
      if (rawData.hasAtlasArtifact) parts.push('## Note\nCompetitor count sourced from Atlas competitive matrix artifact.');
      break;

    case '3.5': // Replication Cost
      if (rawData.productDescription) parts.push(`## Product Description\n${rawData.productDescription}`);
      if (rawData.teamSize) parts.push(`## Team Size\n${rawData.teamSize} people`);
      if (rawData.buildTimeMonths) parts.push(`## Build Time\n${rawData.buildTimeMonths} months to MVP`);
      if (rawData.monthlyBurn) parts.push(`## Monthly Burn\n$${Number(rawData.monthlyBurn).toLocaleString()}`);
      if (rawData.advantages) parts.push(`## Technical Advantages\n${Array.isArray(rawData.advantages) ? rawData.advantages.join(', ') : rawData.advantages}`);
      break;

    case '5.1': // Carbon
      if (rawData.story) parts.push(`## Product Description\n${rawData.story}`);
      parts.push('## Note\nOnly score carbon reduction if the product mechanistically reduces emissions. Generic sustainability claims = Score 1.');
      break;

    case '5.3': // SDG Breadth
      if (rawData.productDescription) parts.push(`## Product Description\n${rawData.productDescription}`);
      if (rawData.problemStory) parts.push(`## Problem Story\n${rawData.problemStory}`);
      if (rawData.sector) parts.push(`## Sector\n${rawData.sector}`);
      parts.push('## UN SDGs for Reference\n1=No Poverty, 2=Zero Hunger, 3=Good Health, 4=Quality Education, 5=Gender Equality, 6=Clean Water, 7=Affordable Energy, 8=Decent Work, 9=Industry/Innovation, 10=Reduced Inequalities, 11=Sustainable Cities, 12=Responsible Consumption, 13=Climate Action, 14=Life Below Water, 15=Life on Land, 16=Peace/Justice, 17=Partnerships');
      parts.push('## Scoring Guidance\nOnly count SDGs where the product DIRECTLY AND MATERIALLY impacts outcomes — not peripheral/marketing connections.');
      break;

    case '5.5': // Viksit Bharat
      if (rawData.productDescription) parts.push(`## Product Description\n${rawData.productDescription}`);
      if (rawData.problemStory) parts.push(`## Problem Story\n${rawData.problemStory}`);
      if (rawData.sector) parts.push(`## Sector\n${rawData.sector}`);
      parts.push('## Viksit Bharat 2047 Strategic Domains\nSemiconductors/Electronics, Defence/Aerospace, Clean Energy/EVs, Food Security/AgriTech, Healthcare/Biotech, Infrastructure/Construction, Space Technology, Financial Inclusion/Fintech, Digital Public Infrastructure');
      break;

    default:
      parts.push(`## Data\n${JSON.stringify(rawData, null, 2)}`);
  }

  return { injectedContext: parts.join('\n\n') };
}

// ─── Score Descriptions per Indicator ────────────────────────────────────────

const SCORE_DESCRIPTIONS: Record<string, { s1: string; s3: string; s5: string; name: string; unit: string }> = {
  '2.1': {
    name: 'Serviceable Market Size (SAM)',
    unit: '$',
    s1: 'SAM < $5M (niche, limited scale)',
    s3: 'SAM $50M–$500M (meaningful market)',
    s5: 'SAM > $5B (large, scalable market)',
  },
  '2.5': {
    name: 'Competitive Density',
    unit: 'competitors',
    s1: '>20 direct competitors (highly saturated)',
    s3: '5–10 competitors (competitive)',
    s5: '<3 direct competitors with structural differentiation',
  },
  '3.5': {
    name: 'Replication Cost',
    unit: '$',
    s1: '<$50K to replicate (easy to copy)',
    s3: '$200K–$500K to replicate (moderate barrier)',
    s5: '>$5M to replicate (high barrier, deep tech)',
  },
  '5.1': {
    name: 'Carbon Intensity Reduction',
    unit: '%',
    s1: 'No measurable CO₂ reduction (not a climate product)',
    s3: '10–30% reduction vs baseline',
    s5: '>50% reduction — core climate mechanism',
  },
  '5.3': {
    name: 'SDG Breadth',
    unit: 'SDGs',
    s1: '0 material SDG impacts',
    s3: '2–4 material SDG impacts',
    s5: '5+ material SDG impacts (capped at 8)',
  },
  '5.5': {
    name: 'Viksit Bharat 2047 Score',
    unit: 'alignment',
    s1: 'No alignment with India strategic sovereignty domains',
    s3: 'Partial alignment — adjacent to 1–2 domains',
    s5: 'Core to 2+ strategic domains (semiconductors, defence, clean energy, etc.)',
  },
};

// ─── Hallucination Validator ──────────────────────────────────────────────────

/**
 * Checks that every evidence_quote in the LLM response is a verbatim
 * substring of the injected context. If any quote is fabricated, returns false.
 */
function validateEvidenceQuotes(quotes: string[], injectedContext: string): boolean {
  if (!quotes || quotes.length === 0) return false; // must have at least one quote
  for (const quote of quotes) {
    const trimmed = quote.trim();
    if (trimmed.length < 5) continue; // skip trivially short quotes
    if (!injectedContext.includes(trimmed)) {
      console.warn(`[IQ AI Reconciler] Hallucinated quote: "${trimmed.slice(0, 80)}..."`);
      return false;
    }
  }
  return true;
}

// ─── Single LLM Call ─────────────────────────────────────────────────────────

interface SingleCallResult {
  score: number | null;
  reasoning: string;
  evidenceQuotes: string[];
  confidence: number;
  raw: string;
}

async function runSingleCall(
  systemPrompt: string,
  userPrompt: string,
  callLabel: string
): Promise<SingleCallResult> {
  try {
    const raw = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 300, temperature: 0.1 }
    );

    // Strip markdown fences if present
    const cleaned = raw.replace(/```(?:json)?\n?/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    const score = typeof parsed.score === 'number' ? parsed.score : parseFloat(parsed.score);
    if (!isFinite(score) || score < 1 || score > 5) {
      console.warn(`[IQ AI Reconciler] ${callLabel}: invalid score ${parsed.score}`);
      return { score: null, reasoning: 'Invalid score returned', evidenceQuotes: [], confidence: 0, raw };
    }

    return {
      score: Math.max(1, Math.min(5, score)),
      reasoning: String(parsed.reasoning ?? ''),
      evidenceQuotes: Array.isArray(parsed.evidence_quotes) ? parsed.evidence_quotes : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      raw,
    };
  } catch (err) {
    console.warn(`[IQ AI Reconciler] ${callLabel} failed:`, err);
    return { score: null, reasoning: `Call failed: ${err instanceof Error ? err.message : 'unknown'}`, evidenceQuotes: [], confidence: 0, raw: '' };
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Score an AI-reconciled indicator using 2-call consensus with hallucination guard.
 *
 * Returns AIReconcilerResult with:
 * - score 1–5 (median of successful calls)
 * - hallucinationDetected=true if evidence_quotes were fabricated → caller should exclude
 * - confidence derived from consensus deviation
 */
export async function reconcileIndicator(
  indicatorCode: string,
  resolvedData: ResolvedIndicatorData,
  tavilyResults?: string
): Promise<AIReconcilerResult> {
  const desc = SCORE_DESCRIPTIONS[indicatorCode];
  if (!desc) {
    return {
      score: 3,
      reasoning: 'No scoring description for this indicator',
      evidenceQuotes: [],
      confidence: 0.40,
      hallucinationDetected: false,
    };
  }

  const rawData = (resolvedData.rawData ?? {}) as Record<string, unknown>;
  const { injectedContext } = buildGroundingContext(indicatorCode, rawData, tavilyResults);

  if (!injectedContext || injectedContext.length < 20) {
    return {
      score: 3,
      reasoning: 'Insufficient grounding data — defaulting to neutral score',
      evidenceQuotes: [],
      confidence: 0.40,
      hallucinationDetected: false,
    };
  }

  const input: ReconcilerInput = {
    indicatorCode,
    indicatorName: desc.name,
    unit: desc.unit,
    score1Description: desc.s1,
    score3Description: desc.s3,
    score5Description: desc.s5,
    groundingData: rawData,
    injectedContext,
  };

  // ── Call A and Call B in parallel ──────────────────────────────────────────
  const [callA, callB] = await Promise.all([
    runSingleCall(SYSTEM_A, buildUserPrompt(input, 'Analyst A'), 'CallA'),
    runSingleCall(SYSTEM_B, buildUserPrompt(input, 'Analyst B'), 'CallB'),
  ]);

  const scoreA = callA.score;
  const scoreB = callB.score;

  // ── Hallucination check ────────────────────────────────────────────────────
  const aValid = scoreA != null && validateEvidenceQuotes(callA.evidenceQuotes, injectedContext);
  const bValid = scoreB != null && validateEvidenceQuotes(callB.evidenceQuotes, injectedContext);

  if (!aValid && !bValid) {
    return {
      score: 3,
      reasoning: 'Both analyst calls failed hallucination validation — indicator excluded from scoring',
      evidenceQuotes: [],
      confidence: 0,
      hallucinationDetected: true,
    };
  }

  // If only one is valid, use it with lower confidence
  if (!aValid && bValid) {
    return {
      score: scoreB!,
      reasoning: callB.reasoning,
      evidenceQuotes: callB.evidenceQuotes,
      confidence: 0.40,
      consensusDeviation: undefined,
      hallucinationDetected: false,
    };
  }
  if (aValid && !bValid) {
    return {
      score: scoreA!,
      reasoning: callA.reasoning,
      evidenceQuotes: callA.evidenceQuotes,
      confidence: 0.40,
      hallucinationDetected: false,
    };
  }

  const deviation = Math.abs(scoreA! - scoreB!);

  // ── If consensus diverges > 1.0, run tiebreaker ───────────────────────────
  if (deviation > 1.0) {
    const callC = await runSingleCall(SYSTEM_TIE, buildUserPrompt(input, 'Arbitrator'), 'CallC');
    const cValid = callC.score != null && validateEvidenceQuotes(callC.evidenceQuotes, injectedContext);

    if (cValid) {
      const scores = [scoreA!, scoreB!, callC.score!].sort((a, b) => a - b);
      const median = scores[1];
      return {
        score: median,
        reasoning: `Consensus required tiebreaker. A=${scoreA}, B=${scoreB}, C=${callC.score}. Median: ${median}. ${callC.reasoning}`,
        evidenceQuotes: [...new Set([...callA.evidenceQuotes, ...callC.evidenceQuotes])],
        confidence: 0.55, // diverged but tiebreaker resolved
        consensusDeviation: deviation,
        hallucinationDetected: false,
      };
    }
  }

  // ── Both calls valid + within 1.0 → average ───────────────────────────────
  const finalScore = (scoreA! + scoreB!) / 2;
  const finalConfidence: DataSource = deviation <= 0.5
    ? 'ai_reconciled_grounded'
    : 'ai_reconciled_estimated';
  const confidenceValue = finalConfidence === 'ai_reconciled_grounded' ? 0.70 : 0.55;

  return {
    score: Math.round(finalScore * 10) / 10,
    reasoning: `Consensus of two analysts (deviation: ${deviation.toFixed(1)}). ${callA.reasoning}`,
    evidenceQuotes: [...new Set([...callA.evidenceQuotes, ...callB.evidenceQuotes])],
    confidence: confidenceValue,
    consensusDeviation: deviation,
    hallucinationDetected: false,
  };
}
