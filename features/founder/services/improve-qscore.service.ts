/**
 * Improve Q-Score Service — Supabase calls for the improve-qscore page
 */

import { createClient } from '@/lib/supabase/client'

export interface EvidenceRow {
  id: string
  dimension: string
  evidence_type: string
  title: string
  data_value: string
  status: string
  points_awarded: number
  created_at: string
}

export interface ImproveQScoreData {
  completedTypes: Set<string>
  evidenceList: EvidenceRow[]
  ragConflicts: Array<{ dimension?: string; current?: string; submitted?: string; resolution?: string }>
}

export async function fetchImproveQScoreData(): Promise<ImproveQScoreData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { completedTypes: new Set(), evidenceList: [], ragConflicts: [] }

  const [{ data: arts }, { data: evData }, { data: scoreRow }] = await Promise.all([
    supabase
      .from('agent_artifacts')
      .select('artifact_type')
      .eq('user_id', user.id),

    supabase
      .from('score_evidence')
      .select('id, dimension, evidence_type, title, data_value, status, points_awarded, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('qscore_history')
      .select('ai_actions')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const completedTypes = new Set((arts ?? []).map((r: { artifact_type: string }) => r.artifact_type))
  const evidenceList = (evData ?? []) as EvidenceRow[]
  const ragConflicts = (scoreRow?.ai_actions?.rag_eval?.conflicts ?? []) as ImproveQScoreData['ragConflicts']

  return { completedTypes, evidenceList, ragConflicts }
}

export interface SubmitEvidenceInput {
  dimension: string
  evidenceType: string
  title: string
  dataValue: string
  pointsAwarded: number
}

export async function submitEvidence(input: SubmitEvidenceInput): Promise<EvidenceRow> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('score_evidence')
    .insert({
      user_id:       user.id,
      dimension:     input.dimension,
      evidence_type: input.evidenceType,
      title:         input.title,
      data_value:    input.dataValue,
      status:        'pending',
      points_awarded: input.pointsAwarded,
    })
    .select()
    .single()

  if (error) throw error
  return data as EvidenceRow
}
