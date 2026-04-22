import { SupabaseClient } from '@supabase/supabase-js'

// Friendly names for artifact types shown in feed
const ARTIFACT_LABELS: Record<string, string> = {
  financial_summary:   'Financial Summary',
  hiring_plan:         'Hiring Plan',
  competitive_matrix:  'Competitive Analysis',
  investor_update:     'Investor Update',
  pitch_deck:          'Pitch Deck',
  business_plan:       'Business Plan',
  go_to_market:        'Go-to-Market Plan',
  product_roadmap:     'Product Roadmap',
  term_sheet_analysis: 'Term Sheet Analysis',
  nda:                 'NDA',
  interview_notes:     'Interview Notes',
}

// Which artifact types warrant an auto-event post (skip low-signal ones)
const NOTABLE_ARTIFACTS = new Set(Object.keys(ARTIFACT_LABELS))

/**
 * Post an auto-event to the feed when a founder completes a notable agent artifact.
 * Fire-and-forget — caller should `void` and not await.
 */
export async function postArtifactFeedEvent(
  userId: string,
  artifactType: string,
  artifactTitle: string,
  supabase: SupabaseClient
) {
  if (!NOTABLE_ARTIFACTS.has(artifactType)) return
  const label = ARTIFACT_LABELS[artifactType] ?? artifactTitle
  const body = `Just completed a ${label} — one step closer to investor-ready.`
  try {
    await supabase.from('feed_posts').insert({
      user_id:   userId,
      role:      'founder',
      post_type: 'auto_event',
      body,
      metadata:  { artifactType, artifactTitle },
    })
  } catch { /* non-critical */ }
}

/**
 * Post an auto-event to the feed when a founder's Q-Score improves significantly
 * or crosses a milestone (50, 60, 70, 80).
 * Fire-and-forget — caller should `void` and not await.
 */
export async function postQScoreFeedEvent(
  userId: string,
  newScore: number,
  prevScore: number,
  grade: string,
  supabase: SupabaseClient
) {
  const MILESTONES = [50, 60, 70, 80]
  const crossedMilestone = MILESTONES.find(m => newScore >= m && prevScore < m)
  const improved = newScore > prevScore + 4  // ≥5 point jump without milestone

  if (!crossedMilestone && !improved) return

  const body = crossedMilestone
    ? `Q-Score just crossed ${crossedMilestone} — now rated ${grade}. Big milestone!`
    : `Q-Score improved by ${newScore - prevScore} points to ${newScore} (Grade ${grade}).`

  try {
    await supabase.from('feed_posts').insert({
      user_id:   userId,
      role:      'founder',
      post_type: 'milestone',
      body,
      metadata:  { newScore, prevScore, grade, crossedMilestone: crossedMilestone ?? null },
    })
  } catch { /* non-critical */ }
}
