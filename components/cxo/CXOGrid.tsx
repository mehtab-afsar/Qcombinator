'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CXOCard } from './CXOCard';
import { CXO_CONFIGS } from '@/lib/cxo/cxo-config';
import { ALL_AGENT_IDS } from '@/lib/constants/agent-ids';
import { createClient } from '@/lib/supabase/client';

const ink   = '#18160F';
const muted = '#8A867C';

// Dimension each CXO primarily drives (for score challenge detection)
const CXO_PRIMARY_DIMENSION: Record<string, string> = {
  patel:  'gtm',
  susi:   'traction',
  maya:   'gtm',
  felix:  'financial',
  leo:    'financial',
  harper: 'team',
  nova:   'product',
  atlas:  'market',
  sage:   'product',
};

interface AgentArtifact {
  id: string;
  agent_id: string;
  artifact_type: string;
  title: string;
  created_at: string;
}

interface QScoreBreakdown {
  market?: number;
  product?: number;
  gtm?: number;
  financial?: number;
  team?: number;
  traction?: number;
}

interface CXOGridProps {
  userId: string;
  qScoreBreakdown?: QScoreBreakdown;
}

export function CXOGrid({ userId, qScoreBreakdown }: CXOGridProps) {
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const client = createClient();
        const { data } = await client
          .from('agent_artifacts')
          .select('id, agent_id, artifact_type, title, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!cancelled) setArtifacts((data as AgentArtifact[]) ?? []);
      } catch {
        if (!cancelled) setArtifacts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Determine bottom 3 dimensions for score challenges
  const bottom3Dims = qScoreBreakdown
    ? Object.entries(qScoreBreakdown)
        .sort(([, a], [, b]) => (a ?? 0) - (b ?? 0))
        .slice(0, 3)
        .map(([dim]) => dim)
    : [];

  if (loading) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 32px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ height: 22, width: 180, background: '#E8E5DF', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 14, width: 340, background: '#E8E5DF', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ height: 140, background: '#F0EDE6', borderRadius: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  // Group artifacts by agent
  const countsByAgent: Record<string, number> = {};
  const latestByAgent: Record<string, string> = {};
  for (const a of artifacts) {
    countsByAgent[a.agent_id] = (countsByAgent[a.agent_id] ?? 0) + 1;
    if (!latestByAgent[a.agent_id]) latestByAgent[a.agent_id] = a.title;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 32px' }}>
      {/* Heading */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: '0 0 6px' }}>
          Your CXO Team
        </h1>
        <p style={{ fontSize: 14, color: muted, margin: 0 }}>
          Your AI executive team. Click any role to open their workspace.
        </p>
      </div>

      {/* Grid */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap:                 16,
      }}>
        {ALL_AGENT_IDS.map(agentId => {
          const config = CXO_CONFIGS[agentId];
          if (!config) return null;

          const primaryDim      = CXO_PRIMARY_DIMENSION[agentId];
          const hasChallenge    = bottom3Dims.includes(primaryDim);
          const artifactCount   = countsByAgent[agentId] ?? 0;
          const latestTitle     = latestByAgent[agentId];

          return (
            <CXOCard
              key={agentId}
              config={config}
              artifactCount={artifactCount}
              latestArtifactTitle={latestTitle}
              hasScoreChallenge={hasChallenge}
              onClick={() => router.push(`/founder/cxo/${agentId}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
