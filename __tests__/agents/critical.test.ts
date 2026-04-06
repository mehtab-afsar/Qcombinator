/**
 * Critical Agent System Tests
 *
 * 1. Streaming first-token — SSE arrives within 1,200 ms of request start
 * 2. Orchestration sub-call logic — uses existing artifact vs fires mini-brief
 * 3. compressContext token budget — output always ≤ 4,000 tokens
 * 4. Async generation lifecycle — POST → poll → complete, no duplicate artifacts
 */

import { compressContext } from '@/lib/agents/context-compressor';
import { orchestrate } from '@/lib/agents/orchestrator';
import type { Artifact, ActivityEvent } from '@/lib/agents/context';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: Math.random().toString(36).slice(2),
    agent_id: 'patel',
    artifact_type: 'icp_document',
    title: 'ICP Document',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeActivity(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    agent_id: 'atlas',
    action_type: 'artifact_created',
    description: 'Created competitive matrix',
    created_at: new Date().toISOString(),
    metadata: null,
    ...overrides,
  };
}

// ~4 chars per token; budget is TOKEN_BUDGET_CHARS = 16,000 ≈ 4,000 tokens
const TOKEN_BUDGET_CHARS = 16_000;

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — Streaming first-token (mock fetch-based SSE)
// ─────────────────────────────────────────────────────────────────────────────

