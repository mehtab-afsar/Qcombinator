/**
 * useProblemOrigin Hook
 * Extracts state logic from ProblemOriginForm
 * Clean architecture: Hook layer sits between UI and Store
 */

import { useMemo } from 'react';
import { useAssessmentStore } from '@/src/store/assessment.store';

export interface ProblemOriginValidation {
  isMinimumMet: boolean;
  hasNumbers: boolean;
  hasPersonalExperience: boolean;
  progressColor: string;
  progressMessage: string;
}

export function useProblemOrigin() {
  // Get data from store
  const problemStory = useAssessmentStore((state) => state.data.problemStory);
  const actions = useAssessmentStore((state) => state.actions);

  // Computed: Word count
  const wordCount = useMemo(() => {
    return problemStory.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [problemStory]);

  // Constants
  const minWords = 100;
  const targetWords = 200;

  // Computed: Validation
  const validation = useMemo((): ProblemOriginValidation => {
    const isMinimumMet = wordCount >= minWords;
    const hasNumbers = /\d+/.test(problemStory);
    const hasPersonalExperience = /(I|my|me|we)/i.test(problemStory);

    let progressColor: string;
    let progressMessage: string;

    if (wordCount >= targetWords) {
      progressColor = 'text-green-600';
      progressMessage = 'Excellent detail!';
    } else if (wordCount >= minWords) {
      progressColor = 'text-yellow-600';
      progressMessage = 'Good - adding more detail will improve your score';
    } else {
      progressColor = 'text-gray-500';
      progressMessage = `${minWords - wordCount} more words needed`;
    }

    return {
      isMinimumMet,
      hasNumbers,
      hasPersonalExperience,
      progressColor,
      progressMessage,
    };
  }, [problemStory, wordCount, minWords, targetWords]);

  // Actions
  const updateProblemStory = (value: string) => {
    actions.updateField('problemStory', value);
  };

  return {
    problemStory,
    wordCount,
    minWords,
    targetWords,
    validation,
    updateProblemStory,
  };
}
