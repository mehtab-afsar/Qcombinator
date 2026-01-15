/**
 * Startup Profile Store
 * Centralized state management for startup profile flow
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StartupProfileData } from '../types/startup.types';

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface StartupState {
  // Data
  currentStep: number;
  data: StartupProfileData;

  // UI State
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  actions: {
    // Navigation
    setCurrentStep: (step: number) => void;
    nextStep: () => void;
    previousStep: () => void;

    // Data updates
    updateField: <K extends keyof StartupProfileData>(
      field: K,
      value: StartupProfileData[K]
    ) => void;
    updateMultipleFields: (updates: Partial<StartupProfileData>) => void;
    addToArray: <K extends keyof StartupProfileData>(
      field: K,
      value: string
    ) => void;
    removeFromArray: <K extends keyof StartupProfileData>(
      field: K,
      index: number
    ) => void;
    resetData: () => void;

    // Loading states
    setLoading: (isLoading: boolean) => void;
    setSaving: (isSaving: boolean) => void;

    // Persistence
    saveToLocalStorage: () => void;
    loadFromLocalStorage: () => void;
  };
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialData: StartupProfileData = {
  companyName: '',
  website: '',
  incorporation: '',
  foundedDate: '',
  industry: '',
  subIndustry: '',
  oneLiner: '',
  stage: '',
  problemStatement: '',
  whyNow: '',
  solution: '',
  uniquePosition: '',
  moat: '',
  tamSize: '',
  customerPersona: '',
  businessModel: '',
  competitors: [],
  differentiation: '',
  marketGrowth: '',
  tractionType: '',
  mrr: '',
  arr: '',
  growthRate: '',
  customerCount: '',
  churnRate: '',
  cac: '',
  ltv: '',
  userInterviews: '',
  lois: '',
  pilots: '',
  waitlist: '',
  coFounders: [],
  advisors: [],
  teamSize: '',
  keyHires: [],
  equitySplit: '',
  raisingAmount: '',
  useOfFunds: '',
  previousFunding: '',
  runwayRemaining: '',
  targetCloseDate: '',
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useStartupStore = create<StartupState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 0,
      data: initialData,
      isLoading: false,
      isSaving: false,

      // Actions
      actions: {
        // Navigation
        setCurrentStep: (step) => set({ currentStep: step }),

        nextStep: () => {
          const { currentStep } = get();
          if (currentStep < 5) {
            set({ currentStep: currentStep + 1 });
          }
        },

        previousStep: () => {
          const { currentStep } = get();
          if (currentStep > 0) {
            set({ currentStep: currentStep - 1 });
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

        addToArray: (field, value) => {
          set((state) => ({
            data: {
              ...state.data,
              [field]: [...(state.data[field] as string[]), value],
            },
          }));
        },

        removeFromArray: (field, index) => {
          set((state) => ({
            data: {
              ...state.data,
              [field]: (state.data[field] as string[]).filter((_, i) => i !== index),
            },
          }));
        },

        resetData: () => {
          set({ data: initialData, currentStep: 0 });
        },

        // Loading states
        setLoading: (isLoading) => set({ isLoading }),
        setSaving: (isSaving) => set({ isSaving }),

        // Persistence
        saveToLocalStorage: () => {
          const state = get();
          localStorage.setItem('startupProfile', JSON.stringify(state.data));
        },

        loadFromLocalStorage: () => {
          try {
            const saved = localStorage.getItem('startupProfile');
            if (saved) {
              const data = JSON.parse(saved);
              set({ data });
            }
          } catch (error) {
            console.error('Failed to load startup profile:', error);
          }
        },
      },
    }),
    {
      name: 'startup-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        data: state.data,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const useCurrentStep = () => useStartupStore((state) => state.currentStep);

export const useStartupData = () => useStartupStore((state) => state.data);

export const useStartupActions = () => useStartupStore((state) => state.actions);

export const useStartupLoading = () =>
  useStartupStore((state) => ({
    isLoading: state.isLoading,
    isSaving: state.isSaving,
  }));
