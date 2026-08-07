import type { SectionState } from '@/features/profile-builder/types'

export function initSection(): SectionState {
  return {
    messages: [], extractedFields: {}, confidenceMap: {},
    completionScore: 0, uploadedDocuments: [], conversation: '',
    isComplete: false, askedDepthFields: [],
  }
}
