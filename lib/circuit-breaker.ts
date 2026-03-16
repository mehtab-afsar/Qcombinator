/**
 * Circuit Breaker
 *
 * Module-level failure counters that open a circuit after repeated failures,
 * preventing cascade failures against external APIs.
 *
 * Thresholds:
 *   - >3 failures in 60 seconds → circuit opens for 5 minutes
 *
 * Protected services: Hunter.io, Tavily, Netlify, Resend, OpenAI embeddings
 *
 * Special case for OpenAI embeddings: when open, embedArtifact() is skipped
 * silently rather than throwing — artifact generation must not be blocked.
 */

export type ServiceId =
  | 'hunter_io'
  | 'tavily'
  | 'netlify'
  | 'resend'
  | 'openai_embeddings';

interface CircuitState {
  failures: number;
  firstFailureAt: number;
  openedAt: number | null;
}

const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS  = 60_000;   // 60 seconds
const OPEN_DURATION_MS   = 300_000;  // 5 minutes

const _circuits = new Map<ServiceId, CircuitState>();

function getState(service: ServiceId): CircuitState {
  if (!_circuits.has(service)) {
    _circuits.set(service, { failures: 0, firstFailureAt: 0, openedAt: null });
  }
  return _circuits.get(service)!;
}

/** Returns true if the circuit is open (calls should be blocked). */
export function isCircuitOpen(service: ServiceId): boolean {
  const state = getState(service);
  if (state.openedAt === null) return false;

  // Auto-reset after OPEN_DURATION_MS
  if (Date.now() - state.openedAt > OPEN_DURATION_MS) {
    state.failures  = 0;
    state.openedAt  = null;
    state.firstFailureAt = 0;
    return false;
  }
  return true;
}

/** Record a successful call — resets the failure counter for this service. */
export function recordSuccess(service: ServiceId): void {
  const state = getState(service);
  state.failures  = 0;
  state.openedAt  = null;
  state.firstFailureAt = 0;
}

/** Record a failed call. Opens the circuit if threshold is exceeded. */
export function recordFailure(service: ServiceId): void {
  const state = getState(service);
  const now = Date.now();

  // Reset counter if the failure window has passed
  if (now - state.firstFailureAt > FAILURE_WINDOW_MS) {
    state.failures = 0;
    state.firstFailureAt = now;
  }

  if (state.firstFailureAt === 0) state.firstFailureAt = now;
  state.failures++;

  if (state.failures > FAILURE_THRESHOLD && state.openedAt === null) {
    state.openedAt = now;
    console.warn(`[circuit-breaker] Circuit OPENED for ${service} after ${state.failures} failures in ${FAILURE_WINDOW_MS / 1000}s`);
  }
}

/**
 * Wraps an async function with circuit breaker logic.
 *
 * @param service   - Service identifier
 * @param fn        - The async call to protect
 * @param fallback  - Optional value to return when circuit is open (instead of throwing)
 */
export async function withCircuitBreaker<T>(
  service: ServiceId,
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T> {
  if (isCircuitOpen(service)) {
    console.warn(`[circuit-breaker] Circuit is OPEN for ${service} — skipping call`);
    if (fallback !== undefined) return fallback;
    throw new Error(`Circuit breaker open for service: ${service}`);
  }

  try {
    const result = await fn();
    recordSuccess(service);
    return result;
  } catch (err) {
    recordFailure(service);
    throw err;
  }
}

/** Expose current circuit states (for admin/debug). */
export function getCircuitStates(): Record<ServiceId, { open: boolean; failures: number }> {
  const result = {} as Record<ServiceId, { open: boolean; failures: number }>;
  for (const [service, state] of _circuits) {
    result[service] = { open: isCircuitOpen(service as ServiceId), failures: state.failures };
  }
  return result;
}
