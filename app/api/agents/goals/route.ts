/**
 * GET /api/agents/goals
 *
 * Returns all agent goal statuses for the authenticated founder.
 * Powers the "Agent Health" panel on the founder dashboard.
 * Also accepts POST to force-evaluate all goals against current startup state.
 */

import { NextResponse } from 'next/server';
import { createClient as createUserClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getAllAgentGoals, upsertAgentGoal } from '@/lib/agents/agent-goals';
import { getStartupState } from '@/lib/agents/startup-state';

const ALL_AGENT_IDS = [
  'felix', 'patel', 'susi', 'nova', 'harper',
  'atlas', 'sage', 'maya', 'leo', 'carter', 'riley',
];

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  );
}

// GET — fetch current goal statuses (fast, no re-evaluation)
export async function GET() {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const supabase = getAdmin();
  const goals = await getAllAgentGoals(user.id, supabase);

  return NextResponse.json({ goals });
}

// POST — force re-evaluate all agent goals against current startup state
export async function POST() {
  const userClient = await createUserClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const supabase = getAdmin();
  const state = await getStartupState(user.id, supabase);
  if (!state) return NextResponse.json({ error: 'No startup state found' }, { status: 404 });

  // Evaluate all agents in parallel
  await Promise.allSettled(
    ALL_AGENT_IDS.map(agentId => upsertAgentGoal(agentId, user.id, state, supabase))
  );

  const goals = await getAllAgentGoals(user.id, supabase);
  return NextResponse.json({ goals, evaluatedAt: new Date().toISOString() });
}
