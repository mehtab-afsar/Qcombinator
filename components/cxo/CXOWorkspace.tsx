'use client';

import { useState, useEffect, useCallback } from 'react';
import { CXOChat } from './CXOChat';
import { CXODashboard } from './CXODashboard';
import { CXOSidebar, type ConversationSummary, type AgentArtifact } from './CXOSidebar';
import type { CXOConfig } from '@/lib/cxo/cxo-config';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface CXOWorkspaceProps {
  config:    CXOConfig;
  agentId:   string;
  artifactId?: string;
  challenge?:  string;
  prompt?:     string;
}

export function CXOWorkspace({ config, agentId, artifactId, challenge, prompt }: CXOWorkspaceProps) {
  const { user }                                        = useAuth();
  const [artifacts, setArtifacts]                       = useState<AgentArtifact[]>([]);
  const [conversations, setConversations]               = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId]                 = useState<string | null>(null);
  const [tab, setTab]                                   = useState<'dashboard' | 'chat'>('chat');
  const [connectedCounts, setConnectedCounts]           = useState<Record<string, number>>({});
  const userId = user?.id;

  // ── fetch conversations ──────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/conversations?agentId=${agentId}`);
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch { /* silent */ }
  }, [agentId]);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);

  // ── fetch artifacts ──────────────────────────────────────────────────
  const refreshArtifacts = useCallback(() => {
    if (!userId) return;
    const client = createClient();
    client
      .from('agent_artifacts')
      .select('id, agent_id, artifact_type, title, content, created_at')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setArtifacts((data as AgentArtifact[]) ?? []));
  }, [userId, agentId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const client = createClient();
    client
      .from('agent_artifacts')
      .select('id, agent_id, artifact_type, title, content, created_at')
      .eq('user_id', userId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setArtifacts((data as AgentArtifact[]) ?? []); });
    return () => { cancelled = true; };
  }, [userId, agentId]);

  // ── fetch connected-agent artifact counts ───────────────────────────
  useEffect(() => {
    if (!userId || config.connectedSources.length === 0) return;
    let cancelled = false;
    const client = createClient();
    const ids = config.connectedSources.map(s => s.agentId);
    client
      .from('agent_artifacts')
      .select('agent_id')
      .eq('user_id', userId)
      .in('agent_id', ids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.agent_id] = (counts[row.agent_id] ?? 0) + 1;
        }
        setConnectedCounts(counts);
      });
    return () => { cancelled = true; };
  }, [userId, config.connectedSources]);

  // ── real-time artifact subscription ─────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const client  = createClient();
    const channel = client
      .channel(`cxo-artifacts-${agentId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'agent_artifacts',
        filter: `user_id=eq.${userId}`,
      }, () => {
        // refresh own artifacts
        client
          .from('agent_artifacts')
          .select('id, agent_id, artifact_type, title, content, created_at')
          .eq('user_id', userId).eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .then(({ data }) => setArtifacts((data as AgentArtifact[]) ?? []));
        // refresh connected counts
        if (config.connectedSources.length > 0) {
          const ids = config.connectedSources.map(s => s.agentId);
          client
            .from('agent_artifacts')
            .select('agent_id')
            .eq('user_id', userId)
            .in('agent_id', ids)
            .then(({ data }) => {
              if (!data) return;
              const counts: Record<string, number> = {};
              for (const row of data) counts[row.agent_id] = (counts[row.agent_id] ?? 0) + 1;
              setConnectedCounts(counts);
            });
        }
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [userId, agentId, config.connectedSources]);

  function handleSwitchConversation(id: string) {
    setActiveConvId(id);
    setTab('chat');  // switch to chat tab when a conversation is selected
  }

  function handleNewConversation() {
    setActiveConvId(null);
    setTab('chat');
    setTimeout(refreshConversations, 1500);
  }

  async function handleRenameConversation(id: string, title: string) {
    try {
      await fetch(`/api/agents/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      await refreshConversations();
    } catch { /* silent */ }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <CXOSidebar
        config={config}
        agentId={agentId}
        artifacts={artifacts}
        conversations={conversations}
        activeConvId={activeConvId}
        onSwitchConversation={handleSwitchConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        tab={tab}
        onTabChange={(t) => { setTab(t); if (t === 'dashboard') refreshArtifacts(); }}
      />

      <div style={{ flex: 1, height: '100vh', overflow: 'hidden' }}>
        {tab === 'dashboard' ? (
          <CXODashboard
            config={config}
            agentId={agentId}
            artifacts={artifacts}
            userId={userId}
            onSwitchToChat={() => setTab('chat')}
            connectedArtifactCounts={connectedCounts}
          />
        ) : (
          <CXOChat
            key={`${agentId}-${activeConvId ?? 'new'}-${artifactId ?? ''}`}
            config={config}
            agentId={agentId}
            artifactId={artifactId}
            challenge={challenge}
            prompt={prompt}
            convId={activeConvId ?? undefined}
            onConversationCreated={() => { refreshConversations(); refreshArtifacts(); }}
            onOpenArtifact={() => { setTab('dashboard'); refreshArtifacts(); }}
          />
        )}
      </div>
    </div>
  );
}
