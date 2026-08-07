/**
 * Startup stage → display label. Single source of truth.
 *
 * Union of two maps that had already drifted apart: one (deal-flow) carried
 * defensive underscore/no-hyphen key variants ('pre_seed', 'series_a') the
 * other lacked, and the other (startup detail) carried 'series-b' that the
 * first lacked entirely — meaning a series-b startup showed its raw stage
 * code instead of a label on the deal-flow page. This is the merged superset.
 */
export const STAGE_LABEL: Record<string, string> = {
  idea:         'Idea',
  mvp:          'MVP',
  launched:     'Seed',
  scaling:      'Series A',
  bootstrapped: 'Bootstrapped',
  'pre-seed':   'Pre-Seed',
  preseed:      'Pre-Seed',
  pre_seed:     'Pre-Seed',
  seed:         'Seed',
  'series-a':   'Series A',
  series_a:     'Series A',
  'series-b':   'Series B',
}
