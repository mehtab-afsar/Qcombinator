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
 * Priority: 1) Felix's financial_summary artifact (Supabase)
 *           2) qscore_history assessment data (Supabase)
 *           3) Legacy localStorage assessment data
 */
export function useMetrics(refreshTrigger = 0) {
  const { assessment, loading: assessmentLoading } = useAssessmentData();
  const [metrics,       setMetrics]       = useState<MetricsData | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);

  useEffect(() => {
    setMetrics(null);
    setSupabaseLoading(true);
    (async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSupabaseLoading(false); return; }

        // ── 1. Financial summary artifact (richest source) ──────────
        const { data: artifacts } = await supabase
          .from('agent_artifacts')
          .select('content, created_at')
          .eq('user_id', user.id)
          .eq('artifact_type', 'financial_summary')
          .order('created_at', { ascending: false })
          .limit(1);

        if (artifacts && artifacts.length > 0) {
          const c = artifacts[0].content as Record<string, unknown>;
          const n = (k: string) => Number((c[k] ?? c.unitEconomics ? (c.unitEconomics as Record<string, unknown>)?.[k] : 0) ?? 0);
          const mrr   = n('mrr');
          const burn  = n('monthlyBurn') || n('burn');
          const ltv   = n('ltv') || n('lifetimeValue');
          const cac   = n('cac') || n('costPerAcquisition');
          const ltvCacRatio = cac > 0 ? parseFloat((ltv / cac).toFixed(1)) : 0;
          const runway = burn > 0 ? (n('runway') || Math.round((n('cashOnHand') || mrr * 6) / burn)) : n('runway');

          setMetrics({
            mrr,
            arr:            mrr * 12,
            burn,
            runway,
            cogs:           0,
            grossMargin:    n('grossMargin'),
            customers:      n('customers') || n('payingCustomers'),
            mrrGrowth:      n('mrrGrowth') || n('growthRate'),
            churnRate:      n('churnRate'),
            ltv,
            cac,
            ltvCacRatio,
            tam:            n('tam') || n('totalMarketSize'),
            sam:            n('sam'),
            conversionRate: n('conversionRate'),
            calculatedAt:   new Date(artifacts[0].created_at),
          });
          setSupabaseLoading(false);
          return;
        }

        // ── 2. qscore_history for assessment-derived financials ──────
        // assessment_data column was added in migration 20260225000012 — fall back gracefully
        const historyResult = await supabase
          .from('qscore_history')
          .select('assessment_data, calculated_at')
          .eq('user_id', user.id)
          .order('calculated_at', { ascending: false })
          .limit(1);
        const history = historyResult.error ? null : historyResult.data;

        if (history && history.length > 0 && history[0].assessment_data) {
          const ad = history[0].assessment_data as Record<string, unknown>;
          const n2 = (k: string) => Number(ad[k] ?? 0);
          const mrr   = n2('mrr');
          const burn  = n2('monthlyBurn');
          const ltv   = n2('lifetimeValue');
          const cac   = n2('costPerAcquisition');
          const ltvCacRatio = cac > 0 ? parseFloat((ltv / cac).toFixed(1)) : 0;

          if (mrr > 0 || burn > 0) {
            setMetrics({
              mrr,
              arr:            mrr * 12,
              burn,
              runway:         n2('runway') || (burn > 0 ? Math.round(n2('cashOnHand') / burn) : 0),
              cogs:           0,
              grossMargin:    n2('grossMargin'),
              customers:      n2('payingCustomers'),
              mrrGrowth:      0,
              churnRate:      0,
              ltv,
              cac,
              ltvCacRatio,
              tam:            n2('totalMarketSize'),
              sam:            n2('totalMarketSize') * 0.3,
              conversionRate: n2('conversionRate'),
              calculatedAt:   new Date(history[0].calculated_at),
            });
            setSupabaseLoading(false);
            return;
          }
        }
      } catch { /* fall through to localStorage */ }
      setSupabaseLoading(false);
    })();
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