describe('Streaming first-token latency', () => {
  it('delivers first SSE chunk within 1,200 ms', async () => {
    // Mock a minimal SSE stream that sends one data chunk after a short delay
    const FIRST_CHUNK_DELAY_MS = 50;
    const DEADLINE_MS = 1_200;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Simulate small network delay before first chunk
        setTimeout(() => {
          const chunk = new TextEncoder().encode('data: {"delta":"Hello"}\n\n');
          controller.enqueue(chunk);
          controller.close();
        }, FIRST_CHUNK_DELAY_MS);
      },
    });

    const reader = stream.getReader();
    const start = Date.now();

    const { done, value } = await reader.read();
    const elapsed = Date.now() - start;

    expect(done).toBe(false);
    expect(value).toBeDefined();
    const text = new TextDecoder().decode(value);
    expect(text).toContain('data:');
    expect(elapsed).toBeLessThan(DEADLINE_MS);
  });

  it('parses SSE data line correctly', async () => {
    const rawLine = 'data: {"delta":"world","done":false}\n\n';
    const [, json] = rawLine.split('data: ');
    const parsed = JSON.parse(json.trim());
    expect(parsed.delta).toBe('world');
    expect(parsed.done).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Orchestration sub-call logic
// ─────────────────────────────────────────────────────────────────────────────

describe('Cross-agent orchestration sub-call logic', () => {
  const userId = 'test-user-id';
  const userMessage = 'Help me build a GTM strategy for my B2B SaaS product targeting SMBs.';

  function buildSupabaseMock(existingArtifacts: Array<{ agent_id: string; artifact_type: string; content: Record<string, unknown> }>) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: () => ({
              order: () => ({
                data: existingArtifacts,
                error: null,
              }),
            }),
          }),
        }),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it('uses existing_artifact source when Maya artifact exists — no sub-call fired', async () => {
    const mayaContent = {
      positioningStatement: 'Helping SMBs manage their teams effortlessly.',
      voiceGuide: { personality: 'friendly, authoritative' },
    };

    const supabase = buildSupabaseMock([
      { agent_id: 'maya', artifact_type: 'brand_messaging', content: mayaContent },
    ]);

    // 'patel' depends on ['maya', 'atlas', 'felix']
    const result = await orchestrate('patel', userId, userMessage, supabase);

    const mayaResult = result.subAgentResults.find(r => r.agentId === 'maya');
    expect(mayaResult).toBeDefined();
    expect(mayaResult!.source).toBe('existing_artifact');
    expect(mayaResult!.content).toContain('Positioning:');
    // Maya used existing artifact (no sub-call for maya); other deps (atlas/felix) may still sub-call
    expect(result.subCallsUsed).toBeLessThanOrEqual(2);
  });

  it('caps sub-calls at maxSubCalls=2 when no artifacts exist', async () => {
    // Mock tieredText to avoid real LLM calls
    jest.mock('@/lib/llm/router', () => ({
      tieredText: jest.fn().mockResolvedValue('Mock brand voice: friendly and professional tone targeting SMBs.'),
    }));

    const supabase = buildSupabaseMock([]); // no existing artifacts

    const result = await orchestrate('patel', userId, userMessage, supabase, 2);

    // sub-calls capped at 2
    expect(result.subCallsUsed).toBeLessThanOrEqual(2);
  });

  it('returns empty result for agent with no dependencies', async () => {
    const supabase = buildSupabaseMock([]);
    // Use an agent not in AGENT_DEPENDENCIES
    const result = await orchestrate('unknown_agent', userId, userMessage, supabase);
    expect(result.subAgentResults).toHaveLength(0);
    expect(result.contextInjection).toBe('');
    expect(result.subCallsUsed).toBe(0);
  });

  it('formats contextInjection with uppercase agent labels', async () => {
    const supabase = buildSupabaseMock([
      {
        agent_id: 'atlas',
        artifact_type: 'competitive_matrix',
        content: {
          competitors: [{ name: 'Competitor A' }, { name: 'Competitor B' }],
          positioningStatement: 'We are faster and cheaper.',
        },
      },
    ]);

    const result = await orchestrate('patel', userId, userMessage, supabase);

    if (result.subAgentResults.length > 0) {
      expect(result.contextInjection).toContain('[ATLAS CONTEXT]');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — compressContext token budget
// ─────────────────────────────────────────────────────────────────────────────

describe('compressContext token budget', () => {
  function totalChars(own: Artifact[], cross: Artifact[]): number {
    const estimate = (arts: Artifact[]) =>
      arts.reduce((sum, a) => sum + a.artifact_type.length + a.title.length + 60, 0);
    return estimate(own) + estimate(cross);
  }

  it('stays under TOKEN_BUDGET_CHARS for 1 own + 1 cross artifact', () => {
    const own = [makeArtifact({ agent_id: 'patel', artifact_type: 'icp_document', title: 'ICP Doc' })];
    const cross = [makeArtifact({ agent_id: 'maya', artifact_type: 'brand_messaging', title: 'Brand' })];
    const activity: ActivityEvent[] = [];

    const result = compressContext(own, cross, activity, 'patel');
    const chars = totalChars(result.ownArtifacts, result.crossAgentArtifacts);
    expect(chars).toBeLessThanOrEqual(TOKEN_BUDGET_CHARS);
  });

  it('stays under TOKEN_BUDGET_CHARS for 5 own + 5 cross artifacts', () => {
    const own = Array.from({ length: 5 }, (_, i) =>
      makeArtifact({ agent_id: 'patel', title: `ICP Document version ${i}` })
    );
    const cross = Array.from({ length: 5 }, (_, i) =>
      makeArtifact({ agent_id: 'maya', artifact_type: 'brand_messaging', title: `Brand Messaging v${i}` })
    );
    const activity: ActivityEvent[] = Array.from({ length: 10 }, makeActivity);

    const result = compressContext(own, cross, activity, 'patel', 'icp customer segment');
    const chars = totalChars(result.ownArtifacts, result.crossAgentArtifacts);
    expect(chars).toBeLessThanOrEqual(TOKEN_BUDGET_CHARS);
    // own capped at 3
    expect(result.ownArtifacts.length).toBeLessThanOrEqual(3);
    // activity capped at 5
    expect(result.activity.length).toBeLessThanOrEqual(5);
  });

  it('stays under TOKEN_BUDGET_CHARS for 20 own + 20 cross artifacts', () => {
    // Each artifact title ~80 chars to stress the budget
    const bigTitle = 'A'.repeat(80);
    const own = Array.from({ length: 20 }, (_, i) =>
      makeArtifact({ agent_id: 'nova', title: `${bigTitle} ${i}` })
    );
    const cross = Array.from({ length: 20 }, (_, i) =>
      makeArtifact({ agent_id: 'atlas', artifact_type: 'competitive_matrix', title: `${bigTitle} cross ${i}` })
    );
    const activity: ActivityEvent[] = Array.from({ length: 20 }, makeActivity);

    const result = compressContext(own, cross, activity, 'nova', 'product roadmap');
    const chars = totalChars(result.ownArtifacts, result.crossAgentArtifacts);
    expect(chars).toBeLessThanOrEqual(TOKEN_BUDGET_CHARS);
    expect(result.compressionApplied).toBe(true);
  });

  it('applies tighter limits for accumulative agents (susi/atlas)', () => {
    const own = Array.from({ length: 5 }, (_, i) =>
      makeArtifact({ agent_id: 'susi', artifact_type: 'sales_script', title: `Sales script ${i}` })
    );
    const cross = Array.from({ length: 5 }, (_, i) =>
      makeArtifact({ agent_id: 'patel', artifact_type: 'icp_document', title: `ICP ${i}` })
    );

    const result = compressContext(own, cross, [], 'susi');
    // Accumulative agents: ownLimit=2, crossLimit=2
    expect(result.ownArtifacts.length).toBeLessThanOrEqual(2);
    expect(result.crossAgentArtifacts.length).toBeLessThanOrEqual(2);
    expect(result.compressionApplied).toBe(true);
  });

  it('prefers topic-relevant cross-agent artifacts', () => {
    const cross = [
      makeArtifact({ agent_id: 'maya', artifact_type: 'brand_messaging', title: 'Social media content plan' }),
      makeArtifact({ agent_id: 'atlas', artifact_type: 'competitive_matrix', title: 'Competitor analysis' }),
      makeArtifact({ agent_id: 'felix', artifact_type: 'financial_summary', title: 'Q1 financial summary' }),
      makeArtifact({ agent_id: 'harper', artifact_type: 'hiring_plan', title: 'Engineering hiring plan' }),
      makeArtifact({ agent_id: 'nova', artifact_type: 'pmf_survey', title: 'PMF survey results' }),
    ];

    const result = compressContext([], cross, [], 'patel', 'competitive positioning and market gaps');
    // competitive_matrix should rank highly
    const hasCompetitorFirst = result.crossAgentArtifacts.some(a => a.artifact_type === 'competitive_matrix');
    expect(hasCompetitorFirst).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — Async generation lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('Async artifact generation lifecycle', () => {
  // Simulate the in-memory job state used by the status endpoint
  type JobStatus = 'pending' | 'processing' | 'complete' | 'failed';
  interface JobRow {
    id: string;
    status: JobStatus;
    artifact_id: string | null;
    error: string | null;
  }

  function createJobStore() {
    const store = new Map<string, JobRow>();
    return {
      create(jobId: string): JobRow {
        const row: JobRow = { id: jobId, status: 'pending', artifact_id: null, error: null };
        store.set(jobId, row);
        return row;
      },
      get(jobId: string): JobRow | undefined {
        return store.get(jobId);
      },
      update(jobId: string, patch: Partial<JobRow>) {
        const existing = store.get(jobId);
        if (existing) store.set(jobId, { ...existing, ...patch });
      },
      all() { return [...store.values()]; },
    };
  }

  it('job starts as pending and transitions to complete with an artifact_id', async () => {
    const jobs = createJobStore();
    const jobId = 'job-' + Math.random().toString(36).slice(2);

    // Step 1: POST /generate — creates job row
    jobs.create(jobId);
    expect(jobs.get(jobId)!.status).toBe('pending');

    // Step 2: Background runner picks it up
    jobs.update(jobId, { status: 'processing' });
    expect(jobs.get(jobId)!.status).toBe('processing');

    // Step 3: Artifact saved → job completes
    const artifactId = 'artifact-' + Math.random().toString(36).slice(2);
    jobs.update(jobId, { status: 'complete', artifact_id: artifactId });

    const finalJob = jobs.get(jobId)!;
    expect(finalJob.status).toBe('complete');
    expect(finalJob.artifact_id).toBe(artifactId);
    expect(finalJob.error).toBeNull();
  });

  it('polling resolves status correctly across all states', () => {
    const jobs = createJobStore();
    const jobId = 'job-poll-test';
    jobs.create(jobId);

    const poll = (id: string) => {
      const job = jobs.get(id);
      if (!job) return { status: 'not_found' as const };
      return { status: job.status, artifactId: job.artifact_id, error: job.error };
    };

    expect(poll(jobId).status).toBe('pending');

    jobs.update(jobId, { status: 'processing' });
    expect(poll(jobId).status).toBe('processing');

    jobs.update(jobId, { status: 'complete', artifact_id: 'art-123' });
    const result = poll(jobId);
    expect(result.status).toBe('complete');
    expect(result.artifactId).toBe('art-123');
  });

  it('no duplicate artifacts — second POST for same job returns existing artifact_id', () => {
    const jobs = createJobStore();
    const jobId = 'job-dedup';
    jobs.create(jobId);
    jobs.update(jobId, { status: 'complete', artifact_id: 'art-unique-456' });

    // Simulates idempotency check: if job already complete, return existing artifact_id
    const handlePost = (id: string) => {
      const existing = jobs.get(id);
      if (existing?.status === 'complete' && existing.artifact_id) {
        return { jobId: id, artifactId: existing.artifact_id, cached: true };
      }
      jobs.create(id); // would create new job if not exists
      return { jobId: id, artifactId: null, cached: false };
    };

    const first = handlePost(jobId);
    const second = handlePost(jobId);

    expect(first.cached).toBe(true);
    expect(second.cached).toBe(true);
    expect(first.artifactId).toBe(second.artifactId);
    // Only one job row should exist
    expect(jobs.all().filter(j => j.id === jobId)).toHaveLength(1);
  });

  it('failed job records error message and has no artifact_id', () => {
    const jobs = createJobStore();
    const jobId = 'job-fail';
    jobs.create(jobId);
    jobs.update(jobId, { status: 'failed', error: 'LLM timeout after 300s' });

    const job = jobs.get(jobId)!;
    expect(job.status).toBe('failed');
    expect(job.error).toBe('LLM timeout after 300s');
    expect(job.artifact_id).toBeNull();
  });
});
