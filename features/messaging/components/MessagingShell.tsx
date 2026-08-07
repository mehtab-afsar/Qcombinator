"use client";

import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { bg, bdr, ink, muted } from '@/lib/constants/colors';

interface MessagingShellProps {
  list: ReactNode;
  panel: ReactNode;
  /** True once a request/conversation is selected — drives which pane shows on
   *  a narrow screen (list-then-thread, matching how Slack/Gmail degrade). */
  showingPanel: boolean;
  onBack: () => void;
}

export function MessagingShell({ list, panel, showingPanel, onBack }: MessagingShellProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: ink, overflow: 'hidden' }}>
      <div className="ea-msg-list" style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${bdr}`, height: '100%' }}>
        {list}
      </div>
      <div className="ea-msg-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <button
          onClick={onBack}
          className="ea-msg-back"
          style={{
            display: 'none', alignItems: 'center', gap: 6, padding: '10px 16px',
            border: 'none', borderBottom: `1px solid ${bdr}`, background: bg,
            fontSize: 12, color: muted, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          <ArrowLeft size={13} /> Back
        </button>
        {panel}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .ea-msg-list { width: 100% !important; display: ${showingPanel ? 'none' : 'flex'} !important; flex-direction: column; }
          .ea-msg-panel { display: ${showingPanel ? 'flex' : 'none'} !important; }
          .ea-msg-back { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
