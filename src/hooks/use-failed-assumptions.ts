/**
 * useFailedAssumptions Hook
 * Extracts state logic from FailedAssumptionsForm
 * Clean architecture: Hook layer sits between UI and Store
 */

import { useMemo } from 'react';
import { useAssessmentStore } from '@/src/store/assessment.store';

export interface FailedAssumptionsValidation {
  beliefWords: number;
  discoveryWords: number;
  changeWords: number;
  hasImpactNumbers: boolean;
  hasDirectQuotes: boolean;
  beliefProgressColor: string;
  discoveryProgressColor: string;
  changeProgressColor: string;
}

export function useFailedAssumptions() {
  // Get data from store
  const data = useAssessmentStore((state) => ({
    failedBelief: state.data.failedBelief,
    failedReasoning: state.data.failedReasoning,
    failedDiscovery: state.data.failedDiscovery,
    failedChange: state.data.failedChange,
  }));
  const actions = useAssessmentStore((state) => state.actions);

  // Computed: Word counts
  const beliefWords = useMemo(() => {
    return data.failedBelief.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.failedBelief]);

  const discoveryWords = useMemo(() => {
    return data.failedDiscovery.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.failedDiscovery]);

  const changeWords = useMemo(() => {
    return data.failedChange.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.failedChange]);

  // Computed: Impact detection
  const hasImpactNumbers = useMemo(() => {
    return /\d+%|\dx|doubled|tripled|increased|decreased/i.test(data.failedChange);
  }, [data.failedChange]);

  const hasDirectQuotes = useMemo(() => {
    return data.failedDiscovery.includes('"');
  }, [data.failedDiscovery]);

  // Computed: Validation
  const validation = useMemo((): FailedAssumptionsValidation => {
    const beliefProgressColor = beliefWords >= 20 ? 'text-green-600' : 'text-gray-500';
    const discoveryProgressColor = discoveryWords >= 30 ? 'text-green-600' : 'text-gray-500';
    const changeProgressColor = changeWords >= 30 ? 'text-green-600' : 'text-gray-500';

    return {
      beliefWords,
      discoveryWords,
      changeWords,
      hasImpactNumbers,
      hasDirectQuotes,
      beliefProgressColor,
      discoveryProgressColor,
      changeProgressColor,
    };
  }, [beliefWords, discoveryWords, changeWords, hasImpactNumbers, hasDirectQuotes]);

  // Actions
  const updateFailedBelief = (value: string) => {
    actions.updateField('failedBelief', value);
  };

  const updateFailedReasoning = (value: string) => {
    actions.updateField('failedReasoning', value);
  };

  const updateFailedDiscovery = (value: string) => {
    actions.updateField('failedDiscovery', value);
  };

  const updateFailedChange = (value: string) => {
    actions.updateField('failedChange', value);
  };

  return {
    data,
    validation,
    updateFailedBelief,
    updateFailedReasoning,
    updateFailedDiscovery,
    updateFailedChange,
  };
}
