export interface Message { role: 'agent' | 'user'; text: string }

export interface SectionState {
  messages: Message[]
  extractedFields: Record<string, unknown>
  confidenceMap: Record<string, number>
  completionScore: number
  uploadedDocuments: Array<{ uploadId: string; filename: string; fields: number }>
  conversation: string
  isComplete: boolean
  /** Depth-tier fields already asked about this section — so the follow-up chat never repeats. */
  askedDepthFields: string[]
}

export interface PreviewData {
  projectedScore: number
  finalIQ: number
  availableIQ: number
  grade: string
  iqBreakdown: Array<{ id: string; name: string; averageScore: number; weight: number; indicatorsActive: number }>
  boostActions: Array<{ parameter: string; action: string; currentScore: number }>
  validationWarnings: string[]
  marketplaceUnlocked: boolean
  sectionsComplete: number
  track?: string
  scoreVersion: string
}

export interface SectionSummary {
  sectionKey: string
  label: string
  completionPct: number
  extractedCount: number
  extractedSnippets: Array<{ label: string; value: string; fieldKey?: string }>
  missingLabels: string[]
  /** 1-2 human sentences from the model, replacing the field list when present. */
  narrativeSummary?: string | null
}

export interface ExtractMeta {
  extractedFields?: Record<string, unknown>
  mergedFields?: Record<string, unknown>
  confidenceMap?: Record<string, number>
  completionScore?: number
  missingFields?: string[]
  depthFieldAsked?: string | null
}

export interface SubmitResult {
  score: number
  grade: string
  availableIQ: number
  track?: string
  iqBreakdown: Array<{
    id: string
    name: string
    averageScore: number
    weight: number
    indicatorsActive: number
    indicators: Array<{
      id: string
      name: string
      rawScore: number
      excluded: boolean
      exclusionReason?: string
      vcAlert?: string
      percentile: number | null
      percentileLabel?: string
    }>
  }>
  reconciliationFlags: Array<{ indicatorId: string; alert: string; severity: string }>
  validationWarnings: string[]
  unlockCards: Array<{
    indicatorId: string; indicatorName: string; parameterId: string
    currentScore: number; targetScore: number; estimatedPointGain: number
    action: string; agentId?: string
  }>
  readinessSummary: string
}

export type ProfileBuilderStep = number | 'pitch' | 'extract-results' | 'smart-qa'
export type FlowMode = 'fast' | 'full'

export interface UploadedFile { name: string; fields: number; fileUrl?: string; failed?: boolean }

export interface RecalcResult { finalIQ: number; grade: string }
