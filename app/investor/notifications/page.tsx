"use client";

import { useRouter } from "next/navigation";
import { useInvestorNotifications } from "@/features/investor/hooks/useInvestorNotifications";
import { NotifRow, type NotifItem } from "@/features/shared/components/NotificationPanel";
import { bg, surf, bdr, ink, muted, blue } from "@/lib/constants/colors";
import { Bell, Check } from "lucide-react";

export default function InvestorNotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead } = useInvestorNotifications();

  function handleViewStartup(id: string) {
    router.push(`/investor/startup/${id}`);
  }

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
            onClick={() => router.push("/investor/dashboard")}
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
              No notifications yet
            </h3>
            <p style={{ fontFamily: "inherit", fontSize: 14, color: muted, margin: 0, lineHeight: 1.65 }}>
              Connection requests, messages, and deal flow updates will appear here.
            </p>
          </div>
        ) : (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden" }}>
            {(notifications as NotifItem[]).map(n => (
              <NotifRow key={n.id} n={n} onViewStartup={handleViewStartup} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
