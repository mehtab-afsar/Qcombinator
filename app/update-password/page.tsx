"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [done,        setDone]        = useState(false);
  // Supabase sends the recovery token as a URL fragment (#access_token=...) or query param
  const [ready,       setReady]       = useState(false);

  useEffect(() => {
    // Supabase SSR client automatically exchanges the recovery token from the URL fragment
    // We just need to wait for the session to be established
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also handle if already in a valid session from the redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    // Suppress unused param lint — searchParams kept to force Suspense boundary
    void searchParams;
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError("Password is required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) { setError(updateErr.message || "Failed to update password"); setLoading(false); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 28px", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 32, width: 32, borderRadius: 8, background: blue,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 8 }}>EA</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>Edge Alpha</span>
        </div>
        <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 6,
          fontSize: 13, color: muted, textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>

      <div style={{ maxWidth: 400, margin: "0 auto", padding: "64px 24px" }}>
        {done ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Password updated.
            </h1>
            <p style={{ fontSize: 14, color: muted }}>
              Redirecting you to login…
            </p>
          </>
        ) : !ready ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Invalid or expired link.
            </h1>
            <p style={{ fontSize: 14, color: muted, marginBottom: 24 }}>
              This password reset link is no longer valid. Please request a new one.
            </p>
            <Link href="/reset-password"
              style={{ fontSize: 13, color: ink, fontWeight: 600, textDecoration: "none" }}>
              Request new link →
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Set new password.
            </h1>
            <p style={{ fontSize: 14, color: muted, marginBottom: 40 }}>
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: muted, marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: 44 }}
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: muted }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: muted, marginBottom: 6 }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inputStyle, paddingRight: 44 }}
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: muted }}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
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
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <UpdatePasswordForm />
    </Suspense>
  );
}
