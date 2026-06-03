/**
 * POST /api/agents/process-delegation
 *
 * Autonomously runs a target agent to fulfil a delegation task — WITHOUT
 * requiring a user to open that agent and send a message.
 *
 * Called by the cron job (/api/agents/schedule/run) for immediate-priority
 * delegation tasks. This is the core of what makes the system truly agentic:
 * work happens because a state change triggered it, not because the user asked.
 *
 * Flow:
 *   1. Load delegation task from delegation_tasks table
 *   2. Load target agent's system prompt + founder context
 *   3. Build generation context from delegation payload + startup state
 *   4. Generate the appropriate artifact via routedText
 *   5. Save to agent_artifacts
 *   6. Update startup_state with extracted facts
 *   7. Send in-app notification to founder
 *
 * Protected by INTERNAL_RUN_SECRET (x-internal-secret header).
 */

export const runtime = 'nodejs'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { routedText } from '@/lib/llm/router'
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts'
import { getFounderProfileContext } from '@/lib/agents/founder-context'
import { getStartupState, formatStartupStateForPrompt, updateStartupState, extractStateFromArtifact } from '@/lib/agents/startup-state'
import { extractKeyFields } from '@/lib/agents/context-compressor'
import { applyAgentScoreSignal } from '@/features/qscore/services/agent-signal'
import { log } from '@/lib/logger'

// ─── Agent system prompts (imported lazily to avoid circular deps) ─────────────

import { patelSystemPrompt }  from '@/features/agents/patel/prompts/system-prompt'
import { harperSystemPrompt } from '@/features/agents/harper/prompts/system-prompt'
import { mayaSystemPrompt }   from '@/features/agents/maya/prompts/system-prompt'
import { susiSystemPrompt }   from '@/features/agents/susi/prompts/system-prompt'
import { felixSystemPrompt }  from '@/features/agents/felix/prompts/system-prompt'
import { atlasSystemPrompt }  from '@/features/agents/atlas/prompts/system-prompt'
import { sageSystemPrompt }   from '@/features/agents/sage/prompts/system-prompt'

const AGENT_PROMPTS: Record<string, string> = {
  patel: patelSystemPrompt,
  harper: harperSystemPrompt,
  maya: mayaSystemPrompt,
  susi: susiSystemPrompt,
  felix: felixSystemPrompt,
  atlas: atlasSystemPrompt,
  sage: sageSystemPrompt,
}

// ─── Payload type → artifact type mapping ──────────────────────────────────────
// Each delegation payload type maps to the artifact the target agent should produce

