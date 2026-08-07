'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { green, amber, red, muted, purple } from '@/lib/constants/colors';
import { useToast } from '@/features/shared/hooks/useToast';
import { EmptyState } from '@/features/shared/components/EmptyState';
import { MessagingShell } from '@/features/messaging/components/MessagingShell';
import { ConversationList, MessagingTab } from '@/features/messaging/components/ConversationList';
import { ThreadPanel } from '@/features/messaging/components/ThreadPanel';
import { RequestDetailPanel } from '@/features/messaging/components/RequestDetailPanel';
import { useMessageThread } from '@/features/messaging/hooks/useMessageThread';
import { useConversationSearch } from '@/features/messaging/hooks/useConversationSearch';
import type { ConversationSummary, PendingRequestDetail, MessagingPanel } from '@/features/messaging/types';

interface RawRequest {
  id: string; founderId: string; founderName: string; startupName: string;
  oneLiner: string; stage: string; industry: string; qScore: number;
  qScoreBreakdown: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };
  personalMessage?: string; requestedDate: string;
}

interface RawThread {
  connectionId: string; founderId: string; founderName: string; startupName: string;
  stage: string; industry: string; qScore: number; updatedAt: string;
  personalMessage?: string; unreadCount: number;
  latestMessage?: { body: string; createdAt: string; senderId: string } | null;
}

function toRequestDetail(r: RawRequest): PendingRequestDetail {
  return {
    id: r.id, displayName: r.startupName, subtitle: `${r.founderName} · ${r.industry}`,
    personalMessage: r.personalMessage ?? null, status: 'pending', createdAt: r.requestedDate,
    founderId: r.founderId, founderName: r.founderName, startupName: r.startupName,
    oneLiner: r.oneLiner, stage: r.stage, industry: r.industry,
    qScore: r.qScore, qScoreBreakdown: r.qScoreBreakdown,
  };
}

function toConversationSummary(t: RawThread): ConversationSummary {
  return {
    id: t.connectionId, displayName: t.startupName, subtitle: `${t.founderName} · ${t.industry}`,
    personalMessage: t.personalMessage ?? null, status: 'accepted', createdAt: t.updatedAt,
    unreadCount: t.unreadCount,
    lastMessage: t.latestMessage ? { body: t.latestMessage.body, createdAt: t.latestMessage.createdAt, senderId: t.latestMessage.senderId } : null,
  };
}

function qColor(n: number) { return n >= 70 ? green : n >= 50 ? amber : red; }
function qBg(n: number) { return n >= 70 ? '#F0FDF4' : n >= 50 ? '#FFFBEB' : '#FEF2F2'; }

