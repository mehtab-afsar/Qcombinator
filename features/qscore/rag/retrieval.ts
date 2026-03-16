/**
 * Q-Score RAG Retrieval
 *
 * Retrieves relevant knowledge chunks from the knowledge base using:
 * - Category/dimension filtering (structured retrieval — no vector DB needed)
 * - Sector + stage matching
 * - Keyword relevance ranking
 *
 * This is a lightweight retrieval layer that works without pgvector or external
 * embedding APIs, making it immediately deployable with zero new infrastructure.
 */

import { KNOWLEDGE_BASE, KnowledgeChunk, KnowledgeCategory, Sector } from './knowledge-base';
import { AssessmentData } from '../types/qscore.types';

export interface RetrievalQuery {
  dimension?: string;
  category?: KnowledgeCategory | KnowledgeCategory[];
  sector?: Sector;
  stage?: 'pre-seed' | 'seed' | 'series-a';
  keywords?: string[];
  maxResults?: number;
}

export interface RetrievedChunk extends KnowledgeChunk {
  relevanceScore: number;
}

/**
 * Retrieve relevant knowledge chunks for a given query.
 * Returns chunks sorted by relevance score (highest first).
 */
export function retrieveChunks(query: RetrievalQuery): RetrievedChunk[] {
  const {
    dimension,
    category,
    sector,
    stage,
    keywords = [],
    maxResults = 5,
  } = query;

  const results: RetrievedChunk[] = KNOWLEDGE_BASE.map(chunk => {
    let score = 0;

    // Dimension match
    if (dimension && (chunk.dimension === dimension || chunk.dimension === 'all')) {
      score += dimension === chunk.dimension ? 30 : 10;
    }

    // Category match
    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      if (cats.includes(chunk.category)) score += 25;
    }

    // Sector match
    if (sector) {
      const chunkSectors = Array.isArray(chunk.sector) ? chunk.sector : [chunk.sector];
      if (chunkSectors.includes(sector)) score += 20;
      else if (chunkSectors.includes('all')) score += 10;
    } else {
      // No sector specified — prefer universal chunks
      const chunkSectors = Array.isArray(chunk.sector) ? chunk.sector : [chunk.sector];
      if (chunkSectors.includes('all')) score += 5;
    }

    // Stage match
    if (stage) {
      const chunkStages = Array.isArray(chunk.stage) ? chunk.stage : [chunk.stage];
      if (chunkStages.includes(stage)) score += 15;
      else if (chunkStages.includes('all')) score += 7;
    }

    // Keyword relevance
    if (keywords.length > 0) {
      const contentLower = (chunk.content + ' ' + chunk.title).toLowerCase();
      const matches = keywords.filter(k => contentLower.includes(k.toLowerCase()));
      score += matches.length * 8;
    }

    return { ...chunk, relevanceScore: score };
  });

  return results
    .filter(c => c.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}

/**
 * Retrieve benchmark context for a specific sector and dimension.
 * Now enhanced with structured benchmark data from the benchmark registry.
 * Falls back to knowledge-base chunks if benchmark registry has no data.
 */
export function retrieveBenchmarkContext(sector: Sector, dimension: string): string {
  // Try structured benchmark registry first (Phase 3 enhancement)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { buildBenchmarkContext } = require('./benchmarks/benchmark-retriever');
    const metricsForDimension: Record<string, string[]> = {
      market: ['conversion_rate', 'ltv_cac_ratio'],
      financial: ['gross_margin', 'burn_multiple', 'runway_months', 'arr_growth'],
      traction: ['arr_growth', 'conversion_rate'],
    };
    const metrics = metricsForDimension[dimension] || ['conversion_rate', 'ltv_cac_ratio'];
    const structured = buildBenchmarkContext(sector, metrics);
    if (structured && !structured.includes('No sector-specific')) {
      return structured;
    }
  } catch {
    // Benchmark registry not available — fall through to knowledge base
  }

  // Fallback: knowledge base chunks
  const chunks = retrieveChunks({
    category: 'market_benchmark',
    sector,
    dimension,
    maxResults: 2,
  });

  if (chunks.length === 0) {
    const fallback = retrieveChunks({
      category: 'market_benchmark',
      dimension,
      maxResults: 1,
    });
    return fallback.map(c => c.content).join('\n\n');
  }

  return chunks.map(c => c.content).join('\n\n');
}

