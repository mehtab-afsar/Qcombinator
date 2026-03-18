/**
 * Founder Data Service — Supabase queries for metrics
 * Pure async functions, no React
 */

import { MetricsData } from '../types/founder.types'

/** Fetches MetricsData from Supabase (financial_summary artifact → qscore_history fallback).
 *  Returns null if neither source has usable data or the user is unauthenticated.
 */
export async function fetchMetricsFromSupabase(): Promise<MetricsData | null> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // ── 1. Financial summary artifact (richest source) ──────────────────────────
  const { data: artifacts } = await supabase
    .from('agent_artifacts')
    .select('content, created_at')
    .eq('user_id', user.id)
    .eq('artifact_type', 'financial_summary')
    .order('created_at', { ascending: false })
    .limit(1)

  if (artifacts && artifacts.length > 0) {
    const c = artifacts[0].content as Record<string, unknown>
    const n = (k: string) =>
      Number(
        (c[k] ?? (c.unitEconomics ? (c.unitEconomics as Record<string, unknown>)?.[k] : 0)) ?? 0
      )
    const mrr  = n('mrr')
    const burn = n('monthlyBurn') || n('burn')
    const ltv  = n('ltv') || n('lifetimeValue')
    const cac  = n('cac') || n('costPerAcquisition')

    return {
      mrr,
      arr:            mrr * 12,
      burn,
      runway:         burn > 0 ? (n('runway') || Math.round((n('cashOnHand') || mrr * 6) / burn)) : n('runway'),
      cogs:           0,
      grossMargin:    n('grossMargin'),
      customers:      n('customers') || n('payingCustomers'),
      mrrGrowth:      n('mrrGrowth') || n('growthRate'),
      churnRate:      n('churnRate'),
      ltv,
      cac,
      ltvCacRatio:    cac > 0 ? parseFloat((ltv / cac).toFixed(1)) : 0,
      tam:            n('tam') || n('totalMarketSize'),
      sam:            n('sam'),
      conversionRate: n('conversionRate'),
      calculatedAt:   new Date(artifacts[0].created_at),
    }
  }

  // ── 2. qscore_history for assessment-derived financials ─────────────────────
  const historyResult = await supabase
    .from('qscore_history')
    .select('assessment_data, calculated_at')
    .eq('user_id', user.id)
    .order('calculated_at', { ascending: false })
    .limit(1)
  const history = historyResult.error ? null : historyResult.data

  if (history && history.length > 0 && history[0].assessment_data) {
    const ad = history[0].assessment_data as Record<string, unknown>
    const n2 = (k: string) => Number(ad[k] ?? 0)
    const mrr  = n2('mrr')
    const burn = n2('monthlyBurn')
    const ltv  = n2('lifetimeValue')
    const cac  = n2('costPerAcquisition')

    if (mrr > 0 || burn > 0) {
      return {
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
        ltvCacRatio:    cac > 0 ? parseFloat((ltv / cac).toFixed(1)) : 0,
        tam:            n2('totalMarketSize'),
        sam:            n2('totalMarketSize') * 0.3,
        conversionRate: n2('conversionRate'),
        calculatedAt:   new Date(history[0].calculated_at),
      }
    }
  }

  return null
}
