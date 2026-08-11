/**
 * AI Score Intelligence
 *
 * Generates personalised "unlock" cards after Q-Score submission.
 * Each card tells the founder exactly what to do to improve their score,
 * which indicator to target, and the estimated point impact.
 *
 * Also generates a 3-sentence Investor Readiness Summary for the investor portal.
 *
 * Uses the 'reasoning' task class (premium model) — runs in parallel with
 * benchmark fetch so it adds minimal latency to the submit pipeline.
 */

import { tieredText } from '@/lib/llm/router';
import type { ParameterScore, IndicatorScore } from '../calculators/q-score-calculator';
import { INDICATOR_AGENTS } from '../constants/dimensions';

export interface UnlockCard {
  indicatorId: string;
  indicatorName: string;
  parameterId: string;
  currentScore: number;   // 0–5
  targetScore: number;    // what to aim for
  estimatedPointGain: number;
  action: string;         // specific, not generic
  agentId?: string;       // which agent can help
}

export interface ScoreIntelligence {
  unlockCards: UnlockCard[];
  readinessSummary: string;   // investor-facing, 3 sentences
  generatedAt: string;
}

export async function generateScoreIntelligence(
  parameters: ParameterScore[],
  score: number,
  grade: string,
  sector: string,
  stage: string,
): Promise<ScoreIntelligence> {
  // Build a compact indicator summary for the prompt
  const indicatorLines = parameters.flatMap(p =>
    p.indicators
      .filter(i => !i.excluded)
      .map(i => `${i.id} (${p.name} — ${i.name}): ${i.rawScore.toFixed(1)}/5${i.vcAlert ? ` ⚠ ${i.vcAlert}` : ''}`)
  );

  const weakestIndicators = parameters
    .flatMap(p => p.indicators.filter(i => !i.excluded).map(i => ({ ...i, paramId: p.id, paramName: p.name })))
    .sort((a, b) => a.rawScore - b.rawScore)
    .slice(0, 6);

  const prompt = `You are a venture capital associate analysing a startup's Q-Score to identify the highest-leverage improvement opportunities.

Q-Score: ${score}/100 (Grade ${grade})
Sector: ${sector}
Stage: ${stage}

All indicators (ID, parameter, indicator name, score 0-5):
${indicatorLines.join('\n')}

TASK: Identify the top 3 indicators where a score improvement would have the highest impact on the overall score. For each, return a specific, actionable recommendation.

Return ONLY valid JSON:
{
  "unlockCards": [
    {
      "indicatorId": "1.3",
      "indicatorName": "Willingness to Pay",
      "parameterId": "p1",
      "currentScore": 2,
      "targetScore": 4,
      "estimatedPointGain": 6,
      "action": "Run 3 structured customer interviews this week focusing on pricing sensitivity. Document specific quotes about budget and competing spend. Upload the notes to Nova's interview section."
    }
  ],
  "readinessSummary": "This ${sector} startup at ${stage} stage shows [strengths]. The core investor risk is [specific weakness from the data]. The fastest path to a stronger score is [specific action referencing the data]."
}

Rules:
- estimatedPointGain must be realistic (1–12 pts range)
- action must be concrete and specific to this sector/stage — no generic advice
- readinessSummary must be exactly 3 sentences`;

  const raw = await tieredText('premium', [
    { role: 'system', content: prompt },
    { role: 'user', content: 'Generate the score intelligence now.' },
  ], { maxTokens: 800 });

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON block');
    const parsed = JSON.parse(match[0]) as {
      unlockCards: Array<{
        indicatorId: string; indicatorName: string; parameterId: string;
        currentScore: number; targetScore: number; estimatedPointGain: number; action: string;
      }>;
      readinessSummary: string;
    };

    const unlockCards: UnlockCard[] = (parsed.unlockCards ?? []).slice(0, 3).map(c => ({
      ...c,
      agentId: INDICATOR_AGENTS[c.indicatorId],
    }));

    return {
      unlockCards,
      readinessSummary: parsed.readinessSummary ?? '',
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Fallback: derive unlock cards deterministically from weak indicators
    const unlockCards: UnlockCard[] = weakestIndicators.slice(0, 3).map(ind => ({
      indicatorId:       ind.id,
      indicatorName:     ind.name,
      parameterId:       (ind as IndicatorScore & { paramId: string }).paramId,
      currentScore:      ind.rawScore,
      targetScore:       Math.min(5, ind.rawScore + 2),
      estimatedPointGain: Math.round((Math.min(5, ind.rawScore + 2) - ind.rawScore) * 2),
      action: `Improve evidence for ${ind.name}. Speak to the relevant agent for guidance.`,
      agentId: INDICATOR_AGENTS[ind.id],
    }));
    return {
      unlockCards,
      readinessSummary: `This ${sector} startup at ${stage} stage scores ${score}/100. Key improvement areas are ${weakestIndicators.slice(0, 2).map(i => i.name).join(' and ')}. Addressing these would materially strengthen investor confidence.`,
      generatedAt: new Date().toISOString(),
    };
  }
}