const DELEGATION_ARTIFACT_MAP: Record<string, string> = {
  financial_constraint_changed:    'hiring_plan',            // Felix → Harper: tighten hiring for new runway
  competitive_landscape_changed:   'icp_document',           // Atlas → Patel: refine ICP based on competitive gaps
  pmf_signal_updated:              'brand_messaging',        // Nova → Maya: refresh messaging for new PMF signal
  icp_updated:                     'sales_script',           // Patel → Susi: update sales script for new ICP
  pipeline_thin:                   'icp_document',           // Susi → Patel: thin pipeline = wrong ICP
  churn_risk_detected:             'sales_script',           // Carter → Susi: high churn = commercial intervention
  growth_stalling:                 'brand_messaging',        // Riley → Maya: stalling growth = messaging refresh
  brand_refresh_needed:            'brand_messaging',        // Maya → Maya: stale brand = self-generate
  legal_risk_escalation:           'investor_readiness_report', // Leo → Sage: legal risks affect fundraising
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  // Validate internal secret
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_RUN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { taskId } = await req.json() as { taskId: string }
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const admin = getAdmin()

  // ── Step 1: Load the delegation task ──────────────────────────────────────
  const { data: task, error: taskErr } = await admin
    .from('delegation_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (taskErr || !task) {
    log.error('[process-delegation] task not found', { taskId, err: taskErr?.message })
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const { to_agent: toAgent, from_agent: fromAgent, user_id: userId, instruction, payload_type: payloadType, payload_data: payloadData } = task as {
    to_agent: string; from_agent: string; user_id: string
    instruction: string; payload_type: string; payload_data: Record<string, unknown>
  }

  const artifactType = DELEGATION_ARTIFACT_MAP[payloadType]
  if (!artifactType) {
    log.warn('[process-delegation] no artifact mapping for payload type', { payloadType, taskId })
    await admin.from('delegation_tasks').update({ status: 'failed', error: `No artifact mapping for payload type: ${payloadType}` }).eq('id', taskId)
    return NextResponse.json({ error: 'No artifact mapping' }, { status: 422 })
  }

  const agentPrompt = AGENT_PROMPTS[toAgent]
  if (!agentPrompt) {
    log.warn('[process-delegation] no system prompt for agent', { toAgent, taskId })
    await admin.from('delegation_tasks').update({ status: 'failed', error: `No system prompt for agent: ${toAgent}` }).eq('id', taskId)
    return NextResponse.json({ error: 'Unknown agent' }, { status: 422 })
  }

  // ── Step 2: Load founder context ──────────────────────────────────────────
  const [founderCtx, startupState] = await Promise.all([
    getFounderProfileContext(userId, admin, toAgent).catch(() => null),
    getStartupState(userId, admin).catch(() => null),
  ])

  const stateBlock = startupState ? formatStartupStateForPrompt(startupState) : ''
  const founderBlock = founderCtx?.block ?? ''

  // ── Step 3: Build generation context from delegation payload ──────────────
  const generationContext: Record<string, unknown> = {
    delegatedBy: fromAgent,
    instruction,
    ...payloadData,
  }

  // ── Step 4: Generate the artifact ─────────────────────────────────────────
  const systemPrompt = [
    agentPrompt,
    founderBlock,
    stateBlock,
    `\n\nAUTONOMOUS DELEGATION FROM ${fromAgent.toUpperCase()}:\n${instruction}\n`,
    `Generate the ${artifactType.replace(/_/g, ' ')} based on this delegation context. Use all available founder data. Return ONLY valid JSON.`,
  ].filter(Boolean).join('\n\n')

  const artifactPrompt = getArtifactPrompt(artifactType, generationContext, null)

  let parsedContent: Record<string, unknown>
  try {
    const raw = await routedText('generation', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: artifactPrompt + '\n\nGenerate the complete artifact now. Return ONLY valid JSON.' },
    ])
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found in response')
    parsedContent = JSON.parse(match[0])
  } catch (err) {
    const errMsg = (err as Error)?.message ?? 'Generation failed'
    log.error('[process-delegation] artifact generation failed', { taskId, toAgent, artifactType, err: errMsg })
    await admin.from('delegation_tasks').update({ status: 'failed', error: errMsg }).eq('id', taskId)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  const artifactTitle = (parsedContent.title as string | undefined)
    ?? `${artifactType.replace(/_/g, ' ')} (updated by ${fromAgent})`

  // ── Step 5: Save to agent_artifacts ───────────────────────────────────────
  const keyFields = extractKeyFields(artifactType, parsedContent)
  const { data: insertedArtifact, error: insertErr } = await admin
    .from('agent_artifacts')
    .insert({
      user_id:       userId,
      agent_id:      toAgent,
      artifact_type: artifactType,
      title:         artifactTitle,
      content:       parsedContent,
      key_fields:    keyFields,
    })
    .select('id')
    .single()

  if (insertErr || !insertedArtifact) {
    log.error('[process-delegation] artifact insert failed', { taskId, err: insertErr?.message })
    await admin.from('delegation_tasks').update({ status: 'failed', error: insertErr?.message ?? 'insert failed' }).eq('id', taskId)
    return NextResponse.json({ error: 'Failed to save artifact' }, { status: 500 })
  }

  const artifactId = insertedArtifact.id

  // ── Step 6: Update startup state + Q-Score signal ─────────────────────────
  try {
    const stateUpdates = extractStateFromArtifact(toAgent, artifactType, parsedContent)
    if (Object.keys(stateUpdates).length > 0 && startupState) {
      await updateStartupState(userId, stateUpdates, toAgent, admin)
    }
    await applyAgentScoreSignal(admin, userId, artifactType)
  } catch (err) {
    log.warn('[process-delegation] post-artifact state update failed', { taskId, err: (err as Error)?.message })
  }

  // ── Step 7: Notify the founder ────────────────────────────────────────────
  try {
    await admin.from('notifications').insert({
      user_id:  userId,
      type:     'agent_action',
      title:    `${toAgent.charAt(0).toUpperCase() + toAgent.slice(1)} updated your ${artifactType.replace(/_/g, ' ')}`,
      metadata: {
        artifactId,
        artifactType,
        delegationTaskId: taskId,
        fromAgent,
        toAgent,
        instruction: instruction.slice(0, 200),
      },
    })
  } catch (err) {
    log.warn('[process-delegation] notification insert failed', { taskId, err: (err as Error)?.message })
  }

  // Log the autonomous action for visibility in agent activity feed
  void Promise.resolve(admin.from('agent_activity').insert({
    user_id:     userId,
    agent_id:    toAgent,
    action_type: 'autonomous_delegation',
    description: `${toAgent} autonomously updated ${artifactType.replace(/_/g, ' ')} (requested by ${fromAgent})`,
    metadata:    { artifactId, delegationTaskId: taskId, fromAgent, payloadType },
  }))

  log.info('[process-delegation] completed', { taskId, toAgent, artifactType, artifactId })
  return NextResponse.json({ success: true, artifactId, artifactType })
}
