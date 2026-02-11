/**
 * Assessment Store
 * Centralized state management for founder assessment flow
 * Replaces scattered localStorage calls with unified store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AssessmentData, ScoreBreakdown, ValidationError } from '../types/assessment.types';

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AssessmentState {
  // Data
  currentSection: number;
  data: AssessmentData;
  scores: ScoreBreakdown | null;
  errors: Record<string, ValidationError[]>;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  isCalculating: boolean;

  // Actions
  actions: {
    // Navigation
    setCurrentSection: (section: number) => void;
    nextSection: () => void;
    previousSection: () => void;
    goToSection: (section: number) => void;

    // Data updates
    updateField: <K extends keyof AssessmentData>(
      field: K,
      value: AssessmentData[K]
    ) => void;
    updateMultipleFields: (updates: Partial<AssessmentData>) => void;
    resetData: () => void;

    // Validation
    setErrors: (field: string, errors: ValidationError[]) => void;
    clearErrors: (field?: string) => void;

    // Scores
    setScores: (scores: ScoreBreakdown) => void;
    calculateScores: () => Promise<void>;

    // Loading states
    setLoading: (isLoading: boolean) => void;
    setSaving: (isSaving: boolean) => void;

    // Persistence
    saveToLocalStorage: () => void;
    loadFromLocalStorage: () => void;
    clearAllData: () => void;
  };
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialData: AssessmentData = {
  problemStory: '',
  problemFollowUps: [],
  advantages: [],
  advantageExplanation: '',

  customerType: '',
  conversationDate: null,
  customerQuote: '',
  customerSurprise: '',
  customerCommitment: '',
  conversationCount: 0,
  customerList: [],

  failedBelief: '',
  failedReasoning: '',
  failedDiscovery: '',
  failedChange: '',

  tested: '',
  buildTime: 7,
  measurement: '',
  results: '',
  learned: '',
  changed: '',

  targetCustomers: 0,
  talkToCount: 0,
  conversionRate: 5,
  avgContractValue: 0,
  customerLifetimeMonths: 12,
  validationChecks: [],

  hardestMoment: '',
  quitScale: 5,
  whatKeptGoing: '',
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSection: 0,
      data: initialData,
      scores: null,
      errors: {},
      isLoading: false,
      isSaving: false,
      isCalculating: false,

      // Actions
      actions: {
        // Navigation
        setCurrentSection: (section) => set({ currentSection: section }),

        nextSection: () => {
          const { currentSection } = get();
          if (currentSection < 6) {
            set({ currentSection: currentSection + 1 });
          }
        },

        previousSection: () => {
          const { currentSection } = get();
          if (currentSection > 0) {
            set({ currentSection: currentSection - 1 });
          }
        },

        goToSection: (section) => {
          if (section >= 0 && section <= 6) {
            set({ currentSection: section });
          }
        },

        // Data updates
        updateField: (field, value) => {
          set((state) => ({
            data: { ...state.data, [field]: value },
          }));
        },

        updateMultipleFields: (updates) => {
          set((state) => ({
            data: { ...state.data, ...updates },
          }));
        },

        resetData: () => {
          set({ data: initialData, currentSection: 0, scores: null, errors: {} });
        },

        // Validation
        setErrors: (field, errors) => {
          set((state) => ({
            errors: { ...state.errors, [field]: errors },
          }));
        },

        clearErrors: (field) => {
          if (field) {
            set((state) => {
                const { [field]: _removed, ...rest } = state.errors;
              return { errors: rest };
            });
          } else {
            set({ errors: {} });
          }
        },

        // Scores
        setScores: (scores) => set({ scores }),

        calculateScores: async () => {
          set({ isCalculating: true });
          try {
            // TODO: Import and use scoring service
            // const scores = await ScoringService.calculateQScore(get().data);
            // set({ scores });
          } catch (error) {
            console.error('Failed to calculate scores:', error);
          } finally {
            set({ isCalculating: false });
          }
        },

        // Loading states
        setLoading: (isLoading) => set({ isLoading }),
        setSaving: (isSaving) => set({ isSaving }),

        // Persistence
        saveToLocalStorage: () => {
          const state = get();
          localStorage.setItem('founderAssessment', JSON.stringify(state.data));
        },

        loadFromLocalStorage: () => {
          try {
            const saved = localStorage.getItem('founderAssessment');
            if (saved) {
              const data = JSON.parse(saved);
              set({ data });
            }
          } catch (error) {
            console.error('Failed to load from localStorage:', error);
          }
        },

        clearAllData: () => {
          localStorage.removeItem('founderAssessment');
          set({ data: initialData, currentSection: 0, scores: null, errors: {} });
        },
      },
    }),
    {
      name: 'assessment-storage',
      partialize: (state) => ({
        currentSection: state.currentSection,
        data: state.data,
        scores: state.scores,
      }),
    }
  )
);

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

export const useCurrentSection = () =>
  useAssessmentStore((state) => state.currentSection);

export const useAssessmentData = () =>
  useAssessmentStore((state) => state.data);

export const useAssessmentScores = () =>
  useAssessmentStore((state) => state.scores);

export const useAssessmentErrors = () =>
  useAssessmentStore((state) => state.errors);

export const useAssessmentActions = () =>
  useAssessmentStore((state) => state.actions);

export const useAssessmentLoading = () =>
  useAssessmentStore((state) => ({
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    isCalculating: state.isCalculating,
  }));
