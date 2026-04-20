/**
 * Shared Tavily search helper.
 * All Tavily calls go through here — circuit breaker included.
 * Returns null when the circuit is open or the request fails.
 */

import { withCircuitBreaker } from '@/lib/circuit-breaker';
import { log } from '@/lib/logger'

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilyResponse {
  answer: string | null;
  results: TavilyResult[];
}

export async function tavilySearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
  } = {}
): Promise<TavilyResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    log.warn('[tavily] TAVILY_API_KEY not configured — skipping');
    return null;
  }

  const { maxResults = 8, searchDepth = 'advanced', includeAnswer = true } = options;

  return withCircuitBreaker(
    'tavily',
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: searchDepth,
          max_results: maxResults,
          include_answer: includeAnswer,
          include_raw_content: false,
        }),
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Tavily ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        answer: data.answer ?? null,
        results: (data.results ?? []) as TavilyResult[],
      };
    },
    null
  );
}
