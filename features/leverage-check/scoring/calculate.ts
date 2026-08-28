/**
 * Deterministic scoring for the 10x Founder Leverage Check. Pure function, no I/O — mirrors the
 * shape of features/qscore/calculators/q-score-calculator.ts (pure scorers → weighted
 * aggregation → banding) but is fully independent code/data. Do not import from featues/qscore.
 */

import { QUIZ_QUESTIONS, DIMENSION_ORDER, type AnswerLetter, type Dimension, type QuestionId } from './questions'

export type QuizAnswers = Record<QuestionId, AnswerLetter>

export type DimensionScores = Record<Dimension, number>

export type Archetype =
  | 'FOUNDER OPERATED'
  | 'AI ASSISTED'
  | 'AI LEVERAGED'
  | 'AGENTIC OPERATOR'
  | '10X FOUNDER'

export interface LeverageCheckResult {
  dimensionScores: DimensionScores
  multiple: number
  archetype: Archetype
  strongestDimension: Dimension
  weakestDimension: Dimension
}

// First match wins — bands are contiguous and cover [1.0, 10.0] with no gaps.
const ARCHETYPE_BANDS: readonly { min: number; max: number; archetype: Archetype }[] = [
  { min: 1.0, max: 1.9, archetype: 'FOUNDER OPERATED' },
  { min: 2.0, max: 3.4, archetype: 'AI ASSISTED' },
  { min: 3.5, max: 5.4, archetype: 'AI LEVERAGED' },
  { min: 5.5, max: 7.4, archetype: 'AGENTIC OPERATOR' },
  { min: 7.5, max: 10.0, archetype: '10X FOUNDER' },
]

function archetypeForMultiple(multiple: number): Archetype {
  const band = ARCHETYPE_BANDS.find(b => multiple >= b.min && multiple <= b.max)
  // multiple is always clamped to [1.0, 10.0] by construction, so a band always matches — the
  // fallback below is unreachable in practice, kept only so the function's return type is total.
  return band?.archetype ?? '10X FOUNDER'
}

function rawScoreFor(questionId: QuestionId, answer: AnswerLetter): number {
  const question = QUIZ_QUESTIONS.find(q => q.id === questionId)
  if (!question) throw new Error(`Unknown question id: ${questionId}`)
  const option = question.options.find(o => o.letter === answer)
  if (!option) throw new Error(`Unknown answer letter '${answer}' for ${questionId}`)
  return option.rawScore
}

export function calculateLeverageCheck(answers: QuizAnswers): LeverageCheckResult {
  // avgRawByDimension: each dimension's own raw (1-4) average, from its 1-2 questions.
  const avgRawByDimension = {} as Record<Dimension, number>
  for (const dimension of DIMENSION_ORDER) {
    const questionsForDim = QUIZ_QUESTIONS.filter(q => q.dimension === dimension)
    const rawScores = questionsForDim.map(q => rawScoreFor(q.id, answers[q.id]))
    avgRawByDimension[dimension] = rawScores.reduce((a, b) => a + b, 0) / rawScores.length
  }

  const dimensionScores = {} as DimensionScores
  for (const dimension of DIMENSION_ORDER) {
    dimensionScores[dimension] = Math.round(((avgRawByDimension[dimension] - 1) / 3) * 100)
  }

  // Equal-weighting across dimensions regardless of how many questions each has — the mean of
  // the 5 dimensions' own raw averages, NOT a flat mean across all 8 raw answers.
  const avgOfAll5 = DIMENSION_ORDER.reduce((sum, d) => sum + avgRawByDimension[d], 0) / DIMENSION_ORDER.length
  const multiple = Math.round((1 + ((avgOfAll5 - 1) / 3) * 9) * 10) / 10

  let strongestDimension: Dimension = DIMENSION_ORDER[0]
  let weakestDimension: Dimension = DIMENSION_ORDER[0]
  for (const dimension of DIMENSION_ORDER) {
    if (dimensionScores[dimension] > dimensionScores[strongestDimension]) strongestDimension = dimension
    if (dimensionScores[dimension] < dimensionScores[weakestDimension]) weakestDimension = dimension
  }

  return {
    dimensionScores,
    multiple,
    archetype: archetypeForMultiple(multiple),
    strongestDimension,
    weakestDimension,
  }
}
