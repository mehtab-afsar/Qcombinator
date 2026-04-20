"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
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

      // Honor ?next= redirect from middleware (only allow relative paths to prevent open redirect)
      if (nextPath && nextPath.startsWith("/")) {
        router.push(nextPath);
        return;
      }

      // Default: route by user role
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

  const handleGoogleLogin = async () => {
    setError(""); setOauthLoading(true);
    const supabase = createClient();
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`,
      },
    });
    if (oauthErr) { setError(oauthErr.message || "Google sign-in failed"); setOauthLoading(false); }
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

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={oauthLoading}
          style={{
            width: "100%", padding: "11px 14px", borderRadius: 8,
            border: `1px solid ${bdr}`, background: bg, color: ink,
            fontSize: 14, fontWeight: 500, cursor: oauthLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            opacity: oauthLoading ? 0.6 : 1, marginBottom: 24,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.1255-.8427 2.0791-1.7959 2.7191v2.2586h2.9086c1.7018-1.5668 2.685-3.874 2.685-6.6182z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1814l-2.9086-2.2586c-.8063.54-1.8368.8591-3.0477.8591-2.3445 0-4.3282-1.5832-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
            <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6555 3.5795 9 3.5795z" fill="#EA4335"/>
          </svg>
          {oauthLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ flex: 1, height: 1, background: bdr }} />
          <span style={{ fontSize: 12, color: muted }}>or</span>
          <div style={{ flex: 1, height: 1, background: bdr }} />
        </div>

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

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8 }}>
            <Link href="/reset-password" style={{ fontSize: 12, color: muted, textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
