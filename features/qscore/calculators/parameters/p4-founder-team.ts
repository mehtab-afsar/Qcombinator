/**
 * Edge Alpha IQ Score v2 — P4: Founder / Team
 * 5 indicators: Domain Depth, Founder-Market Fit, Founder Experience,
 *               Leadership Coverage, Team Cohesion
 *
 * rawScore: 1.0–5.0 in 0.5 increments (0 = excluded)
 * Confidence = metadata only, never multiplied into rawScore
 */

import type { AssessmentData, IndicatorScore, ScoreStage } from '../../types/qscore.types'
import type { DataQuality } from '../../types/data-quality.types'

function snap(value: number): number {
  return Math.round(value * 2) / 2
}

function clamp(v: number, min = 1.0, max = 5.0): number {
  return Math.min(max, Math.max(min, v))
}

const KEY_FUNCTIONS = ['tech', 'product', 'sales', 'marketing', 'finance', 'ops']

const INSIDER_FIT_RE =
  /\b(i.?ve|i have|i was|i worked|i built|i ran|i led|i founded|i managed|previously|before this|last company|former|ex.?|background in|spent \d+ years|lived this|personal experience|saw this firsthand)\b/i

// Archetype detection — Sequoia "Why you?" framework
// Insider: deep industry operator who lived the problem
// Academic: invented / researched the core technology
// Outsider: cross-industry transfer of a non-obvious pattern
const ACADEMIC_RE =
  /\b(phd|ph\.d|research|published|lab|university|professor|thesis|paper|invention|patent|algorithm|novel approach|breakthrough|discovered)\b/i
const OUTSIDER_RE =
  /\b(different industry|transfer|analogy|similar to|reminded me of|worked in \w+ before|cross.industry|unexpected|contrarian|no one in this space|outside perspective)\b/i

const PRIOR_EXP_RE =
  /\b(exited|acquired|sold|ipo|founded|built|scaled|raised|series|led|managed|operator|executive|director|vp|chief|head of)\b/i

// ── 4.1 Domain Depth ──────────────────────────────────────────────────────────

