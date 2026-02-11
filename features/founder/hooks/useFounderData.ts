/**
 * Founder Data Hook
 * Custom hooks for accessing founder profile and assessment data
 * Separates data access logic from presentation components
 */

import { useState, useEffect } from 'react';
import { storageService } from '@/features/founder/services/founder.service';
import { metricsService } from '@/features/founder/services/founder-metrics.service';
import { FounderProfile, AssessmentData, MetricsData } from '@/features/founder/types/founder.types';

/**
 * Hook for founder profile data
 */
export function useFounderProfile() {
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = () => {
      const data = storageService.getFounderProfile();
      setProfile(data);
      setLoading(false);
    };

    loadProfile();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'founderProfile') {
        loadProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateProfile = (updates: Partial<FounderProfile>) => {
    const success = storageService.updateFounderProfile(updates);
    if (success) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    return success;
  };

  return {
    profile,
    loading,
    updateProfile,
    hasProfile: profile !== null,
  };
}

/**
 * Hook for assessment data
 */
export function useAssessmentData() {
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssessment = () => {
      const data = storageService.getAssessmentData();
      setAssessment(data);
      setLoading(false);
    };

    loadAssessment();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'assessmentData') {
        loadAssessment();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    assessment,
    loading,
    hasAssessment: assessment !== null,
  };
}

/**
 * Hook for calculated metrics
 */
export function useMetrics() {
  const { assessment, loading: assessmentLoading } = useAssessmentData();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    if (assessment) {
      const calculatedMetrics = metricsService.calculateMetrics(assessment);
      setMetrics(calculatedMetrics);
    } else {
      setMetrics(null);
    }
  }, [assessment]);

  const healthStatus = metrics
    ? metricsService.getHealthStatus(metrics)
    : null;

  return {
    metrics,
    healthStatus,
    loading: assessmentLoading,
    hasMetrics: metrics !== null,
  };
}

/**
 * Hook for combined founder data (profile + assessment + metrics)
 */
export function useFounderData() {
  const { profile, loading: profileLoading, updateProfile } = useFounderProfile();
  const { assessment, loading: assessmentLoading } = useAssessmentData();
  const { metrics, healthStatus, loading: metricsLoading } = useMetrics();

  const loading = profileLoading || assessmentLoading || metricsLoading;

  return {
    profile,
    assessment,
    metrics,
    healthStatus,
    loading,
    hasData: profile !== null && assessment !== null,
    updateProfile,
  };
}
