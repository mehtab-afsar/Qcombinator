/**
 * useMarketCalculator Hook
 * Extracts state logic from MarketCalculator
 * Clean architecture: Hook layer sits between UI and Store
 */

import { useMemo } from 'react';
import { useAssessmentStore } from '@/src/store/assessment.store';

export interface MarketCalculations {
  projectedRevenue: number;
  customerCount: number;
  revenuePerConversation: number;
  dailyConversations: number;
  ltv: number;
  ltvCacRatio: number;
}

export interface MarketWarnings {
  warnings: string[];
}

export const VALIDATION_OPTIONS = [
  { id: 'reach-plan', label: 'I have a plan to reach this many prospects' },
  {
    id: 'conversion-validated',
    label: 'My conversion rate is based on actual early conversations',
  },
  { id: 'pricing-validated', label: 'My pricing is validated with at least 3 customers' },
];

export function useMarketCalculator() {
  // Get data from store
  const data = useAssessmentStore((state) => ({
    targetCustomers: state.data.targetCustomers,
    talkToCount: state.data.talkToCount,
    conversionRate: state.data.conversionRate,
    avgContractValue: state.data.avgContractValue,
    customerLifetimeMonths: state.data.customerLifetimeMonths,
    validationChecks: state.data.validationChecks,
  }));
  const actions = useAssessmentStore((state) => state.actions);

  // Computed: Calculations
  const calculations = useMemo((): MarketCalculations => {
    const customerCount = data.talkToCount * (data.conversionRate / 100);
    const projectedRevenue = customerCount * data.avgContractValue;
    const revenuePerConversation =
      data.talkToCount > 0 ? projectedRevenue / data.talkToCount : 0;
    const dailyConversations = data.talkToCount / (18 * 20); // 18 months, 20 work days

    const assumedCAC = 500;
    const ltv = data.avgContractValue * data.customerLifetimeMonths;
    const ltvCacRatio = ltv / assumedCAC;

    return {
      projectedRevenue,
      customerCount,
      revenuePerConversation,
      dailyConversations,
      ltv,
      ltvCacRatio,
    };
  }, [data.talkToCount, data.conversionRate, data.avgContractValue, data.customerLifetimeMonths]);

  // Computed: Warnings
  const warnings = useMemo((): string[] => {
    const newWarnings: string[] = [];

    if (calculations.dailyConversations > 5) {
      newWarnings.push(
        `${calculations.dailyConversations.toFixed(
          1
        )} conversations/day is very ambitious. Have a plan to reach that many prospects?`
      );
    }

    if (data.conversionRate > 15) {
      newWarnings.push(
        `${data.conversionRate}% conversion rate is unusually high for cold outreach (typical: 2-8%)`
      );
    }

    if (calculations.ltvCacRatio < 3) {
      newWarnings.push('LTV:CAC ratio below 3:1 suggests challenging unit economics');
    }

    if (calculations.projectedRevenue < 100000 && data.talkToCount > 0) {
      newWarnings.push(
        'Revenue under $100K in 18 months may be too small to attract institutional investors'
      );
    }

    if (data.talkToCount < 50 && data.talkToCount > 0) {
      newWarnings.push('Talking to 50+ prospects shows commitment and thoroughness');
    }

    return newWarnings;
  }, [calculations, data.conversionRate, data.talkToCount]);

  // Computed: Validation colors
  const conversionColor = useMemo(() => {
    if (data.conversionRate >= 2 && data.conversionRate <= 8) return 'text-green-600';
    if (data.conversionRate < 2) return 'text-blue-600';
    if (data.conversionRate <= 15) return 'text-yellow-600';
    return 'text-red-600';
  }, [data.conversionRate]);

  const dailyConversationsColor = useMemo(() => {
    if (calculations.dailyConversations <= 3) return 'text-green-600';
    if (calculations.dailyConversations <= 5) return 'text-yellow-600';
    return 'text-red-600';
  }, [calculations.dailyConversations]);

  const ltvCacRatioColor = useMemo(() => {
    if (calculations.ltvCacRatio >= 3) return 'text-green-600';
    if (calculations.ltvCacRatio >= 2) return 'text-yellow-600';
    return 'text-red-600';
  }, [calculations.ltvCacRatio]);

  // Helper: Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Actions
  const updateTargetCustomers = (value: number) => {
    actions.updateField('targetCustomers', value);
  };

  const updateTalkToCount = (value: number) => {
    actions.updateField('talkToCount', value);
  };

  const updateConversionRate = (value: number) => {
    actions.updateField('conversionRate', value);
  };

  const updateAvgContractValue = (value: number) => {
    actions.updateField('avgContractValue', value);
  };

  const updateCustomerLifetimeMonths = (value: number) => {
    actions.updateField('customerLifetimeMonths', value);
  };

  const toggleValidationCheck = (id: string) => {
    if (data.validationChecks.includes(id)) {
      actions.updateField(
        'validationChecks',
        data.validationChecks.filter((c) => c !== id)
      );
    } else {
      actions.updateField('validationChecks', [...data.validationChecks, id]);
    }
  };

  return {
    data,
    calculations,
    warnings,
    conversionColor,
    dailyConversationsColor,
    ltvCacRatioColor,
    formatCurrency,
    updateTargetCustomers,
    updateTalkToCount,
    updateConversionRate,
    updateAvgContractValue,
    updateCustomerLifetimeMonths,
    toggleValidationCheck,
  };
}
