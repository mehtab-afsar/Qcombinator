"use client";

import { CheckCircle, X, Inbox, TrendingUp } from 'lucide-react';
import { bg, surf, bdr, ink, muted, blue, green, amber, red, indigo, alpha } from '@/lib/constants/colors';
import { Button } from '@/features/shared/components/Button';
import { avatarPalette, initials, relDate } from '@/features/messaging/lib/format';
import type { PendingRequestDetail } from '@/features/messaging/types';

function qColor(n: number) { return n >= 70 ? green : n >= 50 ? amber : red; }
function qBg(n: number) { return alpha(qColor(n), 0.08); }
function qBorder(n: number) { return alpha(qColor(n), 0.35); }

const DIM_LABELS: [keyof PendingRequestDetail['qScoreBreakdown'], string][] = [
  ['p1', 'Mkt Ready'], ['p2', 'Mkt Potential'], ['p3', 'IP & Def'],
  ['p4', 'Team'], ['p5', 'Impact'], ['p6', 'Finance'],
];

interface RequestDetailPanelProps {
  request: PendingRequestDetail;
  onViewProfile: () => void;
  onAccept: () => void;
  onDecline: () => void;
  actionLoading: boolean;
}

export function RequestDetailPanel({ request, onViewProfile, onAccept, onDecline, actionLoading }: RequestDetailPanelProps) {
  const pal = avatarPalette(request.startupName);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '10px 24px', background: alpha(blue, 0.06), borderBottom: `1px solid ${alpha(blue, 0.3)}`,
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Inbox style={{ height: 13, width: 13, color: blue, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: ink }}>
          <strong>Connection request</strong> — this founder wants to connect with you. Accept to start messaging, or decline to pass.
        </span>
      </div>

      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: pal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: pal.color, flexShrink: 0, letterSpacing: '0.02em' }}>
          {initials(request.startupName)}
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 2 }}>{request.startupName}</p>
          <p style={{ fontSize: 12, color: muted }}>{request.founderName} · {request.industry} · {request.stage}</p>
        </div>
        <Button variant="secondary" size="sm" icon={<TrendingUp style={{ height: 12, width: 12 }} />} onClick={onViewProfile} style={{ marginLeft: 'auto' }}>
          Full profile
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 640, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted }}>Connection Request</span>
          <span style={{ fontSize: 10, color: muted, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, padding: '2px 9px' }}>{relDate(request.createdAt)}</span>
        </div>

        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Q-Score</p>
              <p style={{ fontSize: 32, fontWeight: 300, color: qColor(request.qScore), letterSpacing: '-0.04em', lineHeight: 1 }}>{request.qScore}</p>
            </div>
            <div style={{ width: 1, height: 40, background: bdr }} />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {DIM_LABELS.map(([key, label]) => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: qColor(request.qScoreBreakdown[key]), lineHeight: 1 }}>{request.qScoreBreakdown[key]}</p>
                  <p style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 999, background: qBg(request.qScore), border: `1px solid ${qBorder(request.qScore)}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: qColor(request.qScore) }}>
                {request.qScore >= 70 ? 'Strong' : request.qScore >= 50 ? 'Moderate' : 'Early stage'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted }}>{request.stage}</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: alpha(blue, 0.08), border: `1px solid ${alpha(blue, 0.3)}`, color: blue }}>{request.industry}</span>
        </div>

        {request.oneLiner && (
          <p style={{ fontSize: 14, color: ink, lineHeight: 1.65, marginBottom: 20 }}>{request.oneLiner}</p>
        )}

        {request.personalMessage && (
          <div style={{ borderLeft: `3px solid ${bdr}`, paddingLeft: 16, marginBottom: 28 }}>
            <p style={{ fontSize: 11, color: muted, marginBottom: 6, fontWeight: 500 }}>Personal note from {request.founderName}</p>
            <p style={{ fontSize: 14, color: ink, lineHeight: 1.7, fontStyle: 'italic' }}>&quot;{request.personalMessage}&quot;</p>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 24px', borderTop: `1px solid ${bdr}`, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: bg }}>
        <Button variant="danger" size="sm" icon={<X style={{ height: 12, width: 12 }} />} onClick={onDecline} disabled={actionLoading}
          style={{ background: alpha(red, 0.08), color: red, border: `1px solid ${alpha(red, 0.3)}` }}>
          Decline
        </Button>
        <Button variant="primary" size="sm" icon={<CheckCircle style={{ height: 12, width: 12 }} />} onClick={onAccept} disabled={actionLoading}
          style={{ background: indigo }}>
          {actionLoading ? 'Accepting…' : 'Accept & Reply →'}
        </Button>
      </div>
    </div>
  );
}
