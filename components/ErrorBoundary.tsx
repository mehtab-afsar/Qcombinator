"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

const bg   = "#F9F7F2";
const ink  = "#18160F";
const muted = "#8A867C";
const bdr  = "#E2DDD5";

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", background: bg, padding: 32,
        }}>
          <div style={{
            maxWidth: 440, width: "100%",
            background: bg, border: `1px solid ${bdr}`, borderRadius: 14,
            padding: "40px 36px", textAlign: "center",
          }}>
            <p style={{
              fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em",
              color: muted, marginBottom: 20,
            }}>
              Qcombinator
            </p>
            <h2 style={{
              fontSize: 22, fontWeight: 300, letterSpacing: "-0.02em",
              color: ink, marginBottom: 12,
            }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 32 }}>
              An unexpected error occurred. You can try reloading the page — your
              data is safe.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 13,
                  background: ink, color: bg, border: "none", cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Reload page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 13,
                  background: "transparent", color: muted,
                  border: `1px solid ${bdr}`, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
