/**
 * Chat Context Builder — enriches the base system prompt with all dynamic context.
 *
 * Runs four parallel data fetches (agent context, orchestration, founder profile,
 * startup state), then injects them into the system prompt in the correct order.
 * Also handles RAG injections and the token budget guard.
 *
 * Extracted from app/api/agents/chat/route.ts to make the context-loading
 * pipeline independently readable and testable.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { orchestrate } from '@/lib/agents/orchestrator'
import { getAgentContext, formatContextForPrompt } from '@/lib/agents/context'
import { getFounderProfileContext, type FounderProfileResult } from '@/lib/agents/founder-context'
import { getStartupState, formatStartupStateForPrompt, type StartupState } from '@/lib/agents/startup-state'
import { getAgentGoal, formatGoalForPrompt } from '@/lib/agents/agent-goals'
import { getPendingDelegations, formatDelegationsForPrompt, markDelegationRunning } from '@/lib/agents/delegation'
import { getAgentMemory } from '@/lib/agents/memory-loader'
import { getRelevantResources, formatResourcesForPrompt } from '@/features/knowledge/library'
import { getRelevantDocumentChunks } from '@/lib/agents/document-rag'
import { buildPatelQuestionBank } from '@/lib/agents/patel-question-bank'
import { getAgentById } from '@/features/agents/data/agents'
import { FF_CROSS_AGENT_ORCHESTRATION } from '@/lib/feature-flags'
import type { PatelScores, PatelConfidence } from '@/lib/constants/patel-indicators'
import { log } from '@/lib/logger'

export type SourceItem = { label: string; type: 'profile' | 'memory' | 'artifact' | 'cross_agent' }

export interface ChatContextResult {
  systemPrompt:     string
  patelRawScores:   PatelScores | undefined
  patelRawConfidence: PatelConfidence | undefined
  startupState:     StartupState | null
  sourcesUsed:      SourceItem[]
  compressionInfo:  { applied: boolean; droppedCount: number }
}

const SYSTEM_PROMPT_CHAR_LIMIT = 6000

function trimMemoryBlock(prompt: string, maxEntries = 3): { prompt: string; trimmed: boolean } {
  const MEMORY_HEADER = '\n\nMEMORY — What you have previously built'
  const NEXT_SECTION_RE = /\n\n[A-Z]/
  const start = prompt.indexOf(MEMORY_HEADER)
  if (start === -1) return { prompt, trimmed: false }
  const afterHeader = start + MEMORY_HEADER.length
  const nextMatch = prompt.slice(afterHeader).search(NEXT_SECTION_RE)
  const end = nextMatch !== -1 ? afterHeader + nextMatch : prompt.length
  const block = prompt.slice(start, end)
  const lines = block.split('\n').filter(l => l.startsWith('- '))
  if (lines.length <= maxEntries) return { prompt, trimmed: false }
  const kept = lines.slice(0, maxEntries).join('\n')
  const rebuilt = MEMORY_HEADER + '\n' + kept
  return { prompt: prompt.slice(0, start) + rebuilt + prompt.slice(end), trimmed: true }
}

export async function buildChatContext(params: {
  agentId: string
  userId: string | undefined
  message: string
  existingConversationId: string | null | undefined
  conversationHistory: Array<{ role: string; content: string }> | undefined
  baseSystemPrompt: string
  supabase: SupabaseClient
}): Promise<ChatContextResult> {
  const { agentId, userId, message, existingConversationId, conversationHistory, supabase } = params

  let systemPrompt = params.baseSystemPrompt
  const sourcesUsed: SourceItem[] = []
  let compressionInfo = { applied: false, droppedCount: 0 }
  let startupState: StartupState | null = null
  let patelRawScores: PatelScores | undefined
  let patelRawConfidence: PatelConfidence | undefined

  if (userId) {
    // Four parallel loads — orchestration capped at 2s to avoid blocking first token
    const orchFallback = { subAgentResults: [] as Awaited<ReturnType<typeof orchestrate>>['subAgentResults'], contextInjection: '', subCallsUsed: 0 }
    let orchTimedOut = false
    const orchWithTimeout = FF_CROSS_AGENT_ORCHESTRATION
      ? Promise.race([
          orchestrate(agentId, userId, message, supabase),
          new Promise<typeof orchFallback>(r => setTimeout(() => {
            orchTimedOut = true
            log.warn('[orchestration] 2s timeout — cross-agent context dropped', { agentId, userId })
            r(orchFallback)
          }, 2000)),
        ])
      : Promise.resolve(orchFallback)

    const parallelTasks: [
      Promise<Awaited<ReturnType<typeof getAgentContext>>>,
      Promise<typeof orchFallback>,
      Promise<FounderProfileResult>,
      Promise<StartupState | null>,
    ] = [
      getAgentContext(agentId, userId, supabase, message),
      orchWithTimeout,
      getFounderProfileContext(userId, supabase, agentId),
      getStartupState(userId, supabase),
    ]
    const [ctxResult, orchResult, founderCtxResult, stateResult] = await Promise.allSettled(parallelTasks)

    // Founder profile — injected first so agents see it before artifact memory
    if (founderCtxResult.status === 'fulfilled' && founderCtxResult.value) {
      systemPrompt += founderCtxResult.value.block
    }

    patelRawScores = founderCtxResult.status === 'fulfilled' ? founderCtxResult.value?.rawScores : undefined
    patelRawConfidence = founderCtxResult.status === 'fulfilled' ? founderCtxResult.value?.rawConfidence : undefined
    if (agentId === 'patel' && !patelRawScores) log.warn('patel_scores_missing', { userId, agentId })

    // Patel: curated question bank for active constraint dimension
    if (agentId === 'patel') {
      const qBank = buildPatelQuestionBank(patelRawScores, patelRawConfidence)
      if (qBank) systemPrompt += qBank
    }

    // Patel: de-duplicate questions already asked this session
    if (agentId === 'patel' && (conversationHistory || []).length > 0) {
      const askedQuestions = (conversationHistory as Array<{ role: string; content: string }>)
        .filter(m => m.role === 'assistant')
        .flatMap(m => m.content.split('\n').filter(l => l.trim().endsWith('?') && l.trim().length > 20))
        .slice(-6)
      if (askedQuestions.length > 0) {
        systemPrompt += `\n\nQUESTIONS ALREADY ASKED THIS SESSION — do not repeat, do not rephrase:\n${askedQuestions.map(q => `- ${q.trim()}`).join('\n')}`
      }
    }

    // Startup state world model
    if (stateResult.status === 'fulfilled') {
      startupState = stateResult.value
      const stateBlock = formatStartupStateForPrompt(startupState)
      if (stateBlock) systemPrompt += stateBlock
    }

    // Latest artifact from this conversation (enables "edit this" follow-ups)
    if (existingConversationId) {
      try {
        const { data: latestArt } = await supabase
          .from('agent_artifacts')
          .select('artifact_type, title, content')
          .eq('conversation_id', existingConversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (latestArt) {
          const snippet = JSON.stringify(latestArt.content).slice(0, 3000)
          systemPrompt += `\n\n<latest_artifact type="${latestArt.artifact_type}" title="${latestArt.title}">\n${snippet}\n</latest_artifact>\nWhen the founder asks to refine, edit, or update this document, call generate_artifact with the same artifact type — the conversation history already contains their requested changes.`
        }
      } catch { /* non-critical */ }
    }

    // Pending delegations + agent goal
    const [delegationsResult, goalResult] = await Promise.allSettled([
      getPendingDelegations(agentId, userId, supabase),
      startupState ? getAgentGoal(agentId, userId, supabase) : Promise.resolve(null),
    ])
    if (delegationsResult.status === 'fulfilled' && delegationsResult.value.length > 0) {
      systemPrompt += formatDelegationsForPrompt(delegationsResult.value)
      for (const task of delegationsResult.value) {
        if (task.priority === 'immediate') void markDelegationRunning(task.id, supabase)
      }
    }
    if (goalResult.status === 'fulfilled') systemPrompt += formatGoalForPrompt(goalResult.value)

    // Agent context (own artifacts + cross-agent artifacts + activity)
    if (ctxResult.status === 'fulfilled') {
      systemPrompt += formatContextForPrompt(ctxResult.value)
      if (ctxResult.value.compressionApplied && ctxResult.value.droppedCount > 0) {
        compressionInfo = { applied: true, droppedCount: ctxResult.value.droppedCount }
      }
    } else {
      log.warn('Agent context injection failed — proceeding without memory')
    }

    // Cross-agent orchestration results
    if (orchTimedOut) {
      systemPrompt += '\n\nNote: Cross-agent context was unavailable for this turn (timeout). Respond with the context you have — do not mention this note.'
    }
    if (FF_CROSS_AGENT_ORCHESTRATION && orchResult.status === 'fulfilled' && orchResult.value.contextInjection) {
      systemPrompt += `\n\nCROSS-AGENT INTELLIGENCE — Context from other advisers:\n${orchResult.value.contextInjection}`
      if (orchResult.value.subCallsUsed > 0) {
        void supabase.from('agent_activity').insert({
          user_id: userId, agent_id: agentId, action_type: 'orchestration',
          description: `Orchestrated ${orchResult.value.subCallsUsed} sub-agent call(s) for richer context`,
          metadata: { subAgents: orchResult.value.subAgentResults.map(r => r.agentId) },
        })
      }
    }

    // Relationship memory + session summary
    const [memoryResult, summaryResult] = await Promise.allSettled([
      getAgentMemory(agentId, userId, supabase),
      existingConversationId
        ? supabase.from('agent_conversations').select('summary').eq('id', existingConversationId).single()
        : Promise.resolve(null),
    ])
    if (memoryResult.status === 'fulfilled' && memoryResult.value) {
      const { session_count, relationship_tier, key_facts } = memoryResult.value
      const displayKeyFacts = (key_facts ?? '').replace(/§PATEL_ASKED:[^\n]*/g, '').trim() || 'First session — no prior history.'
      systemPrompt = `YOU AND THIS FOUNDER:\nThis is session ${session_count} with this founder. Relationship: ${relationship_tier}.\n${displayKeyFacts}\n\n` + systemPrompt
      if (agentId === 'patel' && key_facts) {
        const patelAskedMatch = key_facts.match(/§PATEL_ASKED:([^\n§]*)/)
        if (patelAskedMatch) {
          const crossSessionQs = patelAskedMatch[1].split('|').map((q: string) => q.trim()).filter((q: string) => q.length > 20)
          if (crossSessionQs.length > 0) {
            systemPrompt += `\n\nQUESTIONS ASKED IN PREVIOUS SESSIONS — do not repeat or rephrase:\n${crossSessionQs.map((q: string) => `- ${q}`).join('\n')}`
          }
        }
      }
    }
    if (summaryResult.status === 'fulfilled' && summaryResult.value) {
      const summary = (summaryResult.value as { data?: { summary?: string | null } | null })?.data?.summary
      if (summary) systemPrompt += `\n\nLAST SESSION SUMMARY:\n${summary}`
    }

    // Sources list for client-side citation chips
    if (founderCtxResult.status === 'fulfilled' && founderCtxResult.value?.block?.trim())
      sourcesUsed.push({ label: 'Your Profile', type: 'profile' })
    if (memoryResult.status === 'fulfilled' && (memoryResult.value as { key_facts?: string | null } | null)?.key_facts?.trim())
      sourcesUsed.push({ label: 'Session Memory', type: 'memory' })
    if (ctxResult.status === 'fulfilled') {
      if (ctxResult.value.ownArtifacts.length > 0)
        sourcesUsed.push({ label: 'Your Deliverables', type: 'artifact' })
      const seenAgents = new Set<string>()
      for (const a of ctxResult.value.crossAgentArtifacts) {
        if (!seenAgents.has(a.agent_id)) {
          seenAgents.add(a.agent_id)
          sourcesUsed.push({ label: getAgentById(a.agent_id)?.name ?? a.agent_id, type: 'cross_agent' })
        }
      }
    }
  }

  // Knowledge library RAG (curated resources, skipped on first message)
  const userMsgCount = (conversationHistory || []).filter((m: { role: string }) => m.role === 'user').length
  if (userMsgCount >= 1) {
    try {
      const resources = await getRelevantResources(supabase, agentId, message, 2)
      systemPrompt += formatResourcesForPrompt(resources)
    } catch { /* non-critical */ }
  }

  // User-document RAG (founder-uploaded files, requires VOYAGE_API_KEY)
  if (userId && process.env.VOYAGE_API_KEY) {
    try {
      const docChunks = await getRelevantDocumentChunks(userId, message, supabase, 3)
      if (docChunks) {
        systemPrompt += docChunks
        sourcesUsed.push({ label: 'Uploaded Documents', type: 'artifact' })
      }
    } catch { /* non-critical */ }
  }

  // Token budget guard — trim MEMORY block if prompt grew too large
  if (systemPrompt.length > SYSTEM_PROMPT_CHAR_LIMIT) {
    const { prompt: trimmed, trimmed: wasTrimmed } = trimMemoryBlock(systemPrompt)
    systemPrompt = trimmed
    if (wasTrimmed) log.info('context_trim', { userId, agentId, promptLen: systemPrompt.length })
  }

  return { systemPrompt, patelRawScores, patelRawConfidence, startupState, sourcesUsed, compressionInfo }
}
