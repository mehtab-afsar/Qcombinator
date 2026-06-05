'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { CXOCard } from './CXOCard';
import { CXO_CONFIGS } from '@/lib/cxo/cxo-config';
import { ALL_AGENT_IDS } from '@/lib/constants/agent-ids';
import { createClient } from '@/lib/supabase/client';
import { useTeamRole } from '@/lib/team/useTeamRole';
import { canAccessAgent } from '@/lib/team/permissions';
import type { TeamRole } from '@/lib/team/permissions';

const ink   = '#18160F';
const muted = '#8A867C';
const bdr   = '#E8E4DE';

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
  carter: 'traction',
  riley:  'gtm',
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
  const { role: teamRole } = useTeamRole();

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

  const bottom3Dims = qScoreBreakdown
    ? Object.entries(qScoreBreakdown)
        .sort(([, a], [, b]) => (a ?? 0) - (b ?? 0))
        .slice(0, 3)
        .map(([dim]) => dim)
    : [];

  const countsByAgent: Record<string, number> = {};
  const latestByAgent: Record<string, string> = {};
  for (const a of artifacts) {
    countsByAgent[a.agent_id] = (countsByAgent[a.agent_id] ?? 0) + 1;
    if (!latestByAgent[a.agent_id]) latestByAgent[a.agent_id] = a.title;
  }

  const totalDeliverables = artifacts.length;

  if (loading) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 32px' }}>
        <div style={{ height: 22, width: 140, background: '#E8E5DF', borderRadius: 6, marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ height: 130, background: '#F5F3EF', borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: ink, margin: '0 0 4px' }}>
            Advisory Board
          </h1>
          <p style={{ fontSize: 13, color: muted, margin: 0 }}>
            {ALL_AGENT_IDS.length} advisers · {totalDeliverables} deliverable{totalDeliverables !== 1 ? 's' : ''} built
          </p>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
      }}>
        {ALL_AGENT_IDS.map(agentId => {
          const config = CXO_CONFIGS[agentId];
          if (!config) return null;

          const primaryDim    = CXO_PRIMARY_DIMENSION[agentId];
          const hasChallenge  = bottom3Dims.includes(primaryDim);
          const artifactCount = countsByAgent[agentId] ?? 0;
          const latestTitle   = latestByAgent[agentId];
          const isLocked      = teamRole !== null && !canAccessAgent(teamRole as TeamRole, agentId);

          if (isLocked) {
            return (
              <div
                key={agentId}
                style={{
                  border: `1px solid ${bdr}`, borderRadius: 12,
                  background: '#fff', padding: '20px 20px 16px',
                  opacity: 0.45, cursor: 'not-allowed',
                  fontFamily: 'system-ui, sans-serif',
                  display: 'flex', flexDirection: 'column', gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: '0 0 3px' }}>{config.name}</p>
                    <p style={{ fontSize: 12, color: muted, margin: 0 }}>{config.role.split(/[—–-]/)[0].trim()}</p>
                  </div>
                  <Lock style={{ width: 12, height: 12, color: muted, marginTop: 4 }} />
                </div>
                <p style={{ fontSize: 11, color: '#C0BDB5', margin: 0, borderTop: `1px solid ${bdr}`, paddingTop: 12 }}>
                  Owner &amp; Admin only
                </p>
              </div>
            );
          }

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
