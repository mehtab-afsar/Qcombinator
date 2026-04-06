/**
 * POST /api/agents/coordinate
 *
 * Triggers a coordinator/worker typed task graph execution.
 * The graph runs multiple agents in parallel layers, passes typed handoffs
 * between layers, and synthesises into a Sage strategic plan.
 *
 * Body: { workflowType: 'investor_readiness' }
 *
 * Response:
 *   200 — GraphExecutionResult (status: 'completed')
 *   207 — GraphExecutionResult (status: 'partial' — optional nodes failed)
 *   400 — Invalid workflowType
 *   401 — Unauthenticated
 *   403 — Feature flag disabled
 *   500 — All required nodes failed or unexpected error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FF_COORDINATOR_WORKFLOW } from '@/lib/feature-flags';
import { executeTaskGraph } from '@/lib/agents/task-graph';
import {
  getWorkflowGraph,
  SUPPORTED_WORKFLOW_TYPES,
  type WorkflowType,
} from '@/lib/agents/workflows/investor-readiness';

export const runtime    = 'nodejs';
export const maxDuration = 150;

// ─── Supabase helpers (same pattern as submit/route.ts) ───────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Feature gate
  if (!FF_COORDINATOR_WORKFLOW) {
    return NextResponse.json(
      { error: 'Coordinator workflow feature is not enabled.' },
      { status: 403 },
    );
  }

  // 2. Auth
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Parse + validate body
  let body: { workflowType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workflowType } = body;

  if (!workflowType || !SUPPORTED_WORKFLOW_TYPES.includes(workflowType as WorkflowType)) {
    return NextResponse.json(
      {
        error: `Invalid workflowType "${workflowType}". Supported: ${SUPPORTED_WORKFLOW_TYPES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  // 4. Build graph + execute
  const graph = getWorkflowGraph(workflowType);
  const coordinatorGoal =
    workflowType === 'investor_readiness'
      ? 'Prepare this founder for their next investor conversation by synthesising market, financial, product, GTM, and team signals into a unified strategic plan.'
      : `Execute the ${workflowType} workflow.`;

  const supabaseAdmin = getAdminClient();

  try {
    const result = await executeTaskGraph(graph, userId, supabaseAdmin, coordinatorGoal);

    const httpStatus =
      result.status === 'completed' ? 200
      : result.status === 'partial'  ? 207
      : 500;

    return NextResponse.json(result, { status: httpStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Graph execution error: ${message}` },
      { status: 500 },
    );
  }
}
