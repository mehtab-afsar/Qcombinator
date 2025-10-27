/**
 * Feature Flags System
 * Enables gradual rollout and A/B testing of new features
 * Can toggle features on/off without code deployment
 */

// ============================================================================
// FEATURE FLAG DEFINITIONS
// ============================================================================

export const FeatureFlags = {
  // Store Migration
  USE_NEW_ASSESSMENT_STORE: false,    // Toggle Zustand store for assessment
  USE_NEW_STARTUP_STORE: false,       // Toggle Zustand store for startup profile

  // Component Refactoring (one flag per component for granular control)
  USE_NEW_PROBLEM_ORIGIN: false,       // New ProblemOriginStep component
  USE_NEW_UNIQUE_ADVANTAGE: false,     // New UniqueAdvantageStep component
  USE_NEW_CUSTOMER_EVIDENCE: false,    // New CustomerEvidenceStep component
  USE_NEW_FAILED_ASSUMPTIONS: false,   // New FailedAssumptionsStep component
  USE_NEW_LEARNING_VELOCITY: false,    // New LearningVelocityStep component
  USE_NEW_MARKET_CALCULATOR: false,    // New MarketCalculatorStep component
  USE_NEW_RESILIENCE: false,           // New ResilienceStep component

  // Service Layer
  USE_NEW_SCORING_SERVICE: false,      // New scoring service classes
  USE_NEW_VALIDATION_SERVICE: false,   // New validation service classes

  // Development & Testing
  ENABLE_PERFORMANCE_PROFILING: false, // Enable React Profiler
  ENABLE_MIGRATION_VALIDATION: false,  // Validate old vs new store sync
  ENABLE_DEBUG_LOGGING: false,         // Extra console logs for debugging

  // Monitoring
  ENABLE_ERROR_TRACKING: true,         // Send errors to monitoring service
  ENABLE_ANALYTICS: true,              // Track user actions

  // A/B Testing
  AB_TEST_ENABLED: false,              // Enable A/B testing framework
  AB_TEST_PERCENTAGE: 10,              // Percentage of users in test group
} as const;

// ============================================================================
// FEATURE FLAG HELPERS
// ============================================================================

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[featureName] === true;
}

/**
 * Get feature flag value
 */
export function getFeatureValue<K extends keyof typeof FeatureFlags>(
  featureName: K
): typeof FeatureFlags[K] {
  return FeatureFlags[featureName];
}

/**
 * A/B Testing: Determine if user is in test group
 * Uses consistent hashing based on user ID to ensure same user always gets same variant
 */
export function getUserVariant(userId: string, featureName: string): 'A' | 'B' {
  if (!FeatureFlags.AB_TEST_ENABLED) {
    return 'A'; // Control group (old implementation)
  }

  // Simple hash function for consistent user assignment
  const hash = simpleHash(userId + featureName);
  const percentage = hash % 100;

  return percentage < FeatureFlags.AB_TEST_PERCENTAGE ? 'B' : 'A';
}

/**
 * Simple hash function for consistent user assignment
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// ENVIRONMENT-BASED FLAGS
// ============================================================================

/**
 * Override flags based on environment
 */
export function getEnvironmentFlags() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Development: Enable all debugging features
    ENABLE_DEBUG_LOGGING: isDevelopment,
    ENABLE_PERFORMANCE_PROFILING: isDevelopment,
    ENABLE_MIGRATION_VALIDATION: isDevelopment,

    // Production: Only enable monitoring
    ENABLE_ERROR_TRACKING: isProduction,
    ENABLE_ANALYTICS: isProduction,
  };
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Automatic rollback if new implementation causes too many errors
 */
class FeatureFlagCircuitBreaker {
  private errorCounts: Map<string, number> = new Map();
  private readonly threshold = 5; // Max errors before rollback
  private readonly timeWindow = 60000; // 1 minute

  recordError(featureName: keyof typeof FeatureFlags) {
    const count = this.errorCounts.get(featureName) || 0;
    this.errorCounts.set(featureName, count + 1);

    if (count + 1 >= this.threshold) {
      console.error(`🚨 CIRCUIT BREAKER: Too many errors for ${featureName}, rolling back!`);
      this.rollback(featureName);
    }

    // Reset count after time window
    setTimeout(() => {
      this.errorCounts.set(featureName, 0);
    }, this.timeWindow);
  }

  private rollback(featureName: keyof typeof FeatureFlags) {
    // Disable the feature
    (FeatureFlags as any)[featureName] = false;

    // Alert monitoring service
    fetch('/api/alerts/circuit-breaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature: featureName,
        errorCount: this.errorCounts.get(featureName),
        timestamp: Date.now(),
      }),
    }).catch(() => {
      // Fail silently
    });

    // Force page reload to ensure old implementation loads
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  reset(featureName?: keyof typeof FeatureFlags) {
    if (featureName) {
      this.errorCounts.set(featureName, 0);
    } else {
      this.errorCounts.clear();
    }
  }
}

export const circuitBreaker = new FeatureFlagCircuitBreaker();

// ============================================================================
// REACT HOOK FOR FEATURE FLAGS
// ============================================================================

import { useState, useEffect } from 'react';

/**
 * React hook to use feature flags
 * Updates when flags change (useful for admin UI)
 */
export function useFeatureFlag(featureName: keyof typeof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState(() => isFeatureEnabled(featureName));

  useEffect(() => {
    // Check for flag changes (e.g., from admin panel)
    const interval = setInterval(() => {
      const currentValue = isFeatureEnabled(featureName);
      if (currentValue !== enabled) {
        setEnabled(currentValue);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [featureName, enabled]);

  return enabled;
}

// ============================================================================
// ADMIN UI HELPER (for testing)
// ============================================================================

/**
 * Helper to toggle feature flags from browser console during development
 * Usage: toggleFeature('USE_NEW_PROBLEM_ORIGIN', true)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).toggleFeature = (
    featureName: keyof typeof FeatureFlags,
    value: boolean
  ) => {
    (FeatureFlags as any)[featureName] = value;
    console.log(`✅ Feature "${featureName}" set to: ${value}`);
    console.log('Reload page to see changes');
  };

  (window as any).showFeatureFlags = () => {
    console.table(FeatureFlags);
  };

  console.log('💡 Development mode: Use toggleFeature() and showFeatureFlags() in console');
}
