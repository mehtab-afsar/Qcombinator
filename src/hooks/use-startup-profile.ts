/**
 * useStartupProfile Hook
 * Extracts state logic from massive 1,155-line StartupProfile page
 * Clean architecture: Hook layer sits between UI and Store
 */

import { useState, useMemo, useCallback } from 'react';
import { useStartupStore } from '@/src/store/startup.store';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface StepInfo {
  id: string;
  title: string;
  time: number;
  icon: React.ComponentType<{ className?: string }> | null;
}

export const STEPS: StepInfo[] = [
  { id: 'basics', title: 'Company Basics', time: 3, icon: null },
  { id: 'problem-solution', title: 'Problem & Solution', time: 5, icon: null },
  { id: 'market', title: 'Market & Competition', time: 3, icon: null },
  { id: 'traction', title: 'Traction & Metrics', time: 2, icon: null },
  { id: 'team', title: 'Team', time: 2, icon: null },
  { id: 'fundraising', title: 'Fundraising', time: 1, icon: null },
];

export const INDUSTRIES = [
  'AI/ML',
  'SaaS',
  'FinTech',
  'HealthTech',
  'EdTech',
  'E-commerce',
  'Marketplace',
  'DevTools',
  'Cybersecurity',
  'Climate Tech',
  'Food Tech',
  'PropTech',
  'Gaming',
  'Consumer Apps',
  'Enterprise Software',
  'Hardware',
  'Biotech',
  'Other',
];

export const INCORPORATION_TYPES = [
  { value: 'delaware-corp', label: 'Delaware C-Corporation', recommended: true },
  { value: 'llc', label: 'LLC', recommended: false },
  { value: 'other-corp', label: 'Other Corporation', recommended: false },
  { value: 'not-incorporated', label: 'Not Yet Incorporated', recommended: false },
];

export const STAGES = [
  { value: 'pre-product', label: 'Pre-Product', desc: 'Idea validation stage' },
  { value: 'mvp', label: 'MVP', desc: 'Minimum viable product built' },
  { value: 'beta', label: 'Beta', desc: 'Testing with early users' },
  { value: 'launched', label: 'Launched', desc: 'Product is live' },
  { value: 'growing', label: 'Growing', desc: 'Scaling and expanding' },
];

export const BUSINESS_MODELS = [
  'B2B SaaS',
  'B2C Subscription',
  'Marketplace',
  'E-commerce',
  'Advertising',
  'Transaction Fees',
  'Freemium',
  'Enterprise Licensing',
  'Usage-based',
  'Other',
];

export const USE_OF_FUNDS_OPTIONS = [
  'Product Development',
  'Sales & Marketing',
  'Team Expansion',
  'Operations',
  'Technology Infrastructure',
  'Market Expansion',
  'Inventory',
  'Working Capital',
];

// ============================================================================
// HOOK
// ============================================================================

