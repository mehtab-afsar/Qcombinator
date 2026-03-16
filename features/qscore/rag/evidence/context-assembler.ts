/**
 * Evidence Context Assembler
 *
 * Cross-references founder assessment claims against their own agent artifacts
 * via pgvector similarity search. Returns corroborations, conflicts, and
 * unverified claims.
 *
 * Cold start: returns empty context with confidence=0 when user has no embeddings.
 */

import { createClient } from '@/lib/supabase/server';
import { embedText } from '../embeddings/embedder';
import { AssessmentData } from '../../types/qscore.types';
import type { EvidenceContext, EvidenceItem, EvidenceVerdict } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Claim Extraction
// ─────────────────────────────────────────────────────────────────────────────

interface Claim {
  text: string;
  dimension: string;
  field: string;
}

/**
 * Extract verifiable claims from assessment data.
 * Focuses on numeric claims and strong assertions that can be cross-checked.
 */
function extractClaims(data: AssessmentData): Claim[] {
  const claims: Claim[] = [];

  // Financial claims
  if (data.financial?.mrr) {
    claims.push({
      text: `Monthly recurring revenue (MRR) is $${data.financial.mrr}`,
      dimension: 'financial',
      field: 'mrr',
    });
  }
  if (data.financial?.arr) {
    claims.push({
      text: `Annual recurring revenue (ARR) is $${data.financial.arr}`,
      dimension: 'financial',
      field: 'arr',
    });
  }
  if (data.financial?.monthlyBurn) {
    claims.push({
      text: `Monthly burn rate is $${data.financial.monthlyBurn}`,
      dimension: 'financial',
      field: 'burn',
    });
  }
  if (data.financial?.runway) {
    claims.push({
      text: `Runway is ${data.financial.runway} months`,
      dimension: 'financial',
      field: 'runway',
    });
  }

  // Market claims
  if (data.conversionRate) {
    claims.push({
      text: `Conversion rate is ${data.conversionRate}%`,
      dimension: 'market',
      field: 'conversionRate',
    });
  }
  if (data.lifetimeValue && data.costPerAcquisition) {
    const ratio = data.costPerAcquisition > 0
      ? (data.lifetimeValue / data.costPerAcquisition).toFixed(1)
      : 'N/A';
    claims.push({
      text: `LTV:CAC ratio is ${ratio}:1 (LTV $${data.lifetimeValue}, CAC $${data.costPerAcquisition})`,
      dimension: 'market',
      field: 'ltvCac',
    });
  }

  // Traction claims
  if (data.conversationCount) {
    claims.push({
      text: `Had ${data.conversationCount} customer conversations`,
      dimension: 'traction',
      field: 'conversations',
    });
  }

  return claims;
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity Search
// ─────────────────────────────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 0.7;   // Min cosine similarity to consider relevant
const CONFLICT_DEVIATION = 0.5;     // 50% deviation = conflict

/**
 * Determine verdict by comparing claim text with evidence text.
 * For numeric claims, checks if values are within reasonable deviation.
 */
function determineVerdict(claimText: string, evidenceText: string): EvidenceVerdict {
  // Extract numbers from both
  const claimNumbers = claimText.match(/\$?([\d,]+(?:\.\d+)?)/g)?.map(n =>
    parseFloat(n.replace(/[$,]/g, ''))
  ) || [];
  const evidenceNumbers = evidenceText.match(/\$?([\d,]+(?:\.\d+)?)/g)?.map(n =>
    parseFloat(n.replace(/[$,]/g, ''))
  ) || [];

  if (claimNumbers.length === 0 || evidenceNumbers.length === 0) {
    // Can't verify numerically — treat as corroborated if semantically similar
    return 'corroborated';
  }

  // Check if any claim number conflicts with evidence numbers
  for (const cn of claimNumbers) {
    for (const en of evidenceNumbers) {
      if (cn === 0 && en === 0) continue;
      const deviation = Math.abs(cn - en) / Math.max(cn, en);
      if (deviation > CONFLICT_DEVIATION) {
        return 'conflicting';
      }
    }
  }

  return 'corroborated';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assemble evidence context by cross-referencing assessment claims against
 * the user's agent artifact embeddings.
 *
 * Cold start: returns { confidence: 0, unverified: 'all' } when no embeddings exist.
 */
export async function assembleEvidenceContext(
  userId: string,
  data: AssessmentData
): Promise<EvidenceContext> {
  const supabase = await createClient();

  // Cold start check: skip if user has no embeddings
  const { count } = await supabase
    .from('artifact_embeddings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!count || count === 0) {
    return {
      corroborations: [],
      conflicts: [],
      unverified: 'all',
      confidence: 0,
    };
  }

  // Extract verifiable claims
  const claims = extractClaims(data);
  if (claims.length === 0) {
    return {
      corroborations: [],
      conflicts: [],
      unverified: 'all',
      confidence: 0,
    };
  }

  const corroborations: EvidenceItem[] = [];
  const conflicts: EvidenceItem[] = [];
  const unverified: EvidenceItem[] = [];

  // For each claim, embed → vector search → determine verdict
  for (const claim of claims) {
    try {
      const embedding = await embedText(claim.text);

      // Vector similarity search using Supabase's pgvector
      const { data: matches, error } = await supabase
        .rpc('match_artifact_embeddings', {
          query_embedding: `[${embedding.join(',')}]`,
          match_user_id: userId,
          match_threshold: SIMILARITY_THRESHOLD,
          match_count: 3,
        });

      if (error || !matches || matches.length === 0) {
        unverified.push({
          claim: claim.text,
          evidence: '',
          artifactType: '',
          similarity: 0,
          verdict: 'unverified',
          dimension: claim.dimension,
        });
        continue;
      }

      // Check top match
      const topMatch = matches[0];
      const verdict = determineVerdict(claim.text, topMatch.chunk_text);

      const item: EvidenceItem = {
        claim: claim.text,
        evidence: topMatch.chunk_text,
        artifactType: topMatch.metadata?.artifactType || 'unknown',
        similarity: topMatch.similarity,
        verdict,
        dimension: claim.dimension,
      };

      if (verdict === 'corroborated') {
        corroborations.push(item);
      } else if (verdict === 'conflicting') {
        conflicts.push(item);
      }
    } catch {
      // Individual claim failure — mark as unverified
      unverified.push({
        claim: claim.text,
        evidence: '',
        artifactType: '',
        similarity: 0,
        verdict: 'unverified',
        dimension: claim.dimension,
      });
    }
  }

  // Confidence = proportion of claims that found evidence (corroborated or conflicting)
  const evidenceFound = corroborations.length + conflicts.length;
  const confidence = claims.length > 0 ? evidenceFound / claims.length : 0;

  return {
    corroborations,
    conflicts,
    unverified,
    confidence,
  };
}
