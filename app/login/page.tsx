"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const bg   = "#F9F7F2";
const surf = "#F0EDE6";
const bdr  = "#E2DDD5";
const ink  = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Email and password are required"); return; }
    setError(""); setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) { setError(signInErr.message || "Sign in failed"); setLoading(false); return; }
      if (!data.user) { setError("Sign in failed — please try again."); setLoading(false); return; }

      // Determine where to redirect based on whether the user has an investor profile
      const { data: investorProfile } = await supabase
        .from("investor_profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      router.push(investorProfile ? "/investor/dashboard" : "/founder/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    border: `1px solid ${bdr}`, background: surf, color: ink,
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, fontFamily: "inherit" }}>
      {/* nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 28px", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 32, width: 32, borderRadius: 8, background: blue,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>Edge Alpha</span>
        </div>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, color: muted, textDecoration: "none" }}>
          <ArrowLeft size={14} /> Home
        </Link>
      </div>

      {/* body */}
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 8 }}>
          Welcome back.
        </h1>
        <p style={{ fontSize: 14, color: muted, marginBottom: 40 }}>
          Sign in to your Edge Alpha account.
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", color: muted, marginBottom: 6 }}>
              Email
            </label>
            <input style={inputStyle} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" autoComplete="email" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", color: muted, marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input style={{ ...inputStyle, paddingRight: 44 }}
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password" />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: muted }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: "12px", borderRadius: 999, border: "none",
              background: ink, color: bg, fontSize: 14, fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ height: 1, background: bdr, margin: "32px 0" }} />

        <p style={{ fontSize: 13, color: muted, textAlign: "center" }}>
          No account yet?{" "}
          <Link href="/founder/onboarding"
            style={{ color: ink, fontWeight: 600, textDecoration: "none" }}>
            Get started as a founder
          </Link>{" "}·{" "}
          <Link href="/investor/onboarding"
            style={{ color: ink, fontWeight: 600, textDecoration: "none" }}>
            Join as an investor
          </Link>
        </p>
      </div>
    </div>
  );
}
