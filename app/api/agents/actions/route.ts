import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/actions
// Body: { conversationId, agentId, conversationHistory }
// Extracts 2-3 concrete action items from the conversation using LLM,
// saves them to agent_actions, and returns them.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId, agentId, conversationHistory } = await request.json()

    if (!conversationHistory || conversationHistory.length < 2) {
      return NextResponse.json({ error: 'Not enough conversation to extract actions' }, { status: 400 })
    }

    // Build extraction prompt
    const recentHistory = conversationHistory.slice(-20) // last 20 messages
    const conversationText = recentHistory
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? 'Founder' : 'Adviser'}: ${m.content}`
      )
      .join('\n\n')

    const extractionPrompt = `You are extracting actionable next steps from a founder–adviser conversation.
Agent: ${agentId} (e.g. patel=GTM, susi=Sales, felix=Finance, maya=Brand, leo=Legal, harper=HR, nova=PMF, atlas=CompIntel, sage=Strategy)

CONVERSATION:
${conversationText}

Extract 2-4 concrete, specific action items the founder should take based on this conversation.
Each action item must be:
- A specific, actionable task (not vague advice)
- Something the founder can do in the next 1-2 weeks
- Written as a direct imperative ("Define your ICP criteria...", "Set up A/B test for...")

For each action, also pick the best action_type from this list:
- "send_outreach"     → sending cold emails or outreach sequences (patel)
- "send_proposal"    → sending a sales proposal to a prospect (susi)
- "generate_artifact"→ generating/building a document or plan in the app
- "view_metrics"     → reviewing financial or performance metrics (felix)
- "update_pipeline"  → updating the sales CRM pipeline (susi)
- "schedule_call"    → booking a call or meeting with someone
- "task"             → a general to-do that doesn't fit the above

And a cta_label: a 2-4 word button label for the action (e.g. "Send Emails", "Send Proposal", "Generate ICP", "Open Dashboard", "Update Pipeline", "Book Call", "Mark Done").

Return ONLY valid JSON, no markdown fences, no explanation:
{
  "actions": [
    { "text": "...", "priority": "high" | "medium" | "low", "action_type": "...", "cta_label": "..." },
    { "text": "...", "priority": "high" | "medium" | "low", "action_type": "...", "cta_label": "..." }
  ]
}`

    // Call OpenRouter for extraction
    const rawContent = await callOpenRouter(
      [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: 'Extract the action items now.' },
      ],
      { maxTokens: 600, temperature: 0.3 },
    )

    let extracted: { actions: { text: string; priority: string; action_type?: string; cta_label?: string }[] } = { actions: [] }
    try {
      const clean = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      extracted = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse extracted actions' }, { status: 500 })
    }

    if (!extracted.actions || extracted.actions.length === 0) {
      return NextResponse.json({ actions: [] })
    }

    // Save to DB using admin client (bypasses RLS for service operations)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const validTypes = ['send_outreach','send_proposal','generate_artifact','view_metrics','update_pipeline','schedule_call','task']
    const rows = extracted.actions.slice(0, 4).map(a => ({
      conversation_id: conversationId ?? null,
      user_id: user.id,
      agent_id: agentId,
      action_text: a.text,
      priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
      status: 'pending',
    }))

    const { data: saved, error: saveError } = await supabaseAdmin
      .from('agent_actions')
      .insert(rows)
      .select('id, action_text, priority, status')

    // Merge action_type + cta_label back into response (not stored in DB yet)
    const withMeta = (saved ?? extracted.actions.map(a => ({ id: '', action_text: a.text, priority: a.priority, status: 'pending' })))
      .map((row, i) => ({
        ...row,
        action_type: validTypes.includes(extracted.actions[i]?.action_type ?? '') ? extracted.actions[i].action_type : 'task',
        cta_label: extracted.actions[i]?.cta_label ?? 'Do it',
      }))

    if (saveError) {
      console.error('Save agent_actions error:', saveError)
      return NextResponse.json({ actions: withMeta })
    }

    return NextResponse.json({ actions: withMeta })
  } catch (err) {
    console.error('Agent actions extract error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/agents/actions
// Body: { actionId, status: 'done' | 'in_progress' | 'pending' }
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { actionId, status } = await request.json()
    if (!actionId || !status) {
      return NextResponse.json({ error: 'actionId and status required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('agent_actions')
      .update({
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', actionId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Agent actions PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
