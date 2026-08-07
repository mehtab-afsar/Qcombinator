/**
 * Founder Data Hook
 * Custom hooks for accessing founder profile and assessment data
 * Separates data access logic from presentation components
 */

import { useState, useEffect } from 'react';
import { storageService } from '@/features/founder/services/founder.service';
import { metricsService } from '@/features/founder/services/founder-metrics.service';
import { fetchMetricsFromSupabase } from '@/features/founder/services/founder-data.service';
import { FounderProfile, AssessmentData, MetricsData } from '@/features/founder/types/founder.types';
import { log } from '@/lib/logger';

/**
 * Hook for founder profile data — reads from Supabase via /api/founder/profile
 */
export function useFounderProfile() {
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<Error | null>(null);

  useEffect(() => {
    fetch('/api/founder/profile')
      .then(r => r.json())
      .then(d => { setProfile(d.profile ?? null); setError(null); setLoading(false); })
      .catch((err: unknown) => {
        const e = err instanceof Error ? err : new Error(String(err));
        log.error('useFounderProfile: fetch failed', { err: e });
        setError(e);
        setLoading(false);
      });
  }, []);

  const updateProfile = async (updates: Partial<FounderProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    await fetch('/api/founder/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return true;
  };

  return {
    profile,
    loading,
    error,
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
 * Priority: 1) Felix's financial_summary artifact (Supabase)
 *           2) qscore_history assessment data (Supabase)
 *           3) Legacy localStorage assessment data
 */
export function useMetrics(refreshTrigger = 0) {
  const { assessment, loading: assessmentLoading } = useAssessmentData();
  const [metrics,       setMetrics]       = useState<MetricsData | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [error,         setError]         = useState<Error | null>(null);

  useEffect(() => {
    setMetrics(null);
    setSupabaseLoading(true);
    fetchMetricsFromSupabase()
      .then(data => { if (data) setMetrics(data); setError(null); })
      .catch((err: unknown) => {
        // Falls through to the localStorage effect below — this isn't fatal, but it's
        // still a real failure worth surfacing rather than silently swallowing.
        const e = err instanceof Error ? err : new Error(String(err));
        log.error('useMetrics: fetchMetricsFromSupabase failed', { err: e });
        setError(e);
      })
      .finally(() => setSupabaseLoading(false));
  }, [refreshTrigger]);

  // ── 3. localStorage fallback ───────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseLoading && !metrics && assessment) {
      setMetrics(metricsService.calculateMetrics(assessment));
    }
  }, [supabaseLoading, metrics, assessment]);

  const healthStatus = metrics ? metricsService.getHealthStatus(metrics) : null;

  return {
    metrics,
    healthStatus,
    loading: supabaseLoading && assessmentLoading,
    error,
    hasMetrics: metrics !== null,
  };
}

/**
 * Hook for combined founder data (profile + assessment + metrics)
 */
export function useFounderData() {
  const { profile, loading: profileLoading, error: profileError, updateProfile } = useFounderProfile();
  const { assessment, loading: assessmentLoading } = useAssessmentData();
  const { metrics, healthStatus, loading: metricsLoading, error: metricsError } = useMetrics();

  const loading = profileLoading || assessmentLoading || metricsLoading;

  return {
    profile,
    assessment,
    metrics,
    healthStatus,
    loading,
    error: profileError ?? metricsError,
    hasData: profile !== null && assessment !== null,
    updateProfile,
  };
}
