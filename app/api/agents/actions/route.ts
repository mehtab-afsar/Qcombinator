import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

CONVERSATION:
${conversationText}

Extract 2-4 concrete, specific action items the founder should take based on this conversation.
Each action item must be:
- A specific, actionable task (not vague advice)
- Something the founder can do in the next 1-2 weeks
- Written as a direct imperative ("Define your ICP criteria...", "Set up A/B test for...")

Return ONLY valid JSON, no markdown fences, no explanation:
{
  "actions": [
    { "text": "...", "priority": "high" | "medium" | "low" },
    { "text": "...", "priority": "high" | "medium" | "low" }
  ]
}`

    // Call OpenRouter for extraction
    const key = process.env.OPENROUTER_API_KEY
    if (!key) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://edgealpha.ai',
        'X-Title': 'Edge Alpha Actions',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: extractionPrompt },
          { role: 'user', content: 'Extract the action items now.' },
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    })

    if (!aiRes.ok) {
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 })
    }

    const aiData = await aiRes.json()
    const rawContent = aiData.choices?.[0]?.message?.content ?? '{}'

    let extracted: { actions: { text: string; priority: string }[] } = { actions: [] }
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

    if (saveError) {
      console.error('Save agent_actions error:', saveError)
      // Return extracted actions even if save fails
      return NextResponse.json({ actions: extracted.actions })
    }

    return NextResponse.json({ actions: saved })
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
