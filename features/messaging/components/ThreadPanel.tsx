"use client";

import { ReactNode, useEffect, useRef } from 'react';
import { bg, surf, bdr, ink, muted, purple, alpha } from '@/lib/constants/colors';
import { SectionSpinner } from '@/features/shared/components/Spinner';
import { Composer } from '@/features/messaging/components/Composer';
import { avatarPalette, initials, relDate } from '@/features/messaging/lib/format';
import { buildGroups, MessageGroupBlock } from '@/features/shared/components/MessageBubble';
import type { ChatMessage } from '@/features/messaging/types';

interface ThreadPanelProps {
  title: string;
  subtitle?: string;
  avatarSeed: string;
  /** Status Badge / Q-score pill / "Profile" link — the panel has no opinion on it. */
  headerRight?: ReactNode;
  personalMessage?: string | null;
  /** Who actually wrote personalMessage — not always "me" just because I'm looking at it.
   *  A sender viewing their own accepted connection must see their own words as their own,
   *  not attributed to the person they sent them to. */
  personalMessageFromMe: boolean;
  createdAt: string;
  myUserId: string | null;
  /** False while the other party hasn't accepted yet — shows the pending state
   *  (the outbound note + an explanation) instead of a live thread + composer. */
  canMessage: boolean;
  messages: ChatMessage[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  composerPlaceholder: string;
}

/** The opening note, attributed to whoever actually wrote it — not assumed. */
function PersonalMessageBubble({
  text, fromMe, otherTitle, otherInitials, pal,
}: {
  text: string; fromMe: boolean; otherTitle: string; otherInitials: string;
  pal: { bg: string; color: string };
}) {
  if (fromMe) {
    return (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ maxWidth: '72%' }}>
          <p style={{ fontSize: 10, color: muted, marginBottom: 3, textAlign: 'right' }}>Your message</p>
          <div style={{ background: ink, color: bg, borderRadius: '12px 4px 12px 12px', padding: '10px 14px' }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{text}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: pal.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: pal.color, letterSpacing: '0.02em', marginTop: 18,
      }}>
        {otherInitials}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, color: muted, marginBottom: 5, fontWeight: 500 }}>{otherTitle} <span style={{ color: bdr, margin: '0 3px' }}>·</span> Connection note</p>
        <div style={{ background: alpha(purple, 0.04), border: `1px solid ${alpha(purple, 0.25)}`, borderRadius: '4px 12px 12px 12px', padding: '10px 14px' }}>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, margin: 0 }}>{text}</p>
        </div>
      </div>
    </div>
  );
}

export function ThreadPanel({
  title, subtitle, avatarSeed, headerRight, personalMessage, personalMessageFromMe, createdAt, myUserId,
  canMessage, messages, loading, input, onInputChange, onSend, sending, composerPlaceholder,
}: ThreadPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const pal = avatarPalette(avatarSeed);
  const otherInitials = initials(avatarSeed);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: pal.bg, color: pal.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
        }}>
          {otherInitials}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: ink, margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 11, color: muted, margin: 0 }}>{subtitle}</p>}
        </div>
        {headerRight && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{headerRight}</div>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {!canMessage ? (
          <div>
            <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: muted, background: surf, padding: '4px 14px', borderRadius: 999, border: `1px solid ${bdr}` }}>
                Request sent · {relDate(createdAt)} · Awaiting response
              </span>
            </div>
            {personalMessage && (
              <PersonalMessageBubble
                text={personalMessage} fromMe={personalMessageFromMe}
                otherTitle={title} otherInitials={otherInitials} pal={pal}
              />
            )}
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 12, color: muted }}>You&apos;ll be able to message once they accept your request.</p>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', padding: '8px 0', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: muted, background: surf, padding: '4px 14px', borderRadius: 999, border: `1px solid ${bdr}` }}>
                Connected · {relDate(createdAt)}
              </span>
            </div>
            {personalMessage && (
              <PersonalMessageBubble
                text={personalMessage} fromMe={personalMessageFromMe}
                otherTitle={title} otherInitials={otherInitials} pal={pal}
              />
            )}
            {loading ? (
              <SectionSpinner minHeight={100} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.length === 0 && !personalMessage && (
                  <p style={{ fontSize: 12, color: muted, textAlign: 'center', padding: '16px 0' }}>No messages yet. Be the first to say hello.</p>
                )}
                {buildGroups(messages, myUserId ?? '').map((group, gi) => (
                  <MessageGroupBlock
                    key={group.messages[0].id}
                    group={group}
                    senderInitials={otherInitials}
                    myInitials="Me"
                    isFirst={gi === 0}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {canMessage && (
        <Composer value={input} onChange={onInputChange} onSend={onSend} disabled={sending} placeholder={composerPlaceholder} />
      )}
    </div>
  );
}
