/**
 * GET /api/founder/usage — a founder's own AI usage, all-time.
 *
 * The AI Usage/Cost Ledger (`ai_usage_log`, Phase 10 Part 1) has always recorded every real LLM
 * call the Operating Rhythm makes — `lib/llm/router.ts`'s `recordUsage`, called from
 * `lib/actions/generate.ts` and `lib/rhythm/judge.ts` — but the only place it was ever displayed
 * was the admin-only `/admin/metrics` page. The table already carries founder-scoped RLS
 * (`ai_usage_log_select_own`: `auth.uid() = founder_id`), so the founder's own client can read
 * their own rows directly — no admin client, no new access-control code needed here.
 *
 * Thin: validate → read → aggregate → return (CLAUDE.md §2).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { newModelOff } from '@/lib/api/response'
import { log } from '@/lib/logger'

export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped client — RLS (auth.uid() = founder_id) is what limits this to the caller's own
    // rows, not a manual .eq() a route could forget to add.
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('ai_usage_log')
      .select('input_tokens, output_tokens, estimated_cost_usd, created_at')
      .order('created_at', { ascending: true })
      .limit(20_000)

    if (error) throw error

    const rows = data ?? []
    const totalCalls = rows.length
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCostUsd = 0
    for (const row of rows) {
      totalInputTokens += row.input_tokens
      totalOutputTokens += row.output_tokens
      totalCostUsd += Number(row.estimated_cost_usd ?? 0)
    }

    return NextResponse.json({
      usage: {
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        // 6dp — the same rounding the admin metrics route uses for this same field, so a founder
        // and an admin never see the identical figure rounded two different ways.
        totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
        since: rows[0]?.created_at ?? null,
      },
    })
  } catch (err) {
    log.error('GET /api/founder/usage', { err })
    return NextResponse.json({ error: 'Failed to load your AI usage' }, { status: 500 })
  }
}
