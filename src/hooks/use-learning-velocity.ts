/**
 * useLearningVelocity Hook
 * Extracts state logic from LearningVelocityForm
 * Clean architecture: Hook layer sits between UI and Store
 */

import { useMemo } from 'react';
import { useAssessmentStore } from '@/src/store/assessment.store';

export interface SpeedRating {
  text: string;
  color: string;
}

export interface LearningVelocityValidation {
  learnedWords: number;
  changedWords: number;
  hasNumbers: boolean;
  hasComparison: boolean;
  hasSpecificChanges: boolean;
  speedRating: SpeedRating;
  learnedProgressColor: string;
  changedProgressColor: string;
}

export function useLearningVelocity() {
  // Get data from store
  const data = useAssessmentStore((state) => ({
    tested: state.data.tested,
    buildTime: state.data.buildTime,
    measurement: state.data.measurement,
    results: state.data.results,
    learned: state.data.learned,
    changed: state.data.changed,
  }));
  const actions = useAssessmentStore((state) => state.actions);

  // Computed: Word counts
  const learnedWords = useMemo(() => {
    return data.learned.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.learned]);

  const changedWords = useMemo(() => {
    return data.changed.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.changed]);

  // Computed: Content analysis
  const hasNumbers = useMemo(() => {
    return /\d+/.test(data.results);
  }, [data.results]);

  const hasComparison = useMemo(() => {
    return /(vs|compared|before|after|baseline|goal)/i.test(data.measurement + data.results);
  }, [data.measurement, data.results]);

  const hasSpecificChanges = useMemo(() => {
    return /button|feature|flow|design|copy|code|page|screen|added|removed|changed/i.test(
      data.changed
    );
  }, [data.changed]);

  // Computed: Speed rating
  const speedRating = useMemo((): SpeedRating => {
    if (data.buildTime <= 7) {
      return { text: '🔥 Weekly iterations - exceptional!', color: 'text-green-600' };
    }
    if (data.buildTime <= 14) {
      return { text: '✅ Bi-weekly - very good', color: 'text-blue-600' };
    }
    if (data.buildTime <= 30) {
      return { text: '👍 Monthly - good', color: 'text-yellow-600' };
    }
    if (data.buildTime <= 60) {
      return { text: '⚠️ Every 2 months - slow', color: 'text-orange-600' };
    }
    return { text: '🐌 Too slow - speed up!', color: 'text-red-600' };
  }, [data.buildTime]);

  // Computed: Validation
  const validation = useMemo((): LearningVelocityValidation => {
    const learnedProgressColor = learnedWords >= 20 ? 'text-green-600' : 'text-gray-500';
    const changedProgressColor = changedWords >= 20 ? 'text-green-600' : 'text-gray-500';

    return {
      learnedWords,
      changedWords,
      hasNumbers,
      hasComparison,
      hasSpecificChanges,
      speedRating,
      learnedProgressColor,
      changedProgressColor,
    };
  }, [
    learnedWords,
    changedWords,
    hasNumbers,
    hasComparison,
    hasSpecificChanges,
    speedRating,
  ]);

  // Actions
  const updateTested = (value: string) => {
    actions.updateField('tested', value);
  };

  const updateBuildTime = (value: number) => {
    actions.updateField('buildTime', value);
  };

  const updateMeasurement = (value: string) => {
    actions.updateField('measurement', value);
  };

  const updateResults = (value: string) => {
    actions.updateField('results', value);
  };

  const updateLearned = (value: string) => {
    actions.updateField('learned', value);
  };

  const updateChanged = (value: string) => {
    actions.updateField('changed', value);
  };

  return {
    data,
    validation,
    updateTested,
    updateBuildTime,
    updateMeasurement,
    updateResults,
    updateLearned,
    updateChanged,
  };
}
