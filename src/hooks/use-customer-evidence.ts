/**
 * useCustomerEvidence Hook
 * Extracts state logic from CustomerEvidenceForm
 * Clean architecture: Hook layer sits between UI and Store
 */

import { useState, useMemo } from 'react';
import { useAssessmentStore } from '@/src/store/assessment.store';

export interface CustomerEvidenceValidation {
  quoteWordCount: number;
  surpriseWordCount: number;
  daysAgo: number | null;
  hasStrongPainSignal: boolean;
  quoteProgressColor: string;
  surpriseProgressColor: string;
  dateRecencyColor: string;
  conversationCountColor: string;
  conversationCountLabel: string;
}

export const COMMITMENT_LEVELS = [
  { value: '', label: 'Select commitment level...' },
  { value: 'signed-loi', label: '✅ Yes - Signed LOI or contract (strongest!)' },
  { value: 'will-pay', label: '💰 Yes - Verbally committed to pay' },
  { value: 'switch', label: '🔄 Said they would switch from current solution' },
  { value: 'interested', label: '👀 Interested but no commitment' },
  { value: 'maybe', label: '🤔 Maybe/need to think about it' },
  { value: 'no', label: '❌ No commitment discussed' },
];

export function useCustomerEvidence() {
  // Get data from store
  const data = useAssessmentStore((state) => ({
    customerType: state.data.customerType,
    conversationDate: state.data.conversationDate,
    customerQuote: state.data.customerQuote,
    customerSurprise: state.data.customerSurprise,
    customerCommitment: state.data.customerCommitment,
    conversationCount: state.data.conversationCount,
    customerList: state.data.customerList,
  }));
  const actions = useAssessmentStore((state) => state.actions);

  // Local state for customer list input
  const [newCustomer, setNewCustomer] = useState('');

  // Computed: Word counts
  const quoteWordCount = useMemo(() => {
    return data.customerQuote.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.customerQuote]);

  const surpriseWordCount = useMemo(() => {
    return data.customerSurprise.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [data.customerSurprise]);

  // Computed: Days ago calculation
  const daysAgo = useMemo(() => {
    if (!data.conversationDate) return null;
    const days = Math.floor(
      (new Date().getTime() - new Date(data.conversationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  }, [data.conversationDate]);

  // Computed: Pain signal detection
  const hasStrongPainSignal = useMemo(() => {
    return /nightmare|terrible|hate|frustrated|expensive|waste|insane|killing|painful/i.test(
      data.customerQuote
    );
  }, [data.customerQuote]);

  // Computed: Validation
  const validation = useMemo((): CustomerEvidenceValidation => {
    // Quote progress color
    const quoteProgressColor =
      quoteWordCount >= 50
        ? 'text-green-600'
        : quoteWordCount >= 30
        ? 'text-yellow-600'
        : 'text-gray-500';

    // Surprise progress color
    const surpriseProgressColor =
      surpriseWordCount >= 25
        ? 'text-green-600'
        : surpriseWordCount >= 15
        ? 'text-yellow-600'
        : 'text-gray-500';

    // Date recency color
    const dateRecencyColor =
      daysAgo !== null
        ? daysAgo <= 30
          ? 'text-green-600'
          : daysAgo <= 90
          ? 'text-yellow-600'
          : 'text-orange-600'
        : 'text-gray-500';

    // Conversation count color
    const conversationCountColor =
      data.conversationCount >= 50
        ? 'text-green-600'
        : data.conversationCount >= 20
        ? 'text-blue-600'
        : data.conversationCount >= 10
        ? 'text-yellow-600'
        : 'text-gray-600';

    // Conversation count label
    const conversationCountLabel =
      data.conversationCount >= 50
        ? '🔥 Exceptional'
        : data.conversationCount >= 20
        ? '✅ Strong'
        : data.conversationCount >= 10
        ? '👍 Good start'
        : data.conversationCount >= 5
        ? '📈 Building momentum'
        : data.conversationCount > 0
        ? '🌱 Just starting'
        : '⚠️ Talk to customers!';

    return {
      quoteWordCount,
      surpriseWordCount,
      daysAgo,
      hasStrongPainSignal,
      quoteProgressColor,
      surpriseProgressColor,
      dateRecencyColor,
      conversationCountColor,
      conversationCountLabel,
    };
  }, [quoteWordCount, surpriseWordCount, daysAgo, hasStrongPainSignal, data.conversationCount]);

  // Actions
  const updateCustomerType = (value: string) => {
    actions.updateField('customerType', value);
  };

  const updateConversationDate = (value: Date | null) => {
    actions.updateField('conversationDate', value);
  };

  const updateCustomerQuote = (value: string) => {
    actions.updateField('customerQuote', value);
  };

  const updateCustomerSurprise = (value: string) => {
    actions.updateField('customerSurprise', value);
  };

  const updateCustomerCommitment = (value: string) => {
    actions.updateField('customerCommitment', value);
  };

  const updateConversationCount = (value: number) => {
    actions.updateField('conversationCount', value);
  };

  const addCustomer = () => {
    if (newCustomer.trim()) {
      actions.updateField('customerList', [...data.customerList, newCustomer.trim()]);
      setNewCustomer('');
    }
  };

  const removeCustomer = (index: number) => {
    const updated = data.customerList.filter((_, i) => i !== index);
    actions.updateField('customerList', updated);
  };

  return {
    data,
    validation,
    newCustomer,
    setNewCustomer,
    updateCustomerType,
    updateConversationDate,
    updateCustomerQuote,
    updateCustomerSurprise,
    updateCustomerCommitment,
    updateConversationCount,
    addCustomer,
    removeCustomer,
  };
}
