"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";

// ─── helper: format roleSlug into a readable title ────────────────────────────
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── main component ───────────────────────────────────────────────────────────
export default function ApplyPage() {
  const params   = useParams<{ userId: string; roleSlug: string }>();
  const userId   = params.userId   ?? "";
  const roleSlug = params.roleSlug ?? "";
  const roleTitle = slugToTitle(roleSlug);

  const [form, setForm] = useState({
    applicantName:  "",
    applicantEmail: "",
    resumeText:     "",
  });

  const [errors,      setErrors]      = useState<Partial<typeof form>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const newErrors: Partial<typeof form> = {};
    if (!form.applicantName.trim())  newErrors.applicantName  = "Full name is required.";
    if (!form.applicantEmail.trim()) newErrors.applicantEmail = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.applicantEmail))
      newErrors.applicantEmail = "Please enter a valid email address.";
    if (!form.resumeText.trim())     newErrors.resumeText     = "Please tell us about yourself.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/agents/harper/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          roleSlug,
          applicantName:  form.applicantName.trim(),
          applicantEmail: form.applicantEmail.trim(),
          resumeText:     form.resumeText.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Submission failed");
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };
  }

  // ─── success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{
          background: surf, border: `1px solid ${bdr}`, borderRadius: 16,
          padding: "52px 44px", maxWidth: 540, width: "100%", textAlign: "center",
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: `${green}18`, border: `2px solid ${green}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", fontSize: 30, color: green,
          }}>
            ✓
          </div>
          <h2 style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 26, fontWeight: 700, color: ink, margin: "0 0 14px",
          }}>
            Application submitted!
          </h2>
          <p style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 15, color: muted, margin: "0 0 8px", lineHeight: 1.7,
          }}>
            We&apos;ll review it and be in touch.
          </p>
          <p style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 14, color: muted, margin: 0, lineHeight: 1.6,
          }}>
            Thank you for your interest in the{" "}
            <strong style={{ color: ink }}>{roleTitle}</strong> role.
          </p>
        </div>
      </div>
    );
  }

  // ─── input helper style ───────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "11px 14px",
    border: `1.5px solid ${bdr}`, borderRadius: 8,
    background: bg, color: ink, fontSize: 14,
    fontFamily: "system-ui, -apple-system, sans-serif",
    outline: "none", transition: "border-color 0.15s",
  };
  const errorStyle: React.CSSProperties = {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 12, color: "#DC2626", marginTop: 4, display: "block",
  };

  // ─── main form ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "48px 16px 80px" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${blue}14`, border: `1px solid ${blue}30`,
            borderRadius: 20, padding: "4px 14px", marginBottom: 20,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: blue,
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              We&apos;re hiring
            </span>
          </div>

          <h1 style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 32, fontWeight: 700, color: ink, margin: "0 0 12px", lineHeight: 1.2,
          }}>
            {roleTitle}
          </h1>

          <p style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 15, color: muted, margin: "0 0 6px", lineHeight: 1.65,
          }}>
            We&apos;re looking for talented people to join our team. Fill out the form
            below and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: surf, border: `1px solid ${bdr}`,
          borderRadius: 14, padding: "32px 36px",
        }}>
          <h2 style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 17, fontWeight: 600, color: ink, margin: "0 0 28px",
          }}>
            Your application
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

              {/* Full Name */}
              <div>
                <label style={{
                  display: "block", marginBottom: 6,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: 13, fontWeight: 600, color: ink,
                }}>
                  Full Name <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.applicantName}
                  onChange={handleChange("applicantName")}
                  placeholder="Jane Smith"
                  style={{
                    ...inputBase,
                    borderColor: errors.applicantName ? "#DC2626" : bdr,
                  }}
                  onFocus={(e) => { if (!errors.applicantName) e.currentTarget.style.borderColor = blue; }}
                  onBlur={(e)  => { if (!errors.applicantName) e.currentTarget.style.borderColor = bdr;  }}
                />
                {errors.applicantName && <span style={errorStyle}>{errors.applicantName}</span>}
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: "block", marginBottom: 6,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: 13, fontWeight: 600, color: ink,
                }}>
                  Email Address <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="email"
                  value={form.applicantEmail}
                  onChange={handleChange("applicantEmail")}
                  placeholder="you@example.com"
                  style={{
                    ...inputBase,
                    borderColor: errors.applicantEmail ? "#DC2626" : bdr,
                  }}
                  onFocus={(e) => { if (!errors.applicantEmail) e.currentTarget.style.borderColor = blue; }}
                  onBlur={(e)  => { if (!errors.applicantEmail) e.currentTarget.style.borderColor = bdr;  }}
                />
                {errors.applicantEmail && <span style={errorStyle}>{errors.applicantEmail}</span>}
              </div>

              {/* About / Resume */}
              <div>
                <label style={{
                  display: "block", marginBottom: 6,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: 13, fontWeight: 600, color: ink,
                }}>
                  Tell us about yourself <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <p style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: 12, color: muted, margin: "0 0 8px",
                }}>
                  Share your background, relevant experience, and why you&apos;re excited
                  about this role. You can also paste your resume text here.
                </p>
                <textarea
                  value={form.resumeText}
                  onChange={handleChange("resumeText")}
                  placeholder="I'm a product designer with 5 years of experience…"
                  rows={8}
                  style={{
                    ...inputBase,
                    resize: "vertical",
                    lineHeight: 1.65,
                    borderColor: errors.resumeText ? "#DC2626" : bdr,
                  }}
                  onFocus={(e) => { if (!errors.resumeText) e.currentTarget.style.borderColor = blue; }}
                  onBlur={(e)  => { if (!errors.resumeText) e.currentTarget.style.borderColor = bdr;  }}
                />
                {errors.resumeText && <span style={errorStyle}>{errors.resumeText}</span>}
              </div>

              {/* Submit error */}
              {submitError && (
                <div style={{
                  background: "#DC262610", border: "1px solid #DC262640",
                  borderRadius: 8, padding: "12px 16px",
                }}>
                  <p style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    fontSize: 14, color: "#DC2626", margin: 0,
                  }}>
                    {submitError}
                  </p>
                </div>
              )}

              {/* Submit */}
              <div style={{ paddingTop: 4 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: blue, color: "#fff",
                    border: "none", borderRadius: 10,
                    padding: "14px 36px", fontSize: 15, fontWeight: 600,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                    transition: "opacity 0.15s",
                    width: "100%",
                  }}
                >
                  {submitting ? "Submitting…" : "Submit Application"}
                </button>
                <p style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  fontSize: 12, color: muted, textAlign: "center", margin: "12px 0 0",
                }}>
                  By submitting, you agree to let us store and process your application.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 12, color: muted, textAlign: "center", marginTop: 40,
        }}>
          Powered by Qcombinator
        </p>
      </div>
    </div>
  );
}
