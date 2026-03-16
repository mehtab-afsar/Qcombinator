/**
 * Universal Tool Executor
 *
 * Single execution path for all tool invocations:
 *   1. Look up tool config from TOOLS registry
 *   2. Check rate limit (throws ToolRateLimitError if exceeded)
 *   3. Check cache — return cached result if hit
 *   4. Execute with retry (max 2 retries, exponential backoff, 30s per attempt)
 *   5. Log to tool_execution_logs (non-blocking)
 *   6. Return { result, fromCache, latencyMs, costUsd }
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getTool } from '@/lib/edgealpha.config';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ToolExecutionResult<T = unknown> {
  result: T;
  fromCache: boolean;
  latencyMs: number;
  costUsd: number;
}

export class ToolRateLimitError extends Error {
  constructor(toolId: string) {
    super(`Rate limit exceeded for tool: ${toolId}`);
    this.name = 'ToolRateLimitError';
  }
}

export class ToolNotFoundError extends Error {
  constructor(toolId: string) {
    super(`Unknown tool: ${toolId}`);
    this.name = 'ToolNotFoundError';
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Simple SHA-256 hex digest of a JSON-serializable value. */
async function hashArgs(args: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(args ?? ''));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Module-level in-memory rate limit counters: toolId → { count, windowStart } */
const _rateLimitCounters: Record<string, { count: number; windowStart: number }> = {};
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 20; // per-tool, per-process

function checkRateLimit(toolId: string): void {
  const now = Date.now();
  const entry = _rateLimitCounters[toolId];
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    _rateLimitCounters[toolId] = { count: 1, windowStart: now };
    return;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_PER_WINDOW) {
    throw new ToolRateLimitError(toolId);
  }
}

/** Module-level in-memory cache: cacheKey → { value, expiresAt } */
const _cache: Record<string, { value: unknown; expiresAt: number }> = {};

function getCached(key: string): unknown | null {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete _cache[key];
    return null;
  }
  return entry.value;
}

function setCached(key: string, value: unknown, ttlSeconds: number): void {
  _cache[key] = { value, expiresAt: Date.now() + ttlSeconds * 1000 };
}

/** Non-blocking fire-and-forget log insert. */
function logExecution(
  supabase: SupabaseClient,
  params: {
    tool_id: string;
    user_id: string | undefined;
    args_hash: string;
    status: 'success' | 'error' | 'timeout';
    latency_ms: number;
    cost_usd: number;
    cache_hit: boolean;
    error_msg?: string;
    conversation_id?: string;
  },
): void {
  void supabase.from('tool_execution_logs').insert({
    tool_name: params.tool_id,
    user_id: params.user_id ?? null,
    args_hash: params.args_hash,
    status: params.status,
    latency_ms: params.latency_ms,
    cost_usd: params.cost_usd,
    cache_hit: params.cache_hit,
    error_message: params.error_msg ?? null,
    conversation_id: params.conversation_id ?? null,
  });
}

// ─── Executor ─────────────────────────────────────────────────────────────────

/**
 * Execute a registered tool by ID.
 *
 * @param toolId         - Tool identifier from TOOLS registry
 * @param args           - Arguments to pass to the tool handler
 * @param userId         - Authenticated user ID (for logging and rate limiting)
 * @param supabase       - Supabase client for cache + log persistence
 * @param handler        - The actual async function that performs the tool's work
 * @param conversationId - Optional conversation context for log correlation
 */
export async function executeTool<T = unknown>(
  toolId: string,
  args: unknown,
  userId: string | undefined,
  supabase: SupabaseClient,
  handler: (args: unknown) => Promise<T>,
  conversationId?: string,
): Promise<ToolExecutionResult<T>> {
  // 1. Validate tool exists in registry
  const toolConfig = getTool(toolId);
  if (!toolConfig) throw new ToolNotFoundError(toolId);

  // 2. Rate limit
  checkRateLimit(toolId);

  // 3. Cache check (only for tools with cache config)
  const argsHash = await hashArgs(args);
  const cacheKey = toolConfig.cache
    ? `${toolId}:${argsHash}`
    : null;

  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached !== null) {
      logExecution(supabase, {
        tool_id: toolId,
        user_id: userId,
        args_hash: argsHash,
        status: 'success',
        latency_ms: 0,
        cost_usd: 0,
        cache_hit: true,
        conversation_id: conversationId,
      });
      return { result: cached as T, fromCache: true, latencyMs: 0, costUsd: 0 };
    }
  }

  // 4. Execute with retry
  const MAX_RETRIES = 2;
  const ATTEMPT_TIMEOUT_MS = 30_000;
  let lastError: Error | undefined;
  const t0 = Date.now();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }

    try {
      const result = await Promise.race([
        handler(args),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tool execution timeout')), ATTEMPT_TIMEOUT_MS)
        ),
      ]);

      const latencyMs = Date.now() - t0;
      const costUsd = toolConfig.costUsd ?? 0;

      // 5. Store in cache if applicable
      if (cacheKey && toolConfig.cache) {
        setCached(cacheKey, result, toolConfig.cache.ttl);
      }

      // 6. Log success
      logExecution(supabase, {
        tool_id: toolId,
        user_id: userId,
        args_hash: argsHash,
        status: 'success',
        latency_ms: latencyMs,
        cost_usd: costUsd,
        cache_hit: false,
        conversation_id: conversationId,
      });

      return { result, fromCache: false, latencyMs, costUsd };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTimeout = lastError.message === 'Tool execution timeout';
      if (isTimeout || attempt === MAX_RETRIES) {
        const latencyMs = Date.now() - t0;
        logExecution(supabase, {
          tool_id: toolId,
          user_id: userId,
          args_hash: argsHash,
          status: isTimeout ? 'timeout' : 'error',
          latency_ms: latencyMs,
          cost_usd: 0,
          cache_hit: false,
          error_msg: lastError.message,
          conversation_id: conversationId,
        });
        throw lastError;
      }
    }
  }

  // Should be unreachable, but satisfies TypeScript
  throw lastError ?? new Error('executeTool: unexpected exit');
}
