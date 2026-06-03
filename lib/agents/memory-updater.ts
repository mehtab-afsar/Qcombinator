/**
 * Agent memory updater — runs fire-and-forget after every conversation.
 *
 * Previous version only read user messages and wrote a single prose blob.
 * This version:
 *   1. Uses the FULL transcript (both sides) so agent decisions/artifacts are captured
 *   2. Extracts four typed fact categories via a single Haiku call
 *   3. Writes to structured columns (confirmed_facts, open_threads, founder_prefs, hypotheses)
 *   4. Moves Patel question tracking out of the §HACK marker into patel_asked_questions
 */

import { llmChat } from '@/lib/llm/provider'
import type { SupabaseClient } from '@supabase/supabase-js'

function getTier(sessions: number): string {
  if (sessions <= 1)  return 'stranger'
  if (sessions <= 5)  return 'acquainted'
  if (sessions <= 15) return 'familiar'
  return 'trusted'
}

interface MemoryExtraction {
  general_summary:  string   // 2-3 sentence prose overview (replaces key_facts)
  confirmed_facts:  string   // numbers/decisions founder explicitly stated; bullet list
  open_threads:     string   // unresolved questions / next steps the agent agreed to; bullet list
  founder_prefs:    string   // communication style preferences observed; bullet list
  hypotheses:       string   // agent inferences NOT stated by founder; bullet list
}

const EXTRACTION_SYSTEM_PROMPT = `You are updating a memory file for an AI startup advisor after a session with a founder.

Analyse the FULL session transcript (both advisor and founder turns) and return a JSON object with these five fields:

"general_summary": 2-3 sentences. What was this session about? What was the main outcome?

"confirmed_facts": Bullet list of SPECIFIC facts the founder explicitly stated as true.
Include: numbers (MRR, burn, team size, customers, runway), named companies, decisions made, things they committed to.
Prefix each bullet with "- ". Omit if nothing specific was stated.

"open_threads": Bullet list of things that were NOT resolved — next steps the advisor agreed to help with, questions the founder raised that need follow-up, decisions still pending.
Prefix each bullet with "- ". Omit if none.

"founder_prefs": Bullet list of communication style preferences you observed — e.g. "prefers concise answers", "wants templates not theory", "responds well to direct pushback", "dislikes jargon".
Only include strong signals. Omit if none clear.

"hypotheses": Bullet list of things the ADVISOR inferred (not explicitly stated by the founder). These are working assumptions — label them clearly.
Prefix each bullet with "- (inferred) ". Omit if none.

Rules:
- Be specific. "MRR is £42k" is good. "Has some revenue" is useless.
- Short bullets. Max 15 words each.
- Return valid JSON only. No markdown fences.
- If the session was trivial (< 4 messages), return empty strings for all fields except general_summary.`

export async function updateAgentMemory(
  userId: string,
  agentId: string,
  messages: Array<{ role: string; content: string }>,
  supabase: SupabaseClient,
): Promise<void> {
  if (messages.length < 2) return

  const { data: existing } = await supabase
    .from('agent_memory')
    .select('session_count, key_facts, confirmed_facts, open_threads, founder_prefs, hypotheses, patel_asked_questions')
    .eq('user_id', userId)
    .eq('agent_id', agentId)
    .single()

  const sessions = (existing?.session_count ?? 0) + 1
  const tier = getTier(sessions)

  // Build the full transcript — both sides, truncated per turn to stay within budget
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Founder' : 'Advisor'}: ${m.content.slice(0, 500)}`)
    .join('\n\n')

  // Prior memory context so the extraction merges rather than overwrites
  const priorContext = [
    existing?.confirmed_facts ? `Prior confirmed facts:\n${existing.confirmed_facts}` : '',
    existing?.open_threads    ? `Prior open threads:\n${existing.open_threads}`       : '',
    existing?.founder_prefs   ? `Prior preferences:\n${existing.founder_prefs}`       : '',
  ].filter(Boolean).join('\n\n')

  let extracted: MemoryExtraction = {
    general_summary: existing?.key_facts ?? '',
    confirmed_facts: existing?.confirmed_facts ?? '',
    open_threads:    existing?.open_threads ?? '',
    founder_prefs:   existing?.founder_prefs ?? '',
    hypotheses:      existing?.hypotheses ?? '',
  }

  try {
    const userContent = priorContext
      ? `${priorContext}\n\n---\n\nNew session transcript:\n${transcript}`
      : transcript

    const response = await llmChat({
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user',   content: userContent },
      ],
      modelTier:   'fast',
      temperature: 0.1,
      maxTokens:   800,
    })

    const raw = response.text?.trim() ?? ''
    // Strip markdown fences if the model added them
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(json) as Partial<MemoryExtraction>

    extracted = {
      general_summary: parsed.general_summary || extracted.general_summary,
      confirmed_facts: parsed.confirmed_facts || extracted.confirmed_facts,
      open_threads:    parsed.open_threads    || extracted.open_threads,
      founder_prefs:   parsed.founder_prefs   || extracted.founder_prefs,
      hypotheses:      parsed.hypotheses      || extracted.hypotheses,
    }
  } catch {
    // Extraction failed — keep existing memory, just bump session count
  }

  // Patel: track asked questions in the dedicated column (replaces §PATEL_ASKED hack)
  let patelAskedQuestions = existing?.patel_asked_questions ?? ''
  if (agentId === 'patel') {
    const newlyAsked = messages
      .filter(m => m.role === 'assistant')
      .flatMap(m => m.content.split('\n').filter(l => l.trim().endsWith('?') && l.trim().length > 20))
      .map(q => q.trim())

    if (newlyAsked.length > 0) {
      const existingSet = new Set(patelAskedQuestions.split('|').map((q: string) => q.trim()).filter(Boolean))
      newlyAsked.forEach(q => existingSet.add(q))
      // Cap at 18 questions to keep the list useful
      patelAskedQuestions = Array.from(existingSet).slice(-18).join('|')
    }
  }

  await supabase
    .from('agent_memory')
    .upsert(
      {
        user_id:                userId,
        agent_id:               agentId,
        session_count:          sessions,
        relationship_tier:      tier,
        key_facts:              extracted.general_summary,   // preserve key_facts as general summary
        confirmed_facts:        extracted.confirmed_facts    || null,
        open_threads:           extracted.open_threads       || null,
        founder_prefs:          extracted.founder_prefs      || null,
        hypotheses:             extracted.hypotheses         || null,
        patel_asked_questions:  patelAskedQuestions          || null,
        updated_at:             new Date().toISOString(),
      },
      { onConflict: 'user_id,agent_id' },
    )
}
