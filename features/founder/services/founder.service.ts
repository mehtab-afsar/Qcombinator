/**
 * Storage Service
 * Centralized localStorage management with type safety
 * Abstraction layer for all client-side data persistence
 */

import { FounderProfile, AssessmentData } from '@/features/founder/types/founder.types';
import { PRDQScore } from '@/features/qscore/types/qscore.types';

const STORAGE_KEYS = {
  FOUNDER_PROFILE: 'founderProfile',
  ASSESSMENT_DATA: 'assessmentData',
  QSCORE: 'qScore',
} as const;

/**
 * Generic storage utilities
 */
class StorageService {
  /**
   * Safely get item from localStorage
   */
  private get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      return null;
    }
  }

  /**
   * Safely set item to localStorage
   */
  private set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing ${key} to localStorage:`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  private remove(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  clearAll(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  // === Founder Profile ===
  getFounderProfile(): FounderProfile | null {
    return this.get<FounderProfile>(STORAGE_KEYS.FOUNDER_PROFILE);
  }

  setFounderProfile(profile: FounderProfile): boolean {
    return this.set(STORAGE_KEYS.FOUNDER_PROFILE, profile);
  }

  updateFounderProfile(updates: Partial<FounderProfile>): boolean {
    const current = this.getFounderProfile();
    if (!current) return false;

    const updated = { ...current, ...updates };
    return this.set(STORAGE_KEYS.FOUNDER_PROFILE, updated);
  }

  // === Assessment Data ===
  getAssessmentData(): AssessmentData | null {
    return this.get<AssessmentData>(STORAGE_KEYS.ASSESSMENT_DATA);
  }

  setAssessmentData(data: AssessmentData): boolean {
    return this.set(STORAGE_KEYS.ASSESSMENT_DATA, data);
  }

  // === Q-Score ===
  getQScore(): PRDQScore | null {
    return this.get<PRDQScore>(STORAGE_KEYS.QSCORE);
  }

  setQScore(score: PRDQScore): boolean {
    return this.set(STORAGE_KEYS.QSCORE, score);
  }

  // === Combined Data ===
  /**
   * Get all founder data (profile + assessment)
   */
  getAllFounderData(): {
    profile: FounderProfile | null;
    assessment: AssessmentData | null;
  } {
    return {
      profile: this.getFounderProfile(),
      assessment: this.getAssessmentData(),
    };
  }

  /**
   * Check if founder has completed onboarding
   */
  hasCompletedOnboarding(): boolean {
    return this.getFounderProfile() !== null;
  }

  /**
   * Check if founder has completed assessment
   */
  hasCompletedAssessment(): boolean {
    return this.getAssessmentData() !== null;
  }
}

// Export singleton instance
export const storageService = new StorageService();
