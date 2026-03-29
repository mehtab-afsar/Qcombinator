/**
 * Edge Alpha IQ Score v2 — P1: Market Readiness
 * 5 indicators: Early Signal, Willingness to Pay, Speed, Durability, Scale
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

function defaultDQ(confidence = 0.6): DataQuality {
  return { source: 'founder_claim', verificationLevel: 'unverified', confidence, reasons: [] }
}

// ── Rubric tables ──────────────────────────────────────────────────────────────

const RUBRIC_1_1: Record<ScoreStage, Record<number, string>> = {
  early:  { 1: 'No customer conversations', 2: '1–2 informal chats', 3: '3–9 structured conversations', 4: '10–24 structured conversations', 5: '25+ structured conversations or signed LOI' },
  mid:    { 1: 'No customers engaged', 2: '<5 paid pilots', 3: '5–19 conversations + 1 paid pilot', 4: '20–49 paying or LOI', 5: '50+ paying or strong LOI portfolio' },
  growth: { 1: '<50 customers', 2: '50–199', 3: '200–499', 4: '500–999', 5: '1000+ paying customers' },
}

const RUBRIC_1_2: Record<ScoreStage, Record<number, string>> = {
  early:  { 1: 'No willingness-to-pay evidence', 2: 'Vague verbal intent', 3: 'Specific price mentioned in conversation', 4: 'Pilot paid or LOI with price', 5: 'Signed contract with price or prepayment received' },
  mid:    { 1: 'Free users only, no conversion', 2: 'Some free-to-paid conversion <5%', 3: '5–15% free-to-paid or $0–1K MRR', 4: '$1K–10K MRR or consistent paid renewals', 5: '$10K+ MRR or enterprise deal signed' },
  growth: { 1: 'Revenue declining or stalled', 2: '<5% MoM growth', 3: '5–15% MoM', 4: '15–30% MoM', 5: '30%+ MoM or multi-year contracts' },
}

const RUBRIC_1_3: Record<ScoreStage, Record<number, string>> = {
  early:  { 1: 'No pipeline', 2: '1–2 informal conversations in progress', 3: '3–5 active prospects', 4: '6–10 active prospects + 1 near-close', 5: '10+ active pipeline, formal sales process' },
  mid:    { 1: 'No active sales motion', 2: 'Founder-only selling, no structure', 3: 'Defined ICP, 3–5 active deals', 4: 'Repeatable 1–4 week sales cycle', 5: 'Predictable pipeline, <1 week close time' },
  growth: { 1: 'Sales cycle >3 months', 2: '1–3 months cycle', 3: '2–4 week cycle', 4: '1–2 week cycle', 5: '<1 week cycle, self-serve or PLG' },
}

const RUBRIC_1_4: Record<ScoreStage, Record<number, string>> = {
  early:  { 1: 'No repeat engagement', 2: '1 returning user/prospect', 3: '2–3 returning or referral from early user', 4: 'Pilot customer wants to expand', 5: 'Expansion or referral from paying customer' },
  mid:    { 1: 'High churn, no renewals', 2: '>40% annual churn', 3: '20–40% annual churn', 4: '10–20% annual churn', 5: '<10% annual churn, net revenue retention >100%' },
  growth: { 1: 'NRR <80%', 2: 'NRR 80–90%', 3: 'NRR 91–100%', 4: 'NRR 101–110%', 5: 'NRR 111%+' },
}

const RUBRIC_1_5: Record<ScoreStage, Record<number, string>> = {
  early:  { 1: 'Single niche, no expansion narrative', 2: 'One segment identified', 3: 'Primary ICP + 1 adjacent segment described', 4: 'Clear beachhead + expansion map', 5: 'Beachhead validated + 2+ confirmed adjacent markets' },
  mid:    { 1: 'No expansion plan', 2: 'Vague second segment', 3: 'One adjacent market in pilots', 4: 'Two segments with revenue', 5: 'Three+ segments or international expansion live' },
  growth: { 1: 'Single market, plateau risk', 2: 'Second market planned', 3: 'Second market live, <20% revenue', 4: 'Second market >20% revenue', 5: 'Platform model, multi-market with compounding network effects' },
}

// ── Scoring functions ──────────────────────────────────────────────────────────

function score_1_1_EarlySignal(data: AssessmentData, stage: ScoreStage): IndicatorScore {
  const count = data.conversationCount ?? 0
  const hasCustomers = data.hasPayingCustomers ?? false
  const commitment = data.customerCommitment ?? ''
  const customerList = data.customerList ?? []

  let raw: number
  if (stage === 'early') {
    if (count === 0) raw = 1.0
    else if (count < 3) raw = 2.0
    else if (count < 10) raw = 3.0
    else if (count < 25) raw = 4.0
    else raw = 5.0
    if (commitment.match(/loi|signed|contract/i)) raw = Math.min(5.0, raw + 0.5)
  } else if (stage === 'mid') {
    if (!hasCustomers && count < 5) raw = 1.0
    else if (count < 10) raw = 2.0
    else if (count < 20) raw = 3.0
    else if (count < 50) raw = 4.0
    else raw = 5.0
  } else {
    if (count < 50) raw = 1.0
    else if (count < 200) raw = 2.0
    else if (count < 500) raw = 3.0
    else if (count < 1000) raw = 4.0
    else raw = 5.0
  }

  const confidence = customerList.length > 0 ? 0.75 : 0.55
  const dq: DataQuality = {
    source: commitment.match(/doc|signed|loi/i) ? 'document' : 'founder_claim',
    verificationLevel: commitment.match(/signed|contract/i) ? 'doc_supported' : 'unverified',
    confidence,
    reasons: customerList.length > 0 ? ['named customers provided'] : ['self-reported count only'],
  }

  return { id: '1.1', name: 'Early Signal', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

function score_1_2_WillingnessToPay(data: AssessmentData, stage: ScoreStage): IndicatorScore {
  const excluded = stage === 'early' && !data.hasPayingCustomers && (data.conversationCount ?? 0) < 3
  if (excluded) {
    return {
      id: '1.2', name: 'Willingness to Pay', rawScore: 0, excluded: true,
      exclusionReason: 'pre-product, no pilots yet',
      dataQuality: defaultDQ(0.5),
    }
  }

  const hasPaying = data.hasPayingCustomers ?? false
  const mrr = data.financial?.mrr ?? 0
  const detail = data.payingCustomerDetail ?? ''

  let raw: number
  if (stage === 'early') {
    if (!hasPaying && !detail) raw = 1.0
    else if (detail.match(/verbal|intent|maybe/i)) raw = 2.0
    else if (detail.match(/price|quoted|\$/i)) raw = 3.0
    else if (hasPaying || detail.match(/pilot|paid/i)) raw = 4.0
    else raw = 3.0
    if (detail.match(/signed|contract|prepay/i)) raw = 5.0
  } else if (stage === 'mid') {
    if (mrr <= 0) raw = 1.0
    else if (mrr < 1000) raw = 2.5
    else if (mrr < 10000) raw = snap(3.0 + (mrr - 1000) / (10000 - 1000))
    else raw = 5.0
  } else {
    const mrrGrowth = mrr > 0 ? mrr : 0
    if (mrrGrowth <= 0) raw = 1.0
    else if (mrrGrowth < 10000) raw = 2.0
    else if (mrrGrowth < 50000) raw = 3.0
    else if (mrrGrowth < 200000) raw = 4.0
    else raw = 5.0
  }

  const dq: DataQuality = {
    source: mrr > 0 ? 'api_verified' : (hasPaying ? 'document' : 'founder_claim'),
    verificationLevel: mrr > 0 ? 'verified' : (hasPaying ? 'doc_supported' : 'unverified'),
    confidence: mrr > 0 ? 0.90 : (hasPaying ? 0.70 : 0.55),
    reasons: [mrr > 0 ? 'MRR from financial data' : hasPaying ? 'paying customer detail' : 'verbal claim only'],
  }

  return { id: '1.2', name: 'Willingness to Pay', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

function score_1_3_Speed(data: AssessmentData, stage: ScoreStage): IndicatorScore {
  const pipeline = data.customerCommitment ?? ''
  const salesCycle = data.salesCycleLength ?? 'unknown'
  const activePipeline = (data.conversationCount ?? 0) > 0 || pipeline.length > 10

  const excluded = !activePipeline && stage === 'early'
  if (excluded) {
    return {
      id: '1.3', name: 'Speed', rawScore: 0, excluded: true,
      exclusionReason: 'no active pipeline yet',
      dataQuality: defaultDQ(0.5),
    }
  }

  let raw: number
  if (salesCycle === '3+ months') raw = 1.5
  else if (salesCycle === '1-3 months') raw = 2.5
  else if (salesCycle === '1-4 weeks') raw = 3.5
  else if (salesCycle === '<1 week') raw = 5.0
  else {
    // Infer from stage
    if (stage === 'early') raw = activePipeline ? 3.0 : 1.5
    else if (stage === 'mid') raw = 3.0
    else raw = 3.5
  }

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: salesCycle !== 'unknown' ? 0.65 : 0.45,
    reasons: [salesCycle !== 'unknown' ? `cycle: ${salesCycle}` : 'cycle unknown, inferred from stage'],
  }

  return { id: '1.3', name: 'Speed', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// Extract numeric NDR from text like "NDR 118%", "net dollar retention 125", "NRR 110%"
function parseNDR(text: string): number | null {
  const m = text.match(/\b(?:ndr|nrr|net\s+(?:dollar\s+)?retention)[^\d]*(\d{2,3}(?:\.\d+)?)\s*%?/i)
  return m ? parseFloat(m[1]) : null
}

// Extract numeric D30 from text like "D30 42%", "day-30 retention 55%", "30-day retention 38"
function parseD30(text: string): number | null {
  const m = text.match(/\b(?:d30|day[\s-]30|30[\s-]day\s+retention)[^\d]*(\d{1,3}(?:\.\d+)?)\s*%?/i)
  return m ? parseFloat(m[1]) : null
}

function score_1_4_Durability(data: AssessmentData, stage: ScoreStage): IndicatorScore {
  const excluded = !data.hasPayingCustomers && (data.customerList ?? []).length === 0 && stage !== 'growth'
  if (excluded) {
    return {
      id: '1.4', name: 'Durability', rawScore: 0, excluded: true,
      exclusionReason: 'no customers yet',
      dataQuality: defaultDQ(0.5),
    }
  }

  const retention = data.hasRetention
  const retentionDetail = data.retentionDetail ?? ''
  const hasPaying = data.hasPayingCustomers ?? false
  const isConsumer = /\b(consumer|b2c|user|app|mobile|game|social|content)\b/i.test(
    data.customerType ?? retentionDetail
  )

  // Extract quantitative signals if present
  const ndrValue = parseNDR(retentionDetail)
  const d30Value = parseD30(retentionDetail)

  let raw: number
  let retentionMethod = 'qualitative'

  if (stage === 'early') {
    if (!hasPaying) {
      raw = 1.5
    } else if (isConsumer && d30Value !== null) {
      // Consumer early: D30 brackets (a16z / Index Ventures standard)
      retentionMethod = 'd30'
      if (d30Value >= 50) raw = 5.0       // exceptional — product habit formed
      else if (d30Value >= 40) raw = 4.0  // strong
      else if (d30Value >= 30) raw = 3.0  // acceptable
      else if (d30Value >= 20) raw = 2.0  // weak
      else raw = 1.5                      // poor
    } else if (!retention) {
      raw = 2.0
    } else if (retentionDetail.match(/expand|renewal|referral/i)) {
      raw = 4.5
    } else {
      raw = 3.0
    }
  } else if (stage === 'mid') {
    if (!retention) {
      raw = 2.0
    } else if (isConsumer && d30Value !== null) {
      // Consumer mid: D30 brackets
      retentionMethod = 'd30'
      if (d30Value >= 50) raw = 5.0
      else if (d30Value >= 40) raw = 4.0
      else if (d30Value >= 30) raw = 3.0
      else if (d30Value >= 20) raw = 2.5
      else raw = 2.0
    } else if (ndrValue !== null) {
      // B2B mid: explicit NDR brackets (Sequoia / Insight Partners standard)
      retentionMethod = 'ndr'
      if (ndrValue >= 130) raw = 5.0      // best-in-class (Slack, Datadog tier)
      else if (ndrValue >= 120) raw = 4.5 // excellent
      else if (ndrValue >= 110) raw = 4.0 // strong (a16z Series A bar)
      else if (ndrValue >= 100) raw = 3.5 // healthy (net flat = still positive)
      else if (ndrValue >= 90)  raw = 2.5 // below par
      else raw = 1.5                      // churn-dominant
    } else if (retentionDetail.match(/nrr.*1[0-9][0-9]|expansion|upsell/i)) {
      raw = 4.5
    } else if (retentionDetail.match(/renew|churn.*<10/i)) {
      raw = 4.0
    } else if (retentionDetail.match(/churn.*10|churn.*20/i)) {
      raw = 3.0
    } else {
      raw = 2.5
    }
  } else {
    // growth stage
    if (!retention) {
      raw = 1.5
    } else if (isConsumer && d30Value !== null) {
      retentionMethod = 'd30'
      if (d30Value >= 50) raw = 5.0
      else if (d30Value >= 40) raw = 4.5
      else if (d30Value >= 30) raw = 3.5
      else if (d30Value >= 20) raw = 2.5
      else raw = 1.5
    } else if (ndrValue !== null) {
      retentionMethod = 'ndr'
      if (ndrValue >= 130) raw = 5.0
      else if (ndrValue >= 120) raw = 4.5
      else if (ndrValue >= 110) raw = 4.0
      else if (ndrValue >= 100) raw = 3.5
      else if (ndrValue >= 90)  raw = 2.5
      else raw = 1.5
    } else if (retentionDetail.match(/nrr.*1[12][0-9]/i)) {
      raw = 5.0
    } else if (retentionDetail.match(/nrr.*10[1-9]/i)) {
      raw = 4.0
    } else if (retentionDetail.match(/nrr.*9[1-9]/i)) {
      raw = 3.0
    } else {
      raw = 2.5
    }
  }

  const hasQuantitative = ndrValue !== null || d30Value !== null
  const dq: DataQuality = {
    source: hasQuantitative ? 'document' : retentionDetail.length > 20 ? 'document' : 'founder_claim',
    verificationLevel: hasQuantitative ? 'doc_supported' : retentionDetail.length > 20 ? 'doc_supported' : 'unverified',
    confidence: hasQuantitative ? 0.85 : retention ? 0.65 : 0.50,
    reasons: [
      retention ? `retention evidence present (${retentionMethod})` : 'no retention data',
      ndrValue !== null ? `NDR ${ndrValue}% stated` : d30Value !== null ? `D30 ${d30Value}% stated` : 'no numeric retention metric',
    ],
  }

  // VC alert: growth-stage B2B without explicit NDR is a gap top VCs probe
  const vcAlert = (stage === 'growth' && !isConsumer && ndrValue === null && retention)
    ? 'Growth-stage B2B: NDR not stated — VCs will require explicit net dollar retention figure'
    : undefined

  return { id: '1.4', name: 'Durability', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq, vcAlert }
}

function score_1_5_Scale(data: AssessmentData, stage: ScoreStage): IndicatorScore {
  const customers = data.targetCustomers ?? 0
  const customerList = data.customerList ?? []
  const p2 = data.p2 ?? {}
  const expansionDesc = p2.expansionPotential ?? ''

  let raw: number
  if (stage === 'early') {
    if (!expansionDesc && customerList.length === 0) raw = 1.5
    else if (expansionDesc.length < 50) raw = 2.0
    else if (expansionDesc.match(/adjacent|expand|international/i)) raw = 3.5
    else raw = 2.5
    if (expansionDesc.match(/pilot.*adjacent|validated.*second/i)) raw = Math.min(5.0, raw + 0.5)
  } else if (stage === 'mid') {
    if (!expansionDesc) raw = 1.5
    else if (customers > 0 && customers < 100) raw = 2.5
    else if (customers >= 100 && customers < 500) raw = 3.5
    else if (expansionDesc.match(/live.*second|second.*revenue/i)) raw = 4.0
    else raw = 3.0
  } else {
    if (!expansionDesc || customers < 500) raw = 2.0
    else if (expansionDesc.match(/platform|network effect|compounding/i)) raw = 5.0
    else if (expansionDesc.match(/multi-market|international/i)) raw = 4.0
    else raw = 3.0
  }

  const dq: DataQuality = {
    source: 'founder_claim',
    verificationLevel: 'unverified',
    confidence: expansionDesc.length > 50 ? 0.65 : 0.45,
    reasons: [expansionDesc.length > 50 ? 'expansion detail provided' : 'limited expansion evidence'],
  }

  return { id: '1.5', name: 'Scale', rawScore: snap(clamp(raw)), excluded: false, dataQuality: dq }
}

// ── Public export ─────────────────────────────────────────────────────────────

export function scoreP1(
  data: AssessmentData,
  stage: ScoreStage
): IndicatorScore[] {
  return [
    score_1_1_EarlySignal(data, stage),
    score_1_2_WillingnessToPay(data, stage),
    score_1_3_Speed(data, stage),
    score_1_4_Durability(data, stage),
    score_1_5_Scale(data, stage),
  ]
}
