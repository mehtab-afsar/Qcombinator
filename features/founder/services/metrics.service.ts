/**
 * Metrics Service — saves manual metrics as a financial_summary artifact
 */

import { createClient } from '@/lib/supabase/client'
import { ARTIFACT_TYPES } from '@/lib/constants/artifact-types'
import { AGENT_IDS } from '@/lib/constants/agent-ids'

export interface MetricsFormInput {
  mrr: string
  monthlyBurn: string
  customers: string
  ltv: string
  cac: string
  grossMargin: string
  tam: string
  runway: string
  mrrGrowth: string
  conversionRate: string
}

export async function saveMetrics(form: MetricsFormInput): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const mrr    = Number(form.mrr) || 0
  const tamVal = (Number(form.tam) || 0) * 1_000_000

  const content = {
    mrr,
    arr:            mrr * 12,
    monthlyBurn:    Number(form.monthlyBurn)    || 0,
    customers:      Number(form.customers)      || 0,
    ltv:            Number(form.ltv)            || 0,
    cac:            Number(form.cac)            || 0,
    grossMargin:    Number(form.grossMargin)    || 0,
    tam:            tamVal,
    sam:            tamVal * 0.3,
    runway:         Number(form.runway)         || 0,
    mrrGrowth:      Number(form.mrrGrowth)      || 0,
    conversionRate: Number(form.conversionRate) || 0,
    source:         'manual',
  }

  const { error } = await supabase.from('agent_artifacts').insert({
    user_id:       user.id,
    agent_id:      AGENT_IDS.FELIX,
    artifact_type: ARTIFACT_TYPES.FINANCIAL_SUMMARY,
    title:         `Manual metrics update — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    content,
    version:       1,
  })

  if (error) throw error
}
