/**
 * Assessment Staleness Checker
 *
 * Detects when a founder's Q-Score assessment is likely out of date,
 * based on 4 observable conditions. When stale, inserts an agent_activity
 * row (type='assessment_stale') so the dashboard can show a prompt.
 *
 * Does NOT auto-adjust scores — just logs the signal.
 * Call this fire-and-forget after any significant founder activity.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DIMENSIONS } from '@/lib/constants/dimensions';
import { ARTIFACT_TYPES } from '@/lib/constants/artifact-types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function checkAssessmentStaleness(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  // Gather required data in parallel
  const [
    dealsResult,
    surveyResult,
    latestScoreResult,
    hiringArtifactResult,
    landingPageResult,
  ] = await Promise.all([
    supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('qscore_history')
      .select('overall_score, gtm_score, assessment_data, calculated_at')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from('agent_artifacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('artifact_type', ARTIFACT_TYPES.HIRING_PLAN),

    supabase
      .from('agent_activity')
      .select('id')
      .eq('user_id', userId)
      .eq('action_type', 'landing_page_deployed')
      .limit(1)
      .single(),
  ]);

  const dealCount        = dealsResult.count ?? 0;
  const surveyCount      = surveyResult.count ?? 0;
  const latestScore      = latestScoreResult.data;
  const hasHiringPlan    = (hiringArtifactResult.count ?? 0) > 0;
  const hasLandingPage   = !!landingPageResult.data;

  if (!latestScore) return; // No assessment to mark as stale

  const assessmentData   = (latestScore.assessment_data ?? {}) as Record<string, unknown>;
  const customerCount    = (assessmentData.payingCustomers as number | undefined) ?? 0;
  const teamSize         = (assessmentData.teamSize as number | undefined) ?? 0;
  const gtmScore         = latestScore.gtm_score ?? 0;
  const lastAssessmentAt = new Date(latestScore.calculated_at);
  const daysSince        = Math.floor((Date.now() - lastAssessmentAt.getTime()) / 86_400_000);

  const reasons: string[] = [];

  // Condition 1: Deal count > assessment customer count × 2
  if (dealCount > customerCount * 2) {
    reasons.push(`You now have ${dealCount} deals tracked — significantly more than your last reported customer count of ${customerCount}.`);
  }

  // Condition 2: >10 survey responses AND last assessment >7 days ago
  if (surveyCount > 10 && Date.now() - lastAssessmentAt.getTime() > SEVEN_DAYS_MS) {
    reasons.push(`You've collected ${surveyCount} PMF survey responses since your last assessment ${daysSince} days ago.`);
  }

  // Condition 3: Landing page deployed AND GTM score < 40
  if (hasLandingPage && gtmScore < 40) {
    reasons.push(`Your landing page is live but your GTM score (${gtmScore}) may not reflect this milestone.`);
  }

  // Condition 4: Hiring plan exists AND assessment team size < 3
  if (hasHiringPlan && teamSize < 3) {
    reasons.push(`You've built a hiring plan, but your last assessment reported a team size of ${teamSize}.`);
  }

  if (reasons.length === 0) return;

  // Check if we already logged a staleness event in the last 7 days
  const { data: recentEvent } = await supabase
    .from('agent_activity')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('action_type', 'assessment_stale')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (recentEvent) {
    const eventAge = Date.now() - new Date(recentEvent.created_at).getTime();
    if (eventAge < SEVEN_DAYS_MS) return; // Already notified recently
  }

  // Insert staleness event
  void supabase.from('agent_activity').insert({
    user_id:     userId,
    agent_id:    'sage', // Sage is the strategic advisor — appropriate owner
    action_type: 'assessment_stale',
    description: 'Your Q-Score assessment may be out of date.',
    metadata: {
      reasons,
      dimensions_affected: Object.values(DIMENSIONS),
      days_since_assessment: daysSince,
    },
  });
}
