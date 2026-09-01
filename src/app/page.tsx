import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        opacity: 0.4,
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black, transparent)",
      }} />

      {/* Glow blob */}
      <div style={{
        position: "absolute",
        top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)",
        zIndex: 0,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 680 }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 999,
          border: "1px solid var(--accent-dim)",
          background: "rgba(99,102,241,0.08)",
          fontSize: 11,
          color: "var(--accent)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 28,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", boxShadow: "0 0 6px var(--accent)" }} />
          AI Agent Evaluation Engine
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 64px)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          marginBottom: 20,
          background: "linear-gradient(160deg, #f0f0f5 40%, #8888a0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Test your AI agents<br />before they go rogue.
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: 15,
          color: "var(--text-secondary)",
          maxWidth: 480,
          margin: "0 auto 36px",
          lineHeight: 1.7,
        }}>
          Adversarial scenario generation, sandboxed execution, failure classification,
          and reliability scoring — CI infrastructure for autonomous agents.
        </p>

        {/* CTA row */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{
            padding: "10px 22px",
            borderRadius: 10,
            background: "var(--accent)",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 0 24px rgba(99,102,241,0.35)",
            letterSpacing: "0.01em",
          }}>
            Open Dashboard →
          </Link>
          <Link href="/login" style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "1px solid var(--border-mid)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}>
            Sign in
          </Link>
          <a
            href="https://github.com/sinjaa18/agentguard"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            GitHub
          </a>
        </div>

        {/* Feature chips */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          marginTop: 48,
        }}>
          {[
            "Prompt Injection Testing",
            "Tool Misuse Detection",
            "Destructive Action Guards",
            "Hallucination Resistance",
            "Goal Drift Analysis",
            "Regression Tracking",
            "Gemini-Powered Simulation",
            "Risk Scoring 0–100",
          ].map(f => (
            <span key={f} style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              fontSize: 11,
              color: "var(--text-muted)",
              background: "var(--bg-surface)",
            }}>{f}</span>
          ))}
        </div>
      </div>
    </main>
  );
}
