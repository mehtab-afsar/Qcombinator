'use client';

import { Suspense } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CXOGrid } from '@/components/cxo/CXOGrid';
import { useQScore } from '@/features/qscore/hooks/useQScore';
import { bg, muted } from '@/lib/constants/colors'

function LoadingShell() {
  return (
    <div style={{
      minHeight: '100vh', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <p style={{ fontSize: 13, color: muted }}>Loading CXO Suite…</p>
    </div>
  );
}

function CXOIndexInner() {
  const { user }    = useAuth();
  const { qScore }  = useQScore();

  if (!user) return <LoadingShell />;

  const breakdown = qScore?.breakdown ? {
    market:    qScore.breakdown.market?.score,
    product:   qScore.breakdown.product?.score,
    gtm:       qScore.breakdown.goToMarket?.score,
    financial: qScore.breakdown.financial?.score,
    team:      qScore.breakdown.team?.score,
    traction:  qScore.breakdown.traction?.score,
  } : undefined;

  return (
    <CXOGrid
      userId={user.id}
      qScoreBreakdown={breakdown}
    />
  );
}

export default function CXOPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <CXOIndexInner />
    </Suspense>
  );
}
