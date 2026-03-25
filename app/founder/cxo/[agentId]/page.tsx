'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams, redirect } from 'next/navigation';
import { CXOWorkspace } from '@/components/cxo/CXOWorkspace';
import { getCXOConfig, CXO_CONFIGS } from '@/lib/cxo/cxo-config';
import { useAuth } from '@/features/auth/hooks/useAuth';

const bg   = '#F9F7F2';
const muted = '#8A867C';

function LoadingShell() {
  return (
    <div style={{
      minHeight: '100vh', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <p style={{ fontSize: 13, color: muted }}>Loading workspace…</p>
    </div>
  );
}

function WorkspaceInner() {
  const params  = useParams();
  const search  = useSearchParams();
  const { user } = useAuth();

  const agentId = Array.isArray(params.agentId) ? params.agentId[0] : params.agentId;

  // Validate agentId
  if (!agentId || !(agentId in CXO_CONFIGS)) {
    redirect('/founder/cxo');
  }

  if (!user) return <LoadingShell />;

  const config = getCXOConfig(agentId);

  return (
    <CXOWorkspace
      config={config}
      agentId={agentId}
      artifactId={search.get('artifact') ?? undefined}
      challenge={search.get('challenge') ?? undefined}
      prompt={search.get('prompt') ?? undefined}
    />
  );
}

export default function CXOWorkspacePage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <WorkspaceInner />
    </Suspense>
  );
}
