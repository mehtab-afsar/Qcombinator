"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/features/founder/hooks/useNotifications";
import { NotifRow, type NotifItem } from "@/features/shared/components/NotificationPanel";
import { bg, surf, bdr, ink, muted, blue } from "@/lib/constants/colors";
import { Bell, Check } from "lucide-react";

export default function FounderNotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead, load, loadMore, hasMore, loadingMore } = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);

  function toggleUnreadOnly() {
    const next = !unreadOnly;
    setUnreadOnly(next);
    load(next);
  }

  const notifItems: NotifItem[] = notifications.map(n => ({
    id: n.id, type: n.action_type, title: n.title, body: n.body,
    time: n.time, read: n.read, metadata: n.metadata,
  }));

  return (
    <div style={{ minHeight: "100vh", background: bg }}>
      <div style={{
        background: surf, borderBottom: `1px solid ${bdr}`,
        padding: "0 24px", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          maxWidth: 700, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 16, height: 56,
        }}>
          <button
            onClick={() => router.push("/founder/dashboard")}
            style={{
              background: "none", border: `1px solid ${bdr}`, borderRadius: 8,
              padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", fontSize: 13, color: muted,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </button>

          <h1 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 700, color: ink, margin: 0, flex: 1 }}>
            Notifications
          </h1>

          <button
            onClick={toggleUnreadOnly}
            aria-pressed={unreadOnly}
            style={{
              fontSize: 12, fontWeight: 600, color: unreadOnly ? blue : muted,
              background: unreadOnly ? `${blue}10` : "transparent",
              border: `1px solid ${unreadOnly ? blue : bdr}`,
              borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Unread only
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600, color: blue,
                background: `${blue}08`, border: `1px solid ${blue}30`,
                borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Check size={12} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 24px 80px" }}>
        {notifications.length === 0 ? (
          <div style={{
            background: surf, border: `1px solid ${bdr}`, borderRadius: 14,
            padding: "52px 32px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `${blue}10`, border: `1.5px solid ${blue}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Bell size={22} color={blue} />
            </div>
            <h3 style={{ fontFamily: "inherit", fontSize: 17, fontWeight: 600, color: ink, margin: "0 0 10px" }}>
              {unreadOnly ? "Nothing unread" : "No notifications yet"}
            </h3>
            <p style={{ fontFamily: "inherit", fontSize: 14, color: muted, margin: 0, lineHeight: 1.65 }}>
              {unreadOnly
                ? "You're caught up — switch back to see everything."
                : "Approvals, cycle updates, and Q-Score milestones will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden" }}>
              {notifItems.map(n => (
                <NotifRow key={n.id} n={n} onRead={markRead} />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => loadMore(unreadOnly)}
                disabled={loadingMore}
                style={{
                  display: "block", width: "100%", marginTop: 16, padding: "12px 0",
                  fontSize: 13, fontWeight: 600, color: ink,
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 10,
                  cursor: loadingMore ? "default" : "pointer", fontFamily: "inherit",
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? "Loading…" : "Load older notifications"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
