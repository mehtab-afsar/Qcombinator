/**
 * Metrics Service
 * Business logic for calculating and deriving metrics from assessment data
 */

import { AssessmentData, MetricsData } from '@/features/founder/types/founder.types';

class MetricsService {
  /**
   * Calculate all metrics from assessment data
   */
  calculateMetrics(assessment: AssessmentData): MetricsData {
    const mrr = assessment.mrr || 0;
    const arr = assessment.arr || mrr * 12;
    const burn = assessment.monthlyBurn || 0;
    const runway = assessment.runway || (burn > 0 ? 0 : Infinity);
    const cogs = assessment.cogs || 0;
    const averageDealSize = assessment.averageDealSize || 0;

    // Calculate customers from MRR and average deal size
    const customers = averageDealSize > 0 ? Math.round(mrr / averageDealSize) : 0;

    // Calculate MRR growth
    const previousMrr = assessment.previousMrr || 0;
    const mrrGrowth = previousMrr > 0
      ? ((mrr - previousMrr) / previousMrr) * 100
      : 0;

    // Calculate gross margin
    const totalCogs = customers * cogs;
    const grossMargin = mrr > 0 ? ((mrr - totalCogs) / mrr) * 100 : 0;

    // Calculate LTV
    const customerLifetimeMonths = assessment.customerLifetimeMonths || 36;
    const churnRate = 5; // Assume 5% monthly churn if not provided
    const ltv = averageDealSize * (customerLifetimeMonths / 12);

    // Calculate CAC
    const cac = assessment.currentCAC || 0;

    // Calculate LTV:CAC ratio
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    // Calculate TAM/SAM
    const targetCustomers = assessment.targetCustomers || 0;
    const avgContractValue = assessment.avgContractValue || 0;
    const tam = targetCustomers * avgContractValue;
    const samPercent = 0.30; // Assume 30% of market is serviceable
    const sam = tam * samPercent;

    // Conversion rate
    const conversionRate = assessment.conversionRate || 0;

    return {
      // Financial
      mrr,
      arr,
      burn,
      runway,
      cogs: totalCogs,
      grossMargin: Math.round(grossMargin * 10) / 10,

      // Customer
      customers,
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      churnRate,
      ltv: Math.round(ltv),
      cac: Math.round(cac),
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,

      // Market
      tam: Math.round(tam),
      sam: Math.round(sam),
      conversionRate: Math.round(conversionRate * 10) / 10,

      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate unit economics
   */
  calculateUnitEconomics(assessment: AssessmentData) {
    const ltv = this.calculateLTV(assessment);
    const cac = assessment.currentCAC || 0;
    const avgDealSize = assessment.averageDealSize || 0;
    const cogs = assessment.cogs || 0;

    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    const paybackMonths = (avgDealSize - cogs) > 0
      ? cac / (avgDealSize - cogs)
      : 0;
    const grossMargin = avgDealSize > 0
      ? ((avgDealSize - cogs) / avgDealSize) * 100
      : 0;

    return {
      ltv: Math.round(ltv),
      cac: Math.round(cac),
      ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
      paybackMonths: Math.round(paybackMonths * 10) / 10,
      grossMargin: Math.round(grossMargin * 10) / 10,
    };
  }

  /**
   * Calculate LTV (Lifetime Value)
   */
  private calculateLTV(assessment: AssessmentData): number {
    const avgContractValue = assessment.avgContractValue || 0;
    const customerLifetimeMonths = assessment.customerLifetimeMonths || 36;

    return avgContractValue * (customerLifetimeMonths / 12);
  }

  /**
   * Calculate growth metrics
   */
  calculateGrowthMetrics(assessment: AssessmentData) {
    const mrr = assessment.mrr || 0;
    const previousMrr = assessment.previousMrr || 0;
    const burn = assessment.monthlyBurn || 0;

    const mrrGrowth = previousMrr > 0
      ? ((mrr - previousMrr) / previousMrr) * 100
      : 0;

    const netNewMrr = mrr - previousMrr;
    const burnMultiple = netNewMrr > 0 ? burn / netNewMrr : 0;

    const customers = this.calculateCustomers(assessment);
    const previousCustomers = previousMrr && assessment.averageDealSize
      ? Math.round(previousMrr / assessment.averageDealSize)
      : 0;
    const customerGrowth = previousCustomers > 0
      ? ((customers - previousCustomers) / previousCustomers) * 100
      : 0;

    return {
      mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      netNewMrr: Math.round(netNewMrr),
      burnMultiple: Math.round(burnMultiple * 10) / 10,
      customerGrowth: Math.round(customerGrowth * 10) / 10,
    };
  }

  /**
   * Calculate number of customers
   */
  private calculateCustomers(assessment: AssessmentData): number {
    const mrr = assessment.mrr || 0;
    const avgDealSize = assessment.averageDealSize || 0;

    return avgDealSize > 0 ? Math.round(mrr / avgDealSize) : 0;
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(metrics: MetricsData): {
    overall: 'healthy' | 'warning' | 'critical';
    issues: string[];
    strengths: string[];
  } {
    const issues: string[] = [];
    const strengths: string[] = [];

    // Check LTV:CAC ratio
    if (metrics.ltvCacRatio < 3) {
      issues.push('LTV:CAC ratio below 3:1 target');
    } else if (metrics.ltvCacRatio > 5) {
      strengths.push('Excellent LTV:CAC ratio');
    }

    // Check runway
    if (metrics.runway < 6) {
      issues.push('Less than 6 months runway');
    } else if (metrics.runway > 12) {
      strengths.push('Strong runway (12+ months)');
    }

    // Check gross margin
    if (metrics.grossMargin < 70) {
      issues.push('Gross margin below 70% (SaaS target)');
    } else {
      strengths.push('Healthy gross margin');
    }

    // Check MRR growth
    if (metrics.mrrGrowth < 10) {
      issues.push('MRR growth below 10% MoM');
    } else if (metrics.mrrGrowth > 20) {
      strengths.push('Strong MRR growth');
    }

    const overall = issues.length > 2 ? 'critical'
      : issues.length > 0 ? 'warning'
      : 'healthy';

    return { overall, issues, strengths };
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
