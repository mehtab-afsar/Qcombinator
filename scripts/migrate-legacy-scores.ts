/**
 * Edge Alpha IQ Score v2 — Legacy Score Migration
 *
 * Strategy: Freeze legacy scores, do NOT re-score.
 * 1. Add score_version column to qscore_history (via migration SQL)
 * 2. Backfill existing rows: score_version = 'v1_prd'
 * 3. All new submissions: score_version = 'v2_iq'
 *
 * Run: npx ts-node scripts/migrate-legacy-scores.ts
 */

import { createClient } from '@supabase/supabase-js'

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  console.log('Starting legacy score migration...')

  // Backfill in batches of 500
  let offset = 0
  const batchSize = 500
  let totalUpdated = 0

  while (true) {
    const { data, error } = await supabase
      .from('qscore_history')
      .select('id')
      .is('score_version', null)
      .range(offset, offset + batchSize - 1)

    if (error) {
      console.error('Fetch error:', error)
      break
    }

    if (!data || data.length === 0) break

    const ids = data.map(r => r.id)
    const { error: updateErr } = await supabase
      .from('qscore_history')
      .update({ score_version: 'v1_prd' })
      .in('id', ids)

    if (updateErr) {
      console.error('Update error:', updateErr)
      break
    }

    totalUpdated += ids.length
    console.log(`Updated ${totalUpdated} rows...`)

    if (data.length < batchSize) break
    offset += batchSize
  }

  // Also backfill rows with empty score_version
  const { error: emptyErr } = await supabase
    .from('qscore_history')
    .update({ score_version: 'v1_prd' })
    .eq('score_version', '')

  if (emptyErr) console.warn('Empty string backfill warning:', emptyErr)

  console.log(`Migration complete. Total rows backfilled: ${totalUpdated}`)
}

run().catch(console.error)
