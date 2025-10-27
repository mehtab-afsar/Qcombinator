/**
 * useResilience Hook
 * Extracted from ResilienceForm.tsx (290 lines)
 * Handles all state logic and validation for Resilience section
 *
 * BEFORE: 290 lines with mixed concerns
 * AFTER: 80 lines of pure logic (no JSX)
 */

import { useAssessmentStore, useAssessmentActions } from '../store/assessment.store';
import { useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ResilienceData {
  hardestMoment: string;
  quitScale: number;
  whatKeptGoing: string;
}

export interface QuitScaleDescription {
  text: string;
  emoji: string;
  color: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useResilience() {
  // Get data from store
  const data = useAssessmentStore((state) => ({
    hardestMoment: state.data.hardestMoment,
    quitScale: state.data.quitScale,
    whatKeptGoing: state.data.whatKeptGoing,
  }));

  const actions = useAssessmentActions();

  // ========== COMPUTED VALUES ==========

  const storyWords = useMemo(() => {
    return data.hardestMoment.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.hardestMoment]);

  const reasonWords = useMemo(() => {
    return data.whatKeptGoing.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.whatKeptGoing]);

  const hasAdversity = useMemo(() => {
    return /failed|rejected|lost|quit|fired|broke|ran out|couldn't|crisis|disaster|wrong|mistake|terrible/i.test(
      data.hardestMoment
    );
  }, [data.hardestMoment]);

  const hasIntrinsicMotivation = useMemo(() => {
    return /believe|mission|customers need|problem matters|committed|won't give up|have to solve|passion|care about|important|make a difference/i.test(
      data.whatKeptGoing
    );
  }, [data.whatKeptGoing]);

  const quitScaleDescription = useMemo((): QuitScaleDescription => {
    if (data.quitScale <= 2)
      return {
        text: 'Never really considered it',
        emoji: '😊',
        color: 'text-blue-600',
      };
    if (data.quitScale <= 4)
      return {
        text: 'Thought about it briefly',
        emoji: '🤔',
        color: 'text-yellow-600',
      };
    if (data.quitScale <= 6)
      return {
        text: 'Seriously considered it',
        emoji: '😰',
        color: 'text-orange-600',
      };
    if (data.quitScale <= 8)
      return {
        text: 'Very close to quitting',
        emoji: '😫',
        color: 'text-red-600',
      };
    return {
      text: 'Almost gave up entirely',
      emoji: '💀',
      color: 'text-red-700',
    };
  }, [data.quitScale]);

  // ========== VALIDATION ==========

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Story validation
    if (storyWords < 50) {
      errors.push('Story needs at least 50 words');
    }

    if (!hasAdversity && data.hardestMoment.length > 50) {
      warnings.push('Try to describe specific adversity (rejection, failure, setback)');
    }

    // Reason validation
    if (reasonWords < 20) {
      errors.push('What kept you going needs at least 20 words');
    }

    if (!hasIntrinsicMotivation && data.whatKeptGoing.length > 20) {
      warnings.push('Mention your deeper motivation or mission');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasMinimumInput: storyWords >= 50 && reasonWords >= 20,
    };
  }, [storyWords, reasonWords, hasAdversity, hasIntrinsicMotivation, data]);

  // ========== ACTIONS ==========

  const updateHardestMoment = (value: string) => {
    actions.updateField('hardestMoment', value);
  };

  const updateQuitScale = (value: number) => {
    actions.updateField('quitScale', value);
  };

  const updateWhatKeptGoing = (value: string) => {
    actions.updateField('whatKeptGoing', value);
  };

  // ========== RETURN INTERFACE ==========

  return {
    // Data
    data,

    // Computed values
    storyWords,
    reasonWords,
    hasAdversity,
    hasIntrinsicMotivation,
    quitScaleDescription,

    // Validation
    validation,

    // Actions
    updateHardestMoment,
    updateQuitScale,
    updateWhatKeptGoing,
  };
}
