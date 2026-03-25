'use client';

import { useState, useEffect } from 'react';
import { CXOSidebar, type AgentArtifact } from './CXOSidebar';
import { CXOChat } from './CXOChat';
import { CXODashboard } from './CXODashboard';
import type { CXOConfig } from '@/lib/cxo/cxo-config';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface CXOWorkspaceProps {
  config: CXOConfig;
  agentId: string;
  artifactId?: string;
  challenge?: string;
  prompt?: string;
}

export function CXOWorkspace({ config, agentId, artifactId, challenge, prompt }: CXOWorkspaceProps) {
  const { user }                          = useAuth();
  const [artifacts, setArtifacts]         = useState<AgentArtifact[]>([]);
  const [dimensionScore, setDimensionScore] = useState<number | null>(null);
  const [view, setView]                   = useState<'dashboard' | 'chat'>('dashboard');
  const [chatPrompt, setChatPrompt]       = useState<string | undefined>(prompt);

  const userId = user?.id;

  // Fetch primary dimension score from Q-Score
  useEffect(() => {
    fetch('/api/qscore/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.qScore?.breakdown) {
          const dim = config.primaryDimension;
          const score = (d.qScore.breakdown[dim] as { score?: number } | undefined)?.score ?? null;
          setDimensionScore(typeof score === 'number' ? score : null);
        }
      })
      .catch(() => {});
  }, [config.primaryDimension]);

  // Fetch artifacts for this agent
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      const client = createClient();
      const { data } = await client
        .from('agent_artifacts')
        .select('id, agent_id, artifact_type, title, content, created_at')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (!cancelled) setArtifacts((data as AgentArtifact[]) ?? []);
    }

    load();
    return () => { cancelled = true; };
  }, [userId, agentId]);

  // Real-time subscription: refresh on new artifact for this agent
  useEffect(() => {
    if (!userId) return;
    const client  = createClient();
    const channel = client
      .channel(`cxo-artifacts-${agentId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'agent_artifacts',
        filter: `user_id=eq.${userId}`,
      }, () => {
        // Refetch when anything changes
        client
          .from('agent_artifacts')
          .select('id, agent_id, artifact_type, title, content, created_at')
          .eq('user_id', userId)
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .then(({ data }) => setArtifacts((data as AgentArtifact[]) ?? []));
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [userId, agentId]);

  return (
    <div style={{
      display:    'flex',
      height:     '100vh',
      overflow:   'hidden',
      fontFamily: 'system-ui, sans-serif',
      marginLeft: 52, // offset for the fixed CXOSidebar (collapsed width)
    }}>
      <CXOSidebar
        config={config}
        artifacts={artifacts}
        agentId={agentId}
        dimensionScore={dimensionScore}
        view={view}
        onViewChange={setView}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {view === 'dashboard' ? (
          <CXODashboard
            config={config}
            agentId={agentId}
            artifacts={artifacts}
            dimensionScore={dimensionScore}
            onStartChat={(p) => { if (p) setChatPrompt(p); setView('chat'); }}
          />
        ) : (
          <CXOChat
            agentId={agentId}
            artifactId={artifactId}
            challenge={challenge}
            prompt={chatPrompt}
          />
        )}
      </div>
    </div>
  );
}
