"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { bg, surf, bdr, ink, muted, blue } from '@/lib/constants/colors'

export default function ResetPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Email is required"); return; }
    setError(""); setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); setLoading(false); return; }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
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
        {sent ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Check your inbox.
            </h1>
            <p style={{ fontSize: 14, color: muted, marginBottom: 32, lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: ink }}>{email}</strong>, you&rsquo;ll
              receive a password reset link shortly.
            </p>
            <Link href="/login" style={{ fontSize: 13, color: ink, fontWeight: 600, textDecoration: "none" }}>
              ← Back to login
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Reset your password.
            </h1>
            <p style={{ fontSize: 14, color: muted, marginBottom: 40 }}>
              Enter your email and we&rsquo;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: muted, marginBottom: 6 }}>
                  Email
                </label>
                <input style={inputStyle} type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" autoComplete="email" />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>
              )}

              <button type="submit" disabled={loading}
                style={{ padding: "12px", borderRadius: 999, border: "none",
                  background: ink, color: bg, fontSize: 14, fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
