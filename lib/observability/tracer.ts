/**
 * Lightweight operation tracer.
 *
 * Wraps async operations with timing, error capture, and optional structured logging.
 * Designed to be used around: executeTool(), runRAGScoring(), calculatePRDQScore(),
 * executeAction(), and any other critical async paths.
 *
 * Usage:
 *   const result = await trace('web_research', () => fetchTavily(query), { userId });
 */

// In-memory span log (last 500 entries, per-process)
interface Span {
  operation: string;
  startedAt: number;
  durationMs: number;
  success: boolean;
  error?: string;
  meta?: Record<string, unknown>;
}

const _spans: Span[] = [];
const MAX_SPANS = 500;

function record(span: Span): void {
  _spans.push(span);
  if (_spans.length > MAX_SPANS) _spans.shift();
}

/** Get recent spans (for debug/admin endpoints). Returns newest-first. */
export function getRecentSpans(limit = 50): Span[] {
  return _spans.slice(-limit).reverse();
}

/**
 * Trace an async operation: measure latency, capture errors, log metadata.
 *
 * @param operation - Human-readable name for this operation
 * @param fn        - The async function to execute and trace
 * @param meta      - Optional key-value metadata to attach to the span
 */
export async function trace<T>(
  operation: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    record({
      operation,
      startedAt,
      durationMs: Date.now() - startedAt,
      success: true,
      meta,
    });
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    record({
      operation,
      startedAt,
      durationMs: Date.now() - startedAt,
      success: false,
      error: errorMsg,
      meta,
    });
    throw err;
  }
}
