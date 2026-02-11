export const STORAGE_KEYS = {
  FOUNDER_PROFILE: 'founder_profile',
  ASSESSMENT_DATA: 'assessment_data',
  QSCORE: 'qscore',
} as const;

export const FOUNDER_STAGES = ['idea', 'mvp', 'early-revenue', 'growth', 'scale'] as const;
export type FounderStage = typeof FOUNDER_STAGES[number];
