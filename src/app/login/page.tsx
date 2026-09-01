"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser, registerUser } from "@/lib/firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Enter email and password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    try {
      setLoading(true);
      if (mode === "login") await loginUser(email, password);
      else await registerUser(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      switch (err?.code) {
        case "auth/invalid-credential": setError("Invalid email or password."); break;
        case "auth/email-already-in-use": setError("Account already exists."); break;
        case "auth/weak-password": setError("Password too weak."); break;
        case "auth/invalid-email": setError("Invalid email address."); break;
        default: setError("Authentication failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grid bg */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
        opacity: 0.3,
        maskImage: "radial-gradient(ellipse 70% 80% at 30% 50%, black, transparent)",
      }} />

      {/* Left panel — brand */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 80px",
        position: "relative", zIndex: 1,
      }} className="hidden md:flex">
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 60 }}>
            <div style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px rgba(99,102,241,0.5)",
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L2 3.5V8c0 3.5 2.5 5.8 6 7 3.5-1.2 6-3.5 6-7V3.5L8 1z" fill="white" fillOpacity="0.95"/>
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>AgentGuard</span>
          </div>
        </Link>

        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16,
          background: "linear-gradient(160deg, #f0f0f5 40%, #8888a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          CI/CD for<br />AI Agents
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 340, marginBottom: 40 }}>
          Automatically generate adversarial test scenarios, run agents in a mock sandbox, and catch failures before deployment.
        </p>

        {[
          ["Scenario Generation", "Gemini-powered realistic & adversarial tests"],
          ["Sandboxed Execution", "Mock tool environment — real world never touched"],
          ["Failure Classification", "Typed taxonomy with root-cause analysis"],
          ["Regression Detection", "Compare evaluations, block regressions"],
        ].map(([title, desc]) => (
          <div key={title} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", marginTop: 7, flexShrink: 0, boxShadow: "0 0 6px var(--accent)" }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{title}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Right panel — form */}
      <div style={{
        width: "100%", maxWidth: 460,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "48px 40px",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        position: "relative", zIndex: 1,
      }}>
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <div style={{
            width: 28, height: 28,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L2 3.5V8c0 3.5 2.5 5.8 6 7 3.5-1.2 6-3.5 6-7V3.5L8 1z" fill="white" fillOpacity="0.95"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>AgentGuard</span>
        </div>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            {mode === "login" ? "Welcome back" : "Get started"}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            {mode === "login" ? "Sign in to AgentGuard" : "Create your workspace"}
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="you@example.com"
              className="input"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="••••••••"
              className="input"
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--red-dim)",
              background: "rgba(244,63,94,0.06)",
              fontSize: 12,
              color: "var(--red)",
            }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: 9,
              border: "none",
              background: loading ? "var(--bg-overlay)" : "var(--accent)",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 0 20px rgba(99,102,241,0.3)",
              marginTop: 4,
              transition: "all 0.12s",
              letterSpacing: "0.01em",
            }}
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          {" "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--accent)", fontWeight: 600, fontSize: 12,
            }}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