/**
 * Retrieve GTM playbook chunks relevant to a sector/stage.
 * Used to ground AI action recommendations.
 */
export function retrieveGTMPlaybooks(sector: Sector, stage?: string): string {
  const stageTyped = (stage as 'pre-seed' | 'seed' | 'series-a') || undefined;
  const chunks = retrieveChunks({
    category: 'gtm_playbook',
    sector,
    stage: stageTyped,
    maxResults: 3,
  });
  return chunks.map(c => `### ${c.title}\n${c.content}`).join('\n\n');
}

/**
 * Retrieve scoring rubrics for the LLM answer evaluator.
 * Now enhanced with structured rubrics from rubric-data.ts.
 * Falls back to knowledge-base chunks if structured rubrics unavailable.
 */
export function retrieveScoringRubrics(fields: string[]): string {
  // Try structured rubrics first (Phase 1 enhancement)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRubricsForFields, formatRubricsForPrompt } = require('./rubrics/rubric-data');
    const rubrics = getRubricsForFields(fields);
    if (rubrics.length > 0) {
      return formatRubricsForPrompt(rubrics);
    }
  } catch {
    // Structured rubrics not available — fall through
  }

  // Fallback: knowledge base chunks
  const chunks = retrieveChunks({
    category: 'scoring_rubric',
    keywords: fields,
    maxResults: fields.length,
  });
  return chunks.map(c => `### ${c.title}\n${c.content}`).join('\n\n');
}

/**
 * Retrieve traction milestone benchmarks for the founder's sector/stage.
 */
export function retrieveTractionBenchmarks(sector: Sector, stage?: string): string {
  const stageTyped = (stage as 'pre-seed' | 'seed' | 'series-a') || undefined;
  const chunks = retrieveChunks({
    category: 'traction_milestone',
    sector,
    stage: stageTyped,
    maxResults: 2,
  });
  if (chunks.length === 0) {
    return retrieveChunks({ category: 'traction_milestone', maxResults: 2 })
      .map(c => c.content)
      .join('\n\n');
  }
  return chunks.map(c => c.content).join('\n\n');
}

/**
 * Derive the sector from founder profile data.
 * Falls back to 'all' if not determinable.
 */
export function inferSector(assessmentData: AssessmentData): Sector {
  const story = (
    (assessmentData.problemStory || '') +
    ' ' +
    (assessmentData.advantageExplanation || '')
  ).toLowerCase();

  if (story.includes('biotech') || story.includes('pharma') || story.includes('clinical') || story.includes('drug')) {
    return 'biotech_deeptech';
  }
  if (story.includes('marketplace') || story.includes('two-sided') || story.includes('platform')) {
    return 'marketplace';
  }
  if (story.includes('fintech') || story.includes('payments') || story.includes('lending') || story.includes('insurance')) {
    return 'fintech';
  }
  if (story.includes('hardware') || story.includes('device') || story.includes('iot') || story.includes('manufacturing')) {
    return 'hardware';
  }
  if (story.includes('ecommerce') || story.includes('e-commerce') || story.includes('dtc') || story.includes('shopify')) {
    return 'ecommerce';
  }
  if (story.includes('consumer') || story.includes('mobile app') || story.includes('social')) {
    return 'consumer';
  }
  if (story.includes('b2c') || story.includes('self-serve') || story.includes('product-led')) {
    return 'saas_b2c';
  }
  // Default: B2B SaaS is the most common early-stage startup type
  return 'saas_b2b';
}

/**
 * Retrieve a compact context bundle for the AI actions endpoint.
 * Combines market benchmarks + GTM playbooks + traction milestones for this founder.
 */
export function retrieveActionsContext(
  assessmentData: AssessmentData,
  weakDimensions: string[],
  sector?: Sector
): { context: string; chunkIds: string[] } {
  const resolvedSector = sector ?? inferSector(assessmentData);

  const allChunks: RetrievedChunk[] = [];

  for (const dim of weakDimensions.slice(0, 3)) {
    const dimChunks = retrieveChunks({
      dimension: dim,
      sector: resolvedSector,
      category: ['market_benchmark', 'gtm_playbook', 'team_signal', 'traction_milestone'],
      maxResults: 2,
    });
    allChunks.push(...dimChunks);
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  const unique = allChunks.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const context = unique
    .map(c => `### ${c.title}\n${c.content}`)
    .join('\n\n');

  return { context, chunkIds: unique.map(c => c.id) };
}
