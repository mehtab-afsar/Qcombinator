/**
 * Storage Service
 * Centralized localStorage management — assessment data only.
 * Founder profile is persisted to Supabase via /api/founder/profile.
 */

import { AssessmentData } from '@/features/founder/types/founder.types';

const STORAGE_KEYS = {
  ASSESSMENT_DATA: 'assessmentData',
} as const;

class StorageService {
  private get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  // === Assessment Data ===
  getAssessmentData(): AssessmentData | null {
    return this.get<AssessmentData>(STORAGE_KEYS.ASSESSMENT_DATA);
  }

  setAssessmentData(data: AssessmentData): boolean {
    return this.set(STORAGE_KEYS.ASSESSMENT_DATA, data);
  }

  hasCompletedAssessment(): boolean {
    return this.getAssessmentData() !== null;
  }
}

export const storageService = new StorageService();
