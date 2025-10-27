/**
 * useUniqueAdvantage Hook
 * Extracts state logic from UniqueAdvantageForm
 * Clean architecture: Hook layer sits between UI and Store
 */

import { useMemo } from 'react';
import { useAssessmentStore } from '@/src/store/assessment.store';

export interface AdvantageOption {
  id: string;
  label: string;
  description: string;
  weight: 'Highest Impact' | 'High Impact' | 'Medium Impact';
}

export const ADVANTAGE_OPTIONS: AdvantageOption[] = [
  {
    id: 'industry-experience',
    label: 'Industry Experience',
    description: 'I worked in this industry for 3+ years',
    weight: 'High Impact',
  },
  {
    id: 'technical-skills',
    label: 'Technical Skills',
    description: 'I have the technical skills to build the core product myself',
    weight: 'Medium Impact',
  },
  {
    id: 'customer-relationships',
    label: 'Customer Relationships',
    description: 'I have existing relationships with target customers',
    weight: 'Highest Impact',
  },
  {
    id: 'proprietary-insight',
    label: 'Proprietary Insight',
    description: 'I discovered unique insight/data about this market',
    weight: 'High Impact',
  },
  {
    id: 'relevant-failure',
    label: 'Relevant Failure',
    description: 'I previously tried to solve this and failed (learned lessons)',
    weight: 'Medium Impact',
  },
  {
    id: 'distribution-advantage',
    label: 'Distribution Advantage',
    description: 'I have an audience, network, or partnership advantages',
    weight: 'High Impact',
  },
];

export interface UniqueAdvantageValidation {
  isMinimumMet: boolean;
  hasNumbers: boolean;
  hasCommitments: boolean;
  strongestAdvantage: string | undefined;
  progressColor: string;
  progressMessage: string;
}

export function useUniqueAdvantage() {
  // Get data from store
  const selectedAdvantages = useAssessmentStore((state) => state.data.advantages);
  const explanation = useAssessmentStore((state) => state.data.advantageExplanation);
  const actions = useAssessmentStore((state) => state.actions);

  // Computed: Word count
  const wordCount = useMemo(() => {
    return explanation.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [explanation]);

  // Constants
  const minWords = 75;
  const targetWords = 150;

  // Computed: Validation
  const validation = useMemo((): UniqueAdvantageValidation => {
    const isMinimumMet = wordCount >= minWords;
    const hasNumbers = /\d+/.test(explanation);
    const hasCommitments = /loi|signed|contract|agreement|paid/i.test(explanation);
    const strongestAdvantage = selectedAdvantages.find(
      (id) => id === 'customer-relationships' || id === 'proprietary-insight'
    );

    let progressColor: string;
    let progressMessage: string;

    if (wordCount >= targetWords) {
      progressColor = 'text-green-600';
      progressMessage = ' • Excellent!';
    } else if (wordCount >= minWords) {
      progressColor = 'text-yellow-600';
      progressMessage = '';
    } else {
      progressColor = 'text-gray-500';
      progressMessage = ` • ${minWords - wordCount} more needed`;
    }

    return {
      isMinimumMet,
      hasNumbers,
      hasCommitments,
      strongestAdvantage,
      progressColor,
      progressMessage,
    };
  }, [explanation, wordCount, minWords, targetWords, selectedAdvantages]);

  // Actions
  const toggleAdvantage = (id: string) => {
    if (selectedAdvantages.includes(id)) {
      actions.updateField(
        'advantages',
        selectedAdvantages.filter((a) => a !== id)
      );
    } else {
      actions.updateField('advantages', [...selectedAdvantages, id]);
    }
  };

  const updateExplanation = (value: string) => {
    actions.updateField('advantageExplanation', value);
  };

  return {
    selectedAdvantages,
    explanation,
    wordCount,
    minWords,
    targetWords,
    validation,
    toggleAdvantage,
    updateExplanation,
  };
}