export default function InvestorMessagesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [requestsRaw, setRequestsRaw] = useState<RawRequest[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<MessagingPanel>(null);
  const [activeTab, setActiveTab] = useState<MessagingTab>('requests');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const { search, setSearch } = useConversationSearch();

  const requests = requestsRaw.map(toRequestDetail);

  useEffect(() => {
    (async () => {
      try {
        const { getAuthUserId } = await import('@/features/auth/services/auth.service');
        const uid = await getAuthUserId();
        if (uid) setMyUserId(uid);

        const [pendingRes, threadsRes] = await Promise.all([
          fetch('/api/investor/connections'),
          fetch('/api/investor/messages'),
        ]);
        if (pendingRes.ok) {
          const d = await pendingRes.json();
          setRequestsRaw(d.requests ?? []);
        }
        if (threadsRes.ok) {
          const d = await threadsRes.json();
          setConversations((d.threads ?? []).map(toConversationSummary));
        }
      } catch { /* silently fail */ } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (loading || panel) return;
    if (requestsRaw.length > 0) { setActiveTab('requests'); setPanel({ type: 'request', data: toRequestDetail(requestsRaw[0]) }); }
    else if (conversations.length > 0) { setActiveTab('conversations'); setPanel({ type: 'conversation', data: conversations[0] }); }
  }, [loading, requestsRaw, conversations, panel]);

  const activeConnectionId = panel?.type === 'conversation' ? panel.data.id : null;
  const thread = useMessageThread(activeConnectionId, panel?.type === 'conversation');

  const handleAccept = useCallback(async (req: PendingRequestDetail) => {
    setActionLoading(req.id);
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'accept' }),
      });
      if (res.ok) {
        const newConv: ConversationSummary = {
          id: req.id, displayName: req.startupName, subtitle: `${req.founderName} · ${req.industry}`,
          personalMessage: req.personalMessage, status: 'accepted', createdAt: new Date().toISOString(),
        };
        setRequestsRaw(prev => prev.filter(r => r.id !== req.id));
        setConversations(prev => prev.some(c => c.id === req.id) ? prev : [newConv, ...prev]);
        setPanel({ type: 'conversation', data: newConv });
        setActiveTab('conversations');
        toast.success(`Connected with ${req.founderName}`);
      }
    } catch { /* noop */ } finally { setActionLoading(null); }
  }, [toast]);

  const handleDecline = useCallback(async (req: PendingRequestDetail) => {
    setActionLoading(req.id);
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'decline' }),
      });
      if (res.ok) {
        setRequestsRaw(prev => {
          const remaining = prev.filter(r => r.id !== req.id);
          if (panel?.type === 'request' && panel.data.id === req.id) {
            setPanel(remaining.length > 0 ? { type: 'request', data: toRequestDetail(remaining[0]) } : null);
          }
          return remaining;
        });
        toast.info('Request declined');
      }
    } catch { /* noop */ } finally { setActionLoading(null); }
  }, [panel, toast]);

  async function handleSend() {
    const sent = await thread.send();
    if (!sent) { toast.error('Failed to send'); return; }
    if (panel?.type === 'conversation') {
      setConversations(prev => prev.map(c => c.id === panel.data.id
        ? { ...c, lastMessage: { body: sent.body, createdAt: sent.created_at, senderId: sent.sender_id } }
        : c));
    }
  }

  return (
    <MessagingShell
      showingPanel={panel !== null}
      onBack={() => setPanel(null)}
      list={
        <ConversationList
          eyebrow="Investor · Inbox"
          title="Inbox"
          loading={loading}
          requests={requests}
          conversations={conversations}
          activeTab={activeTab}
          onTabChange={tab => {
            setActiveTab(tab);
            if (tab === 'requests' && requests.length > 0) setPanel({ type: 'request', data: requests[0] });
            else if (tab === 'conversations' && conversations.length > 0) setPanel({ type: 'conversation', data: conversations[0] });
          }}
          selectedId={panel?.data.id ?? null}
          onSelect={(item, tab) => {
            if (tab === 'requests') {
              const raw = requestsRaw.find(r => r.id === item.id);
              if (raw) setPanel({ type: 'request', data: toRequestDetail(raw) });
            } else {
              setPanel({ type: 'conversation', data: item });
            }
          }}
          search={search}
          onSearchChange={setSearch}
          myUserId={myUserId}
          renderSubtitleRight={(item, tab) => tab === 'requests' && 'qScore' in item ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: qBg((item as PendingRequestDetail).qScore), color: qColor((item as PendingRequestDetail).qScore), flexShrink: 0 }}>
              Q{(item as PendingRequestDetail).qScore}
            </span>
          ) : null}
          requestsEmptyIcon={undefined}
          conversationsEmptyIcon={MessageSquare}
          conversationsEmptyBody="Accepted connections will show up here."
        />
      }
      panel={
        !panel ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            {requests.length === 0 && conversations.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                body="Connect with founders in deal flow to start a conversation."
                action={{ label: 'Browse deal flow', href: '/investor/deal-flow' }}
                style={{ border: 'none', background: 'transparent' }}
              />
            ) : (
              <>
                <p style={{ fontSize: 14, color: muted }}>Select a conversation to get started</p>
                <Link href="/investor/deal-flow" style={{ fontSize: 13, color: purple, textDecoration: 'none' }}>Browse deal flow →</Link>
              </>
            )}
          </div>
        ) : panel.type === 'request' ? (
          <RequestDetailPanel
            request={panel.data}
            onViewProfile={() => router.push(`/investor/startup/${panel.data.founderId}`)}
            onAccept={() => handleAccept(panel.data)}
            onDecline={() => handleDecline(panel.data)}
            actionLoading={actionLoading === panel.data.id}
          />
        ) : (
          <ThreadPanel
            title={panel.data.displayName}
            subtitle={panel.data.subtitle}
            avatarSeed={panel.data.displayName}
            personalMessage={panel.data.personalMessage}
            createdAt={panel.data.createdAt}
            myUserId={myUserId}
            canMessage
            messages={thread.messages}
            loading={thread.loading}
            input={thread.input}
            onInputChange={thread.setInput}
            onSend={handleSend}
            sending={thread.sending}
            composerPlaceholder={`Message ${panel.data.displayName}…`}
          />
        )
      }
    />
  );
}