export function useStartupProfile() {
  // Local state for current step
  const [currentStep, setCurrentStep] = useState(0);

  // Get data from Zustand store
  const data = useStartupStore((state) => state.data);
  const actions = useStartupStore((state) => state.actions);

  // Computed: Current step info
  const currentStepInfo = useMemo(() => {
    return STEPS[currentStep];
  }, [currentStep]);

  // Computed: Progress percentage
  const progressPercentage = useMemo(() => {
    return ((currentStep + 1) / STEPS.length) * 100;
  }, [currentStep]);

  // Computed: Validation for each step
  const validation = useMemo(() => {
    return {
      basics: {
        isValid:
          data.companyName.length > 0 &&
          data.oneLiner.length > 0 &&
          data.industry.length > 0 &&
          data.stage.length > 0,
        errors: [] as string[],
      },
      problemSolution: {
        isValid: data.problemStatement.length >= 50 && data.solution.length >= 50,
        errors: [] as string[],
      },
      market: {
        isValid: data.tamSize.length > 0 && data.customerPersona.length > 0,
        errors: [] as string[],
      },
      traction: {
        isValid: data.tractionType.length > 0,
        errors: [] as string[],
      },
      team: {
        isValid: data.coFounders.length >= 0, // Always valid
        errors: [] as string[],
      },
      fundraising: {
        isValid: data.raisingAmount.length > 0,
        errors: [] as string[],
      },
    };
  }, [data]);

  // Computed: Can proceed to next step
  const canProceed = useMemo(() => {
    const stepValidation = {
      0: validation.basics.isValid,
      1: validation.problemSolution.isValid,
      2: validation.market.isValid,
      3: validation.traction.isValid,
      4: validation.team.isValid,
      5: validation.fundraising.isValid,
    };
    return stepValidation[currentStep as keyof typeof stepValidation] || false;
  }, [currentStep, validation]);

  // Actions: Navigation
  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete startup profile
      window.location.href = '/founder/ai-enhancement';
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  // Actions: Field updates
  const updateField = useCallback(
    <K extends keyof typeof data>(field: K, value: (typeof data)[K]) => {
      actions.updateField(field, value);
    },
    [actions]
  );

  const updateMultipleFields = useCallback(
    (updates: Partial<typeof data>) => {
      actions.updateMultipleFields(updates);
    },
    [actions]
  );

  // Actions: Array field management
  const addCompetitor = useCallback(
    (competitor: string) => {
      if (competitor.trim()) {
        actions.updateField('competitors', [...data.competitors, competitor.trim()]);
      }
    },
    [data.competitors, actions]
  );

  const removeCompetitor = useCallback(
    (index: number) => {
      actions.updateField(
        'competitors',
        data.competitors.filter((_, i) => i !== index)
      );
    },
    [data.competitors, actions]
  );

  const addAdvisor = useCallback(
    (advisor: string) => {
      if (advisor.trim()) {
        actions.updateField('advisors', [...data.advisors, advisor.trim()]);
      }
    },
    [data.advisors, actions]
  );

  const removeAdvisor = useCallback(
    (index: number) => {
      actions.updateField(
        'advisors',
        data.advisors.filter((_, i) => i !== index)
      );
    },
    [data.advisors, actions]
  );

  const addKeyHire = useCallback(
    (hire: string) => {
      if (hire.trim()) {
        actions.updateField('keyHires', [...data.keyHires, hire.trim()]);
      }
    },
    [data.keyHires, actions]
  );

  const removeKeyHire = useCallback(
    (index: number) => {
      actions.updateField(
        'keyHires',
        data.keyHires.filter((_, i) => i !== index)
      );
    },
    [data.keyHires, actions]
  );

  const addCoFounder = useCallback(
    (coFounder: { name: string; role: string; linkedin?: string; equity: number }) => {
      actions.updateField('coFounders', [...data.coFounders, coFounder]);
    },
    [data.coFounders, actions]
  );

  const removeCoFounder = useCallback(
    (index: number) => {
      actions.updateField(
        'coFounders',
        data.coFounders.filter((_, i) => i !== index)
      );
    },
    [data.coFounders, actions]
  );

  const updateCoFounder = useCallback(
    (index: number, updates: Partial<{ name: string; role: string; linkedin?: string; equity: number }>) => {
      const updated = [...data.coFounders];
      updated[index] = { ...updated[index], ...updates };
      actions.updateField('coFounders', updated);
    },
    [data.coFounders, actions]
  );

  // Reset function
  const resetData = useCallback(() => {
    actions.resetData();
    setCurrentStep(0);
  }, [actions]);

  return {
    // State
    currentStep,
    data,
    currentStepInfo,
    progressPercentage,
    validation,
    canProceed,

    // Navigation
    handleNext,
    handleBack,
    goToStep,

    // Field updates
    updateField,
    updateMultipleFields,

    // Array management
    addCompetitor,
    removeCompetitor,
    addAdvisor,
    removeAdvisor,
    addKeyHire,
    removeKeyHire,
    addCoFounder,
    removeCoFounder,
    updateCoFounder,

    // Utility
    resetData,
  };
}
