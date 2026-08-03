/**
 * F10 — the rhythm's error type.
 *
 * In its own module so `context.ts` and `run.ts` can both raise it without importing each other.
 * `run.ts` re-exports it, so `@/lib/rhythm/run` remains the public import path — six call sites
 * across the routes and tests depend on that and should not have to move for a file split.
 */
export class RhythmError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RhythmError'
  }
}
