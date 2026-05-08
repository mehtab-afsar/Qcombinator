import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

/**
 * Trigger in-app deal-flow notifications for investors when a startup's
 * Q-Score improves significantly after profile-builder submit.
 *
 * Fire-and-forget: call with void and .catch(() => {}) at the call site.
 *
 * Matching logic: investors whose sectors or stages arrays overlap with
 * the founder's industry / stage receive a notification row in the
 * `notifications` table (type = 'qscore_update').
 *
 * Only fires when the score improvement is >= 5 points compared to the
 * previous profile_builder submission (not agent-completion nudges).
 */
export async function triggerDealFlowAlerts(
  founderId: string,
  newScore: number,
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Get previous profile_builder score to measure real improvement
    const { data: history } = await supabase
      .from('qscore_history')
      .select('overall_score')
      .eq('user_id', founderId)
      .eq('data_source', 'profile_builder')
      .order('calculated_at', { ascending: false })
      .limit(2)

    if (!history || history.length < 2) return // No previous submission to compare

    const previousScore = history[1].overall_score as number
    const improvement = newScore - previousScore
    if (improvement < 5) return // Only alert on significant improvement

    // Only alert when founder is in the investor-visible threshold (>= 50)
    if (newScore < 50) return

    // Get founder profile for sector/stage matching
    const { data: founder } = await supabase
      .from('founder_profiles')
      .select('industry, stage, startup_name, full_name')
      .eq('user_id', founderId)
      .single()

    if (!founder?.industry || !founder?.stage) return

    // Sanitize for PostgREST contains filter
    const safeIndustry = String(founder.industry).replace(/[{},"\\]/g, '')
    const safeStage    = String(founder.stage).replace(/[{},"\\]/g, '')

    // Find investors whose sectors or stages overlap with this founder
    const { data: investors, error } = await supabase
      .from('investor_profiles')
      .select('user_id, deal_flow_notifications')
      .or(`sectors.cs.{${safeIndustry}},stages.cs.{${safeStage}}`)
      .neq('user_id', founderId)
      .limit(100)

    if (error || !investors?.length) return

    // Filter to those who have deal_flow_notifications enabled (null = opt-in by default)
    const eligible = investors.filter(inv => inv.deal_flow_notifications !== false)
    if (!eligible.length) return

    const companyName = founder.startup_name ?? founder.full_name ?? 'A startup'

    // Insert in-app notifications in bulk
    const notificationRows = eligible.map(inv => ({
      user_id:  inv.user_id,
      type:     'qscore_update',
      title:    `${companyName} Q-Score improved by ${improvement} points`,
      body:     `${companyName} now has a Q-Score of ${newScore}. Their profile matches your investment thesis.`,
      metadata: {
        founder_id:   founderId,
        new_score:    newScore,
        prev_score:   previousScore,
        improvement,
        industry:     founder.industry,
        stage:        founder.stage,
      },
      read: false,
    }))

    const { error: insertErr } = await supabase
      .from('notifications')
      .insert(notificationRows)

    if (insertErr) {
      log.error('triggerDealFlowAlerts notifications insert', { insertErr })
    }
  } catch (err) {
    log.error('triggerDealFlowAlerts', { err })
  }
}
