/**
 * Threshold calibration script for the independent artifact evaluator.
 *
 * Pulls recent Patel artifacts from production, runs them through
 * evaluateArtifactIndependently(), and prints a score distribution
 * so you can set the regen threshold based on actual data instead of
 * a provisional 70.
 *
 * Run:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/calibrate-eval-threshold.ts
 *
 * Or with a .env.local file:
 *   npx dotenv -e .env.local -- npx tsx scripts/calibrate-eval-threshold.ts
 */

import { createClient } from '@supabase/supabase-js'
import { evaluateArtifactIndependently } from '../lib/agents/patel-evaluator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  const { data: artifacts, error } = await supabase
    .from('agent_artifacts')
    .select('id, artifact_type, content, created_at')
    .eq('agent_id', 'patel')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) { console.error('DB error:', error.message); process.exit(1) }
  if (!artifacts?.length) { console.log('No Patel artifacts found'); return }

  console.log(`Evaluating ${artifacts.length} artifacts...\n`)

  const results: {
    id: string
    type: string
    score: number
    gaps: number
    confidenceIssues: number
  }[] = []

  for (const artifact of artifacts) {
    try {
      const ev = await evaluateArtifactIndependently(
        artifact.artifact_type,
        artifact.content as Record<string, unknown>,
      )
      results.push({
        id: artifact.id,
        type: artifact.artifact_type,
        score: ev.qualityScore,
        gaps: ev.gaps.length,
        confidenceIssues: ev.confidenceIssues.length,
      })
    } catch {
      results.push({ id: artifact.id, type: artifact.artifact_type, score: -1, gaps: 0, confidenceIssues: 0 })
    }
    process.stdout.write('.')
  }

  const valid = results.filter(r => r.score >= 0)
  const scores = valid.map(r => r.score).sort((a, b) => a - b)

  console.log('\n\n--- Score distribution ---')
  const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  for (let i = 0; i < buckets.length - 1; i++) {
    const lo = buckets[i], hi = buckets[i + 1]
    const count = scores.filter(s => s >= lo && s < hi).length
    const bar = '█'.repeat(count)
    console.log(`${String(lo).padStart(3)}–${hi}: ${bar} ${count}`)
  }

  const below70 = scores.filter(s => s < 70).length
  const pct = ((below70 / scores.length) * 100).toFixed(1)
  const p10 = scores[Math.floor(scores.length * 0.10)] ?? 0
  const p25 = scores[Math.floor(scores.length * 0.25)] ?? 0
  const p50 = scores[Math.floor(scores.length * 0.50)] ?? 0

  console.log(`\nAt threshold 70: ${below70}/${scores.length} artifacts would regen (${pct}%)`)
  console.log(`p10: ${p10}  p25: ${p25}  p50: ${p50}`)

  if (below70 / scores.length > 0.30) {
    console.log(`\n⚠  >30% regen rate — threshold 70 is too aggressive. Consider p25 (${p25}) as the threshold.`)
  } else if (below70 / scores.length < 0.05) {
    console.log(`\n⚠  <5% regen rate — evaluator may be too lenient. Consider raising threshold above 70.`)
  } else {
    console.log(`\n✓  Regen rate is in the 5–30% target zone. Threshold 70 is defensible.`)
  }

  console.log('\n--- By artifact type ---')
  const types = [...new Set(valid.map(r => r.type))].sort()
  for (const t of types) {
    const typeScores = valid.filter(r => r.type === t).map(r => r.score)
    const avg = (typeScores.reduce((a, b) => a + b, 0) / typeScores.length).toFixed(1)
    const lo = Math.min(...typeScores)
    const hi = Math.max(...typeScores)
    const ciAvg = (valid.filter(r => r.type === t).reduce((a, r) => a + r.confidenceIssues, 0) / typeScores.length).toFixed(1)
    console.log(`${t.padEnd(32)} n=${String(typeScores.length).padStart(3)}  avg=${avg}  range=${lo}–${hi}  ci=${ciAvg}`)
  }

  if (results.some(r => r.score < 0)) {
    const failed = results.filter(r => r.score < 0).length
    console.log(`\n${failed} artifact(s) failed to evaluate (evaluator threw or returned malformed JSON)`)
  }
}

main().catch(console.error)