function score_4_1_DomainDepth(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p4 = data.p4 ?? {}
  const domainYears = p4.domainYears
  const originText = data.problemStory ?? ''

  // Exclude when no domain experience data at all
  if (domainYears === undefined && (!originText || originText.length < 15)) {
    return { id: '4.1', name: 'Domain Depth', rawScore: 0, excluded: true,
      exclusionReason: 'no domain experience data provided',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0.5, reasons: [] } }
  }

  let raw: number
  let confidence: number

  if (domainYears !== undefined) {
    confidence = 0.80  // specific number given
    if (domainYears < 1) raw = 1.0
    else if (domainYears < 3) {
      const pos = (domainYears - 1) / 2
      raw = 1.0 + pos * 2  // 1.0–3.0
    }
    else if (domainYears < 5) raw = 3.0
    else if (domainYears < 7) {
      const pos = (domainYears - 5) / 2
      raw = 3.0 + (pos >= 0.5 ? 0.5 : 0)
    }
    else if (domainYears < 10) raw = 4.0
    else raw = 5.0
  } else {
    // Infer from problem story
    const yearMatch = originText.match(/(\d+)\s*year/i)
    confidence = 0.50
    if (yearMatch) {
      const inferred = parseInt(yearMatch[1])
      if (inferred >= 10) raw = 4.5
      else if (inferred >= 7) raw = 4.0
      else if (inferred >= 5) raw = 3.5
      else if (inferred >= 3) raw = 3.0
      else raw = 2.0
    } else if (originText.length >= 150 && INSIDER_FIT_RE.test(originText)) {
      raw = 2.5
    } else {
      raw = 1.5
    }
  }

  const dq: DataQuality = {
    source: domainYears !== undefined ? 'founder_claim' : 'founder_claim',
    verificationLevel: 'unverified',
    confidence,
    reasons: [domainYears !== undefined ? `${domainYears} years explicit` : 'years inferred from narrative'],
  }

  return { id: '4.1', name: 'Domain Depth', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 4.2 Founder-Market Fit ────────────────────────────────────────────────────

function score_4_2_FounderMarketFit(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p4 = data.p4 ?? {}
  const fmfText = p4.founderMarketFit ?? data.problemStory ?? ''

  if (!fmfText || fmfText.length < 15) {
    return { id: '4.2', name: 'Founder-Market Fit', rawScore: 0, excluded: true,
      exclusionReason: 'no founder-market fit data provided',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0.5, reasons: [] } }
  }

  const hasInsiderFit = INSIDER_FIT_RE.test(fmfText)
  const isAcademic = ACADEMIC_RE.test(fmfText)
  const isOutsider = OUTSIDER_RE.test(fmfText)
  const isPersonal = /\b(personal|myself|family|friend|colleague|team|we all)\b/i.test(fmfText)
  const isSpecific = fmfText.length >= 150
  const hasConcreteDetail = /\$[\d,]+|\d+\s*(months|years|customers|users|companies)|[A-Z][a-z]+\s+(Inc|Corp|LLC|Ltd|company)/i.test(fmfText)

  // Archetype scoring — Sequoia "Why you?" framework:
  //   Insider (lived the problem, operator) → highest signal, 4.0–5.0
  //   Academic (invented the tech, deep research) → strong signal, 4.0–4.5
  //   Outsider (cross-industry transfer, non-obvious insight) → medium signal, 3.0–4.0
  //   No clear archetype → weak, 1.0–2.5
  let raw: number
  if (!fmfText || fmfText.length < 20) {
    raw = 1.0
  } else if (hasInsiderFit && isPersonal && isSpecific && hasConcreteDetail) {
    // Insider: lived it, personal stake, specific detail — maximum conviction
    raw = 5.0
  } else if (hasInsiderFit && isSpecific && (isPersonal || hasConcreteDetail)) {
    // Insider: strong narrative with evidence
    raw = 4.0
  } else if (isAcademic && isSpecific && hasConcreteDetail) {
    // Academic: deep technical expertise with specificity
    raw = 4.5
  } else if (isAcademic && isSpecific) {
    // Academic: research depth present
    raw = 4.0
  } else if (isOutsider && isSpecific && hasConcreteDetail) {
    // Outsider: cross-industry with articulated non-obvious insight
    raw = 3.5
  } else if (isOutsider && isSpecific) {
    // Outsider: pattern transfer, less concrete
    raw = 3.0
  } else if (hasInsiderFit && !isSpecific) {
    // Insider signals but narrative too thin to confirm
    raw = 2.5
  } else if (fmfText.length >= 60) {
    // Some narrative, no archetype detected
    raw = 2.0
  } else {
    raw = 1.5
  }

  // Determine detected archetype for vcAlert metadata
  const archetype = hasInsiderFit ? 'insider' : isAcademic ? 'academic' : isOutsider ? 'outsider' : 'unclear'

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: hasConcreteDetail ? 'doc_supported' : 'unverified',
    confidence: (hasInsiderFit || isAcademic) ? (hasConcreteDetail ? 0.80 : 0.65) : isOutsider ? 0.60 : 0.40,
    reasons: [
      `archetype: ${archetype}`,
      hasConcreteDetail ? 'concrete detail present' : 'vague narrative',
      isPersonal ? 'personal stake stated' : 'no personal stake mentioned',
    ],
  }

  return {
    id: '4.2', name: 'Founder-Market Fit',
    rawScore: snap(clamp(raw)),
    excluded: false,
    dataQuality: dq,
    vcAlert: archetype === 'unclear' ? 'No clear founder archetype detected — VC may probe "Why you?" harder' : undefined,
  }
}

// ── 4.3 Founder Experience ────────────────────────────────────────────────────

