/**
 * Edge Alpha IQ Score v2 — In-Memory LRU Cache
 *
 * No Redis dependency. Sufficient for this load.
 * Three TTL tiers:
 *   - benchmarks:    1 hour
 *   - reconciliation: 24 hours (per userId × indicatorId)
 *   - sector weights: 6 hours
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class LRUCache<T> {
  private readonly maxSize: number
  private readonly map = new Map<string, CacheEntry<T>>()

  constructor(maxSize = 500) {
    this.maxSize = maxSize
  }

  get(key: string): T | null {
    const entry = this.map.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      return null
    }
    // Move to end (most recently used)
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.map.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) this.map.delete(firstKey)
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  delete(key: string): void {
    this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }
}

// ── Cache instances ────────────────────────────────────────────────────────────

const TTL = {
  BENCHMARK:      60 * 60 * 1000,        // 1 hour
  RECONCILIATION: 24 * 60 * 60 * 1000,   // 24 hours
  SECTOR_WEIGHTS: 6 * 60 * 60 * 1000,    // 6 hours
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const benchmarkCache     = new LRUCache<any>(1000)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reconciliationCache = new LRUCache<any>(500)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sectorWeightsCache = new LRUCache<any>(100)

// ── Public API ─────────────────────────────────────────────────────────────────

export function getCachedBenchmark<T>(
  indicatorId: string,
  sector: string,
  stage: string
): T | null {
  return benchmarkCache.get(`${indicatorId}:${sector}:${stage}`)
}

export function setCachedBenchmark<T>(
  indicatorId: string,
  sector: string,
  stage: string,
  value: T
): void {
  benchmarkCache.set(`${indicatorId}:${sector}:${stage}`, value, TTL.BENCHMARK)
}

export function getCachedReconciliation<T>(
  indicatorId: string,
  userId: string
): T | null {
  return reconciliationCache.get(`${indicatorId}:${userId}`)
}

export function setCachedReconciliation<T>(
  indicatorId: string,
  userId: string,
  value: T
): void {
  reconciliationCache.set(`${indicatorId}:${userId}`, value, TTL.RECONCILIATION)
}

export function invalidateReconciliation(indicatorId: string, userId: string): void {
  reconciliationCache.delete(`${indicatorId}:${userId}`)
}

export function getCachedSectorWeights<T>(sector: string, stage: string): T | null {
  return sectorWeightsCache.get(`${sector}:${stage}`)
}

export function setCachedSectorWeights<T>(
  sector: string,
  stage: string,
  value: T
): void {
  sectorWeightsCache.set(`${sector}:${stage}`, value, TTL.SECTOR_WEIGHTS)
}

export function clearAllCaches(): void {
  benchmarkCache.clear()
  reconciliationCache.clear()
  sectorWeightsCache.clear()
}
