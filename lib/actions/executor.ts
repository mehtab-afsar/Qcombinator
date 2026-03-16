/**
 * Universal Action Executor
 *
 * Routes action invocations based on type:
 *   platform   → calls the relevant API handler (server-side)
 *   enrichment → delegates to executeTool()
 *   handoff    → returns deepLink + clipboardContent (client executes)
 *
 * Every action execution is logged to agent_activity regardless of type,
 * fixing the gap where clipboard/URL actions were never tracked.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAction } from '@/lib/edgealpha.config';
import type { ArtifactType } from '@/lib/constants/artifact-types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ActionExecutionResult =
  | { type: 'platform';   success: boolean; data?: unknown; error?: string }
  | { type: 'enrichment'; success: boolean; data?: unknown; error?: string }
  | { type: 'handoff';    deepLink: string; clipboardContent?: string };

export class ActionNotFoundError extends Error {
  constructor(actionId: string) {
    super(`Unknown action: ${actionId}`);
    this.name = 'ActionNotFoundError';
  }
}

export class ActionPrerequisiteError extends Error {
  constructor(actionId: string, missing: ArtifactType[]) {
    super(`Action "${actionId}" requires artifacts: ${missing.join(', ')}`);
    this.name = 'ActionPrerequisiteError';
  }
}

// ─── Prerequisite check ───────────────────────────────────────────────────────

async function checkPrerequisites(
  supabase: SupabaseClient,
  userId: string,
  requiredTypes: ArtifactType[],
): Promise<ArtifactType[]> {
  if (requiredTypes.length === 0) return [];

  const { data } = await supabase
    .from('agent_artifacts')
    .select('artifact_type')
    .eq('user_id', userId)
    .in('artifact_type', requiredTypes);

  const found = new Set((data ?? []).map((r: { artifact_type: string }) => r.artifact_type));
  return requiredTypes.filter(t => !found.has(t));
}

// ─── Activity logger ──────────────────────────────────────────────────────────

function logActivity(
  supabase: SupabaseClient,
  userId: string,
  agentId: string,
  actionId: string,
  metadata: Record<string, unknown>,
): void {
  void supabase.from('agent_activity').insert({
    user_id:     userId,
    agent_id:    agentId,
    action_type: actionId,
    description: `Action executed: ${actionId}`,
    metadata,
  });
}

// ─── Platform handler dispatcher ─────────────────────────────────────────────
// Each platform action routes to its API handler module.
// We use dynamic imports so unused handlers aren't bundled together.

async function executePlatformAction(
  actionId: string,
  userId: string,
  args: unknown,
  supabase: SupabaseClient,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (actionId) {
      case 'deploy_landing_page': {
        const { handler } = await import('@/lib/actions/handlers/deploy-site');
        return { success: true, data: await handler(userId, args, supabase) };
      }
      case 'send_investor_update': {
        const { handler } = await import('@/lib/actions/handlers/send-investor-update');
        return { success: true, data: await handler(userId, args, supabase) };
      }
      case 'screen_resume': {
        const { handler } = await import('@/lib/actions/handlers/screen-resume');
        return { success: true, data: await handler(userId, args, supabase) };
      }
      case 'generate_nda': {
        const { handler } = await import('@/lib/actions/handlers/generate-nda');
        return { success: true, data: await handler(userId, args, supabase) };
      }
      case 'blog_post': {
        const { handler } = await import('@/lib/actions/handlers/blog-post');
        return { success: true, data: await handler(userId, args, supabase) };
      }
      case 'host_survey': {
        const { handler } = await import('@/lib/actions/handlers/host-survey');
        return { success: true, data: await handler(userId, args, supabase) };
      }
      case 'track_competitor': {
        const { handler } = await import('@/lib/actions/handlers/track-competitor');
        return { success: true, data: await handler(userId, args, supabase) };
      }
      default:
        return { success: false, error: `No platform handler registered for: ${actionId}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Handoff URL builder ──────────────────────────────────────────────────────

function buildHandoff(
  actionId: string,
  args: unknown,
): { deepLink: string; clipboardContent?: string } {
  const a = args as Record<string, string | undefined>;

  switch (actionId) {
    case 'gmail_compose': {
      const subject = encodeURIComponent(a.subject ?? '');
      const body = encodeURIComponent(a.body ?? '');
      return {
        deepLink: `https://mail.google.com/mail/?view=cm&su=${subject}&body=${body}`,
        clipboardContent: a.body,
      };
    }
    case 'wellfound_post':
      return {
        deepLink: 'https://wellfound.com/jobs/new',
        clipboardContent: a.jobDescription,
      };
    case 'clerky_start':
      return {
        deepLink: 'https://www.clerky.com/',
        clipboardContent: a.details,
      };
    case 'stripe_atlas':
      return {
        deepLink: 'https://stripe.com/atlas',
        clipboardContent: a.details,
      };
    case 'linear_export':
      return {
        deepLink: 'https://linear.app/new',
        clipboardContent: a.markdown,
      };
    case 'google_alert': {
      const query = encodeURIComponent(a.query ?? '');
      return { deepLink: `https://www.google.com/alerts#${query}` };
    }
    case 'download_social_templates':
      return {
        deepLink: '#download',
        clipboardContent: a.htmlContent,
      };
    case 'download_survey_html':
      return {
        deepLink: '#download',
        clipboardContent: a.htmlContent,
      };
    case 'download_csv':
      return {
        deepLink: '#download',
        clipboardContent: a.csvContent,
      };
    default:
      return { deepLink: '#' };
  }
}

// ─── Main executor ────────────────────────────────────────────────────────────

export async function executeAction(
  actionId: string,
  userId: string,
  agentId: string,
  args: unknown,
  supabase: SupabaseClient,
): Promise<ActionExecutionResult> {
  const actionConfig = getAction(actionId);
  if (!actionConfig) throw new ActionNotFoundError(actionId);

  // Prerequisite check (skip for enrichment/handoff — they're self-contained)
  if (actionConfig.requires && actionConfig.requires.length > 0) {
    const missing = await checkPrerequisites(supabase, userId, actionConfig.requires);
    if (missing.length > 0) throw new ActionPrerequisiteError(actionId, missing);
  }

  let result: ActionExecutionResult;

  if (actionConfig.type === 'platform') {
    const res = await executePlatformAction(actionId, userId, args, supabase);
    result = { type: 'platform', ...res };

  } else if (actionConfig.type === 'enrichment') {
    // Enrichment actions delegate to the tool executor for caching + logging
    const { executeTool } = await import('@/lib/tools/executor');
    try {
      const { result: data } = await executeTool(
        actionConfig.executor,
        args,
        userId,
        supabase,
        async (a) => {
          // Dynamic import of the actual enrichment handler
          const mod = await import(`@/lib/actions/handlers/${actionId.replace(/_/g, '-')}`);
          return (mod.handler as (a: unknown, s: SupabaseClient) => Promise<unknown>)(a, supabase);
        },
      );
      result = { type: 'enrichment', success: true, data };
    } catch (err) {
      result = { type: 'enrichment', success: false, error: err instanceof Error ? err.message : String(err) };
    }

  } else {
    // Handoff: build the deep-link/clipboard payload — no server round-trip
    result = { type: 'handoff', ...buildHandoff(actionId, args) };
  }

  // Log every action to agent_activity (including handoffs)
  logActivity(supabase, userId, agentId, actionId, {
    args: typeof args === 'object' ? args : { value: args },
    success: result.type !== 'handoff' ? (result as { success: boolean }).success : true,
  });

  return result;
}
