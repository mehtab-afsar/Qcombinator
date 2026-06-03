"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, ArrowRight, Building2, Users, TrendingUp, Star, UserPlus } from "lucide-react";

const C = {
  bg:    "#F9F7F2",
  surf:  "#F0EDE6",
  bdr:   "#E2DDD5",
  ink:   "#18160F",
  muted: "#8A867C",
  blue:  "#2563EB",
  green: "#16A34A",
  purple:"#7C3AED",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteType = "portfolio" | "team";

interface PortfolioInviteInfo {
  type:        "portfolio";
  valid:       true;
  companyName: string | null;
  founderName: string | null;
  investorName:string | null;
  firmName:    string | null;
}

interface TeamInviteInfo {
  type:        "team";
  valid:       true;
  startupName: string;
  inviterName: string;
  role:        "admin" | "member" | "viewer";
  email:       string;
}

type InviteInfo = PortfolioInviteInfo | TeamInviteInfo;

const ROLE_LABELS: Record<string, string> = {
  admin:  "Co-founder (Admin)",
  member: "Team Member",
  viewer: "Observer (Viewer)",
};

const pills = [
  { icon: TrendingUp, text: "Live Q-Score intelligence" },
  { icon: Users,      text: "11 AI founder advisers"   },
  { icon: Star,       text: "500+ verified investors"  },
];

// ── Join content ──────────────────────────────────────────────────────────────

function JoinContent() {
  const params = useSearchParams();
  const router = useRouter();

  // teamToken → team invite;  token → portfolio invite (legacy)
  const teamToken      = params.get("teamToken");
  const portfolioToken = params.get("token");
  const token          = teamToken ?? portfolioToken;
  const inviteType: InviteType = teamToken ? "team" : "portfolio";

  const [info,    setInfo]    = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) { setError("No invite token found."); setLoading(false); return; }
    (async () => {
      try {
        const url = inviteType === "team"
          ? `/api/team/validate?token=${encodeURIComponent(token)}`
          : `/api/invites/validate?token=${encodeURIComponent(token)}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Invalid invite link."); return; }
        setInfo({ type: inviteType, ...data } as InviteInfo);
      } catch {
        setError("Could not validate invite. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, inviteType]);

  // Attempt to accept the team invite if user is already logged in.
  // If successful → /founder/dashboard. Otherwise fall through to signup.
  async function handleJoinAsExistingUser() {
    if (!token) return;
    setJoining(true);
    try {
      const res  = await fetch("/api/team/join", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token }),
      });
      if (res.ok) {
        router.push("/founder/dashboard?teamJoined=1");
        return;
      }
      // Not logged in or other error → redirect to signup with token
    } catch { /* fall through */ }
    setJoining(false);
    router.push(`/signup?teamToken=${encodeURIComponent(token)}`);
  }

  function handlePortfolioContinue() {
    const info2 = info as PortfolioInviteInfo | null;
    router.push(
      `/signup?inviteToken=${encodeURIComponent(token ?? "")}&companyName=${encodeURIComponent(info2?.companyName ?? "")}`
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "white", fontFamily: "monospace" }}>E</span>
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>Edge Alpha</span>
      </motion.div>

      {/* Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ width: "100%", maxWidth: 460, background: "white", border: `1px solid ${C.bdr}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.06)" }}
      >
        {loading ? (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <Loader2 style={{ width: 28, height: 28, color: C.muted, margin: "0 auto 12px" }} className="animate-spin" />
            <p style={{ fontSize: 14, color: C.muted }}>Validating your invite…</p>
          </div>

        ) : error ? (
          <div style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Invalid Invite</p>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{error}</p>
            <Link href="/" style={{ fontSize: 13, color: C.blue, textDecoration: "none" }}>Go to homepage →</Link>
          </div>

        ) : info?.type === "team" ? (
          /* ── Team invite card ─────────────────────────────────────────── */
          <>
            <div style={{ padding: "28px 32px 24px", borderBottom: `1px solid ${C.bdr}`, background: `${C.purple}08` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.purple}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus style={{ width: 20, height: 20, color: C.purple }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Team invite from</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{info.inviterName}</p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, marginBottom: 12 }}>
                <strong>{info.inviterName}</strong> has invited you to join{" "}
                <strong>{info.startupName}</strong> on Edge Alpha as{" "}
                <strong>{ROLE_LABELS[info.role] ?? info.role}</strong>.
              </p>
              <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, background: `${C.purple}15`, fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: "0.06em" }}>
                {ROLE_LABELS[info.role] ?? info.role}
              </div>
            </div>

            <div style={{ padding: "20px 32px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>You&apos;ll get access to</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {pills.map(p => (
                  <div key={p.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${C.purple}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <p.icon style={{ width: 13, height: 13, color: C.purple }} />
                    </div>
                    <p style={{ fontSize: 13, color: C.ink }}>{p.text}</p>
                  </div>
                ))}
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleJoinAsExistingUser}
                disabled={joining}
                style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: joining ? C.muted : C.purple, color: "white", fontSize: 15, fontWeight: 700, cursor: joining ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}
              >
                {joining ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <>Accept & join workspace <ArrowRight style={{ width: 16, height: 16 }} /></>}
              </motion.button>
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
                New to Edge Alpha?{" "}
                <a href={`/signup?teamToken=${encodeURIComponent(token ?? "")}`} style={{ color: C.purple, textDecoration: "none" }}>Create an account first</a>
              </p>
            </div>

            <div style={{ borderTop: `1px solid ${C.bdr}`, padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <CheckCircle style={{ width: 13, height: 13, color: C.green }} />
              <span style={{ fontSize: 11, color: C.muted }}>Invite verified · Shared workspace</span>
            </div>
          </>

        ) : info?.type === "portfolio" ? (
          /* ── Portfolio invite card (original) ────────────────────────── */
          <>
            <div style={{ padding: "28px 32px 24px", borderBottom: `1px solid ${C.bdr}`, background: C.surf }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${C.blue}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 style={{ width: 20, height: 20, color: C.blue }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Invite from</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>
                    {info.investorName ?? "Your investor"}
                    {info.firmName && <span style={{ fontWeight: 400, color: C.muted }}> · {info.firmName}</span>}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.6 }}>
                <strong>{info.investorName ?? "Your investor"}</strong> has invited{" "}
                <strong>{info.companyName ?? "your company"}</strong> to join Edge Alpha.
              </p>
            </div>

            <div style={{ padding: "20px 32px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>What you&apos;ll get</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {pills.map(p => (
                  <div key={p.text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${C.blue}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <p.icon style={{ width: 13, height: 13, color: C.blue }} />
                    </div>
                    <p style={{ fontSize: 13, color: C.ink }}>{p.text}</p>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handlePortfolioContinue}
                style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: C.blue, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}
              >
                Create your account <ArrowRight style={{ width: 16, height: 16 }} />
              </motion.button>
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
                Already have an account?{" "}
                <a href="/login" style={{ color: C.blue, textDecoration: "none" }}>Sign in instead</a>
              </p>
            </div>

            <div style={{ borderTop: `1px solid ${C.bdr}`, padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <CheckCircle style={{ width: 13, height: 13, color: C.green }} />
              <span style={{ fontSize: 11, color: C.muted }}>Invite verified · Free to join</span>
            </div>
          </>
        ) : null}
      </motion.div>

      <p style={{ marginTop: 24, fontSize: 12, color: C.muted }}>
        © {new Date().getFullYear()} Edge Alpha · <a href="/privacy" style={{ color: C.muted }}>Privacy</a>
      </p>
    </div>
  );
}

export default function FounderJoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#F9F7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 24, height: 24, color: "#8A867C" }} className="animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