function score_4_3_FounderExperience(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p4 = data.p4 ?? {}
  const priorExits = p4.priorExits
  const expText = `${data.advantageExplanation ?? ''} ${data.problemStory ?? ''}`.trim()

  if (priorExits === undefined && expText.length < 15) {
    return { id: '4.3', name: 'Founder Experience', rawScore: 0, excluded: true,
      exclusionReason: 'no founder experience data provided',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0.5, reasons: [] } }
  }

  let raw: number
  let confidence: number

  if (priorExits !== undefined) {
    confidence = 0.75
    if (priorExits === 0) raw = 2.0   // first-time founder, explicit
    else if (priorExits === 1) raw = 3.5
    else if (priorExits === 2) raw = 4.5
    else raw = 5.0                     // 3+ exits
  } else {
    const hasExp = PRIOR_EXP_RE.test(expText)
    const hasSeniorRole = /\b(ceo|cto|cfo|vp|director|head of|chief|partner|investor|board)\b/i.test(expText)
    confidence = 0.50
    if (hasExp && hasSeniorRole) raw = 3.0
    else if (hasExp) raw = 2.5
    else raw = 1.5
  }

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: priorExits !== undefined ? 'doc_supported' : 'unverified',
    confidence,
    reasons: [priorExits !== undefined ? `${priorExits} exits explicit` : 'exits inferred from text'],
  }

  return { id: '4.3', name: 'Founder Experience', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 4.4 Leadership Coverage ───────────────────────────────────────────────────

function score_4_4_LeadershipCoverage(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p4 = data.p4 ?? {}
  const coverage = p4.teamCoverage ?? []
  const normalised = coverage.map(c => c.toLowerCase())
  const coveredCount = KEY_FUNCTIONS.filter(fn => normalised.some(c => c.includes(fn))).length

  // Fallback: scan advantage explanation
  const advText = (data.advantageExplanation ?? '').toLowerCase()
  const inferredCount = KEY_FUNCTIONS.filter(fn => advText.includes(fn)).length
  const effective = Math.max(coveredCount, inferredCount)

  if (effective === 0 && coverage.length === 0 && advText.length < 15) {
    return { id: '4.4', name: 'Leadership Coverage', rawScore: 0, excluded: true,
      exclusionReason: 'no leadership coverage data provided',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0.5, reasons: [] } }
  }

  let raw: number
  if (effective === 0) raw = 1.5
  else if (effective === 1) raw = 2.0
  else if (effective === 2) raw = 3.0
  else if (effective === 3) raw = 3.5
  else if (effective >= 4) raw = 5.0
  else raw = 2.5

  const dq: DataQuality = {
    source: coverage.length > 0 ? 'founder_claim' : 'founder_claim',
    verificationLevel: coverage.length > 0 ? 'doc_supported' : 'unverified',
    confidence: coverage.length > 0 ? 0.70 : 0.50,
    reasons: [coverage.length > 0 ? `${coveredCount}/${KEY_FUNCTIONS.length} roles explicit` : 'coverage inferred from text'],
  }

  return { id: '4.4', name: 'Leadership Coverage', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── 4.5 Team Cohesion ─────────────────────────────────────────────────────────

function score_4_5_TeamCohesion(data: AssessmentData, _stage: ScoreStage): IndicatorScore {
  const p4 = data.p4 ?? {}
  const cohesionMonths = p4.teamCohesionMonths
  const teamChurnRecent = (data as AssessmentData & { teamChurnRecent?: boolean }).teamChurnRecent ?? false
  const cohText = data.problemStory ?? ''

  if (cohesionMonths === undefined && cohText.length < 15) {
    return { id: '4.5', name: 'Team Cohesion', rawScore: 0, excluded: true,
      exclusionReason: 'no team cohesion data provided',
      dataQuality: { source: 'founder_claim', verificationLevel: 'unverified', confidence: 0.5, reasons: [] } }
  }

  let raw: number
  let confidence: number

  if (cohesionMonths !== undefined) {
    confidence = 0.75
    if (cohesionMonths < 3) raw = 1.5
    else if (cohesionMonths < 6) raw = 2.0
    else if (cohesionMonths < 12) {
      const pos = (cohesionMonths - 6) / 6
      raw = 2.0 + (pos >= 0.5 ? 0.5 : 0)
    }
    else if (cohesionMonths < 24) raw = 4.0
    else raw = 5.0
  } else {
    confidence = 0.45
    if (/\b(co.?founder|founding team|built together|together for|known each other)\b/i.test(cohText)) {
      raw = 2.5
    } else {
      raw = 1.5
    }
  }

  // Penalise recent churn (metadata flag only — adjust confidence, not rawScore)
  if (teamChurnRecent) {
    raw = Math.max(1.0, raw - 1.0)
  }

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: cohesionMonths !== undefined ? 'doc_supported' : 'unverified',
    confidence,
    reasons: [
      cohesionMonths !== undefined ? `${cohesionMonths}mo together` : 'cohesion not specified',
      teamChurnRecent ? 'recent team churn reported' : '',
    ].filter(Boolean),
  }

  return { id: '4.5', name: 'Team Cohesion', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function scoreP4(
  data: AssessmentData,
  stage: ScoreStage
): IndicatorScore[] {
  return [
    score_4_1_DomainDepth(data, stage),
    score_4_2_FounderMarketFit(data, stage),
    score_4_3_FounderExperience(data, stage),
    score_4_4_LeadershipCoverage(data, stage),
    score_4_5_TeamCohesion(data, stage),
  ]
}

/** @deprecated Use scoreP4() in the IQ Score v2 pipeline */
export function scoreP4FounderTeam(
  data: AssessmentData
): { score: number; rawPoints: number; maxPoints: number; sub: Record<string, number> } {
  const indicators = scoreP4(data, 'mid')
  const sub: Record<string, number> = {}
  let totalRaw = 0
  for (const ind of indicators) {
    const pct = (ind.rawScore / 5) * 20
    sub[ind.id] = Math.round(pct)
    totalRaw += pct
  }
  return { score: Math.round(Math.min(100, totalRaw)), rawPoints: Math.round(totalRaw), maxPoints: 100, sub }
}
